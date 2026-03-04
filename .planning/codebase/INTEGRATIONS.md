# External Integrations

**Analysis Date:** 2025-03-04

## APIs & External Services

**Payment Processing:**
- Stripe - Primary payment processing and billing
  - SDK: `@stripe/stripe-js` (8.7.0), `@stripe/react-stripe-js` (5.6.0)
  - Auth: Dual publishable keys (management + ad_spend) fetched via `get-stripe-config` edge function
  - Frontend: `src/config/stripe.ts` manages key loading
  - Edge functions: `create-stripe-invoice`, `stripe-webhook`, `stripe-billing-webhook`, `create-setup-intent`, `save-payment-method`, `create-stripe-subscription`, `sync-stripe-cards`

**Banking & Transactions:**
- Plaid - Bank account linking and transaction sync
  - SDK: `react-plaid-link` (4.1.1)
  - Auth: Via `PLAID_CLIENT_ID`, `PLAID_SECRET` edge function secrets
  - Edge functions: `plaid-create-link-token`, `plaid-exchange-token`, `plaid-sync-transactions`, `plaid-get-balances`, `plaid-daily-refresh`
  - Environment: Supports sandbox and production via `PLAID_ENV`

**Marketing Platform:**
- Google Ads - Campaign and ad spend management
  - Auth: OAuth credentials stored in database
  - Edge functions: `sync-google-ads`, `create-google-ads-campaign`, `update-google-ads-budget`, `update-google-ads-targeting`, `sync-google-ads-targeting`, `verify-google-ads-campaign`, `pause-google-ads-campaign`, `add-keywords-to-campaign`, `update-google-ads-url`, `sync-a2p-status`, `sync-internal-google-ads`, `google-ads-enhanced-conversion`
  - Geo-targeting: State abbreviations mapped to Google Ads geo constant IDs

**CRM & Lead Management:**
- GoHighLevel (GHL) - CRM, contacts, calendars, workflows, messaging
  - Auth: OAuth 2.0 via `GHL_CLIENT_ID`, `GHL_REDIRECT_URI`, `GHL_INSTALL_URL` env variables
  - Scope requirements: locations, contacts, calendars, users, opportunities, conversations, workflows, SMS, phone
  - Edge functions: `crm-oauth-start`, `crm-oauth-callback`, `crm-location-token`, `ghl-assign-user-to-all-calendars`, `inject-lead-to-ghl`, `ghl-sync-custom-fields`, `ghl-stage-sync`, `lookup-ghl-contact`, `sync-ghl-appointments`, `sync-disposition-to-ghl`, `ghl-inject-twilio`, `ghl-provision-phone`, `ghl-create-subaccount`, `ghl-create-user`
  - API base: `https://services.leadconnectorhq.com`

**Webhooks & Lead Routing:**
- GoHighLevel Webhook - Receives inbound leads
  - URL: `https://services.leadconnectorhq.com/hooks/wDoj91sbkfxZnMbow2G5/webhook-trigger/12365034-57b1-4525-8db5-be30cfbd588f` (configured in `src/config/webhook.ts`)
  - Edge functions: `lead-webhook`, `lead-status-webhook`, `verify-lead-delivery`, `check-lead-discrepancy`, `check-lead-router-health`, `retry-failed-lead-delivery`

**SMS & Voice:**
- Twilio - Phone provisioning
  - Edge functions: `ghl-inject-twilio`, `ghl-provision-phone`
  - Integration: Via GHL subaccount provisioning

**Meta Platform:**
- Meta Ads - Ad campaign synchronization
  - Edge functions: `sync-meta-ads`

**Call Tracking & Analytics:**
- Fathom Analytics - Call tracking and analytics
  - Edge functions: `fetch-fathom-calls`, `fathom-webhook`

**Website Builders:**
- Webflow CMS - Content management
  - Edge functions: `webflow-cms-create`, `webflow-cms-update`

**Professional Networks:**
- National Foundation of Independent Insurance Agents (NFIA) - Agent profile management
  - Edge functions: `nfia-create-agent`

**Sales/Marketplace:**
- Automated agent onboarding and proposal execution
  - Edge functions: `run-full-onboarding`, `verify-onboarding`, `verify-onboarding-live`, `execute-proposal`

**Data & Monitoring:**
- Supabase (primary database) - See "Data Storage" below
- Google Analytics - Event tracking
  - Edge functions: `track-event`, `tracking-script`

**Communication:**
- Slack - Notifications and alerts
  - Edge functions: `slack-ads-actions`, `ads-manager-slack-test`

## Data Storage

