---
phase: 02-core-value
plan: 04
subsystem: ui
tags: [swift-charts, dashboard, leads, campaign-spend, cost-metrics, swiftui, ios17]

requires:
  - phase: 02-01
    provides: DataManager with adSpendDaily, campaigns, leads, dashboardMetrics; CurrencyFormatter; DateFormatting; MetricCard; SectionHeader
  - phase: 02-02
    provides: DashboardView with LazyVStack structure, WalletHeroCard, QuickLinkPills, BusinessResultsSection

provides:
  - CampaignSpendChart: Swift Charts line + area graph with campaign filter dropdown
  - CostMetricsSection: 3-column grid with 6 cost metrics including Total Leads count
  - LeadsPipelineList: searchable leads list with status pills and lead detail sheet
  - LeadDetailSheet: full lead detail sheet with call/message action buttons
  - LeadStatusPill: color-coded status pill for 7 lead statuses
  - Complete dashboard with all 6 sections wired together

affects: [03-01, all-future-dashboard]

tech-stack:
  added: []
  patterns:
    - "import Charts for Apple Swift Charts framework (line + area marks with gradient fill)"
    - "Chart data aggregation: filter by campaign, group by date, sort ascending, limit to 30"
    - "Custom search bar with TextField in surfaceElevated RoundedRectangle (not .searchable modifier)"
    - ".sheet(item:) for type-safe lead detail presentation"
    - "tel:// and sms:// URL schemes via UIApplication.shared.open for direct call/message"
    - "LeadStatusPill separate from StatusPill with lead-specific color mapping"

key-files:
  created:
    - AlphaHub/Features/Dashboard/CampaignSpendChart.swift
    - AlphaHub/Features/Dashboard/CostMetricsSection.swift
    - AlphaHub/Features/Dashboard/LeadsPipelineList.swift
    - AlphaHub/Features/Leads/LeadDetailSheet.swift
    - AlphaHub/Features/Leads/LeadStatusPill.swift
  modified:
    - AlphaHub/Features/Dashboard/DashboardView.swift
    - AlphaHub/AlphaHub.xcodeproj/project.pbxproj

key-decisions:
  - "Custom search bar instead of .searchable modifier -- .searchable requires List context and doesn't work well inside LazyVStack ScrollView"
  - "Lead detail uses NavigationStack internally for toolbar Done button"
  - "Survey answer keys formatted from snake_case to Title Case for readability"
  - "LeadStatusPill accepts raw status string (not LeadStatus enum) for flexibility with unknown statuses"
  - "Chart handles single data point with PointMark instead of LineMark to avoid rendering issues"

patterns-established:
  - "Dashboard sections as independent composable views: CampaignSpendChart, CostMetricsSection, LeadsPipelineList"
  - "Lead detail sheet at .large detent with presentationDragIndicator"
  - "Custom inline search bar pattern for non-List contexts"
  - "Action buttons (call/message) as HStack of capsule buttons inside detail sheets"

duration: ~6min
completed: 2026-03-06
---

# Plan 02-04: Campaign Spend Chart, Cost Metrics, and Leads Pipeline Summary

**Swift Charts campaign spend visualization with campaign filter, 6-metric cost grid (including total leads count), searchable leads pipeline with status pills, and lead detail sheet with direct call/message actions**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-06T20:59:49Z
- **Completed:** 2026-03-06T21:06:09Z
- **Tasks:** 2/2 auto
- **Files created:** 5
- **Files modified:** 2

## Accomplishments

- CampaignSpendChart: Apple Swift Charts line + area graph with gradient fill, campaign filter dropdown (Menu), avg/day and target/day summary, empty data handling with message, single data point handled with PointMark
- CostMetricsSection: 3-column LazyVGrid with Total Leads (plain number), CPL, CPBC, CPSA, CPIA, Avg Commission -- all using MetricCard and abbreviatedCurrency
- LeadsPipelineList: custom inline search bar, filtered by name/email, 50-lead display limit, lead rows with name/date/status pill, tapping opens detail sheet
- LeadDetailSheet: full lead info at .large detent with Done button, Call/Message action buttons using tel:// and sms:// URL schemes, detail rows for all lead fields, Survey Answers section from lead_data
- LeadStatusPill: color-coded capsule pills for 7 statuses (new_lead, contacted, booked_call, submitted_app, issued_paid, declined, no_show) plus unknown fallback
- DashboardView fully wired with all 6 sections in correct order: welcome, quick links, wallet hero, business results, campaign chart, cost metrics, leads pipeline

