# Phase 2: Core Value - Research

**Researched:** 2026-03-06
**Domain:** iOS native dashboard, billing, leads pipeline, campaign graphs -- all reading from existing Supabase tables via supabase-swift
**Confidence:** HIGH

## Summary

Phase 2 builds the daily-use screens of the Alpha Hub iOS app: a comprehensive Dashboard (wallet hero, business results, campaign spend graph, cost metrics, leads pipeline) and a Billing screen (transaction list, filters, payment methods, detail sheet). All data already exists in the Supabase backend -- the iOS app needs only READ access to existing tables. No new edge functions or database migrations are required.

The standard stack is supabase-swift for all data access (already set up in Phase 1), Apple's Swift Charts framework (built into iOS 16+) for the campaign spend sparkline/graph, and native SwiftUI components (ScrollView, .refreshable, .sheet, .searchable). The existing design system from Phase 1 (AppColors, AppTypography, GlassCard, HeroNumber) provides the visual foundation. Key architectural patterns include an `@Observable` DataManager that owns all dashboard state, Codable Swift structs mirroring the Supabase table schemas, and a single pull-to-refresh action that reloads everything in parallel.

A critical finding: the wallet balance is COMPUTED (total deposits - tracked ad spend since tracking_start_date), not stored as a single column. The iOS app must replicate this computation exactly as the web app does it. Additionally, the `performance_percentage` setting from `onboarding_settings` inflates displayed spend -- the iOS app must apply this same multiplier for consistency.

**Primary recommendation:** Create a `DashboardManager` @Observable class that fetches the client record (via `user_id = auth.uid()`), then parallel-fetches wallet, billing, leads, ad_spend_daily, campaigns, and payment methods using the client's `id` and `agent_id`. Use Swift Charts `LineMark` + `AreaMark` for the campaign spend graph. Use `.refreshable` on ScrollView for pull-to-refresh with haptic on completion.

## Standard Stack

### Core (already installed from Phase 1)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| supabase-swift | 2.41.1+ | All database queries (REST API) | Already configured with KeychainLocalStorage; provides `.from().select().eq().execute().value` fluent API |

### Apple Frameworks (no SPM needed)

| Framework | Purpose | When to Use |
|-----------|---------|-------------|
| Charts | `LineMark`, `AreaMark` for campaign spend graph | iOS 16+ built-in; no dependency needed |
| SwiftUI | `.refreshable`, `.sheet`, `.searchable`, `ScrollView` | All UI composition |
| Foundation | `NumberFormatter`, `RelativeDateTimeFormatter` | Number abbreviation ($12.4K), relative dates ("2 days ago") |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Apple Swift Charts | DSFSparkline (3rd party) | Unnecessary dependency; Swift Charts is first-party and sufficient |
| Apple Swift Charts | ChartsOrg/Charts (DGCharts) | Heavy UIKit-based library; Swift Charts is native SwiftUI |
| Custom shimmer | SwiftUI-Shimmer SPM package | Adds dependency; `.redacted(reason: .placeholder)` + custom overlay achieves same effect without dependency |
| Custom number formatting | No alternative needed | Foundation's `.notation(.compactName)` handles $12.4K natively |

**No new SPM dependencies needed.** Phase 2 uses only supabase-swift (already installed) plus Apple frameworks.

## Architecture Patterns

### Recommended Project Structure (additions to Phase 1)

