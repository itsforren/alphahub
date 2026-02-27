# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** All existing functionality continues working after migration -- no lost data, no duplicate billing, no broken client workflows.
**Current focus:** Phase 1: Preparation & Audit

## Current Position

Phase: 1 of 6 (Preparation & Audit)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-02-26 -- Completed 01-01-PLAN.md (Clone and Audit)

Progress: [##..................] 7%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 7min
- Total execution time: 0.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-preparation-audit | 1/3 | 7min | 7min |

**Recent Trend:**
- Last 5 plans: 01-01 (7min)
- Trend: -

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

### Pending Todos

None yet.

### Blockers/Concerns

- Research flagged storage migration script as LOW confidence (Supabase `seed buckets` in beta). May need custom Node.js script. Affects Phase 3 planning.
- Actual secret values for 41 edge function secrets need to be located before Phase 3. Most expected in `~/.zprofile` but complete list unverified.
- pg_cron jobs need authoritative list from `SELECT * FROM cron.job` on old project. Config.toml shows 2 but there may be more.
- LOVABLE_API_KEY needs replacement strategy -- 5 functions use Lovable AI gateway for LLM calls.
- `stripe-webhook` and `dispute-webhook` lack signature verification -- security risk to address during migration.
- `admin-set-password` uses hardcoded secret (`alpha-admin-2024`) -- should be moved to env var.

## Session Continuity

Last session: 2026-02-26
Stopped at: Completed 01-01-PLAN.md (Clone and Audit)
Resume file: None
