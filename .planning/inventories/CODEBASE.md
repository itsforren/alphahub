# Codebase Structure Audit

**Source:** `alphahub-v2/` (cloned from `github.com/itsforren/alpha-agent-flow`)
**Latest commit:** `8e95b42` -- "Fix auto-recharge run FK gap"
**Total files:** 679
**Audited:** 2026-02-26

---

## 1. Repository Overview

### Top-Level Structure

| Directory/File | Purpose |
|----------------|---------|
| `src/` | React frontend (Vite + React 18 + TypeScript + Tailwind + shadcn/ui) |
| `supabase/functions/` | 106 Deno edge functions |
| `supabase/migrations/` | 144 SQL migration files |
| `supabase/config.toml` | Edge function registration, JWT settings, cron schedules |
| `.env` | Frontend environment variables (VITE_SUPABASE_* only) |
| `public/` | Static assets (favicon, images, sitemap, robots.txt) |
| `.lovable/` | Lovable platform config |
| `CLAUDE.md` | Claude Code instructions for the repo |
| `package.json` | Frontend dependencies |
| `tailwind.config.ts` | Tailwind CSS configuration |
| `vite.config.ts` | Vite build configuration |
| `tmp/` | Temporary files |

### Key Numbers

| Metric | Count |
|--------|-------|
| Edge functions | 106 |
| Migration files | 144 |
| Database tables | 93 |
| Database functions | 28 |
| Database triggers | 52 |
| Storage buckets | 3 (media, chat-attachments, agreements) |
| Unique Deno secrets | 44 (41 non-Supabase) |
| Cron-scheduled functions | 2 |
| Frontend pages | 67 |
| Frontend hooks | 40+ |

---

## 2. Edge Functions Inventory (106 functions)

All functions have `verify_jwt = false` in `config.toml` except those not listed (which default to `verify_jwt = true`).

### Billing & Stripe (14 functions)

| Function | Purpose | Key Dependencies |
|----------|---------|-----------------|
| `auto-recharge-run` | Cron (daily 6AM): auto-charge wallets with low balance | SUPABASE, Stripe via create-stripe-invoice |
| `billing-collections-run` | Send collection emails for overdue invoices | RESEND_API_KEY, SUPABASE |
| `create-setup-intent` | Create Stripe SetupIntent for card onboarding | STRIPE_MANAGEMENT_SECRET_KEY, STRIPE_AD_SPEND_SECRET_KEY |
| `create-stripe-invoice` | Create and pay Stripe invoice for wallet charges | STRIPE_*_SECRET_KEY, calls update-google-ads-budget |
| `create-stripe-subscription` | Create recurring Stripe subscription | STRIPE_*_SECRET_KEY |
| `dispute-webhook` | Handle Stripe charge.dispute.* events | SUPABASE only (no signature verification) |
| `generate-dispute-evidence` | AI-generated dispute response text | LOVABLE_API_KEY |
| `get-stripe-config` | Return Stripe publishable keys to frontend | VITE_STRIPE_*_PUBLISHABLE_KEY |
| `manual-wallet-refill` | Trigger manual wallet charge via Stripe | Calls create-stripe-invoice internally |
| `migrate-to-auto-billing` | Migrate client from invoice to auto-billing | STRIPE_*_SECRET_KEY |
| `process-referral-commission` | Calculate and record referral commissions | SUPABASE only |
| `save-payment-method` | Attach payment method to Stripe customer | STRIPE_*_SECRET_KEY |
| `stripe-billing-webhook` | Handle invoice.paid, subscription.* events (WITH signature verification) | STRIPE_*_WEBHOOK_SECRET |
| `stripe-webhook` | Handle checkout.session.completed, payment_intent.succeeded (NO signature verification) | SUPABASE only |
| `sync-stripe-cards` | Sync payment methods from Stripe to DB | STRIPE_*_SECRET_KEY |

### CRM / GoHighLevel (15 functions)

