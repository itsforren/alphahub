# Domain Pitfalls: AlphaHub Lovable-to-Supabase Migration

**Domain:** Production SaaS migration (Lovable Cloud to self-managed Supabase) with live billing
**Researched:** 2026-02-26
**System scope:** 111 tables, 135 migrations, 98 edge functions, 2 Stripe accounts, 70+ subscriptions, ~15 active clients

---

## Critical Pitfalls

Mistakes that cause revenue loss, security breaches, or require emergency rollback.

---

### Pitfall 1: Stripe Webhook Endpoints Pointing to Dead Supabase URL

**Severity:** CRITICAL
**Phase:** Cutover / Stripe Migration
**Confidence:** HIGH (verified via Stripe docs + system status doc)

**What goes wrong:** Both Stripe accounts currently have webhooks pointing to `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/stripe-billing-webhook`. After migration, this URL will be on the OLD Supabase project. If webhooks are not updated atomically with the cutover, payment events (invoice.paid, invoice.payment_failed, payment_action_required) are silently lost. The management account listens to 223 event types; the ad spend account listens to 20.

**Why it happens:** Teams focus on database and frontend migration and treat Stripe webhook updates as "cleanup." But Stripe fires webhooks continuously -- subscriptions renew, auto-recharge runs daily at 6 AM UTC, disputes arrive unpredictably. Any gap means:
- Payments succeed in Stripe but billing_records stay "pending" in the database
- Wallet deposits never get created after ad spend charges
- Next recurring billing records never get generated (breaking the auto-billing chain)
- Failed payment alerts never fire (clients overdraw without safe mode triggering)

**Consequences:**
- Revenue recognized in Stripe but not reflected in AlphaHub
- Wallet balances become incorrect (deposits missed)
- Auto-billing chain breaks permanently (no next-month record generated)
- Ad campaigns may run without funded wallets

**Prevention:**
1. Update webhook endpoints in BOTH Stripe accounts BEFORE the old project goes offline
2. Use Stripe's webhook endpoint "roll secret" feature with 24-hour overlap to allow both old and new signing secrets to be active during transition
3. Register the new webhook endpoints on the new Supabase project while keeping old ones active -- Stripe supports multiple endpoints per event
4. Verify webhook delivery in Stripe Dashboard after cutover (check for failed deliveries)
5. Run a reconciliation query post-cutover: compare Stripe charges from the last 24 hours against billing_records to catch any missed events

**Detection:**
- Stripe Dashboard shows failed webhook deliveries (red indicators)
- billing_records with status "pending" that have a stripe_invoice_id where the Stripe invoice is actually paid
- Wallet balances that don't match expected deposits
- Missing system_alerts for failed payments

