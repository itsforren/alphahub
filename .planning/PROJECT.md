# AlphaHub Migration

## What This Is

AlphaHub is a client management and ad operations platform that handles billing (dual Stripe accounts for management fees and ad spend), ad spend wallets with auto-billing, campaign health monitoring, lead pipelines, client communications, and financial projections. It currently runs on Lovable Cloud with a Lovable-managed Supabase backend. This project migrates the entire platform to a self-managed setup — own Supabase project, own backend, own frontend deployment — so it can be maintained and extended with Claude Code.

## Core Value

All existing functionality continues working after migration — no lost data, no duplicate billing, no broken client workflows. The app must come back up doing exactly what it does today.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Migrate full Supabase schema (tables, RLS policies, functions, triggers, storage buckets) to new self-owned Supabase project
- [ ] Migrate all production data (clients, invoices, wallets, campaigns, leads, communications, subscriptions) with zero data loss
- [ ] Replicate Stripe integration — dual accounts (management + ad spend), invoices, subscriptions, charges, payouts, auto-billing
- [ ] Replicate Google Auth (and any other auth providers) on new Supabase project
- [ ] Migrate or rebuild all edge functions / server-side logic
- [ ] Rebuild API layer — all endpoints the frontend currently calls
- [ ] Migrate frontend codebase (React + Vite + Tailwind + shadcn/ui) from Lovable, re-point to new backend
- [ ] Deploy frontend independently (not on Lovable)
- [ ] Execute clean cutover with brief planned downtime — no duplicate billing, no orphaned data
- [ ] Verify all features work post-migration: client management, billing, ad spend wallets, campaign health, lead pipeline, communications, alerts, financial projections
- [ ] MCP server (alphahub-mcp) updated to point at new Supabase instance

### Out of Scope

- New features or redesigns — this is a 1:1 migration, not a rewrite
- Mobile app — web only, same as current
- Changing the Stripe account structure — keep dual-account setup as-is
- Migrating away from Supabase — we're keeping Supabase, just owning the project
- Performance optimization — match current behavior first, optimize later

## Context

- **Production system**: ~15+ active clients, 70+ active recurring subscriptions, $100K+/cycle in billing. This is live revenue infrastructure.
- **Dual Stripe accounts**: Management fees and ad spend are separate Stripe accounts. Both must migrate with customer/subscription mappings intact.
- **Ad spend wallets**: Clients have wallet balances with daily burn rates, auto-recharge logic, and low-balance alerts. Wallet state must transfer exactly.
- **Current stack**: React + Vite + TypeScript + Tailwind + shadcn/ui frontend. Supabase backend (auth, database, edge functions, storage). Stripe for billing.
- **Lovable source**: Code available via Lovable's GitHub sync — needs to be exported before migration begins.
- **AlphaHub MCP**: An MCP server exists that queries the current Supabase instance. Must be updated to point at the new instance post-migration.
- **Dashboard URL**: Currently at conscious.sysconscious.com (Lovable/Supabase hosted).

## Constraints

- **Downtime**: Brief planned downtime acceptable for cutover, but must be minimized — ad campaigns run in real time
- **Data integrity**: Zero tolerance for data loss or duplication, especially in billing/financial data
- **Timeline**: Needs to happen quickly — this is blocking the ability to iterate on the product
- **Stripe**: Cannot create new Stripe accounts — must preserve existing customer IDs, subscription IDs, and payment methods
- **Auth**: Must preserve user sessions or provide seamless re-authentication post-migration

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| New Supabase project on supabase.com (not self-hosted) | Simpler ops, managed infrastructure, same API surface | -- Pending |
| Brief downtime cutover (not zero-downtime) | Simpler migration, acceptable for the business | -- Pending |
| 1:1 migration before any new features | Reduce risk, validate the new setup matches current behavior | -- Pending |
| Export Lovable source via GitHub sync | Fastest way to get the codebase locally | -- Pending |

---
*Last updated: 2026-02-26 after initialization*
