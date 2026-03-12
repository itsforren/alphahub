# External Integrations

**Analysis Date:** 2026-03-12

## APIs & External Services

### Stripe (Dual-Account)

Alpha Hub operates **two completely separate Stripe accounts** — never mix their keys.

**Management Account** (`STRIPE_MANAGEMENT_SECRET_KEY`):
- Purpose: Monthly management fees ($1,497/mo) and recurring subscription billing
- Webhook secret: `STRIPE_MANAGEMENT_WEBHOOK_SECRET`
- Events handled: `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.upcoming`, `payment_intent.succeeded`
- Edge functions: `stripe-billing-webhook`, `create-stripe-subscription`, `create-stripe-invoice`, `create-setup-intent`, `save-payment-method`, `sync-stripe-charges`, `sync-stripe-cards`, `enforce-management-billing`, `get-stripe-config`
- Frontend: `@stripe/stripe-js` + `@stripe/react-stripe-js` — publishable key fetched at runtime from `get-stripe-config` edge function

**Ad Spend Account** (`STRIPE_AD_SPEND_SECRET_KEY`):
- Purpose: Client ad budget top-ups — when paid, triggers wallet deposit in `client_wallets`
- Webhook secret: `STRIPE_AD_SPEND_WEBHOOK_SECRET`
- Same webhook endpoint (`stripe-billing-webhook`) handles both accounts — verified by signature
- On successful payment: creates `wallet_transactions` deposit record, sets `tracking_start_date`, exits safe mode on campaigns
- Edge functions: `stripe-billing-webhook`, `create-stripe-invoice`, `auto-recharge-run`, `manual-wallet-refill`, `add-wallet-credit`

**Stripe API pattern:** All edge functions use raw `fetch()` to `https://api.stripe.com/v1/...` — no Stripe SDK. Requests are `application/x-www-form-urlencoded` POST or GET. See `supabase/functions/create-stripe-subscription/index.ts` for the canonical pattern.

**Dispute handling:**
- `dispute-webhook` — receives Stripe dispute events
- `generate-dispute-evidence` — uses Claude AI (via `LLM_API_KEY`) to draft dispute responses

---

### GoHighLevel CRM (GHL / LeadConnector)

**Company ID:** `30bFOq4ZtlhKuMOvVPwA` (hardcoded in multiple functions)

**Auth:** OAuth 2.0 agency-level token, stored encrypted (AES-GCM) in `ghl_oauth_tokens` table. Auto-refreshes 5 minutes before expiry. Encryption key: `ENCRYPTION_KEY` secret (falls back to `SUPABASE_SERVICE_ROLE_KEY`).

**API Bases:**
- Primary: `https://services.leadconnectorhq.com` (V2, most functions)
- Legacy: `https://rest.gohighlevel.com/v1` and `/v2`
- Backend: `https://backend.leadconnectorhq.com`
- msgsndr: `https://services.msgsndr.com`
- OAuth: `https://marketplace.leadconnectorhq.com/oauth/chooselocation`

**GHL Edge Functions:**
- `crm-oauth-start` — initiates OAuth flow, builds authorization URL with full scope list
- `crm-oauth-callback` — exchanges auth code for tokens, stores encrypted in `ghl_oauth_tokens`
- `crm-location-token` — gets per-location access token from agency token
- `crm-discovery-calendar` — fetches available calendars for a GHL location
- `crm-snapshot-status` — checks snapshot installation status
- `ghl-create-subaccount` — creates a new GHL location for an agent onboarding; `POST /locations/`, then `PUT /locations/{id}` (firstName/lastName rejected on POST)
- `ghl-create-user` — creates a GHL user within a location
- `ghl-inject-twilio` — two-phase: (1) switch location from LeadConnector to Twilio, (2) inject master Twilio credentials; tries 30+ endpoint variations across all API hosts
- `ghl-provision-phone` — provisions a phone number for a GHL location
- `ghl-assign-user-to-all-calendars` — assigns a user to every calendar in a location
- `ghl-stage-sync` — syncs pipeline stage from GHL to internal database
- `ghl-sync-custom-fields` — syncs custom field values to GHL contact
- `inject-lead-to-ghl` — pushes a new lead into GHL as a contact+opportunity
- `lookup-ghl-contact` — finds a contact by email/phone in GHL
- `sync-disposition-to-ghl` — updates lead disposition in GHL opportunity
- `sync-ghl-appointments` — syncs appointment data from GHL calendar events
- `lead-status-webhook` — incoming webhook from GHL when lead status changes
- `lead-webhook` — incoming webhook for new leads from GHL

