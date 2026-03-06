import Foundation
import SwiftUI

/// Codable struct matching the `leads` Supabase table.
/// IMPORTANT: Leads are fetched by `agent_id`, NOT `client_id`.
struct Lead: Codable, Identifiable, Sendable {
    let id: String
    let leadId: String
    let agentId: String
    let leadDate: String?
    let firstName: String?
    let lastName: String?
    let phone: String?
    let email: String?
    let status: String
    let state: String?
    let submittedPremium: Double?
    let issuedPremium: Double?
    let targetPremium: Double?
    let createdAt: String
    let leadData: [String: AnyCodableValue]?

    enum CodingKeys: String, CodingKey {
        case id
        case leadId = "lead_id"
        case agentId = "agent_id"
        case leadDate = "lead_date"
        case firstName = "first_name"
        case lastName = "last_name"
        case phone, email, status, state
        case submittedPremium = "submitted_premium"
        case issuedPremium = "issued_premium"
        case targetPremium = "target_premium"
        case createdAt = "created_at"
        case leadData = "lead_data"
    }

    /// Combined first + last name, or "Unknown" if both nil.
    var displayName: String {
        let parts = [firstName, lastName].compactMap { $0 }
        return parts.isEmpty ? "Unknown" : parts.joined(separator: " ")
    }

    /// Parsed LeadStatus enum from the raw status string.
    var leadStatus: LeadStatus {
        LeadStatus(rawValue: status) ?? .newLead
    }
}

// MARK: - Lead Status

/// Status values matching the database `status` column on the `leads` table.
enum LeadStatus: String, CaseIterable, Sendable {
    case newLead = "new_lead"
    case contacted = "contacted"
    case bookedCall = "booked_call"
    case submittedApp = "submitted_app"
    case issuedPaid = "issued_paid"
    case declined = "declined"
    case noShow = "no_show"

    /// Human-readable display name.
    var displayName: String {
        switch self {
        case .newLead: return "New Lead"
        case .contacted: return "Contacted"
        case .bookedCall: return "Booked Call"
        case .submittedApp: return "Submitted App"
        case .issuedPaid: return "Issued/Paid"
        case .declined: return "Declined"
        case .noShow: return "No Show"
        }
    }

    /// Color associated with each status for UI pills.
    var color: Color {
        switch self {
        case .newLead: return Color(hex: "00BFFF")       // Bright blue
        case .contacted: return Color(hex: "FF9500")     // Warning orange
        case .bookedCall: return Color(hex: "AF52DE")    // Purple
        case .submittedApp: return Color(hex: "007AFF")  // System blue
        case .issuedPaid: return Color(hex: "00C853")    // Success green
        case .declined: return Color(hex: "FF3B30")      // Error red
        case .noShow: return Color(hex: "666666")        // Gray
        }
    }
}

// MARK: - AnyCodableValue

/// A type-erased Codable value for flexible JSON fields like `lead_data`.
/// Handles String, Double, Int, Bool, and null from mixed-type JSON.
enum AnyCodableValue: Codable, Sendable {
    case string(String)
    case double(Double)
    case int(Int)
    case bool(Bool)
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if container.decodeNil() {
            self = .null
            return
        }
        if let boolVal = try? container.decode(Bool.self) {
            self = .bool(boolVal)
            return
        }
        if let intVal = try? container.decode(Int.self) {
            self = .int(intVal)
            return
        }
        if let doubleVal = try? container.decode(Double.self) {
            self = .double(doubleVal)
            return
        }
        if let stringVal = try? container.decode(String.self) {
            self = .string(stringVal)
            return
        }
        self = .null
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let val): try container.encode(val)
        case .double(let val): try container.encode(val)
        case .int(let val): try container.encode(val)
        case .bool(let val): try container.encode(val)
        case .null: try container.encodeNil()
        }
    }

    /// String representation for display purposes.
    var displayValue: String {
        switch self {
        case .string(let val): return val
        case .double(let val): return String(format: "%.2f", val)
        case .int(let val): return "\(val)"
        case .bool(let val): return val ? "Yes" : "No"
        case .null: return "-"
        }
    }
}
