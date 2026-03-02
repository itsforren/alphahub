# Phase 6: Cutover & Verification - Research

**Researched:** 2026-03-02
**Domain:** Production cutover, delta data sync, DNS switching, webhook migration, automated feature verification, MCP server update
**Confidence:** HIGH

## Summary

Phase 6 is the final phase of the AlphaHub migration from Lovable to self-managed infrastructure. The new backend (Supabase project `qcunascacayiiuufjtaq`) is already running with 106 edge functions deployed, Stripe webhooks actively processing payments, and the frontend live at `hub.alphaagent.io` on Vercel. The old system (`qydkrpirrfelgtcqasdx`) is still receiving user logins and some webhook traffic. The primary work is: (1) full re-sync of data from old to new, (2) switch all 17 remaining external webhook URLs, (3) disable old Stripe endpoints, (4) automated verification of all 7 core features, (5) update the MCP server, and (6) fix hardcoded URLs in edge functions.

The decision is a **full re-sync** approach: wipe new DB data and re-import everything from the old system right before cutover. This avoids the complexity of incremental delta sync. The bridge function (`db-migration-bridge` on the old project) is still active and was used successfully in Phase 2 for the initial data transfer of 65,000+ rows across 78 non-empty tables (94 total). The same bridge function pattern can be reused.

The cutover sequence follows a gradual transition: fix urgent lead routing first, then verify Stripe billing, then data re-sync, then DNS switch, then feature verification, then MCP update. No maintenance window or user downtime is planned -- the old system stays live during re-sync with an accepted small data gap.

**Primary recommendation:** Reuse the Phase 2 bridge function for data re-sync (proven pattern for 94 tables), build automated verification scripts that call the mcp-proxy and check JSON responses against expected schemas, then update the MCP server's single environment variable.

## Standard Stack

This phase is an operations/configuration/scripting phase, not a library integration phase. No new libraries are needed.

### Core
| Tool | Purpose | Why Standard |
|------|---------|--------------|
| Bridge function (`db-migration-bridge`) | Re-sync all data from old to new DB | Already proven in Phase 2 -- transferred 65,000+ rows, handles array columns, JSONB |
| Supabase Management API | Execute SQL on new project | Used throughout Phase 2-4 for verification queries |
| `curl` / `fetch` | Call edge functions for verification | Standard HTTP testing pattern used in all prior phases |
| Supabase CLI | Deploy updated functions, manage secrets | Used in Phases 3-4 for all backend operations |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `scripts/migrate-storage.ts` | Re-run storage migration if needed | If new files were added to old storage since Phase 3 |
| Stripe Dashboard | Disable old webhook endpoints | Human operation during cutover |
| Hostinger DNS | DNS configuration (already done for `hub.`) | Only if bare `alphaagent.io` domain needs updating |
| Vercel Dashboard | Environment variable updates | Only if frontend env vars need changes |

### No Library Changes Needed
All operations use existing tools: the bridge function (deployed on old project), Supabase CLI (already configured), and standard HTTP calls. The MCP server update is a single config change in `~/.claude.json`.

## Architecture Patterns

### Pattern 1: Full Re-Sync via Bridge Function (LOCKED DECISION)

**What:** Wipe all data from the 94 public tables on the new DB, then re-import everything from the old DB using the existing bridge function. Auth data is NOT re-synced (already correct from Phase 2 and no auth changes expected).

**Why this approach:**
- Clean slate -- no merging conflicts with webhook-generated data on the new system
- Bridge function already handles all 94 tables including array columns and JSONB
- Phase 2 proved this works: 78 non-empty tables, 65,000+ rows in ~90 minutes
- The 209 stale pending billing_records are wiped automatically as part of the re-sync

**Sequence:**
```
1. TRUNCATE all 94 public tables on new DB (CASCADE to handle foreign keys)
2. Disable triggers: SET session_replication_role = 'replica'
3. Run bridge function for each non-empty table (same as Phase 2)
4. Re-enable triggers: SET session_replication_role = 'origin'
5. Verify row counts match
```

