---
phase: 06-cutover-verification
plan: 02
subsystem: infra
tags: [data-migration, bridge-function, mcp-proxy, feature-verification, webhooks, dns, cron, storage-urls]

# Dependency graph
requires:
  - phase: 06-cutover-verification/01
    provides: All edge function URLs point to hub.alphaagent.io
  - phase: 02-database-auth/02
    provides: Bridge function pattern and array column workaround
provides:
  - "Full data re-sync from old to new database (78 tables, 69,178 rows)"
  - "Storage URLs rewritten to new project across all text and JSONB columns"
  - "All 7 core features verified via mcp-proxy (13/13 tools pass)"
  - "6 cron jobs re-enabled with correct schedules"
  - "Old Stripe webhook endpoints disabled"
  - "External webhook URLs updated to new project"
affects: [06-03-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bridge function re-sync: unschedule crons → disable triggers → truncate → re-import → re-enable"
    - "Comprehensive URL rewrite via DO$$ loop across all text/varchar columns"

key-files:
  created: []
  modified: []

key-decisions:
  - "Bare alphaagent.io points to marketing site (216.198.79.1) -- intentionally separate from app"
  - "Fathom webhook skipped -- not currently in use"
  - "209 stale billing_records cleaned up during re-sync (truncate + re-import)"

patterns-established:
  - "mcp-proxy verification pattern: 13 tools across 7 features as go/no-go gate"

# Metrics
duration: ~6min (re-verification of existing work + checkpoint)
completed: 2026-03-03
---

# Plan 06-02: Data Re-sync, Feature Verification, Webhook Switchover Summary

**Full database re-sync via bridge function (78 tables, 69,178 rows), all 7 core features verified via mcp-proxy, external webhooks switched to new project**

## Performance

- **Duration:** ~6 min (re-verification of prior work + user checkpoint)
- **Completed:** 2026-03-03
- **Tasks:** 5 (4 auto + 1 checkpoint)
- **Files modified:** 0 (all remote SQL/HTTP operations)

## Accomplishments
- Full data re-sync from old to new database: 78 non-empty tables, 69,178 total rows
- Storage URLs rewritten across all text/varchar columns (old project ref replaced with new)
- All 6 cron jobs re-enabled with correct schedules via pg_cron + vault pattern
- 13/13 mcp-proxy tool verifications pass across all 7 core features
- DNS verified: hub.alphaagent.io → Vercel (HTTP 200), bare alphaagent.io → marketing site
- Old Stripe webhook endpoints disabled on both accounts (user confirmed)
- External webhook URLs updated to new project (user confirmed, Fathom skipped -- not in use)

## Task Commits

1. **Task 1: Disable cron jobs, truncate tables, re-import data via bridge function** - `4d36a0e` (feat)
2. **Task 2: Rewrite storage URLs, re-enable cron jobs, verify row counts** - `4d36a0e` (feat)
3. **Task 3: Run automated feature verification via mcp-proxy** - `4d36a0e` (feat)
4. **Task 4: Verify bare alphaagent.io DNS** - `4d36a0e` (feat)
5. **Task 5: User switches external webhook URLs and disables old Stripe endpoints** - User confirmed (checkpoint)

**Note:** Tasks 1-4 were committed together in a prior session.

## Feature Verification Results

| Feature | Tools | Result |
|---------|-------|--------|
| Client Management | list_clients, search_clients, get_client_detail | 3/3 PASS |
| Billing | get_billing_summary, get_stripe_invoices, get_stripe_charges, get_stripe_subscriptions | 4/4 PASS |
| Ad Spend Wallets | get_ad_spend_overview | 1/1 PASS |
| Campaign Health | get_campaign_health | 1/1 PASS |
| Lead Pipeline | get_lead_pipeline | 1/1 PASS |
| Communications | get_communications | 1/1 PASS |
| Financial Projections & Alerts | get_financial_projections, get_alerts | 2/2 PASS |

**Total: 13/13 PASS**

## DNS Verification

- `hub.alphaagent.io` → CNAME `cname.vercel-dns.com` → HTTP 200
- `alphaagent.io` → A `216.198.79.1` → HTTP 200 (marketing site, intentionally separate)

## Decisions Made

- Bare alphaagent.io is a separate marketing site, not the app — CUT-03 satisfied by hub.alphaagent.io
- Fathom webhook update skipped — service not currently in use
- 209 stale billing_records from cron cleaned up via truncate + re-import approach

## Deviations from Plan

None — plan executed as written.

## Issues Encountered

None.

## User Setup Required

Completed during checkpoint:
- Old Stripe webhook endpoints disabled on both accounts
- External webhook URLs updated to new project (9 of 10 — Fathom skipped)

## Next Phase Readiness

- Data is fresh and all features verified
- External integrations pointing to new project
- Ready for 06-03: MCP server update and old project cleanup

---
*Phase: 06-cutover-verification*
*Completed: 2026-03-03*
