# Project Research Summary

**Project:** AlphaHub — Lovable Cloud to Self-Managed Supabase Migration
**Domain:** Production SaaS platform migration (live billing, multi-tenant, Lovable-hosted to owned infrastructure)
**Researched:** 2026-02-26
**Confidence:** HIGH (primary sources: official Supabase/Stripe/Lovable docs + direct codebase analysis)

## Executive Summary

AlphaHub is a production multi-tenant insurance agent management platform currently hosted on Lovable Cloud. The mission is a 1:1 infrastructure migration — same React+Vite+TypeScript codebase, same Supabase-compatible API surface, no feature changes — from Lovable's managed environment to a self-owned Supabase project with frontend deployed on Netlify. The codebase is large (111 tables, 90+ edge functions, 14 RPC functions, ~60 frontend routes) and financially sensitive ($100K+/cycle across dual Stripe accounts with 70+ active subscriptions). This is not a rebuild; it is an ownership transfer executed with surgical precision.

The recommended approach is a 6-phase CLI-driven migration using the existing migration files in the repo. Phase order is strictly dependency-driven: database schema and data must land first because everything else depends on it, followed by auth (gates all protected features), storage, edge functions with secrets, external service re-pointing (Stripe and GHL webhooks), and finally the frontend with DNS cutover. The migration executes with a planned 30-60 minute maintenance window — zero-downtime migration is explicitly out of scope as it adds disproportionate complexity for a 15-client platform.

The highest-risk items are the Stripe webhook transition (two accounts, 243+ event types, must be updated atomically before cutover) and RLS policy integrity after pg_dump/restore (CVE-2025-48757 demonstrated that missing RLS on Lovable-generated apps exposes billing data publicly). Both are entirely preventable with the pre-cutover verification checklist established in research. The migration should be scheduled during a low-activity window, with the auto-recharge-run cron (6 AM UTC daily) as the primary timing constraint to avoid.

## Key Findings

### Recommended Stack

This is a migration tooling problem, not a greenfield stack decision. The existing React+Vite+TypeScript+Tailwind+shadcn/ui+Supabase+Stripe stack is preserved unchanged. The migration uses official CLI tooling only — no third-party migration services, no automated Lovable migrators, no framework changes.

**Core migration tools:**
- **Supabase CLI v2.76.15+** — schema dump, data export, edge function deploy, secrets management. The only supported path for project-to-project migration.
- **psql 15+** — database restore using `--single-transaction --variable ON_ERROR_STOP=1` with `session_replication_role = replica` to prevent double-encryption.
- **Docker Desktop** — required by Supabase CLI for pg_dump operations.
- **Netlify** — recommended frontend hosting over Vercel (native Supabase integration auto-configures env vars, no Next.js bias) or Cloudflare Pages.
- **Stripe CLI** — webhook testing before cutover.
- **Node.js 20+** — build tooling and custom storage migration script (Supabase does not include file objects in pg_dump).

**Critical version note:** Use Supavisor session mode (port 5432) for dump/restore — NOT transaction mode (port 6543). Wrong port breaks pg_dump with large schemas.

### Expected Features

AlphaHub's features fall into three migration tiers. Research is derived from direct source code analysis of the live codebase (`/Users/forren/workspace/connect-proxis-alphahub/alpha-agent-flow/`), so confidence is HIGH.

**Table stakes (platform cannot function without these):**
- **TS-1: Database schema + data** (111 tables, all RLS, 14 RPCs, triggers, enums) — everything depends on this; migrate first
- **TS-2: Auth** (email/password + TOTP MFA; 5 roles: admin/member/client/referrer/guest) — note: NO Google OAuth exists in the codebase despite project context; email/password only
- **TS-3: Client management core** — CRUD, search, tabbed detail views; works automatically once DB and auth are migrated
- **TS-4: Ad spend wallet system** — computed balances, auto-recharge, safe mode; most financially sensitive feature
- **TS-5: Billing records and collections** — 70+ active recurring subscriptions, $100K+/cycle, auto-billing chain
- **TS-6: Stripe integration (dual accounts)** — management fees + ad spend; 6 secrets, 243+ webhook event types
- **TS-7: Edge functions (critical subset)** — ~15 billing/wallet/webhook functions; 90+ total must deploy
- **TS-8: Storage buckets** — 3 buckets: `media` (public), `agreements` (private), `chat-attachments` (public)
- **TS-9: Realtime subscriptions** — 8 components; automatic with new project URL, no code changes

