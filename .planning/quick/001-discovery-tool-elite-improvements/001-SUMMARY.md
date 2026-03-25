---
phase: quick
plan: 001
subsystem: discovery-tool
tags: [discovery, leaderboard, analytics, recharts, speed-to-lead]
requires: []
provides: [scoreboard, attempt-progress, cadence-suggestions, call-next, priority-queue, leaderboard, report, time-of-day-heatmap]
affects: []
tech-stack:
  added: []
  patterns: [priority-scoring, stacked-bar-chart, collapsible-report]
key-files:
  created:
    - src/components/discovery/SpeedToLeadScoreboard.tsx
    - src/components/discovery/AttemptProgressBar.tsx
    - src/components/discovery/CadenceSuggestion.tsx
    - src/components/discovery/CallerLeaderboard.tsx
    - src/components/discovery/DailyWeeklyReport.tsx
    - src/components/discovery/TimeOfDayHeatmap.tsx
    - src/hooks/useCallerLeaderboard.ts
    - src/hooks/useDiscoveryReportStats.ts
  modified:
    - src/components/discovery/LeadCard.tsx
    - src/components/discovery/LeadDiscoveryDashboard.tsx
    - src/components/discovery/DiscoveryCallSheet.tsx
    - src/hooks/useLeadDiscoveryQueue.ts
metrics:
  duration: ~8min
  completed: 2026-03-24
---

# Quick Task 001: Discovery Tool Elite Improvements Summary

**One-liner:** 8 elite improvements to dial tracker — urgency scoreboard, attempt progress, cadence suggestions, call-next workflow, priority sorting, caller leaderboard, performance report, and time-of-day heatmap.

## What Was Built

### Task 1: Speed-to-Lead Scoreboard + Attempt Progress Bar + Cadence Suggestions (8759621)
- **SpeedToLeadScoreboard** replaces the old quick stats bar. Always visible (not gated on todayStats.total > 0). Shows: untouched lead count with red pulsing alert + oldest age, today's calls, connected, booked, pickup rate %, booking rate %. Color-coded thresholds (green >= 30%, amber >= 15%, red < 15%).
- **AttemptProgressBar** — 5 compact dots showing attempts out of 5. Green for completed, gray for remaining, all red at 5/5 with "Move to nurture?" prompt. Text shows "X/5 attempts". Placed on right side of each LeadCard.
- **CadenceSuggestion** — single-line timing guidance below the "Last: Xh ago" info on each card. Logic: attempt 0 = "Call now", attempt 1 = "Try again in 2-4 hours" (or "Due now" if >2h), attempt 2 = "Try tomorrow morning" (or "Due now" if >24h), etc. Amber coloring when due/overdue.

### Task 2: Call Next Button + Smart Priority Queue Sorting (fbbfdb1)
- **Call Next Lead button** in DiscoveryCallSheet's saved step. Shows the next priority lead's name. Clicking it opens that lead without returning to dashboard. Receives `onCallNext` callback and `queueData` props from dashboard.
- **computePriorityScore** function exported from useLeadDiscoveryQueue.ts. Score tiers: 1000 (new <30min), 900-800 (new older), 800 (callbacks due), 600+ (<3 attempts not called today), 400 (4 attempts not today), 200 (<3 attempts called today), 100 (lowest).
- **Flat priority-sorted queue** replaces stage-grouped rendering. URGENT badge (red) for score >= 900, HIGH badge (amber) for score >= 700. Each card still shows its stage via existing stage badge.

### Task 3: Caller Leaderboard (2c093ad)
- **useCallerLeaderboard** hook queries discovery_calls for today, groups by called_by_name, computes calls/connected/booked/pickup rate, ranks by calls made. Refreshes every 60 seconds.
- **CallerLeaderboard** component with gold/silver/bronze rank indicators, stats row per caller. Only renders when 2+ callers have data (no solo leaderboard).
- **Stats tab** added to dashboard TabsList with TrendingUp icon.

### Task 4: Daily/Weekly Report + Time-of-Day Analysis (66dd437)
- **useDiscoveryReportStats** hook computes: coverage rate, avg speed to first contact, hourly pickup breakdown, daily booking trend, fallen-through count (leads >24h with 0 calls), booking rate. Supports today/week/custom date ranges.
- **TimeOfDayHeatmap** — recharts stacked BarChart (answered green + unanswered gray) for hours 6am-9pm using ChartContainer wrapper. Best calling windows identified (hours with >= 3 calls, sorted by rate).
- **DailyWeeklyReport** — collapsible card with date range toggle buttons (Today/Week/Custom). 5 stat cards (coverage, speed, pickup rate, booking rate, fallen-through) in responsive grid. Contains TimeOfDayHeatmap. Shows daily bookings bar chart when in week view.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Flat priority sort instead of stage groups | Priority scoring provides better calling order than static stage grouping |
| computePriorityScore exported as named function | Dashboard needs it for priority badge display on each card |
| Leaderboard hidden for single caller | No competitive value when solo; avoids lonely-looking UI |
| todayStats useMemo moved into SpeedToLeadScoreboard | Scoreboard owns its own stats computation, dashboard stays clean |
| Stacked bars (not heatmap grid) for time-of-day | Stacked bars show both volume and rate; heatmap only shows one dimension |
| Best windows require >= 3 calls | Avoids highlighting 1-call hours as "best" due to small sample |

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit` passes with 0 errors after each task
- `npx vite build` produces clean build (7.5s) after each task
- All 8 improvements integrated into existing discovery tool
- Existing call sheet flow, booking, GHL sync untouched
