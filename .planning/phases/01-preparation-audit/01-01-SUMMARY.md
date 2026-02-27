---
phase: 01-preparation-audit
plan: 01
subsystem: database, infra
tags: [git, supabase, edge-functions, stripe, deno, audit]

# Dependency graph
requires:
  - phase: none
    provides: "First plan in project"
provides:
  - "Cloned alpha-agent-flow repo at alphahub-v2/"
  - "Complete codebase inventory at .planning/inventories/CODEBASE.md"
  - "Resolved Stripe key location (6 secrets in edge functions)"
  - "Resolved LOVABLE_API_KEY purpose (Lovable AI gateway for LLM access)"
  - "Complete secrets inventory (44 unique, 41 manual)"
affects: [01-02 secrets inventory, 01-03 Lovable extraction, phase-02 database, phase-03 backend, phase-04 stripe]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual Stripe account architecture (management + ad_spend)"
    - "All 106 edge functions have verify_jwt=false, auth is handled internally"
    - "Stripe API calls via raw fetch(), no SDK"
    - "LOVABLE_API_KEY is for Lovable AI gateway LLM access"
    - "GHL OAuth tokens encrypted with AES-GCM, Plaid tokens with XOR"

key-files:
  created:
    - "alphahub-v2/ (679 files - complete repo clone)"
    - ".planning/inventories/CODEBASE.md (689 lines)"
  modified: []

key-decisions:
  - "Stripe keys ARE in edge functions (corrects prior research)"
  - "LOVABLE_API_KEY needs replacement post-migration (Lovable AI gateway)"
  - "Actual function count is 106 (not 92 as research stated)"
  - "Actual migration count is 144 (not 131 as research stated)"
  - "All functions use verify_jwt=false"

patterns-established:
  - "Codebase inventory format: categorized tables with purpose and dependencies"
  - "Secret-to-function mapping for migration traceability"

# Metrics
duration: 7min
completed: 2026-02-26
---

# Phase 1 Plan 01: Clone and Audit Summary

**Complete codebase audit of 106 edge functions, 93 tables, 44 secrets with Stripe dual-account architecture and LOVABLE_API_KEY purpose resolved**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-27T04:41:16Z
- **Completed:** 2026-02-27T04:48:18Z
- **Tasks:** 2
- **Files modified:** 680 (679 cloned + 1 created)

## Accomplishments

- Cloned alpha-agent-flow repo (commit 8e95b42) with 106 edge functions, 144 migrations, full frontend
- Created comprehensive 689-line CODEBASE.md documenting every function, table, secret, and architectural pattern
- Resolved critical open question: Stripe API keys ARE in edge functions (6 secrets, dual-account architecture)
- Resolved LOVABLE_API_KEY: Lovable AI gateway for LLM access, needs replacement post-migration
- Identified 4 security concerns and 5 migration risks

## Task Commits

Each task was committed atomically:

1. **Task 1: Clone repo and verify completeness** - `387f092` (chore)
2. **Task 2: Audit codebase and create CODEBASE.md** - `897cb1f` (feat)

## Files Created/Modified

- `alphahub-v2/` - Complete clone of alpha-agent-flow repo (679 files)
- `.planning/inventories/CODEBASE.md` - Full codebase structure audit (689 lines)

## Decisions Made

1. **Stripe keys corrected:** Prior research claimed zero Stripe secrets in edge functions. Fresh audit found 6 Stripe-related Deno.env.get() calls across 8 functions. The dual-account architecture (management + ad_spend) uses raw fetch() to Stripe API, not an SDK.

2. **LOVABLE_API_KEY identified:** Used by 5 functions to call `https://ai.gateway.lovable.dev/v1/chat/completions` for LLM access (currently Gemini 2.5 Flash). Post-migration, this needs replacement with an alternative AI API.

3. **Function count updated:** Actual count is 106 functions (not 92 from research). Migration file count is 144 (not 131). Research was based on an older version of the repo.

4. **All functions use verify_jwt=false:** None of the 106 registered functions use Supabase JWT verification. Authentication is handled within each function using authorization headers, API keys, or custom secrets.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected Stripe key research finding**
- **Found during:** Task 2 (Stripe investigation)
- **Issue:** Plan stated "Research identified ZERO Deno.env.get() calls for Stripe secrets." Fresh grep found 6 Stripe secrets actively used by 8 functions.
- **Fix:** Documented the correct findings with function-to-secret mappings
- **Files modified:** .planning/inventories/CODEBASE.md
- **Verification:** grep confirmed STRIPE_MANAGEMENT_SECRET_KEY, STRIPE_AD_SPEND_SECRET_KEY, etc.
- **Committed in:** 897cb1f (Task 2 commit)

**2. [Rule 3 - Blocking] Removed inner .git directory from clone**
- **Found during:** Task 1 (Clone verification)
- **Issue:** Nested git repo would cause parent project to treat alphahub-v2/ as a submodule, preventing file tracking
- **Fix:** Removed alphahub-v2/.git so the clone becomes a regular directory in the parent project
- **Files modified:** alphahub-v2/.git removed
- **Verification:** git status shows alphahub-v2/ as untracked directory
- **Committed in:** 387f092 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug correction, 1 blocking fix)
**Impact on plan:** Both fixes essential. The Stripe key correction directly affects Phase 4 planning. The git fix was required to track the clone in the parent project.

## Issues Encountered

- Function count discrepancy (106 vs 92 expected) -- the repo has grown since research was conducted. Not an issue, just updated counts throughout.
- Migration count discrepancy (144 vs 131 expected) -- same cause.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Plan 01-02 (Secrets Inventory):** CODEBASE.md provides the complete secret-to-function mapping needed. The 41 manual secrets are fully documented with categories and function counts.
- **Plan 01-03 (Lovable Extraction):** CODEBASE.md identifies what information Lovable AI needs to provide (cron jobs, auth users, storage contents, database size).
- **Phase 2 (Database):** 93 tables documented with relationships. 144 migration files ready to apply.
- **Phase 3 (Backend):** 106 edge functions documented with dependencies and categorization.
- **Phase 4 (Stripe):** Dual-account architecture fully mapped. stripe-billing-webhook has signature verification; stripe-webhook and dispute-webhook do not.

---

*Phase: 01-preparation-audit*
*Completed: 2026-02-26*
