---
phase: 02-core-value
plan: 01
subsystem: data-layer
tags: [supabase, codable, observable, data-manager, formatters, shimmer, ios17]

requires:
  - phase: 01-02
    provides: SupabaseConfig.client with KeychainLocalStorage auth persistence
  - phase: 01-03
    provides: AppColors, AppTypography, AppSpacing design tokens; GlassCard, HeroNumber components

provides:
  - 6 Codable model files matching 9 Supabase tables
  - DataManager @Observable class with parallel data fetching
  - Wallet balance computation (deposits - displayed spend with performance percentage)
  - Currency and date formatters
  - Shared UI components (shimmer, status pill, metric card, section header)
  - DataManager injected at app root via .environment()

affects: [02-02, 02-03, 02-04, 03-01, all-future-plans]

tech-stack:
  added: []
  patterns:
    - "DataManager @Observable + @MainActor: central data state injected via .environment()"
    - "Codable models with CodingKeys for snake_case -> camelCase mapping"
    - "AnyCodableValue enum for mixed-type JSON (lead_data column)"
    - "Wallet balance COMPUTED: totalDeposits - (trackedSpend * (1 + performancePercentage / 100))"
    - "withTaskGroup parallel fetching after client profile established"
    - "nonisolated(unsafe) for non-Sendable Foundation formatters in Swift 6 strict concurrency"
    - "Shimmer via .redacted(reason: .placeholder) + animating LinearGradient overlay"

key-files:
  created:
    - AlphaHub/Core/Data/Models/ClientProfile.swift
    - AlphaHub/Core/Data/Models/WalletModels.swift
    - AlphaHub/Core/Data/Models/BillingModels.swift
    - AlphaHub/Core/Data/Models/LeadModels.swift
    - AlphaHub/Core/Data/Models/CampaignModels.swift
    - AlphaHub/Core/Data/Models/MetricsModels.swift
    - AlphaHub/Core/Data/DataManager.swift
    - AlphaHub/Core/Formatting/CurrencyFormatter.swift
    - AlphaHub/Core/Formatting/DateFormatting.swift
    - AlphaHub/Shared/Components/ShimmerModifier.swift
    - AlphaHub/Shared/Components/StatusPill.swift
    - AlphaHub/Shared/Components/MetricCard.swift
    - AlphaHub/Shared/Components/SectionHeader.swift
  modified:
    - AlphaHub/App/AlphaHubApp.swift
    - AlphaHub/AlphaHub.xcodeproj/project.pbxproj

key-decisions:
  - "nonisolated(unsafe) on ISO8601DateFormatter and RelativeDateTimeFormatter statics for Swift 6 strict concurrency compliance"
  - "Supabase .is('archived_at', value: nil) for null checks (not string 'null')"
  - "LeadStatus rawValues use snake_case to match DB values directly (new_lead, booked_call, etc.)"
  - "DashboardMetrics initialized from leads array + profile for client-side computation matching web app"
  - "DataManager.loadAllData() triggered from RootView .onChange(of: auth.isAuthenticated)"

patterns-established:
  - "DataManager accessible via @Environment(DataManager.self) in any view"
  - "All models are Codable + Identifiable + Sendable"
  - "Date strings kept as String type, parsed on-demand via .parsedDate / .relativeDate"
  - "Double.abbreviatedCurrency for $12.4K formatting; Double.currencyFull for $12,450.00"
  - "StatusPill factory methods (.paid, .pending, .overdue) for consistent styling"
  - "MetricCard for bold number + subdued label pattern"
  - "SectionHeader with optional trailing action button"

duration: ~6min
completed: 2026-03-06
---

# Plan 02-01: Data Layer, Models, and Shared Components Summary

**Codable models for 9 Supabase tables, DataManager with parallel-fetch and computed wallet balance, currency/date formatters, and shimmer/status/metric shared components**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-06T20:44:28Z
- **Completed:** 2026-03-06T20:50:45Z
- **Tasks:** 2/2 auto
- **Files created:** 13
- **Files modified:** 2

## Accomplishments

- 6 Codable model files covering all 9 Supabase tables used by the iOS app (clients, client_wallets, wallet_transactions, billing_records, client_payment_methods, leads, ad_spend_daily, campaigns, onboarding_settings)
- DataManager @Observable class: fetches client profile by auth.uid(), then parallel-fetches all related data using withTaskGroup
- Wallet balance computation replicates the web app formula exactly: totalDeposits - (trackedSpend * (1 + performancePercentage / 100))
- Leads correctly fetched by agent_id (not client_id), matching the web app's data access pattern
- AnyCodableValue enum handles mixed-type JSON in the leads.lead_data column (String/Double/Int/Bool/null)
- LeadStatus enum with 7 statuses, display names, and SwiftUI colors for status pills
- DashboardMetrics computes CPL, CPBC, CPSA, CPIA, ROI, average commission from leads array + profile
- WalletDisplayMetrics provides spending progress, day-of-month context for wallet hero card
- CurrencyFormatter: Double.abbreviatedCurrency ($12.4K) and Double.currencyFull ($12,450.00)
- DateFormatting: reusable static formatters with String.relativeDate ("2 days ago") and String.parsedDate
- ShimmerModifier: .redacted + animating gradient overlay for loading skeletons
- StatusPill: capsule badge with factory methods (paid, pending, overdue, failed, cancelled)
- MetricCard: bold number + subdued label for dashboard metrics
- SectionHeader: title row with optional trailing action
- AlphaHubApp updated: DataManager injected at app root, loadAllData triggered on authentication