```
AlphaHub/
├── Core/
│   ├── Data/
│   │   ├── DataManager.swift           # @Observable -- owns all dashboard/billing data state
│   │   └── Models/
│   │       ├── ClientProfile.swift      # Codable struct for clients table
│   │       ├── WalletModels.swift       # ClientWallet, WalletTransaction
│   │       ├── BillingModels.swift      # BillingRecord, PaymentMethod, UpcomingPayment
│   │       ├── LeadModels.swift         # Lead, LeadStatus enum
│   │       ├── CampaignModels.swift     # Campaign, AdSpendDaily
│   │       └── MetricsModels.swift      # Computed metrics (CPL, CPBC, ROI, etc.)
│   └── Formatting/
│       ├── CurrencyFormatter.swift      # $12.4K abbreviation, $0 zero handling
│       └── DateFormatting.swift         # Relative dates ("2 days ago", "Yesterday")
├── Features/
│   ├── Dashboard/
│   │   ├── DashboardView.swift          # Main scrollable dashboard screen
│   │   ├── WalletHeroCard.swift         # Balance, progress, day X of 30
│   │   ├── QuickLinkPills.swift         # Horizontal scrollable pill buttons
│   │   ├── BusinessResultsSection.swift # Submitted business, issued paid, ROI, contract %
│   │   ├── CampaignSpendChart.swift     # Swift Charts line/area graph
│   │   ├── CostMetricsSection.swift     # CPL, CPBC, CPSA, CPIA, avg commission
│   │   └── LeadsPipelineList.swift      # Searchable leads list with status pills
│   ├── Billing/
│   │   ├── BillingView.swift            # Transaction list + filters
│   │   ├── BillingFilterBar.swift       # Segmented control: All / Ad Spend / Management
│   │   ├── BillingTransactionRow.swift  # Single transaction row with status badge
│   │   ├── TransactionDetailSheet.swift # Bottom sheet with detail view
│   │   └── PaymentMethodCards.swift     # Card brand, last 4, expiry display
│   └── Leads/
│       ├── LeadDetailSheet.swift        # Full lead details, survey answers
│       └── LeadStatusPill.swift         # Color-coded status pill component
├── Shared/
│   ├── Components/
│   │   ├── ShimmerModifier.swift        # Shimmer loading animation
│   │   ├── StatusPill.swift             # Reusable color-coded status pill
│   │   ├── MetricCard.swift             # Single metric display card
│   │   └── SectionHeader.swift          # Section title + optional action
│   └── Extensions/
│       ├── NumberFormatting+Ext.swift    # .abbreviated property for numbers
│       └── Date+RelativeFormatting.swift # .relativeDescription property
```

### Pattern 1: DataManager -- Central Data State

**What:** Single `@Observable` class that owns all dashboard and billing data. Injected via `.environment()` at app root.
**When to use:** All data fetching for dashboard and billing screens.

```swift
// Source: supabase-swift official docs + existing web app hook patterns
import Observation
import Supabase

@MainActor
@Observable
final class DataManager {
    // Client identity
    var clientProfile: ClientProfile?

    // Dashboard data
    var wallet: ClientWallet?
    var totalDeposits: Double = 0
    var trackedSpend: Double = 0
    var performancePercentage: Double = 0
    var adSpendDaily: [AdSpendDaily] = []
    var leads: [Lead] = []
    var campaigns: [Campaign] = []

    // Billing data
    var billingRecords: [BillingRecord] = []
    var paymentMethods: [PaymentMethod] = []
    var upcomingAdSpend: UpcomingPayment?
    var upcomingManagement: UpcomingPayment?

    // Loading states
    var isInitialLoad = true
    var isRefreshing = false
    var error: String?

    private let supabase: SupabaseClient

    init(supabase: SupabaseClient = SupabaseConfig.client) {
        self.supabase = supabase
    }

    // MARK: - Computed Properties

    var displayedSpend: Double {
        trackedSpend * (1 + performancePercentage / 100)
    }

    var remainingBalance: Double {
        totalDeposits - displayedSpend
    }

    var firstName: String {
        clientProfile?.name.components(separatedBy: " ").first ?? ""
    }

    // MARK: - Initial Load

    func loadAllData() async {
        guard let userId = try? await supabase.auth.session.user.id else { return }

        // Step 1: Get client profile (needed for client_id and agent_id)
        do {
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
                group.addTask { await self.fetchUpcomingPayments(clientId: profile.id) }
                group.addTask { await self.fetchPerformancePercentage() }
            }

            self.isInitialLoad = false
        } catch {
            self.error = error.localizedDescription
            self.isInitialLoad = false
        }
    }

    // MARK: - Refresh All (pull-to-refresh)

    func refreshAll() async {
        isRefreshing = true
        await loadAllData()
        isRefreshing = false
    }
}
```

