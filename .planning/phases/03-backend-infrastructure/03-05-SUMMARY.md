---
phase: 03-backend-infrastructure
plan: 05
subsystem: infra
tags: [edge-functions, supabase, pg_cron, realtime, vault, deployment]

# Dependency graph
requires:
  - phase: 03-01
    provides: config.toml fixed, CLI linked to new project
  - phase: 03-02
    provides: LLM functions converted from Lovable to Anthropic API
  - phase: 03-04
    provides: .env.secrets file with 33 secrets gathered
  - phase: 02-01
    provides: Database schema and data migrated to new project
provides:
  - 100 of 106 edge functions deployed and callable
  - 37 secrets configured in new project
  - 6 pg_cron jobs active with correct schedules
  - 11 Realtime tables published
  - Vault stores project_url and anon_key for cron job auth
affects: [04-stripe-migration, 05-frontend-deployment, 06-cutover]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pg_cron + vault.decrypted_secrets + net.http_post for cron-to-edge-function invocation"
    - "All functions verify_jwt=false, internal auth per function"

key-files:
  created: []
  modified: []

key-decisions:
  - "Deployed functions one-by-one after bulk deploy hit free tier limit"
  - "Free tier caps at 100 edge functions -- 6 remaining need Pro upgrade"
  - "Realtime tables were already configured by migration SQL -- no manual ADD TABLE needed"
  - "Vault secrets (project_url, anon_key) used for cron job HTTP auth"

patterns-established:
  - "Cron pattern: pg_cron -> vault secret lookup -> net.http_post to edge function"
  - "Secret access verification: function returns business logic error (not 'secret not configured')"

# Metrics
duration: 9min
completed: 2026-02-27
---

# Phase 3 Plan 5: Backend Deployment Summary

**100/106 edge functions deployed, 37 secrets configured, 6 cron jobs active, 11 Realtime tables published -- free tier blocks last 6 functions**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-27T18:09:30Z
- **Completed:** 2026-02-27T18:19:01Z
- **Tasks:** 3
- **Files modified:** 0 (all work was remote deployment and SQL execution)

## Accomplishments

- Deployed 100 of 106 edge functions to new Supabase project (free tier limit of 100 hit)
- Configured 37 secrets (33 manual + 4 auto-set SUPABASE_* keys)
- Spot-checked 5 critical functions: all access their secrets correctly
- Created 6 pg_cron jobs with Vault-based auth (project_url + anon_key)
- Confirmed 11 Realtime tables already published by migration SQL
- Verified verify_jwt=false working: functions execute without JWT, return business logic responses
- Deleted .env.secrets file (sensitive values removed from disk)

## Task Commits

No git commits for this plan -- all work was remote deployment (edge functions, secrets, SQL for cron/Realtime). No local files were created or modified. The .env.secrets file that was deleted was gitignored.

## Files Created/Modified

None -- all operations were remote:
- Edge function deployment via `supabase functions deploy`
- Secrets via `supabase secrets set`
- Cron jobs via Management API SQL
- Realtime publications already configured by migration SQL

## Decisions Made

1. **One-by-one deployment after bulk failure:** The `supabase functions deploy` bulk command failed at function 106 with a 402 "Max number of functions reached." Switched to deploying each function individually, which succeeded for the first 100.

2. **Free tier limit accepted for now:** The free plan allows a maximum of 100 edge functions. 6 functions could not be deployed: verify-google-ads-campaign, verify-lead-delivery, verify-onboarding-live, verify-onboarding, webflow-cms-create, webflow-cms-update. These will deploy after upgrading to Pro tier.

3. **Realtime already configured:** All 11 target tables were already members of the `supabase_realtime` publication from the migration SQL (Phase 2). No manual ALTER PUBLICATION needed.