**Known bridge function limitations from Phase 2:**
- Array columns need staging approach (ALTER to TEXT, copy, ALTER back)
- 8 tables affected: agreements, call_logs, campaign_audit_log, campaigns, decision_events, proposals, referral_commission_config, support_agents
- JSONB array serialization bug in agreements.focus_events (3 rows NULLed -- minor, accepted)
- GENERATED ALWAYS columns in PG 17 auth tables (NOT relevant here since we skip auth re-sync)

**Bridge function endpoint:** `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/db-migration-bridge`

### Pattern 2: Automated Feature Verification via mcp-proxy

**What:** Call the mcp-proxy edge function with each tool name, check the response is valid JSON with expected structure, and report pass/fail.

**Why:** The mcp-proxy already implements all 7 core features as callable tools. A verification script that exercises each tool and validates the response covers all features without needing to click through the UI.

**How it works:**
```bash
# Each verification call follows this pattern:
curl -s -X POST "https://qcunascacayiiuufjtaq.supabase.co/functions/v1/mcp-proxy" \
  -H "Content-Type: application/json" \
  -H "x-mcp-secret: ${MCP_PROXY_SECRET}" \
  -d '{"tool": "list_clients", "params": {"limit": 5}}' \
  | jq '.result' | jq 'length > 0'
```

**Tools covering each feature area:**

| Feature | MCP Tools | Pass Criteria |
|---------|-----------|---------------|
| Client Management | `list_clients`, `search_clients`, `get_client_detail` | Returns non-empty JSON with client data |
| Billing | `get_billing_summary`, `get_stripe_invoices`, `get_stripe_charges` | Returns financial summaries with numeric amounts |
| Ad Spend Wallets | `get_ad_spend_overview` | Returns wallet balances and burn rates |
| Campaign Health | `get_campaign_health` | Returns campaign data with health scores |
| Lead Pipeline | `get_lead_pipeline` | Returns lead counts and funnel metrics |
| Communications | `get_communications` | Returns chat/ticket data |
| Financial Projections | `get_financial_projections`, `get_alerts` | Returns projections and alert data |

**Total tools to verify:** ~50 tools in mcp-proxy (the success criteria says 52, close alignment with the ~50 unique case statements in the switch block). The MCP client wrapper exposes 16 of these as named tools.

### Pattern 3: MCP Server Update (Single Config Change)

**What:** Update the `SUPABASE_URL` in `~/.claude.json` from the old project URL to the new one.

**Current config (from `~/.claude.json`):**
```json
"alphahub": {
  "command": "node",
  "args": ["/Users/forren/workspace/alphahub-mcp/build/index.js"],
  "env": {
    "SUPABASE_URL": "https://qydkrpirrfelgtcqasdx.supabase.co",
    "MCP_PROXY_SECRET": "${MCP_PROXY_SECRET}"
  }
}
```

**Target config:**
```json
"alphahub": {
  "command": "node",
  "args": ["/Users/forren/workspace/alphahub-mcp/build/index.js"],
  "env": {
    "SUPABASE_URL": "https://qcunascacayiiuufjtaq.supabase.co",
    "MCP_PROXY_SECRET": "${MCP_PROXY_SECRET}"
  }
}
```

**Architecture:** The MCP client (`alphahub-mcp`) is a thin Node.js wrapper that calls `callTool()` which POSTs to `${SUPABASE_URL}/functions/v1/mcp-proxy`. The `MCP_PROXY_SECRET` is the same value on both projects (set during Phase 3). Only the URL changes.

**Source files:**
- Config: `/Users/forren/.claude.json` (mcpServers.alphahub.env.SUPABASE_URL)
- Client code: `/Users/forren/workspace/alphahub-mcp/src/supabase.ts` (reads `process.env.SUPABASE_URL`)
- No code changes needed -- just the config URL

### Pattern 4: External Webhook URL Switchover (All at Once)

**What:** Update all 17 inbound webhook URLs from old project to new project in their respective external services.

**Complete list from WEBHOOKS.md:**