**OAuth Scopes** (from `crm-oauth-start`): `locations.*`, `contacts.*`, `calendars.*`, `users.*`, `workflows.readonly`, `opportunities.*`, `conversations.*`, `oauth.*`, `saas/company.*`, `saas/location.*`

---

### Google Ads

**Auth:** OAuth 2.0 via `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`. Token refreshed per-request via `https://oauth2.googleapis.com/token`.

**Additional credentials:** `GOOGLE_ADS_DEVELOPER_TOKEN` (API access), `GOOGLE_ADS_MCC_CUSTOMER_ID` (manager account ID)

**API:** Google Ads API v22 (`https://googleads.googleapis.com/v22/`) — raw fetch, no client library

**Edge Functions:**
- `sync-google-ads` — fetches campaign metrics (cost, impressions, clicks, conversions) for a specific campaign+date range; stores in `ad_spend_daily`
- `sync-all-google-ads` — batch version: syncs all active campaigns for all clients
- `sync-internal-google-ads` — syncs Google Ads data for internal marketing campaigns
- `sync-google-ads-targeting` — syncs geo targeting settings from campaign to DB
- `update-google-ads-budget` — changes daily budget for a campaign via `CampaignBudget.mutate()`
- `update-google-ads-targeting` — updates geo targeting for a campaign
- `update-google-ads-url` — updates final URL for ads
- `create-google-ads-campaign` — creates a new search campaign for a client
- `pause-google-ads-campaign` — pauses a campaign (sets status to PAUSED)
- `verify-google-ads-campaign` — validates campaign exists and retrieves status
- `add-keywords-to-campaign` — adds keywords to an existing campaign
- `morning-review-job` — daily job: reviews campaign pacing, triggers safe mode if wallet balance low, posts alerts to Slack (`SLACK_ADS_MANAGER_WEBHOOK_URL`)
- `check-low-balance` — checks wallet balance, triggers Google Ads safe mode (sets budget to $0.01) if balance below threshold (default $150)
- `google-ads-enhanced-conversion` — sends hashed conversion data (email, phone, name) to Google Ads Enhanced Conversions API

**Scheduled via pg_cron:** Hourly Stripe sync jobs (jobids 17, 18, 19); Google Ads syncs also run on schedule.

---

### Twilio

**Master account** (used for all GHL subaccount injection):
- `MASTER_TWILIO_ACCOUNT_SID`, `MASTER_TWILIO_AUTH_TOKEN`
- Used in `ghl-inject-twilio` to inject shared Twilio credentials into each agent's GHL location

**Notification account** (used for SMS alerts):
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Used in `chat-notification` to send SMS to hardcoded admin numbers on new chat messages

**API:** Direct REST to `https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json`

**Edge Functions using Twilio:**
- `chat-notification` — SMS alerts for new client chat messages
- `ghl-inject-twilio` — injects master Twilio creds into GHL locations
- `ghl-provision-phone` — provisions phone numbers through GHL/Twilio

---

### Anthropic Claude AI

**Auth:** `LLM_API_KEY` (Anthropic API key)
**Model:** `claude-sonnet-4-6`
**API:** `https://api.anthropic.com/v1/messages` with `anthropic-version: 2023-06-01`

**Edge Functions:**
- `generate-agent-bio` — generates 100-word professional bio for insurance agents
- `generate-dispute-evidence` — drafts Stripe dispute response letters with client context
- `analyze-prospect` — analyzes prospect data and call history to provide sales recommendations

---

### Resend (Transactional Email)

**Auth:** `RESEND_API_KEY`
**SDK:** `https://esm.sh/resend@2.0.0` (Deno import)
**From domain:** `@alphaagent.io`

**Edge Functions:**
- `send-auth-email` — login links, invitation emails with branded HTML template
- `send-password-reset` — password reset emails
- `chat-notification` — also sends email to `sierra@alphaagent.io` on new chat messages
- `billing-collections-run` — sends collection notices
- `ticket-notification` — sends ticket-related emails
- `prospect-post-booking` — post-booking confirmation emails

---

### Slack

**Webhook-based (incoming webhooks, no OAuth):**
- `SLACK_ADS_MANAGER_WEBHOOK_URL` — posts to ads manager channel; used by `morning-review-job`, `check-low-balance`, `execute-proposal`, `check-lead-discrepancy`, `hourly-approval-reminder`
- `SLACK_CHAT_WEBHOOK_URL` — posts to internal chat channel; used by `chat-notification`

**Interactive Actions (Slack to server):**
- `slack-ads-actions` — receives button-click payloads from Slack messages (signed with `SLACK_ADS_MANAGER_SIGNING_SECRET`); handles approve/reject/investigate actions on ad proposals
- `ads-manager-slack-test` — test endpoint for Slack integration

---

