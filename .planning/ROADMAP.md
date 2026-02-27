# Roadmap: AlphaHub Migration

## Overview

This roadmap migrates AlphaHub from Lovable Cloud to a self-managed Supabase project with independent frontend hosting. The 6 phases follow strict dependency ordering: preparation and audit first, then database and auth (the root dependency for everything), then backend infrastructure (edge functions, storage, realtime in parallel), then Stripe webhook re-pointing (highest-risk phase, depends on edge functions), then frontend deployment, and finally the coordinated cutover with full feature verification. Every phase produces a verifiable outcome against the live new backend before proceeding.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Preparation & Audit** - Clone source, create new Supabase project, inventory all secrets and external integrations
- [ ] **Phase 2: Database & Auth** - Migrate full schema, data, RLS policies, auth users with password hashes preserved
- [ ] **Phase 3: Backend Infrastructure** - Deploy edge functions with secrets, migrate storage buckets, enable Realtime
- [ ] **Phase 4: Stripe Migration** - Re-point both Stripe accounts' webhooks and verify billing flow end-to-end
- [ ] **Phase 5: Frontend Deployment** - Export, clean, reconfigure, and deploy the frontend to independent hosting
- [ ] **Phase 6: Cutover & Verification** - Execute maintenance window: delta sync, DNS switch, verify all features, update MCP

## Phase Details

### Phase 1: Preparation & Audit
**Goal**: All source materials are local, the new Supabase project exists, and every secret, webhook URL, and external dependency is documented -- so migration can execute without discovery delays
**Depends on**: Nothing (first phase)
**Requirements**: PREP-01, PREP-02, PREP-03, PREP-04, PREP-05
**Success Criteria** (what must be TRUE):
  1. The alpha-agent-flow repo is cloned locally with full codebase structure audited and documented
  2. A new Supabase project exists on supabase.com under the user's account with project ref and credentials captured
  3. A complete secrets inventory exists listing every `Deno.env.get()` call across all 90+ edge functions with the secret name, which function uses it, and where the value lives
  4. A complete external webhook inventory exists listing every URL that must change (Stripe x2, GHL, lead sources, Fathom, MCP consumers) with old and new URL patterns
  5. A Lovable migration prompt has been created and executed to extract DB dump commands, schema details, and migration-specific instructions
**Plans**: 3 plans in 2 waves

Plans:
- [x] 01-01-PLAN.md -- Clone repo and audit codebase structure (Wave 1, autonomous)
- [x] 01-02-PLAN.md -- Create Supabase project and build secrets/webhook inventories (Wave 2, has checkpoint)
- [x] 01-03-PLAN.md -- Execute Lovable AI extraction prompts and capture outputs (Wave 2, has checkpoint)

### Phase 2: Database & Auth
**Goal**: The new Supabase project contains all 94 tables with data, all RLS policies are verified active, all triggers and functions execute correctly, and every user can log in with their existing credentials
**Depends on**: Phase 1
**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05, DB-06, DB-07, DB-08, AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. All 94 tables exist in the new project with row counts matching the source database for every table
  2. RLS is enabled on every public table (verified via `pg_tables.rowsecurity = true`) and anon key cannot access protected data
  3. All 28 public functions exist and 48 triggers are present
  4. Every existing user can log in with their original email/password without a forced password reset
  5. TOTP MFA factors are preserved (if any users had MFA enabled)
**Plans**: 3 plans in 3 waves

Plans:
- [ ] 02-01-PLAN.md -- Export source database (5 dump files) and restore schema to target (Wave 1, has checkpoint)
- [ ] 02-02-PLAN.md -- Import all data (auth, public, migration history) and run comprehensive verification (Wave 2, autonomous)
- [ ] 02-03-PLAN.md -- Auth login test, RLS functional test, and user manual verification (Wave 3, has checkpoint)

### Phase 3: Backend Infrastructure
**Goal**: All server-side automation is operational on the new project -- edge functions respond, cron jobs fire on schedule, storage files are accessible, and Realtime subscriptions deliver updates
**Depends on**: Phase 2
**Requirements**: EDGE-01, EDGE-02, EDGE-03, EDGE-04, EDGE-05, STORE-01, STORE-02, STORE-03, RT-01, RT-02
**Success Criteria** (what must be TRUE):
  1. All 90+ edge functions are deployed and callable on the new project, with JWT verification config preserved (73 functions with `verify_jwt = false`)
  2. All ~40+ secrets are configured in the new project vault and a spot-check of 5 critical functions (billing, MCP proxy, GHL bridge, Google Ads, Stripe webhook handlers) confirms they can access their required secrets
  3. All cron jobs (auto-recharge-run, morning-review, billing-collections, prospect-inactivity-check, hourly-approval-reminder) are active and firing on schedule
  4. All 3 storage buckets exist with correct access policies and all file objects are accessible (profile images render, agreement PDFs download, chat attachments load)
  5. Realtime publications are enabled for all required tables and at least one Realtime component (e.g., chat) receives live updates when data changes