**Important features (migrate for full functionality):**
- **IMP-1: MCP Proxy** (2,644-line god-mode edge function, 52 tools) — must update `alphahub-mcp` env and OpenClaw/MoltBot endpoint
- **IMP-2: Google Ads integration** — 9 edge functions, campaign data already in DB
- **IMP-3: Chat and communications** — realtime chat, support tickets, SLA tracking
- **IMP-4: Lead pipeline** — external webhook URLs at lead sources must be updated
- **IMP-5: Onboarding system** — GHL OAuth tokens must transfer; redirect URIs must update
- **IMP-6: System alerts and dashboard** — reads from DB; works once TS-1 and TS-7 are live
- **IMP-7: GHL Bridge** — OAuth redirect URIs need updating in GHL Developer Portal

**Defer (works automatically once DB + edge functions live):**
- TV dashboards, sales pipeline, courses/learning, referral system, Plaid banking, agreement signing, public marketing pages, Webflow CMS, Meta ads, Slack, expense tracking — 11 features, all read from migrated DB, most require no additional migration work

**Anti-features (do not do during migration):**
- New features or redesigns
- Zero-downtime migration (adds disproportionate complexity)
- Changing Stripe account structure (deeply embedded dual-account)
- Replaying 135 migrations (dump current schema state instead)

### Architecture Approach

The migration preserves the current architecture exactly. The target state is architecturally identical to the current state — the only difference is ownership. The pattern is a 6-layer migration where each layer unlocks the next: database (Layer 1) gates everything, auth (part of Layer 1) gates all protected features, edge functions (Layer 2) enable all automation and webhooks, storage (Layer 3, parallel with Layer 2) restores file access, external service re-pointing (Layer 4) restores inbound webhooks, and finally the frontend (Layer 5) with DNS cutover completes the transition.

**Major components:**

1. **Database (Supabase Postgres)** — 111 tables, 87 function/trigger definitions, 14 RPC functions. Migrate via `supabase db dump` + `psql` restore. Apply schema first (migration files or pg_dump), data second, auth schema third (separately via `--schema auth`).
2. **Edge Functions (Deno runtime)** — 90+ functions, ~29K lines, ~40 unique secrets. Deploy via `supabase functions deploy` after updating `config.toml` project_id. Critical: preserve all 73 `verify_jwt = false` entries and 2+ cron schedules.
3. **Frontend SPA (React+Vite)** — single env var change (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) reconnects to new project. Build-time substitution means rebuild is mandatory before deploy.
4. **Stripe (dual accounts)** — webhook endpoints only change; customer IDs, subscriptions, payment methods all stay in Stripe unchanged.
5. **External inbound services** — Stripe (2x), GHL, lead sources, Fathom, MCP consumers all need updated URLs. Outbound services (Google Ads, Plaid, Twilio, Slack, Resend, Webflow) only need secrets transferred.

**Key data flows to preserve:**
- Billing flow: `auto-recharge-run` cron -> Stripe -> `stripe-billing-webhook` -> `billing_records` + wallet deposit -> next month's record + referral commission
- Lead flow: External source -> `lead-webhook` -> DB -> `inject-lead-to-ghl` -> GHL CRM -> `lead-status-webhook` -> status update
- Onboarding: `run-full-onboarding` (2,037 lines) -> GHL subaccount + Twilio phone + Webflow CMS + Google Ads campaign

### Critical Pitfalls

Research identified 20 pitfalls (6 critical, 6 high, 5 moderate, 3 minor). The top 6:

1. **Stripe webhook endpoints not updated before cutover** — Both Stripe accounts (management + ad spend) have webhooks pointing to the OLD Supabase project URL. Payment events (invoice.paid, invoice.payment_failed) that fire during the gap mean billing_records stay "pending" permanently and wallet deposits are never created, breaking the auto-billing chain. Prevention: register new endpoints in BOTH Stripe accounts before cutover, use Stripe's 24-hour signing secret overlap.