### Webflow CMS

**Auth:** `WEBFLOW_API_TOKEN` (bearer token)
**Site:** `WEBFLOW_SITE_ID`
**Collection IDs** (Tax Free Wealth Plan site, hardcoded):
- schedulers: `687565796f669f888c649d2c`
- landers: `687574b9d408f8f4b80263aa`
- profiles: `6866a523d492c9734446c4af`
- thankyou: `68dc40c4975ce7211a8534d5`

**Edge Functions:**
- `webflow-cms-create` — creates new CMS items (scheduler page, lander, profile, thank-you pages) for each agent during onboarding
- `webflow-cms-update` — updates existing CMS items

---

### Meta Ads (Facebook)

**Auth:** Per-client `access_token` and `ad_account_id` stored in `internal_marketing_settings` table under `setting_key = 'meta_ads_config'`
**API:** `https://graph.facebook.com/v18.0/{adAccountId}/insights`

**Edge Functions:**
- `sync-meta-ads` — fetches MTD spend/impressions/clicks for internal Meta ad account; stores in `internal_marketing_metrics`

---

### Plaid (Bank Account Linking)

**Auth:** `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` (sandbox/development/production)
**API:** Plaid REST API (no SDK — direct fetch to environment-specific base URL)

**Edge Functions:**
- `plaid-create-link-token` — creates Plaid Link token for bank connection UI (frontend uses `react-plaid-link`)
- `plaid-exchange-token` — exchanges public token for access token after user connects bank
- `plaid-get-balances` — fetches current account balances
- `plaid-sync-transactions` — syncs transaction history
- `plaid-daily-refresh` — scheduled daily refresh of Plaid connection data

**Purpose:** Used for internal financial management / expense tracking, not client-facing billing.

---

### Fathom AI (Call Recording & Transcription)

**Auth:** `FATHOM_API_KEY`
**API:** Fathom REST API

**Edge Functions:**
- `fathom-webhook` — receives post-call webhooks; extracts summary, action items, sentiment, recording URL; stores in `call_logs` table; matches to client by participant email
- `fetch-fathom-calls` — fetches call recordings and transcripts for a client; links to prospects in pipeline

---

### NFIA (National Field Insurance Association)

**API:** `https://www.nationalfia.org/api/create-agent`

**Edge Functions:**
- `nfia-create-agent` — registers new agents on NFIA platform during onboarding; validates US state codes, uploads headshot image

---

## Data Storage

