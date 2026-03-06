---
phase: 02-core-value
plan: 03
subsystem: ui
tags: [billing, swiftui, transaction-list, filters, payment-methods, detail-sheet, segmented-control, ios17]

requires:
  - phase: 02-01
    provides: DataManager with billingRecords/paymentMethods, BillingRecord/PaymentMethod models, CurrencyFormatter, DateFormatting, StatusPill, SectionHeader, ShimmerModifier, GlassCard
  - phase: 02-02
    provides: ClientTabView with DashboardView in Home tab (preserved untouched)

provides:
  - BillingView: main billing screen with transaction list grouped by month, segmented filter, shimmer loading, pull-to-refresh
  - BillingFilterBar: three-segment filter (All / Ad Spend / Management) with dark theme styling
  - BillingTransactionRow: clean transaction row with amount, type label, StatusPill, relative date
  - TransactionDetailSheet: half-sheet with full transaction details and View on Web link
  - PaymentMethodCards: two side-by-side GlassCards for ad spend and management payment methods
  - ClientTabView Wallet tab now shows BillingView instead of PlaceholderView

affects: [02-04, 03-01, all-billing-future]

tech-stack:
  added: []
  patterns:
    - "BillingFilter enum with .all/.adSpend/.management for segmented filter state"
    - "Grouped-by-month transactions using Dictionary(grouping:) with DateFormatter 'MMMM yyyy'"
    - "TransactionDetailSheet with .presentationDetents([.medium]) for half-sheet"
    - "PaymentMethodCards filters dataManager.paymentMethods by stripeAccount field"
    - "UISegmentedControl.appearance() for dark theme segmented control styling"

key-files:
  created:
    - AlphaHub/Features/Billing/BillingView.swift
    - AlphaHub/Features/Billing/BillingFilterBar.swift
    - AlphaHub/Features/Billing/BillingTransactionRow.swift
    - AlphaHub/Features/Billing/TransactionDetailSheet.swift
    - AlphaHub/Features/Billing/PaymentMethodCards.swift
  modified:
    - AlphaHub/Features/Shell/ClientTabView.swift
    - AlphaHub/AlphaHub.xcodeproj/project.pbxproj

key-decisions:
  - "PaymentMethodCards stub created in Task 1 for BillingView compilation, fully implemented in Task 2"
  - "Month sorting uses parse-back-to-Date for correct chronological order (not alphabetical)"
  - "UISegmentedControl.appearance() used in onAppear for dark theme since SwiftUI Picker .segmented has limited styling"
  - "TransactionDetailSheet uses local DateFormatter instances for full/short dates rather than static formatters"

patterns-established:
  - "BillingFilter enum for type-safe filter state binding with Picker"
  - "Dictionary(grouping:) + sorted keys for month-grouped list sections"
  - "GlassCard for payment method cards, bare rows for transaction list (Tesla-clean)"
  - ".presentationDetents([.medium]) + .presentationDragIndicator(.visible) for detail sheets"

duration: ~4min
completed: 2026-03-06
---

# Plan 02-03: Billing Screen with Transaction List, Filters, and Payment Methods Summary

**Complete billing screen with month-grouped transaction list, segmented type filter, status pills, half-sheet detail view, and two payment method cards for ad spend and management Stripe accounts**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-06T20:59:39Z
- **Completed:** 2026-03-06T21:03:48Z
- **Tasks:** 2/2 auto
- **Files created:** 5
- **Files modified:** 2

## Accomplishments

- BillingView replaces PlaceholderView in ClientTabView Wallet tab with a full billing screen
- Transaction list grouped by month ("March 2026", "February 2026") with newest month first
- BillingFilterBar: segmented control with three options (All / Ad Spend / Management) styled for dark theme
- BillingTransactionRow: clean row showing abbreviated amount, billing type label, StatusPill, and relative date with subtle divider
- TransactionDetailSheet: half-sheet (.medium detent) with hero amount, status pill, detail rows (type, date, billing period, due date, paid date, account), and View on Web button
- PaymentMethodCards: two side-by-side GlassCards showing card brand, last 4 digits, expiry, and account label for ad spend and management
- "No card on file" placeholder when payment method missing for an account
- "Manage payment methods on alphaagent.io" link opens Safari
- Shimmer loading skeleton matching billing layout during initial load
- Pull-to-refresh with haptic feedback via DataManager.refreshAll()
- Empty state with icon and message when no transactions match filter
- Tesla-clean aesthetic: clean rows, no heavy borders, bold bright numbers

## Task Commits

1. **Task 1: Billing transaction list with filters and detail sheet** - `52cba12` (feat)
2. **Task 2: Payment methods and tab wiring** - `62d0d8b` (feat)

## Files Created/Modified

### Features/Billing (created)
- `AlphaHub/Features/Billing/BillingView.swift` - Main billing screen with ScrollView, grouped transactions, filter bar, shimmer, pull-to-refresh
- `AlphaHub/Features/Billing/BillingFilterBar.swift` - BillingFilter enum + segmented Picker with dark theme styling
- `AlphaHub/Features/Billing/BillingTransactionRow.swift` - Transaction row with amount, type, StatusPill, relative date
- `AlphaHub/Features/Billing/TransactionDetailSheet.swift` - Half-sheet with full transaction details
- `AlphaHub/Features/Billing/PaymentMethodCards.swift` - Two GlassCards for ad spend and management payment methods

### Modified
- `AlphaHub/Features/Shell/ClientTabView.swift` - Wallet tab now shows BillingView instead of PlaceholderView
- `AlphaHub/AlphaHub.xcodeproj/project.pbxproj` - Added 5 Billing files + Billing PBXGroup under Features

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| PaymentMethodCards stub in Task 1 | BillingView references PaymentMethodCards(); stub needed for Task 1 compilation before Task 2 implements fully |
| Month sorting via parse-back-to-Date | String sorting ("February" < "March") would be alphabetical, not chronological. Parse "MMMM yyyy" back to Date for correct ordering |
| UISegmentedControl.appearance() for dark theme | SwiftUI Picker .segmented has limited color styling options; UIKit appearance proxy gives full control over selected/normal text colors and background |
| Local DateFormatter in TransactionDetailSheet | Sheet-only formatters for full/short dates; not frequently enough called to warrant static formatter |
| Side-by-side payment cards | Two compact GlassCards give equal visual weight to both Stripe accounts; stacked would push content below fold |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created PaymentMethodCards stub in Task 1**
- **Found during:** Task 1 (BillingView references PaymentMethodCards which is a Task 2 deliverable)
- **Issue:** BillingView.swift includes PaymentMethodCards() but that file doesn't exist until Task 2
- **Fix:** Created a stub PaymentMethodCards.swift with EmptyView body for Task 1 compilation
- **Files modified:** AlphaHub/Features/Billing/PaymentMethodCards.swift
- **Committed in:** 52cba12 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor -- stub needed for incremental build verification. Fully replaced in Task 2.

## Issues Encountered

None beyond the stub deviation.

## User Setup Required

None -- all billing UI reads from existing DataManager data layer. No new environment variables or services needed.

## Next Phase Readiness

- Billing screen is live in the Wallet tab with transaction list, filters, payment methods, and detail sheet
- Plan 02-04 (Campaign spend chart, cost metrics, leads pipeline) can add remaining dashboard sections
- All billing-related shared components proven: StatusPill for payment status, GlassCard for payment method cards
- BillingFilter pattern available as reference for future filter implementations

---
*Phase: 02-core-value*
*Completed: 2026-03-06*
