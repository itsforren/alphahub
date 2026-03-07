import Foundation

// MARK: - ChatConversation

/// Codable struct matching the `chat_conversations` Supabase table.
struct ChatConversation: Codable, Identifiable, Sendable {
    let id: String
    let clientId: String
    let adminId: String?
    let lastMessageAt: String?
    let unreadCountClient: Int
    let unreadCountAdmin: Int
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case clientId = "client_id"
        case adminId = "admin_id"
        case lastMessageAt = "last_message_at"
        case unreadCountClient = "unread_count_client"
        case unreadCountAdmin = "unread_count_admin"
        case createdAt = "created_at"
    }
}

// MARK: - ChatMessage

/// Codable struct matching the `chat_messages` Supabase table.
struct ChatMessage: Codable, Identifiable, Sendable {
    let id: String
    let conversationId: String
    let senderId: String
    let senderName: String
    let senderRole: String // "client" or "admin"
    let senderAvatarUrl: String?
    let message: String
    let attachmentUrl: String?
    let attachmentType: String?
    let attachmentName: String?
    let linkPreview: LinkPreviewData?
    let readAt: String?
    let createdAt: String

    /// True when the message was sent by the client (right-aligned blue bubble).
    var isClient: Bool { senderRole == "client" }

    /// Parsed creation date using the project's standard ISO 8601 parsing.
    var parsedCreatedAt: Date? { createdAt.parsedDate }

    enum CodingKeys: String, CodingKey {
        case id
        case conversationId = "conversation_id"
        case senderId = "sender_id"
        case senderName = "sender_name"
        case senderRole = "sender_role"
        case senderAvatarUrl = "sender_avatar_url"
        case message
        case attachmentUrl = "attachment_url"
        case attachmentType = "attachment_type"
        case attachmentName = "attachment_name"
        case linkPreview = "link_preview"
        case readAt = "read_at"
        case createdAt = "created_at"
    }
}

// MARK: - LinkPreviewData

/// JSON sub-object for link preview metadata within a chat message.
struct LinkPreviewData: Codable, Sendable {
    let url: String?
    let title: String?
    let description: String?
    let image: String?
    let siteName: String?

    enum CodingKeys: String, CodingKey {
        case url, title, description, image
        case siteName = "site_name"
    }
}

// MARK: - ChatMessageInsert

/// Insert-only DTO for creating new chat messages via Supabase REST.
struct ChatMessageInsert: Codable, Sendable {
    let conversationId: String
    let senderId: String
    let senderName: String
    let senderRole: String
    let senderAvatarUrl: String?
    let message: String
    let attachmentUrl: String?
    let attachmentType: String?
    let attachmentName: String?

    enum CodingKeys: String, CodingKey {
        case conversationId = "conversation_id"
        case senderId = "sender_id"
        case senderName = "sender_name"
        case senderRole = "sender_role"
        case senderAvatarUrl = "sender_avatar_url"
        case message
        case attachmentUrl = "attachment_url"
        case attachmentType = "attachment_type"
        case attachmentName = "attachment_name"
    }
}

// MARK: - PendingMessage

/// Local-only model for the offline message queue (not persisted to server).
struct PendingMessage: Identifiable {
    let id: UUID
    let text: String
    var status: Status
    let createdAt: Date

    enum Status {
        case sending
        case failed
    }
}

// MARK: - ChatSettings

/// Codable struct matching the `chat_settings` Supabase table.
struct ChatSettings: Codable, Sendable {
    let id: String?
    let businessHoursStart: Int
    let businessHoursEnd: Int
    let businessHoursTimezone: String
    let businessDays: [String]

    enum CodingKeys: String, CodingKey {
        case id
        case businessHoursStart = "business_hours_start"
        case businessHoursEnd = "business_hours_end"
        case businessHoursTimezone = "business_hours_timezone"
        case businessDays = "business_days"
    }
}