| Function | Purpose | Key Dependencies |
|----------|---------|-----------------|
| `crm-discovery-calendar` | Discover calendars in GHL subaccount | Calls crm-location-token |
| `crm-location-token` | Exchange company token for location access token | GHL_CLIENT_ID, GHL_CLIENT_SECRET, ENCRYPTION_KEY |
| `crm-oauth-callback` | Handle GHL OAuth callback, store encrypted tokens | GHL_CLIENT_ID, GHL_CLIENT_SECRET, ENCRYPTION_KEY |
| `crm-oauth-start` | Initiate GHL OAuth flow | GHL_CLIENT_ID, GHL_REDIRECT_URI, GHL_INSTALL_URL |
| `crm-snapshot-status` | Check GHL snapshot installation status | SUPABASE |
| `ghl-assign-user-to-all-calendars` | Assign GHL user to all location calendars | Calls crm-location-token |
| `ghl-create-subaccount` | Create GHL subaccount (location) | GHL_AGENCY_API_KEY, GHL_COMPANY_ID |
| `ghl-create-user` | Create GHL user in subaccount, activate SaaS | GHL_CLIENT_ID, GHL_CLIENT_SECRET, ENCRYPTION_KEY |
| `ghl-inject-twilio` | Configure Twilio telephony in GHL subaccount | GHL_AGENCY_API_KEY, MASTER_TWILIO_ACCOUNT_SID, MASTER_TWILIO_AUTH_TOKEN |
| `ghl-provision-phone` | Search and purchase Twilio phone number via GHL | GHL_AGENCY_API_KEY |
| `ghl-stage-sync` | Sync prospect pipeline stage changes to GHL | GHL_STAGE_WEBHOOK_URL |
| `ghl-sync-custom-fields` | Map and sync custom fields between AlphaHub and GHL | Calls crm-location-token |
| `inject-lead-to-ghl` | Push lead data into GHL contact | Calls crm-location-token |
| `lookup-ghl-contact` | Look up GHL contact by email | SUPABASE |
| `sync-a2p-status` | Sync A2P (Application-to-Person) messaging compliance status | GHL_COMPANY_ID |
| `sync-disposition-to-ghl` | Sync lead disposition status to GHL | GHL_CLIENT_ID, GHL_CLIENT_SECRET |

### Google Ads (13 functions)

| Function | Purpose | Key Dependencies |
|----------|---------|-----------------|
| `add-keywords-to-campaign` | Add keywords to Google Ads campaign | GOOGLE_ADS_* (5 secrets) |
| `create-google-ads-campaign` | Create new Google Ads campaign with geo targeting | GOOGLE_ADS_* |
| `execute-proposal` | Execute ads manager proposal (budget/targeting changes) | GOOGLE_ADS_*, SLACK_ADS_MANAGER_WEBHOOK_URL |
| `google-ads-enhanced-conversion` | Send enhanced conversions to Google Ads | GOOGLE_ADS_*, CONVERSION_API_KEY |
| `pause-google-ads-campaign` | Pause/enable a Google Ads campaign | GOOGLE_ADS_* |
| `sync-all-google-ads` | Sync all active clients' Google Ads data | SUPABASE, calls sync-google-ads |
| `sync-google-ads` | Sync single client's Google Ads metrics | GOOGLE_ADS_* |
| `sync-google-ads-targeting` | Sync targeting settings from Google Ads | GOOGLE_ADS_* |
| `sync-internal-google-ads` | Sync AlphaAgent's own internal Google Ads | GOOGLE_ADS_* |
| `sync-meta-ads` | Sync Meta/Facebook ads data (placeholder/minimal) | SUPABASE |
| `update-google-ads-budget` | Update daily budget for a campaign | GOOGLE_ADS_* |
| `update-google-ads-targeting` | Update geo/demographic targeting | GOOGLE_ADS_* |
| `update-google-ads-url` | Update final URLs on ads | GOOGLE_ADS_* |
| `verify-google-ads-campaign` | Verify campaign was created correctly | GOOGLE_ADS_* |

### Lead Management (10 functions)

| Function | Purpose | Key Dependencies |
|----------|---------|-----------------|
| `check-lead-discrepancy` | Detect Google Ads vs DB lead count mismatches | SLACK_ADS_MANAGER_WEBHOOK_URL |
| `check-lead-router-health` | Health check for lead routing system | SUPABASE |
| `lead-status-webhook` | Receive lead status updates from GHL | SUPABASE |
| `lead-webhook` | Receive new leads from external sources | SUPABASE (validates x-api-key header) |
| `retry-failed-lead-delivery` | Retry leads that failed GHL delivery | Calls inject-lead-to-ghl |
| `send-test-lead` | Send a test lead to verify routing | SUPABASE |
| `submit-webhook` | Receive form submissions | SUPABASE |
| `track-event` | Track frontend events | SUPABASE |
| `tracking-script` | Serve tracking JavaScript | SUPABASE |
| `verify-lead-delivery` | Verify a lead was delivered to GHL | SUPABASE |

### Prospect/Sales Pipeline (9 functions)

| Function | Purpose | Key Dependencies |
|----------|---------|-----------------|
| `analyze-prospect` | AI analysis of prospect readiness | LOVABLE_API_KEY |
| `prospect-abandoned-webhook` | Track abandoned prospect interactions | SUPABASE |
| `prospect-booking-webhook` | Handle prospect booking confirmations | SUPABASE |
| `prospect-contact-capture` | Capture prospect contact info, sync to GHL | GHL API (hardcoded location ID) |
| `prospect-inactivity-check` | Cron (every minute): check for inactive prospects | GHL API |
| `prospect-post-booking` | Handle post-booking form submissions | GHL_PROSPECT_WEBHOOK_URL |
| `prospect-qualification-submit` | Handle prospect qualification form | GHL API |
| `prospect-sync-custom-fields` | Sync prospect fields to GHL | Calls crm-location-token |
| `sync-ghl-appointments` | Sync appointments from GHL | Calls crm-location-token |

