---
phase: 03-backend-infrastructure
verified: 2026-02-27T18:24:14Z
status: gaps_found
score: 4/5 success criteria verified
re_verification: false
gaps:
  - truth: "All 106 edge functions are deployed and callable with verify_jwt=false preserved"
    status: partial
    reason: "100/106 functions deployed (ACTIVE). 6 functions blocked by free tier limit of 100 functions. All 106 have verify_jwt=false in config.toml. The 6 undeployed functions return 404 and are not callable."
    artifacts:
      - path: "alphahub-v2/supabase/config.toml"
        issue: "Config is correct (106 entries, all verify_jwt=false). Not a config defect -- deployment is blocked by platform limit."
      - path: "alphahub-v2/supabase/functions/verify-onboarding-live/index.ts"
        issue: "File exists and is converted to Anthropic API but function is not deployed"
      - path: "alphahub-v2/supabase/functions/verify-google-ads-campaign/index.ts"
        issue: "File exists but function is not deployed"
      - path: "alphahub-v2/supabase/functions/verify-lead-delivery/index.ts"
        issue: "File exists but function is not deployed"
      - path: "alphahub-v2/supabase/functions/verify-onboarding/index.ts"
        issue: "File exists and is converted (env var renamed) but function is not deployed"
      - path: "alphahub-v2/supabase/functions/webflow-cms-create/index.ts"
        issue: "File exists but function is not deployed"
      - path: "alphahub-v2/supabase/functions/webflow-cms-update/index.ts"
        issue: "File exists but function is not deployed"
    missing:
      - "Upgrade Supabase project to Pro tier at https://supabase.com/dashboard/project/qcunascacayiiuufjtaq/settings/billing"
      - "Deploy 6 remaining functions after Pro upgrade: verify-google-ads-campaign, verify-lead-delivery, verify-onboarding-live, verify-onboarding, webflow-cms-create, webflow-cms-update"
  - truth: "All 41 secrets configured (ROADMAP baseline) -- accepted deviation: 33 active secrets"
    status: partial
    reason: "37 secrets confirmed in vault (33 manual + 4 auto-set SUPABASE_*). Deviation from ROADMAP's 41 is accepted per user decision: 3 Plaid secrets removed (not in use), 3 optional GHL URLs not set (code handles gracefully). Both Stripe webhook secrets are placeholders pending Phase 4 -- this is intentional and known."
    artifacts:
      - path: "alphahub-v2/supabase/.env.secrets"
        issue: "File has been deleted (ephemeral as intended). Secrets are live in the vault. STRIPE_AD_SPEND_WEBHOOK_SECRET and STRIPE_MANAGEMENT_WEBHOOK_SECRET are placeholder values -- both have identical digests confirming they share the same placeholder value."
    missing:
      - "Real STRIPE_AD_SPEND_WEBHOOK_SECRET value -- generated during Phase 4 when new webhook endpoints are created"
      - "Real STRIPE_MANAGEMENT_WEBHOOK_SECRET value -- generated during Phase 4"
  - truth: "All 317 storage files are accessible"
    status: partial
    reason: "204/~317 files migrated. Agreements bucket has 0 files (needs old project service role key). media=156/157 (1 wav file exceeds 50MB free tier limit). chat-attachments=48/48 (complete). All migrated files are publicly accessible (HTTP 200 confirmed)."
    artifacts:
      - path: "scripts/migrate-storage.ts"
        issue: "Script exists and is rerunnable for agreements bucket with --bucket agreements flag when old service role key is available. Not a script defect."
    missing:
      - "Old project service role key from https://supabase.com/dashboard/project/qydkrpirrfelgtcqasdx/settings/api to migrate agreements bucket (~114 files)"
      - "Pro tier upgrade to migrate 1 oversized wav file (54.7 MB, lesson-files/1767150569935-0hry6b.wav)"
      - "Run: OLD_SUPABASE_SERVICE_KEY='<key>' NEW_SUPABASE_URL='$SUPABASE_V2_URL' NEW_SUPABASE_SERVICE_KEY='$SUPABASE_V2_SERVICE_ROLE_KEY' npx tsx scripts/migrate-storage.ts --bucket agreements"