### Pattern 2: Codable Models Matching Supabase Tables

**What:** Swift structs with `Codable` conformance that exactly match the Supabase table column names (snake_case).
**When to use:** All database query result decoding.

```swift
// Source: Verified against existing web app TypeScript interfaces and DB migrations

struct ClientProfile: Codable, Identifiable {
    let id: String               // UUID
    let userId: String?          // maps to user_id via CodingKeys
    let agentId: String?         // maps to agent_id
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
    let cpba: Double?            // Cost per booked appointment
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

struct ClientWallet: Codable, Identifiable {
    let id: String
    let clientId: String
    let adSpendBalance: Double
    let lowBalanceThreshold: Double
    let autoChargeAmount: Double?
    let autoBillingEnabled: Bool
    let monthlyAdSpendCap: Double?
    let trackingStartDate: String?  // ISO date string

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

struct AdSpendDaily: Codable, Identifiable {
    let id: String
    let clientId: String
    let campaignId: String
    let spendDate: String          // DATE as string "2026-03-01"
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
}
```

### Pattern 3: Wallet Balance Computation (CRITICAL)

**What:** Wallet balance is NOT stored directly. It must be computed as: `totalDeposits - displayedSpend` where `displayedSpend = trackedSpend * (1 + performancePercentage / 100)`.
**When to use:** Every time wallet balance is displayed.

```swift
// Source: Verified from useComputedWalletBalance.ts in web app

// Step 1: Fetch total deposits
func fetchWalletData(clientId: String) async {
    // Get wallet record (tracking_start_date is critical)
    let wallet: ClientWallet? = try? await supabase
        .from("client_wallets")
        .select("id, tracking_start_date, low_balance_threshold")
        .eq("client_id", value: clientId)
        .single()
        .execute()
        .value

    self.wallet = wallet

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
    guard let startDate = wallet?.trackingStartDate else {
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

// Step 2: Fetch performance percentage
func fetchPerformancePercentage() async {
    struct SettingRow: Decodable { let settingValue: String?
        enum CodingKeys: String, CodingKey { case settingValue = "setting_value" }
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

// Step 3: Display
// remainingBalance = totalDeposits - (trackedSpend * (1 + performancePercentage / 100))
```

### Pattern 4: Swift Charts Campaign Spend Graph

**What:** LineMark + AreaMark with gradient fill, hidden axes for sparkline or full axes for detail view.
**When to use:** Campaign spend visualization on dashboard.

```swift
// Source: Apple Swift Charts docs (iOS 16+)
import Charts

struct CampaignSpendChart: View {
    let data: [AdSpendDaily]

    var body: some View {
        Chart(data) { point in
            // Area fill with gradient
            AreaMark(
                x: .value("Date", point.dateValue),
                y: .value("Spend", point.cost)
            )
            .foregroundStyle(
                LinearGradient(
                    colors: [AppColors.accent.opacity(0.3), AppColors.accent.opacity(0.01)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .interpolationMethod(.catmullRom)

            // Line on top
            LineMark(
                x: .value("Date", point.dateValue),
                y: .value("Spend", point.cost)
            )
            .foregroundStyle(AppColors.accent)
            .lineStyle(StrokeStyle(lineWidth: 2))
            .interpolationMethod(.catmullRom)
        }
        .chartXAxis(.hidden)         // For sparkline: hide
        .chartYAxis(.hidden)         // For sparkline: hide
        .frame(height: 120)
    }
}
```

### Pattern 5: Pull-to-Refresh with Haptic

**What:** `.refreshable` modifier on ScrollView triggers full data reload with haptic feedback on completion.
**When to use:** Dashboard and Billing screens.

```swift
// Source: Apple SwiftUI docs (iOS 15+ for List, iOS 16+ for ScrollView)

ScrollView {
    // Dashboard content...
}
.refreshable {
    await dataManager.refreshAll()
    HapticManager.notification(.success)
}
```

