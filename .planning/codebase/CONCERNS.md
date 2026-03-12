# Codebase Concerns

**Analysis Date:** 2026-03-12

---

## Security Issues

### All 111 Edge Functions Have `verify_jwt = false`

- Risk: Every edge function is publicly callable without any JWT. The anon key is all that is needed to invoke any function.
- Files: `supabase/config.toml` (111 entries all with `verify_jwt = false`)
- Current mitigation: None at the platform level. Some functions implement their own auth logic; many do not.
- Impact: Unauthenticated callers can invoke billing, admin, Stripe charge, and user account management functions directly.
- Fix approach: Audit each function and set `verify_jwt = true` for every function that is only called from the authenticated portal. Only externally-triggered webhooks (GHL, lead routing, Stripe) legitimately need JWT disabled.

### `admin-delete-user` Has No Authorization Check

- Risk: Any caller with the Supabase anon key can delete any auth user by supplying a `userId`.
- Files: `supabase/functions/admin-delete-user/index.ts`
- Current mitigation: The frontend calls it with the anon key (`VITE_SUPABASE_ANON_KEY`). There is no role check, secret header, or JWT verification inside the function.
- Fix approach: Either set `verify_jwt = true` and validate the calling user has `admin` role via the JWT claims, or add a shared secret header validated against an env var.

### `admin-reset-user` Has No Authorization Check

- Risk: Any caller can reset any user's password and email, or create new users with any role, by knowing a `clientId`.
- Files: `supabase/functions/admin-reset-user/index.ts`
- Current mitigation: None. `verify_jwt = false`.
- Fix approach: Same as admin-delete-user above.

### `stripe-webhook` Does Not Verify Stripe Signatures

- Risk: Any attacker can POST fake payment events (checkout.session.completed, payment_intent.succeeded) and trigger arbitrary conversion tracking writes.
- Files: `supabase/functions/stripe-webhook/index.ts`
- Current mitigation: None — `payload` is parsed from raw JSON with no signature check. Compare to `stripe-billing-webhook/index.ts` which does implement HMAC verification via `verifySignature()`.
- Fix approach: Implement the same HMAC verification pattern used in `stripe-billing-webhook` using `STRIPE_WEBHOOK_SECRET`.

### `sync-stripe-charges` Has No Authorization

- Risk: Any anonymous caller can trigger a full Stripe sync, pulling and writing data for any client.
- Files: `supabase/functions/sync-stripe-charges/index.ts` (line 678: `// No auth check — internal admin function`)
- Current mitigation: Comment acknowledges the gap; no enforcement.
- Fix approach: Set `verify_jwt = true` and check admin role, or add a service-key header.

### ENCRYPTION_KEY Falls Back to SUPABASE_SERVICE_ROLE_KEY

- Risk: If `ENCRYPTION_KEY` secret is missing from the deployed environment, three GHL functions silently use the Supabase service role key as the AES encryption key — effectively encrypting OAuth tokens with a key that is visible to every function.
- Files: `supabase/functions/ghl-create-subaccount/index.ts:147`, `supabase/functions/ghl-inject-twilio/index.ts:197`, `supabase/functions/ghl-provision-phone/index.ts:260`
- Pattern: `const encryptionKey = Deno.env.get("ENCRYPTION_KEY") || supabaseKey;`
- Fix approach: Remove the fallback. If `ENCRYPTION_KEY` is missing, the function must fail loudly rather than silently degrade to an insecure state.

### AES Key Derivation Pads Short Keys with Zeros

- Risk: If `ENCRYPTION_KEY` is shorter than 32 characters it is padded with `'0'` characters. Any key under 32 chars is effectively a weaker key.
- Files: `supabase/functions/crm-location-token/index.ts:12`, `supabase/functions/run-full-onboarding/index.ts:394`
- Pattern: `key.padEnd(32, '0').slice(0, 32)`
- Fix approach: Validate key length on startup and throw rather than silently pad.

### `query-old-secrets` Exposes Old Production DB Credentials

- Risk: The file contains a hardcoded full Postgres connection string for the old Supabase project (`qydkrpirrfelgtcqasdx`), including the database password, and uses a hardcoded secret `"bridge-migration-2024"` for auth. This is a migration artifact that was never removed.
- Files: `alphahub-v2/supabase/functions/query-old-secrets/index.ts:3` (OLD_DB_URL hardcoded), line 8 (hardcoded secret)
- Fix approach: Delete this file and the `alphahub-v2/` directory entirely. Rotate the old database password if it is still active.

### Old Supabase Project (`qydkrpirrfelgtcqasdx`) Still Referenced in Production Code

