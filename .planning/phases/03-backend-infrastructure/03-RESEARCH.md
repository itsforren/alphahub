# Phase 3: Backend Infrastructure - Research

**Researched:** 2026-02-27
**Domain:** Supabase Edge Functions, pg_cron, Storage, Realtime, Anthropic API migration
**Confidence:** HIGH

## Summary

Phase 3 migrates all server-side automation from the old Lovable-managed Supabase project to the new self-managed project. This covers four distinct workstreams: (1) deploying 106 edge functions with 41 manual secrets and LLM provider replacement, (2) recreating 6 pg_cron jobs, (3) migrating 3 storage buckets with 317 files, and (4) enabling Realtime publications on 11 tables.

The standard approach is: fix config.toml to enable `supabase link`, gather all 16 missing secrets before deploying, deploy all functions with a single CLI command, convert 5 LLM functions from OpenAI format to Anthropic Messages API, recreate cron jobs via SQL using `cron.schedule()` with Vault-stored credentials, migrate storage files via a download/upload script using `@supabase/supabase-js`, and enable Realtime with a single `ALTER PUBLICATION` SQL statement.

Key risk areas: the config.toml has 17 functions missing (they would default to `verify_jwt = true` when all should be `false`), the `generate-dispute-evidence` function uses OpenAI tool calling which requires a different conversion pattern than simple chat completions, and high-frequency cron jobs (`check-automation-timeout` every minute, `auto-recharge-run` every 30 minutes) should be enabled last to avoid triggering actions on stale data.

**Primary recommendation:** Fix config.toml first (remove `schedule` keys, add 17 missing functions), then deploy all functions in one command, then set secrets from an .env file, then create cron jobs and storage in parallel.

## Standard Stack

### Core Tools

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Supabase CLI | v2.75.0+ | Deploy edge functions, set secrets, link project | Already installed, required for deployment |
| `@supabase/supabase-js` | v2 | Storage file migration script | Official SDK, used by edge functions already |
| pg_cron | 1.6.4 | Cron job scheduling | Already enabled on new project (via Phase 2 migrations) |
| pg_net | 0.19.5 | HTTP calls from cron jobs | Already enabled on new project |
| Anthropic Messages API | 2023-06-01 | Replace Lovable AI gateway for 5 LLM functions | User decision: use Claude Sonnet 4.6 |

### Supporting

| Tool | Purpose | When to Use |
|------|---------|-------------|
| supabase_vault | Store project URL and anon key for cron jobs | When creating pg_cron jobs that call edge functions |
| `.env` file + `supabase secrets set --env-file` | Bulk secret configuration | Setting all 41 secrets at once |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Anthropic direct API | OpenAI-compatible proxy (OpenRouter) | Adds dependency; Anthropic direct is simpler and user decided on Claude |
| Script-based storage migration | Manual Dashboard upload | 317 files is too many for manual; script is required |
| Vault for cron secrets | Hardcoded anon key in cron SQL | Vault is more secure and recommended by Supabase docs |

## Architecture Patterns

### Prerequisite: Fix config.toml Before Anything

The config.toml has two issues that MUST be resolved before `supabase link` can work:

**Issue 1: `schedule` keys block CLI linking**
```toml
# REMOVE these two lines:
[functions.prospect-inactivity-check]
verify_jwt = false
schedule = "*/1 * * * *"   # <-- REMOVE THIS LINE

[functions.auto-recharge-run]
verify_jwt = false
schedule = "0 6 * * *"     # <-- REMOVE THIS LINE
```
The `schedule` key is not supported by Supabase CLI v2.75.0. Cron scheduling is handled via pg_cron SQL, not config.toml.

**Issue 2: 17 functions missing from config.toml**
These functions exist as directories in `supabase/functions/` but have NO entry in config.toml, meaning they would default to `verify_jwt = true` on deployment. ALL 106 functions should have `verify_jwt = false`:

```
add-keywords-to-campaign
admin-delete-user
admin-reset-user
admin-set-password
aggregate-client-kpis
crm-snapshot-status
execute-proposal
get-stripe-config
ghl-inject-twilio
ghl-provision-phone
hourly-approval-reminder
morning-review-job
outcome-tracker-job
pause-google-ads-campaign
plaid-daily-refresh
prospect-abandoned-webhook
update-google-ads-url
```