### Pattern 6: Shimmer Loading Skeleton

**What:** Custom shimmer modifier using `.redacted(reason: .placeholder)` + animating gradient overlay.
**When to use:** Initial load state before data arrives.

```swift
// Source: Community-verified SwiftUI pattern; no external dependency

struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .redacted(reason: .placeholder)
            .overlay(
                GeometryReader { geo in
                    LinearGradient(
                        colors: [.clear, Color.white.opacity(0.15), .clear],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geo.size.width * 0.5)
                    .offset(x: -geo.size.width * 0.25 + geo.size.width * 1.5 * phase)
                    .blendMode(.screen)
                }
                .mask(content.redacted(reason: .placeholder))
            )
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

extension View {
    func shimmer() -> some View {
        modifier(ShimmerModifier())
    }
}
```

### Pattern 7: Phone Call and iMessage Deep Links

**What:** Open iOS dialer or iMessage directly from lead detail.
**When to use:** Call/Message buttons on lead entries.

```swift
// Source: Apple URL Scheme Reference
// Call -- goes straight to dialer
func callPhone(_ number: String) {
    guard let url = URL(string: "tel://\(number.replacingOccurrences(of: " ", with: ""))"),
          UIApplication.shared.canOpenURL(url) else { return }
    UIApplication.shared.open(url)
}

// Message -- goes straight to iMessage
func sendMessage(_ number: String) {
    guard let url = URL(string: "sms://\(number.replacingOccurrences(of: " ", with: ""))"),
          UIApplication.shared.canOpenURL(url) else { return }
    UIApplication.shared.open(url)
}
```

### Anti-Patterns to Avoid

- **Fetching data in each View's `.task`:** Centralize all data in DataManager. Views observe the manager, not individual queries. Prevents redundant fetches and race conditions.
- **Storing wallet balance as a single value:** Balance is COMPUTED from deposits minus tracked spend. Never cache it -- always derive it from source data.
- **Ignoring performance_percentage:** The web app inflates displayed spend by this percentage. iOS must do the same or numbers will mismatch.
- **Using List for dashboard layout:** Dashboard has mixed content (hero cards, charts, sections). Use ScrollView + LazyVStack, not List. Apply `.refreshable` to ScrollView (iOS 16+).
- **Blocking main thread with serial queries:** Use `withTaskGroup` for parallel data fetching. Each table query is independent.
- **Hardcoding client_id:** Always derive from `auth.uid()` via the `clients` table `user_id` column. Never store or hardcode.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Line/area charts | Custom Canvas/Path drawing | Apple Swift Charts (`LineMark`, `AreaMark`) | Built-in, performant, handles interpolation, axes, scaling |
| Number abbreviation ($12.4K) | Custom string formatting | `Decimal.FormatStyle.number.notation(.compactName)` | Localized, handles K/M/B automatically |
| Relative dates | Manual "X days ago" logic | `RelativeDateTimeFormatter` | Localized, handles edge cases (today, yesterday, etc.) |
| Pull-to-refresh | Custom scroll offset tracking | `.refreshable` modifier on ScrollView | Built-in iOS 16+, handles spinner, prevents duplicate refresh |
| Skeleton loading | Custom placeholder views | `.redacted(reason: .placeholder)` + shimmer overlay | SwiftUI native; produces correct shapes automatically |
| Segmented control | Custom button row | SwiftUI `Picker` with `.pickerStyle(.segmented)` | Native look, accessibility, haptics built-in |
| Bottom sheet | Custom drag gesture view | `.sheet` with `presentationDetents([.medium, .large])` | Native iOS 16+ half-sheet; handles drag, dismiss, keyboard |
| Search | Custom TextField filter | `.searchable` modifier | Native search bar, cancel button, keyboard management |

**Key insight:** iOS 16+ (our minimum is iOS 17) provides all the UI primitives needed. The only non-Apple framework is supabase-swift for data access.

## Common Pitfalls

### Pitfall 1: Wallet Balance Mismatch Between Web and iOS

