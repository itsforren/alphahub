import Foundation

// MARK: - PushNotificationType

/// Notification types matching server-side push payload "type" field.
/// Each case defines grouping (threadIdentifier) and action behavior (categoryIdentifier).
enum PushNotificationType: String, Sendable {
    case chat
    case billing
    case course
    case lead
    case walletLow = "wallet_low"

    /// Thread identifier for notification center grouping (iOS groups by thread).
    var threadIdentifier: String {
        switch self {
        case .chat: return "chat"
        case .billing, .walletLow: return "billing"
        case .course: return "courses"
        case .lead: return "leads"
        }
    }

    /// Category identifier for notification actions (reply button, etc.).
    var categoryIdentifier: String {
        switch self {
        case .chat: return "CHAT_MESSAGE"
        case .billing: return "BILLING_REMINDER"
        case .course: return "COURSE_UPDATE"
        case .lead: return "LEAD_NEW"
        case .walletLow: return "WALLET_LOW"
        }
    }
}

// MARK: - DeviceTokenRecord

/// Codable struct for upserting into the `device_tokens` Supabase table.
struct DeviceTokenRecord: Codable, Sendable {
    let id: String?
    let userId: String
    let deviceToken: String
    let platform: String
    let createdAt: String?
    let updatedAt: String?

    init(userId: String, deviceToken: String, platform: String = "ios") {
        self.id = nil
        self.userId = userId
        self.deviceToken = deviceToken
        self.platform = platform
        self.createdAt = nil
        self.updatedAt = nil
    }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case deviceToken = "device_token"
        case platform
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
