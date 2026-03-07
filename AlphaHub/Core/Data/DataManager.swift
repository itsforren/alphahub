import Foundation
import Observation
import Supabase

/// Central data state manager for all dashboard and billing data.
/// Fetches client profile by `auth.uid()`, then parallel-fetches all related data.
/// Injected via `.environment()` at the app root.
@MainActor
@Observable
final class DataManager {
    // MARK: - Client Identity

    var clientProfile: ClientProfile?

    // MARK: - Dashboard Data

    var wallet: ClientWallet?
    var totalDeposits: Double = 0
    var trackedSpend: Double = 0
    var performancePercentage: Double = 0
    var adSpendDaily: [AdSpendDaily] = []
    var leads: [Lead] = []
    var campaigns: [Campaign] = []

    // MARK: - Billing Data

    var billingRecords: [BillingRecord] = []
    var paymentMethods: [PaymentMethod] = []

    // MARK: - Chat Data

    var unreadChatCount: Int = 0

    // MARK: - Loading State

    var isInitialLoad = true
    var isRefreshing = false
    var error: String?

    // MARK: - Private

    private let supabase: SupabaseClient

    init(supabase: SupabaseClient = SupabaseConfig.client) {
        self.supabase = supabase
    }

    // MARK: - Computed Properties

    /// Displayed spend = tracked spend inflated by performance percentage.
    /// Matches the web app's `useComputedWalletBalance.ts` formula.
    var displayedSpend: Double {
        trackedSpend * (1 + performancePercentage / 100)
    }

    /// Wallet balance = total deposits - displayed spend.
    /// CRITICAL: This is COMPUTED, not stored as a single column.
    var remainingBalance: Double {
        totalDeposits - displayedSpend
    }

    /// Client's first name for the greeting.
    var firstName: String {
        clientProfile?.name.components(separatedBy: " ").first ?? ""
    }

    /// Computed wallet display metrics for the hero card.
    var walletMetrics: WalletDisplayMetrics {
        let calendar = Calendar.current
        let now = Date()
        let day = calendar.component(.day, from: now)
        let range = calendar.range(of: .day, in: .month, for: now)
        let daysInMonth = range?.count ?? 30

        let monthlyMax = wallet?.monthlyAdSpendCap ?? 0
        let spent = displayedSpend
        let remaining = max(monthlyMax - spent, 0)

        return WalletDisplayMetrics(
            balance: remainingBalance,
            monthlyMax: monthlyMax,
            spentThisMonth: spent,
            remaining: remaining,
            dayOfMonth: day,
            daysInMonth: daysInMonth,
            threshold: wallet?.lowBalanceThreshold ?? 0,
            rechargeAmount: wallet?.autoChargeAmount ?? 0
        )
    }

    /// Next upcoming payment: first billing record with status "pending" or "upcoming", sorted by due_date ascending.
    var nextUpcomingPayment: BillingRecord? {
        billingRecords
            .filter { $0.status == "pending" || $0.status == "upcoming" }
            .filter { $0.dueDate != nil }
            .sorted { ($0.dueDate ?? "") < ($1.dueDate ?? "") }
            .first
    }

    /// Computed dashboard metrics from leads + client profile + ad spend.
    var dashboardMetrics: DashboardMetrics {
        DashboardMetrics(
            leads: leads,
            clientProfile: clientProfile,
            totalAdSpend: displayedSpend
        )
    }

    // MARK: - Initial Load

    /// Load all data: fetch client profile first, then parallel-fetch everything else.
    func loadAllData() async {
        do {
            let session = try await supabase.auth.session
            let userId = session.user.id

            // Step 1: Get client profile (needed for client_id and agent_id)
            let profile: ClientProfile = try await supabase
                .from("clients")
                .select()
                .eq("user_id", value: userId.uuidString)
                .single()
                .execute()
                .value

            self.clientProfile = profile

            // Step 2: Parallel-fetch everything using client_id and agent_id
            await withTaskGroup(of: Void.self) { group in
                group.addTask { await self.fetchWalletData(clientId: profile.id) }
                group.addTask { await self.fetchBillingRecords(clientId: profile.id) }
                group.addTask { await self.fetchLeads(agentId: profile.agentId) }
                group.addTask { await self.fetchAdSpendDaily(clientId: profile.id) }
                group.addTask { await self.fetchCampaigns(clientId: profile.id) }
                group.addTask { await self.fetchPaymentMethods(clientId: profile.id) }
                group.addTask { await self.fetchPerformancePercentage() }
                group.addTask { await self.fetchUnreadChatCount(clientId: profile.id) }
            }

            self.isInitialLoad = false
            self.error = nil
        } catch {
            self.error = error.localizedDescription
            self.isInitialLoad = false
        }
    }

    /// Refresh all data (pull-to-refresh).
    func refreshAll() async {
        isRefreshing = true
        await loadAllData()
        isRefreshing = false
    }

