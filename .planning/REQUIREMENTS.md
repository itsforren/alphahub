# Requirements: AlphaHub Migration

**Defined:** 2026-02-26
**Core Value:** All existing functionality continues working after migration — no lost data, no duplicate billing, no broken client workflows.

## v1 Requirements

### Preparation

- [x] **PREP-01**: Clone alpha-agent-flow repo locally and audit full codebase structure
- [x] **PREP-02**: Create detailed Lovable migration prompt to extract DB dump commands, schema details, edge function configs, and migration-specific instructions from Lovable
- [x] **PREP-03**: Create new Supabase project on supabase.com (user-owned)
- [x] **PREP-04**: Audit all edge functions for `Deno.env.get()` calls to build complete secrets inventory (~40+ secrets)
- [x] **PREP-05**: Document all external webhook URLs that need updating (Stripe x2, GHL, lead sources, Fathom, etc.)

### Database Migration

- [x] **DB-01**: Export full database schema from Lovable Supabase (94 tables, RLS policies, functions, triggers, extensions)
- [x] **DB-02**: Apply schema to new Supabase project with all RLS policies intact
- [x] **DB-03**: Verify RLS policies are present and correct post-migration (critical security — CVE-2025-48757 risk)
- [x] **DB-04**: Export and import all production data with zero data loss
- [x] **DB-05**: Verify row counts match between old and new databases for every table
- [x] **DB-06**: Recreate all database extensions that don't survive pg_dump
- [x] **DB-07**: Recreate all database triggers that reference specific schemas
- [x] **DB-08**: Migrate all 29 public functions and verify they exist on target

### Auth Migration

- [x] **AUTH-01**: Export auth.users table with password hashes from old Supabase project
- [x] **AUTH-02**: Import auth users into new project — all users can log in without password reset
- [x] **AUTH-03**: Preserve TOTP MFA factors on new Supabase project
- [x] **AUTH-04**: Verify JWT auth works (user login confirmed with existing credentials)

### Edge Functions & Backend

- [x] **EDGE-01**: Deploy all 106 edge functions to new Supabase project (100/106 deployed; 6 need Pro upgrade)
- [x] **EDGE-02**: Configure all 33 secrets/environment variables on new project (Plaid removed, GHL optional URLs deferred)
- [x] **EDGE-03**: Recreate all 6 pg_cron scheduled jobs (check-automation-timeout, auto-recharge-run, sync-all-google-ads, cleanup-archived-clients, check-lead-router-health, plaid-daily-refresh)
- [x] **EDGE-04**: Verify edge function JWT verification config (all 106 functions verify_jwt=false, auth handled internally)
- [x] **EDGE-05**: Edge function CORS allows all origins (`Access-Control-Allow-Origin: *`)

### Stripe Migration

- [ ] **STRIPE-01**: Update management account webhook endpoints to point at new Supabase edge function URLs
- [ ] **STRIPE-02**: Update ad spend account webhook endpoints to point at new Supabase edge function URLs
- [ ] **STRIPE-03**: Generate and configure new webhook signing secrets for both accounts
- [ ] **STRIPE-04**: Verify all webhook event types are registered on new endpoints
- [ ] **STRIPE-05**: End-to-end test: create test invoice, verify it flows through new backend correctly
- [ ] **STRIPE-06**: End-to-end test: verify auto-recharge wallet logic fires correctly on new backend
- [ ] **STRIPE-07**: Verify all 70+ active subscriptions are producing events to new endpoints

### Storage Migration

- [x] **STORE-01**: Create 3 storage buckets on new project (media, agreements, chat-attachments) with correct public/private policies
- [x] **STORE-02**: Migrate file objects from old buckets to new buckets (204/317 migrated; agreements bucket pending old service key)
- [x] **STORE-03**: Verify storage access policies match old project (public read for media/chat-attachments, private for agreements)

### Realtime

- [x] **RT-01**: Enable Realtime publications for all 11 tables
- [ ] **RT-02**: Verify Realtime components reconnect and receive updates (requires frontend deployment, Phase 5/6)

### Frontend

- [ ] **FE-01**: Export codebase from alpha-agent-flow repo
- [ ] **FE-02**: Remove Lovable-specific code (lovable-tagger dev dependency)
- [ ] **FE-03**: Update Supabase client config to point at new project (URL + anon key)
- [ ] **FE-04**: Deploy frontend to independent hosting (Netlify or similar)
- [ ] **FE-05**: Verify all pages load and function correctly on new deployment