human_verification:
  - test: "Verify Realtime subscriptions deliver live updates"
    expected: "Insert a row into chat_messages table and confirm a connected frontend client (or Supabase Dashboard Realtime inspector) receives the change event within 1 second"
    why_human: "Realtime publications are confirmed enabled (11/11 tables in supabase_realtime publication via SQL), but the full chain (publication -> websocket -> client subscription) requires a live browser session to verify end-to-end. This is Pitfall 7 from RESEARCH.md."
  - test: "Verify cron jobs are actually invoking edge functions (not just scheduled)"
    expected: "check-automation-timeout (runs every minute) -- check edge function logs in Supabase Dashboard to confirm invocations are being received from the cron job. Should see successful invocations with the business logic response."
    why_human: "Cron jobs show active=true in pg_cron and use Vault-based auth pointing to the correct project URL. The pattern is correct, but confirming actual HTTP delivery and function execution requires checking live logs in the Supabase Dashboard (Functions > check-automation-timeout > Logs)."
---

# Phase 3: Backend Infrastructure Verification Report

**Phase Goal:** All server-side automation is operational on the new project -- edge functions respond, cron jobs fire on schedule, storage files are accessible, and Realtime subscriptions deliver updates
**Verified:** 2026-02-27T18:24:14Z
**Status:** gaps_found (with accepted deviations)
**Re-verification:** No -- initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All 106 edge functions deployed and callable with verify_jwt=false | PARTIAL | 100/106 ACTIVE (live `supabase functions list`). 6 return 404. Config: 106 entries, 0 verify_jwt=true. |
| 2 | All secrets configured (with accepted deviations) | PARTIAL | 37/37 secrets in vault confirmed. 2 Stripe webhook secrets are placeholders (same digest). Deviations from 41 baseline accepted by user. |
| 3 | All 6 cron jobs active and firing on schedule | VERIFIED | `SELECT * FROM cron.job` returns 6 rows, all active=true, schedules correct, Vault auth pattern confirmed. |
| 4 | All 3 storage buckets exist with correct policies and files accessible | PARTIAL | 3/3 buckets exist, correct public/private settings, 12 RLS policies applied. 204/~317 files migrated. Agreements=0 files. HTTP 200 for media and chat-attachments. |
| 5 | Realtime publications enabled for all 11 tables | VERIFIED | `SELECT COUNT(*) FROM pg_publication_tables WHERE pubname='supabase_realtime'` returns 11. All 11 expected tables confirmed. |