**Plans**: TBD

Plans:
- [ ] 03-01: Deploy edge functions with secrets and verify JWT config
- [ ] 03-02: Recreate cron jobs and verify schedules
- [ ] 03-03: Migrate storage buckets and file objects
- [ ] 03-04: Enable Realtime publications and verify subscriptions

### Phase 4: Stripe Migration
**Goal**: Both Stripe accounts (management fees and ad spend) have their webhook endpoints pointed at the new Supabase edge function URLs, signing secrets are configured, and billing events flow through the new backend correctly
**Depends on**: Phase 3
**Requirements**: STRIPE-01, STRIPE-02, STRIPE-03, STRIPE-04, STRIPE-05, STRIPE-06, STRIPE-07
**Success Criteria** (what must be TRUE):
  1. Both Stripe accounts (management and ad spend) have webhook endpoints registered pointing to the new Supabase project edge function URLs
  2. New webhook signing secrets are generated and configured in the new project vault for both accounts
  3. A test invoice created in the management account flows through the new backend and creates a billing record in the new database
  4. The auto-recharge wallet logic fires correctly when triggered -- a wallet deposit appears in the new database
  5. Webhook delivery logs in both Stripe dashboards show successful delivery (200 responses) for all registered event types
**Plans**: TBD

Plans:
- [ ] 04-01: Register new webhook endpoints and configure signing secrets
- [ ] 04-02: End-to-end billing and wallet tests with verification

### Phase 5: Frontend Deployment
**Goal**: The AlphaHub frontend is deployed independently (not on Lovable), connected to the new Supabase backend, and all pages load correctly
**Depends on**: Phase 3 (can run in parallel with Phase 4)
**Requirements**: FE-01, FE-02, FE-03, FE-04, FE-05
**Success Criteria** (what must be TRUE):
  1. The frontend codebase is cleaned of Lovable-specific dependencies and builds without errors
  2. The Supabase client config points to the new project (URL + anon key) and API calls succeed
  3. The frontend is deployed to Netlify (or equivalent) with a working preview URL
  4. All major pages load correctly on the new deployment: login, dashboard, client list, client detail, billing, wallets, campaigns, leads, communications
  5. CORS is configured correctly -- no cross-origin errors in browser console when interacting with edge functions
**Plans**: TBD

Plans:
- [ ] 05-01: Export, clean, and reconfigure frontend codebase
- [ ] 05-02: Deploy to Netlify and verify all pages

### Phase 6: Cutover & Verification
**Goal**: Production traffic is serving from the new infrastructure, all features are verified working, and the old Lovable deployment is decommissioned
**Depends on**: Phases 4 and 5
**Requirements**: CUT-01, CUT-02, CUT-03, CUT-04, CUT-05, CUT-06, CUT-07, CUT-08, CUT-09, CUT-10, CUT-11, CUT-12
**Success Criteria** (what must be TRUE):
  1. Delta data sync is complete -- any data written between initial migration and cutover is captured in the new database with zero loss
  2. DNS for alphaagent.io resolves to the new frontend deployment and the site loads
  3. Old Stripe webhook endpoints are disabled and all billing events route exclusively through the new backend
  4. All 7 core features verified working: client management (list/search/detail), billing (invoicing/charges/credits), ad spend wallets (balances/burn rates/auto-recharge/alerts), campaign health (scores/safe mode/pace drift), lead pipeline (funnel/booked calls/CPL), communications (chat/tickets/SLA), and financial projections/alerts
  5. AlphaHub MCP server is updated to point at the new Supabase instance and all 52 tools respond correctly
**Plans**: TBD

Plans:
- [ ] 06-01: Plan and execute cutover sequence (maintenance window, delta sync, DNS switch)
- [ ] 06-02: Verify all features and disable old infrastructure
- [ ] 06-03: Update MCP server and external integrations

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 (parallel with 5) -> 5 -> 6

Note: Phases 4 and 5 can execute in parallel since frontend deployment depends on Phase 3 (not Phase 4). Both must complete before Phase 6.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Preparation & Audit | 3/3 | Complete ✓ | 2026-02-27 |
| 2. Database & Auth | 0/3 | Planned | - |
| 3. Backend Infrastructure | 0/4 | Not started | - |
| 4. Stripe Migration | 0/2 | Not started | - |
| 5. Frontend Deployment | 0/2 | Not started | - |
| 6. Cutover & Verification | 0/3 | Not started | - |

---
*Roadmap created: 2026-02-26*
*Last updated: 2026-02-27*