| # | Service | Function | Where to Update | Priority |
|---|---------|----------|-----------------|----------|
| 1 | Stripe Management | stripe-billing-webhook | Already done (Phase 4) | DONE |
| 2 | Stripe Ad Spend | stripe-billing-webhook | Already done (Phase 4) | DONE |
| 3 | Stripe Legacy | stripe-webhook | Stripe Dashboard (check both) | HIGH |
| 4 | Stripe Disputes | dispute-webhook | Stripe Dashboard (check both) | HIGH |
| 5 | GHL OAuth | crm-oauth-callback | GHL Marketplace App Settings | HIGH |
| 6 | GHL Lead Status | lead-status-webhook | GHL Workflow Settings | HIGH |
| 7 | Lead Sources | lead-webhook | Each lead source config | HIGH |
| 8 | Form Submissions | submit-webhook | External form configs | HIGH |
| 9 | Agent Onboarding | agent-onboarding-webhook | External AI agent config | HIGH |
| 10 | Agent Updates | agent-update-webhook | External agent service | MEDIUM |
| 11 | Prospect Booking | prospect-booking-webhook | Booking platform settings | MEDIUM |
| 12 | Prospect Abandoned | prospect-abandoned-webhook | Tracking service settings | MEDIUM |
| 13 | Fathom AI | fathom-webhook | Fathom dashboard | MEDIUM |
| 14 | Slack Interactive | slack-ads-actions | Slack App Settings | MEDIUM |
| 15 | Tracking Script | tracking-script | External sites with embed | MEDIUM |
| 16 | MCP Proxy | mcp-proxy | ~/.claude.json (handled separately) | MEDIUM |
| 17 | Test Lead | send-test-lead | Internal tools | LOW |