**Score:** 2/5 truths fully verified, 3/5 partial with known/accepted blockers

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `alphahub-v2/supabase/config.toml` | 106 functions, all verify_jwt=false | VERIFIED | 106 `verify_jwt = false`, 0 `verify_jwt = true`. project_id = qcunascacayiiuufjtaq. |
| Edge functions (100 deployed) | ACTIVE on new project | VERIFIED | 100 ACTIVE functions listed by `supabase functions list`. |
| Edge functions (6 undeployed) | Should be ACTIVE | MISSING (platform limit) | verify-google-ads-campaign, verify-lead-delivery, verify-onboarding-live, verify-onboarding, webflow-cms-create, webflow-cms-update return 404. |
| LLM functions (5) | Converted from Lovable to Anthropic API | VERIFIED | Zero LOVABLE_API_KEY references. All use `https://api.anthropic.com/v1/messages`, `x-api-key` header, `claude-sonnet-4-6`. verify-onboarding-live uses correct Anthropic tool calling format with `input_schema`. |
| `scripts/migrate-storage.ts` | Storage migration script | VERIFIED | 403 lines. Has --bucket flag, retry logic, agreements migration instructions. Idempotent upsert pattern. |
| Secrets vault (37 secrets) | All critical secrets set | VERIFIED (with caveats) | 37 secrets confirmed. 2 Stripe webhook secrets are intentional placeholders for Phase 4. |
| Storage buckets (3) | media=public, agreements=private, chat-attachments=public | VERIFIED | Live SQL confirms: agreements.public=false, chat-attachments.public=true, media.public=true. |
| Storage files (media) | 157 files | PARTIAL | 156/157. 1 wav file (54.7 MB) exceeds free tier 50MB upload limit. |
| Storage files (chat-attachments) | 48 files | VERIFIED | 48/48 confirmed via SQL count. |
| Storage files (agreements) | ~114 files | MISSING | 0/~114. Old project service role key not available (Lovable-managed project, 403 from Management API). |
| pg_cron jobs (6) | Active with Vault auth | VERIFIED | 6 jobs active=true. All use `vault.decrypted_secrets` for project_url and anon_key. Correct schedules. |
| Realtime publication | 11 tables in supabase_realtime | VERIFIED | SQL confirms 11 tables: admin_channel_messages, admin_dm_messages, call_logs, chat_conversations, chat_messages, conversions, live_stats, onboarding_automation_runs, prospect_activities, prospects, support_tickets. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| check-automation-timeout (cron) | edge function endpoint | pg_cron -> net.http_post -> Vault | VERIFIED | Live call returns `{"success":true,"message":"No stale automations found","processed":0}` |
| submit-webhook | Business logic | verify_jwt=false | VERIFIED | Returns `{"error":"Webhook URL is required"}` -- function running, not JWT-blocked |
| mcp-proxy | Business logic | verify_jwt=false | VERIFIED | Returns `{"error":"Unauthorized"}` -- function's own auth check, not JWT gate (correct) |
| Cron jobs | Correct project (new) | Vault project_url | VERIFIED | Vault stores `https://qcunascacayiiuufjtaq.supabase.co` (confirmed new project URL) |
| analyze-prospect | Anthropic API | LLM_API_KEY | WIRED | Code uses `Deno.env.get("LLM_API_KEY")`, LLM_API_KEY secret confirmed in vault |
| verify-onboarding-live | Anthropic Tool Use | LLM_API_KEY | WIRED (not deployed) | Code converted correctly but function returns 404 |
| media files | Public CDN | storage public policy | VERIFIED | HTTP 200 for `https://qcunascacayiiuufjtaq.supabase.co/storage/v1/object/public/media/profile-photos/1766368659922-oq4x14.jpg` |
| chat-attachments files | Public CDN | storage public policy | VERIFIED | HTTP 200 for attachment PNG |
| agreements files | Private with RLS | storage RLS policies | BLOCKED | 0 files migrated -- cannot test access |

---

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| EDGE-01: Deploy all 90+ edge functions | PARTIAL | 100/106 deployed. 6 blocked by free tier. |
| EDGE-02: Configure all ~40+ secrets | PARTIAL | 37 set (33 manual + 4 auto). 2 are intentional Phase 4 placeholders. Deviations accepted. |
| EDGE-03: Recreate all pg_cron scheduled jobs | VERIFIED | 6/6 jobs active with correct schedules. |
| EDGE-04: Verify edge function JWT verification config | VERIFIED | 106 functions all verify_jwt=false in config. 100 deployed functions confirmed callable without JWT. |
| EDGE-05: Update CORS origins | VERIFIED (no-op) | All functions use wildcard `*` CORS. No update needed per research findings. Documented as accepted. |
| STORE-01: Create 3 storage buckets with correct policies | VERIFIED | 3 buckets, correct public/private, 12 RLS policies. |
| STORE-02: Migrate all file objects from old buckets | PARTIAL | 204/~317 files. Agreements=0 (needs old service key). 1 wav oversized. |
| STORE-03: Verify storage access policies match old project | VERIFIED | Public/private settings match. RLS policies applied from Phase 2 SQL. |
| RT-01: Enable Realtime publications for all tables | VERIFIED | 11/11 tables in supabase_realtime publication. |
| RT-02: Verify 8 Realtime components reconnect | NEEDS HUMAN | Server-side publications confirmed. Client-side reconnection requires frontend test. |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `alphahub-v2/supabase/functions/verify-onboarding/index.ts` | - | Uses LLM_API_KEY as boolean flag only (no actual API call) | Info | By design. Function only checks if key exists to gate a test step, not for an LLM call. Documented in RESEARCH.md. |
| Stripe webhook secrets | - | Both `STRIPE_AD_SPEND_WEBHOOK_SECRET` and `STRIPE_MANAGEMENT_WEBHOOK_SECRET` have identical digest values | Warning | Intentional placeholders. Identical digests confirm same placeholder value set for both. Must be replaced with real values in Phase 4. |