- Risk: `crm-location-token` proxies live production traffic to the deprecated project as a fallback. If that old project's Supabase anon key is ever rotated or the project deleted, GHL OAuth will silently break.
- Files: `supabase/functions/crm-location-token/index.ts:112` (`OLD_PROJECT_URL = "https://qydkrpirrfelgtcqasdx.supabase.co"`)
- Current state: The comment says "Temporary bridge… This will be removed once GHL OAuth is re-authenticated." This has not been resolved.
- Fix approach: Complete GHL OAuth re-authentication on the new project and remove the entire proxy bridge.

### Wildcard CORS on All Functions

- Risk: All 82+ functions that set `'Access-Control-Allow-Origin': '*'` allow cross-origin requests from any domain, enabling CSRF-style attacks that exploit a victim's session.
- Fix approach: Restrict to `https://alphaagent.io` for browser-facing functions. Webhook receivers (GHL, Stripe, Fathom, etc.) must remain permissive but should validate source authenticity via signatures instead.

### MCP Proxy Exposes Write Operations and Raw SQL

- Risk: The `mcp-proxy` function exposes `update_client`, `update_ad_budget`, `toggle_ads`, `send_message`, `send_slack_webhook`, and a `run_query` tool (SELECT-only but unvalidated). Protection is a single shared `MCP_PROXY_SECRET` header value.
- Files: `supabase/functions/mcp-proxy/index.ts`
- Impact: If the secret is leaked or brute-forced, an attacker can modify client data, toggle Google Ads, and read all database rows.
- Fix approach: IP-allowlist the endpoint or move to OAuth-based machine auth.

---

## Operational / Deployment Risks

### `sync-stripe-charges` Requires Manual `verify_jwt` Patch After Every Deploy

- Risk: The function is deployed with `verify_jwt = false` in config.toml, but the deployed Supabase API overrides this back to `true` on each deploy. A manual API PATCH must be run after every deploy or the function breaks silently for all callers.
- Files: `supabase/config.toml` — `sync-stripe-charges` section; `memory/MEMORY.md` documents the workaround
- Impact: Missing the patch means billing syncs and wallet deposits stop working until discovered.
- Fix approach: This is a Supabase CLI limitation with `config.toml`. The real fix is to add the PATCH call to a post-deploy script or CI step so it cannot be forgotten.

### Vercel Auto-Deploy Webhook Is Broken

- Risk: Pushing to `main` does NOT trigger a Vercel deploy. A manual API call is required every time or the production frontend silently goes stale.
- Files: `memory/MEMORY.md` documents the workaround curl command
- Impact: Code merged to main may not reach production until someone manually triggers a deploy. There is no CI step enforcing this.
- Fix approach: Fix the Vercel GitHub webhook integration, or add a GitHub Actions workflow that calls the deploy API on push to main.

### No Error Monitoring (No Sentry / Datadog / Rollbar)

- Risk: Frontend JavaScript errors and edge function failures are invisible unless someone happens to check Supabase function logs. There is no alerting, aggregation, or error rate tracking.
- Files: No monitoring SDK found in `package.json`, no imports of Sentry/LogRocket/Datadog in `src/`, no monitoring calls in edge functions.
- Impact: Silent failures in billing, wallet sync, onboarding, or lead delivery go undetected.
- Fix approach: Add Sentry to the Vite frontend. For edge functions, at minimum add a Slack notification on uncaught errors in the highest-impact functions (stripe-billing-webhook, sync-stripe-charges, run-full-onboarding, check-low-balance, auto-recharge-run).

### No Tests at All — Zero Coverage

- Risk: The project has no unit tests, integration tests, or end-to-end tests. Zero test files found in `src/` or `supabase/functions/`.
- Impact: Every code change to billing, wallet computation, Stripe sync, or onboarding is deployed without any automated validation. Silent regressions are undetectable.
- Fix approach: Start with the most financially sensitive code — `sync-stripe-charges` `ensureWalletDeposit()`, wallet balance computation in `useCampaignCommandCenter.ts`, and `stripe-billing-webhook` handler routing.

### `alphahub-v2/` Is a Committed Migration Artifact

- Risk: The `alphahub-v2/` directory at the repo root contains a separate `.git` repo, a full `node_modules`, built `dist/` assets, and the `query-old-secrets` function with hardcoded DB credentials. It is committed to the repo.
- Files: `/alphahub-v2/` (entire directory)
- Impact: Bloats the repo, creates confusion about which codebase to edit, and embeds sensitive credentials.
- Fix approach: Delete `alphahub-v2/` from the repository entirely. Add it to `.gitignore` if a local copy is needed.

