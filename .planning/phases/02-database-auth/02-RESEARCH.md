# Phase 2: Database & Auth - Research

**Researched:** 2026-02-27
**Domain:** Supabase database migration (PostgreSQL), auth user migration with password preservation
**Confidence:** HIGH

## Summary

This phase migrates the full database (93-94 tables, 28 functions, 48 triggers, ~130 RLS policies) and 44 auth users from the Lovable-managed Supabase project (`qydkrpirrfelgtcqasdx`) to the new self-managed project (`qcunascacayiiuufjtaq`). The target runs PostgreSQL 17.6.1. The source project's PostgreSQL version is unknown but likely 15.x (standard for Lovable-created projects as of late 2025).

The standard approach is the Supabase CLI backup-and-restore workflow using `supabase db dump` for three separate exports (roles, schema, data) followed by `psql` restore with `session_replication_role = replica` to disable triggers during data import. Auth users require special handling: exporting the `auth` schema data separately, importing with triggers disabled, and preserving `auth.identities` records alongside `auth.users`. TOTP MFA factors stored in `auth.mfa_factors` should be migrated via the same dump/restore -- the TOTP secrets are stored as database records and will transfer if included in the auth schema dump. Sessions and refresh tokens will NOT survive migration due to different JWT signing keys.

**Primary recommendation:** Use the Supabase CLI three-file dump approach (roles.sql, schema.sql, data.sql) for the public schema, plus a separate `--schema auth` data dump for auth migration. Restore with `session_replication_role = replica` to prevent trigger double-execution. Verify everything via automated row count comparison and RLS validation scripts.

## Standard Stack

The established tools for this domain:

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Supabase CLI | v2.75+ | `supabase db dump` for schema/data export | Official tool, handles Supabase-specific schemas correctly |
| psql | 17.x | Database restore (not pg_restore) | CLI dump produces SQL output, psql is the correct restore tool |
| PostgreSQL `pg_dump` | 17.x | Underlying dump engine (used by `supabase db dump`) | Industry standard for PostgreSQL migrations |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `supabase migration repair` | CLI built-in | Sync migration history on new project | After restore to mark all 144 migrations as applied |
| `psql` direct queries | - | Verification queries (row counts, RLS status) | Post-restore validation |
| `jq` | system | JSON processing for verification scripts | Comparing row counts between projects |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CLI dump/restore | Dashboard `.backup` + pg_restore | Binary format; harder to inspect/edit; CLI approach gives more control over schema selection |
| CLI dump/restore | Migration replay (`supabase db push`) | Would NOT capture objects created outside migrations (the 94th table, custom SQL). Dump/restore captures actual live state |
| Manual auth SQL | Supabase Admin API user creation | Admin API does NOT support importing with existing password hashes. Must use SQL. |

**No installation needed** -- Supabase CLI and psql are already available tools.

## Architecture Patterns

### Recommended Migration Order

```
Phase 2 Execution Order:
1. Export from source (3 dumps + auth dump)
2. Prepare target project (extensions, config.toml fix)
3. Restore schema to target
4. Import auth users (triggers disabled)
5. Import public data (triggers disabled)
6. Verify schema (table counts, functions, triggers)
7. Verify data (row counts, financial spot-checks)
8. Verify auth (login test, RLS test)
9. Mark migrations as applied
```

### Pattern 1: Three-File Dump Strategy
**What:** Separate roles, schema, and data into three SQL files for independent inspection and restore
**When to use:** Always for Supabase project-to-project migration
**Why:** Allows inspection of schema before restore, enables fixing hardcoded references, and permits disabling triggers only during data import

**Export commands:**
```bash
# Source: Supabase official backup/restore docs
# Get connection string from source project settings

# 1. Export roles (database users/permissions)
supabase db dump --db-url "$OLD_DB_URL" -f roles.sql --role-only

# 2. Export schema (tables, functions, triggers, RLS policies, indexes)
supabase db dump --db-url "$OLD_DB_URL" -f schema.sql

# 3. Export data (all rows, using COPY for speed)
supabase db dump --db-url "$OLD_DB_URL" -f data.sql --use-copy --data-only
```

**Restore command:**
```bash
# Source: Supabase official backup/restore docs
# session_replication_role = replica disables ALL triggers during data import
# This prevents double-encryption and trigger side effects

psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "$NEW_DB_URL"
```

