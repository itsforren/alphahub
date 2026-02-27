# Supabase Project: Alpha Hub v2 (Migration Target)

**Created:** 2026-02-27
**Purpose:** Migration target for AlphaHub platform (replacing `qydkrpirrfelgtcqasdx`)

---

## Project Details

| Property | Value |
|----------|-------|
| Project Name | Alpha Hub v2 |
| Project Ref | `qcunascacayiiuufjtaq` |
| Region | `us-east-1` (East US / North Virginia) |
| Plan | Free tier |
| Status | ACTIVE_HEALTHY |
| PostgreSQL Version | 17.6.1 |
| Database Host | `db.qcunascacayiiuufjtaq.supabase.co` |

## URLs

| URL Type | Value |
|----------|-------|
| Project URL | `https://qcunascacayiiuufjtaq.supabase.co` |
| REST API | `https://qcunascacayiiuufjtaq.supabase.co/rest/v1/` |
| Auth | `https://qcunascacayiiuufjtaq.supabase.co/auth/v1/` |
| Storage | `https://qcunascacayiiuufjtaq.supabase.co/storage/v1/` |
| Edge Functions | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/` |
| Realtime | `wss://qcunascacayiiuufjtaq.supabase.co/realtime/v1/` |
| Pooler Connection | `aws-0-us-east-1.pooler.supabase.com:6543` |

## Credentials (Environment Variables)

All credentials are stored in `~/.zprofile` as environment variables. **No secret values are stored in this file.**

| Env Var Name | Purpose | Sensitivity |
|-------------|---------|-------------|
| `SUPABASE_V2_PROJECT_REF` | Project reference ID | Public |
| `SUPABASE_V2_URL` | Project URL | Public |
| `SUPABASE_V2_ANON_KEY` | Anonymous/public API key | Public (safe for frontend) |
| `SUPABASE_V2_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) | **SENSITIVE** |
| `SUPABASE_V2_DB_PASSWORD` | Database password | **SENSITIVE** |
| `SUPABASE_V2_JWT_SECRET` | JWT signing secret | **SENSITIVE** |
| `SUPABASE_V2_DB_URL` | Full database connection string (via pooler) | **SENSITIVE** |
| `SUPABASE_ACCESS_TOKEN` | Personal access token (CLI/API auth) | **SENSITIVE** |

## Old vs New Project Reference

| Property | Old (Source) | New (Target) |
|----------|-------------|-------------|
| Project Ref | `qydkrpirrfelgtcqasdx` | `qcunascacayiiuufjtaq` |
| Project URL | `https://qydkrpirrfelgtcqasdx.supabase.co` | `https://qcunascacayiiuufjtaq.supabase.co` |
| Functions URL | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/` |
| Storage URL | `https://qydkrpirrfelgtcqasdx.supabase.co/storage/v1/` | `https://qcunascacayiiuufjtaq.supabase.co/storage/v1/` |

## Local CLI Link

**Status:** Not yet linked (blocked by config.toml `schedule` key incompatibility)

The source repo's `supabase/config.toml` contains `schedule` keys on two function blocks (`prospect-inactivity-check` and `auto-recharge-run`) which are not supported by Supabase CLI v2.75.0. The link command fails with:

```
'functions[prospect-inactivity-check]' has invalid keys: schedule
'functions[auto-recharge-run]' has invalid keys: schedule
```

**Resolution:** During Phase 3 (Backend Infrastructure), the config.toml will need to be updated to remove `schedule` keys. Cron scheduling for these functions is handled via `pg_cron` jobs in the database, not through config.toml (as confirmed in 01-03 Lovable extraction -- 6 cron jobs are managed via SQL, not CLI config).

**When ready to link:**
```bash
cd /Users/forren/workspace/copy-alphahub/alphahub-v2
supabase link --project-ref qcunascacayiiuufjtaq
```

## Free Tier Limits

| Resource | Limit | Current Usage (Source) | Headroom |
|----------|-------|----------------------|----------|
| Database Size | 500 MB | 284 MB | 43% |
| Storage | 1 GB | ~317 files (small) | Ample |
| Edge Function Invocations | 2M/month | N/A | N/A |
| Auth Users | Unlimited | 44 | N/A |
| Realtime Connections | 500 concurrent | Unknown | N/A |

Free tier is sufficient for migration. Upgrade to Pro ($25/mo) only needed for production load post-cutover.

---

*Source: Supabase Dashboard + ~/.zprofile environment variables*
