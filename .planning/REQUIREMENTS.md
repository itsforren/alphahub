# Requirements: AlphaHub Migration

**Defined:** 2026-02-26
**Core Value:** All existing functionality continues working after migration — no lost data, no duplicate billing, no broken client workflows.

## v1 Requirements

### Preparation

- [ ] **PREP-01**: Clone alpha-agent-flow repo locally and audit full codebase structure
- [ ] **PREP-02**: Create detailed Lovable migration prompt to extract DB dump commands, schema details, edge function configs, and migration-specific instructions from Lovable
- [ ] **PREP-03**: Create new Supabase project on supabase.com (user-owned)
- [ ] **PREP-04**: Audit all edge functions for `Deno.env.get()` calls to build complete secrets inventory (~40+ secrets)
- [ ] **PREP-05**: Document all external webhook URLs that need updating (Stripe x2, GHL, lead sources, Fathom, etc.)

### Database Migration

- [ ] **DB-01**: Export full database schema from Lovable Supabase (111 tables, RLS policies, functions, triggers, extensions)
- [ ] **DB-02**: Apply schema to new Supabase project with all RLS policies intact
- [ ] **DB-03**: Verify RLS policies are present and correct post-migration (critical security — CVE-2025-48757 risk)
- [ ] **DB-04**: Export and import all production data with zero data loss
- [ ] **DB-05**: Verify row counts match between old and new databases for every table
- [ ] **DB-06**: Recreate all database extensions that don't survive pg_dump
- [ ] **DB-07**: Recreate all database triggers that reference specific schemas
- [ ] **DB-08**: Migrate all 14 RPC functions and verify they execute correctly

### Auth Migration

- [ ] **AUTH-01**: Export auth.users table with password hashes from old Supabase project
- [ ] **AUTH-02**: Import auth users into new project — all users can log in without password reset
- [ ] **AUTH-03**: Configure TOTP MFA on new Supabase project
- [ ] **AUTH-04**: Verify JWT secret handling (copy or regenerate with re-auth plan)

### Edge Functions & Backend

- [ ] **EDGE-01**: Deploy all 90+ edge functions to new Supabase project
- [ ] **EDGE-02**: Configure all ~40+ secrets/environment variables on new project
- [ ] **EDGE-03**: Recreate all pg_cron scheduled jobs (auto-recharge, morning-review, billing-collections, prospect-inactivity-check, hourly-approval-reminder)
- [ ] **EDGE-04**: Verify edge function JWT verification config (73 functions require verify_jwt)
- [ ] **EDGE-05**: Update edge function CORS origins to include new domain

### Stripe Migration

- [ ] **STRIPE-01**: Update management account webhook endpoints to point at new Supabase edge function URLs
- [ ] **STRIPE-02**: Update ad spend account webhook endpoints to point at new Supabase edge function URLs
- [ ] **STRIPE-03**: Generate and configure new webhook signing secrets for both accounts
- [ ] **STRIPE-04**: Verify all webhook event types are registered on new endpoints
- [ ] **STRIPE-05**: End-to-end test: create test invoice, verify it flows through new backend correctly
- [ ] **STRIPE-06**: End-to-end test: verify auto-recharge wallet logic fires correctly on new backend
- [ ] **STRIPE-07**: Verify all 70+ active subscriptions are producing events to new endpoints

### Storage Migration

- [ ] **STORE-01**: Create 3 storage buckets on new project (media, agreements, chat-attachments) with correct public/private policies
- [ ] **STORE-02**: Migrate all file objects from old buckets to new buckets
- [ ] **STORE-03**: Verify storage access policies match old project (public read for media/chat-attachments, private for agreements)

### Realtime

- [ ] **RT-01**: Enable Realtime publications for all tables that currently use them
- [ ] **RT-02**: Verify 8 Realtime components reconnect and receive updates (chat, admin chat, tickets, onboarding, notifications, browser notifications, lead pipeline)

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
| PREP-01 | — | Pending |
| PREP-02 | — | Pending |
| PREP-03 | — | Pending |
| PREP-04 | — | Pending |
| PREP-05 | — | Pending |
| DB-01 | — | Pending |
| DB-02 | — | Pending |
| DB-03 | — | Pending |
| DB-04 | — | Pending |
| DB-05 | — | Pending |
| DB-06 | — | Pending |
| DB-07 | — | Pending |
| DB-08 | — | Pending |
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| AUTH-04 | — | Pending |
| EDGE-01 | — | Pending |
| EDGE-02 | — | Pending |
| EDGE-03 | — | Pending |
| EDGE-04 | — | Pending |
| EDGE-05 | — | Pending |
| STRIPE-01 | — | Pending |
| STRIPE-02 | — | Pending |
| STRIPE-03 | — | Pending |
| STRIPE-04 | — | Pending |
| STRIPE-05 | — | Pending |
| STRIPE-06 | — | Pending |
| STRIPE-07 | — | Pending |
| STORE-01 | — | Pending |
| STORE-02 | — | Pending |
| STORE-03 | — | Pending |
| RT-01 | — | Pending |
| RT-02 | — | Pending |
| FE-01 | — | Pending |
| FE-02 | — | Pending |
| FE-03 | — | Pending |
| FE-04 | — | Pending |
| FE-05 | — | Pending |
| CUT-01 | — | Pending |
| CUT-02 | — | Pending |
| CUT-03 | — | Pending |
| CUT-04 | — | Pending |
| CUT-05 | — | Pending |
| CUT-06 | — | Pending |
| CUT-07 | — | Pending |
| CUT-08 | — | Pending |
| CUT-09 | — | Pending |
| CUT-10 | — | Pending |
| CUT-11 | — | Pending |
| CUT-12 | — | Pending |

**Coverage:**
- v1 requirements: 47 total
- Mapped to phases: 0
- Unmapped: 47 (pending roadmap creation)

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after initial definition*
