import Foundation

/// Codable struct matching the `client_wallets` Supabase table.
/// The `trackingStartDate` is critical for wallet balance computation.
struct ClientWallet: Codable, Identifiable, Sendable {
    let id: String
    let clientId: String
    let adSpendBalance: Double
    let lowBalanceThreshold: Double
    let autoChargeAmount: Double?
    let autoBillingEnabled: Bool
    let monthlyAdSpendCap: Double?
    let trackingStartDate: String?

    enum CodingKeys: String, CodingKey {
        case id
        case clientId = "client_id"
        case adSpendBalance = "ad_spend_balance"
        case lowBalanceThreshold = "low_balance_threshold"
        case autoChargeAmount = "auto_charge_amount"
        case autoBillingEnabled = "auto_billing_enabled"
        case monthlyAdSpendCap = "monthly_ad_spend_cap"
        case trackingStartDate = "tracking_start_date"
    }
}

/// Codable struct matching the `wallet_transactions` Supabase table.
/// Used to sum deposits for the wallet balance computation.
struct WalletTransaction: Codable, Identifiable, Sendable {
    let id: String
    let clientId: String
    let transactionType: String
    let amount: Double
    let description: String?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case clientId = "client_id"
        case transactionType = "transaction_type"
        case amount
        case description
        case createdAt = "created_at"
    }
}
