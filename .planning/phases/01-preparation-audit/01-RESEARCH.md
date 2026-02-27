# Phase 1: Preparation & Audit - Research

**Researched:** 2026-02-26
**Domain:** Lovable Cloud project migration preparation -- repo cloning, Supabase project creation, secrets/webhook inventory, Lovable AI extraction
**Confidence:** HIGH

## Summary

Phase 1 is a preparation and audit phase with zero code changes. The work is: (1) clone the source repo locally, (2) create a new Supabase project on supabase.com, (3) build a complete inventory of every secret and webhook URL that must transfer, and (4) use Lovable's AI chat to extract migration-specific instructions and database details that are not accessible through normal Supabase tooling.

The primary technical challenge is that AlphaHub runs on Lovable Cloud, which means the Supabase instance is managed entirely by Lovable -- there is no Supabase dashboard access, no service role key access, and no direct database connection available. This affects how data is exported (CSV via Lovable's Cloud UI, not pg_dump) and means the Lovable AI chat is the primary extraction tool for migration information that would normally come from the Supabase dashboard.

**Primary recommendation:** Execute the three plans in order -- clone and audit first (establishes the codebase to grep), then create Supabase project and build inventories (uses grep results), then Lovable AI extraction last (produces user-actionable prompts for information only Lovable can provide).

## Standard Stack

This phase does not introduce new libraries or frameworks. The tools are standard CLI utilities and the Lovable platform itself.

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| git | System | Clone `itsforren/alpha-agent-flow` repo | Standard source code management |
| Supabase CLI | v2.75.0 (installed) | Create project via CLI or link to manually-created project | Official Supabase project management tool |
| Docker Desktop | v28.0.4 (installed) | Required by Supabase CLI for pg_dump operations (Phase 2) | Dependency of Supabase CLI |
| grep/find | System | Audit codebase for `Deno.env.get()` calls and webhook URLs | Standard text search for inventory building |
| gh CLI | Installed | Verify repo access and metadata | GitHub operations |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Lovable AI Chat | Platform | Extract migration instructions, DB schema details, pg_dump commands | When information is only available from the Lovable-managed Supabase instance |
| Supabase Dashboard | Web | Configure new project after creation | After creating the `alphahub-v2` project |
| supabase login | CLI | Authenticate CLI with supabase.com account | Before `supabase projects create` or `supabase link` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `supabase projects create` (CLI) | Create project via supabase.com web UI | Web UI is simpler for one-off creation -- **recommended for this case** since the user needs to choose org, set password, and capture credentials interactively |
| grep for secrets audit | Manual review of each function | grep is faster and more complete; manual review catches patterns grep misses (e.g., dynamically constructed env var names) |
| Lovable AI chat for DB extraction | $99 Chrome extension (Next Lovable Migrator) | The extension automates migration but gives less visibility into what's happening; manual approach is safer for production billing infrastructure |

## Architecture Patterns

### Phase 1 is a Documentation Phase

Phase 1 produces documents, not code. The "architecture" is the structure of the inventory artifacts.

### Recommended Artifact Structure

```
copy-alphahub/
├── alphahub-v2/                    # Cloned repo (its own git repo)
│   ├── src/                        # Frontend source
│   ├── supabase/
│   │   ├── config.toml             # Edge function config (92 functions)
│   │   ├── functions/              # 92 edge functions
│   │   └── migrations/             # 131 migration files
│   └── .env                        # Old Supabase credentials
├── .planning/
│   ├── phases/01-preparation-audit/
│   │   ├── 01-CONTEXT.md           # User decisions
│   │   ├── 01-RESEARCH.md          # This file
│   │   └── 01-XX-PLAN.md           # Plans (created by planner)
│   └── inventories/                # Phase 1 deliverables
│       ├── SECRETS.md              # Complete secrets inventory
│       ├── WEBHOOKS.md             # Complete webhook/integration inventory
│       ├── CODEBASE.md             # Codebase structure audit
│       └── SUPABASE-PROJECT.md     # New project credentials & config
```

### Pattern: Secrets Inventory Format

**What:** A table mapping every `Deno.env.get()` call to which function uses it, what it's for, and where the actual value lives.
**When to use:** Before Phase 3 (edge function deployment) begins.
**Example:**

```markdown
| Secret Name | Category | Used By (functions) | Value Location | Status |
|-------------|----------|---------------------|----------------|--------|
| MCP_PROXY_SECRET | Security | mcp-proxy | ~/.zprofile (MCP_PROXY_SECRET) | VERIFIED |
| RESEND_API_KEY | Email | billing-collections-run, send-auth-email, send-password-reset | ~/.zprofile (check) | UNVERIFIED |
| ENCRYPTION_KEY | Security | mcp-proxy, others | Supabase vault only? | NEEDS_INVESTIGATION |
```

### Pattern: Webhook Inventory Format

**What:** A table of every external URL that points into AlphaHub (inbound) and must change when the Supabase project changes.
**When to use:** Before Phase 4 (Stripe migration) and Phase 6 (cutover).
**Example:**

```markdown
| Service | Direction | Current URL | New URL Pattern | Where to Update |
|---------|-----------|-------------|-----------------|-----------------|
| Stripe (mgmt) | INBOUND | https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/stripe-webhook | https://[NEW_REF].supabase.co/functions/v1/stripe-webhook | Stripe Dashboard |
| Lead Sources | INBOUND | https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/lead-webhook | https://[NEW_REF].supabase.co/functions/v1/lead-webhook | External lead source config |
```

### Anti-Patterns to Avoid

- **Starting edge function deployment before secrets inventory is complete:** Every missing secret causes silent failures. Complete the inventory first.
- **Assuming the old Supabase project is directly accessible:** Lovable Cloud does NOT expose the Supabase dashboard, service role key, or direct database connection. Use Lovable's AI chat and Cloud UI for extraction.
- **Skipping the codebase audit:** The prior research has inaccuracies (e.g., claimed ~40 Stripe secrets but actual grep finds ZERO Stripe API keys in edge functions). Fresh audit against the actual code is essential.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secrets discovery | Manual function-by-function review | `grep -roh 'Deno\.env\.get(.*)'` across all functions | 92 functions; manual review would miss secrets in less obvious locations |
| Webhook URL discovery | Read every function to find external references | grep for URL patterns, `supabase.co/functions/v1/`, and config.toml entries | Systematic search catches everything |
| Supabase project creation | Complex CLI scripting | supabase.com web UI + `supabase link` | One-time operation; CLI creation requires org-id lookup, region selection |
| Codebase structure mapping | Manual directory listing | `find` + `wc -l` + systematic categorization | Produces consistent, complete output |

**Key insight:** Phase 1 is inventory and setup work. The temptation is to "just start migrating." Resist. Every secret or webhook URL missed in Phase 1 becomes a debugging session in Phase 3 or 4.

## Common Pitfalls

### Pitfall 1: Lovable Cloud Access Limitations

**What goes wrong:** Attempting to use `supabase db dump`, `psql`, or the Supabase dashboard against the Lovable Cloud project. These all fail because Lovable Cloud projects are NOT accessible through standard Supabase tooling.
**Why it happens:** The project ref `qydkrpirrfelgtcqasdx` exists in Lovable's infrastructure, not in the user's Supabase account. Service role keys and direct database URLs are not exposed.
**How to avoid:** Use Lovable's own tools for extraction: (1) Lovable's Cloud UI for CSV data export (Cloud --> Database --> Table --> Export CSV), (2) Lovable's AI chat for schema details and migration-specific instructions, (3) The GitHub-synced repo (already cloned) for code, migrations, and config.
**Warning signs:** "Project not found" errors from Supabase CLI, inability to access the dashboard for the old project, empty responses from `supabase link` with the old project ref.
**Confidence:** HIGH -- verified via Supabase official troubleshooting docs ("Service role and API keys are not accessible for Lovable Cloud-managed projects").

### Pitfall 2: Incomplete Secrets Inventory

**What goes wrong:** The secrets audit finds only the `Deno.env.get()` calls but misses secrets that exist in the Lovable-managed vault but are not referenced in code, or secrets that have different names in `~/.zprofile` vs. what the code expects.
**Why it happens:** Lovable Cloud's secret store is not exportable. The `~/.zprofile` has 74 exported variables, but the naming conventions differ (e.g., `GHL_API_KEY` in zprofile vs. `GHL_AGENCY_API_KEY` in code; `GOOGLE_ADS_MANAGER_CUSTOMER_ID` in zprofile vs. `GOOGLE_ADS_MCC_CUSTOMER_ID` in code).
**How to avoid:** (1) grep the codebase for ALL `Deno.env.get()` calls (done: 38 unique secrets found), (2) cross-reference each name against `~/.zprofile` exports, (3) flag any secret that has no matching zprofile entry for manual investigation, (4) ask Lovable AI chat to list all configured secrets.
**Warning signs:** Secret names in the code that don't exactly match any zprofile export.
**Confidence:** HIGH -- verified by comparing the grep output against `~/.zprofile` exports during this research.

### Pitfall 3: Prior Research Inaccuracies

**What goes wrong:** Planning is based on prior research documents (ARCHITECTURE.md, FEATURES.md) that contain claims not verified against the actual codebase.
**Why it happens:** Prior research may have been done against a different version of the repo, or some claims were inferred rather than verified. Example: ARCHITECTURE.md lists 6 Stripe secrets (`STRIPE_MANAGEMENT_SECRET_KEY`, `STRIPE_AD_SPEND_SECRET_KEY`, etc.) but the actual codebase grep finds ZERO Stripe API keys in any edge function. Stripe interactions appear to happen through the frontend (Stripe.js) and database triggers/functions, not through edge function Deno.env.get() calls.
**How to avoid:** Treat prior research as hypotheses. The Phase 1 codebase audit MUST re-verify every claim by grepping the actual cloned source code.
**Warning signs:** Discrepancies between documented secret counts and grep results; features documented as using edge functions that don't actually exist in the functions directory.
**Confidence:** HIGH -- directly verified during this research session.

### Pitfall 4: Free Tier Limitations

**What goes wrong:** The new Supabase project hits free tier limits during data import (500MB database limit) or edge function deployment (100 functions max, 500K invocations/month).
**Why it happens:** AlphaHub has 111 tables and 92 edge functions. If the database exceeds 500MB, the free tier enters read-only mode. The 92 edge functions are under the 100-function limit but close.
**How to avoid:** (1) Check database size on the old project before importing (ask Lovable AI), (2) Be prepared to upgrade to Pro ($25/mo) if database exceeds 500MB, (3) The 100-function limit on free tier accommodates 92 functions but leaves little room -- plan for Pro if new functions are added.
**Warning signs:** Read-only mode errors during data import, "function limit exceeded" during deployment.
**Confidence:** HIGH -- verified via Supabase pricing documentation (500MB database, 100 functions on free tier).

### Pitfall 5: Stale Clone vs. Fresh Clone

**What goes wrong:** The existing clone at `/Users/forren/workspace/connect-proxis-alphahub/alpha-agent-flow/` is stale (last commit may not match what Lovable is currently serving). The Phase 1 decision is to clone into `./alphahub-v2/` inside copy-alphahub.
**Why it happens:** Lovable syncs to GitHub on each deploy. If Lovable has deployed changes after the last `git pull`, the local clone is behind.
**How to avoid:** Fresh clone from GitHub, not a copy of the existing clone. Verify the clone is up-to-date by checking `git log --oneline -1` against the GitHub repo's latest commit.
**Warning signs:** Different commit hashes between local clone and GitHub.
**Confidence:** HIGH -- standard git workflow concern.

## Code Examples

### Cloning the Repo

```bash
# From the copy-alphahub project directory
cd /Users/forren/workspace/copy-alphahub
git clone https://github.com/itsforren/alpha-agent-flow.git alphahub-v2

# Verify clone
cd alphahub-v2
git log --oneline -1
ls supabase/functions/ | wc -l   # Should be 92
ls supabase/migrations/ | wc -l  # Should be 131
```
Source: Standard git workflow, verified against repo metadata (private repo, confirmed accessible via gh CLI).

### Creating the Supabase Project

```bash
# Option A: Via CLI (requires supabase login first)
supabase login
supabase projects create alphahub-v2 \
  --org-id <ORG_ID> \
  --region us-east-1 \
  --db-password <SECURE_PASSWORD>

# Option B: Via web UI (RECOMMENDED for first-time setup)
# 1. Go to https://supabase.com/dashboard
# 2. Click "New project"
# 3. Select organization
# 4. Name: alphahub-v2
# 5. Region: East US (North Virginia) / us-east-1
# 6. Set database password
# 7. Wait ~2 minutes for provisioning
# 8. Capture: Project URL, anon key, service_role key, project ref

# After creation, link the local project
cd /Users/forren/workspace/copy-alphahub/alphahub-v2
supabase link --project-ref <NEW_PROJECT_REF>
```
Source: Supabase CLI docs (`supabase projects create`, `supabase link`), verified via official documentation.

### Building the Secrets Inventory

```bash
# Extract all unique Deno.env.get() calls from edge functions
cd /Users/forren/workspace/copy-alphahub/alphahub-v2

# Double-quoted strings
grep -roh 'Deno\.env\.get("[^"]*")' supabase/functions/ | \
  sed 's/Deno\.env\.get("//; s/")//' | sort -u > /tmp/secrets_double.txt

# Single-quoted strings
grep -roh "Deno\.env\.get('[^']*')" supabase/functions/ | \
  sed "s/Deno\.env\.get('//; s/')//" | sort -u > /tmp/secrets_single.txt

# Combine and deduplicate
cat /tmp/secrets_double.txt /tmp/secrets_single.txt | sort -u

# Cross-reference with ~/.zprofile
# For each secret, check if a matching export exists
while read secret; do
  match=$(grep -c "export.*${secret}" ~/.zprofile 2>/dev/null || echo 0)
  echo "${secret}: ${match} matches in zprofile"
done < <(cat /tmp/secrets_double.txt /tmp/secrets_single.txt | sort -u)
```
Source: Direct codebase analysis, verified during this research.

### Building the Webhook Inventory

```bash
# Find all edge functions that receive external calls (verify_jwt = false)
grep -A1 '\[functions\.' supabase/config.toml | grep -B1 'verify_jwt = false' | \
  grep '\[functions\.' | sed 's/\[functions\.//; s/\]//'

# Find webhook-receiving functions specifically
ls supabase/functions/ | grep -i "webhook"

# Find functions that reference external URLs
grep -rn "webhook\|callback\|redirect" supabase/functions/ | \
  grep -v "node_modules" | grep -v ".d.ts"
```
Source: Standard codebase analysis patterns.

### Lovable AI Extraction Prompts

These prompts are designed to be pasted into Lovable's AI chat to extract migration-specific information:

```
Prompt 1 (Database Schema):
"I'm migrating this project to my own Supabase instance. Please list every
database table with its column names, types, and any foreign key relationships.
Also list all RLS policies, database functions, and triggers that exist."

Prompt 2 (Secrets):
"List every secret/environment variable configured in the Supabase project
for this app. Include the secret name and which edge function(s) use it.
Do NOT include the actual values."

Prompt 3 (Storage):
"List all storage buckets configured for this project, including whether
each is public or private, and approximately how many files are in each bucket."

Prompt 4 (Database Size):
"What is the total database size for this project? Run:
SELECT pg_size_pretty(pg_database_size(current_database()));"

Prompt 5 (Extensions):
"List all PostgreSQL extensions enabled for this project. Run:
SELECT extname, extversion FROM pg_extension ORDER BY extname;"

Prompt 6 (Cron Jobs):
"List all pg_cron jobs configured for this project. Run:
SELECT jobid, schedule, command, nodename FROM cron.job;"

Prompt 7 (Realtime Publications):
"List all tables included in the supabase_realtime publication. Run:
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';"
```
Source: Derived from Lovable documentation + Supabase migration guides. Confidence: MEDIUM -- Lovable AI's ability to execute arbitrary SQL against the managed database is confirmed by documentation but the exact scope of what it can query is unverified.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Lovable Cloud fully locked | Lovable now provides Cloud UI for CSV export and AI chat for data extraction | 2025 | Makes migration possible without the $99 tool |
| `supabase projects create` not available | CLI supports project creation with `--org-id`, `--region`, `--db-password` flags | Supabase CLI v2.x | Can automate project setup if desired |
| Self-hosting only option for migration | Supabase.com managed projects as migration target | Always available | Simpler than self-hosted Docker setup |

**Deprecated/outdated:**
- Prior research references `supabase seed buckets --linked` as a beta command -- this is for storage migration (Phase 3), not Phase 1. Status remains LOW confidence.
- Prior research claims 98 edge functions -- actual count from the repo is 92. Discrepancy likely due to counting shared modules or index files separately.

## Critical Finding: Stripe Keys Not in Edge Functions

The prior research documents (ARCHITECTURE.md, FEATURES.md) extensively describe Stripe API secret keys as edge function secrets (`STRIPE_MANAGEMENT_SECRET_KEY`, `STRIPE_AD_SPEND_SECRET_KEY`, `STRIPE_MANAGEMENT_WEBHOOK_SECRET`, `STRIPE_AD_SPEND_WEBHOOK_SECRET`). However, grepping the actual edge function source code finds **zero** `Deno.env.get()` calls for any Stripe-related secret.

**Implication:** Stripe API interactions likely happen through:
1. The frontend using Stripe.js (publishable keys in `VITE_STRIPE_*` env vars)
2. Database functions or triggers that call Stripe APIs using stored credentials
3. The `stripe-webhook` edge function processes incoming webhooks but does NOT verify signatures using a webhook secret (it just parses the JSON payload)

This is a significant finding that needs verification during the codebase audit. If Stripe keys are stored in database tables (e.g., `billing_settings` or similar) rather than as Deno secrets, the migration approach for Stripe changes significantly.

**Confidence:** MEDIUM -- the grep is definitive (no `Deno.env.get()` calls for Stripe keys), but the alternative location of Stripe keys needs investigation.

## Complete Secrets Inventory (from grep)

38 unique `Deno.env.get()` calls found across 92 edge functions:

### Auto-Set by Supabase (no manual configuration needed)
| Secret | Category |
|--------|----------|
| SUPABASE_URL | Platform |
| SUPABASE_SERVICE_ROLE_KEY | Platform |
| SUPABASE_ANON_KEY | Platform |

### Must Be Manually Set (35 secrets)

| Secret | Category | zprofile Match | Status |
|--------|----------|----------------|--------|
| CONVERSION_API_KEY | Tracking | CONVERSION_API_KEY | LIKELY MATCH |
| ENCRYPTION_KEY | Security | GHL_ENCRYPTION_KEY? | NAME MISMATCH -- investigate |
| FATHOM_API_KEY | Analytics | Not found | NEEDS INVESTIGATION |
| GHL_AGENCY_API_KEY | CRM | GHL_API_KEY? | NAME MISMATCH -- investigate |
| GHL_CLIENT_ID | CRM | GHL_CLIENT_ID | LIKELY MATCH |
| GHL_CLIENT_SECRET | CRM | GHL_CLIENT_SECRET | LIKELY MATCH |
| GHL_COMPANY_ID | CRM | GHL_COMPANY_ID | LIKELY MATCH |
| GHL_INSTALL_URL | CRM | Not found | NEEDS INVESTIGATION |
| GHL_PROSPECT_WEBHOOK_URL | CRM | Not found | NEEDS INVESTIGATION |
| GHL_REDIRECT_URI | CRM | GHL_REDIRECT_URI | LIKELY MATCH |
| GHL_SAAS_PLAN_ID | CRM | GHL_SAAS_PLAN_ID | LIKELY MATCH |
| GHL_STAGE_WEBHOOK_URL | CRM | Not found | NEEDS INVESTIGATION |
| GOOGLE_ADS_CLIENT_ID | Ads | GOOGLE_ADS_CLIENT_ID | LIKELY MATCH |
| GOOGLE_ADS_CLIENT_SECRET | Ads | GOOGLE_ADS_CLIENT_SECRET | LIKELY MATCH |
| GOOGLE_ADS_DEVELOPER_TOKEN | Ads | GOOGLE_ADS_DEVELOPER_TOKEN | LIKELY MATCH |
| GOOGLE_ADS_MCC_CUSTOMER_ID | Ads | GOOGLE_ADS_MANAGER_CUSTOMER_ID | NAME MISMATCH -- investigate |
| GOOGLE_ADS_REFRESH_TOKEN | Ads | GOOGLE_ADS_REFRESH_TOKEN | LIKELY MATCH |
| LOVABLE_API_KEY | AI | Not found | NEEDS INVESTIGATION -- may be Lovable-specific, not needed in new project |
| MASTER_TWILIO_ACCOUNT_SID | Phone | Not found | NEEDS INVESTIGATION |
| MASTER_TWILIO_AUTH_TOKEN | Phone | Not found | NEEDS INVESTIGATION |
| MCP_PROXY_SECRET | Security | MCP_PROXY_SECRET | LIKELY MATCH |
| ONBOARDING_BRIDGE_KEY | Security | ONBOARDING_BRIDGE_KEY | LIKELY MATCH |
| PLAID_CLIENT_ID | Banking | Not found | NEEDS INVESTIGATION |
| PLAID_ENV | Banking | Not found | NEEDS INVESTIGATION |
| PLAID_SECRET | Banking | Not found | NEEDS INVESTIGATION |
| PUBLIC_APP_URL | Config | Not found | NEEDS INVESTIGATION -- will be new URL |
| RESEND_API_KEY | Email | Not found | NEEDS INVESTIGATION |
| SLACK_ADS_MANAGER_SIGNING_SECRET | Notifications | Not found | NEEDS INVESTIGATION |
| SLACK_ADS_MANAGER_WEBHOOK_URL | Notifications | SLACK_WEBHOOK_URL? | NAME MISMATCH -- investigate |
| SLACK_CHAT_WEBHOOK_URL | Notifications | SLACK_WEBHOOK_URL? | NAME MISMATCH -- investigate |
| TWILIO_ACCOUNT_SID | Phone | TWILIO_ACCOUNT_SID | LIKELY MATCH |
| TWILIO_AUTH_TOKEN | Phone | TWILIO_AUTH_TOKEN | LIKELY MATCH |
| TWILIO_PHONE_NUMBER | Phone | Not found | NEEDS INVESTIGATION |
| WEBFLOW_API_TOKEN | CMS | WEBFLOW_API_KEY? | NAME MISMATCH -- investigate |
| WEBFLOW_SITE_ID | CMS | WEBFLOW_SITE_ID | LIKELY MATCH |

**Summary:** 15 secrets likely match zprofile exports exactly. 6 have name mismatches that need verification. 14 are not found in zprofile and need investigation (may be in Lovable vault only, or may have different naming).

## Lovable Cloud Migration: Key Constraints

### What Lovable Cloud Does NOT Provide
1. **No Supabase dashboard access** -- the managed project does not appear in the user's supabase.com account
2. **No service role key** -- cannot be retrieved for Lovable Cloud projects
3. **No direct database connection** -- no `psql` access, no connection string
4. **No `supabase db dump`** -- cannot run against the managed instance
5. **No secret export** -- no way to list or export secret values from Lovable's vault

### What Lovable Cloud DOES Provide
1. **GitHub sync** -- full codebase including `supabase/migrations/`, `supabase/functions/`, `supabase/config.toml`
2. **Cloud UI CSV export** -- per-table CSV data export via Cloud --> Database --> Table --> Export CSV
3. **AI chat** -- can query the database, inspect schema, and provide migration instructions
4. **Migration files** -- 131 chronologically-ordered SQL migrations that can be applied to a new project

### Migration Strategy for Lovable Cloud

Since `pg_dump` is not available, the migration uses:

**For schema:** Apply the 131 migration files from `supabase/migrations/` to the new project using `supabase db push` (after linking to the new project).

**For data:** Two options:
1. CSV export from Lovable Cloud UI (table by table) + CSV import to new Supabase project
2. Ask Lovable AI to generate pg_dump-compatible SQL for each table (unverified capability)

**For auth users:** Ask Lovable AI whether auth.users can be exported, or plan for password resets if auth data cannot be extracted.

**For secrets:** Manual inventory (grep + zprofile cross-reference, as done above) since Lovable does not export secret values.

## Supabase Project Creation Details

### Region
- **Decision (locked):** US East (Virginia) = `us-east-1`
- Confirmed available in Supabase's region list

### Plan
- **Decision (locked):** Start on Free tier
- Free tier limits: 500MB database, 1GB storage, 100 edge functions (92 currently), 500K edge function invocations/month, 50K MAU
- Upgrade to Pro ($25/mo) if database exceeds 500MB during data import
- Pro tier: 8GB database, 100GB storage, unlimited functions

### Project Name
- **Decision (locked):** `alphahub-v2`

### Credentials to Capture
After project creation, capture and store:
1. Project reference ID (e.g., `xyzabc1234567890`)
2. Project URL (`https://[ref].supabase.co`)
3. Anon key (public, safe for frontend)
4. Service role key (secret, for backend/CLI operations)
5. Database password (set during creation)
6. Direct database connection string (Settings --> Database)
7. JWT secret (Settings --> API --> JWT Settings) -- needed for auth migration decision in Phase 2

## Open Questions

1. **Lovable AI chat capabilities for SQL execution**
   - What we know: Lovable AI chat is documented as "agentic" and can "query the database." The Cloud UI has a database management interface.
   - What's unclear: Whether Lovable AI can execute arbitrary `SELECT` statements against the managed Supabase instance (e.g., `SELECT * FROM pg_extension`, `SELECT * FROM cron.job`, `SELECT pg_size_pretty(pg_database_size(current_database()))`)
   - Recommendation: Test with a simple query first. If Lovable AI can run SQL, it unlocks the ability to extract schema details, extension lists, cron jobs, and Realtime publications directly. If not, these must be inferred from the migration files and config.toml.
   - Confidence: LOW -- documented capability but execution scope unverified

2. **Stripe API key location**
   - What we know: Zero `Deno.env.get()` calls for Stripe-related keys in edge functions. Frontend uses `VITE_STRIPE_*` publishable keys (from `.env`).
   - What's unclear: Where are the Stripe secret keys stored? Options: (a) database table, (b) Lovable vault only (not referenced in code), (c) the billing system may work differently than assumed -- possibly using Stripe.js Payment Elements entirely client-side with no server-side Stripe SDK.
   - Recommendation: During codebase audit, search for `sk_live`, `sk_test`, `whsec_`, `stripe.com/v1`, and Stripe SDK imports to determine how Stripe's server-side API is accessed. Also check if the `billing_records` table has fields suggesting server-side Stripe API calls.
   - Confidence: MEDIUM -- the grep result is definitive, but the alternative mechanism needs investigation

3. **Auth user migration from Lovable Cloud**
   - What we know: Lovable docs state "user passwords require reset flows" for migration. Standard Supabase migration preserves bcrypt password hashes via pg_dump of auth schema.
   - What's unclear: Whether Lovable Cloud allows pg_dump of the auth schema, or whether all users must reset passwords post-migration.
   - Recommendation: Ask Lovable AI chat whether auth.users data (including encrypted_password) can be exported. If not, plan for a password reset flow for ~15 users during cutover.
   - Confidence: LOW -- contradictory signals between general Supabase docs and Lovable-specific limitations

4. **LOVABLE_API_KEY purpose**
   - What we know: One edge function uses `Deno.env.get("LOVABLE_API_KEY")` -- appears to be the `generate-agent-bio` function.
   - What's unclear: Whether this is a Lovable platform API key or something else. If it's Lovable-specific, it may not be needed (or available) after migration.
   - Recommendation: Check the `generate-agent-bio` function to determine what `LOVABLE_API_KEY` is used for. It may call Lovable's AI API for bio generation, in which case a different AI API key would be needed post-migration.
   - Confidence: MEDIUM

## Sources

### Primary (HIGH confidence)
- Supabase CLI docs: [supabase projects create](https://supabase.com/docs/reference/cli/supabase-projects-create), [supabase link](https://supabase.com/docs/reference/cli/supabase-link)
- Supabase troubleshooting: [Can't Access Supabase Project When Using Lovable Cloud](https://supabase.com/docs/guides/troubleshooting/cant-access-supabase-project-lovable-cloud) -- confirms no dashboard/credential access for Lovable Cloud projects
- Supabase regions: [Available regions](https://supabase.com/docs/guides/platform/regions) -- confirmed `us-east-1` for US East (Virginia)
- Supabase pricing: [Pricing & Fees](https://supabase.com/pricing) -- confirmed free tier limits
- Direct codebase analysis of `/Users/forren/workspace/connect-proxis-alphahub/alpha-agent-flow/` -- 92 edge functions, 131 migrations, 38 unique Deno.env.get() secrets

### Secondary (MEDIUM confidence)
- Lovable docs: [Self-hosting](https://docs.lovable.dev/tips-tricks/self-hosting), [External deployment](https://docs.lovable.dev/tips-tricks/external-deployment-hosting) -- migration steps for Lovable Cloud to managed Supabase
- Lovable docs: [Cloud](https://docs.lovable.dev/integrations/cloud) -- confirms managed Supabase limitations
- Supabase docs: [Identify Lovable backend](https://supabase.com/docs/guides/troubleshooting/identify-lovable-cloud-or-supabase-backend) -- how to determine if project uses Lovable Cloud

### Tertiary (LOW confidence)
- Lovable AI chat capabilities for SQL execution -- documented as agentic but unverified scope
- Next Lovable Migrator Chrome extension -- third-party tool, $99, not recommended for production billing infrastructure

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools are installed and verified (Supabase CLI v2.75.0, Docker v28.0.4, gh CLI, git)
- Architecture: HIGH -- artifact structure based on locked decisions from CONTEXT.md
- Pitfalls: HIGH -- 5 pitfalls identified, 4 verified against official documentation, 1 verified via direct codebase analysis
- Secrets inventory: HIGH -- grep results are definitive; cross-reference with zprofile shows 15 matches, 6 name mismatches, 14 needing investigation
- Lovable Cloud constraints: HIGH -- confirmed via official Supabase troubleshooting docs

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable -- tools and platform capabilities change slowly)
