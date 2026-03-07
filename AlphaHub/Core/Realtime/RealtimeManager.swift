import Foundation
import Observation
import Realtime
import Supabase

/// Manages WebSocket lifecycle for chat: connect, disconnect, reconnect, and typing broadcast.
/// Injected via `.environment()` at the app root.
@MainActor
@Observable
final class RealtimeManager {
    // MARK: - Public State

    var isConnected = false
    var typingUsers: Set<String> = []

    // MARK: - Private

    private var channel: RealtimeChannelV2?
    private var messageTask: Task<Void, Never>?
    private var typingTask: Task<Void, Never>?
    private var typingClearTasks: [String: Task<Void, Never>] = [:]
    private let supabase: SupabaseClient

    init(supabase: SupabaseClient = SupabaseConfig.client) {
        self.supabase = supabase
    }

    // MARK: - Connect

    /// Subscribes to postgres INSERT changes and broadcast typing events for the given conversation.
    /// - Parameters:
    ///   - conversationId: The conversation to listen on.
    ///   - onNewMessage: Called on the main actor when a new message is inserted.
    func connect(conversationId: String, onNewMessage: @escaping @MainActor (ChatMessage) -> Void) async {
        // Clean up any existing connection first
        await disconnect()

        let ch = supabase.channel("chat-\(conversationId)")

        // Set up postgres change listener BEFORE subscribing
        let insertions = ch.postgresChange(
            InsertAction.self,
            schema: "public",
            table: "chat_messages",
            filter: .eq("conversation_id", value: conversationId)
        )

        // Set up broadcast listener for typing events
        let typingStream = ch.broadcastStream(event: "typing")

        // Subscribe to the channel
        do {
            try await ch.subscribeWithError()
        } catch {
            // Subscription failed -- don't set isConnected
            return
        }

        self.channel = ch
        self.isConnected = true

        // Start listening for new message insertions
        messageTask = Task { [weak self] in
            for await insertion in insertions {
                guard !Task.isCancelled else { break }
                // Decode the record into ChatMessage
                let decoder = JSONDecoder()
                if let msg = try? insertion.decodeRecord(as: ChatMessage.self, decoder: decoder) {
                    await MainActor.run {
                        onNewMessage(msg)
                    }
                }
            }
        }

        // Start listening for typing broadcasts
        typingTask = Task { [weak self] in
            for await payload in typingStream {
                guard !Task.isCancelled else { break }
                guard let self else { break }
                if let payloadObj = payload["payload"]?.objectValue,
                   let userId = payloadObj["user_id"]?.stringValue,
                   let isTyping = payloadObj["is_typing"]?.boolValue {
                    await MainActor.run {
                        if isTyping {
                            self.typingUsers.insert(userId)
                            // Auto-clear after 5 seconds
                            self.typingClearTasks[userId]?.cancel()
                            self.typingClearTasks[userId] = Task {
                                try? await Task.sleep(for: .seconds(5))
                                guard !Task.isCancelled else { return }
                                self.typingUsers.remove(userId)
                            }
                        } else {
                            self.typingUsers.remove(userId)
                            self.typingClearTasks[userId]?.cancel()
                            self.typingClearTasks.removeValue(forKey: userId)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Typing Broadcast

    /// Broadcasts a typing indicator to other participants.
    func sendTyping(isTyping: Bool) async {
        guard let channel else { return }
        struct TypingPayload: Codable {
            let userId: String
            let isTyping: Bool

            enum CodingKeys: String, CodingKey {
                case userId = "user_id"
                case isTyping = "is_typing"
            }
        }
        let userId = (try? await supabase.auth.session.user.id.uuidString) ?? ""
        try? await channel.broadcast(event: "typing", message: TypingPayload(userId: userId, isTyping: isTyping))
    }

    // MARK: - Disconnect

    /// Unsubscribes from the channel and cleans up tasks.
    func disconnect() async {
        messageTask?.cancel()
        messageTask = nil
        typingTask?.cancel()
        typingTask = nil
        for task in typingClearTasks.values { task.cancel() }
        typingClearTasks.removeAll()
        typingUsers.removeAll()

        if let channel {
            await supabase.removeChannel(channel)
            self.channel = nil
        }
        isConnected = false
    }

    // MARK: - Reconnect

    /// Disconnects then reconnects. Use after returning from background.
    func reconnect(conversationId: String, onNewMessage: @escaping @MainActor (ChatMessage) -> Void) async {
        await connect(conversationId: conversationId, onNewMessage: onNewMessage)
    }
}
