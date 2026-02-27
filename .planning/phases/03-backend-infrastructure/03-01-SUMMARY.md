---
phase: 03-backend-infrastructure
plan: 01
subsystem: infra
tags: [supabase, cli, config, edge-functions, toml]

# Dependency graph
requires:
  - phase: 02-database-auth
    provides: "Database migrated and auth verified on new project qcunascacayiiuufjtaq"
provides:
  - "config.toml with all 106 edge functions registered (verify_jwt=false)"
  - "Supabase CLI linked to new project qcunascacayiiuufjtaq"
  - "Ready for bulk edge function deployment"
affects: [03-02 (secrets), 03-03 (function deploy), 03-04 (storage), 03-05 (realtime/cron)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All 106 functions use verify_jwt=false (auth handled internally per function)"
    - "Cron scheduling via pg_cron SQL, not config.toml schedule keys"

key-files:
  created: []
  modified:
    - "alphahub-v2/supabase/config.toml"

key-decisions:
  - "Removed schedule keys from config.toml -- cron handled by pg_cron in database, not CLI config"
  - "All 106 functions set to verify_jwt=false -- matches source project behavior"

patterns-established:
  - "Edge function JWT verification disabled at config level; auth logic is internal per function"
  - "Supabase CLI link via sourced ~/.zprofile env vars (SUPABASE_ACCESS_TOKEN, SUPABASE_V2_DB_PASSWORD)"

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 3 Plan 1: Config Fix & CLI Link Summary

**Fixed config.toml (removed schedule keys, added 17 missing functions to reach 106 total) and linked CLI to new Supabase project qcunascacayiiuufjtaq**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T16:28:13Z
- **Completed:** 2026-02-27T16:30:34Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Updated project_id from old project (qydkrpirrfelgtcqasdx) to new project (qcunascacayiiuufjtaq)
- Removed 2 schedule keys that blocked `supabase link` (prospect-inactivity-check, auto-recharge-run)
- Added 17 missing function entries (89 -> 106 total), all with verify_jwt=false
- Successfully linked CLI to new project -- `supabase functions list` works

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix config.toml** - `5aaba6f` (fix)
2. **Task 2: Link local project** - No commit needed (CLI state only, no tracked files changed)

## Files Created/Modified
- `alphahub-v2/supabase/config.toml` - Updated project_id, removed schedule keys, added 17 missing function entries

## Decisions Made
- Removed `schedule` keys rather than trying to make them work with CLI v2.75.0. Cron scheduling is handled by pg_cron SQL jobs in the database (6 cron jobs captured from Lovable extraction), not config.toml.
- Task 2 produced no git-tracked file changes (supabase link creates `.temp/` directory with local CLI state). Only Task 1 produced a commit.
- Three pre-existing unstaged changes to edge function files (LOVABLE_API_KEY -> LLM_API_KEY migration) were left untouched -- they belong to a different plan scope.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `SUPABASE_V2_DB_PASSWORD` and `SUPABASE_ACCESS_TOKEN` env vars were not loaded in the shell by default. Sourced `~/.zprofile` before running `supabase link` to make credentials available.
- `supabase link` created an untracked `alphahub-v2/supabase/.temp/` directory containing project metadata. This is local CLI state and was not committed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CLI linked and config.toml ready for `supabase functions deploy`
- Next plan (03-02) should set edge function secrets before deployment
- 106 functions registered with verify_jwt=false, matching source project behavior
- Three pre-existing edge function file changes (LLM_API_KEY migration) exist in working tree -- will be addressed in function deployment plan

---
*Phase: 03-backend-infrastructure*
*Completed: 2026-02-27*