Add entries for all 17:
```toml
[functions.add-keywords-to-campaign]
verify_jwt = false

[functions.admin-delete-user]
verify_jwt = false

# ... etc for all 17
```

### Pattern 1: Edge Function Deployment (All at Once)

**What:** Deploy all 106 functions with a single CLI command.
**When:** After `supabase link` succeeds (requires fixed config.toml).

```bash
# Source: Supabase docs - Deploy to Production
# Link first (one-time)
cd /Users/forren/workspace/copy-alphahub/alphahub-v2
supabase link --project-ref qcunascacayiiuufjtaq

# Deploy ALL functions at once
supabase functions deploy
```

The `supabase functions deploy` command (with no function name) deploys all functions found in the `supabase/functions/` directory. The `verify_jwt` settings from config.toml are automatically applied.

### Pattern 2: Bulk Secrets via .env File

**What:** Set all 41 manual secrets from a single .env file.
**When:** After functions are deployed (secrets take effect immediately, no redeployment needed).

```bash
# Source: Supabase docs - Environment Variables
# Create .env file (NOT committed to git)
cat > /Users/forren/workspace/copy-alphahub/alphahub-v2/supabase/.env.secrets << 'EOF'
ENCRYPTION_KEY=<value from ~/.zprofile GHL_ENCRYPTION_KEY>
GHL_CLIENT_ID=<value>
# ... all 41 secrets
EOF

# Push all secrets at once
supabase secrets set --env-file ./supabase/.env.secrets --project-ref qcunascacayiiuufjtaq

# Verify they're set
supabase secrets list --project-ref qcunascacayiiuufjtaq

# Delete the .env file (never commit it)
rm ./supabase/.env.secrets
```

### Pattern 3: LLM Provider Replacement (OpenAI to Anthropic)

**What:** Convert 5 functions from Lovable AI gateway (OpenAI chat completions format) to Anthropic Messages API.
**When:** Before or during function deployment.

There are TWO conversion patterns needed:

**Pattern 3a: Simple Chat Completions (4 functions)**
Functions: `analyze-prospect`, `generate-agent-bio`, `generate-dispute-evidence`, `verify-onboarding`

These use basic chat completions (system + user messages, text response). The conversion is:

```typescript
// BEFORE (OpenAI format via Lovable gateway)
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  }),
});
const data = await response.json();
const text = data.choices?.[0]?.message?.content;

// AFTER (Anthropic Messages API)
const LLM_API_KEY = Deno.env.get("LLM_API_KEY");
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": LLM_API_KEY,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,  // system is top-level, NOT in messages array
    messages: [
      { role: "user", content: userPrompt },
    ],
  }),
});
const data = await response.json();
const text = data.content?.[0]?.text;  // Different response structure
```

Key differences from OpenAI format:
- URL: `https://api.anthropic.com/v1/messages` (not `/v1/chat/completions`)
- Auth: `x-api-key` header (not `Authorization: Bearer`)
- Version header: `anthropic-version: 2023-06-01` required
- System prompt: top-level `system` parameter (not a message with role "system")
- `max_tokens` is REQUIRED (not optional)
- Response: `data.content[0].text` (not `data.choices[0].message.content`)
- No `choices` array in response

**Pattern 3b: Tool Calling (1 function -- `verify-onboarding-live`)**
This function uses OpenAI-style tool calling (`tools` + `tool_choice`). Anthropic has a different tool calling format:

```typescript
// BEFORE (OpenAI tool calling)
body: JSON.stringify({
  model: "google/gemini-2.5-flash",
  messages: [...],
  tools: [{
    type: "function",
    function: {
      name: "extract_form",
      description: "...",
      parameters: { type: "object", properties: {...}, required: [...] }
    }
  }],
  tool_choice: { type: "function", function: { name: "extract_form" } }
})
// Response: result.choices[0].message.tool_calls[0].function.arguments

// AFTER (Anthropic tool use)
body: JSON.stringify({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  system: systemPrompt,
  messages: [{ role: "user", content: userPrompt }],
  tools: [{
    name: "extract_form",
    description: "...",
    input_schema: { type: "object", properties: {...}, required: [...] }
  }],
  tool_choice: { type: "tool", name: "extract_form" }
})
// Response: result.content.find(b => b.type === "tool_use").input
```