**What goes wrong:** iOS shows different wallet balance than the web app.
**Why it happens:** The wallet balance is computed from three separate queries (wallet record, deposit transactions, daily ad spend). Missing any query or applying the performance_percentage differently produces wrong numbers.
**How to avoid:** Replicate the EXACT computation from `useComputedWalletBalance.ts`:
1. Sum all `wallet_transactions` where `transaction_type = 'deposit'` and `client_id` matches
2. Sum all `ad_spend_daily.cost` where `client_id` matches AND `spend_date >= tracking_start_date`
3. Apply `performance_percentage` from `onboarding_settings`
4. Balance = deposits - (spend * (1 + pct/100))
**Warning signs:** Balance doesn't match web app for the same client.

### Pitfall 2: RLS Blocks Data Access

**What goes wrong:** Queries return empty results even though data exists in the database.
**Why it happens:** Supabase RLS policies restrict client users to their own data. The query must use `user_id = auth.uid()` (for clients table) or the RLS policy checks `EXISTS (SELECT 1 FROM clients WHERE client_id = X AND user_id = auth.uid())`.
**How to avoid:** Always query `clients` table first via `user_id`, then use the returned `client_id` / `agent_id` for subsequent queries. The authenticated supabase-swift session automatically sends the JWT.
**Warning signs:** Queries succeed (no error) but return zero rows.

### Pitfall 3: Leads Table Uses agent_id, Not client_id

**What goes wrong:** Leads query returns empty because you filter by `client_id`.
**Why it happens:** The `leads` table is keyed by `agent_id` (the 20-char routing key), not by `client_id` (UUID). The RLS policy checks `clients.agent_id = leads.agent_id AND clients.user_id = auth.uid()`.
**How to avoid:** After fetching the client profile, use `client.agent_id` (not `client.id`) to query leads: `.eq("agent_id", value: profile.agentId)`.
**Warning signs:** Leads show up in web app but not iOS app for the same user.

### Pitfall 4: Numeric Decoding of Postgres NUMERIC Type

**What goes wrong:** App crashes with decoding error on `ad_spend_daily.cost` or `billing_records.amount`.
**Why it happens:** Postgres `NUMERIC` type may serialize as a string ("123.45") rather than a JSON number. Swift's `Double` Codable expects a JSON number.
**How to avoid:** Use a custom decoder or define cost fields as `String` and convert, or configure the Supabase client to return numbers correctly. Test with real data early.
**Warning signs:** `DecodingError.typeMismatch` in console.

### Pitfall 5: ScrollView .refreshable Not Triggering

**What goes wrong:** Pull-to-refresh gesture does nothing.
**Why it happens:** `.refreshable` on ScrollView requires iOS 16+, and the closure must be `async`. If the content inside ScrollView has no inherent content size or is wrapped incorrectly, the gesture may not register.
**How to avoid:** Ensure ScrollView contains actual content (LazyVStack with items). The `.refreshable` closure must be async. Test on real device, not just preview.
**Warning signs:** Spinner appears but closure never executes.

### Pitfall 6: Chart Data with Zero or One Point

**What goes wrong:** Swift Charts crashes or shows nothing when data array is empty or has a single point.
**Why it happens:** Some clients are new and have no ad spend history. LineMark with zero points renders nothing; with one point it may show just a dot.
**How to avoid:** Check `data.count` before rendering chart. Show an empty state message for zero data. For single points, show a dot or brief message.
**Warning signs:** Empty chart area with no explanation.

### Pitfall 7: Date Parsing Inconsistency

**What goes wrong:** Dates display incorrectly or cause crashes.
**Why it happens:** Supabase returns dates in multiple formats: `TIMESTAMPTZ` as ISO 8601 ("2026-03-06T12:00:00Z"), `DATE` as plain date string ("2026-03-06"). Mixing formats in decoders causes failures.
**How to avoid:** Use `String` type for all date columns in Codable, then parse explicitly. Use ISO8601DateFormatter for timestamps, a simple DateFormatter("yyyy-MM-dd") for DATE columns.
**Warning signs:** Crash on `DecodingError` with date fields.