### Pattern 2: Auth Schema Data Export (Separate)
**What:** Export auth schema data independently for auth user migration
**When to use:** When migrating auth users with preserved passwords between Supabase projects
**Why:** Default `supabase db dump` excludes auth and storage schemas

```bash
# Export auth data only (users, identities, MFA factors, etc.)
supabase db dump --db-url "$OLD_DB_URL" -f auth_data.sql --use-copy --data-only --schema auth

# Import auth data with triggers disabled
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --command 'SET session_replication_role = replica' \
  --file auth_data.sql \
  --dbname "$NEW_DB_URL"
```

### Pattern 3: Migration History Preservation
**What:** Ensure the new project's migration history table reflects all 144 migrations as applied
**When to use:** After schema restore, before running any `supabase db push`
**Why:** Without this, the CLI thinks no migrations have been applied and would try to re-run them all

```bash
# Export migration history from old project
supabase db dump --db-url "$OLD_DB_URL" \
  -f migration_history.sql --use-copy --data-only --schema supabase_migrations

# Import to new project
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file migration_history.sql \
  --dbname "$NEW_DB_URL"

# OR use repair command for each migration (slower but safer)
supabase migration repair --status applied 20251211032746
# ... for each of the 144 migrations
```

### Anti-Patterns to Avoid

- **Running migrations via `supabase db push` instead of dump/restore:** Would miss the 94th table (created outside migrations), any manually-created objects, and actual data. Migration files create 93 tables; live DB has 94.
- **Importing auth data without disabling triggers:** The `on_auth_user_created` trigger on `auth.users` would fire for each imported user, creating duplicate `profiles` and `user_roles` rows, causing unique constraint violations.
- **Restoring schema + data in one step without `session_replication_role = replica`:** Triggers fire during data import, causing double-encryption of auth passwords and unexpected side effects from audit/notification triggers.
- **Using the Supabase Admin API for auth migration:** The API does NOT support importing users with existing bcrypt password hashes. Only direct SQL import preserves passwords.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database export | Custom SELECT/INSERT scripts | `supabase db dump` | Handles all schema objects, dependencies, ordering, COPY format |
| Auth user migration | API-based user creation loop | Direct SQL dump/restore of auth schema | API cannot set encrypted_password; SQL preserves hashes exactly |
| Row count verification | Manual table-by-table counting | Automated SQL query against `information_schema` | 94 tables is too many to verify manually; script catches all |
| RLS verification | Manual policy inspection | Automated `pg_tables.rowsecurity` + anon key test script | ~130 policies; manual review would miss gaps |
| Migration history sync | Manually tracking which migrations ran | `supabase db dump --schema supabase_migrations` | Exact state transfer of all 144 migration records |
| Extension setup | Remembering which extensions to create | Query `pg_extension` on source, script `CREATE EXTENSION` on target | 8 extensions, some auto-enabled, some manual -- script is reliable |

**Key insight:** The Supabase CLI and psql provide battle-tested migration primitives. Custom scripts introduce risk of missing edge cases (trigger ordering, foreign key dependencies, COPY vs INSERT performance). Use the standard tools for the heavy lifting; custom scripts only for verification.

## Common Pitfalls

### Pitfall 1: Trigger Fire During Auth Data Import
**What goes wrong:** When auth.users rows are inserted, the `on_auth_user_created` trigger fires, creating profiles and user_roles entries. But the data dump ALSO contains the profiles and user_roles data. Result: unique constraint violations, duplicate data, or failed import.
**Why it happens:** Triggers are active by default during psql restore.
**How to avoid:** Always use `SET session_replication_role = replica` before loading data files. This disables ALL triggers (including auth triggers) during the import.
**Warning signs:** `duplicate key value violates unique constraint` errors during restore.

### Pitfall 2: Hardcoded Old Project URL in Migrations
**What goes wrong:** Migration `20260105224855` contains hardcoded references to `qydkrpirrfelgtcqasdx.supabase.co` (the old project URL) in a DEFAULT column value and an UPDATE statement for `clients.success_manager_image_url`.
**Why it happens:** Lovable AI generated migration SQL with absolute URLs.
**How to avoid:** If using dump/restore approach (recommended), the data dump captures the actual current values -- the migration file is NOT re-executed, so this is informational only. However, after migration, the DEFAULT value on the column will still point to the old project. This needs a post-migration fix: `ALTER TABLE clients ALTER COLUMN success_manager_image_url SET DEFAULT 'https://qcunascacayiiuufjtaq.supabase.co/...'`.
**Warning signs:** Check schema dump for any hardcoded `qydkrpirrfelgtcqasdx` references.