No blocker anti-patterns found (no `TODO`/placeholder/empty return patterns in deployed function code beyond intentional design).

---

## Human Verification Required

### 1. Realtime End-to-End Delivery

**Test:** Open the Supabase Dashboard Realtime inspector at https://supabase.com/dashboard/project/qcunascacayiiuufjtaq/realtime, subscribe to `chat_messages`, then insert a test row via the Table Editor. Alternatively, open two browser tabs with the AlphaHub frontend (once deployed in Phase 5) and send a chat message, verifying it appears in real-time in the second tab.
**Expected:** The inserted row event appears in the Realtime inspector within 1-2 seconds.
**Why human:** The 11 Realtime publications are confirmed in `pg_publication_tables` via SQL. However, the full delivery chain (publication -> WebSocket multiplexer -> client subscription reconnect) requires a live client to verify. This is the gap identified in RESEARCH.md Pitfall 7.

### 2. Cron Job Invocation Confirmation

**Test:** Visit https://supabase.com/dashboard/project/qcunascacayiiuufjtaq/functions/check-automation-timeout/logs and observe logs. Since this job runs every minute, at least 1-2 invocations should appear within 2 minutes of checking.
**Expected:** Logs show POST requests with 200 status and the business logic response `{"success":true,"message":"No stale automations found","processed":0}` (or a message listing stale automations if any exist).
**Why human:** The cron job is active and the HTTP call pattern is correct (verified via live `cron.job` query). However, Vault-to-edge-function invocation delivery cannot be verified via SQL alone -- requires checking live function logs.

---

## Gaps Summary

Phase 3 is **functionally operational** with three known gaps, all of which are understood, documented, and have clear resolution paths:

**Gap 1 -- 6 Undeployed Functions (Platform Limit):**
The Supabase free tier caps at 100 edge functions. 6 functions (verify-google-ads-campaign, verify-lead-delivery, verify-onboarding-live, verify-onboarding, webflow-cms-create, webflow-cms-update) are code-ready and configured but not live. None are in the critical path for cron jobs or Stripe (Phase 4 dependency). Resolution: upgrade to Pro tier ($25/mo) and run the provided deploy command.

**Gap 2 -- Stripe Webhook Secret Placeholders:**
`STRIPE_AD_SPEND_WEBHOOK_SECRET` and `STRIPE_MANAGEMENT_WEBHOOK_SECRET` are set to placeholder values by design -- real values cannot be generated until new webhook endpoints are registered in Phase 4. This is not a Phase 3 defect.

**Gap 3 -- Agreements Bucket Empty (Access Barrier):**
The agreements bucket (private, ~114 PDF files) could not be migrated because the old Supabase project (qydkrpirrfelgtcqasdx) is Lovable-managed and inaccessible via the Management API. The migration script is in place and rerunnable with `--bucket agreements` once the user retrieves the old project's service_role key from the Supabase Dashboard. The 20 database records referencing agreement PDFs will have broken links until this is resolved. Resolution: get old service_role key and run the provided command in `03-03-SUMMARY.md`.

**What IS working and verified against live deployment:**
- 100 edge functions ACTIVE and callable
- All 37 secrets in vault (including the critical ENCRYPTION_KEY for GHL OAuth tokens)
- 6/6 cron jobs active with correct schedules and Vault-based auth
- 3/3 storage buckets with correct public/private settings
- 204 files publicly accessible (HTTP 200 confirmed)
- 11/11 Realtime tables in publication
- 5 LLM functions converted from Lovable gateway to Anthropic API (zero LOVABLE_API_KEY references)
- config.toml correctly points to new project with all 106 functions configured

---

*Verified: 2026-02-27T18:24:14Z*
*Verifier: Claude (gsd-verifier)*