### Pitfall 8: Quick Links Pointing to Non-Existent Pages

**What goes wrong:** Tapping a quick link pill opens a broken URL.
**Why it happens:** Some clients have null values for `scheduler_link`, `nfia_link`, etc. The web pages may also be Webflow-hosted and occasionally down.
**How to avoid:** Only show quick link pills for non-nil link values. Use `guard let url = URL(string: link)` with nil handling. Open in SFSafariViewController, not an external browser.
**Warning signs:** Error page or blank Safari tab.

## Code Examples

### Supabase Query: Fetch Client Profile by Auth User

```swift
// Source: supabase-swift official docs
// This is the first query on every load -- establishes the client identity

struct ClientProfile: Codable, Identifiable {
    let id: String
    let userId: String?
    let agentId: String?
    let name: String
    let email: String
    // ... other fields

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case agentId = "agent_id"
        case name, email
    }
}

// Usage:
let userId = try await supabase.auth.session.user.id
let profile: ClientProfile = try await supabase
    .from("clients")
    .select()
    .eq("user_id", value: userId.uuidString)
    .single()
    .execute()
    .value
```

### Supabase Query: Fetch Billing Records with Filters

```swift
// Source: supabase-swift official docs, matching useBillingRecords.ts

struct BillingRecord: Codable, Identifiable {
    let id: String
    let clientId: String
    let billingType: String     // "ad_spend" or "management"
    let amount: Double
    let billingPeriodStart: String?
    let billingPeriodEnd: String?
    let dueDate: String?
    let status: String          // "pending", "paid", "overdue", "cancelled"
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

// Fetch non-archived records, newest first
let records: [BillingRecord] = try await supabase
    .from("billing_records")
    .select()
    .eq("client_id", value: clientId)
    .is("archived_at", value: nil as String?)   // Non-archived only
    .order("created_at", ascending: false)
    .execute()
    .value
```

### Supabase Query: Fetch Leads by Agent ID

```swift
// Source: supabase-swift official docs, matching useLeads.ts

struct Lead: Codable, Identifiable {
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
    }

    var displayName: String {
        [firstName, lastName].compactMap { $0 }.joined(separator: " ")
    }
}

// Fetch leads sorted by date, most recent first
let leads: [Lead] = try await supabase
    .from("leads")
    .select()
    .eq("agent_id", value: agentId)
    .order("lead_date", ascending: false)
    .execute()
    .value
```

### Number Abbreviation ($12.4K)

```swift
// Source: Foundation FormatStyle API (iOS 15+)

extension Double {
    /// Formats as abbreviated currency: $12.4K, $1.2M, $0
    var abbreviatedCurrency: String {
        if self == 0 { return "$0" }
        let formatted = Decimal(self).formatted(
            .number.notation(.compactName).precision(.fractionLength(0...1))
        )
        return "$\(formatted)"
    }
}

// Usage:
// 12400.0.abbreviatedCurrency  -> "$12.4K"
// 1200000.0.abbreviatedCurrency -> "$1.2M"
// 0.0.abbreviatedCurrency      -> "$0"
```

### Relative Date Formatting

```swift
// Source: Foundation RelativeDateTimeFormatter

extension String {
    /// Converts ISO date string to relative description ("2 days ago", "Yesterday")
    var relativeDate: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        guard let date = formatter.date(from: self) else { return self }

        let relative = RelativeDateTimeFormatter()
        relative.unitsStyle = .full
        return relative.localizedString(for: date, relativeTo: Date())
    }
}
```

### Payment Method Display

```swift
// Source: Verified against usePaymentMethods.ts

struct PaymentMethod: Codable, Identifiable {
    let id: String
    let clientId: String
    let stripeAccount: String   // "ad_spend" or "management"
    let cardBrand: String?      // "visa", "mastercard", etc.
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

    var expiryString: String {
        guard let month = cardExpMonth, let year = cardExpYear else { return "" }
        return String(format: "%02d/%02d", month, year % 100)
    }

    var brandIcon: String {
        switch cardBrand?.lowercased() {
        case "visa": return "creditcard.fill" // SF Symbol
        case "mastercard": return "creditcard.fill"
        default: return "creditcard.fill"
        }
    }
}
```