Key tool calling differences:
- Tool definition: `input_schema` (not `parameters` nested under `function`)
- No `type: "function"` wrapper -- tools are flat objects with `name`, `description`, `input_schema`
- `tool_choice`: `{ type: "tool", name: "..." }` (not `{ type: "function", function: { name: "..." } }`)
- Response: tool input is in `result.content[].input` (not `tool_calls[].function.arguments` as JSON string)
- Response tool input is already parsed JSON (not a JSON string that needs `JSON.parse()`)

**Special case: `generate-dispute-evidence` uses model `openai/gpt-5.2`** (not gemini-2.5-flash like the others). This is a more capable model for a complex legal writing task. Use `claude-sonnet-4-6` as the replacement -- it is an upgrade from both gemini-2.5-flash and equivalent to gpt-5.2 for this use case.

### Pattern 4: Cron Job Creation via SQL

**What:** Create all 6 cron jobs using `cron.schedule()` with `net.http_post()`.
**When:** After edge functions are deployed and secrets are set.

```sql
-- Source: Supabase docs - Scheduling Edge Functions
-- First, store credentials in Vault for security
SELECT vault.create_secret(
  'https://qcunascacayiiuufjtaq.supabase.co',
  'project_url'
);
SELECT vault.create_secret(
  '<NEW_ANON_KEY>',  -- from $SUPABASE_V2_ANON_KEY
  'anon_key'
);

-- Then create each cron job
SELECT cron.schedule(
  'check-automation-timeout',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/check-automation-timeout',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Repeat for all 6 jobs with their respective schedules
```

### Pattern 5: Storage Migration Script

**What:** Download all files from old project, upload to new project.
**When:** Can run in parallel with cron job setup.

```typescript
// Source: Supabase docs - Migrating within Supabase
import { createClient } from '@supabase/supabase-js';

const oldSupabase = createClient(OLD_URL, OLD_SERVICE_KEY);
const newSupabase = createClient(NEW_URL, NEW_SERVICE_KEY);

const buckets = [
  { name: 'media', public: true },
  { name: 'agreements', public: false },
  { name: 'chat-attachments', public: true },  // Keep as public per user decision
];

for (const bucket of buckets) {
  // Create bucket on new project
  await newSupabase.storage.createBucket(bucket.name, { public: bucket.public });

  // List all files in old bucket
  const { data: files } = await oldSupabase.storage.from(bucket.name).list('', {
    limit: 1000,
    offset: 0,
  });

  // Download and upload each file
  for (const file of files || []) {
    const { data } = await oldSupabase.storage.from(bucket.name).download(file.name);
    if (data) {
      await newSupabase.storage.from(bucket.name).upload(file.name, data, {
        contentType: file.metadata?.mimetype,
        upsert: true,
      });
    }
  }
}
```

### Pattern 6: Realtime Publication

**What:** Enable Realtime for all 11 tables with a single SQL statement.
**When:** After Phase 2 schema migration is confirmed (tables exist).

```sql
-- Source: Supabase docs - Postgres Changes
ALTER PUBLICATION supabase_realtime ADD TABLE
  live_stats,
  support_tickets,
  chat_conversations,
  chat_messages,
  admin_dm_messages,
  admin_channel_messages,
  conversions,
  prospects,
  call_logs,
  prospect_activities,
  onboarding_automation_runs;
```

### Anti-Patterns to Avoid

- **Deploying functions one by one:** `supabase functions deploy` (no args) deploys all at once. Do NOT deploy 106 functions individually.
- **Hardcoding anon key in cron SQL:** Use `vault.create_secret()` to store the key, then reference via `vault.decrypted_secrets`. Hardcoded keys are a maintenance burden.
- **Enabling high-frequency cron jobs before verification:** `check-automation-timeout` (every minute) and `auto-recharge-run` (every 30 min) will trigger real business actions. Enable daily/infrequent jobs first, verify they work, then enable the frequent ones.
- **Setting secrets before gathering all values:** Context decision requires locating ALL 16 missing secrets BEFORE deploying. Do not deploy functions and then discover missing secrets one at a time.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bulk secret management | Shell script with `supabase secrets set` loops | `supabase secrets set --env-file` | Single command, atomic, less error-prone |
| Storage file migration | Manual download/upload or Dashboard UI | Script with `@supabase/supabase-js` | 317 files across 3 buckets, needs automation |
| Cron job scheduling | Custom polling from external service | pg_cron + pg_net + Vault | Native to Supabase, no external dependencies |
| LLM API abstraction | OpenAI compatibility layer or wrapper library | Direct Anthropic fetch() calls | Only 5 functions, direct fetch is simplest |

