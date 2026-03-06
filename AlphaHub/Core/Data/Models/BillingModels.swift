import Foundation
import SwiftUI

/// Codable struct matching the `billing_records` Supabase table.
/// Fetched with `.is("archived_at", value: nil)` to exclude archived records.
struct BillingRecord: Codable, Identifiable, Sendable {
    let id: String
    let clientId: String
    let billingType: String
    let amount: Double
    let billingPeriodStart: String?
    let billingPeriodEnd: String?
    let dueDate: String?
    let status: String
    let paidAt: String?
    let stripeAccount: String?
    let archivedAt: String?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case clientId = "client_id"
        case billingType = "billing_type"
        case amount
        case billingPeriodStart = "billing_period_start"
        case billingPeriodEnd = "billing_period_end"
        case dueDate = "due_date"
        case status
        case paidAt = "paid_at"
        case stripeAccount = "stripe_account"
        case archivedAt = "archived_at"
        case createdAt = "created_at"
    }
}

/// Codable struct matching the `client_payment_methods` Supabase table.
struct PaymentMethod: Codable, Identifiable, Sendable {
    let id: String
    let clientId: String
    let stripeAccount: String
    let cardBrand: String?
    let cardLastFour: String?
    let cardExpMonth: Int?
    let cardExpYear: Int?
    let isDefault: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case clientId = "client_id"
        case stripeAccount = "stripe_account"
        case cardBrand = "card_brand"
        case cardLastFour = "card_last_four"
        case cardExpMonth = "card_exp_month"
        case cardExpYear = "card_exp_year"
        case isDefault = "is_default"
    }

    /// Formatted expiry string, e.g. "03/26"
    var expiryString: String {
        guard let month = cardExpMonth, let year = cardExpYear else { return "" }
        return String(format: "%02d/%02d", month, year % 100)
    }

    /// Human-readable card brand name
    var brandDisplayName: String {
        guard let brand = cardBrand?.lowercased() else { return "Card" }
        switch brand {
        case "visa": return "Visa"
        case "mastercard": return "Mastercard"
        case "amex", "american_express": return "Amex"
        case "discover": return "Discover"
        default: return brand.capitalized
        }
    }
}

/// Lightweight struct for representing upcoming payment indicators.
struct UpcomingPayment: Sendable {
    let billingType: String
    let amount: Double
    let dueDate: String
}