**Key insight:** Stripe billing webhooks (#1, #2) are ALREADY switched to the new URL from Phase 4. The remaining 15 need to be switched. Per CONTEXT.md decision: all switched at once during the cutover window.

**Auto-updating (no action needed):**
- Internal function-to-function calls (19+) use `SUPABASE_URL` env var which auto-resolves
- Outbound webhooks (Slack, GHL outbound) point TO external services, not from them
- `onboarding-bridge` called internally via `SUPABASE_URL`
- `track-event` called by `tracking-script` which builds URL from `SUPABASE_URL`

### Pattern 5: Hardcoded URL Fixes in Edge Functions

**What:** Several edge functions have hardcoded URLs pointing to old domains. These need code updates and redeployment.

**Inventory of hardcoded URLs requiring changes:**

| File | Line | Current Value | Target Value |
|------|------|---------------|--------------|
| `send-password-reset/index.ts` | 185 | `https://alphaagent.io/reset-password` | `https://hub.alphaagent.io/reset-password` |
| `send-password-reset/index.ts` | 198 | `https://alphaagent.io/reset-password` | `https://hub.alphaagent.io/reset-password` |
| `crm-oauth-callback/index.ts` | 159 | `https://alphaagent.io/hub/admin/ghl-bridge?success=true` | `https://hub.alphaagent.io/hub/admin/ghl-bridge?success=true` |
| `chat-notification/index.ts` | 185 | `https://alphaagent.io` | `https://hub.alphaagent.io` |
| `create-user-account/index.ts` | 162 | `.lovable.app` redirect construction | `https://hub.alphaagent.io/auth/reset-password` |
| `morning-review-job/index.ts` | 1461,1535 | `https://alpha-agent-flow.lovable.app` | `https://hub.alphaagent.io` |
| `ads-manager-slack-test/index.ts` | 85 | `https://alpha-agent-flow.lovable.app` | `https://hub.alphaagent.io` |

**Note:** `morning-review-job` uses `PUBLIC_APP_URL` env var with Lovable URL as fallback. Setting `PUBLIC_APP_URL=https://hub.alphaagent.io` as a Supabase secret would fix this without code change. But `send-password-reset`, `crm-oauth-callback`, `chat-notification`, and `create-user-account` have hardcoded strings that require code edits.

### Anti-Patterns to Avoid

- **Merging old and new data instead of full re-sync:** The decision is clean-slate re-import. Do not attempt to diff/merge -- the bridge function doesn't support it and the stale billing records would contaminate the result.
- **Re-syncing auth data:** Auth users are already correct on the new project (Phase 2). Re-importing would break any sessions or tokens that have been issued since then. Only public tables are re-synced.
- **Reverting to old system on failure:** The decision is "fix forward." Old Stripe endpoints are disabled during cutover. Going back would mean re-enabling them and losing any new webhook data.
- **Switching DNS before verification:** All 7 features must pass automated verification BEFORE DNS switch. The frontend is already accessible at `hub.alphaagent.io` -- no DNS change needed for the hub subdomain.
- **Forgetting to update `PUBLIC_APP_URL` secret:** Morning review Slack messages will contain Lovable URLs unless this secret is set.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Data re-sync | New migration script | Existing bridge function | Already proven for 94 tables, handles edge cases (arrays, JSONB) |
| Feature verification | Manual click-through | Automated mcp-proxy calls | 50+ tools, repeatable, scriptable, produces pass/fail report |
| Row count verification | Manual table-by-table | SQL query against pg_stat_user_tables | 94 tables -- manual counting is error-prone |
| Webhook URL pattern | Custom URL rewriter | Simple find/replace: `qydkrpirrfelgtcqasdx` -> `qcunascacayiiuufjtaq` | All URLs follow the same pattern |
| MCP server update | Code changes to MCP client | Config change in ~/.claude.json | The client code already reads SUPABASE_URL from env |

**Key insight:** Phase 6 is the culmination of all prior phases. Almost every tool needed has already been built and tested. The bridge function, the Management API query pattern, the Supabase CLI secret management, and the mcp-proxy verification endpoint are all proven.

## Common Pitfalls

### Pitfall 1: Foreign Key Constraint Failures During TRUNCATE
**What goes wrong:** TRUNCATE on parent tables fails due to foreign key references from child tables.
**Why it happens:** 94 tables have complex FK relationships (clients -> billing_records -> wallet_transactions, etc.).
**How to avoid:** Use `TRUNCATE ... CASCADE` which recursively truncates all dependent tables. Alternatively, TRUNCATE tables in reverse dependency order. The CASCADE approach is simpler and safer.
**Warning signs:** `ERROR: cannot truncate a table referenced in a foreign key constraint`

### Pitfall 2: Bridge Function Timeout on Large Tables
**What goes wrong:** Bridge function times out on tables with many rows (visitor_events has 41,749 rows, leads has 4,491).
**Why it happens:** Supabase edge functions have a default timeout (varies by plan: 60s on free, 400s on Pro).
**How to avoid:** The project is now on Pro plan (400s timeout). For very large tables, batch the transfer in chunks (e.g., 1000 rows at a time with offset/limit). Phase 2 successfully transferred all tables including the large ones.
**Warning signs:** HTTP 504 Gateway Timeout from bridge function

### Pitfall 3: Stale Cron Data After Re-Sync
**What goes wrong:** The auto-recharge cron (every 30 min) runs during the re-sync window, creating new billing records on the new DB that get wiped by the re-sync TRUNCATE.
**Why it happens:** Cron jobs run on pg_cron on the new project and will fire during the re-sync.
**How to avoid:** Temporarily disable the 6 cron jobs before starting the TRUNCATE, then re-enable after re-sync completes. Use `SELECT cron.unschedule('job_name')` and `SELECT cron.schedule(...)` to toggle.
**Warning signs:** Billing records appearing then disappearing during re-sync

### Pitfall 4: Webhook Events Lost During Re-Sync Window
**What goes wrong:** Stripe webhook events arrive at the new endpoint during TRUNCATE/re-import. The webhook handler tries to update records that have been truncated, fails silently, and the event is lost.
**Why it happens:** Stripe sends webhook events in real-time. The new endpoints are already active (Phase 4).
**How to avoid:** This is an accepted risk per CONTEXT.md ("accept small gap of missed writes during sync"). Stripe will retry failed webhook deliveries for up to 3 days. After re-sync completes and handlers succeed, retried events will be processed. The idempotency guards prevent double-processing.
**Warning signs:** Stripe Dashboard showing failed delivery attempts during re-sync window

### Pitfall 5: Not Updating PUBLIC_APP_URL Secret
**What goes wrong:** Slack morning review messages and ads manager test messages contain links to `alpha-agent-flow.lovable.app` instead of `hub.alphaagent.io`.
**Why it happens:** The `PUBLIC_APP_URL` secret was never set on the new project, and the code falls back to the hardcoded Lovable URL.
**How to avoid:** Set the secret: `supabase secrets set PUBLIC_APP_URL=https://hub.alphaagent.io --project-ref qcunascacayiiuufjtaq`
**Warning signs:** Clicking links in Slack morning review leads to Lovable URL

### Pitfall 6: Forgetting to Disable Old Stripe Endpoints
**What goes wrong:** Both old and new Stripe endpoints remain active. The old project processes events and writes to the old DB (which nobody checks). New project also processes. No data loss, but the old project continues to incur unnecessary function invocations.
**Why it happens:** Old endpoints were deliberately kept active as fallback in Phase 4.
**How to avoid:** Disable old endpoints in Stripe Dashboard immediately during cutover. Both accounts, all endpoint types.
**Warning signs:** Old project Supabase dashboard showing edge function invocations after cutover

### Pitfall 7: Hardcoded Email From Address
**What goes wrong:** Not a URL issue, but `ticket-notification` sends from `notifications@alphaagent.io`. This depends on DNS MX records and Resend domain verification for `alphaagent.io`.
**Why it happens:** Email sending uses the Resend API with a verified domain.
**How to avoid:** Verify `alphaagent.io` is configured in Resend dashboard with correct DNS records. This is likely already working since it was working on the old system.
**Warning signs:** Email delivery failures from ticket notifications

## Code Examples

### Data Re-Sync: TRUNCATE All Public Tables
```sql
-- Source: Phase 2 approach adapted for re-sync
-- Run via Supabase Management API: POST /v1/projects/qcunascacayiiuufjtaq/database/query

-- Step 1: Disable cron jobs
SELECT cron.unschedule('auto-recharge-run');
SELECT cron.unschedule('prospect-inactivity-check');
SELECT cron.unschedule('sync-all-google-ads');
SELECT cron.unschedule('check-low-balance');
SELECT cron.unschedule('hourly-approval-reminder');
SELECT cron.unschedule('morning-review-job');

-- Step 2: Disable triggers
SET session_replication_role = 'replica';

-- Step 3: TRUNCATE all public tables (CASCADE handles FK dependencies)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN ('schema_migrations')
  LOOP
    EXECUTE format('TRUNCATE TABLE public.%I CASCADE', tbl);
  END LOOP;
END $$;

-- Step 4: Re-import data via bridge function (same as Phase 2)
-- Step 5: Re-enable triggers
SET session_replication_role = 'origin';

-- Step 6: Re-schedule cron jobs (use original schedules from Phase 3)
```

### Automated Verification Script Pattern
```bash
#!/bin/bash
# Verification script calling mcp-proxy tools
# Pattern: call tool, check for non-error response, report pass/fail

SUPABASE_URL="https://qcunascacayiiuufjtaq.supabase.co"
MCP_SECRET="${MCP_PROXY_SECRET}"
PASS=0
FAIL=0

verify_tool() {
  local tool="$1"
  local params="${2:-{}}"
  local response

  response=$(curl -s -w "\n%{http_code}" -X POST \
    "${SUPABASE_URL}/functions/v1/mcp-proxy" \
    -H "Content-Type: application/json" \
    -H "x-mcp-secret: ${MCP_SECRET}" \
    -d "{\"tool\": \"${tool}\", \"params\": ${params}}")

  local http_code=$(echo "$response" | tail -1)
  local body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ] && echo "$body" | jq -e '.result' > /dev/null 2>&1; then
    echo "PASS: ${tool}"
    PASS=$((PASS + 1))
  else
    echo "FAIL: ${tool} (HTTP ${http_code})"
    FAIL=$((FAIL + 1))
  fi
}

# Feature 1: Client Management
verify_tool "list_clients" '{"limit": 5}'
verify_tool "search_clients" '{"query": "warren"}'
verify_tool "get_client_detail" '{"client_name": "James Warren"}'

# Feature 2: Billing
verify_tool "get_billing_summary" '{}'
verify_tool "get_stripe_invoices" '{"limit": 5}'
verify_tool "get_stripe_charges" '{"limit": 5}'

# Feature 3: Ad Spend Wallets
verify_tool "get_ad_spend_overview" '{}'

# Feature 4: Campaign Health
verify_tool "get_campaign_health" '{}'

# Feature 5: Lead Pipeline
verify_tool "get_lead_pipeline" '{}'

# Feature 6: Communications
verify_tool "get_communications" '{"limit": 5}'

# Feature 7: Financial Projections & Alerts
verify_tool "get_financial_projections" '{}'
verify_tool "get_alerts" '{}'

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
```

### MCP Server Config Update
```json
// File: ~/.claude.json
// Change mcpServers.alphahub.env.SUPABASE_URL from:
"SUPABASE_URL": "https://qydkrpirrfelgtcqasdx.supabase.co"
// To:
"SUPABASE_URL": "https://qcunascacayiiuufjtaq.supabase.co"
```

### Hardcoded URL Fix Example
```typescript
// send-password-reset/index.ts
// BEFORE:
redirectTo: 'https://alphaagent.io/reset-password'
// AFTER:
redirectTo: 'https://hub.alphaagent.io/reset-password'

// crm-oauth-callback/index.ts
// BEFORE:
const redirectUrl = 'https://alphaagent.io/hub/admin/ghl-bridge?success=true';
// AFTER:
const redirectUrl = 'https://hub.alphaagent.io/hub/admin/ghl-bridge?success=true';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Lovable-hosted app at alpha-agent-flow.lovable.app | Vercel at hub.alphaagent.io | Phase 5 (2026-02-28) | Frontend independent of Lovable |
| Old Supabase project (Lovable-managed) | New Supabase project (self-managed, Pro plan) | Phase 2-3 (2026-02-27) | Full control over backend |
| Single Stripe webhook endpoint per account | Event Destinations (Snapshot + Thin pairs) | Phase 4 (2026-03-02) | Modern Stripe webhook architecture |
| Bridge function on old project for data transfer | Same bridge function, reused for re-sync | Phase 2 pattern | Proven, reliable |

**Still active on old system (to be decommissioned):**
- `db-migration-bridge` edge function (needed for re-sync, delete after)
- Old Stripe webhook endpoints (disable during cutover)
- Old Supabase project receiving user logins (stop after DNS/auth switch)
- `migration-temp@test.com` auth user on old project (cleanup during decommission)

## Investigation Results

### RESOLVED: DNS Situation
The ROADMAP says "DNS for alphaagent.io resolves to the new frontend deployment." In practice, the deployment is at `hub.alphaagent.io` (subdomain), not the bare domain. Phase 5 already configured the CNAME: `hub -> cname.vercel-dns.com` at Hostinger. The CUT-03 requirement is effectively already done. The bare `alphaagent.io` domain may point to a marketing site or other service -- this is outside migration scope.

### RESOLVED: MCP Tool Count
The ROADMAP success criteria says "all 52 tools respond correctly." The mcp-proxy has approximately 50 unique tool cases in its switch statement (verified by grep). The MCP client wrapper (`alphahub-mcp`) exposes 16 tools as named MCP tools. The difference is that some mcp-proxy tools are only accessible via direct API call (bulk_query, run_query, list_tools, etc.) and not exposed as named MCP tools. Verification should test all ~50 mcp-proxy tools via direct HTTP call.

### RESOLVED: Data Gap Estimate
Initial data migration: 2026-02-27. Current date: 2026-03-02. Gap: ~3 days. During this gap:
- New leads may have been created (4,491 leads at migration time)
- New chat messages may have been sent (863 at migration time)
- Visitor events continuing (41,749 at migration time)
- Stripe webhook events creating new billing_records on the new DB (209 stale pending + new ones)
- Auto-recharge cron creating records on the new DB

The full re-sync will overwrite all new-DB data with old-DB data, then the system starts fresh. Stripe webhook events that arrive during the re-sync window will be retried by Stripe.

### RESOLVED: Lead Routing Status
Per CONTEXT.md: "Lead router status unknown -- needs investigation, agents may not be getting leads." The `lead-webhook` function on the new project is deployed and active. It validates incoming leads via `x-api-key` header against the `webhook_api_keys` table. The API keys are per-client and were migrated with the database. **However, external lead sources are still pointing to the OLD project URL.** Until the webhook URL is updated in each lead source configuration, new leads go to the old system. This is the urgent item the user identified.

Investigation approach: Call `check-lead-router-health` on both old and new projects to see current lead flow status. Then update lead source webhook URLs to point to the new project.

### RESOLVED: Agreements Bucket Migration
Per STATE.md: "Agreements bucket: 0 files -- needs old project service role key to migrate ~114 files." This is still pending. The storage migration script (`scripts/migrate-storage.ts`) supports running for a specific bucket: `npx tsx scripts/migrate-storage.ts --bucket agreements`. This requires `OLD_SUPABASE_SERVICE_KEY` which needs to be retrieved from the Lovable project or Supabase dashboard.

### RESOLVED: Storage URL References in Database
Per STATE.md Phase 3: "Database file URL references still point to old project -- URL rewriting needed during cutover." Files like profile images have URLs like `https://qydkrpirrfelgtcqasdx.supabase.co/storage/v1/object/public/media/...` stored in the database. After re-sync, these URLs need to be rewritten to use the new project URL: `https://qcunascacayiiuufjtaq.supabase.co/storage/v1/object/public/media/...`. This is a simple SQL UPDATE across affected columns.

Columns likely affected (based on storage URL patterns):
- `clients.profile_image_url`
- `clients.success_manager_image_url` (DEFAULT already fixed in Phase 2)
- `clients.headshot_url` / similar fields
- `agreements.document_url` / `signed_url`
- Chat attachment references in `chat_messages`

A comprehensive grep: `UPDATE ... SET column = REPLACE(column, 'qydkrpirrfelgtcqasdx', 'qcunascacayiiuufjtaq')` across all text columns is the safest approach.

### INVESTIGATED: Remaining Pending Items from STATE.md

| Item | Status | Phase 6 Action |
|------|--------|----------------|
| 209 stale pending billing_records | Auto-resolved by re-sync | TRUNCATE wipes them |
| Agreements bucket files (0 on new) | Needs old service role key | Migrate during cutover if key available |
| Oversized wav file (54.7 MB) | Pro upgrade done, can migrate | Run storage script with --bucket media |
| migration-temp@test.com on old project | Cleanup | Delete during decommission |
| Bridge function on old project | Still active | Delete after re-sync complete |
| Database file URL references | Need rewriting | SQL UPDATE during cutover |
| lovable-tagger in frontend | Non-blocking (dev only) | Optional cleanup post-cutover |
| stripe-webhook and dispute-webhook lack signature verification | Security debt | Not Phase 6 scope (per CONTEXT) |

## Open Questions

1. **Old project service role key availability**
   - What we know: Needed for agreements bucket migration. Was inaccessible via Management API in Phase 3.
   - What's unclear: Whether the user can retrieve it from Supabase Dashboard or Lovable settings
   - Recommendation: Ask user to check Supabase Dashboard > Settings > API > service_role key for old project. If unavailable, agreements bucket migration is skipped (20 referenced files, ~94 are old drafts).

2. **Exact external lead source configurations**
   - What we know: `lead-webhook` validates via `x-api-key` header, API keys are in `webhook_api_keys` table
   - What's unclear: How many external lead sources exist and where their webhook URL is configured
   - Recommendation: Query `webhook_api_keys` table to identify all active API keys, then ask user which external services use each key and where to update the URL.

3. **Bare `alphaagent.io` domain DNS**
   - What we know: `hub.alphaagent.io` already points to Vercel. Edge functions reference `alphaagent.io` without `hub.` prefix.
   - What's unclear: What the bare `alphaagent.io` domain currently resolves to, and whether it needs to point to Vercel
   - Recommendation: Check `dig alphaagent.io`. If it currently points to Lovable, it may need updating. If it points to a marketing site, only the `hub.` subdomain matters for the app.

4. **GHL OAuth redirect URI update**
   - What we know: `GHL_REDIRECT_URI` points to `conscious.sysconscious.com` (per STATE.md 03-04 decision), NOT to old Supabase URL
   - What's unclear: Whether this is correct for the cutover or needs updating
   - Recommendation: Since it points to a custom domain (not old Supabase URL), no change needed unless the user wants to update it.

5. **Stripe legacy webhooks (stripe-webhook, dispute-webhook) current state**
   - What we know: Phase 4 created Event Destinations for `stripe-billing-webhook` only. Dispute webhook endpoint was deferred.
   - What's unclear: Whether `stripe-webhook` and `dispute-webhook` have separate endpoints on the old project that need new equivalents
   - Recommendation: Check Stripe Dashboard for all webhook endpoints on both accounts. Create new endpoints for dispute-webhook if the old ones exist. stripe-webhook (legacy checkout) may not need a new endpoint if checkout flow is not active.

## Cutover Sequence (Recommended)

Based on CONTEXT.md decisions and research findings:

```
PHASE 6 SEQUENCE:

Plan 06-01: Data Re-Sync & Cutover Preparation
  1. Investigate lead routing status (urgent)
  2. Fix hardcoded URLs in edge functions
  3. Set PUBLIC_APP_URL secret
  4. Migrate agreements bucket (if service key available)
  5. Disable cron jobs on new project
  6. TRUNCATE all public tables on new DB
  7. Re-import via bridge function (all 94 tables)
  8. Rewrite storage URLs in database
  9. Re-enable cron jobs
  10. Verify row counts match

Plan 06-02: Feature Verification & Webhook Switchover
  1. Run automated verification script (all 7 features via mcp-proxy)
  2. Fix any verification failures
  3. Switch all 17 external webhook URLs (all at once)
  4. Disable old Stripe webhook endpoints
  5. Re-run verification after webhook switch
  6. Monitor for 24-48 hours (Stripe events, lead flow, error logs)

Plan 06-03: MCP Server Update & Decommission
  1. Update ~/.claude.json SUPABASE_URL
  2. Restart Claude Code to pick up MCP config change
  3. Verify all MCP tools respond correctly
  4. Delete bridge function from old project
  5. Delete migration-temp@test.com from old project
  6. Document decommission of old system
```

## Sources

### Primary (HIGH confidence)
- Source code analysis: all 106 edge functions in `alphahub-v2/supabase/functions/` (grep for hardcoded URLs)
- MCP server code: `/Users/forren/workspace/alphahub-mcp/src/supabase.ts` and `src/index.ts` (complete read)
- MCP server config: `~/.claude.json` mcpServers section (complete read)
- Phase 2 summaries: 02-01-SUMMARY.md, 02-02-SUMMARY.md (bridge function pattern, data transfer stats)
- Phase 4 research: 04-RESEARCH.md (webhook architecture, idempotency guards, event types)
- Phase 4 verification: 04-VERIFICATION.md (Stripe endpoint status, billing chain verification)
- Phase 5 verification: 05-VERIFICATION.md (frontend deployment status, DNS confirmation)
- Inventory files: WEBHOOKS.md (17 inbound endpoints), SECRETS.md (41 manual secrets), CODEBASE.md (full function inventory)
- STATE.md: accumulated context, pending items, key facts from all phases
- ROADMAP.md: Phase 6 success criteria and requirements
- CONTEXT.md: User decisions for Phase 6 implementation

### Secondary (MEDIUM confidence)
- Bridge function behavior inferred from Phase 2 summaries (function code is on old project, not in local repo)
- Storage URL rewriting scope estimated from codebase patterns (exact affected columns need SQL query to confirm)

### Tertiary (LOW confidence)
- Lead source external configuration locations (depends on user knowledge of which services send leads)
- Exact number of MCP tools (grep shows ~50 unique cases, success criteria says 52 -- close but not exact)

## Metadata

**Confidence breakdown:**
- Data re-sync approach: HIGH -- bridge function proven in Phase 2, same approach reused
- Webhook switchover: HIGH -- complete inventory in WEBHOOKS.md, all URLs documented
- Feature verification: HIGH -- mcp-proxy tools map to all 7 features, HTTP call pattern proven
- MCP server update: HIGH -- single config line change, verified by reading source code
- Hardcoded URL fixes: HIGH -- grep confirmed all instances, straightforward find/replace
- Pitfalls: HIGH -- derived from actual Phase 2 experience and known cron/webhook timing issues

**Research date:** 2026-03-02
**Valid until:** 2026-03-09 (time-sensitive -- cutover should happen this week per user urgency)
