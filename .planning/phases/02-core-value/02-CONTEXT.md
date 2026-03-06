# Phase 2: Core Value - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Client can check their wallet balance, view billing history, and see key business metrics — the daily-use features that justify installing the app. All data already exists on the web app backend; this phase builds the iOS UI against existing endpoints.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Layout & Flow
- "Welcome, [First Name]" greeting at the top
- Horizontal scrollable quick-link pills below welcome — links to their live web pages (schedule page, membership page, thank you page, etc.)
- Large hero wallet card as the dominant element showing:
  - Wallet balance (prominent)
  - Monthly max with progress (spent vs limit)
  - Remaining amount and day X of 30
  - Threshold and recharge amounts
- Business results section below wallet: submitted business, issued paid business, ROI number, contract percentage
- Campaign spend graph (default 30 days, date filter to adjust range) showing:
  - Daily spend, Cost/Conv, CTR, Trend lines
  - Campaign filter dropdown
  - Avg/day and Target/day summary
  - Tap for detail tooltip
- Cost metrics below/near graph: cost per lead, cost per booked call, cost per submitted app, cost per issued/paid app, average commission size
- Leads pipeline list at the bottom (searchable, most recent first)
- Use charts, radial graphs, and visual data representations throughout where they flow naturally

### Billing List Experience
- Transaction history grouped by month
- Filters: All / Ad Spend / Management
- Color-coded status pills (green/yellow/red for paid/pending/failed)
- Tap transaction for simple detail sheet: date, amount, type, status — anything deeper, go to web app
- Two payment methods displayed separately: one for ad spend, one for management
- Card brand, last 4, expiry shown for each

### Data Presentation
- Large numbers abbreviated ($12.4K not $12,400.00)
- Zero values shown as 0 / $0 — no empty state messages for metrics
- Dates shown as relative ("2 days ago", "Yesterday")

### Leads List
- Each entry shows: name, date received, status pill
- Status pills: new lead, booked call, submitted app, issued paid, etc.
- Most recent leads at top, searchable
- Tap lead to see full details (survey answers, questions, all data)
- Call button → goes straight to iPhone dialer (no confirmation)
- Message button → goes straight to iMessage (no confirmation)

### Interaction Patterns
- Pull-to-refresh refreshes the entire dashboard at once
- Haptic feedback on pull-to-refresh

### Claude's Discretion
- Metrics card arrangement (grid vs stacked) — must look cohesive, not thrown together
- Filter sticky behavior (sticky vs top of screen)
- Skeleton loading pattern (simultaneous vs cascade)
- Quick link pill styling and exact placement
- Chart and radial graph placement throughout dashboard
- All visual design decisions — must be modern, bespoke, futuristic, tasteful, and timeless
- NOT vibe-coded looking — should feel intentional and elegant

</decisions>

<specifics>
## Specific Ideas

- "I want it to look modern, beautiful, futuristic, tasteful, and timeless — not like vibe code"
- "Simple, elegant, modern, bespoke — should look in place, as it should be"
- Design should flow correctly, not look tacky or thrown together
- All data points already exist on the web app — reference existing screenshots for data structure but design completely fresh for iOS
- Wallet section reference (data points only, NOT style): balance, monthly max progress, remaining, day X of 30, threshold, recharge
- Graph reference (data points only, NOT style): daily spend, cost/conv, CTR, trend lines with campaign filter and avg/target per day

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-core-value*
*Context gathered: 2026-03-06*