**Primary Database:**
- Supabase PostgreSQL (project `qcunascacayiiuufjtaq`)
- Connection: `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (edge functions)
- Client: `@supabase/supabase-js` v2 (frontend), `createClient` from `esm.sh` (Deno)
- Key tables: `clients`, `billing_records`, `client_wallets`, `wallet_transactions`, `client_stripe_subscriptions`, `campaigns`, `ad_spend_daily`, `ghl_oauth_tokens`, `call_logs`, `internal_marketing_settings`, `system_alerts`, `campaign_audit_log`, `billing_collections`

**File Storage:**
- Supabase Storage (same project)
- Bucket: `media` — agent headshots stored at `media/agent-headshots/{clientId}.{ext}`
- Used by `refresh-stable-headshot` to create stable public URLs for agent photos

**Scheduled Jobs:**
- pg_cron within Supabase PostgreSQL (jobids 17, 18, 19 = hourly Stripe charge syncs)
- No `schedule` config in `supabase/config.toml` — jobs were created directly via SQL

**Caching:**
- No dedicated cache layer (Redis/Memcached absent)
- TanStack React Query handles client-side caching with configurable stale times

---

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (project `qcunascacayiiuufjtaq`)
- Flows: email/password, magic links via Resend
- Session storage: `localStorage` (web), Keychain via `KeychainLocalStorage` (iOS)
- iOS flow type: PKCE

**Frontend client** (`src/integrations/supabase/client.ts`):
- `persistSession: true`, `autoRefreshToken: true`

**Edge Function auth:**
- Most functions have `verify_jwt = false` in `supabase/config.toml` — they authenticate via Supabase service role key or their own custom secret headers
- `mcp-proxy` uses `x-mcp-secret` header checked against `MCP_PROXY_SECRET`
- `slack-ads-actions` verifies Slack request signatures with HMAC-SHA256

**Biometric auth (iOS):**
- `BiometricManager.swift` — locks app on background, requires Face ID/Touch ID to unlock

---

## Monitoring & Observability

**Error Tracking:**
- No Sentry or similar service detected

**Logs:**
- `console.log` / `console.error` in all edge functions — visible in Supabase Edge Function logs
- GHL API calls logged to `ghl_api_logs` table in database (see `ghl-inject-twilio`)
- `system_alerts` table for high-severity events (payment failures trigger inserts)

**Alerting:**
- Slack webhooks for ads management events (budget proposals, low balance, discrepancies)
- SMS via Twilio for new chat messages

---

## CI/CD & Deployment

**Frontend Hosting:**
- Vercel (project `prj_qjsttH6tKyeHt4uJSflL23CmBNF0`, org `JueM8hzm6WQGIjlRnFF9la1R`)
- Deploy trigger: GitHub webhook is broken — must trigger manually via Vercel API
- SPA routing: all paths rewrite to `/index.html` via `vercel.json`

**Edge Functions:**
- Deploy command: `supabase functions deploy <name> --project-ref qcunascacayiiuufjtaq`
- CRITICAL: `sync-stripe-charges` resets `verify_jwt` to `true` on every deploy — must PATCH to `false` after each deploy
- No CI pipeline for automatic edge function deployment

**CI Pipeline:**
- None detected

---

## Webhooks & Callbacks

**Incoming (public, `verify_jwt = false`):**
- `stripe-billing-webhook` — Stripe events from both management and ad_spend accounts; verified by HMAC signature
- `stripe-webhook` — additional Stripe events (legacy/fallback)
- `stripe-billing-webhook/dispute-webhook` — Stripe dispute events
- `lead-webhook` — GHL lead creation events
- `lead-status-webhook` — GHL lead status change events
- `agent-onboarding-webhook` — triggered when agent onboarding completes in GHL
- `agent-update-webhook` — triggered on agent profile updates in GHL
- `submit-webhook` — external form submission entry point
- `fathom-webhook` — Fathom call completion events
- `prospect-booking-webhook` — booking confirmation from prospect funnel
- `prospect-abandoned-webhook` — abandoned funnel events
- `slack-ads-actions` — Slack interactive component payloads

**Outgoing:**
- Stripe: payment creation, invoice management, subscription management (management + ad_spend accounts)
- GHL: location CRUD, contact/opportunity sync, calendar management
- Google Ads: campaign management, budget updates, targeting updates
- Resend: transactional emails
- Slack: ads manager alerts and chat notifications
- Webflow: CMS item creation/updates
- Twilio: SMS notifications, GHL credential injection
- NFIA: agent registration
- Anthropic: bio generation, dispute evidence, prospect analysis
- Google OAuth: token refresh for Google Ads

---

## MCP Proxy

**Purpose:** Exposes internal Alpha Hub data to Claude AI tools (MCP - Model Context Protocol)
**Auth:** `x-mcp-secret` header checked against `MCP_PROXY_SECRET`
**Endpoint:** `supabase/functions/mcp-proxy/index.ts`
**Available tools:** `list_clients`, `get_client_detail`, `search_clients`, `get_billing_summary`, `get_ad_spend_overview`, `get_campaign_health`, `get_lead_pipeline`, `get_communications`, `get_financial_projections`, `get_alerts`, `get_response_times`, `get_unread_overview`, `get_ticket_workload`, and more

---

## Environment Configuration

**Required frontend env vars (`.env`):**
```
VITE_SUPABASE_URL
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_PUBLISHABLE_KEY
```

**Required edge function secrets (set via `supabase secrets set`):**
```
STRIPE_MANAGEMENT_SECRET_KEY
STRIPE_MANAGEMENT_WEBHOOK_SECRET
STRIPE_AD_SPEND_SECRET_KEY
STRIPE_AD_SPEND_WEBHOOK_SECRET
GHL_CLIENT_ID
GHL_CLIENT_SECRET
GHL_REDIRECT_URI
GHL_COMPANY_ID
ENCRYPTION_KEY
GOOGLE_ADS_CLIENT_ID
GOOGLE_ADS_CLIENT_SECRET
GOOGLE_ADS_REFRESH_TOKEN
GOOGLE_ADS_DEVELOPER_TOKEN
GOOGLE_ADS_MCC_CUSTOMER_ID
MASTER_TWILIO_ACCOUNT_SID
MASTER_TWILIO_AUTH_TOKEN
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
RESEND_API_KEY
LLM_API_KEY
SLACK_ADS_MANAGER_WEBHOOK_URL
SLACK_ADS_MANAGER_SIGNING_SECRET
SLACK_CHAT_WEBHOOK_URL
MCP_PROXY_SECRET
WEBFLOW_API_TOKEN
WEBFLOW_SITE_ID
PLAID_CLIENT_ID
PLAID_SECRET
PLAID_ENV
FATHOM_API_KEY
```

**Secrets location:** `~/.zprofile` on developer machine for local use; Supabase secrets manager for production edge functions

---

*Integration audit: 2026-03-12*
