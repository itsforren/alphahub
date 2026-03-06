---
phase: 02-core-value
plan: 02
subsystem: ui
tags: [dashboard, swiftui, wallet-hero, quick-links, business-results, shimmer, pull-to-refresh, haptic, ios17]

requires:
  - phase: 02-01
    provides: DataManager with wallet/billing/leads data, CurrencyFormatter, DateFormatting, MetricCard, SectionHeader, ShimmerModifier, GlassCard, HeroNumber
  - phase: 01-03
    provides: AppColors, AppTypography, AppSpacing, ClientTabView with FloatingTabBar, HapticManager

provides:
  - DashboardView: main scrollable dashboard replacing Home tab placeholder
  - WalletHeroCard: hero balance number, compact stats, progress bar, upcoming payment indicator
  - QuickLinkPills: horizontal scrollable pills for client web links (schedule, NFIA, landing page, etc.)
  - BusinessResultsSection: 2x2 grid of business outcome metrics (submitted, issued, ROI, contract %)
  - DataManager.nextUpcomingPayment computed property for upcoming billing display
  - Shimmer loading states matching dashboard layout shapes
  - Pull-to-refresh with haptic feedback wired to DataManager.refreshAll()

affects: [02-03, 02-04, all-dashboard-future]

tech-stack:
  added: []
  patterns:
    - "Dashboard sections as independent SwiftUI views reading from DataManager via @Environment"
    - "GlassCard wrapping hero content with compact stat rows inside"
    - "Shimmer skeleton matching layout shapes (RoundedRectangle placeholders) during isInitialLoad"
    - "QuickLinkPills from ClientProfile link fields, hidden when all nil"
    - "ROI color-coded: green for positive, red for negative, white for zero"

key-files:
  created:
    - AlphaHub/Features/Dashboard/DashboardView.swift
    - AlphaHub/Features/Dashboard/WalletHeroCard.swift
    - AlphaHub/Features/Dashboard/QuickLinkPills.swift
    - AlphaHub/Features/Dashboard/BusinessResultsSection.swift
  modified:
    - AlphaHub/Core/Data/DataManager.swift
    - AlphaHub/Features/Shell/ClientTabView.swift
    - AlphaHub/AlphaHub.xcodeproj/project.pbxproj

key-decisions:
  - "WalletHeroCard reads DataManager via @Environment rather than accepting parameters -- cleaner for a view that always reads the same central state"
  - "QuickLinkPills filters non-nil links and hides entirely if empty -- no empty state for links section"
  - "ROI metric uses AppColors.success/error for positive/negative values, textPrimary for zero"
  - "Shimmer placeholders use fixed-size RoundedRectangles matching the real content layout shapes"
  - "BusinessResultsSection stub created in Task 1 for DashboardView compilation, fleshed out in Task 2"

patterns-established:
  - "Dashboard sections as composable views: DashboardView -> WalletHeroCard, QuickLinkPills, BusinessResultsSection"
  - "GlassCard for hero/prominent sections, bare MetricCards for grid metrics"
  - "Progress bar: thin 4pt gradient bar with animated width based on fraction"
  - "Upcoming payment row: divider + HStack with warning-colored label, amount, relative date"

duration: ~4min
completed: 2026-03-06
---

# Plan 02-02: Dashboard View with Wallet Hero, Quick Links, and Business Results Summary

**Scrollable dashboard with GlassCard wallet hero (balance, progress, upcoming payment), quick-link pills to client web pages, and 2x2 business results grid replacing the Home tab placeholder**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-06T20:53:32Z
- **Completed:** 2026-03-06T20:57:24Z
- **Tasks:** 2/2 auto
- **Files created:** 4
- **Files modified:** 3

## Accomplishments

- DashboardView replaces PlaceholderView in ClientTabView Home tab with a scrollable, data-driven dashboard
- WalletHeroCard as the dominant visual element: large hero balance number, compact stats row (monthly max, remaining, day X of 30), gradient progress bar, threshold/recharge info, and upcoming payment indicator
- QuickLinkPills: horizontal scrollable capsule buttons linking to client web pages (schedule, NFIA, landing page, thank you, profile) -- only shown for non-nil links
- BusinessResultsSection: 2x2 LazyVGrid with submitted business, issued/paid, ROI (color-coded), and contract percentage using MetricCard components
- DataManager.nextUpcomingPayment computed property finds first pending/upcoming billing record by due_date
- Shimmer loading states with skeleton shapes matching the real dashboard layout
- Pull-to-refresh triggers DataManager.refreshAll() with HapticManager.notification(.success)
- Tesla-clean aesthetic: pure black background, bold bright numbers, subdued labels, minimal chrome

## Task Commits

1. **Task 1: DashboardView container with wallet hero, upcoming payment, and quick links** - `f5c88e9` (feat)
2. **Task 2: Business results section and tab wiring** - `547966d` (feat)

## Files Created/Modified

### Features/Dashboard (created)
- `AlphaHub/Features/Dashboard/DashboardView.swift` - Main scrollable dashboard with welcome greeting, shimmer states, pull-to-refresh
- `AlphaHub/Features/Dashboard/WalletHeroCard.swift` - Hero wallet card with balance, stats, progress bar, upcoming payment
- `AlphaHub/Features/Dashboard/QuickLinkPills.swift` - Horizontal scroll of capsule pill buttons for client web links
- `AlphaHub/Features/Dashboard/BusinessResultsSection.swift` - 2x2 grid of business outcome metrics

### Modified
- `AlphaHub/Core/Data/DataManager.swift` - Added nextUpcomingPayment computed property
- `AlphaHub/Features/Shell/ClientTabView.swift` - Home tab now shows DashboardView instead of PlaceholderView
- `AlphaHub/AlphaHub.xcodeproj/project.pbxproj` - Added 4 Dashboard files + Dashboard PBXGroup under Features

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| WalletHeroCard reads DataManager via @Environment | Cleaner than passing 6+ parameters; the view always reads the same central state |
| QuickLinkPills hides entirely when all links nil | No empty state message for links -- just clean absence |
| ROI color-coded (success/error/textPrimary) | Immediately communicates positive vs negative ROI at a glance |
| BusinessResultsSection stub in Task 1 | DashboardView references it; stub needed for compilation before Task 2 fleshes it out |
| Upcoming payment row inside WalletHeroCard | Subtle info row with divider, not a separate card -- keeps wallet info cohesive |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created BusinessResultsSection stub in Task 1**
- **Found during:** Task 1 (DashboardView references BusinessResultsSection which is a Task 2 deliverable)
- **Issue:** DashboardView.swift includes BusinessResultsSection() but that file doesn't exist until Task 2
- **Fix:** Created a stub BusinessResultsSection.swift with EmptyView body for Task 1 compilation
- **Files modified:** AlphaHub/Features/Dashboard/BusinessResultsSection.swift
- **Committed in:** f5c88e9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor -- stub needed for incremental build verification. Fully replaced in Task 2.

## Issues Encountered

None beyond the stub deviation.

## User Setup Required

None -- all dashboard UI reads from existing DataManager data layer. No new environment variables or services needed.

## Next Phase Readiness

- Dashboard Home tab is now live with wallet hero, quick links, and business results
- Plan 02-03 (Wallet/Billing tab) can modify ClientTabView to replace the Wallet tab placeholder
- Plan 02-04 (Campaign spend chart, cost metrics, leads pipeline) will add additional sections to DashboardView
- All shared components (MetricCard, SectionHeader, GlassCard, HeroNumber, ShimmerModifier) proven in production use

---
*Phase: 02-core-value*
*Completed: 2026-03-06*
