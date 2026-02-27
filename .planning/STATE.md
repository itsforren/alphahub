# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** All existing functionality continues working after migration -- no lost data, no duplicate billing, no broken client workflows.
**Current focus:** Phase 1: Preparation & Audit

## Current Position

Phase: 1 of 6 (Preparation & Audit)
Plan: 2 of 3 in current phase (01-01 and 01-03 complete, 01-02 in progress)
Status: In progress
Last activity: 2026-02-27 -- Completed 01-03-PLAN.md (Lovable AI Extraction)

Progress: [##..................] 11%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 5min
- Total execution time: 0.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-preparation-audit | 2/3 | 10min | 5min |

**Recent Trend:**
- Last 5 plans: 01-01 (7min), 01-03 (3min)
- Trend: improving

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 6-phase migration following strict dependency order (DB first, then backend infra, then Stripe, then frontend, then cutover)
- [Roadmap]: Phases 4 and 5 can execute in parallel (frontend deployment does not depend on Stripe migration)
- [Roadmap]: Phase 3 combines edge functions, storage, and realtime into single "Backend Infrastructure" phase (parallel work within phase, shared dependency on Phase 2)
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

### Pending Todos

- Investigate which table is the 94th (codebase migrations create 93). Identify during Phase 2.
- Locate Stripe price IDs (STRIPE_MANAGEMENT_PRICE_ID, STRIPE_AD_SPEND_PRICE_ID) -- not in Supabase secrets, may be hardcoded. Investigate in Phase 4 planning.

### Blockers/Concerns

- Research flagged storage migration script as LOW confidence (Supabase `seed buckets` in beta). May need custom Node.js script. Affects Phase 3 planning.
- Actual secret values for 42 edge function secrets need to be located before Phase 3. Most expected in `~/.zprofile` but complete list unverified. (Updated: 42 manual secrets, not 41.)
- ~~pg_cron jobs need authoritative list~~ RESOLVED: 6 cron jobs captured from Lovable extraction.
- LOVABLE_API_KEY needs replacement strategy -- 5 functions use Lovable AI gateway for LLM calls.
- `stripe-webhook` and `dispute-webhook` lack signature verification -- security risk to address during migration.
- `admin-set-password` uses hardcoded secret (`alpha-admin-2024`) -- should be moved to env var.
- Stripe price IDs may be hardcoded in edge functions -- needs investigation before Phase 4.
- chat-attachments storage bucket is public (should be private) -- fix during Phase 3 migration.

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed 01-03-PLAN.md (Lovable AI Extraction)
Resume file: None