---

## Tech Debt

### 51 Edge Functions Use Deprecated `serve()` from `deno.land/std@0.168.0`

- Issue: The recommended pattern is `Deno.serve()` (built-in). 51 functions still import `serve` from `"https://deno.land/std@0.168.0/http/server.ts"`. 7 others use `std@0.190.0`. Only 56 use `Deno.serve()`.
- Files: Majority of functions in `supabase/functions/` — examples: `lead-webhook`, `inject-lead-to-ghl`, `morning-review-job`, `mcp-proxy`, `check-low-balance`, `sync-meta-ads`
- Impact: Supabase will eventually drop support for older Deno versions. Mixed patterns make the codebase harder to maintain.
- Fix approach: Batch-replace `import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; serve(async (req)` with `Deno.serve(async (req)`.

### Wallet Balance Computation Is Duplicated Across Multiple Layers

- Issue: Wallet balance = `sum(wallet_transactions.amount WHERE type='deposit')` minus `sum(ad_spend_daily.cost WHERE date >= tracking_start_date)` with a performance percentage multiplier applied. This formula is recalculated independently in:
  - `src/hooks/useCampaignCommandCenter.ts` (lines 398-412)
  - `supabase/functions/mcp-proxy/computed-wallet.ts`
  - `supabase/functions/check-low-balance/index.ts`
  - `supabase/functions/auto-recharge-run/index.ts`
- Impact: Any change to the formula must be applied in 4+ places. Drift between implementations has already occurred — the `mcp-proxy` has a separate `computed-wallet.ts` helper while the frontend recalculates inline.
- Fix approach: Create a single Supabase database function or RPC (`compute_wallet_balance`) that is called everywhere, so the formula has one authoritative source.

### `balance_after` Column Is Always Written as `0`

- Issue: `wallet_transactions.balance_after` exists in the schema but is always inserted as `0`. It is a vestigial field from an earlier design.
- Files: `src/hooks/useBillingRecords.ts:187`, `src/hooks/useBillingRecords.ts:311`, `src/hooks/useBillingRecords.ts:478` (comment: `// Computed field, not used anymore`)
- Impact: The column contains no useful data, wastes storage, and creates confusion.
- Fix approach: Remove the column in a migration or officially document it as deprecated.

### AES-GCM Encryption Logic Is Copy-Pasted Across Multiple Functions

- Issue: The `encryptToken` / `decryptToken` helper pair with `padEnd(32, '0').slice(0, 32)` key derivation is copy-pasted into at least 5 functions instead of being in a shared module: `crm-location-token`, `run-full-onboarding`, `crm-oauth-callback`, `ghl-create-subaccount`, `ghl-inject-twilio`.
- Impact: Any bug fix must be applied in 5+ places. The padding bug noted above exists in all copies.
- Fix approach: Move to a shared `_shared/crypto.ts` module imported via relative path.

### `listUsers()` Called Without Pagination in Three Functions

- Issue: `auth.admin.listUsers()` loads all auth users into memory with no pagination. As the user count grows this will eventually hit memory limits or become very slow.
- Files: `supabase/functions/create-user-account/index.ts:67`, `supabase/functions/admin-reset-user/index.ts:68`, `supabase/functions/agent-onboarding-webhook/index.ts:667`
- Fix approach: Replace with `listUsers({ page: 1, perPage: 1000 })` or, better, query the `profiles` or `clients` table for the specific email instead of loading all users.

### Fuzzy Date-Matching for Billing Record Deduplication Is Brittle

- Issue: `sync-stripe-charges` uses a ±3-day date window plus amount + billing_type to fuzzy-match Stripe invoices to manually created billing records. This can silently match the wrong record if two invoices of the same amount fall within 6 days.
- Files: `supabase/functions/sync-stripe-charges/index.ts:356-389` (invoice fuzzy match), `supabase/functions/sync-stripe-charges/index.ts:507-537` (charge fuzzy match)
- Impact: Incorrect back-filling of Stripe IDs causes wallet deposit double-counting or missed deposits.
- Fix approach: Prefer exact `stripe_invoice_id` / `stripe_payment_intent_id` matching only. Fuzzy matching should require at minimum manual review before writing.

### `sync-stripe-charges` Has a Hard Cap of 250 Invoices Per Client

- Issue: Invoice pagination stops after 5 pages × 50 invoices = 250 invoices per Stripe customer. Clients with longer billing histories will have silent gaps.
- Files: `supabase/functions/sync-stripe-charges/index.ts:299`: `while (hasMore && pageCount < 5)`
- Fix approach: Remove the arbitrary `pageCount < 5` cap or add an explicit warning log when it is hit.