## Common Pitfalls

### Pitfall 1: config.toml Missing Functions Default to verify_jwt=true

**What goes wrong:** 17 edge functions are not listed in config.toml. When deployed, they default to `verify_jwt = true`, causing all calls without a valid Supabase JWT to fail with 401 errors. This silently breaks webhook endpoints, cron job invocations, and function-to-function calls.
**Why it happens:** The Lovable platform deployed these functions via its own mechanism, bypassing config.toml. The CLI uses config.toml as the source of truth.
**How to avoid:** Add all 17 missing functions to config.toml with `verify_jwt = false` before deploying. Verify the count: config.toml should have exactly 106 `[functions.*]` blocks, all with `verify_jwt = false`.
**Warning signs:** Post-deployment, calling any function returns 401 Unauthorized despite correct API key.

### Pitfall 2: Secrets Not Available at Function Call Time

**What goes wrong:** Edge functions fail with "X is not configured" errors because secrets were not set, or were set with wrong names.
**Why it happens:** 6 secrets have name mismatches between code and ~/.zprofile (e.g., code uses `ENCRYPTION_KEY`, zprofile has `GHL_ENCRYPTION_KEY`). If the zprofile name is used instead of the code name, the function cannot find it.
**How to avoid:** Use the CODE name (what `Deno.env.get()` calls) as the Supabase secret name. Map values from zprofile names to code names per SECRETS.md Section 3.
**Warning signs:** Function logs show "ENCRYPTION_KEY is not configured" or similar.

### Pitfall 3: ENCRYPTION_KEY Mismatch Breaks All Stored Tokens

**What goes wrong:** GHL OAuth tokens and Plaid access tokens become undecryptable. All clients lose CRM and banking connections.
**Why it happens:** Using a different encryption key than what was used to encrypt the stored tokens.
**How to avoid:** Use the EXACT value from `~/.zprofile` `GHL_ENCRYPTION_KEY`. Set it as `ENCRYPTION_KEY` in Supabase secrets. This is the single most critical secret.
**Warning signs:** CRM operations fail with decryption errors. Plaid balance lookups fail.

### Pitfall 4: Cron Jobs Using Old Project URL/Key

**What goes wrong:** Cron jobs fire but target the OLD Supabase project instead of the new one.
**Why it happens:** Copying cron job SQL from the old project without updating the URL and anon key.
**How to avoid:** Use Vault secrets for URL and anon key. Never hardcode project-specific values in cron SQL.
**Warning signs:** Cron jobs show as "active" in `cron.job` but the new project's edge function logs show no invocations.

### Pitfall 5: Storage File Paths Must Be Preserved Exactly

**What goes wrong:** Profile images break, agreement PDFs return 404, chat attachments fail to load.
**Why it happens:** The database stores file paths/URLs that reference specific bucket paths. If files are uploaded with different paths, all database references break.
**How to avoid:** The migration script must preserve exact file names and folder structure. Use the same bucket names.
**Warning signs:** Images show broken icons on the frontend, PDF download links fail.

### Pitfall 6: Anthropic API Response Structure Differs from OpenAI

**What goes wrong:** LLM functions return empty results or crash with "Cannot read property 'content' of undefined."
**Why it happens:** Code tries to read `data.choices[0].message.content` but Anthropic returns `data.content[0].text`. The response structure is completely different.
**How to avoid:** Update BOTH the request format AND the response parsing for each function. Test each function independently.
**Warning signs:** Functions return "Unable to generate analysis" or throw runtime errors.

### Pitfall 7: Realtime Not Verifiable Without Frontend

**What goes wrong:** Realtime is "enabled" in SQL but no components actually receive updates.
**Why it happens:** Realtime requires both server-side publication AND client-side subscription. Without testing the frontend, you only verify half the chain.
**How to avoid:** After enabling publications, test at least one component (chat is easiest) by inserting a test message and verifying the frontend receives it live.
**Warning signs:** SQL shows tables in `pg_publication_tables` but chat messages don't appear in real-time.