## Database Tables Used (Read-Only)

Summary of all Supabase tables the iOS app queries in Phase 2:

| Table | Key Column | Accessed Via | Purpose |
|-------|-----------|-------------|---------|
| `clients` | `user_id` | `auth.uid()` | Client profile, agent_id, links, pre-computed metrics |
| `client_wallets` | `client_id` | `clients.id` | Tracking start date, threshold, billing mode |
| `wallet_transactions` | `client_id` | `clients.id` | Deposit amounts for balance computation |
| `ad_spend_daily` | `client_id` | `clients.id` | Daily spend data for chart and spend computation |
| `billing_records` | `client_id` | `clients.id` | Transaction history, amounts, dates, status |
| `leads` | `agent_id` | `clients.agent_id` | Lead pipeline, names, statuses, premiums |
| `campaigns` | `client_id` | `clients.id` | Campaign names/IDs for dropdown filter |
| `client_payment_methods` | `client_id` | `clients.id` | Card brand, last four, expiry |
| `onboarding_settings` | `setting_key` | Literal `'performance_percentage'` | Global performance fee multiplier |

**All access is SELECT-only via RLS policies.** No mutations from the iOS app in Phase 2.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 3rd-party charting libraries (Charts/DGCharts) | Apple Swift Charts framework | iOS 16 (2022) | No dependency needed; native SwiftUI integration |
| Custom pull-to-refresh on ScrollView | `.refreshable` modifier on ScrollView | iOS 16 (2022) | One-line addition; handles spinner and deduplication |
| Custom half-sheet with drag gestures | `.presentationDetents([.medium, .large])` | iOS 16 (2022) | Native half-sheet with proper dismiss behavior |
| Custom search bar | `.searchable` modifier | iOS 15 (2021) | Native search with cancel, keyboard management |
| NumberFormatter for abbreviation | `Decimal.FormatStyle.notation(.compactName)` | iOS 15 (2021) | Declarative, localized, handles K/M/B automatically |
| Custom tab-based segmented controls | `Picker(.segmented)` | Always available | Native accessibility and haptics |

## Open Questions

1. **RLS Policy for `onboarding_settings` Table**
   - What we know: The `onboarding_settings` table stores the performance_percentage globally. The web app reads it freely.
   - What's unclear: Whether client users have SELECT access via RLS. If not, the iOS app cannot fetch it directly.
   - Recommendation: Test the query as a client user. If RLS blocks it, either add a policy or fetch this value server-side and embed it in the client profile or via an RPC function.

2. **Leads Table `lead_data` JSON Column**
   - What we know: Each lead has a `lead_data` JSON column with survey answers (age, employment, savings, investments, etc.).
   - What's unclear: The exact structure of this JSON varies per lead. Some fields are top-level on the lead row, others are in `lead_data`.
   - Recommendation: For lead detail sheet, display both the top-level fields AND parse `lead_data` as `[String: AnyCodable]` or use JSONSerialization to iterate key-value pairs.

3. **Campaign Filter Dropdown Data**
   - What we know: The campaign spend graph supports filtering by campaign. The `campaigns` table has `google_campaign_id` and the `ad_spend_daily` table has `campaign_id`.
   - What's unclear: Whether `campaign_id` in `ad_spend_daily` matches `google_campaign_id` in `campaigns`, or if there's a separate join.
   - Recommendation: Query `campaigns` for the dropdown list, then filter `ad_spend_daily` by `campaign_id` matching `campaigns.google_campaign_id`.

4. **Quick Link URLs**
   - What we know: The context specifies horizontal scrollable quick-link pills linking to live web pages (schedule page, membership page, etc.).
   - What's unclear: Which exact columns from the clients table to use. `scheduler_link`, `nfia_link`, `lander_link`, `thankyou_link`, `tfwp_profile_link` are candidates.
   - Recommendation: Use all non-null link columns. Display with human-friendly labels: "Schedule" for scheduler_link, "Profile" for tfwp_profile_link, etc.