### `morning-review-job` Is 1,850 Lines

- Issue: The job does campaign health checks, AI proposal generation, safe mode triggering, Slack notifications, and budget adjustments all in one 1,850-line function. It has no timeout protection against hitting the Supabase edge function 60-second limit.
- Files: `supabase/functions/morning-review-job/index.ts`
- Impact: If the job times out mid-run, some campaigns get processed and others do not, with no retry and no indication of partial completion.
- Fix approach: Split into composable sub-functions (evaluate-campaigns, generate-proposals, send-alerts). Add a progress checkpoint pattern so partial runs can resume.

### `run-full-onboarding` Is 2,017 Lines and Contains Inline Sleeps

- Issue: The function has a 12-second `await sleep(12000)` mid-execution and numerous other waits. With the 60-second edge function timeout, complex onboardings risk being cut off mid-step.
- Files: `supabase/functions/run-full-onboarding/index.ts:1662`
- Impact: Partial onboardings leave clients in broken intermediate states (e.g., GHL subaccount created but Twilio not injected).
- Fix approach: Use a step-resumable state machine pattern already partially present (the `automation_runs` table). Each step should be individually retriable.

### `client_name` Denormalized Into `billing_records`

- Issue: `billing_records` stores `client_name` as a plain text column that is set at insert time and never updated. If a client is renamed, historical billing records show the old name.
- Files: Migration `20260206020543` added the column; `supabase/functions/sync-stripe-charges/index.ts:162` (writes `clientName`)
- Fix approach: Join to `clients.name` at query time instead of storing it.

### `_backup/` Directory Contains Old Components in the Repo

- Issue: `_backup/` at the project root contains `BillingSection.tsx`, `BillingStatsCards.tsx`, `BillingTimelineTable.tsx`, and `RevenueIntelligenceCard.tsx`. These are old component versions committed as a manual backup, not managed by git.
- Files: `_backup/`
- Fix approach: Delete the directory. Git history is the correct backup mechanism.

### `behindPaceCount` Is Hardcoded to Zero

- Issue: The Campaign Command Center dashboard metric `behindPaceCount` is always `0` with a comment indicating the real calculation was never implemented.
- Files: `src/hooks/useCampaignCommandCenter.ts:665`: `const behindPaceCount = 0; // TODO: Calculate based on full pacing data`
- Impact: The pacing alert count shown to admins is always zero, masking campaigns that are spending behind pace.
- Fix approach: Implement pacing calculation based on `days_elapsed / days_in_month` vs `spend_so_far / wallet_balance`.

---

## Fragile Areas

### GHL OAuth Token Chain Is a Single Point of Failure

- What makes it fragile: All GHL API calls (onboarding, lead injection, subaccount creation, Twilio injection, calendar sync) depend on a single agency-level OAuth token stored in `ghl_oauth_tokens`. If this token expires and the refresh fails, all GHL-dependent workflows stop.
- Files: `supabase/functions/crm-location-token/index.ts`, `supabase/functions/run-full-onboarding/index.ts:416-487`
- Current state: There is still a live fallback proxy to the old Supabase project (`qydkrpirrfelgtcqasdx`) — meaning the old project's GHL OAuth token is still active and being used for some requests.
- Safe modification: Always test GHL operations after any deploy of `crm-location-token`, `run-full-onboarding`, or `ghl-create-subaccount`. Never rotate the GHL OAuth credentials without updating the token in the new project first.

### Wallet Balance Breaks If `tracking_start_date` Is Missing

- What makes it fragile: If a `client_wallets` row exists but `tracking_start_date` is NULL, `walletRemaining` is returned as `0` rather than the actual balance. This is documented in CLAUDE.md but has no runtime warning.
- Files: `src/hooks/useCampaignCommandCenter.ts:396-412`, `supabase/functions/sync-stripe-charges/index.ts:101-108`
- Safe modification: Always verify `tracking_start_date` is set after any client wallet creation. The `sync-stripe-charges` function sets it on first deposit, but manually created wallets may not have it.

### Two Stripe Accounts Without SDK — Raw `fetch()` Only

- What makes it fragile: All Stripe API calls use raw `fetch()` with manual URL construction. There is no automatic retry, rate-limit handling, or typed response validation. A Stripe API version change or new field could silently break existing parsing.
- Files: `supabase/functions/sync-stripe-charges/index.ts`, `supabase/functions/stripe-billing-webhook/index.ts`, `supabase/functions/auto-recharge-run/index.ts`, and 20 others
- Safe modification: When adding or modifying Stripe interactions, manually check the API version header (`Stripe-Version`) and test against both the `management` and `ad_spend` Stripe accounts.

