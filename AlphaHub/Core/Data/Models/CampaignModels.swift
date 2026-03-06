import Foundation

/// Codable struct matching the `campaigns` Supabase table.
struct Campaign: Codable, Identifiable, Sendable {
    let id: String
    let clientId: String
    let googleCampaignId: String?
    let campaignName: String?
    let status: String?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case clientId = "client_id"
        case googleCampaignId = "google_campaign_id"
        case campaignName = "campaign_name"
        case status
        case createdAt = "created_at"
    }
}

/// Codable struct matching the `ad_spend_daily` Supabase table.
/// Each row represents one day's spend data for a campaign.
struct AdSpendDaily: Codable, Identifiable, Sendable {
    let id: String
    let clientId: String
    let campaignId: String
    let spendDate: String
    let cost: Double
    let impressions: Int
    let clicks: Int
    let conversions: Int
    let ctr: Double
    let cpc: Double

    enum CodingKeys: String, CodingKey {
        case id
        case clientId = "client_id"
        case campaignId = "campaign_id"
        case spendDate = "spend_date"
        case cost, impressions, clicks, conversions, ctr, cpc
    }

    /// Parsed Date from the `spendDate` string ("2026-03-01") for Swift Charts.
    var dateValue: Date {
        DateFormatting.dateOnly.date(from: spendDate) ?? Date()
    }
}
