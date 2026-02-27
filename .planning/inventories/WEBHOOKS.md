# Webhooks & External Integration Inventory

**Source:** Edge function analysis, config.toml, and Lovable extraction
**Audited:** 2026-02-27

---

## URL Patterns

| Pattern | Old (Source) | New (Target) |
|---------|-------------|-------------|
| Edge Functions | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/{function}` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/{function}` |
| Storage | `https://qydkrpirrfelgtcqasdx.supabase.co/storage/v1/object/public/{bucket}/{path}` | `https://qcunascacayiiuufjtaq.supabase.co/storage/v1/object/public/{bucket}/{path}` |

All 106 edge functions have `verify_jwt = false` in config.toml (89 explicitly listed; remaining 17 use Supabase default which is `true`, but per CODEBASE.md audit, "all functions" are listed as verify_jwt=false). Auth is handled internally per function via authorization headers, API keys, or Stripe signature verification.

---

## 1. Stripe Webhooks (CRITICAL)

AlphaHub uses two Stripe accounts: **management** (platform fees) and **ad_spend** (advertising charges).

| Service | Direction | Function | Current URL Pattern | New URL Pattern | Where to Update | Priority |
|---------|-----------|----------|---------------------|-----------------|-----------------|----------|
| Stripe (Management) | INBOUND | `stripe-billing-webhook` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/stripe-billing-webhook` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/stripe-billing-webhook` | Stripe Dashboard (management account) > Developers > Webhooks | CRITICAL |
| Stripe (Ad Spend) | INBOUND | `stripe-billing-webhook` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/stripe-billing-webhook` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/stripe-billing-webhook` | Stripe Dashboard (ad_spend account) > Developers > Webhooks | CRITICAL |
| Stripe (Legacy) | INBOUND | `stripe-webhook` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/stripe-webhook` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/stripe-webhook` | Stripe Dashboard > Webhooks (check both accounts) | CRITICAL |
| Stripe (Disputes) | INBOUND | `dispute-webhook` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/dispute-webhook` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/dispute-webhook` | Stripe Dashboard > Webhooks (check both accounts) | CRITICAL |

**Notes:**
- `stripe-billing-webhook` is the primary handler with HMAC-SHA256 signature verification. Both Stripe accounts point to the same function.
- `stripe-webhook` and `dispute-webhook` do NOT verify signatures -- security risk to address during migration.
- When new webhook endpoints are created in Stripe, new `STRIPE_*_WEBHOOK_SECRET` values are generated. These must be set as Supabase secrets.

