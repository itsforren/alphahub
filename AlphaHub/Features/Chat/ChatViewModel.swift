import Foundation
import Observation
import Supabase
import Storage
import UIKit

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
    var attachmentError: String?

    // MARK: - Private

    private var knownMessageIds: Set<String> = []
    private var nextCursor: String?
    private let supabase: SupabaseClient
    private let pageSize = 50
    private let maxFileSize = 10_000_000 // 10MB

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

    /// Sends a new message with optional attachment. Creates a pending placeholder, uploads attachment if present, inserts via REST, and cleans up.
    func sendMessage(text: String, senderName: String, senderAvatarUrl: String?, attachment: AttachmentData? = nil) async {
        guard let conversationId else { return }

        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)

        // Must have either text or attachment
        guard !trimmed.isEmpty || attachment != nil else { return }

        // Enforce 10MB file size limit
        if let attachment, attachment.fileData.count > maxFileSize {
            attachmentError = "File exceeds 10MB limit"
            return
        }

        let displayText = trimmed.isEmpty ? (attachment?.fileName ?? "Attachment") : trimmed
        let pending = PendingMessage(
            id: UUID(),
            text: displayText,
            status: .sending,
            createdAt: Date()
        )
        pendingMessages.append(pending)

        do {
            // Upload attachment first if present
            var uploadedUrl: String?
            var uploadedType: String?
            var uploadedName: String?

            if let attachment {
                let result = try await uploadAttachment(attachment)
                uploadedUrl = result.url
                uploadedType = result.type
                uploadedName = result.name
            }

            let session = try await supabase.auth.session
            let userId = session.user.id.uuidString

            let messageText = trimmed.isEmpty ? "" : trimmed
            let insert = ChatMessageInsert(
                conversationId: conversationId,
                senderId: userId,
                senderName: senderName,
                senderRole: "client",
                senderAvatarUrl: senderAvatarUrl,
                message: messageText,
                attachmentUrl: uploadedUrl,
                attachmentType: uploadedType,
                attachmentName: uploadedName
            )

            let inserted: ChatMessage = try await supabase
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

            // Trigger link preview detection (fire-and-forget)
            if !trimmed.isEmpty {
                Task {
                    await triggerLinkPreview(messageId: inserted.id, text: trimmed)
                }
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

    // MARK: - Attachment Upload

    /// Uploads an attachment to Supabase Storage and returns the public URL and metadata.
    private func uploadAttachment(_ data: AttachmentData) async throws -> (url: String, type: String, name: String) {
        let fileExt = data.fileName.components(separatedBy: ".").last ?? "dat"
        let uniqueName = "\(Int(Date().timeIntervalSince1970))-\(UUID().uuidString.prefix(7)).\(fileExt)"
        let filePath = "attachments/\(uniqueName)"

        // Compress images to target < 1MB
        let uploadData: Data
        if data.mimeType.hasPrefix("image/") {
            uploadData = compressImage(data.fileData, maxBytes: 1_000_000) ?? data.fileData
        } else {
            uploadData = data.fileData
        }

        try await supabase.storage
            .from("chat-attachments")
            .upload(
                path: filePath,
                file: uploadData,
                options: FileOptions(
                    cacheControl: "3600",
                    contentType: data.mimeType
                )
            )

        let publicURL = try supabase.storage
            .from("chat-attachments")
            .getPublicURL(path: filePath)

        let attachmentType = data.mimeType.hasPrefix("image/") ? "image" : "file"
        return (url: publicURL.absoluteString, type: attachmentType, name: data.fileName)
    }

    /// Compresses a JPEG image progressively until it fits within maxBytes.
    private func compressImage(_ data: Data, maxBytes: Int) -> Data? {
        guard let uiImage = UIImage(data: data) else { return nil }
        var quality: CGFloat = 0.8
        var compressed = uiImage.jpegData(compressionQuality: quality)

        while let compressedData = compressed, compressedData.count > maxBytes, quality > 0.1 {
            quality -= 0.1
            compressed = uiImage.jpegData(compressionQuality: quality)
        }

        return compressed
    }

    // MARK: - Link Preview Detection

    /// Detects URLs in message text and triggers the fetch-link-preview edge function.
    private func triggerLinkPreview(messageId: String, text: String) async {
        guard let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue) else { return }
        let range = NSRange(text.startIndex..., in: text)
        let matches = detector.matches(in: text, options: [], range: range)

        guard let firstMatch = matches.first, let url = firstMatch.url else { return }

        // Fire-and-forget: edge function fetches OG metadata and updates the message
        try? await supabase.functions.invoke(
            "fetch-link-preview",
            options: .init(body: ["url": url.absoluteString, "messageId": messageId])
        )
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
