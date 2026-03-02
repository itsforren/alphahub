# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** All existing functionality continues working after migration -- no lost data, no duplicate billing, no broken client workflows.
**Current focus:** Phase 6 (Cutover & Verification) IN PROGRESS. Plan 1 of 3 complete. Remaining: 06-02 (External Webhook URLs), 06-03 (Final Cutover).

## Current Position

Phase: 6 of 6 (Cutover & Verification)
Plan: 1 of 3 in Phase 6
Status: In progress
Last activity: 2026-03-02 -- Completed 06-01-PLAN.md (Edge Function URL Fix)

Progress: [█████████████████████████████░░░] 89% (17 of 19 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 17
- Average duration: ~21min
- Total execution time: ~5.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-preparation-audit | 3/3 | 17min | 6min |
| 02-database-auth | 3/3 | ~225min | ~75min |
| 03-backend-infrastructure | 5/5 | ~55min | ~11min |
| 04-stripe-migration | 3/3 | 8min | 2.7min |
| 05-frontend-deployment | 2/2 | ~92min | ~46min |
| 06-cutover-verification | 1/3 | 2min | 2min |

**Recent Trend:**
- Last 5 plans: 05-02 (~90min), 04-01 (1min), 04-02 (2min), 04-03 (5min), 06-01 (2min)
- Trend: URL fix plan fast -- simple find-and-replace across 6 files + remote deploy

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
- [02-02]: Array column workaround: ALTER to TEXT -> bridge copy -> ALTER back with casting
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
- [03-01]: Removed config.toml schedule keys -- cron handled by pg_cron SQL jobs, not CLI config
- [03-01]: All 106 functions registered in config.toml with verify_jwt=false, ready for bulk deploy
- [03-02]: 5 LLM functions converted from Lovable AI gateway to Anthropic Messages API with claude-sonnet-4-6
- [03-02]: generate-dispute-evidence upgraded from openai/gpt-5.2 to claude-sonnet-4-6
- [03-02]: verify-onboarding-live uses Anthropic tool calling (input_schema, tool_use response parsing)
- [03-03]: chat-attachments bucket kept as public per user decision (not changed to private)
- [03-03]: Old project service role key inaccessible via Management API -- agreements migration deferred
- [03-03]: 54.7 MB wav file exceeds free tier 50MB upload limit -- will migrate after Pro upgrade
- [03-04]: Plaid secrets removed (not in use). GHL optional URLs not set (code handles gracefully).
- [03-04]: GHL_REDIRECT_URI points to conscious.sysconscious.com (custom domain), not Supabase URL -- no change needed
- [03-04]: GHL OAuth tokens migrated in Phase 2, ENCRYPTION_KEY preserved, token refresh works
- [03-04]: Google Ads OAuth: all 5 tokens present, stateless refresh pattern, no callback URLs
- [03-05]: Free tier caps at 100 edge functions -- 6 remaining need Pro upgrade to deploy
- [03-05]: Deployed functions one-by-one after bulk deploy hit free tier limit
- [03-05]: Realtime tables were already configured by migration SQL -- no manual ADD TABLE needed
- [03-05]: Vault stores project_url and anon_key for pg_cron job auth to edge functions
- [05-01]: GitHub repo itsforren/alphahub created (public) with 685 files from alphahub-v2 contents
- [05-01]: tmp/ directory excluded from repo (debug logs and temp images, not source code)
- [05-02]: Vercel (Hobby plan) selected as hosting platform -- zero-config Vite detection, git-connected deploys
- [05-02]: hub.alphaagent.io configured via Hostinger DNS CNAME to Vercel
- [05-02]: Supabase Pro upgrade completed -- unblocks 6 edge functions and 54.7MB wav file migration
- [05-02]: User confirmed all 10 pages load correctly with real data from new backend
- [05-02]: Data is migration snapshot -- delta sync planned for Phase 6 cutover
- [04-01]: admin-set-password secret moved to ADMIN_SET_PASSWORD_SECRET env var with defense-in-depth guard
- [04-01]: Same secret value (alpha-admin-2024) used for continuity -- can be rotated after cutover
- [04-02]: Stripe Event Destinations (new feature) used instead of legacy webhook endpoints -- creates Snapshot + Thin payload destinations
- [04-02]: "Select all" events registered on both accounts (includes all 7 required billing types plus more)
- [04-02]: Only Snapshot payload signing secrets configured -- handler uses full event data, not thin payloads
- [04-02]: Old webhook endpoints left untouched on both Stripe accounts -- fallback for Phase 6 cutover
- [04-02]: Dispute-webhook separate endpoint deferred to Phase 6 (dispute events included in "Select all" but handler ignores them)
- [04-03]: Real $5 ad_spend transaction verified end-to-end on James Warren's account (pi_3T6WjdFJvHu48K3u0fT3jd8v)
- [04-03]: DB has 6 active subscriptions (migration snapshot), Stripe Dashboard has 17 -- DB will auto-populate via webhook events
- [04-03]: 209 stale pending billing_records from cron running with wrong Stripe keys -- cleanup needed before cutover
- [04-03]: create-stripe-invoice uses PaymentIntent for ad_spend (inline charge + wallet deposit), invoice flow for management
- [06-01]: sierra@alphaagent.io left unchanged -- email address, not a URL
- [06-01]: create-user-account: replaced dynamic .lovable.app URL construction with hardcoded hub.alphaagent.io
- [06-01]: PUBLIC_APP_URL secret set on new project for morning-review-job runtime URL resolution

### Pending Todos

- ~~Investigate which table is the 94th (codebase migrations create 93).~~ RESOLVED: Migration replay produced exactly 94 tables, matching live database. The discrepancy was in the original count.
- Locate Stripe price IDs (STRIPE_MANAGEMENT_PRICE_ID, STRIPE_AD_SPEND_PRICE_ID) -- not in Supabase secrets, may be hardcoded. Investigate in Phase 4 planning.
- Locate 16 missing secret values before Phase 3 (8 HIGH, 4 MEDIUM, 4 LOW priority). See SECRETS.md Section 7.
- Investigate SLACK_CHAT_WEBHOOK_URL -- need separate Slack channel URL for chat notifications.
- **NEW**: Migrate agreements bucket files -- needs old project service role key from Supabase Dashboard or Lovable settings. Run: `OLD_SUPABASE_SERVICE_KEY="<key>" npx tsx scripts/migrate-storage.ts --bucket agreements`
- **UNBLOCKED**: Migrate oversized wav file (54.7 MB) -- Pro upgrade done. Path: media/lesson-files/1767150569935-0hry6b.wav
- **NEW**: Clean up 209 stale pending billing_records created by auto-recharge cron running with wrong Stripe keys. These are duplicates/stale records that will cause billing errors if not removed before cutover.
- ~~**UNBLOCKED**: Deploy remaining 6 edge functions -- Pro upgrade done: verify-google-ads-campaign, verify-lead-delivery, verify-onboarding-live, verify-onboarding, webflow-cms-create, webflow-cms-update~~ RESOLVED: All 106/106 functions deployed in 04-01.

### Blockers/Concerns

- ~~Research flagged storage migration script as LOW confidence (Supabase `seed buckets` in beta). May need custom Node.js script.~~ RESOLVED: Custom Node.js script created and working (scripts/migrate-storage.ts).
- ~~Actual secret values for 42 edge function secrets need to be located before Phase 3.~~ RESOLVED: 23 of 41 have values available. 16 need investigation (prioritized in SECRETS.md).
- ~~pg_cron jobs need authoritative list~~ RESOLVED: 6 cron jobs captured from Lovable extraction.
- ~~LOVABLE_API_KEY needs replacement strategy~~ RESOLVED: Replaced with Anthropic Messages API in 03-02. All 5 functions use LLM_API_KEY + claude-sonnet-4-6.
- `stripe-webhook` and `dispute-webhook` lack signature verification -- security risk to address during migration.
- ~~`admin-set-password` uses hardcoded secret (`alpha-admin-2024`) -- should be moved to env var.~~ RESOLVED: Fixed in 04-01. Now uses ADMIN_SET_PASSWORD_SECRET env var.
- Stripe price IDs may be hardcoded in edge functions -- needs investigation before Phase 4.
- ~~chat-attachments storage bucket is public (should be private) -- fix during Phase 3 migration.~~ RESOLVED: Kept as public per user decision.
- ~~config.toml `schedule` keys block `supabase link` -- must remove before Phase 3 function deployment.~~ RESOLVED: Removed in 03-01. CLI link successful.
- **NEW**: Agreements bucket (private) has 0 files on new project -- needs old service role key to migrate ~114 files. Only 20 are referenced by database records; rest may be old drafts/versions.
- **NEW**: Temporary auth user `migration-temp@test.com` created on old project during investigation -- harmless but should be cleaned up during cutover/decommission.
- ~~Free tier limits edge functions to 100. Need Pro upgrade ($25/mo) to deploy remaining 6 functions. Same upgrade resolves 50MB upload limit for wav file.~~ RESOLVED: Supabase Pro upgrade completed. 6 functions and wav file can now be deployed/migrated.

## Phase 1 Inventory Files

| File | Lines | Purpose |
|------|-------|---------|
| `.planning/inventories/CODEBASE.md` | 690 | Edge functions, database tables, frontend structure |
| `.planning/inventories/LOVABLE-EXTRACTION.md` | 372 | Live database state, secrets, storage, cron jobs, Realtime |
| `.planning/inventories/SUPABASE-PROJECT.md` | 89 | New project credentials and configuration |
| `.planning/inventories/SECRETS.md` | 263 | Complete secrets inventory with migration readiness |
| `.planning/inventories/WEBHOOKS.md` | 255 | Complete webhook inventory with URL update instructions |

## Session Continuity

Last session: 2026-03-02T15:06:26Z
Stopped at: Completed 06-01-PLAN.md (Edge Function URL Fix). All 6 functions redeployed with hub.alphaagent.io URLs.
Resume file: None

### Phase 2 Key Facts for Downstream Phases
- New project DB: `postgresql://postgres.qcunascacayiiuufjtaq:PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres`
- Bridge function still active: `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/db-migration-bridge` (delete after cutover)
- Management API SQL endpoint works: `POST https://api.supabase.com/v1/projects/qcunascacayiiuufjtaq/database/query`
- ~~`supabase link` fails due to config.toml schedule keys~~ RESOLVED in 03-01: schedule keys removed, link successful
- Hardcoded old project URL in DEFAULT fixed (clients.success_manager_image_url)

### Phase 3 Key Facts
- Storage buckets created: media (public), agreements (private), chat-attachments (public)
- Storage migration script: `scripts/migrate-storage.ts` (supports --bucket flag for partial reruns)
- Public bucket files: 204 migrated (156 media + 48 chat-attachments)
- Agreements bucket: 0 files -- needs OLD_SUPABASE_SERVICE_KEY to migrate
- Old project anon key hardcoded in script (for public bucket access)
- Database file URL references still point to old project -- URL rewriting needed during cutover
- Edge functions: 106/106 deployed (all complete as of 04-01)
- Secrets: 40 configured (33 manual + 4 auto-set SUPABASE_* + 1 ADMIN_SET_PASSWORD_SECRET + 2 Stripe webhook secrets)
- Cron jobs: 6 active via pg_cron + vault + net.http_post pattern
- Realtime: 11 tables published (configured by migration SQL)
- Vault secrets: project_url and anon_key stored for cron auth

### Phase 4 Key Facts
- Stripe webhook endpoint URL (both accounts): https://qcunascacayiiuufjtaq.supabase.co/functions/v1/stripe-billing-webhook
- Management account: Snapshot webhook with STRIPE_MANAGEMENT_WEBHOOK_SECRET configured
- Ad Spend account: Snapshot webhook with STRIPE_AD_SPEND_WEBHOOK_SECRET configured
- Event types: "Select all" on both accounts (includes all 7 required billing events)
- Stripe Event Destinations feature used (creates Snapshot + Thin payload pairs)
- Thin payload secrets NOT configured (handler uses Snapshot payloads only)
- Old webhook endpoints preserved on both accounts for Phase 6 fallback
- Dispute-webhook separate endpoint deferred to Phase 6
- stripe-billing-webhook dual-secret verification: tries management secret first, then ad_spend secret
- Real transaction verified: $5 ad_spend charge on James Warren (pi_3T6WjdFJvHu48K3u0fT3jd8v) -- billing_record paid, wallet_transaction deposit created
- James Warren client_id: 9d03c1f4-8f20-48fd-b358-64b9752a7861, ad_spend customer: cus_Tzh0bQHzJyBDrs
- Active subscriptions: 6 in DB (migration snapshot), 17 on Stripe Dashboard (authoritative)
- 209 stale pending billing_records from cron -- need cleanup before cutover
- Auto-recharge cron active: every 30 min, calls auto-recharge-run via pg_cron + vault

### Phase 5 Key Facts (COMPLETE)
- GitHub repo: https://github.com/itsforren/alphahub (public)
- Repo root: /Users/forren/workspace/copy-alphahub/alphahub-v2/ (has its own .git)
- vercel.json: SPA catch-all rewrite /(.*) -> /index.html
- .env.example: 4 VITE_* vars documented (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_PROJECT_ID)
- Build: npm run build succeeds in 7.18s (chunk size warning is non-blocking)
- .env with old credentials exists locally but is gitignored -- NOT in repo
- Vercel project: alphahub-v2 on team alpha-agent1, git-connected to itsforren/alphahub
- Production URL: https://alphahub-v2.vercel.app
- Custom domain: https://hub.alphaagent.io (HTTPS active, deep links work)
- DNS: CNAME hub -> cname.vercel-dns.com at Hostinger
- Supabase Auth: site_url = https://hub.alphaagent.io, redirects configured
- All 10 pages verified by user (login, dashboard, clients, client detail, billing, command, sales, analytics, chat, settings)
- Supabase Pro upgrade completed -- 6 remaining functions and wav file now unblocked

### Phase 6 Key Facts
- 06-01 COMPLETE: 8 hardcoded URLs fixed across 6 edge functions (send-password-reset, crm-oauth-callback, chat-notification, create-user-account, morning-review-job, ads-manager-slack-test)
- PUBLIC_APP_URL secret set to https://hub.alphaagent.io on new project
- All 6 updated functions redeployed and verified reachable (HTTP 400/500, not 404)
- Secrets count: 41 configured (40 prior + PUBLIC_APP_URL)
- No old-domain URLs remain in modified edge functions (sierra@alphaagent.io is email, not URL)