**Sources:**
- [Stripe webhook docs](https://docs.stripe.com/billing/subscriptions/webhooks) (HIGH confidence)
- [Stripe webhook signature verification](https://docs.stripe.com/webhooks/signature) (HIGH confidence)
- System status doc confirming current webhook URLs and event counts

---

### Pitfall 2: RLS Policies Missing After pg_dump/Restore

**Severity:** CRITICAL
**Phase:** Database Migration
**Confidence:** HIGH (verified via Supabase official docs)

**What goes wrong:** Standard pg_dump captures RLS policy definitions but may not preserve the `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` state on all tables. The new project comes up with tables that have policy definitions but RLS not actually enabled. This means the anon key becomes a skeleton key -- any authenticated or unauthenticated request can read/write all data.

This is not theoretical. CVE-2025-48757 exposed 170+ Lovable-generated applications due to missing RLS, and researchers found PII, financial data, Stripe payment statuses, and API keys exposed. AlphaHub contains client billing data, wallet balances, payment methods, and Stripe customer mappings.

**Why it happens:**
- Lovable-managed Supabase projects may have RLS configured through the Lovable UI, not through migration files
- pg_dump with Supabase CLI flags excludes managed schemas, which may strip RLS-related configuration
- Auth and storage schema modifications (triggers, RLS policies) require separate restoration per Supabase docs
- Teams test with the service_role key during migration and never validate anon-key access

**Consequences:**
- All client data publicly accessible via Supabase REST API with just the anon key
- Payment method records, Stripe customer IDs, wallet balances exposed
- Potential regulatory violations (PII exposure)
- Complete security breach requiring incident response

**Prevention:**
1. After restore, run this verification query on EVERY table:
   ```sql
   SELECT schemaname, tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY tablename;
   ```
2. Any table showing `rowsecurity = false` that had policies in the old project needs `ALTER TABLE tablename ENABLE ROW LEVEL SECURITY`
3. Use `supabase db diff --linked --schema auth,storage > changes.sql` to capture auth/storage RLS policies separately
4. Test with the anon key (not service_role) after migration -- attempt to SELECT from sensitive tables without authentication
5. Use Supabase Security Advisor in the dashboard to scan for missing RLS
6. Explicitly verify RLS on critical tables: clients, billing_records, client_wallets, wallet_transactions, client_payment_methods, client_stripe_customers

**Detection:**
- Supabase Security Advisor flags tables without RLS
- Test: `curl` the Supabase REST API with only the anon key and attempt to read client data
- Compare `pg_tables.rowsecurity` between old and new projects

**Sources:**
- [Supabase backup/restore docs](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) (HIGH confidence)
- [CVE-2025-48757 / Lovable RLS vulnerability](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/) (HIGH confidence)
- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod) (HIGH confidence)

---

### Pitfall 3: Auth Users Lose Sessions / Google OAuth Callback Mismatch

**Severity:** CRITICAL
**Phase:** Auth Migration
**Confidence:** HIGH (verified via Supabase official docs)

**What goes wrong:** Two distinct failure modes:

**3a: JWT Secret mismatch** -- Each Supabase project has a unique JWT secret. If the new project uses a different JWT secret (the default), ALL existing auth tokens become invalid instantly. Every user gets logged out simultaneously. For AlphaHub's ~15 active clients who rely on the dashboard daily for campaign management, this means confusion, support requests, and potential perception of platform instability.

**3b: Google OAuth redirect URL mismatch** -- Google OAuth requires an exact match between the authorized redirect URI in Google Cloud Console and the Supabase project's callback URL. The old project's callback was `https://qydkrpirrfelgtcqasdx.supabase.co/auth/v1/callback`. The new project will have a different project ref and therefore a different callback URL. If Google Cloud Console is not updated, Google login fails completely -- not partially, completely.

**Why it happens:**
- JWT secret is auto-generated per project and easy to overlook
- Google OAuth redirect URLs are managed in Google Cloud Console (separate from Supabase), so they are easy to forget
- Teams test with email/password login during staging and never validate OAuth flow

**Consequences:**
- 3a: All users must re-authenticate. Manageable but disruptive.
- 3b: Google login returns "redirect_uri_mismatch" error. Users cannot log in at all. No workaround exists except fixing the redirect URL.

**Prevention:**
1. **JWT Secret:** Copy the JWT secret from Settings > API in the old project and set it as custom JWT secret in the new project BEFORE migrating auth data. This preserves all existing tokens. Note: this will regenerate the anon and service_role keys in the new project, so update all downstream references.
2. **Google OAuth:** Update Google Cloud Console authorized redirect URIs to include the new Supabase project's callback URL (`https://NEW_PROJECT_REF.supabase.co/auth/v1/callback`) BEFORE cutover. Keep the old URI during transition.
3. **Frontend redirect URLs:** Update the Supabase Auth redirect URL configuration in the new project dashboard to include the new frontend domain.
4. Migrate auth schema tables using the documented approach -- auth.users, auth.identities (for OAuth), auth.sessions.
5. Test Google login end-to-end in the new project before cutover.

**Detection:**
- Users report "redirect_uri_mismatch" errors on login
- Auth logs in Supabase dashboard show JWT verification failures
- Session counts drop to zero after migration

**Sources:**
- [Supabase auth migration docs](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects) (HIGH confidence)
- [Supabase Google OAuth docs](https://supabase.com/docs/guides/auth/social-login/auth-google) (HIGH confidence)
- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) (HIGH confidence)

---

### Pitfall 4: Wallet Balances Incorrect After Migration (Financial Data Integrity)

**Severity:** CRITICAL
**Phase:** Data Migration / Validation
**Confidence:** MEDIUM (based on system architecture analysis + general migration principles)

**What goes wrong:** Wallet balances in AlphaHub are computed values: `balance = Total Deposits - (Tracked Spend x Performance %)`. This depends on the integrity of wallet_transactions, ad_spend_daily records, and billing_records. If any of these tables have missing rows, truncated data, or referential integrity issues after migration, wallet balances silently become wrong.

Additionally, if pg_dump/restore runs while the auto-recharge-run cron job fires (6 AM UTC daily), a deposit could be recorded in the old database after the dump was taken but before webhook processing completes, creating a split-brain scenario.

**Why it happens:**
- Computed balances don't have a single "source of truth" column -- they depend on transaction history
- Foreign key relationships between wallet_transactions, billing_records, and client_wallets must all be intact
- The pg_dump is a point-in-time snapshot; any writes between dump and cutover create drift
- Double-precision floating point arithmetic in financial calculations can produce different results if data is incomplete

**Consequences:**
- Clients are charged incorrectly (over-charged or under-charged)
- Auto-recharge triggers at wrong thresholds
- Safe mode triggers incorrectly (or fails to trigger when it should)
- Financial projections and reporting become unreliable
- Client trust destroyed if they notice balance discrepancies

**Prevention:**
1. Schedule the pg_dump during a quiet window (NOT at 6 AM UTC when auto-recharge runs)
2. Put the old system in read-only mode (disable edge functions / cron) before taking the dump
3. After restore, run a wallet balance reconciliation:
   ```sql
   -- Compare computed wallet balances between old and new
   SELECT cw.id, cw.client_id, cw.balance,
          (SELECT SUM(amount) FROM wallet_transactions WHERE wallet_id = cw.id AND type = 'deposit') as total_deposits,
          (SELECT SUM(amount) FROM wallet_transactions WHERE wallet_id = cw.id AND type = 'spend') as total_spend
   FROM client_wallets cw;
   ```
4. Cross-reference wallet balances with Stripe charge history for the last 30 days
5. Document the exact timestamp of the pg_dump and verify no Stripe webhook events occurred between dump and cutover

**Detection:**
- Compare wallet balances between old and new databases immediately after restore
- Check for wallet_transactions in the old database with timestamps after the pg_dump
- Compare total billing_records counts and sum of amounts between databases
- Run get_ad_spend_overview via MCP on both old and new and diff results

---

### Pitfall 5: Edge Function Secrets Not Migrated

**Severity:** CRITICAL
**Phase:** Edge Function Deployment
**Confidence:** HIGH (verified via Supabase docs)

**What goes wrong:** The old Supabase project has 7+ secrets set via Lovable Cloud Secrets (MCP_PROXY_SECRET, 4 Stripe keys, 2 Stripe webhook signing secrets). These secrets are NOT included in pg_dump. They are NOT in the codebase. They exist only in the Lovable-managed Supabase project's secret store. If edge functions are deployed to the new project without setting these secrets, every function that touches Stripe, MCP, or external APIs will fail silently or throw errors.

The system has 98 edge functions. Many of them likely reference additional secrets beyond the 7 known ones (Plaid keys, GHL/CRM keys, Google Ads credentials, Slack webhook URLs, Webflow keys, ElevenLabs keys, Fathom keys, etc.).

**Why it happens:**
- Secrets are stored in Supabase's managed secret store, not in code
- Lovable Cloud manages secrets through its UI -- there is no export function
- Developers may not have a complete list of all secrets used
- Some secrets may have been set months ago and forgotten

**Consequences:**
- Stripe billing functions fail: no charges, no webhook verification, no auto-recharge
- MCP proxy becomes inaccessible (MCP_PROXY_SECRET mismatch)
- All external integrations break: GHL, Google Ads, Plaid, Slack, Webflow
- Cron jobs run but produce errors silently

**Prevention:**
1. Before migration, audit ALL edge functions for `Deno.env.get()` calls to build a complete secrets inventory:
   ```bash
   grep -r "Deno.env.get" supabase/functions/ | grep -v node_modules | sort -u
   ```
2. Document every unique secret name found
3. Retrieve current secret values from Lovable Cloud (or from ~/.zprofile for locally-stored copies)
4. Set ALL secrets in the new project using `supabase secrets set` or the dashboard
5. After deployment, verify each critical edge function with a test call
6. Keep a secrets manifest file (encrypted) for disaster recovery

**Detection:**
- Edge function logs showing "undefined" or empty environment variable errors
- Stripe webhook signature verification failures (wrong or missing signing secret)
- MCP proxy returning 401 Unauthorized
- Slack notifications stop arriving

**Sources:**
- [Supabase environment variables docs](https://supabase.com/docs/guides/functions/secrets) (HIGH confidence)
- [Supabase edge function environment variable troubleshooting](https://supabase.com/docs/guides/troubleshooting/inspecting-edge-function-environment-variables-wg5qOQ) (HIGH confidence)
- System status doc confirming 7+ known secrets

---

### Pitfall 6: Dual Stripe Account Confusion During Cutover

**Severity:** CRITICAL
**Phase:** Stripe Migration / Cutover
**Confidence:** MEDIUM (based on system architecture analysis)

**What goes wrong:** AlphaHub uses TWO separate Stripe accounts (management fees + ad spend). Each has its own:
- Secret key (STRIPE_MANAGEMENT_SECRET_KEY, STRIPE_AD_SPEND_SECRET_KEY)
- Webhook signing secret (STRIPE_MANAGEMENT_WEBHOOK_SECRET, STRIPE_AD_SPEND_WEBHOOK_SECRET)
- Publishable key (VITE_STRIPE_MANAGEMENT_PUBLISHABLE_KEY, VITE_STRIPE_AD_SPEND_PUBLISHABLE_KEY)
- Webhook endpoint URL
- Customer-to-client mappings (client_stripe_customers table)

During migration, it is easy to:
- Swap the management and ad_spend keys (charges go to wrong account)
- Update only one Stripe account's webhook endpoint and forget the other
- Mix up the webhook signing secrets (events fail verification on one account)
- Point both accounts' webhooks to the same endpoint but forget to test both event types

**Why it happens:**
- Having two Stripe accounts is uncommon; most guides assume one
- Key names are similar (just management vs ad_spend suffix)
- Copy-paste errors when setting 6+ secrets manually
- Testing one account and assuming the other works identically

**Consequences:**
- Management fees charged to ad spend account (or vice versa)
- One account's webhooks silently fail while the other works (partial breakage is harder to detect than total breakage)
- Webhook signature verification fails on one account only
- Client payment methods associated with wrong Stripe account

**Prevention:**
1. Create a migration checklist with explicit rows for EACH Stripe account
2. Test both accounts independently after migration -- do not assume symmetry
3. Verify webhook delivery in BOTH Stripe Dashboard accounts
4. After cutover, run get_stripe_balance via MCP to confirm both accounts return data
5. Use different test scenarios for each account (management fee invoice vs. ad spend deposit)

**Detection:**
- One Stripe account shows webhook failures, the other does not
- get_stripe_balance returns data for one account but errors on the other
- Billing records created but only for one billing type (management or ad_spend)

---

## High Severity Pitfalls

Mistakes that cause significant delays, partial outages, or require substantial rework.

---

### Pitfall 7: Cron Schedules Not Recreated

**Severity:** HIGH
**Phase:** Edge Function Deployment
**Confidence:** HIGH (verified via Supabase docs + config.toml analysis)

**What goes wrong:** AlphaHub has at least 2 cron-scheduled edge functions in config.toml:
- `auto-recharge-run`: `schedule = "0 6 * * *"` (daily at 6 AM UTC -- handles wallet auto-recharges)
- `prospect-inactivity-check`: `schedule = "*/1 * * * *"` (every minute)

Additionally, there may be pg_cron jobs configured directly in the database (morning-review-job, hourly-approval-reminder, aggregate-client-kpis, billing-collections-run, etc. -- function names suggest scheduled execution).

Cron schedules set via config.toml are applied during `supabase functions deploy` but only if the config.toml is correctly configured for the new project. pg_cron jobs stored in the `cron.job` table may or may not survive pg_dump/restore depending on schema handling.

**Why it happens:**
- config.toml has the old project_id (`qydkrpirrfelgtcqasdx`) hardcoded -- must be updated
- pg_cron extension may need to be explicitly enabled in the new project
- The `cron.job` table is in the cron schema, which may be excluded from default pg_dump
- Teams deploy functions and forget to verify schedules are active

**Consequences:**
- Auto-recharge never runs: clients with low wallets never get topped up, ad campaigns run out of budget and pause
- Billing collections emails never send
- Morning review job stops: operational visibility lost
- Prospect inactivity checks stop: leads go cold without follow-up

**Prevention:**
1. Update `project_id` in config.toml to the new project ref
2. After deploy, verify cron jobs via SQL: `SELECT * FROM cron.job;`
3. Verify the pg_cron extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
4. Manually recreate any pg_cron jobs that don't survive restore
5. Monitor edge function invocation logs for 24 hours after cutover to confirm scheduled executions
6. Set a calendar reminder to check auto-recharge-run execution at 6:05 AM UTC the morning after cutover

**Detection:**
- No entries in `cron.job` table after restore
- Edge function logs show no scheduled invocations
- Wallet balances declining without auto-recharge
- system_alerts for low balance not generating

**Sources:**
- [Supabase scheduling edge functions](https://supabase.com/docs/guides/functions/schedule-functions) (HIGH confidence)
- [Supabase pg_cron docs](https://supabase.com/docs/guides/database/extensions/pg_cron) (HIGH confidence)
- config.toml analysis showing 2 scheduled functions

---

### Pitfall 8: Realtime Publications Not Configured

**Severity:** HIGH
**Phase:** Database Migration
**Confidence:** MEDIUM (verified via Supabase docs, system usage unconfirmed)

**What goes wrong:** Supabase Realtime requires tables to be added to the `supabase_realtime` publication. This publication configuration is NOT transferred via pg_dump. After migration, any feature that uses Supabase Realtime subscriptions (live chat, real-time alerts, campaign status updates, ticket notifications) will silently stop receiving updates. The frontend will appear to work but never show new data until page refresh.

**Why it happens:**
- Publication configuration lives in PostgreSQL's replication system, separate from schema/data
- pg_dump does NOT include publication configurations
- Supabase documentation explicitly notes that realtime gets disabled for tables after migration
- Developers test by creating records and refreshing the page -- they don't notice missing realtime

**Consequences:**
- Chat messages don't appear in real-time (clients think messages aren't sending)
- Alert badges don't update
- Dashboard KPIs don't refresh
- Ticket status changes invisible until page reload

**Prevention:**
1. Before migration, query the old database for publication membership:
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```
2. After restore, recreate the publication:
   ```sql
   -- For each table that needs realtime:
   ALTER PUBLICATION supabase_realtime ADD TABLE table_name;
   ```
3. Also re-enable through the Supabase Dashboard: Database > Publications > supabase_realtime
4. Test realtime by opening two browser tabs and verifying changes propagate without refresh

**Detection:**
- Open browser DevTools and check for WebSocket connections to the realtime endpoint
- Create a chat message from one browser, check if it appears in another without refresh
- Query `pg_publication_tables` for the `supabase_realtime` publication

**Sources:**
- [Supabase Realtime postgres changes](https://supabase.com/docs/guides/realtime/postgres-changes) (HIGH confidence)
- [Supabase Realtime concepts](https://supabase.com/docs/guides/realtime/concepts) (HIGH confidence)

---

### Pitfall 9: Storage Objects Left Behind

**Severity:** HIGH
**Phase:** Data Migration
**Confidence:** HIGH (verified via Supabase official docs)

**What goes wrong:** pg_dump/restore transfers storage BUCKET definitions but NOT the actual stored files (objects). AlphaHub likely stores client documents, profile images, agent headshots, agreement PDFs, and other files in Supabase Storage. After migration, storage buckets exist but are empty. Any page or component that references stored files shows broken images or download errors.

**Why it happens:**
- Supabase explicitly states: "Database backups do not include objects stored via the Storage API"
- Storage objects are in object storage, not PostgreSQL
- The `storage.objects` table may have metadata rows but the actual files are separate
- Easy to miss if you focus on database migration

**Consequences:**
- Client profile images and agent headshots broken
- Agreement PDFs inaccessible
- Any uploaded documents lost
- Bio generation and onboarding flows that depend on uploaded content fail

**Prevention:**
1. Inventory all storage buckets in the old project
2. Use the Supabase-provided Node.js migration script to copy objects between projects:
   ```javascript
   // Supabase provides a script using @supabase/supabase-js to migrate storage
   // Must be run with service_role keys for both old and new projects
   ```
3. After migration, compare object counts per bucket between old and new projects
4. Verify storage RLS policies are also migrated (they are in the storage schema, which requires separate handling)

**Detection:**
- Broken image tags in the frontend
- 404 errors on storage URLs
- Compare `SELECT count(*) FROM storage.objects GROUP BY bucket_id` between old and new

**Sources:**
- [Supabase backup/restore docs](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) (HIGH confidence)

---

### Pitfall 10: config.toml Not Updated for New Project

**Severity:** HIGH
**Phase:** Edge Function Deployment
**Confidence:** HIGH (verified via codebase inspection)

**What goes wrong:** The `supabase/config.toml` file contains `project_id = "qydkrpirrfelgtcqasdx"` (the old Lovable-managed project). If this is not updated before deploying edge functions via the CLI, the deployment targets the OLD project or fails entirely. Additionally, the config.toml contains `verify_jwt = false` for all 98 functions and cron schedule definitions -- if a new config.toml is created from scratch instead of migrating the existing one, these settings may be lost.

**Why it happens:**
- config.toml is generated by `supabase link` but teams may not realize it needs the new project ref
- The 73 explicit `verify_jwt = false` entries are critical -- without them, all webhook endpoints and external API calls will require JWT auth and fail
- Easy to miss because deploying with wrong project_id may succeed silently (deploying to old project)

**Consequences:**
- Edge functions deployed to old project instead of new one
- If config.toml recreated without verify_jwt settings, all webhook endpoints start requiring JWT and fail
- Cron schedules lost if not included in config
- Deployment confusion about which project is actually running the functions

**Prevention:**
1. Update `project_id` in config.toml to the new project ref as the FIRST step
2. Preserve all `verify_jwt = false` entries and cron schedule entries
3. Run `supabase link --project-ref NEW_PROJECT_REF` to update the local link
4. After deploy, verify functions are running on the NEW project by checking the dashboard

**Detection:**
- `supabase functions list` shows functions in wrong project
- Edge function URLs still point to old project ref
- Webhook calls to new project return 401 (JWT required)

---

### Pitfall 11: Database Webhooks and Extensions Not Re-enabled

**Severity:** HIGH
**Phase:** Database Migration
**Confidence:** HIGH (verified via Supabase official docs)

**What goes wrong:** Supabase official docs explicitly state that after pg_dump/restore, the following must be manually re-enabled:
- Database webhooks (used for triggering edge functions from database events)
- Non-default PostgreSQL extensions (pg_cron, pg_net, postgis, etc.)
- Realtime publication settings

AlphaHub likely uses pg_cron (for scheduling), pg_net (for HTTP calls from PostgreSQL), and possibly other extensions. If these are not re-enabled, database-level automation silently stops working.

**Why it happens:**
- Extensions are in the pg_catalog schema, which is handled differently during dump/restore
- The `--no-owner --no-privileges` flags used in pg_dump strip extension ownership info
- Database webhooks are managed through Supabase's internal configuration, not SQL

**Consequences:**
- pg_cron jobs cannot execute (extension not loaded)
- pg_net HTTP calls from database functions fail
- Any triggers that depend on extensions produce errors
- Database-level automation appears deployed but does not execute

**Prevention:**
1. Before migration, list all extensions: `SELECT * FROM pg_extension;`
2. After restore, re-enable each extension through the Supabase Dashboard or SQL
3. Verify pg_cron and pg_net specifically: `SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');`
4. Test a pg_cron job execution after re-enabling

**Detection:**
- Queries referencing `cron.schedule()` or `net.http_post()` fail with "function does not exist"
- Cron job table empty or inaccessible

**Sources:**
- [Supabase backup/restore docs](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) (HIGH confidence)

---

### Pitfall 12: Frontend Deployed with Old Supabase URL/Keys

**Severity:** HIGH
**Phase:** Frontend Deployment
**Confidence:** HIGH (verified via codebase inspection)

**What goes wrong:** The frontend uses environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_STRIPE_MANAGEMENT_PUBLISHABLE_KEY`, `VITE_STRIPE_AD_SPEND_PUBLISHABLE_KEY`). These are baked into the build at compile time (Vite replaces `import.meta.env.VITE_*` at build time). If the frontend is built and deployed without updating these values:
- All Supabase API calls go to the OLD project
- Auth tokens are created against the OLD project
- The app appears to work but uses the old database

**Why it happens:**
- Vite env vars are compile-time, not runtime -- changing them requires a rebuild
- Teams may update the backend but forget to rebuild/redeploy the frontend
- The old Supabase URL may still be accessible for days/weeks, masking the issue
- If both projects are briefly running, the frontend using the old URL shows stale data

**Consequences:**
- Users interact with old database while backend is on new project
- Data written to old project, invisible in new project
- Split-brain scenario: some data in old DB, some in new DB
- Extremely difficult to reconcile after the fact

**Prevention:**
1. Create a `.env.production` file with ALL new values before building
2. Verify the built output contains new URLs: `grep -r "NEW_PROJECT_REF" dist/`
3. Do NOT deploy frontend until backend migration is verified
4. After deploying frontend, verify in browser DevTools (Network tab) that API calls go to new Supabase URL
5. Consider adding a health check endpoint that returns the project ref

**Detection:**
- Browser DevTools Network tab shows requests to old Supabase URL
- Search built JS bundles for old project ref
- Users report seeing old data or missing new records

---

## Moderate Pitfalls

Mistakes that cause delays, partial functionality loss, or require targeted fixes.

---

### Pitfall 13: Auth/Storage Schema Triggers Not Migrated Separately

**Severity:** MODERATE
**Phase:** Database Migration
**Confidence:** HIGH (verified via Supabase official docs)

**What goes wrong:** If AlphaHub has custom triggers on the `auth` or `storage` schemas (e.g., a trigger that creates a profile row when a new user signs up, or a trigger that logs storage uploads), these are NOT included in the standard pg_dump that excludes Supabase-managed schemas.

**Prevention:**
1. Run `supabase db diff --linked --schema auth,storage > auth_storage_changes.sql` on the old project
2. Review the diff for custom triggers, functions, and RLS policies
3. Apply the changes.sql to the new project after restore
4. Specifically check for user-creation triggers that populate application tables

---

### Pitfall 14: MCP Proxy and AlphaHub MCP Server Not Updated

**Severity:** MODERATE
**Phase:** Post-Cutover
**Confidence:** HIGH (verified via system status doc)

**What goes wrong:** Two MCP connections need updating:
1. The `alphahub-mcp` local server in `~/.claude.json` points to the old Supabase URL
2. Any external clients (OpenClaw/MoltBot) hitting the mcp-proxy endpoint use the old URL
3. The MCP_PROXY_SECRET may need to be updated if it changes

If these are not updated, Claude Code and external agents lose access to AlphaHub data -- a significant operational impact since MCP is used for daily business monitoring.

**Prevention:**
1. Update `~/.claude.json` SUPABASE_URL to new project URL
2. Notify any external MCP consumers (OpenClaw/MoltBot) of the new endpoint
3. Rebuild alphahub-mcp if any code changes are needed
4. Test MCP connectivity after cutover: call `list_tools` and `get_daily_dashboard`

---

### Pitfall 15: Double-Encryption of Data During Restore

**Severity:** MODERATE
**Phase:** Database Migration
**Confidence:** HIGH (verified via Supabase official docs)

**What goes wrong:** When restoring data, if `session_replication_role` is not set to `replica`, database triggers fire during the INSERT operations. If any triggers encrypt data (e.g., for PII protection), data that was already encrypted in the dump gets encrypted again, making it permanently unreadable.

**Prevention:**
1. Set `session_replication_role = 'replica'` before restoring data
2. This disables all triggers during the restore
3. Reset it to `'origin'` after restore completes
4. The Supabase CLI restore commands should handle this, but verify

**Sources:**
- [Supabase backup/restore docs](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) (HIGH confidence)

---

### Pitfall 16: Foreign Key Constraint Violations During Restore

**Severity:** MODERATE
**Phase:** Database Migration
**Confidence:** MEDIUM (general pg_restore knowledge + 111-table schema)

**What goes wrong:** With 111 tables and complex relationships (clients -> wallets -> transactions -> billing_records -> stripe_customers), restore order matters. If tables are restored out of dependency order, foreign key constraint violations cause partial data loss. The data dump using `--use-copy` may not respect FK ordering.

**Prevention:**
1. Use the three-dump approach from Supabase docs: roles, schema (without data), then data
2. The schema restore creates tables with FKs defined but no data
3. Set `session_replication_role = 'replica'` to disable FK checks during data restore
4. After data restore, verify referential integrity:
   ```sql
   -- Check for orphaned wallet_transactions
   SELECT COUNT(*) FROM wallet_transactions wt
   WHERE NOT EXISTS (SELECT 1 FROM client_wallets cw WHERE cw.id = wt.wallet_id);
   ```
5. Repeat for all critical FK relationships

---

### Pitfall 17: Lovable-Generated Code Has Hidden Supabase Dependencies

**Severity:** MODERATE
**Phase:** Frontend Migration
**Confidence:** MEDIUM (based on Lovable ecosystem research)

**What goes wrong:** Lovable generates code that may have implicit dependencies on Lovable's infrastructure:
- Auto-generated Supabase types file (`src/integrations/supabase/types.ts`) -- comment says "automatically generated, do not edit"
- The Supabase client file says "This file is automatically generated"
- Lovable may inject analytics, error tracking, or feature flags that depend on Lovable Cloud
- Lovable's build/deploy pipeline may apply transformations not present in the raw source

**Prevention:**
1. After exporting code via GitHub sync, do a full build locally (`npm run build`) and fix any errors
2. Search for Lovable-specific imports or references: `grep -r "lovable" src/`
3. Regenerate Supabase types against the new project: `supabase gen types typescript --project-id NEW_REF > src/integrations/supabase/types.ts`
4. Test every major feature in local dev before deploying

---

## Minor Pitfalls

Mistakes that cause inconvenience but are fixable without major impact.

---

### Pitfall 18: Migration History Not Preserved

**Severity:** MINOR
**Phase:** Database Migration
**Confidence:** HIGH (verified via Supabase docs)

**What goes wrong:** The `supabase_migrations` schema tracks which migrations have been applied. If not separately dumped and restored, the new project thinks no migrations have been applied. Running `supabase db push` or `supabase migration up` would try to re-apply all 135 migrations, which will fail on existing tables.

**Prevention:**
1. Separately dump and restore the `supabase_migrations` schema
2. Or mark all migrations as applied using `supabase migration repair`

---

### Pitfall 19: Custom Roles and Permissions Not Restored

**Severity:** MINOR
**Phase:** Database Migration
**Confidence:** HIGH (verified via Supabase docs)

**What goes wrong:** Custom database roles with login attributes have their passwords stripped during pg_dump. The roles restore but cannot authenticate until passwords are manually reset.

**Prevention:**
1. After restore, reset passwords for any custom roles
2. Document which roles exist before migration

---

### Pitfall 20: DNS/Domain Cutover Timing

**Severity:** MINOR
**Phase:** Cutover
**Confidence:** MEDIUM (general web deployment knowledge)

**What goes wrong:** If the frontend moves to a new domain or hosting provider, DNS propagation takes time (minutes to hours). During propagation, some users hit the old site, others hit the new one. Combined with the database migration, this creates a window where users may see stale data.

Currently the dashboard is at `conscious.sysconscious.com`. If this domain is re-pointed to a new hosting provider, the TTL of DNS records determines how long the transition takes.

**Prevention:**
1. Lower DNS TTL to 60 seconds 24-48 hours before cutover
2. Plan cutover during lowest-activity window
3. Keep old deployment serving a maintenance page during cutover
4. Verify DNS propagation using multiple DNS resolvers before announcing completion

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|---|---|---|---|
| Database schema dump | Auth/storage triggers excluded from default dump | CRITICAL | Use `supabase db diff --linked --schema auth,storage` separately |
| Database data restore | Double-encryption from active triggers | MODERATE | Set `session_replication_role = 'replica'` before restore |
| Database data restore | FK constraint violations from import order | MODERATE | Disable FK checks during restore, verify integrity after |
| Database post-restore | RLS not enabled on tables | CRITICAL | Verify `pg_tables.rowsecurity` for all public tables |
| Database post-restore | Realtime publications missing | HIGH | Query and recreate `supabase_realtime` publication entries |
| Database post-restore | Extensions not re-enabled | HIGH | Manually enable pg_cron, pg_net, and others |
| Database post-restore | Migration history missing | MINOR | Dump/restore `supabase_migrations` schema separately |
| Edge function deployment | Secrets not set in new project | CRITICAL | Audit all `Deno.env.get()` calls, set every secret |
| Edge function deployment | config.toml still references old project | HIGH | Update `project_id` before first deploy |
| Edge function deployment | Cron schedules not recreated | HIGH | Verify `cron.job` table and config.toml schedules |
| Edge function deployment | verify_jwt settings lost | HIGH | Preserve all 73 `verify_jwt = false` entries in config.toml |
| Auth migration | JWT secret mismatch invalidates all sessions | CRITICAL | Copy JWT secret from old project to new |
| Auth migration | Google OAuth redirect URL mismatch | CRITICAL | Update Google Cloud Console redirect URIs |
| Stripe cutover | Webhook endpoints still point to old URL | CRITICAL | Update BOTH Stripe accounts' webhook endpoints |
| Stripe cutover | Webhook signing secrets mixed up between accounts | CRITICAL | Test each account independently |
| Stripe cutover | Events lost during endpoint transition | CRITICAL | Use Stripe's secret rolling with 24h overlap |
| Frontend deployment | VITE env vars baked in with old values | HIGH | Rebuild with new .env.production, verify in built output |
| Storage migration | File objects not transferred (only bucket defs) | HIGH | Use Supabase storage migration script |
| Post-cutover | MCP server pointing to old URL | MODERATE | Update ~/.claude.json and notify external consumers |
| Post-cutover | Wallet balances incorrect | CRITICAL | Run reconciliation query comparing deposits vs Stripe charges |

---

## Pre-Cutover Checklist (Summary of All Preventions)

This checklist synthesizes all pitfall preventions into a sequential verification list:

### Before pg_dump
- [ ] Disable cron jobs / edge functions on old project (prevent writes during dump)
- [ ] Record the exact timestamp of the dump
- [ ] Note all active Realtime publication tables
- [ ] Note all enabled extensions
- [ ] Export auth/storage schema diffs separately
- [ ] Inventory ALL edge function secrets (grep for `Deno.env.get`)

### After restore to new project
- [ ] Verify RLS is ENABLED on all public tables (query pg_tables.rowsecurity)
- [ ] Re-enable extensions (pg_cron, pg_net, etc.)
- [ ] Recreate Realtime publications
- [ ] Restore auth/storage schema modifications
- [ ] Restore migration history
- [ ] Reset custom role passwords if applicable
- [ ] Run wallet balance reconciliation
- [ ] Verify referential integrity (no orphaned FK records)

### Before edge function deployment
- [ ] Update config.toml project_id to new project ref
- [ ] Preserve all verify_jwt = false settings
- [ ] Preserve cron schedule settings
- [ ] Set ALL secrets in new project
- [ ] Deploy all 98 functions
- [ ] Verify cron jobs registered (query cron.job table)

### Before auth cutover
- [ ] Copy JWT secret from old to new project (or accept session invalidation)
- [ ] Update Google Cloud Console redirect URIs for new callback URL
- [ ] Configure auth redirect URLs in new Supabase dashboard
- [ ] Test Google OAuth login end-to-end

### Before Stripe cutover
- [ ] Register new webhook endpoints in BOTH Stripe accounts
- [ ] Use Stripe's secret rolling for signing secret transition
- [ ] Verify webhook delivery in BOTH Stripe dashboards
- [ ] Test invoice creation, payment, and webhook processing for BOTH accounts

### Before frontend deployment
- [ ] Update .env.production with new Supabase URL, keys, and Stripe publishable keys
- [ ] Rebuild frontend
- [ ] Verify built JS does NOT contain old project ref
- [ ] Migrate storage objects (files, images)

### Post-cutover verification
- [ ] Update MCP server configuration (local + external consumers)
- [ ] Run get_daily_dashboard via MCP on new project
- [ ] Verify auto-recharge-run fires at next 6 AM UTC
- [ ] Monitor Stripe webhook delivery for 24 hours
- [ ] Compare wallet balances with Stripe charge history
- [ ] Test Google OAuth login as a real user
- [ ] Test chat realtime (send message, verify it appears without refresh)
- [ ] Verify storage files load (images, documents)

---

## Sources

### Supabase Official Documentation (HIGH confidence)
- [Backup and Restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Migrating within Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase)
- [Migrating Auth Users Between Projects](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects)
- [Google OAuth Login](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Edge Functions Environment Variables](https://supabase.com/docs/guides/functions/secrets)
- [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)
- [pg_cron Extension](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

### Stripe Official Documentation (HIGH confidence)
- [Using webhooks with subscriptions](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Webhook signature verification](https://docs.stripe.com/webhooks/signature)
- [Webhook endpoints API](https://docs.stripe.com/api/webhook_endpoints)

### Lovable Documentation (MEDIUM confidence)
- [Self-hosting Lovable projects](https://docs.lovable.dev/tips-tricks/self-hosting)

### Security Research (HIGH confidence)
- [CVE-2025-48757: 170+ Lovable apps exposed by missing RLS](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/)
- [Supabase MCP data leak analysis](https://simonwillison.net/2025/Jul/6/supabase-mcp-lethal-trifecta/)

### Community / WebSearch (LOW-MEDIUM confidence)
- [Lovable Cloud to Supabase Migration guide](https://www.staticbot.dev/deployment-guides/ai-tools/lovable-supabase-migration)
- [Workflow pitfalls with Lovable and Supabase](https://analysedigital.com/avoid-these-5-workflow-pitfalls-when-using-lovable-with-supabase/)
- [Stripe migration checklist](https://blog.trychargeblast.com/blog/stripe-migration-checklist/)

### Codebase Analysis (HIGH confidence)
- AlphaHub system status document (`alpha-hub-stripe-billing-status.txt`)
- `supabase/config.toml` inspection (98 functions, 73 verify_jwt=false entries, 2 cron schedules)
- `src/integrations/supabase/client.ts` inspection (env var usage confirmed)
- Edge function directory listing (98 functions confirmed)
- Migration file count (135 migrations confirmed)