**Events handled:**
- `stripe-billing-webhook`: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.*`, `payment_intent.succeeded`
- `stripe-webhook`: `checkout.session.completed`, `payment_intent.succeeded` (legacy)
- `dispute-webhook`: `charge.dispute.*`

---

## 2. GHL / LeadConnector Webhooks

| Service | Direction | Function | Current URL Pattern | New URL Pattern | Where to Update | Priority |
|---------|-----------|----------|---------------------|-----------------|-----------------|----------|
| GHL OAuth | INBOUND | `crm-oauth-callback` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/crm-oauth-callback` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/crm-oauth-callback` | GHL Marketplace App Settings (Redirect URI) + `GHL_REDIRECT_URI` Supabase secret | HIGH |
| GHL Stage Sync | OUTBOUND | `ghl-stage-sync` | N/A (calls GHL webhook URL) | No change needed (URL stored in `GHL_STAGE_WEBHOOK_URL` secret) | N/A -- outbound to GHL | MEDIUM |
| GHL Lead Status | INBOUND | `lead-status-webhook` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/lead-status-webhook` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/lead-status-webhook` | GHL Workflow Settings (webhook action URL) | HIGH |
| GHL Prospect Post-Booking | OUTBOUND | `prospect-post-booking` | N/A (calls GHL webhook URL) | No change needed (URL stored in `GHL_PROSPECT_WEBHOOK_URL` secret) | N/A -- outbound to GHL | MEDIUM |

**Notes:**
- `crm-oauth-callback` is the OAuth redirect endpoint. Must be updated in BOTH the GHL Marketplace App configuration AND the `GHL_REDIRECT_URI` Supabase secret.
- `lead-status-webhook` receives pipeline stage change events from GHL workflows. URL must be updated in each GHL workflow that sends status updates.
- Outbound URLs (GHL_STAGE_WEBHOOK_URL, GHL_PROSPECT_WEBHOOK_URL) are stored as Supabase secrets and point TO GHL, not from GHL. No URL change needed for these.

---

## 3. Lead Source Webhooks

| Service | Direction | Function | Current URL Pattern | New URL Pattern | Where to Update | Priority |
|---------|-----------|----------|---------------------|-----------------|-----------------|----------|
| External Lead Sources | INBOUND | `lead-webhook` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/lead-webhook` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/lead-webhook` | Every external lead source that sends leads (API key validated via `x-api-key` header) | HIGH |
| Form Submissions | INBOUND | `submit-webhook` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/submit-webhook` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/submit-webhook` | Any external form that posts to this endpoint | HIGH |
| Test Lead | INBOUND | `send-test-lead` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/send-test-lead` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/send-test-lead` | Internal testing tools | LOW |

**Notes:**
- `lead-webhook` validates incoming leads using `x-api-key` header against `webhook_api_keys` table. The API keys are per-client and stored in the database -- they migrate with the database.
- All lead sources (ad platforms, landing pages, partner integrations) must be updated to use the new URL.

---

## 4. Onboarding & Agent Webhooks

| Service | Direction | Function | Current URL Pattern | New URL Pattern | Where to Update | Priority |
|---------|-----------|----------|---------------------|-----------------|-----------------|----------|
| External AI Agent | INBOUND | `agent-onboarding-webhook` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/agent-onboarding-webhook` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/agent-onboarding-webhook` | External AI agent configuration (onboarding trigger) | HIGH |
| Agent Profile Updates | INBOUND | `agent-update-webhook` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/agent-update-webhook` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/agent-update-webhook` | External agent profile update service (validates `x-api-key`) | MEDIUM |
| Onboarding Bridge | INBOUND | `onboarding-bridge` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/onboarding-bridge` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/onboarding-bridge` | Internal: called by `agent-onboarding-webhook` via `SUPABASE_URL` (auto-updates) | LOW (auto) |

**Notes:**
- `agent-onboarding-webhook` is the primary onboarding trigger. It validates via `CONVERSION_API_KEY` header.
- `onboarding-bridge` is called internally using `SUPABASE_URL` -- URL updates automatically.

---

## 5. Prospect Pipeline Webhooks

| Service | Direction | Function | Current URL Pattern | New URL Pattern | Where to Update | Priority |
|---------|-----------|----------|---------------------|-----------------|-----------------|----------|
| Booking Platform | INBOUND | `prospect-booking-webhook` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/prospect-booking-webhook` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/prospect-booking-webhook` | Booking/calendar platform webhook settings | MEDIUM |
| Abandoned Tracking | INBOUND | `prospect-abandoned-webhook` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/prospect-abandoned-webhook` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/prospect-abandoned-webhook` | Tracking service webhook settings | MEDIUM |

---

## 6. Fathom Analytics Webhooks

| Service | Direction | Function | Current URL Pattern | New URL Pattern | Where to Update | Priority |
|---------|-----------|----------|---------------------|-----------------|-----------------|----------|
| Fathom AI | INBOUND | `fathom-webhook` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/fathom-webhook` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/fathom-webhook` | Fathom AI dashboard > Webhook settings | MEDIUM |

---

## 7. MCP Proxy Endpoint

| Service | Direction | Function | Current URL Pattern | New URL Pattern | Where to Update | Priority |
|---------|-----------|----------|---------------------|-----------------|-----------------|----------|
| MCP Clients | INBOUND | `mcp-proxy` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/mcp-proxy` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/mcp-proxy` | All MCP client configurations (Claude Code, n8n, etc.) | HIGH |

**Notes:**
- `mcp-proxy` is the Model Context Protocol endpoint that exposes database queries and operations as MCP tools.
- Authenticated via `MCP_PROXY_SECRET` header.
- Any tool that connects to AlphaHub via MCP must update its endpoint URL.

---

## 8. Slack Notifications (OUTBOUND)

These are outbound calls -- our functions POST to Slack webhook URLs. The Slack URLs themselves do NOT change during migration.

| Service | Direction | Function | Slack Secret Used | Where to Update | Priority |
|---------|-----------|----------|-------------------|-----------------|----------|
| Slack (Ads Manager) | OUTBOUND | ads-manager-slack-test, check-lead-discrepancy, check-low-balance, execute-proposal, google-ads-enhanced-conversion, mcp-proxy, morning-review-job | `SLACK_ADS_MANAGER_WEBHOOK_URL` | No URL change -- outbound to Slack | N/A |
| Slack (Chat) | OUTBOUND | agent-onboarding-webhook, chat-notification, mcp-proxy | `SLACK_CHAT_WEBHOOK_URL` | No URL change -- outbound to Slack | N/A |

**Notes:**
- Outbound Slack webhooks do NOT need URL changes. The Slack webhook URLs point TO Slack, not to AlphaHub.
- However, the secret values must be set in the new Supabase project (see SECRETS.md).

---

## 9. Slack Interactive Actions (INBOUND)

| Service | Direction | Function | Current URL Pattern | New URL Pattern | Where to Update | Priority |
|---------|-----------|----------|---------------------|-----------------|-----------------|----------|
| Slack Interactive | INBOUND | `slack-ads-actions` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/slack-ads-actions` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/slack-ads-actions` | Slack App Settings > Interactivity & Shortcuts > Request URL | MEDIUM |

**Notes:**
- This handles button clicks in Slack messages (e.g., "Approve" / "Reject" on ads manager proposals).
- Verified via `SLACK_ADS_MANAGER_SIGNING_SECRET`.

---

## 10. Tracking & Frontend

| Service | Direction | Function | Current URL Pattern | New URL Pattern | Where to Update | Priority |
|---------|-----------|----------|---------------------|-----------------|-----------------|----------|
| Frontend Tracking | INBOUND | `track-event` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/track-event` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/track-event` | Frontend code (auto-updates via SUPABASE_URL in tracking-script) | LOW (auto) |
| Tracking Script | INBOUND | `tracking-script` | `https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/tracking-script` | `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/tracking-script` | Any external sites embedding the tracking script | MEDIUM |

**Notes:**
- `tracking-script` serves JavaScript that calls `track-event`. The script builds the `track-event` URL from `SUPABASE_URL`, so the script itself auto-updates.
- However, external sites that load the tracking script via `<script src="...">` need their script URL updated.

---

## 11. Internal Function-to-Function Calls (Auto-Update)

These functions call other edge functions using `SUPABASE_URL`. They do NOT need manual URL updates -- they auto-resolve to the new project URL.

| Caller Function | Calls | Pattern |
|----------------|-------|---------|
| `auto-recharge-run` | `create-stripe-invoice`, `check-low-balance` | `${supabaseUrl}/functions/v1/...` |
| `agent-onboarding-webhook` | `run-full-onboarding`, `onboarding-bridge`, `refresh-stable-headshot` | `${supabaseUrl}/functions/v1/...` |
| `create-stripe-invoice` | `update-google-ads-budget` | `${supabaseUrl}/functions/v1/...` |
| `inject-lead-to-ghl` | `crm-location-token` | `${supabaseUrl}/functions/v1/...` |
| `lead-webhook` | `inject-lead-to-ghl` | `${supabaseUrl}/functions/v1/...` |
| `lookup-ghl-contact` | `crm-location-token` | `${supabaseUrl}/functions/v1/...` |
| `manual-wallet-refill` | `create-stripe-invoice` | `${supabaseUrl}/functions/v1/...` |
| `mcp-proxy` | `update-google-ads-budget`, `update-google-ads-targeting` | `${supabaseUrl}/functions/v1/...` |
| `prospect-contact-capture` | `crm-location-token` | `${supabaseUrl}/functions/v1/...` |
| `prospect-inactivity-check` | `crm-location-token` | `${supabaseUrl}/functions/v1/...` |
| `prospect-qualification-submit` | `crm-location-token` | `${supabaseUrl}/functions/v1/...` |
| `retry-failed-lead-delivery` | `inject-lead-to-ghl` | `${supabaseUrl}/functions/v1/...` |
| `run-full-onboarding` | Multiple functions (18-step orchestration) | `${supabaseUrl}/functions/v1/...` |
| `stripe-billing-webhook` | `update-google-ads-budget`, `process-referral-commission`, `create-stripe-invoice` | `${supabaseUrl}/functions/v1/...` |
| `sync-a2p-status` | `crm-location-token` | `${supabaseUrl}/functions/v1/...` |
| `sync-ghl-appointments` | `crm-location-token` | `${supabaseUrl}/functions/v1/...` |
| `tracking-script` | `track-event` (serves JS that calls this) | `SUPABASE_URL + '/functions/v1/track-event'` |
| `verify-lead-delivery` | `crm-location-token` | `${supabaseUrl}/functions/v1/...` |
| `verify-onboarding-live` | `lead-webhook` | `${supabaseUrl}/functions/v1/...` |

---

## 12. Hardcoded Old Project References

These files contain the old project ref (`qydkrpirrfelgtcqasdx`) hardcoded and must be updated:

| File | Line | Content | Action |
|------|------|---------|--------|
| `supabase/config.toml` | 1 | `project_id = "qydkrpirrfelgtcqasdx"` | Update to `qcunascacayiiuufjtaq` (or handled by `supabase link`) |
| `supabase/migrations/20260105224855_*.sql` | 5, 12 | Default image URL: `https://qydkrpirrfelgtcqasdx.supabase.co/storage/v1/object/public/media/...` | Update to new project ref or use relative storage path |
| `.env` | - | `VITE_SUPABASE_URL=https://qydkrpirrfelgtcqasdx.supabase.co` | Update to new project URL |