### Communications (6 functions)

| Function | Purpose | Key Dependencies |
|----------|---------|-----------------|
| `chat-notification` | Send notifications (email, SMS, Slack) for chat messages | RESEND_API_KEY, TWILIO_*, SLACK_CHAT_WEBHOOK_URL |
| `send-agreement-otp` | Send OTP via SMS for agreement signing | TWILIO_* |
| `send-auth-email` | Send custom auth emails | RESEND_API_KEY |
| `send-password-reset` | Send password reset emails | RESEND_API_KEY |
| `ticket-notification` | Send support ticket notifications | RESEND_API_KEY |
| `verify-agreement-otp` | Verify OTP code for agreement signing | SUPABASE |

### Onboarding Automation (8 functions)

| Function | Purpose | Key Dependencies |
|----------|---------|-----------------|
| `agent-onboarding-webhook` | Receive onboarding events from external AI agent | CONVERSION_API_KEY, SLACK_CHAT_WEBHOOK_URL |
| `agent-update-webhook` | Receive agent profile updates | SUPABASE (validates x-api-key) |
| `check-automation-timeout` | Check for stale onboarding automations | RESEND_API_KEY |
| `onboarding-bridge` | Proxy edge function calls for 18-step onboarding | ONBOARDING_BRIDGE_KEY |
| `run-full-onboarding` | Execute full 18-step automated onboarding | GHL_*, GOOGLE_ADS_*, LOVABLE_API_KEY, ENCRYPTION_KEY |
| `verify-onboarding` | Verify onboarding steps completed | LOVABLE_API_KEY |
| `verify-onboarding-live` | Live verification of onboarding | LOVABLE_API_KEY |
| `nfia-create-agent` | Create agent profile on NFIA website | External API (nationalfia.org) |

### Auth / User Management (6 functions)

| Function | Purpose | Key Dependencies |
|----------|---------|-----------------|
| `admin-delete-user` | Delete auth user (admin only) | SUPABASE (service role) |
| `admin-reset-user` | Reset user email/password (admin only) | SUPABASE (service role) |
| `admin-set-password` | Set user password (hardcoded admin secret) | SUPABASE (service role) |
| `check-client-email` | Check if email exists in auth system | SUPABASE (service role) |
| `create-user-account` | Create new auth user + profile | SUPABASE (service role) |
| `reset-user-password` | Reset password for existing user | SUPABASE (service + anon) |
| `set-client-password` | Set password during onboarding | SUPABASE (service role) |

### Analytics / Monitoring (8 functions)

| Function | Purpose | Key Dependencies |
|----------|---------|-----------------|
| `aggregate-client-kpis` | Calculate 7-day rolling KPI aggregates | SUPABASE |
| `check-low-balance` | Check for low wallet balances, trigger safe mode | SLACK_ADS_MANAGER_WEBHOOK_URL, GOOGLE_ADS_* |
| `fathom-webhook` | Receive Fathom AI call webhooks | SUPABASE |
| `fetch-fathom-calls` | Fetch call recordings from Fathom API | FATHOM_API_KEY |
| `hourly-approval-reminder` | Send Slack reminders for pending approvals | SUPABASE |
| `morning-review-job` | Daily morning review Slack digest | SLACK_ADS_MANAGER_WEBHOOK_URL, PUBLIC_APP_URL |
| `outcome-tracker-job` | Track campaign optimization outcomes | SUPABASE |
| `live-stats` | (not a function dir, but referenced) | N/A |

### Banking / Plaid (5 functions)

| Function | Purpose | Key Dependencies |
|----------|---------|-----------------|
| `plaid-create-link-token` | Create Plaid Link token for bank connection | PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV |
| `plaid-daily-refresh` | Daily refresh of bank account data | PLAID_*, ENCRYPTION_KEY |
| `plaid-exchange-token` | Exchange Plaid public token for access token | PLAID_*, ENCRYPTION_KEY |
| `plaid-get-balances` | Get current bank account balances | PLAID_*, ENCRYPTION_KEY |
| `plaid-sync-transactions` | Sync bank transactions | PLAID_*, ENCRYPTION_KEY |

### Webflow CMS (2 functions)

| Function | Purpose | Key Dependencies |
|----------|---------|-----------------|
| `webflow-cms-create` | Create agent profile in Webflow CMS | WEBFLOW_API_TOKEN, WEBFLOW_SITE_ID |
| `webflow-cms-update` | Update agent profile in Webflow CMS | WEBFLOW_API_TOKEN |