## Code Examples

### Complete Anthropic API Call (Deno Edge Function)

```typescript
// Source: Anthropic Messages API docs (https://platform.claude.com/docs/en/api/messages)
// Pattern for analyze-prospect, generate-agent-bio, verify-onboarding

const LLM_API_KEY = Deno.env.get("LLM_API_KEY");
if (!LLM_API_KEY) {
  throw new Error("LLM_API_KEY is not configured");
}

const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": LLM_API_KEY,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      { role: "user", content: userPrompt },
    ],
  }),
});

if (!response.ok) {
  if (response.status === 429) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const errorText = await response.text();
  console.error("Anthropic API error:", response.status, errorText);
  throw new Error(`Anthropic API error: ${response.status}`);
}

const data = await response.json();
const text = data.content?.[0]?.text || "Unable to generate response.";
```

### Anthropic Tool Calling (for verify-onboarding-live)

```typescript
// Source: Anthropic Tool Use docs (https://platform.claude.com/docs/en/docs/tool-use)
// Pattern for verify-onboarding-live analyzeFormWithAI function

const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": LLM_API_KEY,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: "You analyze landing page HTML to extract form details for testing...",
    messages: [
      { role: "user", content: `Analyze this landing page HTML...` }
    ],
    tools: [{
      name: "extract_form",
      description: "Extract form details and generate test data",
      input_schema: {  // NOT "parameters" nested under "function"
        type: "object",
        properties: {
          form_action: { type: "string", description: "The form's action URL" },
          form_method: { type: "string", enum: ["GET", "POST"] },
          field_names: { type: "array", items: { type: "string" } },
          test_data: { type: "object", additionalProperties: { type: "string" } }
        },
        required: ["form_action", "form_method", "field_names", "test_data"]
      }
    }],
    tool_choice: { type: "tool", name: "extract_form" }  // NOT { type: "function", function: { name: "..." } }
  }),
});

const result = await response.json();
// Find the tool_use block in the content array
const toolUseBlock = result.content?.find(
  (block: any) => block.type === "tool_use"
);

if (toolUseBlock?.input) {
  // Input is already parsed JSON, no JSON.parse() needed
  const parsed = toolUseBlock.input;
  // ... use parsed.form_action, parsed.field_names, parsed.test_data
}
```

### Complete Cron Job SQL (All 6 Jobs)

```sql
-- Store credentials in Vault (run once)
SELECT vault.create_secret(
  'https://qcunascacayiiuufjtaq.supabase.co',
  'project_url'
);
SELECT vault.create_secret(
  '<SUPABASE_V2_ANON_KEY value>',
  'anon_key'
);

-- Job 1: check-automation-timeout (every minute)
SELECT cron.schedule(
  'check-automation-timeout',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/check-automation-timeout',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Job 2: auto-recharge-run (every 30 minutes)
SELECT cron.schedule(
  'auto-recharge-run',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/auto-recharge-run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Job 3: sync-all-google-ads (daily 6 AM UTC)
SELECT cron.schedule(
  'sync-all-google-ads',
  '0 6 * * *',
  $$ /* same net.http_post pattern with '/functions/v1/sync-all-google-ads' */ $$
);

-- Job 4: cleanup-archived-clients (daily 3 AM UTC)
SELECT cron.schedule(
  'cleanup-archived-clients',
  '0 3 * * *',
  $$ /* same pattern with '/functions/v1/cleanup-archived-clients' */ $$
);

-- Job 5: check-lead-router-health (daily 8 AM UTC)
SELECT cron.schedule(
  'check-lead-router-health',
  '0 8 * * *',
  $$ /* same pattern with '/functions/v1/check-lead-router-health' */ $$
);

-- Job 6: plaid-daily-refresh (daily noon UTC)
SELECT cron.schedule(
  'plaid-daily-refresh',
  '0 12 * * *',
  $$ /* same pattern with '/functions/v1/plaid-daily-refresh' */ $$
);
```

### Verify Cron Jobs Are Active