## Task Commits

1. **Task 1: Codable models and formatters** - `971f2b3` (feat)
2. **Task 2: DataManager, shared components, and app wiring** - `8dd1857` (feat)

## Files Created/Modified

### Core Data Models
- `AlphaHub/Core/Data/Models/ClientProfile.swift` - Codable struct matching clients table (22 fields)
- `AlphaHub/Core/Data/Models/WalletModels.swift` - ClientWallet + WalletTransaction structs
- `AlphaHub/Core/Data/Models/BillingModels.swift` - BillingRecord + PaymentMethod + UpcomingPayment
- `AlphaHub/Core/Data/Models/LeadModels.swift` - Lead + LeadStatus enum + AnyCodableValue
- `AlphaHub/Core/Data/Models/CampaignModels.swift` - Campaign + AdSpendDaily with dateValue computed property
- `AlphaHub/Core/Data/Models/MetricsModels.swift` - DashboardMetrics + WalletDisplayMetrics computed structs

### Core Data Manager
- `AlphaHub/Core/Data/DataManager.swift` - @Observable central data state with parallel-fetch and computed wallet balance

### Core Formatting
- `AlphaHub/Core/Formatting/CurrencyFormatter.swift` - Double extensions for abbreviated and full currency
- `AlphaHub/Core/Formatting/DateFormatting.swift` - Reusable static formatters + String date extensions

### Shared Components
- `AlphaHub/Shared/Components/ShimmerModifier.swift` - Shimmer loading animation modifier
- `AlphaHub/Shared/Components/StatusPill.swift` - Color-coded capsule badge with factory methods
- `AlphaHub/Shared/Components/MetricCard.swift` - Compact metric display (value + label)
- `AlphaHub/Shared/Components/SectionHeader.swift` - Section title with optional action

### Modified
- `AlphaHub/App/AlphaHubApp.swift` - Added DataManager @State + .environment() injection + auth onChange trigger
- `AlphaHub/AlphaHub.xcodeproj/project.pbxproj` - Added all 13 new source files + Data/Models/Formatting groups

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| nonisolated(unsafe) for ISO8601DateFormatter statics | Swift 6 strict concurrency requires this for non-Sendable Foundation types; formatters are init-once read-only |
| .is("archived_at", value: nil) for null checks | supabase-swift .is() API takes nil, not the string "null" |
| LeadStatus rawValues as snake_case | Matches DB values directly; no conversion needed during decode |
| DashboardMetrics computed client-side | Matches web app useLeadMetrics.ts pattern; leads + profile already fetched |
| DataManager.loadAllData() on auth change | .onChange(of: auth.isAuthenticated) ensures data loads immediately after login |
| DateFormatter uses nonisolated(unsafe) selectively | Only applied where needed; DateFormatter is already Sendable in the SDK |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Swift 6 strict concurrency for static formatters**
- **Found during:** Task 1 build
- **Issue:** ISO8601DateFormatter and RelativeDateTimeFormatter are not Sendable; static let in enum causes concurrency-safety error with SWIFT_STRICT_CONCURRENCY = complete
- **Fix:** Added `nonisolated(unsafe)` qualifier to the non-Sendable static formatters
- **Files modified:** DateFormatting.swift
- **Commit:** 971f2b3

**2. [Rule 1 - Bug] Fixed .is() null check API usage**
- **Found during:** Task 2 build
- **Issue:** Used `.is("archived_at", value: "null")` which passes a String, but supabase-swift expects nil for IS NULL checks
- **Fix:** Changed to `.is("archived_at", value: nil)`
- **Files modified:** DataManager.swift
- **Commit:** 8dd1857

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Minor syntax fixes. No scope changes.

## Issues Encountered

None beyond the two auto-fixed deviations.

## User Setup Required

None - all data layer code is read-only against existing Supabase tables. No new environment variables or services needed.

## Next Phase Readiness

- DataManager available via `@Environment(DataManager.self)` for all Phase 2 UI views
- All model types ready for dashboard (02-02) and billing (02-03) screen implementations
- Formatters ready: `Double.abbreviatedCurrency` for dashboard numbers, `String.relativeDate` for dates
- Shared components ready: ShimmerModifier for loading states, StatusPill for billing/lead status, MetricCard for dashboard metrics, SectionHeader for section titles
- Wallet balance computation verified against web app formula
- Leads correctly keyed by agent_id

---
*Phase: 02-core-value*
*Completed: 2026-03-06*