### Slack Integration (2 functions)

| Function | Purpose | Key Dependencies |
|----------|---------|-----------------|
| `ads-manager-slack-test` | Test Slack webhook for ads manager | SLACK_ADS_MANAGER_WEBHOOK_URL |
| `slack-ads-actions` | Handle Slack interactive actions (button clicks) | SLACK_ADS_MANAGER_SIGNING_SECRET |

### MCP / API Proxy (1 function)

| Function | Purpose | Key Dependencies |
|----------|---------|-----------------|
| `mcp-proxy` | Model Context Protocol proxy -- exposes database queries and operations as MCP tools | MCP_PROXY_SECRET, GOOGLE_ADS_*, STRIPE_*, SLACK_* |

Note: `mcp-proxy` is the largest function (~2400+ lines) and includes a local module `computed-wallet.ts`.

### Utilities (3 functions)

| Function | Purpose | Key Dependencies |
|----------|---------|-----------------|
| `cleanup-archived-clients` | Delete clients archived for 5+ days | SUPABASE |
| `fetch-link-preview` | Fetch OpenGraph metadata for URLs | SUPABASE |
| `refresh-stable-headshot` | Download and re-upload agent headshot to stable URL | SUPABASE storage (media bucket) |

### Cron-Scheduled Functions (2)

| Function | Schedule | Purpose |
|----------|----------|---------|
| `prospect-inactivity-check` | `*/1 * * * *` (every minute) | Check for inactive prospects, sync to GHL |
| `auto-recharge-run` | `0 6 * * *` (daily at 6 AM UTC) | Auto-charge wallets with low balance |

---

## 3. Database Tables Inventory (93 tables)

All tables have RLS enabled unless noted otherwise.

### Core Client/Agent (5 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `clients` | Client/agent profiles (name, email, status, budget, CRM links) | FK to auth.users, referenced by most tables |
| `profiles` | Auth user profiles (name, email, role) | FK to auth.users |
| `user_roles` | Role assignments (admin, client) | FK to auth.users |
| `client_self_onboarding` | Client self-service onboarding state | FK to clients |
| `partners` | Partner organizations for referrals | Standalone |

### Billing & Payments (10 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `billing_records` | Invoice/payment records | FK to clients |
| `billing_collections` | Collection status tracking | FK to clients |
| `billing_collection_events` | Collection event history | FK to billing_collections |
| `client_wallets` | Ad spend wallet balance and settings | FK to clients |
| `wallet_transactions` | Wallet charge/credit history | FK to client_wallets |
| `client_payment_methods` | Stored payment method metadata | FK to clients |
| `client_stripe_customers` | Stripe customer ID mappings (mgmt + ad_spend) | FK to clients |
| `client_stripe_subscriptions` | Active Stripe subscriptions | FK to clients |
| `client_credits` | Credit balances | FK to clients |
| `disputes` | Stripe dispute tracking | FK to clients |

### Lead Management (6 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `leads` | Lead records with delivery status | FK to clients (via agent_id) |
| `lead_attribution` | UTM and source attribution | FK to leads |
| `lead_delivery_logs` | GHL delivery attempt logs | FK to leads |
| `lead_pipeline_metrics` | Aggregated pipeline metrics | FK to clients |
| `lead_status_history` | Lead status change audit trail | FK to leads |
| `webhook_api_keys` | API keys for lead webhook auth | FK to clients |

### Campaigns & Ads (6 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `campaigns` | Google Ads campaign config and state | FK to clients |
| `campaign_settings` | Global campaign settings (quiet hours, thresholds) | Standalone |
| `campaign_audit_log` | Campaign change history | FK to campaigns |
| `ad_spend_daily` | Daily ad spend records | FK to clients |
| `proposals` | Ads manager optimization proposals | FK to campaigns |
| `decision_events` | AI decision audit trail | FK to campaigns |

### Prospect/Sales Pipeline (8 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `prospects` | Sales prospect records | Standalone (has partner_id) |
| `prospect_activities` | Prospect interaction history | FK to prospects |
| `prospect_attribution` | Prospect source tracking | FK to prospects |
| `prospect_available_fields` | Available GHL fields for prospect mapping | Standalone |
| `prospect_field_mappings` | Field mapping config for GHL sync | Standalone |
| `sales_pipeline_stages` | Pipeline stage definitions | Standalone |
| `sales_team_members` | Sales team member config | Standalone |
| `conversions` | Conversion tracking records | FK to clients |

### Referrals (5 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `referrals` | Referral relationships | FK to clients |
| `referral_codes` | Unique referral codes | FK to clients |
| `referral_commission_config` | Commission rate settings | Standalone |
| `referral_partners` | External referral partners | Standalone |
| `referral_rewards` | Reward tracking | FK to referrals |