4. **Vault for cron auth:** Stored project_url and anon_key in Supabase Vault so cron jobs can authenticate to edge functions via `vault.decrypted_secrets`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Bulk deploy failed, switched to individual deployment**
- **Found during:** Task 1 (Deploy all edge functions)
- **Issue:** `supabase functions deploy --project-ref ...` (bulk) returned 402 "Max number of functions reached for project"
- **Fix:** Deployed all 106 functions one by one via `supabase functions deploy <name> --project-ref ...`. First 100 succeeded, last 6 hit the free tier cap.
- **Files modified:** None (remote deployment)
- **Verification:** `supabase functions list` shows 100 ACTIVE functions
- **Impact:** 6 functions remain undeployed (need Pro tier upgrade)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 100 of 106 functions deployed. The 6 missing functions (verify-*, webflow-cms-*) are not critical for cron jobs or immediate operation. Pro tier upgrade will resolve.

## Issues Encountered

1. **Free tier edge function limit (100 max):** The Supabase free plan caps at 100 edge functions. The project needs 106. The remaining 6 functions are:
   - `verify-google-ads-campaign` -- Google Ads campaign verification
   - `verify-lead-delivery` -- lead delivery verification
   - `verify-onboarding-live` -- live onboarding verification (uses Anthropic API)
   - `verify-onboarding` -- onboarding step verification
   - `webflow-cms-create` -- Webflow CMS item creation
   - `webflow-cms-update` -- Webflow CMS item update

   **Resolution:** Upgrade project to Pro tier ($25/mo), then run:
   ```bash
   for f in verify-google-ads-campaign verify-lead-delivery verify-onboarding-live verify-onboarding webflow-cms-create webflow-cms-update; do
     supabase functions deploy "$f" --project-ref qcunascacayiiuufjtaq
   done
   ```

2. **Spot-check 401s were function-level auth, not JWT gating:** mcp-proxy and stripe-billing-webhook returned 401, which initially appeared concerning. Investigation confirmed these were the functions' own authentication checks (MCP_PROXY_SECRET and Stripe webhook signature), not the Supabase JWT gateway. The functions were executing correctly.

## Phase 3 Final Verification

| Criterion | Status | Details |
|-----------|--------|---------|
| Edge functions deployed | 100/106 | 6 blocked by free tier limit |
| verify_jwt=false | PASS | submit-webhook returns 400 without JWT |
| Secrets configured | 37 | 33 manual + 4 auto-set |
| Secret spot-check | 5/5 PASS | All 5 critical functions access secrets |
| Cron jobs active | 6/6 | All schedules correct |
| Storage buckets | 3/3 | From Plan 03 |
| Storage files | 204/~317 | Agreements bucket pending |
| Realtime tables | 11/11 | All published |

## User Setup Required

**Pro tier upgrade needed to deploy remaining 6 functions.** Visit Supabase Dashboard:
1. Go to https://supabase.com/dashboard/project/qcunascacayiiuufjtaq/settings/billing
2. Upgrade organization plan from Free to Pro ($25/mo)
3. Deploy remaining 6 functions (command above)

## Next Phase Readiness

**Phase 3 is functionally complete.** The backend infrastructure is operational:
- 100 functions callable, secrets accessible, cron jobs running, Realtime publishing
- 6 non-critical functions need Pro upgrade to deploy
- Agreements storage migration still pending (needs old service role key)

**Ready for Phase 4 (Stripe Migration):** All Stripe-related functions are deployed (stripe-billing-webhook, stripe-webhook, dispute-webhook, create-stripe-subscription, etc.). Stripe secrets are configured (with Phase 4 webhook placeholders).

**Ready for Phase 5 (Frontend Deployment):** Edge functions are callable at the new project URL.

**Remaining Phase 3 blockers for cutover (Phase 6):**
- Deploy remaining 6 functions after Pro upgrade
- Migrate agreements bucket files (needs old service role key)
- Migrate oversized wav file (54.7 MB, needs Pro tier)

---
*Phase: 03-backend-infrastructure*
*Completed: 2026-02-27*