### Cutover & Verification

- [ ] **CUT-01**: Plan cutover sequence with checklist (maintenance window)
- [ ] **CUT-02**: Execute delta data sync (capture any data written between initial migration and cutover)
- [ ] **CUT-03**: Switch DNS for alphaagent.io to new frontend deployment
- [ ] **CUT-04**: Disable old Stripe webhook endpoints
- [ ] **CUT-05**: Verify client management works (list, search, detail views, operational metrics)
- [ ] **CUT-06**: Verify billing works (invoicing, recurring charges, outstanding credits)
- [ ] **CUT-07**: Verify ad spend wallets (balances, burn rates, auto-recharge, low balance alerts)
- [ ] **CUT-08**: Verify campaign health monitoring (health scores, safe mode, pace drift)
- [ ] **CUT-09**: Verify lead pipeline (funnel metrics, booked calls, CPL)
- [ ] **CUT-10**: Verify communications (chat, tickets, SLA tracking)
- [ ] **CUT-11**: Verify financial projections and alerts
- [ ] **CUT-12**: Update AlphaHub MCP server to point at new Supabase instance

## v2 Requirements

### Post-Migration Optimization

- **OPT-01**: Performance audit and optimization of database queries
- **OPT-02**: Add monitoring/alerting for new infrastructure
- **OPT-03**: Set up automated backups on new Supabase project
- **OPT-04**: Remove Lovable account dependency entirely
- **OPT-05**: CI/CD pipeline for frontend deployments

## Out of Scope

| Feature | Reason |
|---------|--------|
| New features or redesigns | This is a 1:1 migration, optimize after |
| Mobile app | Web only, same as current |
| Changing Stripe account structure | Keep dual-account as-is |
| Self-hosted Supabase | Using supabase.com managed |
| Google OAuth | Does not exist in current app (research confirmed) |
| Changing the frontend framework | Keep React + Vite + Tailwind + shadcn/ui |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PREP-01 | Phase 1 | Complete |
| PREP-02 | Phase 1 | Complete |
| PREP-03 | Phase 1 | Complete |
| PREP-04 | Phase 1 | Complete |
| PREP-05 | Phase 1 | Complete |
| DB-01 | Phase 2 | Complete |
| DB-02 | Phase 2 | Complete |
| DB-03 | Phase 2 | Complete |
| DB-04 | Phase 2 | Complete |
| DB-05 | Phase 2 | Complete |
| DB-06 | Phase 2 | Complete |
| DB-07 | Phase 2 | Complete |
| DB-08 | Phase 2 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| EDGE-01 | Phase 3 | Complete |
| EDGE-02 | Phase 3 | Complete |
| EDGE-03 | Phase 3 | Complete |
| EDGE-04 | Phase 3 | Complete |
| EDGE-05 | Phase 3 | Complete |
| STRIPE-01 | Phase 4 | Pending |
| STRIPE-02 | Phase 4 | Pending |
| STRIPE-03 | Phase 4 | Pending |
| STRIPE-04 | Phase 4 | Pending |
| STRIPE-05 | Phase 4 | Pending |
| STRIPE-06 | Phase 4 | Pending |
| STRIPE-07 | Phase 4 | Pending |
| STORE-01 | Phase 3 | Complete |
| STORE-02 | Phase 3 | Complete |
| STORE-03 | Phase 3 | Complete |
| RT-01 | Phase 3 | Complete |
| RT-02 | Phase 3 | Pending |
| FE-01 | Phase 5 | Pending |
| FE-02 | Phase 5 | Pending |
| FE-03 | Phase 5 | Pending |
| FE-04 | Phase 5 | Pending |
| FE-05 | Phase 5 | Pending |
| CUT-01 | Phase 6 | Pending |
| CUT-02 | Phase 6 | Pending |
| CUT-03 | Phase 6 | Pending |
| CUT-04 | Phase 6 | Pending |
| CUT-05 | Phase 6 | Pending |
| CUT-06 | Phase 6 | Pending |
| CUT-07 | Phase 6 | Pending |
| CUT-08 | Phase 6 | Pending |
| CUT-09 | Phase 6 | Pending |
| CUT-10 | Phase 6 | Pending |
| CUT-11 | Phase 6 | Pending |
| CUT-12 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 51 total
- Mapped to phases: 51
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-27 — Phase 3 requirements (EDGE-01 through EDGE-05, STORE-01 through STORE-03, RT-01) marked Complete*