### Communications (8 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `chat_conversations` | Chat thread metadata | FK to clients |
| `chat_messages` | Chat messages | FK to chat_conversations |
| `chat_settings` | Chat configuration | Standalone |
| `admin_channels` | Admin team channels | Standalone |
| `admin_channel_messages` | Admin channel messages | FK to admin_channels |
| `admin_channel_members` | Admin channel membership | FK to admin_channels |
| `admin_dm_conversations` | Admin direct messages | Standalone |
| `admin_dm_messages` | Admin DM messages | FK to admin_dm_conversations |

### Support (4 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `support_tickets` | Support ticket records | FK to clients |
| `ticket_replies` | Ticket reply messages | FK to support_tickets |
| `support_agents` | Support agent config | FK to auth.users |
| `sla_settings` | SLA deadline configuration | Standalone |

### Onboarding (4 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `onboarding_checklist` | Client onboarding task checklist | FK to clients |
| `onboarding_tasks` | Task definitions for onboarding | Standalone |
| `onboarding_settings` | Onboarding configuration | Standalone |
| `onboarding_automation_runs` | Automation execution history | FK to clients |

### CRM/GHL Integration (4 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `ghl_oauth_tokens` | Encrypted GHL OAuth tokens | FK to clients |
| `ghl_custom_field_mappings` | GHL field mapping config | FK to clients |
| `ghl_available_fields` | Available GHL custom fields | Standalone |
| `ghl_api_logs` | GHL API call audit log | Standalone |

### Banking / Expenses (5 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `bank_accounts` | Plaid-linked bank accounts | FK to clients |
| `expenses` | Expense records from bank transactions | FK to clients |
| `expense_categories` | Expense categorization | Standalone |
| `categorization_rules` | Auto-categorization rules | FK to expense_categories |
| `business_screenshots` | Bank statement screenshots | FK to clients |

### Courses / Community (7 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `courses` | Course definitions | Standalone |
| `modules` | Course modules | FK to courses |
| `lessons` | Individual lessons | FK to modules |
| `enrollments` | User enrollment records | FK to courses, auth.users |
| `course_user_progress` | Lesson completion tracking | FK to courses, auth.users |
| `lesson_progress` | Detailed lesson progress | FK to lessons |
| `lesson_ratings` | Lesson ratings/feedback | FK to lessons |
| `community_posts` | Community feed posts | FK to auth.users |
| `community_comments` | Post comments | FK to community_posts |

### Analytics & Metrics (6 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `client_kpi_daily` | Daily KPI snapshots | FK to clients |
| `client_kpi_rolling` | Rolling 7-day KPI aggregates | FK to clients |
| `performance_snapshots` | Monthly performance snapshots | FK to clients |
| `rolling_snapshots` | Rolling performance data | FK to clients |
| `live_stats` | Real-time stat counters | Standalone |
| `enhanced_conversion_logs` | Google Ads enhanced conversion audit | FK to leads |

### Visitor Tracking (2 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `visitor_sessions` | Website visitor sessions | Standalone |
| `visitor_events` | Visitor event tracking | FK to visitor_sessions |

### Agreements (3 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `agreements` | Signed agreement records | FK to clients |
| `agreement_templates` | Agreement template definitions | Standalone |
| `agreement_otps` | OTP codes for agreement signing | Standalone |

### Notifications & Other (5 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `notification_preferences` | User notification settings | FK to auth.users |
| `nps_responses` | Net Promoter Score responses | FK to clients |
| `system_alerts` | System alert records | Standalone |
| `email_tracking_links` | Email click tracking | FK to clients |
| `testimonials` | Client testimonials | Standalone |

### Other (3 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `call_logs` | Fathom call log records | FK to prospects |
| `sheet_config` | Spreadsheet export configuration | Standalone |
| `internal_marketing_settings` | Internal marketing configuration | Standalone (no `public.` prefix in migration) |
| `mcp_audit_log` | MCP proxy operation audit trail | Standalone |

### Storage Buckets (3)

| Bucket | Public | Purpose |
|--------|--------|---------|
| `media` | Yes | Profile photos, agent headshots |
| `chat-attachments` | Yes | Chat message attachments |
| `agreements` | No | Signed agreement PDFs |

---

## 4. Frontend Structure

### Stack
- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives)
- **Data:** TanStack React Query
- **Routing:** React Router v6
- **State:** React Context (Auth, Calculator, Notifications, ClientPreview)
- **Icons:** Lucide React
- **Toasts:** Sonner

### Key Directories