2. **RLS policies missing after pg_dump/restore** — Tables may restore with policy definitions but RLS not actually enabled, making the anon key a skeleton key for all client data (billing records, wallet balances, Stripe customer mappings). This is not theoretical — CVE-2025-48757 exposed 170+ Lovable apps this way. Prevention: verify `pg_tables.rowsecurity = true` for every public table post-restore, test with anon key.

3. **Edge function secrets not set in new project** — ~40 secrets exist in the Lovable-managed secret store; none are exported by pg_dump or in the codebase. Stripe billing, MCP proxy, GHL, Google Ads, Plaid all fail silently if secrets are missing. Prevention: audit all `Deno.env.get()` calls before migration, document every secret name, set all in new project vault.

4. **Auth users lose sessions / OAuth callback mismatch** — New Supabase project auto-generates a different JWT secret, invalidating all existing tokens. Additionally, Google OAuth callback URL must be updated in Google Cloud Console. Prevention: copy JWT secret from old to new project before migrating auth data; update OAuth redirect URIs before cutover. (Note: FEATURES.md analysis shows no Google OAuth in codebase — verify this before spending time on OAuth reconfiguration.)

5. **Wallet balances incorrect post-migration** — Wallet balances are computed (`Total Deposits - (Tracked Spend x Performance %)`); any missing rows in wallet_transactions or ad_spend_daily silently corrupt balances. The auto-recharge-run cron at 6 AM UTC creates a timing risk if pg_dump runs during a charge. Prevention: schedule dump outside 6 AM UTC window, freeze writes before dump, run reconciliation query post-restore.

6. **Dual Stripe account key confusion** — 6 Stripe secrets with similar names (management vs. ad_spend suffix). Swapping keys means charges hit the wrong account. Prevention: explicit per-account checklist, test each account independently, verify `get_stripe_balance` returns data for both after cutover.

## Implications for Roadmap

Based on combined research, the migration maps cleanly to 6 phases. Phase order is non-negotiable — it follows hard dependencies. No phase can be reordered without breaking the next.

### Phase 1: Database Foundation
**Rationale:** TS-1 is the root dependency for all 26 features. Nothing can be tested until the database is live. This must be done and verified before any other work begins.
**Delivers:** New Supabase project with full schema, all data, all RLS policies verified, auth users migrated with password hashes preserved, extensions re-enabled, Realtime publications recreated.
**Implements:** TS-1 (Database), TS-2 (Auth users)
**Avoids:** Pitfall 2 (RLS missing), Pitfall 4 (wallet balance corruption), Pitfall 15 (double-encryption), Pitfall 16 (FK violations)
**Research flag:** STANDARD — well-documented Supabase migration pattern. Deep research not needed, but the pre-restore SQL verification checklist from PITFALLS.md must be executed step-by-step.

### Phase 2: Edge Functions and Secrets
**Rationale:** Edge functions enable all automation, webhooks, and server-side logic. Without them, the frontend can display data but nothing works. Must come before Stripe webhook registration because the new webhook URL depends on new edge function URLs.
**Delivers:** All 90+ edge functions deployed to new project, all ~40 secrets configured, cron schedules verified active, config.toml updated for new project ref, `verify_jwt = false` preserved on all 73 applicable functions.
**Implements:** TS-7 (Edge Functions), IMP-1 (MCP Proxy)
**Avoids:** Pitfall 5 (secrets not migrated), Pitfall 7 (cron schedules lost), Pitfall 10 (config.toml references old project), Pitfall 11 (extensions not re-enabled)
**Research flag:** STANDARD — Supabase CLI deployment is well-documented. Key work is the secrets inventory audit (grep `Deno.env.get` across 90+ functions) and secrets entry, not technical research.