5. **Business Results Data Source**
   - What we know: The context wants "submitted business, issued paid business, ROI number, contract percentage."
   - What's unclear: Whether to compute these from the leads pipeline (like `useLeadMetrics.ts` does) or read pre-computed values from the clients table.
   - Recommendation: Compute from leads for accuracy, same as `useLeadMetrics.ts`. Sum `submitted_premium` for submitted business, `issued_premium` for issued paid, compute ROI as `(issuedPremium - adSpend) / adSpend * 100`. Use `commission_contract_percent` from clients table.

## Sources

### Primary (HIGH confidence)
- [supabase-swift GitHub](https://github.com/supabase/supabase-swift) -- v2.41.1, fluent query API
- [Supabase Swift SELECT docs](https://supabase.com/docs/reference/swift/select) -- `.from().select().eq().execute().value` pattern
- [Supabase Swift EQ filter](https://supabase.com/docs/reference/swift/eq) -- `.eq("column", value: x)` syntax
- [Supabase Swift ORDER modifier](https://supabase.com/docs/reference/swift/order) -- `.order("col", ascending: false)` syntax
- [Apple Swift Charts docs](https://developer.apple.com/documentation/charts) -- LineMark, AreaMark, Chart modifiers
- Existing web app hooks (verified from source): `useComputedWalletBalance.ts`, `useBillingRecords.ts`, `useLeads.ts`, `useLeadMetrics.ts`, `usePaymentMethods.ts`, `useUpcomingPayments.ts`, `useCampaigns.ts`, `usePerformancePercentage.ts`, `useClients.ts`
- Existing Supabase migrations (verified from source): RLS policies, table schemas for `clients`, `billing_records`, `leads`, `ad_spend_daily`, `client_wallets`, `wallet_transactions`, `client_payment_methods`

### Secondary (MEDIUM confidence)
- [Hacking with Swift -- Pull to Refresh](https://www.hackingwithswift.com/quick-start/swiftui/how-to-enable-pull-to-refresh) -- `.refreshable` modifier pattern
- [SwiftUI Shimmer patterns](https://medium.com/@naqeeb-ahmed/swiftui-redacted-magic-achieve-shimmer-skeleton-loading-effect-with-just-one-line-of-code-5b203b540dad) -- `.redacted(reason: .placeholder)` + gradient overlay
- [Foundation compact number notation](https://goshdarnformatstyle.com/numeric-styles/) -- `.notation(.compactName)` for $12.4K
- [createwithswift.com -- Swift Charts gradient](https://www.createwithswift.com/customizing-a-chart-in-swift-charts/) -- LineMark + AreaMark gradient fill pattern
- [Apple Developer Forums -- tel: URL scheme](https://developer.apple.com/forums/thread/80551) -- `tel://` for phone dialer

### Tertiary (LOW confidence)
- [Swift Forums -- compact notation currency](https://forums.swift.org/t/format-currency-using-a-compact-notation/69443) -- Currency + compact notation combined formatting
- Campaign filter dropdown behavior -- inferred from web app code, not verified end-to-end for iOS

## Metadata

**Confidence breakdown:**
- Data models: HIGH -- verified against existing TypeScript interfaces, DB migrations, and web app hooks
- Query patterns: HIGH -- supabase-swift fluent API verified via official docs
- Wallet computation: HIGH -- reverse-engineered from `useComputedWalletBalance.ts` with exact formula
- Swift Charts: HIGH -- Apple first-party framework, well-documented API
- Shimmer/loading: MEDIUM -- community patterns, but `.redacted()` is first-party
- RLS access: MEDIUM -- verified policies exist for core tables; `onboarding_settings` needs validation
- Business metrics computation: MEDIUM -- derived from `useLeadMetrics.ts` pattern, may have edge cases

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (30 days -- stable domain, existing backend, no expected schema changes)