### Pitfall 3: Foreign Key Dependencies on auth.users
**What goes wrong:** Public schema tables (profiles, user_roles, clients, chat_messages, admin_dm_messages, etc.) have foreign keys referencing `auth.users(id)`. If you import public data before auth users exist, foreign key constraints fail.
**Why it happens:** Schema establishes FK constraints; data import must respect them.
**How to avoid:** Import auth data FIRST, then public data. OR use the combined restore with `session_replication_role = replica` which also defers constraint checking. The recommended psql single-transaction approach handles this -- but auth data must come before public data in the restore order.
**Warning signs:** `foreign key constraint violation` errors on user_id columns.

### Pitfall 4: PostgreSQL Version Mismatch
**What goes wrong:** Target project is PostgreSQL 17.6.1. Source project may be PostgreSQL 15.x. While pg_dump SQL output is generally forward-compatible, some syntax differences can cause issues.
**Why it happens:** Lovable-managed projects may run older PostgreSQL versions. New Supabase projects default to PG 17.
**How to avoid:** Use `--no-owner --no-privileges` flags is NOT needed for Supabase CLI dump (it handles this). Check the schema.sql dump for any PG15-specific syntax before restoring. The COPY format is version-agnostic.
**Warning signs:** Syntax errors during schema restore. If encountered, check for PG15 vs PG17 differences.

### Pitfall 5: supabase_admin Owner Errors
**What goes wrong:** Schema dump may contain `ALTER ... OWNER TO "supabase_admin"` statements that fail on the new project because `supabase_admin` is a system role with different grants.
**Why it happens:** pg_dump captures ownership information that may not be directly transferable.
**How to avoid:** If errors occur, comment out or remove `OWNER TO "supabase_admin"` lines from schema.sql before restoring. The Supabase backup docs explicitly mention this.
**Warning signs:** `permission denied` or `role "supabase_admin" does not exist` errors.

### Pitfall 6: 94th Table Missing from Migration Replay
**What goes wrong:** The codebase migration files create 93 tables. The live database has 94. If you rely on migration replay instead of dump/restore, you miss the 94th table.
**Why it happens:** The 94th table was created via Lovable AI directly (SQL in dashboard or AI chat), not through a numbered migration file.
**How to avoid:** Use dump/restore (recommended approach), which captures the ACTUAL live state, not the migration intent. The 94th table will be included automatically.
**Warning signs:** After restore, check `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'` equals 94.

### Pitfall 7: Auth Schema Restrictions (Post-April 2025)
**What goes wrong:** Since April 21, 2025, Supabase restricts certain operations on auth, storage, and realtime schemas. Specifically: INSERT/UPDATE/DELETE on migration tables like `auth.schema_migrations` are blocked.
**Why it happens:** Supabase added protections to prevent accidental damage to system schemas.
**How to avoid:** The restrictions target `auth.schema_migrations`, NOT `auth.users`. Direct INSERT into `auth.users` via psql with the postgres role connection should still work. The `session_replication_role = replica` approach via psql as the postgres user is the standard restore method and is not affected by these API-level restrictions. If issues arise, the psql restore uses the database connection string (postgres role), which has higher privileges than API roles.
**Warning signs:** Permission denied errors on auth schema tables. Resolution: Use direct database connection (not pooler) with postgres password.

### Pitfall 8: TOTP MFA Re-enrollment Risk
**What goes wrong:** If `auth.mfa_factors` table data is not included in the auth dump, users with TOTP MFA enabled will need to re-enroll.
**Why it happens:** MFA factors are stored in `auth.mfa_factors` and `auth.mfa_challenges` tables. If these are missed during export, the MFA configuration is lost.
**How to avoid:** Export the ENTIRE auth schema data (`--schema auth`), which includes `auth.mfa_factors`, `auth.mfa_challenges`, `auth.mfa_amr_claims`. Verify after import that `SELECT count(*) FROM auth.mfa_factors` matches the source.
**Warning signs:** After migration, MFA-enabled users are prompted to re-enroll instead of being asked for their existing TOTP code. Confidence: MEDIUM -- research found conflicting claims about whether TOTP secrets survive migration. Some sources say TOTP must be re-enrolled; official docs are silent. The dump/restore of the full auth schema SHOULD preserve them since the secrets are stored as database records, but this MUST be validated during testing.

## Code Examples

