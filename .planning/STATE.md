# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** All existing functionality continues working after migration -- no lost data, no duplicate billing, no broken client workflows.
**Current focus:** Phase 2 COMPLETE. Ready for Phase 3: Backend Infrastructure.

## Current Position

Phase: 2 of 6 (Database & Auth) -- COMPLETE
Plan: 3 of 3 in Phase 2 (all complete)
Status: Phase 2 complete
Last activity: 2026-02-27 -- Completed 02-03 (Auth Login Test & RLS Verification)

Progress: [######..............] 33%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: ~40min
- Total execution time: ~4 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-preparation-audit | 3/3 | 17min | 6min |
| 02-database-auth | 3/3 | ~225min | ~75min |

**Recent Trend:**
- Last 5 plans: 01-02 (7min), 02-01 (~120min), 02-02 (~90min), 02-03 (~15min)
- Trend: Phase 2 was significantly longer due to Lovable Cloud connectivity workarounds

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 6-phase migration following strict dependency order (DB first, then backend infra, then Stripe, then frontend, then cutover)
- [Roadmap]: Phases 4 and 5 can execute in parallel (frontend deployment does not depend on Stripe migration)
- [Roadmap]: Phase 3 combines edge functions, storage, and realtime into single "Backend Infrastructure" phase (parallel work within phase, shared dependency on Phase 2)
- [02-01]: Migration approach: migration replay (144 SQL files via psql) instead of pg_dump due to Lovable Cloud private infrastructure
- [02-01]: Bridge function pattern for data transfer: edge function on old project reads internal DB, writes to new via pooler
- [02-01]: New project pooler: aws-1-us-east-1.pooler.supabase.com (port 5432 session mode)
- [02-02]: Array column workaround: ALTER to TEXT → bridge copy → ALTER back with casting
- [02-02]: 3 focus_events values in agreements lost (NULLed) due to bridge JSONB serialization bug -- minor data loss accepted
- [02-03]: MFA factor "Alpha Agent Authenticator" preserved and verified on new project
- [01-01]: Stripe API keys ARE in edge functions -- 6 secrets across 8 functions (dual-account: management + ad_spend). Corrects prior research.
- [01-01]: LOVABLE_API_KEY is Lovable AI gateway for LLM access (Gemini 2.5 Flash). Needs replacement post-migration.
- [01-01]: All 106 edge functions use verify_jwt=false. Auth handled internally per function.
- [01-01]: Actual counts: 106 functions (not 92), 144 migrations (not 131), 93 tables.
- [01-03]: Free tier sufficient: 284 MB database < 500 MB limit. No upgrade needed for migration.
- [01-03]: Password-preserving auth migration confirmed: bcrypt hashes exportable, same GoTrue engine, 44 users.
- [01-03]: chat-attachments bucket should be private (currently public -- security fix during migration).
- [01-03]: 6 cron jobs authoritative (config.toml only had 2; 4 created via SQL outside migration system).
- [01-03]: 11 Realtime tables authoritative (frontend research found only 8; 3 additional for admin dashboard).
- [01-03]: Deploy from code (106 functions), not live deployment (104). Code is source of truth.
- [01-02]: ENCRYPTION_KEY must use same value as GHL_ENCRYPTION_KEY in zprofile -- decrypts GHL OAuth tokens and Plaid access tokens.
- [01-02]: GHL_REDIRECT_URI needs dual update: Supabase secret + GHL Marketplace App configuration.
- [01-02]: SLACK_CHAT_WEBHOOK_URL needs separate investigation -- zprofile has only one Slack webhook URL but code uses two channels.
- [01-02]: LOVABLE_API_KEY replacement: 5 functions use standard OpenAI chat format, only base URL and API key need changing.
- [01-02]: Stripe webhook secrets will regenerate when new endpoints created in Stripe Dashboard.
- [01-02]: config.toml `schedule` keys incompatible with Supabase CLI v2.75.0 -- link deferred to Phase 3.
- [01-02]: 17 inbound webhook endpoints need URL updates across 8 external services during cutover.

### Pending Todos

- ~~Investigate which table is the 94th (codebase migrations create 93).~~ RESOLVED: Migration replay produced exactly 94 tables, matching live database. The discrepancy was in the original count.
- Locate Stripe price IDs (STRIPE_MANAGEMENT_PRICE_ID, STRIPE_AD_SPEND_PRICE_ID) -- not in Supabase secrets, may be hardcoded. Investigate in Phase 4 planning.
- Locate 16 missing secret values before Phase 3 (8 HIGH, 4 MEDIUM, 4 LOW priority). See SECRETS.md Section 7.
- Investigate SLACK_CHAT_WEBHOOK_URL -- need separate Slack channel URL for chat notifications.

### Blockers/Concerns

- Research flagged storage migration script as LOW confidence (Supabase `seed buckets` in beta). May need custom Node.js script. Affects Phase 3 planning.
- ~~Actual secret values for 42 edge function secrets need to be located before Phase 3.~~ RESOLVED: 23 of 41 have values available. 16 need investigation (prioritized in SECRETS.md).
- ~~pg_cron jobs need authoritative list~~ RESOLVED: 6 cron jobs captured from Lovable extraction.
- ~~LOVABLE_API_KEY needs replacement strategy~~ RESOLVED: Replace with direct LLM API (OpenAI/Google/OpenRouter). Standard OpenAI chat format, minimal code change.
- `stripe-webhook` and `dispute-webhook` lack signature verification -- security risk to address during migration.
- `admin-set-password` uses hardcoded secret (`alpha-admin-2024`) -- should be moved to env var.
- Stripe price IDs may be hardcoded in edge functions -- needs investigation before Phase 4.
- chat-attachments storage bucket is public (should be private) -- fix during Phase 3 migration.
- config.toml `schedule` keys block `supabase link` -- must remove before Phase 3 function deployment.

## Phase 1 Inventory Files

| File | Lines | Purpose |
|------|-------|---------|
| `.planning/inventories/CODEBASE.md` | 690 | Edge functions, database tables, frontend structure |
| `.planning/inventories/LOVABLE-EXTRACTION.md` | 372 | Live database state, secrets, storage, cron jobs, Realtime |
| `.planning/inventories/SUPABASE-PROJECT.md` | 89 | New project credentials and configuration |
| `.planning/inventories/SECRETS.md` | 263 | Complete secrets inventory with migration readiness |
| `.planning/inventories/WEBHOOKS.md` | 255 | Complete webhook inventory with URL update instructions |

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed Phase 2 (Database & Auth). All 94 tables, 44 auth users, RLS verified, login confirmed.
Resume file: None

### Phase 2 Key Facts for Downstream Phases
- New project DB: `postgresql://postgres.qcunascacayiiuufjtaq:PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres`
- Bridge function still active: `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/db-migration-bridge` (delete after cutover)
- Management API SQL endpoint works: `POST https://api.supabase.com/v1/projects/qcunascacayiiuufjtaq/database/query`
- `supabase link` fails due to config.toml schedule keys — remove before Phase 3
- Hardcoded old project URL in DEFAULT fixed (clients.success_manager_image_url)
