# Phase 1: Preparation & Audit - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Clone the alpha-agent-flow source, create a new Supabase Cloud project, and produce complete inventories of every secret, webhook URL, and external dependency — so migration phases execute without discovery delays. Creating database dumps, migrating data, and deploying functions are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Supabase project setup
- Supabase Cloud (not self-hosted) — user may self-host later but migration targets cloud first
- Region: US East (Virginia) — closest to users and Stripe/GHL integrations
- Plan: Start on Free tier, upgrade to Pro ($25/mo) if data import exceeds 500MB or before cutover
- Project name: `alphahub-v2`

### Workspace & repo organization
- Clone repo into `./alphahub-v2/` subdirectory inside this project (copy-alphahub)
- `alphahub-v2/` stays as its own independent git repo (the clone)
- This project (copy-alphahub) tracks migration planning in `.planning/`

### Claude's Discretion
- Migration artifacts location (DB dumps, inventory files, scripts) — organize wherever makes sense
- Directory structure for inventory documents

### Audit completeness threshold
- Secrets: Document every `Deno.env.get()` call AND verify the actual value exists and is accessible (in ~/.zprofile, Supabase vault, etc.) — no unknowns before Phase 2
- Webhooks/integrations: Document everything found in code, active or not — sort out relevance later
- Codebase audit: Full structure + purpose map — every edge function (name, purpose, dependencies) and table (name, relationships) documented
- Flag suspicious items: Dead code, unused tables, potential issues — note them alongside the inventory

### Lovable migration approach
- Follow the official Lovable migration guide closely as the primary playbook
- User has full access to Lovable project editor and AI chat
- Phase 1 produces ready-to-paste prompts for Lovable's AI — user runs them and pastes back results
- Lovable AI extraction has not been done yet — this is part of Phase 1 execution

</decisions>

<specifics>
## Specific Ideas

- User considered self-hosted Supabase on upcoming private server — decided cloud-first, self-host is a potential future move
- All migration work lives under one project (copy-alphahub) with the source clone as a subdirectory
- "Whatever is the cleanest and most predictable way" — preference for clear, organized structure

</specifics>

<deferred>
## Deferred Ideas

- Self-hosted Supabase migration — potential future project after cloud migration is stable

</deferred>

---

*Phase: 01-preparation-audit*
*Context gathered: 2026-02-26*