**Primary Database:**
- Supabase PostgreSQL
  - Project ID: `qydkrpirrfelgtcqasdx`
  - URL: `https://qydkrpirrfelgtcqasdx.supabase.co`
  - Client: `@supabase/supabase-js` (2.87.1)
  - Connection: Via `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
  - Auto-generated types: `src/integrations/supabase/types.ts` (regenerated via `supabase gen types`)
  - Schema: Managed via migrations in `supabase/migrations/`

**File Storage:**
- Supabase Storage (cloud file bucket)
  - Used for: Profile photos, documents, attachments
  - Access: Via Supabase client authenticated requests

**Caching:**
- React Query client-side cache (TanStack React Query)
- No dedicated server cache layer

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (JWT-based)
  - Built-in with Supabase PostgreSQL
  - Session persistence: localStorage via Supabase client config
  - Auto token refresh enabled
  - MFA support: `AuthContext.tsx` handles `AuthMFAEnrollResponse`, `AuthMFAVerifyResponse`

**Implementation:**
- Custom `AuthContext.tsx` wraps Supabase auth
- User session managed in React Context
- OTP support for agreements: `send-agreement-otp`, `verify-agreement-otp` edge functions

**Integration Flows:**
- OAuth for Google Ads and GoHighLevel
- Direct auth for user login/registration

## Monitoring & Observability

**Error Tracking:**
- Not detected - Errors logged to browser console and Supabase function logs

**Logs:**
- Supabase Edge Function logs (viewable in dashboard)
- Browser console logs via `console.log()`, `console.error()`
- Function execution details captured in Supabase

**Performance:**
- Vite dev server with fast refresh
- React Query request caching and deduplication

## CI/CD & Deployment

**Hosting:**
- Frontend: Vercel (SPA deployment)
  - Deployment config: `vercel.json`
  - Rewrites: All routes to `/index.html` (SPA behavior)
- Backend: Supabase Edge Functions (Deno)
  - Deployed via `supabase functions deploy <function-name>`
  - Config: `supabase/config.toml`

**Build Pipeline:**
- Local: `npm run build` (Vite production build)
- Deployment: Vercel handles Git integration

**Function Management:**
- 100+ Edge Functions defined in `supabase/config.toml`
- All functions have `verify_jwt = false` (webhook-friendly)
- Manual deployment required after code changes

## Environment Configuration

**Required Frontend Env Vars:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Anonymous key for client auth
- `VITE_SUPABASE_ANON_KEY` - Same as above (redundant)
- `VITE_SUPABASE_PROJECT_ID` - Project reference (qydkrpirrfelgtcqasdx)

**Required Edge Function Secrets:**
- `SUPABASE_URL` - Injected automatically
- `SUPABASE_SERVICE_ROLE_KEY` - Injected automatically
- `GHL_CLIENT_ID` - GoHighLevel OAuth client ID
- `GHL_REDIRECT_URI` - OAuth callback URL
- `GHL_INSTALL_URL` - Static OAuth URL (deprecated in favor of dynamic)
- `PLAID_CLIENT_ID` - Plaid API client ID
- `PLAID_SECRET` - Plaid API secret
- `PLAID_ENV` - Plaid environment (sandbox/production)
- Stripe API secrets (managed separately, not in env)

**Secrets Location:**
- Frontend: `.env` file (gitignored, not committed)
- Backend: Set via `supabase secrets set KEY="value"`
- No secrets should be committed to repository

**Template:**
- `.env.example` provides documented template with placeholders

## Webhooks & Callbacks

**Incoming Webhooks:**
- `stripe-webhook` - Stripe payment events (checkout.session.completed, payment_intent.succeeded)
  - Events trigger wallet deposits and billing updates
- `stripe-billing-webhook` - Stripe billing-specific events
- `lead-webhook` - GoHighLevel incoming leads
- `lead-status-webhook` - Lead status changes
- `agent-onboarding-webhook` - Agent onboarding events
- `agent-update-webhook` - Agent updates
- `prospect-booking-webhook` - Booking confirmations
- `prospect-abandoned-webhook` - Abandoned bookings
- `fathom-webhook` - Call tracking data
- `dispute-webhook` - Payment disputes
- `submit-webhook` - Form submissions (gated by GoHighLevel)

**Webhook Processing:**
- All edge functions have `verify_jwt = false` to allow webhook delivery
- POST request handling with CORS support
- Payload validation and error handling

**Outgoing Webhooks:**
- Prospect qualification form → GoHighLevel webhook URL
  - Submits contact updates, custom fields, tags
- Lead delivery → GHL contact creation
- Appointment sync → GHL appointments endpoint
- Calendar events → GHL workflows

## Integration Patterns

**OAuth 2.0 Flow:**
- `crm-oauth-start` - Initiates redirect to OAuth provider
- `crm-oauth-callback` - Handles callback, exchanges code for tokens
- Tokens stored in database for later API calls

**Webhook Verification:**
- Stripe: Signature verification expected (not implemented in current function)
- GHL: No signature verification (open webhook)

**Error Recovery:**
- `retry-failed-lead-delivery` - Retry mechanism for failed lead sends
- `check-lead-discrepancy` - Validation after delivery

---

*Integration audit: 2025-03-04*
