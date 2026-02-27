---
phase: 02-database-auth
plan: 01
subsystem: database
tags: [supabase, postgres, migrations, schema, rls, pg17]

requires:
  - phase: 01-preparation-audit
    provides: "Source repo cloned, new Supabase project created, secrets inventory"
provides:
  - "94 public tables created on new project with all columns and constraints"
  - "29 functions and 48 triggers deployed"
  - "RLS enabled on all 94 tables"
  - "8 extensions enabled (uuid-ossp, pgcrypto, pg_net, pg_cron)"
affects: [02-02, 02-03, 03-backend-infrastructure]

tech-stack:
  added: []
  patterns: ["migration replay via psql (not pg_dump) due to Lovable Cloud private infrastructure"]

key-files:
  created: []
  modified: []

key-decisions:
  - "Used migration replay (144 SQL files via psql) instead of pg_dump because source DB is on Lovable Cloud private infrastructure, inaccessible from public internet"
  - "Bridge function pattern: edge function on old project reads internal DB, writes to new project via pooler"
  - "Session-mode pooler on aws-1-us-east-1 (port 5432), not aws-0"

patterns-established:
  - "Bridge function for cross-project data transfer when source DB is inaccessible"
  - "Supabase Management API for SQL execution (bypasses CLI config issues)"

duration: ~120min
completed: 2026-02-27
---

# Plan 02-01: Schema Migration Summary

**94 tables with 29 functions, 48 triggers, and RLS on all tables created via 144-migration replay through psql**

## Performance

- **Duration:** ~2 hours (including troubleshooting connectivity)
- **Tasks:** 3 (adapted from original plan)
- **Files modified:** 0 (all operations on remote database)

## Accomplishments
- All 94 public tables exist on new project with correct column types and constraints
- 29 public functions deployed and operational
- 48 triggers active
- RLS enabled on all 94 tables (0 without)
- 8 extensions enabled: uuid-ossp, pgcrypto, pg_net, pg_cron, pgsodium, supautils, pg_graphql, pgmq
- Hardcoded old project URL in `clients.success_manager_image_url` DEFAULT fixed

## Decisions Made
- **Migration approach changed:** Original plan called for pg_dump/pg_restore. Discovery that Lovable Cloud uses private infrastructure (no public DB access) forced a complete approach change to migration replay + bridge function.
- **Bridge function pattern:** Created `db-migration-bridge` edge function on old project that reads from internal DB and writes to new project via pooler.
- **Correct pooler host:** Discovered new project uses `aws-1-us-east-1.pooler.supabase.com` (not `aws-0`). Old Lovable project isn't accessible via ANY pooler.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Source DB completely inaccessible from public internet**
- **Found during:** Task 1 (database export)
- **Issue:** Old Supabase project on Lovable Cloud has no public DNS for direct DB connection, and is not registered with any Supabase pooler. `supabase db dump` cannot connect.
- **Fix:** Created `get-db-url` edge function to retrieve connection string, then created `db-migration-bridge` edge function for cross-project data transfer. Schema created via migration file replay instead of dump/restore.
- **Verification:** All 94 tables, 29 functions, 48 triggers, RLS on all tables confirmed via queries

---

**Total deviations:** 1 major (approach change from dump/restore to migration replay + bridge)
**Impact on plan:** Fundamental approach change was necessary. End result matches original success criteria.

## Issues Encountered
- IPv6-only DNS for old project direct host (user's network has no IPv6)
- Pooler "Tenant or user not found" due to wrong pooler region (aws-0 vs aws-1)
- `supabase link` fails due to cron schedule keys in config.toml — used Management API as workaround

## Next Phase Readiness
- Schema is ready to receive data (Plan 02-02)
- Bridge function is operational for data transfer

---
*Phase: 02-database-auth*
*Completed: 2026-02-27*
