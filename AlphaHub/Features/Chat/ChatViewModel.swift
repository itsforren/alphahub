import Foundation
import Observation
import Supabase

/// Manages chat message state: fetching, sending, offline queue, deduplication, and read receipts.
@MainActor
@Observable
final class ChatViewModel {
    // MARK: - Public State

    var messages: [ChatMessage] = []
    var pendingMessages: [PendingMessage] = []
    var isLoadingInitial = false
    var isLoadingMore = false
    var hasMoreMessages = false
    var conversationId: String?

    // MARK: - Private

    private var knownMessageIds: Set<String> = []
    private var nextCursor: String?
    private let supabase: SupabaseClient
    private let pageSize = 50

    init(supabase: SupabaseClient = SupabaseConfig.client) {
        self.supabase = supabase
    }

    // MARK: - Computed

    /// Timestamp of the most recent message, used for catch-up queries after reconnect.
    var lastMessageTimestamp: String? {
        messages.last?.createdAt
    }

    // MARK: - Load Conversation

    /// Gets or creates the conversation for the given client, then fetches messages.
    func loadConversation(clientId: String) async {
        isLoadingInitial = true
        defer { isLoadingInitial = false }

        do {
            // Try to find existing conversation
            let existing: [ChatConversation] = try await supabase
                .from("chat_conversations")
                .select()
                .eq("client_id", value: clientId)
                .limit(1)
                .execute()
                .value

            if let conversation = existing.first {
                self.conversationId = conversation.id
            } else {
                // Create new conversation
                struct ConversationInsert: Codable {
                    let clientId: String
                    enum CodingKeys: String, CodingKey {
                        case clientId = "client_id"
                    }
                }
                let created: ChatConversation = try await supabase
                    .from("chat_conversations")
                    .insert(ConversationInsert(clientId: clientId))
                    .select()
                    .single()
                    .execute()
                    .value
                self.conversationId = created.id
            }

            await fetchMessages()
        } catch {
            // Silently fail -- user sees empty chat with ability to retry
        }
    }

    // MARK: - Fetch Messages

    /// Fetches the most recent page of messages for the current conversation.
    func fetchMessages() async {
        guard let conversationId else { return }

        do {
            let fetched: [ChatMessage] = try await supabase
                .from("chat_messages")
                .select()
                .eq("conversation_id", value: conversationId)
                .order("created_at", ascending: false)
                .limit(pageSize)
                .execute()
                .value

            // Reverse for display (oldest first)
            self.messages = fetched.reversed()
            self.knownMessageIds = Set(fetched.map(\.id))
            self.hasMoreMessages = fetched.count == pageSize
            self.nextCursor = fetched.last?.createdAt // last in desc order = oldest
        } catch {
            // Keep existing messages on error
        }
    }

    /// Fetches older messages before the current oldest message (pagination).
    func fetchMoreMessages() async {
        guard let conversationId, let cursor = nextCursor, !isLoadingMore else { return }
        isLoadingMore = true
        defer { isLoadingMore = false }

        do {
            let fetched: [ChatMessage] = try await supabase
                .from("chat_messages")
                .select()
                .eq("conversation_id", value: conversationId)
                .lt("created_at", value: cursor)
                .order("created_at", ascending: false)
                .limit(pageSize)
                .execute()
                .value

            // Prepend older messages (reversed for display)
            let newMessages = fetched.reversed()
            for msg in newMessages {
                knownMessageIds.insert(msg.id)
            }
            self.messages.insert(contentsOf: newMessages, at: 0)
            self.hasMoreMessages = fetched.count == pageSize
            if let oldest = fetched.last {
                self.nextCursor = oldest.createdAt
            }
        } catch {
            // Keep existing messages on error
        }
    }

    /// Fetches messages created after the given timestamp (catch-up after reconnect).
    func fetchMessagesSince(_ timestamp: String) async {
        guard let conversationId else { return }

        do {
            let fetched: [ChatMessage] = try await supabase
                .from("chat_messages")
                .select()
                .eq("conversation_id", value: conversationId)
                .gt("created_at", value: timestamp)
                .order("created_at", ascending: true)
                .execute()
                .value

            // Deduplicate and append
            for msg in fetched {
                if !knownMessageIds.contains(msg.id) {
                    knownMessageIds.insert(msg.id)
                    messages.append(msg)
                }
            }
        } catch {
            // Silently fail
        }
    }

    // MARK: - Handle New Message (from Realtime)

    /// Called by RealtimeManager when a new message arrives via WebSocket.
    /// Deduplicates against known IDs before appending.
    func handleNewMessage(_ message: ChatMessage) {
        guard !knownMessageIds.contains(message.id) else { return }
        knownMessageIds.insert(message.id)
        messages.append(message)
    }

    // MARK: - Send Message

    /// Sends a new message. Creates a pending placeholder, inserts via REST, and cleans up.
    func sendMessage(text: String, senderName: String, senderAvatarUrl: String?) async {
        guard let conversationId, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let pending = PendingMessage(
            id: UUID(),
            text: trimmed,
            status: .sending,
            createdAt: Date()
        )
        pendingMessages.append(pending)

        do {
            let session = try await supabase.auth.session
            let userId = session.user.id.uuidString

            let insert = ChatMessageInsert(
                conversationId: conversationId,
                senderId: userId,
                senderName: senderName,
                senderRole: "client",
                senderAvatarUrl: senderAvatarUrl,
                message: trimmed
            )

            let _: ChatMessage = try await supabase
                .from("chat_messages")
                .insert(insert)
                .select()
                .single()
                .execute()
                .value

            // Remove from pending on success
            pendingMessages.removeAll { $0.id == pending.id }

            // Fire-and-forget notification to edge function
            Task {
                try? await supabase.functions.invoke(
                    "chat-notification",
                    options: .init(body: ["conversation_id": conversationId])
                )
            }
        } catch {
            // Mark as failed
            if let idx = pendingMessages.firstIndex(where: { $0.id == pending.id }) {
                pendingMessages[idx].status = .failed
            }
        }
    }

    /// Retries a failed pending message.
    func retryMessage(_ pending: PendingMessage, senderName: String, senderAvatarUrl: String?) async {
        pendingMessages.removeAll { $0.id == pending.id }
        await sendMessage(text: pending.text, senderName: senderName, senderAvatarUrl: senderAvatarUrl)
    }

    // MARK: - Read Receipts

    /// Marks all unread messages as read for the client role.
    func markMessagesAsRead() async {
        guard let conversationId else { return }
        _ = try? await supabase.rpc(
            "mark_messages_read",
            params: ["p_conversation_id": conversationId, "p_user_role": "client"]
        ).execute()
    }
}