### Phase 3: Storage Migration
**Rationale:** Can run in parallel with Phase 2. Storage objects (profile images, agreement PDFs, chat attachments) are NOT in pg_dump. Without this, broken images and download errors appear across the platform.
**Delivers:** All 3 storage buckets recreated (`media`, `agreements`, `chat-attachments`) with correct public/private policies, all file objects transferred, object counts verified.
**Implements:** TS-8 (Storage)
**Avoids:** Pitfall 9 (storage objects left behind)
**Research flag:** NEEDS VALIDATION — Supabase's Node.js storage migration script is referenced in docs but not fully documented. Verify the script approach works with `supabase@beta` before relying on it. May need to write a custom transfer script using the Supabase JS client.

### Phase 4: Stripe and GHL Re-pointing
**Rationale:** This is the highest-risk phase. Stripe webhooks drive the auto-billing chain and wallet system. Must be done as close to cutover as possible to minimize the window where payments succeed in Stripe but miss the new webhook. GHL OAuth redirect URIs must also update before the new project goes live.
**Delivers:** Both Stripe accounts' webhook endpoints pointing to new Supabase edge function URLs, new signing secrets configured, GHL OAuth redirect URIs updated, all webhook delivery verified in Stripe dashboards.
**Implements:** TS-6 (Stripe), IMP-7 (GHL Bridge)
**Avoids:** Pitfall 1 (Stripe webhooks pointing to dead URL), Pitfall 6 (dual account confusion)
**Research flag:** STANDARD — Stripe webhook management is well-documented. The only nuance is the 24-hour signing secret overlap (Stripe supports multiple active secrets during transition).

### Phase 5: Validation and Cutover Preparation
**Rationale:** Pre-flight check before the irreversible DNS cutover. Tests every critical path against the new backend before redirecting any real traffic. Includes the delta data sync to capture writes that happened since Phase 1.
**Delivers:** Verified auth flow, verified Stripe billing end-to-end, verified MCP proxy (all 52 tools), verified realtime subscriptions, verified storage file loading, staging frontend tested against new backend, delta data sync complete.
**Implements:** TS-9 (Realtime verification), TS-2 (auth verification), TS-5+TS-4 (billing+wallet E2E)
**Avoids:** Pitfall 3 (auth session invalidation), Pitfall 8 (Realtime publications missing), Pitfall 12 (frontend deployed with old env vars)
**Research flag:** STANDARD — this is structured validation, not research.

### Phase 6: Frontend Deploy and DNS Cutover
**Rationale:** Last step. Frontend is rebuilt with new env vars, deployed to Netlify, and DNS is cut over in a single coordinated maintenance window. MCP configurations updated post-cutover.
**Delivers:** Frontend live at `conscious.sysconscious.com` pointing to new Supabase project, old Lovable deployment decommissioned, MCP server updated, OpenClaw/MoltBot endpoint updated.
**Implements:** TS-3 (Client Management), all DEF-* features (auto-functional once DB+edge functions live), IMP-1 (MCP updated)
**Avoids:** Pitfall 12 (old env vars baked in), Pitfall 14 (MCP not updated), Pitfall 20 (DNS propagation timing — lower TTL 48h before)
**Research flag:** STANDARD — Netlify Vite deployment is zero-config. DNS cutover is a standard operation.

### Phase Ordering Rationale

- **Database before everything** because all 26 features have TS-1 as their root dependency. You cannot test or verify anything until the database is live.
- **Edge functions before Stripe** because Stripe webhook registration requires the new edge function URLs to exist first.
- **Storage parallel with edge functions** because storage migration is independent and can run concurrently to save time.
- **Stripe re-pointing as close to cutover as possible** to minimize the window of duplicate webhook delivery (old + new endpoints both active) and to avoid confusion from events hitting both.
- **Validation before frontend deployment** because DNS cutover is effectively irreversible on the timescale of a maintenance window. Validate everything before flipping the switch.
- **MCP update last** because it is operational tooling, not client-facing. Clients must come first.

### Research Flags

Phases likely needing deeper work during execution:
- **Phase 3 (Storage):** The Supabase storage migration script is in beta (`supabase@beta`). Verify the `seed buckets` command is available or write a custom Node.js transfer script before this phase begins. Budget 1-2 hours for script development if needed.
- **Phase 4 (Stripe):** Test the signing secret rollover mechanism manually in a test Stripe account before attempting on production. The 24-hour overlap window is documented but testing is advisable given the financial stakes.

