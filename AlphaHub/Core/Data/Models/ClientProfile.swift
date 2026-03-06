import Foundation

/// Codable struct matching the `clients` Supabase table.
/// Fetched via `user_id = auth.uid()` to establish client identity.
struct ClientProfile: Codable, Identifiable, Sendable {
    let id: String
    let userId: String?
    let agentId: String?
    let name: String
    let email: String
    let phone: String?
    let status: String
    let profileImageUrl: String?

    // Financial
    let managementFee: Double?
    let monthlyAdSpend: Double?
    let adSpendBudget: Double?
    let targetDailySpend: Double?

    // Metrics (pre-computed on server)
    let mtdAdSpend: Double?
    let mtdLeads: Int?
    let bookedCalls: Int?
    let applications: Int?
    let cpl: Double?
    let cpba: Double?
    let commissionContractPercent: Double?

    // Links
    let nfiaLink: String?
    let schedulerLink: String?
    let landerLink: String?
    let thankyouLink: String?
    let tfwpProfileLink: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case agentId = "agent_id"
        case name, email, phone, status
        case profileImageUrl = "profile_image_url"
        case managementFee = "management_fee"
        case monthlyAdSpend = "monthly_ad_spend"
        case adSpendBudget = "ad_spend_budget"
        case targetDailySpend = "target_daily_spend"
        case mtdAdSpend = "mtd_ad_spend"
        case mtdLeads = "mtd_leads"
        case bookedCalls = "booked_calls"
        case applications
        case cpl, cpba
        case commissionContractPercent = "commission_contract_percent"
        case nfiaLink = "nfia_link"
        case schedulerLink = "scheduler_link"
        case landerLink = "lander_link"
        case thankyouLink = "thankyou_link"
        case tfwpProfileLink = "tfwp_profile_link"
    }
}
