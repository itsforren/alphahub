# Lovable AI Extraction Results

**Purpose:** Capture migration-critical information only available from the Lovable-managed Supabase instance.
**Created:** 2026-02-26
**Status:** AWAITING EXECUTION

---

## Instructions

For each prompt below:
1. Open the AlphaHub project in Lovable (https://lovable.dev)
2. Open the AI chat
3. Copy the prompt from the code block
4. Paste it into Lovable AI chat
5. Wait for the full response
6. Copy the response and paste it into the "Result" section below

**Priority order** (if time-limited):
1. Prompt 4 (Database Size) -- determines Free vs Pro tier
2. Prompt 6 (Cron Jobs) -- known gap from codebase audit
3. Prompt 8 (Auth Export) -- determines password migration approach
4. Prompt 5 (Extensions)
5. Prompt 7 (Realtime)
6. Prompt 3 (Storage)
7. Prompt 2 (Secrets)
8. Prompt 1 (Schema)

---

## Prompt 1: Database Schema Overview

**Copy this prompt into Lovable AI chat:**

```
I'm migrating this project to my own Supabase instance. Please list every database table with its column names, types, and any foreign key relationships. Also list all RLS policies, database functions, and triggers that exist.
```

**What to look for:**
- Complete table list (expect ~93 tables based on codebase audit)
- Column names and types for each table
- Foreign key relationships between tables
- RLS policies per table (which roles, what conditions)
- Database functions (expect ~28)
- Triggers (expect ~52)
- Any discrepancies from what the 144 migration files define

**Result:**

[PASTE LOVABLE RESPONSE HERE]

**Analysis:**

[To be filled after results are captured]

---

## Prompt 2: Configured Secrets

**Copy this prompt into Lovable AI chat:**

```
List every secret/environment variable configured in the Supabase project for this app. Include the secret name and which edge function(s) use it. Do NOT include the actual values.
```

**What to look for:**
- Complete list of secret names (expect 44 unique secrets from codebase audit, 41 non-Supabase)
- Which edge functions reference each secret
- Any secrets configured in Supabase that are NOT referenced in code (orphaned)
- Any secrets referenced in code that are NOT configured (missing)
- Stripe-related secrets (expect 6: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_AD_SPEND_SECRET_KEY, STRIPE_AD_SPEND_WEBHOOK_SECRET, STRIPE_MANAGEMENT_PRICE_ID, STRIPE_AD_SPEND_PRICE_ID)

**Result:**

[PASTE LOVABLE RESPONSE HERE]

**Analysis:**

[To be filled after results are captured]

---

## Prompt 3: Storage Buckets

**Copy this prompt into Lovable AI chat:**

```
List all storage buckets configured for this project, including whether each is public or private, and approximately how many files are in each bucket.
```

**What to look for:**
- 3 buckets expected: media (public), agreements (private), chat-attachments (private)
- File counts per bucket (determines migration volume)
- Any additional buckets not found in codebase audit
- RLS policies on storage.objects for each bucket
- Max file size or MIME type restrictions

**Result:**

[PASTE LOVABLE RESPONSE HERE]

**Analysis:**

[To be filled after results are captured]

---

## Prompt 4: Database Size

**Copy this prompt into Lovable AI chat:**

```
What is the total database size for this project? Please run this query and share the result:
SELECT pg_size_pretty(pg_database_size(current_database()));
```

**What to look for:**
- Total size in MB or GB
- CRITICAL: If > 500 MB, Pro tier ($25/mo) is required before data import
- If < 500 MB, Free tier works for migration (upgrade later)
- This directly determines the Supabase plan decision for Phase 2

**Result:**

[PASTE LOVABLE RESPONSE HERE]

**Analysis:**

[To be filled after results are captured]

---

## Prompt 5: PostgreSQL Extensions

**Copy this prompt into Lovable AI chat:**

```
List all PostgreSQL extensions enabled for this project. Please run this query and share the result:
SELECT extname, extversion FROM pg_extension ORDER BY extname;
```

**What to look for:**
- Default Supabase extensions (plpgsql, uuid-ossp, pgcrypto)
- pg_cron (expected -- codebase has 2 cron jobs)
- pg_net (if any HTTP calls from SQL)
- pgvector (if any vector/embedding operations)
- Any extension NOT available on Supabase Cloud (migration blocker)
- Compare against Supabase's supported extensions list

**Result:**

[PASTE LOVABLE RESPONSE HERE]

**Analysis:**

[To be filled after results are captured]

---

## Prompt 6: Cron Jobs

**Copy this prompt into Lovable AI chat:**

```
List all pg_cron jobs configured for this project. Please run this query and share the result:
SELECT jobid, schedule, command, nodename, database, active FROM cron.job;
```

**What to look for:**
- Codebase audit found 2 cron-scheduled functions in config.toml
- There may be additional pg_cron jobs created via SQL (not in config.toml)
- For each job: schedule (cron expression), what it runs, whether active
- This fills a known gap from the codebase-only audit

**Result:**

[PASTE LOVABLE RESPONSE HERE]

**Analysis:**

[To be filled after results are captured]

---

## Prompt 7: Realtime Publications

**Copy this prompt into Lovable AI chat:**

```
List all tables included in the supabase_realtime publication. Please run this query and share the result:
SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

**What to look for:**
- Which tables have Realtime enabled
- Frontend uses Supabase Realtime for live updates (chat, notifications, etc.)
- Each listed table needs Realtime re-enabled on the new instance
- Tables NOT in this list do NOT need Realtime configuration

**Result:**

[PASTE LOVABLE RESPONSE HERE]

**Analysis:**

[To be filled after results are captured]

---

## Prompt 8: Auth User Export Feasibility

**Copy this prompt into Lovable AI chat:**

```
I need to migrate user accounts to a new Supabase instance. Is it possible to export the auth.users table including encrypted_password hashes? Can you run this and share the schema:
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' ORDER BY ordinal_position;
Also, how many users are in the auth.users table?
SELECT count(*) FROM auth.users;
```

**What to look for:**
- Schema of auth.users table (columns and types)
- User count (determines migration complexity)
- Whether encrypted_password column is accessible for export
- If passwords can be exported: users can log in without reset after migration
- If passwords CANNOT be exported: need password reset flow or "set new password on first login"
- Presence of custom metadata columns (raw_user_meta_data, raw_app_meta_data)

**Result:**

[PASTE LOVABLE RESPONSE HERE]

**Analysis:**

[To be filled after results are captured]

---

## Summary

**Status:** AWAITING EXECUTION

### Extraction Results Overview

| Prompt | Title | Status | Key Finding |
|--------|-------|--------|-------------|
| 1 | Database Schema | Pending | -- |
| 2 | Configured Secrets | Pending | -- |
| 3 | Storage Buckets | Pending | -- |
| 4 | Database Size | Pending | -- |
| 5 | PostgreSQL Extensions | Pending | -- |
| 6 | Cron Jobs | Pending | -- |
| 7 | Realtime Publications | Pending | -- |
| 8 | Auth User Export | Pending | -- |

### Phase Impact

| Finding | Affects Phase | Impact |
|---------|---------------|--------|
| Database size (Prompt 4) | Phase 2 (Database) | Free vs Pro tier decision |
| Auth export feasibility (Prompt 8) | Phase 2 (Database) | Password migration strategy |
| Extensions list (Prompt 5) | Phase 2 (Database) | Extension enablement during setup |
| Cron jobs (Prompt 6) | Phase 3 (Backend Infra) | pg_cron configuration |
| Realtime tables (Prompt 7) | Phase 3 (Backend Infra) | Realtime publication setup |
| Storage file counts (Prompt 3) | Phase 3 (Backend Infra) | Storage migration volume |
| Secrets list (Prompt 2) | Phase 3 (Backend Infra) | Edge function secret configuration |
| Schema overview (Prompt 1) | Phase 2 (Database) | Schema validation against migrations |

### Open Questions

[To be filled after analysis]

### Blockers Identified

[To be filled after analysis]