```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
ORDER BY jobname;
-- Expect 6 rows, all active = true
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Lovable AI gateway (`ai.gateway.lovable.dev`) | Direct Anthropic API (`api.anthropic.com/v1/messages`) | Phase 3 migration | 5 functions need code changes |
| `LOVABLE_API_KEY` secret | `LLM_API_KEY` secret (Anthropic key) | Phase 3 migration | New secret name, provider-agnostic |
| OpenAI chat completions format | Anthropic Messages API format | Phase 3 migration | Different request/response structure |
| config.toml `schedule` keys | pg_cron SQL via `cron.schedule()` | Supabase CLI v2.x | Schedule keys no longer supported |
| Secrets set one by one | `supabase secrets set --env-file` | Available since CLI v1.x | Batch operation, less error-prone |

**Deprecated/outdated:**
- `config.toml` `schedule` key: Not supported by Supabase CLI v2.75.0. Use pg_cron directly.
- `serve()` from `https://deno.land/std@0.168.0/http/server.ts`: Many functions use this older pattern. Works fine, no migration needed.
- Lovable AI gateway (`ai.gateway.lovable.dev`): Will stop working post-migration. Must be replaced.

## Authoritative Inventories

### Cron Jobs (6 total -- from LOVABLE-EXTRACTION, authoritative)

| Job Name | Schedule | Edge Function | Notes |
|----------|----------|---------------|-------|
| check-automation-timeout | `* * * * *` (every minute) | check-automation-timeout | HIGH FREQUENCY -- enable last |
| auto-recharge-run | `*/30 * * * *` (every 30 min) | auto-recharge-run | HIGH FREQUENCY -- enable last |
| sync-all-google-ads | `0 6 * * *` (daily 6 AM) | sync-all-google-ads | Safe to enable early |
| cleanup-archived-clients | `0 3 * * *` (daily 3 AM) | cleanup-archived-clients | Safe to enable early |
| check-lead-router-health | `0 8 * * *` (daily 8 AM) | check-lead-router-health | Safe to enable early |
| plaid-daily-refresh | `0 12 * * *` (daily noon) | plaid-daily-refresh | Safe to enable early |

**Note:** The REQUIREMENTS.md mentions 5 jobs (auto-recharge, morning-review, billing-collections, prospect-inactivity-check, hourly-approval-reminder). The LOVABLE-EXTRACTION (from live `cron.job` table) found 6 DIFFERENT jobs. The extraction list is authoritative -- it reflects what actually runs in production. Some functions from REQUIREMENTS.md (morning-review, billing-collections, prospect-inactivity-check, hourly-approval-reminder) are NOT in the live cron table, meaning they are either called by other mechanisms or were never scheduled as cron jobs. The WEBHOOKS.md has a third list that partially overlaps. **Use the LOVABLE-EXTRACTION list as the definitive source.**

### Realtime Tables (11 total -- from LOVABLE-EXTRACTION)

1. live_stats
2. support_tickets
3. chat_conversations
4. chat_messages
5. admin_dm_messages
6. admin_channel_messages
7. conversions
8. prospects
9. call_logs
10. prospect_activities
11. onboarding_automation_runs

### Storage Buckets (3 total, 317 files)

| Bucket | Public | Files | Notes |
|--------|--------|-------|-------|
| media | Yes | 157 | Profile photos, headshots |
| agreements | No (private) | 114 | Signed PDFs |
| chat-attachments | Yes | 46 | Keep as public per user decision |

### Secrets Summary (from SECRETS.md)

| Category | Count | Status |
|----------|-------|--------|
| Auto-set by Supabase | 3 | No action needed |
| Ready to set (verified in zprofile) | 17 | Values available |
| Name mismatch (value exists, different name) | 6 | Map code name to zprofile value |
| Not found in zprofile | 16 | Must locate from dashboards |
| Replacement needed | 1 | LLM_API_KEY (Anthropic key from user) |
| **Total manual secrets** | **41** | 23 ready + 16 need investigation + 1 replacement + 1 new (PUBLIC_APP_URL) |

### LLM Functions Requiring Code Changes (5 total)

| Function | AI Purpose | Model Used | Tool Calling? | Complexity |
|----------|-----------|------------|---------------|------------|
| analyze-prospect | Sales intelligence analysis | gemini-2.5-flash | No | Simple |
| generate-agent-bio | Professional bio generation | gemini-2.5-flash | No | Simple |
| generate-dispute-evidence | Legal dispute response | gpt-5.2 | No | Simple (long prompt) |
| verify-onboarding | Onboarding verification | gemini-2.5-flash | No (uses LOVABLE_API_KEY only for lead test condition) | Trivial (only checks if key exists) |
| verify-onboarding-live | Live form analysis | gemini-2.5-flash | YES (extract_form tool) | Medium (tool calling conversion) |