Verified patterns from official sources:

### Complete Export Script
```bash
# Source: Supabase backup/restore docs
# https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

# Connection strings (from environment variables)
OLD_DB_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
NEW_DB_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Step 1: Export roles
supabase db dump --db-url "$OLD_DB_URL" -f roles.sql --role-only

# Step 2: Export schema (public + extensions, excludes auth/storage)
supabase db dump --db-url "$OLD_DB_URL" -f schema.sql

# Step 3: Export public data
supabase db dump --db-url "$OLD_DB_URL" -f data.sql --use-copy --data-only

# Step 4: Export auth data separately
supabase db dump --db-url "$OLD_DB_URL" -f auth_data.sql --use-copy --data-only --schema auth

# Step 5: Export migration history
supabase db dump --db-url "$OLD_DB_URL" -f migration_history.sql --use-copy --data-only --schema supabase_migrations
```

### Complete Restore Script
```bash
# Source: Supabase backup/restore docs

# Step 1: Restore schema (includes roles)
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --dbname "$NEW_DB_URL"

# Step 2: Import auth data FIRST (before public data due to FKs)
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --command 'SET session_replication_role = replica' \
  --file auth_data.sql \
  --dbname "$NEW_DB_URL"

# Step 3: Import public data (with triggers disabled)
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "$NEW_DB_URL"

# Step 4: Import migration history
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --command 'SET session_replication_role = replica' \
  --file migration_history.sql \
  --dbname "$NEW_DB_URL"
```

### Row Count Verification Query
```sql
-- Run on BOTH source and target, compare results
SELECT
  schemaname || '.' || relname AS table_name,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;
```

### RLS Verification Query
```sql
-- Verify ALL public tables have RLS enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Count of tables WITHOUT RLS (should be 0)
SELECT count(*) AS tables_without_rls
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
```

### Anon Key RLS Test
```sql
-- Test that anon role cannot access protected data
-- Run this AS the anon role (or via Supabase anon key API)
SET ROLE anon;
SELECT count(*) FROM public.clients; -- Should return 0 or error
SELECT count(*) FROM public.billing_records; -- Should return 0 or error
SELECT count(*) FROM public.wallet_transactions; -- Should return 0 or error
RESET ROLE;
```

### Function Verification Query
```sql
-- List all custom functions in public schema
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Count should be 28 (or match source)
SELECT count(*) FROM information_schema.routines WHERE routine_schema = 'public';
```

### Trigger Verification Query
```sql
-- List all triggers
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Count should be 48 (or match source)
SELECT count(*) FROM information_schema.triggers WHERE trigger_schema = 'public';
```

### Auth User Count Verification
```sql
-- Verify user count
SELECT count(*) FROM auth.users; -- Should be 44

-- Verify identities exist
SELECT count(*) FROM auth.identities; -- Should match or exceed user count

-- Verify MFA factors (if any users have TOTP)
SELECT count(*) FROM auth.mfa_factors; -- Match source count

-- Verify encrypted_password is populated (not null/empty)
SELECT count(*) FROM auth.users WHERE encrypted_password IS NOT NULL AND encrypted_password != '';
-- Should be 44 (all users)
```

### Financial Data Spot-Check Queries
```sql
-- Critical financial verification (run on BOTH, compare)

-- Wallet balances
SELECT client_id, balance, auto_recharge_amount
FROM client_wallets
ORDER BY client_id;

-- Billing totals
SELECT client_id, sum(amount) as total_billed
FROM billing_records
GROUP BY client_id
ORDER BY client_id;

-- Ad spend totals
SELECT client_id, sum(spend) as total_spend
FROM ad_spend_daily
GROUP BY client_id
ORDER BY client_id;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pg_dump` raw | `supabase db dump` CLI wrapper | Supabase CLI v2+ | Handles Supabase-specific schema exclusions, COPY format |
| Dashboard backup (binary) | CLI-based SQL dumps | 2024 | SQL dumps are inspectable, editable, and more reliable |
| Manual user creation via API | Direct auth schema SQL import | Confirmed 2025 | Only way to preserve password hashes |
| No schema restrictions | Auth/storage schema restrictions | April 21, 2025 | Migration tables locked; does NOT block auth.users data import via postgres role |

**Deprecated/outdated:**
- Using `pg_restore` with Supabase CLI dumps: The CLI produces SQL format, not binary. Use `psql` for restore.
- Using `supabase db push` for full migration: Only replays migration files. Does NOT capture out-of-band changes (94th table, manual SQL).