| Path | Purpose |
|------|---------|
| `src/pages/` | Route page components (67 files) |
| `src/components/portal/` | Client portal UI components (55 files) |
| `src/components/hub/` | Agent hub layout and components |
| `src/components/admin/` | Admin-specific components |
| `src/components/ui/` | shadcn/ui primitives |
| `src/hooks/` | React Query hooks (40+ hooks) |
| `src/contexts/` | React context providers |
| `src/config/` | App configuration (stripe.ts, etc.) |
| `src/integrations/supabase/` | Supabase client + auto-generated types |
| `src/lib/` | Utility functions |

### Route Groups

| Route Prefix | Purpose | Auth |
|-------------|---------|------|
| `/` | Public marketing pages (Index, Pricing, About, Blog) | No |
| `/auth/*` | Login, Signup, ForgotPassword, ResetPassword | No |
| `/app/*` | Course platform (Courses, Lessons, Community) | Yes |
| `/portal/*` | Client portal (Support, Chat, Admin/Clients) | Yes |
| `/hub/*` | Agent hub (Referrals, Profile, Settings, SignAgreement) | Yes |
| `/hub/admin/*` | Admin hub (CommandCenter, UnifiedChat, BillingDashboard, etc.) | Yes (admin) |
| `/hub/tv/*` | TV/dashboard displays (Leaderboards, AlertCenter, etc.) | Yes (admin) |
| `/book-call`, `/schedule-onboarding` | Booking pages | No |
| `/apply` | Application form | No |

### Supabase Client Configuration

- **Location:** `src/integrations/supabase/client.ts`
- **URL source:** `VITE_SUPABASE_URL` from `.env` (currently `https://qydkrpirrfelgtcqasdx.supabase.co`)
- **Anon key source:** `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env`
- **Types:** Auto-generated in `src/integrations/supabase/types.ts`

### Stripe.js Integration

- **Config:** `src/config/stripe.ts` -- fetches publishable keys from `get-stripe-config` edge function (NOT from env vars)
- **Pattern:** Two separate Stripe accounts: `management` (platform fees) and `ad_spend` (ad budget charges)
- **Components using Stripe:**
  - `src/components/portal/PaymentMethodCard.tsx` -- card on file management
  - `src/components/portal/OnboardingPaymentFlow.tsx` -- initial payment setup
  - `src/components/portal/AdSpendSetupDialog.tsx` -- ad spend payment setup

---

## 5. Critical Investigation: Stripe Key Locations

### FINDING: Stripe API Keys ARE in Edge Functions (Research Was Wrong)

The prior research claimed "ZERO `Deno.env.get()` calls for Stripe secrets in edge functions." This was incorrect -- likely based on an older version of the codebase. The current codebase has **6 Stripe-related secrets** actively used:

| Secret | Type | Used By |
|--------|------|---------|
| `STRIPE_MANAGEMENT_SECRET_KEY` | Server-side API key | create-setup-intent, create-stripe-invoice, create-stripe-subscription, migrate-to-auto-billing, save-payment-method, sync-stripe-cards, mcp-proxy |
| `STRIPE_AD_SPEND_SECRET_KEY` | Server-side API key | Same 7 functions as above |
| `STRIPE_MANAGEMENT_WEBHOOK_SECRET` | Webhook signature secret | stripe-billing-webhook |
| `STRIPE_AD_SPEND_WEBHOOK_SECRET` | Webhook signature secret | stripe-billing-webhook |
| `VITE_STRIPE_MANAGEMENT_PUBLISHABLE_KEY` | Publishable key (served to frontend) | get-stripe-config |
| `VITE_STRIPE_AD_SPEND_PUBLISHABLE_KEY` | Publishable key (served to frontend) | get-stripe-config |

### Stripe Architecture (Dual Account)

AlphaHub uses **two separate Stripe accounts**:
1. **Management account** -- charges platform/management fees
2. **Ad Spend account** -- charges for Google Ads spend

Each account has its own:
- Secret key (`STRIPE_*_SECRET_KEY`)
- Publishable key (`VITE_STRIPE_*_PUBLISHABLE_KEY`)
- Webhook secret (`STRIPE_*_WEBHOOK_SECRET`)

### How Stripe Calls Are Made

- **Server-side:** Edge functions call `https://api.stripe.com/v1/*` directly using `fetch()` with `Authorization: Bearer ${key}` headers. No Stripe SDK is used.
- **Client-side:** Frontend loads Stripe.js via `@stripe/stripe-js` library, fetches publishable keys from `get-stripe-config` edge function.
- **Webhook verification:** `stripe-billing-webhook` implements manual HMAC-SHA256 signature verification using `crypto.subtle`. `stripe-webhook` and `dispute-webhook` do NOT verify signatures.

### Impact on Migration