    // MARK: - Individual Fetch Methods

    /// Fetch wallet record, sum deposits, and compute tracked spend since tracking_start_date.
    /// CRITICAL: This implements the wallet balance computation from Pattern 3.
    private func fetchWalletData(clientId: String) async {
        // Get wallet record
        let fetchedWallet: ClientWallet? = try? await supabase
            .from("client_wallets")
            .select()
            .eq("client_id", value: clientId)
            .single()
            .execute()
            .value

        self.wallet = fetchedWallet

        // Sum all deposit transactions
        struct AmountRow: Decodable { let amount: Double }
        let deposits: [AmountRow] = (try? await supabase
            .from("wallet_transactions")
            .select("amount")
            .eq("client_id", value: clientId)
            .eq("transaction_type", value: "deposit")
            .execute()
            .value) ?? []

        self.totalDeposits = deposits.reduce(0) { $0 + $1.amount }

        // Sum ad spend since tracking_start_date
        guard let startDate = fetchedWallet?.trackingStartDate else {
            self.trackedSpend = 0
            return
        }

        struct CostRow: Decodable { let cost: Double }
        let spendRows: [CostRow] = (try? await supabase
            .from("ad_spend_daily")
            .select("cost")
            .eq("client_id", value: clientId)
            .gte("spend_date", value: startDate)
            .execute()
            .value) ?? []

        self.trackedSpend = spendRows.reduce(0) { $0 + $1.cost }
    }

    /// Fetch non-archived billing records, newest first.
    private func fetchBillingRecords(clientId: String) async {
        let records: [BillingRecord] = (try? await supabase
            .from("billing_records")
            .select()
            .eq("client_id", value: clientId)
            .is("archived_at", value: nil)
            .order("created_at", ascending: false)
            .execute()
            .value) ?? []

        self.billingRecords = records
    }

    /// Fetch leads by agent_id (NOT client_id), newest first.
    private func fetchLeads(agentId: String?) async {
        guard let agentId else {
            self.leads = []
            return
        }

        let fetchedLeads: [Lead] = (try? await supabase
            .from("leads")
            .select()
            .eq("agent_id", value: agentId)
            .order("lead_date", ascending: false)
            .execute()
            .value) ?? []

        self.leads = fetchedLeads
    }

    /// Fetch ad spend daily data, last 90 days, newest first.
    private func fetchAdSpendDaily(clientId: String) async {
        let calendar = Calendar.current
        let ninetyDaysAgo = calendar.date(byAdding: .day, value: -90, to: Date()) ?? Date()
        let startDateString = DateFormatting.dateOnly.string(from: ninetyDaysAgo)

        let spend: [AdSpendDaily] = (try? await supabase
            .from("ad_spend_daily")
            .select()
            .eq("client_id", value: clientId)
            .gte("spend_date", value: startDateString)
            .order("spend_date", ascending: false)
            .execute()
            .value) ?? []

        self.adSpendDaily = spend
    }

    /// Fetch campaigns for filter dropdown.
    private func fetchCampaigns(clientId: String) async {
        let fetchedCampaigns: [Campaign] = (try? await supabase
            .from("campaigns")
            .select()
            .eq("client_id", value: clientId)
            .execute()
            .value) ?? []

        self.campaigns = fetchedCampaigns
    }

    /// Fetch payment methods for billing display.
    private func fetchPaymentMethods(clientId: String) async {
        let methods: [PaymentMethod] = (try? await supabase
            .from("client_payment_methods")
            .select()
            .eq("client_id", value: clientId)
            .execute()
            .value) ?? []

        self.paymentMethods = methods
    }

    /// Fetch performance percentage from onboarding_settings.
    /// Defaults to 0 if RLS blocks access or setting doesn't exist.
    private func fetchPerformancePercentage() async {
        struct SettingRow: Decodable {
            let settingValue: String?
            enum CodingKeys: String, CodingKey {
                case settingValue = "setting_value"
            }
        }

        let row: SettingRow? = try? await supabase
            .from("onboarding_settings")
            .select("setting_value")
            .eq("setting_key", value: "performance_percentage")
            .single()
            .execute()
            .value

        self.performancePercentage = Double(row?.settingValue ?? "") ?? 0
    }

    /// Fetch unread chat message count for the badge on the Chat tab.
    private func fetchUnreadChatCount(clientId: String) async {
        struct UnreadRow: Decodable {
            let unreadCountClient: Int
            enum CodingKeys: String, CodingKey {
                case unreadCountClient = "unread_count_client"
            }
        }

        let rows: [UnreadRow] = (try? await supabase
            .from("chat_conversations")
            .select("unread_count_client")
            .eq("client_id", value: clientId)
            .execute()
            .value) ?? []

        self.unreadChatCount = rows.reduce(0) { $0 + $1.unreadCountClient }
    }
}