**Important detail about `verify-onboarding`:** This function only uses `LOVABLE_API_KEY` as a boolean check (`if (run_lead_test && client.lander_link && LOVABLE_API_KEY)`). It does NOT make an LLM API call itself. The actual AI call is only in `verify-onboarding-live`. So `verify-onboarding` just needs the env var name changed from `LOVABLE_API_KEY` to `LLM_API_KEY` -- no API format conversion needed.

## Open Questions

1. **Cron job discrepancy between sources:**
   - LOVABLE-EXTRACTION (live database): 6 jobs (check-automation-timeout, auto-recharge-run, sync-all-google-ads, cleanup-archived-clients, check-lead-router-health, plaid-daily-refresh)
   - REQUIREMENTS.md: 5 jobs (auto-recharge, morning-review, billing-collections, prospect-inactivity-check, hourly-approval-reminder)
   - WEBHOOKS.md: 6 jobs (prospect-inactivity-check, auto-recharge-run, sync-all-google-ads, check-low-balance, hourly-approval-reminder, morning-review-job)
   - **Recommendation:** Use LOVABLE-EXTRACTION as authoritative (it came from `SELECT * FROM cron.job`). The other lists were estimates from code analysis. Functions like `morning-review-job`, `billing-collections-run`, and `hourly-approval-reminder` may be invoked by other means (e.g., called by the app, triggered by other functions) rather than cron. If the user wants to verify, they can re-run `SELECT * FROM cron.job` on the old project.

2. **Storage bucket access policies beyond public/private:**
   - The old project may have specific RLS policies on `storage.objects` for each bucket. These policies control per-file access (e.g., only the file owner can delete). These would NOT be captured by the migration script, which only copies files.
   - **Recommendation:** After creating buckets, check if any storage-related RLS policies exist in the old project and replicate them. This may already be handled by Phase 2 migrations if storage policies were defined in migration files.

3. **CORS origins for edge functions:**
   - EDGE-05 requires updating CORS origins. Currently all functions use `"Access-Control-Allow-Origin": "*"` (wildcard). No change is needed for migration -- wildcard allows all origins.
   - **Recommendation:** Document that all functions use wildcard CORS and no update is needed. A security improvement (restricting to specific origins) can be deferred to the security audit phase.

## Sources

### Primary (HIGH confidence)
- Supabase Edge Function code: `/Users/forren/workspace/copy-alphahub/alphahub-v2/supabase/functions/` -- All 106 functions examined
- config.toml: `/Users/forren/workspace/copy-alphahub/alphahub-v2/supabase/config.toml` -- 89 functions listed, 17 missing
- LOVABLE-EXTRACTION.md: Live database state (cron jobs, Realtime tables, storage buckets) -- authoritative
- SECRETS.md: Complete secrets inventory with migration readiness status
- WEBHOOKS.md: Complete webhook URL inventory
- [Supabase Deploy Docs](https://supabase.com/docs/guides/functions/deploy) -- Edge function deployment commands
- [Supabase Secrets Docs](https://supabase.com/docs/guides/functions/secrets) -- Bulk secrets via .env file
- [Supabase Schedule Functions Docs](https://supabase.com/docs/guides/functions/schedule-functions) -- pg_cron + pg_net + Vault pattern
- [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages) -- Request/response format, model names
- [Anthropic Tool Use Docs](https://platform.claude.com/docs/en/docs/tool-use) -- Tool calling format and examples
- [Supabase Storage Migration](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) -- Script approach

### Secondary (MEDIUM confidence)
- [Supabase Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) -- ALTER PUBLICATION syntax

### Tertiary (LOW confidence)
- None -- all findings verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All tools are documented Supabase features and official Anthropic API
- Architecture: HIGH -- Patterns verified against official docs and actual codebase
- Pitfalls: HIGH -- Based on actual code inspection (17 missing config.toml entries found)
- LLM conversion: HIGH -- Both OpenAI and Anthropic API formats verified against official docs
- Cron jobs: MEDIUM -- LOVABLE-EXTRACTION is authoritative but discrepancy with other sources noted

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (30 days -- stable domain, tools unlikely to change)