For Phase 4 (Stripe Migration):
- All 6 Stripe secrets must be set as Supabase secrets in the new project
- The `stripe-billing-webhook` URL must be updated in both Stripe dashboard accounts
- The `dispute-webhook` URL must also be updated
- The `stripe-webhook` URL must be updated (legacy checkout flow)
- Frontend publishable keys are served via edge function, not hardcoded -- only the edge function secret needs updating

---

## 6. LOVABLE_API_KEY Investigation

### FINDING: LOVABLE_API_KEY is a Lovable AI Gateway Key for LLM Access

The `LOVABLE_API_KEY` is used to call `https://ai.gateway.lovable.dev/v1/chat/completions` -- Lovable's AI gateway that provides access to LLM models (currently using `google/gemini-2.5-flash`).

**Used by 5 functions:**

| Function | Purpose of AI Call |
|----------|-------------------|
| `generate-agent-bio` | Generate professional bio from brief description |
| `generate-dispute-evidence` | Generate Stripe dispute response text |
| `analyze-prospect` | AI analysis of prospect readiness |
| `verify-onboarding` | AI verification of onboarding steps |
| `verify-onboarding-live` | Live AI verification of onboarding |

### Impact on Migration

Post-migration, the Lovable AI gateway (`ai.gateway.lovable.dev`) will likely not be accessible. A replacement is needed:

**Options:**
1. Replace with direct OpenAI/Google AI API calls
2. Replace with another AI gateway (e.g., OpenRouter)
3. Use Supabase AI integration

The function signatures are standard OpenAI chat completion format, so switching the URL and API key to any OpenAI-compatible endpoint should be straightforward.

---

## 7. Suspicious Items / Flags

### Security Concerns

1. **`admin-set-password` uses hardcoded secret:** `admin_secret !== 'alpha-admin-2024'` -- this should be an environment variable
2. **`stripe-webhook` has no signature verification:** Accepts any JSON payload claiming to be from Stripe. Only `stripe-billing-webhook` properly verifies signatures.
3. **`dispute-webhook` has no signature verification:** Same issue as `stripe-webhook`.
4. **`ghl-create-user` has hardcoded values:** Default password `Alpha21$` and company ID `30bFOq4ZtlhKuMOvVPwA` are hardcoded.

### Deprecated/Legacy Patterns

1. **Mixed import styles:** Some functions use `https://esm.sh/@supabase/supabase-js@2`, others use `npm:@supabase/supabase-js@2.87.1`, and others use `https://deno.land/std@0.168.0/http/server.ts`. The newer functions use `Deno.serve()` pattern while older ones use `serve()` from std.
2. **`stripe-webhook` appears to be a legacy function:** It handles `checkout.session.completed` but the newer `stripe-billing-webhook` handles the full billing lifecycle. These may overlap.
3. **Hardcoded GHL location ID** in multiple prospect functions: `wDoj91sbkfxZnMbow2G5` appears in `prospect-contact-capture`, `prospect-inactivity-check`, `prospect-qualification-submit`, `prospect-sync-custom-fields`.

### Potential Migration Issues

1. **`mcp-proxy` is extremely large** (~2400+ lines) and has its own local module `computed-wallet.ts`. This is the most complex function to migrate.
2. **`run-full-onboarding` orchestrates 18+ external API calls** (GHL, Google Ads, NFIA, Webflow) -- needs careful testing.
3. **Encrypted tokens:** GHL OAuth tokens and Plaid access tokens are encrypted with `ENCRYPTION_KEY` using AES-GCM (for GHL) and XOR (for Plaid). The same `ENCRYPTION_KEY` value must be set in the new project or all stored tokens become unusable.
4. **Hardcoded Supabase project reference** in migrations: `qydkrpirrfelgtcqasdx.supabase.co` appears in at least one migration for a default image URL.
5. **All functions have `verify_jwt = false`:** None of the 106 registered functions use Supabase JWT verification at the edge. Authentication is handled within functions using the authorization header or API keys.

---

## 8. Complete Secrets Inventory (44 unique)

### Auto-Set by Supabase (3)

| Secret | Notes |
|--------|-------|
| `SUPABASE_URL` | Auto-populated by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-populated by Supabase |
| `SUPABASE_ANON_KEY` | Auto-populated by Supabase |

### Must Be Manually Set (41)