## Open Questions

1. **Source project PostgreSQL version**
   - What we know: Target is PG 17.6.1. Lovable-managed projects commonly run PG 15.x.
   - What's unclear: Exact PG version of source project `qydkrpirrfelgtcqasdx`.
   - Recommendation: Check before export with `SELECT version()` on source. If PG 15, the dump will still be forward-compatible for restore into PG 17, but watch for any syntax warnings.

2. **Which is the 94th table?**
   - What we know: Migrations create 93 tables. Live DB has 94. One table was created outside of migration files (likely via Lovable AI chat SQL).
   - What's unclear: Which specific table is the 94th.
   - Recommendation: After schema dump, compare the CREATE TABLE statements in schema.sql against the migration files. The extra table will be obvious. If using dump/restore approach, it will be included automatically.

3. **TOTP MFA factor survival**
   - What we know: `auth.mfa_factors` stores TOTP secrets as database records. Dump/restore of auth schema SHOULD include them. Some community sources claim re-enrollment is needed.
   - What's unclear: Whether the TOTP secrets (encrypted in `auth.mfa_factors`) are tied to the project's encryption key or are self-contained bcrypt-like records.
   - Recommendation: Test with a single MFA-enabled user after migration. If TOTP codes don't work, users must re-enroll. With only 44 users (subset have MFA), this is manageable.

4. **Auth schema INSERT permissions post-April 2025**
   - What we know: Supabase restricted destructive operations on auth migration tables (`auth.schema_migrations`). The official backup/restore docs still recommend psql restore of auth data. Using the postgres connection string (not API) provides higher privileges.
   - What's unclear: Whether the psql restore of auth.users data works without issues on post-April 2025 projects.
   - Recommendation: Test the auth import on the new project early. If blocked, contact Supabase support (they explicitly support this migration path) or use the session_replication_role approach which bypasses row-level restrictions.

5. **Session pooler vs direct connection for restore**
   - What we know: New project pooler is on port 6543. Direct connection may require IPv6 or specific network config.
   - What's unclear: Whether session pooler supports `SET session_replication_role` (it may not, as poolers can strip session-level settings).
   - Recommendation: Use the direct database connection string (port 5432, `db.qcunascacayiiuufjtaq.supabase.co`) for restore operations, NOT the pooler. The pooler is for application connections; restore needs direct access.

## Sources

### Primary (HIGH confidence)
- [Supabase Backup/Restore CLI Guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) - Three-file dump strategy, restore commands, session_replication_role
- [Supabase Auth Migration Troubleshooting](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects) - Auth migration is officially supported, JWT secret consideration
- [Supabase CLI db dump Reference](https://supabase.com/docs/reference/cli/supabase-db-dump) - All CLI flags confirmed
- Phase 1 Inventories (LOVABLE-EXTRACTION.md, CODEBASE.md, SUPABASE-PROJECT.md) - Authoritative counts for tables, functions, triggers, users, extensions

### Secondary (MEDIUM confidence)
- [GitHub Discussion #36664 - Migrating Authenticated Users](https://github.com/orgs/supabase/discussions/36664) - Community-confirmed auth.users + auth.identities migration approach
- [GitHub Discussion #3897 - Export Users and Passwords](https://github.com/orgs/supabase/discussions/3897) - Confirmed pg_dump includes auth schema data with connection string
- [GitHub Discussion #34270 - Schema Restrictions](https://github.com/orgs/supabase/discussions/34270) - April 2025 restriction scope: migration tables, not user tables
- [Supabase Migration Repair CLI](https://supabase.com/docs/reference/cli/supabase-migration-repair) - Migration history management

### Tertiary (LOW confidence)
- Community claims that TOTP must be re-enrolled after migration (unverified -- contradicts database-level dump/restore logic)
- Assumptions about source project PostgreSQL version being 15.x (unverified, based on typical Lovable project vintage)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Supabase docs provide exact commands and workflow
- Architecture (migration order): HIGH - FK dependencies and trigger behavior are well-understood PostgreSQL patterns
- Auth migration: HIGH for passwords, MEDIUM for MFA/TOTP - Passwords confirmed working; TOTP survival needs testing
- Pitfalls: HIGH - Based on official docs, community reports, and codebase analysis
- RLS verification: HIGH - Standard PostgreSQL system catalog queries

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable domain -- PostgreSQL migration patterns don't change rapidly)