---

## 13. Cron Job Webhooks (Internal)

6 cron jobs invoke edge functions via `net.http_post()` in PostgreSQL. These use the project's internal URL and will need to reference the new project URL in their cron job definitions.

| Cron Job | Function Called | Schedule | Update Method |
|----------|----------------|----------|---------------|
| prospect-inactivity-check | `prospect-inactivity-check` | `*/1 * * * *` | Re-create pg_cron job with new URL |
| auto-recharge-run | `auto-recharge-run` | `0 6 * * *` | Re-create pg_cron job with new URL |
| sync-all-google-ads | `sync-all-google-ads` | Unknown | Re-create pg_cron job with new URL |
| check-low-balance | `check-low-balance` | Unknown | Re-create pg_cron job with new URL |
| hourly-approval-reminder | `hourly-approval-reminder` | `0 * * * *` | Re-create pg_cron job with new URL |
| morning-review-job | `morning-review-job` | `0 13 * * 1-5` | Re-create pg_cron job with new URL |

**Notes:**
- These pg_cron jobs use `net.http_post()` to call edge functions with the anon key.
- The URLs in the cron job definitions contain the old project ref.
- During Phase 2 (database migration), these cron jobs must be re-created with the new project URL and anon key.

---

## Summary

### By Priority

| Priority | Count | Endpoints |
|----------|-------|-----------|
| CRITICAL | 4 | Stripe webhooks (billing x2, legacy, disputes) |
| HIGH | 6 | GHL OAuth callback, lead-status-webhook, lead-webhook, submit-webhook, agent-onboarding-webhook, mcp-proxy |
| MEDIUM | 7 | agent-update-webhook, prospect-booking-webhook, prospect-abandoned-webhook, fathom-webhook, slack-ads-actions, tracking-script, GHL stage/prospect outbound |
| LOW | 3 | send-test-lead, onboarding-bridge (auto), track-event (auto) |
| N/A (auto) | 19+ | Internal function-to-function calls + outbound Slack |

### By Direction

| Direction | Count | Notes |
|-----------|-------|-------|
| INBOUND (external calls us) | 17 | Must update URL in external service |
| OUTBOUND (we call external) | 4 | No URL change needed (Slack, GHL outbound) |
| INTERNAL (function-to-function) | 19+ | Auto-update via SUPABASE_URL |

### Total External URL Changes Needed

**17 inbound webhook endpoints** across 8 external services must be reconfigured to point to the new Supabase project URL.

### Migration Order (Recommended)

1. **Phase 3:** Deploy all edge functions to new project (functions exist at new URLs)
2. **Phase 4 (Stripe):** Update Stripe webhook URLs in both dashboard accounts (CRITICAL -- do billing first)
3. **Phase 5 (Cutover):** Update all remaining external service webhook URLs:
   - GHL OAuth redirect URI
   - GHL workflow webhook URLs
   - Lead source webhook URLs
   - Fathom webhook URL
   - Slack interactive actions URL
   - MCP client configurations
   - External tracking script references

---

*Cross-references: SUPABASE-PROJECT.md (URL patterns), SECRETS.md (webhook secrets), CODEBASE.md (function inventory)*