### `VITE_` Env Vars Used Inside Edge Functions

- What makes it fragile: `get-stripe-config/index.ts` reads `VITE_STRIPE_MANAGEMENT_PUBLISHABLE_KEY` and `VITE_STRIPE_AD_SPEND_PUBLISHABLE_KEY` — `VITE_` is a Vite frontend prefix and these secrets must be separately set as Supabase function secrets. If only the Vite env is updated, the edge function silently returns empty strings.
- Files: `supabase/functions/get-stripe-config/index.ts:13-14`
- Fix approach: Store these under non-prefixed secret names in Supabase and read them from `Deno.env.get('STRIPE_MANAGEMENT_PUBLISHABLE_KEY')`.

### Google Ads Uses a Single Shared OAuth Refresh Token for All Clients

- What makes it fragile: All Google Ads operations (budget updates, campaign sync, targeting sync, morning review) authenticate with a single `GOOGLE_ADS_REFRESH_TOKEN` env var. If this token is revoked (e.g., password change on the associated Google account) all Google Ads operations break for all clients simultaneously.
- Files: `supabase/functions/update-google-ads-budget/index.ts`, `supabase/functions/sync-google-ads/index.ts`, `supabase/functions/morning-review-job/index.ts`, and 7 other functions
- Safe modification: There is no per-client isolation. A single revocation is a full outage.

---

## Performance Concerns

### `mcp-proxy` Is 2,644 Lines and Runs Unbounded Parallel DB Queries

- Problem: The function fires up to 10 `Promise.all()` batches with 8-10 parallel Supabase queries each. For the `get_daily_dashboard` tool, 10 queries run in parallel on every call. With no query limits on some paths and 100+ clients, this can generate very large result sets.
- Files: `supabase/functions/mcp-proxy/index.ts` (lines 839-870 — `getDailyDashboard` fires 10 parallel queries)
- Impact: Slow response times and potential Supabase query timeout (default 30s) on large datasets.

### `admin-reset-user` Calls `auth.admin.listUsers()` Which Loads All Users

- Problem: On each call to create/reset a user, `listUsers()` fetches all auth users (no page size specified) and then filters in memory with `Array.find()`.
- Files: `supabase/functions/admin-reset-user/index.ts:68`
- Fix approach: Use `supabase.auth.admin.listUsers({ page: 1, perPage: 50 })` and paginate, or query `profiles` table by email instead.

---

## Missing Critical Features

### No Post-Deploy Validation Step

- Problem: There is no automated check after a Vercel deploy that the frontend is serving the expected version, and no check after edge function deploys that functions are returning healthy responses.
- Impact: Broken deploys go undetected until a user reports an issue.

### No Webhook Signature Verification for GHL Webhooks

- Problem: `lead-webhook`, `lead-status-webhook`, `agent-onboarding-webhook`, and `agent-update-webhook` all accept GHL webhook payloads without verifying a shared secret or HMAC signature. Any caller knowing the endpoint URL can inject fake leads or status changes.
- Files: `supabase/functions/lead-webhook/index.ts` (validates an API key from the DB — partial mitigation), `supabase/functions/lead-status-webhook/index.ts`, `supabase/functions/agent-onboarding-webhook/index.ts`, `supabase/functions/agent-update-webhook/index.ts`

### No Retry or Dead-Letter Queue for Failed Edge Function Invocations

- Problem: If `stripe-billing-webhook` or `run-full-onboarding` throws an unhandled error, the event is lost. Stripe will retry webhook delivery up to 3 times, but internal function-to-function calls (e.g., `morning-review-job` calling `update-google-ads-budget`) have no retry mechanism.
- Impact: Missed billing events, incomplete onboardings, or stale campaign budgets with no visibility.

---

## Dependencies at Risk

### `deno.land/std@0.168.0` — Outdated Deno Standard Library

- Risk: 51 functions depend on this version from 2022. Supabase Edge Runtime has moved to newer Deno versions. Behavior differences between runtime and imported std can cause subtle bugs.
- Migration plan: Migrate all functions to `Deno.serve()` and remove the `std` import entirely.

### `esm.sh/@supabase/supabase-js@2` — Pinned at Major Version Only

- Risk: All edge functions use `@supabase/supabase-js@2` from esm.sh with no minor/patch pin. A breaking change in a `@2.x` release would immediately affect all deployed functions on next cold start.
- Migration plan: Pin to a specific version (e.g., `@supabase/supabase-js@2.43.4`) in all function imports.

---

*Concerns audit: 2026-03-12*