Phases with standard, well-documented patterns (no deep research needed):
- **Phase 1 (Database):** Supabase CLI dump/restore is the official migration path with complete documentation.
- **Phase 2 (Edge Functions):** `supabase functions deploy` is a single command; complexity is operational (secrets inventory), not technical.
- **Phase 5 (Validation):** Structured checklist execution, not research.
- **Phase 6 (Frontend/DNS):** Netlify Vite is zero-config; DNS cutover is standard operations.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All migration tools verified against official Supabase, Netlify, and Stripe docs. Supabase CLI v2.76.15 confirmed. Storage migration script is the one LOW-confidence item. |
| Features | HIGH | Derived from direct source code analysis of the live codebase. 111 tables, 90+ functions, routing structure all verified. Key discrepancy: no Google OAuth found in codebase despite project context claiming it exists. |
| Architecture | HIGH | Both codebase inspection and official Supabase migration docs align. Migration layer order matches dependency graph. Cutover timing (30-60 min window) is validated approach. |
| Pitfalls | HIGH | 20 pitfalls identified. 15 verified against official docs or CVEs. 5 based on architecture analysis and general migration principles. Pre-cutover checklist in PITFALLS.md is comprehensive. |

**Overall confidence:** HIGH

### Gaps to Address

- **Google OAuth discrepancy:** STACK.md and ARCHITECTURE.md reference Google OAuth configuration, but FEATURES.md direct codebase analysis found zero `signInWithOAuth` calls. Confirm before migration whether Google OAuth is active in the Lovable-managed project or was removed from the codebase. If active, the auth migration steps for OAuth callback URL updates apply; if not, that work is unnecessary.

- **Storage object volume:** Research notes AlphaHub "likely" has minimal storage (client management platform, not file-heavy), but this needs verification by running `SELECT bucket_id, count(*) FROM storage.objects GROUP BY bucket_id` on the old project before migration. If the `media` bucket has thousands of files, the storage migration script must be tested and timed accordingly.

- **Stripe secret values:** The actual secret values for all ~40 edge function secrets are not in the codebase. Most are in `~/.zprofile` (per global context) but the complete list needs verification by auditing all `Deno.env.get()` calls across 90+ functions before migration day. Do this during Phase 2 prep, not on cutover day.

- **pg_cron jobs vs config.toml crons:** Research identified 2 cron schedules in `config.toml` but mentions additional possible `pg_cron` jobs (morning-review-job, billing-collections-run, aggregate-client-kpis). Run `SELECT * FROM cron.job` on the OLD project before migration to get the authoritative list. These must all be verified active post-migration.

- **Delta data sync window:** The recommended approach uses a freeze + delta sync at cutover time. The delta sync query (finding rows modified since the initial pg_dump timestamp) needs to be designed for AlphaHub's schema. Financial tables (billing_records, wallet_transactions, ad_spend_daily) should use `updated_at` or `created_at` filtering. Draft this query before migration day.

## Sources

### Primary (HIGH confidence)
- **Supabase CLI docs** — db dump, db pull, backup/restore, edge functions deploy, secrets, pg_cron, realtime
- **Stripe docs** — webhook endpoints, signature verification, subscription webhooks
- **Direct codebase analysis** — `/Users/forren/workspace/connect-proxis-alphahub/alpha-agent-flow/` (111 tables, 90+ functions, routing, auth implementation confirmed)
- **System status document** — `/Users/forren/workspace/alpha-hub-stripe-billing-status.txt` (46K comprehensive status)
- **Lovable docs** — GitHub integration, self-hosting guide

### Secondary (MEDIUM confidence)
- Vercel vs. Netlify vs. Cloudflare Pages 2025-2026 comparison (hosting recommendation)
- Lovable self-hosting community guides
- Stripe migration checklist (community)

### Tertiary (LOW confidence, needs validation)
- Supabase `seed buckets` command — referenced in docs but beta status unclear
- Third-party Lovable migration tools — researched but explicitly NOT recommended for production billing infrastructure

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