## Task Commits

1. **Task 1: Campaign spend chart and cost metrics** - `7890684` (feat)
2. **Task 2: Leads pipeline, lead detail, and DashboardView wiring** - `0061db7` (feat)

## Files Created/Modified

### Features/Dashboard (created)
- `AlphaHub/Features/Dashboard/CampaignSpendChart.swift` - Swift Charts campaign spend visualization with filter dropdown and summary stats
- `AlphaHub/Features/Dashboard/CostMetricsSection.swift` - 3-column grid of 6 cost metrics including Total Leads count
- `AlphaHub/Features/Dashboard/LeadsPipelineList.swift` - Searchable leads list with status pills and lead detail sheet presentation

### Features/Leads (created)
- `AlphaHub/Features/Leads/LeadDetailSheet.swift` - Full lead detail sheet with call/message buttons and survey answers
- `AlphaHub/Features/Leads/LeadStatusPill.swift` - Color-coded status pill for 7 lead statuses

### Modified
- `AlphaHub/Features/Dashboard/DashboardView.swift` - Added CampaignSpendChart, CostMetricsSection, LeadsPipelineList sections
- `AlphaHub/AlphaHub.xcodeproj/project.pbxproj` - Added 5 new files + Leads PBXGroup under Features (added by parallel 02-03 agent)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Custom inline search bar instead of .searchable | .searchable modifier requires List context; LeadsPipelineList lives inside a LazyVStack ScrollView |
| LeadStatusPill accepts raw String (not LeadStatus enum) | Handles unknown status values gracefully with fallback formatting |
| Chart handles single data point with PointMark | LineMark with a single point produces no visible line; PointMark shows the dot |
| Survey keys formatted from snake_case to Title Case | Raw database keys are unreadable; simple string replacement gives clean display |
| Lead detail uses NavigationStack for toolbar | Enables standard Done button placement without custom toolbar hacks |
| 50-lead display limit | Prevents scroll performance issues with large lead datasets |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created stub files for Task 2 dependencies in Task 1**
- **Found during:** Task 1 (build verification)
- **Issue:** CampaignSpendChart and CostMetricsSection compile independently, but the project.pbxproj references all 5 files (including LeadsPipelineList, LeadDetailSheet, LeadStatusPill). Build would fail without at least stub definitions.
- **Fix:** Created minimal stub files (EmptyView body) for LeadsPipelineList, LeadDetailSheet, and LeadStatusPill in Task 1
- **Files modified:** LeadsPipelineList.swift, LeadDetailSheet.swift, LeadStatusPill.swift (stubs)
- **Committed in:** 7890684 (Task 1 commit)

**2. [Rule 3 - Blocking] Used custom search bar instead of .searchable modifier**
- **Found during:** Task 2 (LeadsPipelineList implementation)
- **Issue:** The plan specified `.searchable(text:prompt:)` but this modifier requires a List context or NavigationStack with a list; LeadsPipelineList is inside a LazyVStack ScrollView dashboard
- **Fix:** Implemented a custom inline search bar with TextField, magnifying glass icon, and clear button in a surfaceElevated RoundedRectangle
- **Files modified:** LeadsPipelineList.swift
- **Committed in:** 0061db7 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Stubs are standard practice for incremental builds. Custom search bar provides equivalent functionality with better visual integration into the dark dashboard aesthetic.

## Issues Encountered

- project.pbxproj was already modified by the parallel 02-03 agent which pre-added all 02-04 file entries, so no merge conflict occurred. The 02-03 agent proactively included 02-04's file references in its own pbxproj commits.

## User Setup Required

None -- all UI reads from existing DataManager data layer. No new environment variables or services needed.

## Next Phase Readiness

- Dashboard is fully complete with all 6 sections from CONTEXT.md
- Phase 2 Core Value is complete: data layer (02-01), dashboard top half (02-02), billing (02-03), dashboard bottom half + leads (02-04)
- Features/Leads/ directory established for future lead-related features
- Swift Charts pattern established for any future chart visualizations
- Ready for Phase 3 (Chat) with all dashboard foundation in place

---
*Phase: 02-core-value*
*Completed: 2026-03-06*