| Secret | Category | Function Count |
|--------|----------|---------------|
| `CONVERSION_API_KEY` | Tracking | 2 |
| `ENCRYPTION_KEY` | Security | 8 |
| `FATHOM_API_KEY` | Analytics | 1 |
| `GHL_AGENCY_API_KEY` | CRM | 3 |
| `GHL_CLIENT_ID` | CRM | 6 |
| `GHL_CLIENT_SECRET` | CRM | 5 |
| `GHL_COMPANY_ID` | CRM | 3 |
| `GHL_INSTALL_URL` | CRM | 1 |
| `GHL_PROSPECT_WEBHOOK_URL` | CRM | 1 |
| `GHL_REDIRECT_URI` | CRM | 2 |
| `GHL_SAAS_PLAN_ID` | CRM | 1 |
| `GHL_STAGE_WEBHOOK_URL` | CRM | 1 |
| `GOOGLE_ADS_CLIENT_ID` | Ads | 15 |
| `GOOGLE_ADS_CLIENT_SECRET` | Ads | 15 |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Ads | 15 |
| `GOOGLE_ADS_MCC_CUSTOMER_ID` | Ads | 15 |
| `GOOGLE_ADS_REFRESH_TOKEN` | Ads | 15 |
| `LOVABLE_API_KEY` | AI | 5 |
| `MASTER_TWILIO_ACCOUNT_SID` | Phone | 1 |
| `MASTER_TWILIO_AUTH_TOKEN` | Phone | 1 |
| `MCP_PROXY_SECRET` | Security | 1 |
| `ONBOARDING_BRIDGE_KEY` | Security | 2 |
| `PLAID_CLIENT_ID` | Banking | 5 |
| `PLAID_ENV` | Banking | 5 |
| `PLAID_SECRET` | Banking | 5 |
| `PUBLIC_APP_URL` | Config | 1 |
| `RESEND_API_KEY` | Email | 6 |
| `SLACK_ADS_MANAGER_SIGNING_SECRET` | Notifications | 1 |
| `SLACK_ADS_MANAGER_WEBHOOK_URL` | Notifications | 7 |
| `SLACK_CHAT_WEBHOOK_URL` | Notifications | 3 |
| `STRIPE_AD_SPEND_SECRET_KEY` | Payments | 7 |
| `STRIPE_AD_SPEND_WEBHOOK_SECRET` | Payments | 1 |
| `STRIPE_MANAGEMENT_SECRET_KEY` | Payments | 7 |
| `STRIPE_MANAGEMENT_WEBHOOK_SECRET` | Payments | 1 |
| `TWILIO_ACCOUNT_SID` | Phone | 4 |
| `TWILIO_AUTH_TOKEN` | Phone | 4 |
| `TWILIO_PHONE_NUMBER` | Phone | 3 |
| `VITE_STRIPE_AD_SPEND_PUBLISHABLE_KEY` | Payments | 1 |
| `VITE_STRIPE_MANAGEMENT_PUBLISHABLE_KEY` | Payments | 1 |
| `WEBFLOW_API_TOKEN` | CMS | 2 |
| `WEBFLOW_SITE_ID` | CMS | 1 |

---

## 9. Database Functions & Triggers

### Key Database Functions (28)

| Function | Purpose |
|----------|---------|
| `handle_new_user` | Triggered on auth.users insert -- creates profile |
| `handle_user_login` | Triggered on login event |
| `get_user_role` | Returns role for a given user |
| `has_role` | Check if user has a specific role |
| `is_enrolled` | Check course enrollment |
| `get_or_create_conversation` | Get or create chat conversation |
| `mark_messages_read` | Mark chat messages as read |
| `update_updated_at_column` | Generic updated_at trigger function |
| `track_lead_stage_history` | Record lead status changes |
| `increment_stat` | Atomically increment live_stats counter |
| `increment_pipeline_metric` | Atomically increment pipeline metric |
| `generate_referral_code` | Generate unique referral code |
| `auto_generate_referral_code` | Auto-generate on client creation |
| `activate_referral_on_prospect_conversion` | Activate referral when prospect converts |
| `link_prospect_to_referrer` | Link prospect to referring partner |
| `auto_assign_ticket` | Auto-assign support tickets |
| `calculate_sla_deadline` | Calculate SLA response deadline |
| `check_stage_completion_and_notify` | Check onboarding stage completion |
| `send_welcome_chat_message` | Send welcome message on client creation |
| `run_readonly_query` | Execute read-only SQL (used by MCP proxy) |

### Key Triggers (non-updated_at)

| Trigger | Table | Purpose |
|---------|-------|---------|
| `on_auth_user_created` | auth.users | Create profile on signup |
| `on_chat_message_insert` | chat_messages | Update conversation metadata |
| `trigger_track_lead_stage_history` | leads | Track lead status changes |
| `trigger_auto_assign_ticket` | support_tickets | Auto-assign new tickets |
| `trigger_send_welcome_chat_message` | clients | Welcome message on creation |
| `trigger_check_stage_completion` | onboarding_checklist | Check onboarding progress |
| `trigger_link_prospect_referrer` | prospects | Link prospect to referrer |
| `on_client_created_generate_referral_code` | clients | Generate referral code |

Plus ~30 `update_*_updated_at` triggers for automatic timestamp updates.

---

*Audit completed: 2026-02-26*
*Source: alphahub-v2/ at commit 8e95b42*
