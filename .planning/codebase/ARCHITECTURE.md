# Architecture

**Analysis Date:** 2026-03-12

## Pattern Overview

**Overall:** Multi-tenant SaaS platform with a React SPA frontend, Supabase (PostgreSQL + Deno) backend, and a companion iOS app. No traditional API server — all server logic lives in Supabase Edge Functions.

**Key Characteristics:**
- All data access from the frontend goes through TanStack React Query hooks that call the Supabase JS client directly
- Business logic that requires secrets, external API calls, or elevated permissions runs in Deno edge functions
- Supabase RLS (Row Level Security) enforces authorization at the database layer
- Role-based access: `admin`, `member`, `guest`, `client`, `referrer` — determined at login via `get_user_role` RPC and surfaced through `AuthContext`
- Multi-tenant in practice: two parallel Stripe accounts (`management` and `ad_spend`) for different billing concerns; GHL company ID is shared across all clients (`30bFOq4ZtlhKuMOvVPwA`)

## Layers

**Presentation Layer:**
- Purpose: UI rendering, user interaction, route-level access control
- Location: `src/pages/`, `src/components/`
- Contains: Route pages, layout shells, reusable widgets, portal components
- Depends on: Data layer (hooks), context layer
- Used by: End users (browser and iOS)

**Data Layer:**
- Purpose: All Supabase reads and writes, caching, optimistic updates
- Location: `src/hooks/`
- Contains: TanStack React Query hooks, mutations, realtime subscriptions
- Depends on: `src/integrations/supabase/client.ts`, `src/contexts/AuthContext.tsx`
- Used by: Presentation layer only

**Context Layer:**
- Purpose: Global state that crosses component boundaries
- Location: `src/contexts/`
- Contains: `AuthContext`, `ClientPreviewContext`, `NotificationContext`, `CalculatorContext`
- Depends on: Supabase client
- Used by: All presentation and data layers

**Edge Function Layer:**
- Purpose: Server-side logic requiring secrets, external API calls, or service-role DB access
- Location: `supabase/functions/<function-name>/index.ts`
- Contains: Deno HTTP handlers, Stripe API calls, Google Ads API, GHL API, Twilio, Plaid
- Depends on: `SUPABASE_SERVICE_ROLE_KEY`, external secrets via `Deno.env.get()`
- Used by: Frontend (via `supabase.functions.invoke()`), external webhooks (Stripe, GHL, lead sources), pg_cron scheduled jobs

**Database Layer:**
- Purpose: Persistent state, RLS enforcement, computed functions
- Location: `supabase/migrations/`
- Contains: PostgreSQL tables, RLS policies, RPC functions (`get_user_role`, `link_client_to_user`)
- Depends on: Nothing above it
- Used by: Frontend JS client, edge functions (service role)

**iOS App Layer:**
- Purpose: Native mobile client for insurance agents (clients only, not admins)
- Location: `AlphaHub/`
- Contains: SwiftUI views, `DataManager` (central state), `AuthManager`, `RealtimeManager`
- Depends on: Same Supabase project via Swift Supabase SDK
- Used by: Client-role users on iOS

## Data Flow

**Authentication Flow:**

1. User submits credentials at `/login`
2. `AuthContext.signIn()` calls `supabase.auth.signInWithPassword()`
3. On success, `onAuthStateChange` fires; `fetchUserData()` runs
4. `fetchUserData()` fetches `profiles` table and calls `get_user_role` RPC
5. `link_client_to_user` RPC auto-links client record if email matches
6. Role stored in `AuthContext.role`; `isAdmin`, `isClient`, etc. computed
7. Admin routes check `requiredRole='admin'` in `ProtectedRoute`; MFA check added on top for admins with TOTP enrolled
8. `/hub` index redirects admins to `/hub/admin/clients`, clients to their portal (`PortalAdminClientDetail`)

**Client Onboarding Flow:**

1. Admin creates client record in `clients` table
2. Admin triggers `run-full-onboarding` edge function with `clientId`
3. 19-step automation runs sequentially (steps 10, 19 are manual):
   - Steps 1-8: Webflow page creation (NFIA, scheduler, lander, profile, thank-you pages)
   - Step 9: GHL subaccount creation via `ghl-create-subaccount`
   - Step 10: Manual — admin activates SaaS in GHL
   - Steps 11-15: GHL snapshot install, calendar pull, user assignment, custom field sync
   - Step 16: Google Ads campaign creation via `create-google-ads-campaign`
   - Steps 17-18: Final verification via `verify-onboarding`
   - Step 19: Manual — Twilio phone provisioned via `ghl-inject-twilio` / `ghl-provision-phone`
4. Progress tracked in `onboarding_automation_runs` table; frontend polls via `useOnboardingAutomation` hook
5. After completion, client signs agreement (OTP-verified via `send-agreement-otp` / `verify-agreement-otp`)
6. Client completes payment setup via `OnboardingPaymentFlow` component (Stripe Elements)

**Billing Cycle Flow (Management Fees):**

1. Stripe subscription created for client on `management` Stripe account
2. `stripe-billing-webhook` edge function receives `invoice.paid` / `payment_intent.succeeded` events
3. Webhook updates `billing_records` table (`status = 'paid'`, `paid_at` set)
4. If billing record had `safe_mode` campaigns, webhook calls `update-google-ads-budget` to restore budgets
5. Failed payments trigger `billing-collections-run` or `enforce-management-billing` scheduled functions
6. `mark-overdue-billing` edge function marks records overdue; `weekly-billing-audit` audits consistency
7. Admin views in `BillingDashboard` (`/hub/admin/billing`) consume `useBillingDashboard` hook
8. `useBillingRecords` hook provides per-client billing record CRUD

**Ad Spend Wallet Flow:**

1. Client adds payment method via `OnboardingPaymentFlow` or `PaymentMethodCard` on `ad_spend` Stripe account
2. Admin or auto-billing creates charge on `ad_spend` Stripe account
3. `stripe-webhook` receives `checkout.session.completed` or `payment_intent.succeeded` from ad spend account
4. Webhook calls `add-wallet-credit` edge function with `client_id` and `amount`
5. `add-wallet-credit` inserts into `wallet_transactions` (type=`deposit`), ensures `client_wallets` record exists with `tracking_start_date`
6. Frontend computes balance in `useComputedWalletBalance`: `totalDeposits - displayedSpend`
   - `totalDeposits` = sum of all `wallet_transactions` where `transaction_type='deposit'`
   - `trackedSpend` = sum of `ad_spend_daily.cost` since `tracking_start_date`
   - `displayedSpend` = `trackedSpend` inflated by `performancePercentage` setting
7. When `remainingBalance <= low_balance_threshold`, `useComputedWalletBalance` automatically calls `check-low-balance` edge function
8. `check-low-balance` attempts budget reduction to safe-mode ladder (`$0.01, $0.10, $1.00/day`), sets `campaigns.safe_mode = true`
9. When wallet refilled (billing webhook), `stripe-billing-webhook` calls `update-google-ads-budget` to restore pre-safe-mode budgets

**Ad Spend Tracking Flow:**

1. pg_cron job triggers `sync-google-ads` edge function hourly
2. `sync-google-ads` authenticates to Google Ads REST API via OAuth2 refresh token
3. Fetches campaign metrics for all active clients; writes to `ad_spend_daily` table
4. `morning-review-job` runs daily, evaluates campaign pacing vs. monthly budget
5. Pacing logic produces `RulesResult`: proposes budget adjustments or safe-mode triggers
6. Budget changes execute via `update-google-ads-budget` → Google Ads Mutate API → `campaign_audit_log` insert
7. Campaign proposals requiring admin approval go to `proposals` table; UI shows in `CampaignCommandCenter`

**Lead Pipeline Flow:**

1. Leads arrive via `lead-webhook` edge function (authenticated by `webhook_api_keys` table)
2. Webhook validates API key, parses lead data, inserts into `leads` table linked to `agent_id`
3. Lead injected to GHL subaccount via `inject-lead-to-ghl` edge function
4. Lead status transitions tracked via `lead-status-webhook`
5. GHL appointment booking synced via `sync-ghl-appointments`
6. Premium fields (`submitted_premium`, `approved_premium`, `issued_premium`) updated via GHL webhooks
7. Frontend: `useLeads` hook for CRUD, `useLeadMetrics` hook computes aggregate metrics
8. Lead router health monitored via `check-lead-router-health`, `check-lead-discrepancy`, `useRouterStatus` hook
9. Admin lead stats visible in `CommandCenter > Router` tab (`/hub/admin/command?tab=router`)

**Chat Flow (Client-to-Admin):**

1. `ChatConversation` record auto-created or fetched per `client_id` via `useClientConversation` hook
2. Messages inserted to `chat_messages` table with `sender_role` (client/admin)
3. Realtime subscription on `chat_messages` channel provides live updates in `useChat`
4. `chat-notification` edge function sends push/browser notifications on new messages
5. File attachments uploaded to Supabase Storage; `attachment_url` stored on message row
6. Admin inbox at `/hub/admin/chat?tab=inbox` (`UnifiedChat` → `ChatInbox` → `AdminChatView`)
7. Client chat at `/hub/chat` (`PortalChat` → `ChatPanel`)
8. SLA tracking via `useChatSLAMetrics` hook; settings via `useSLASettings`

**Team Chat Flow (Admin-to-Admin):**

1. Two modes: DM conversations (`admin_dm_conversations`, `admin_dm_messages`) and channels (`admin_channels`, `admin_channel_messages`)
2. `useAdminChat` hook handles all admin-chat data fetching and realtime via Supabase channels
3. `TeamChat` page at `/hub/admin/chat?tab=team` renders sidebar + message panel
4. File attachments stored in Supabase Storage bucket with signed URLs

**Sales Pipeline / Prospect Flow:**

1. Prospects arrive via `prospect-contact-capture`, `prospect-booking-webhook`, or manual entry
2. Stored in `prospects` table with `pipeline_stage_id` FK to `pipeline_stages`
3. GHL contact sync via `prospect-sync-custom-fields`, `ghl-stage-sync`
4. Admin works pipeline in `SalesKanbanBoard` (`UnifiedSales > Pipeline tab`)
5. Disposition changes trigger `sync-disposition-to-ghl`
6. Attribution tracked in `b2b_attribution_data`; visible in `Attribution` tab

## Key Abstractions

**Client Record (`clients` table):**
- Central entity linking everything: billing, leads, wallet, campaigns, chat, onboarding
- `agent_id` field is the string identifier used in GHL and lead delivery (NOT the same as `id`)
- `user_id` field links to Supabase Auth user (set after client creates account)
- Examples: queried everywhere via `useClients`, `useClient`, `useClientByUserId` in `src/hooks/useClients.ts`

**Campaign Row (`campaigns` table):**
- Represents one Google Ads campaign; a client can have multiple (primary + secondary)
- Stores `google_customer_id`, `google_campaign_id` for API calls
- `safe_mode` boolean + `pre_safe_mode_budget` for wallet-protection logic
- `src/hooks/useCampaigns.ts`, `src/components/campaigns/CampaignCommandCenter.tsx`

**Wallet (`client_wallets` + `wallet_transactions` + `ad_spend_daily`):**
- `client_wallets`: configuration row (thresholds, auto-billing settings, `tracking_start_date`)
- `wallet_transactions`: ledger of deposits (all Stripe ad spend charges)
- `ad_spend_daily`: Google Ads actuals synced hourly; balance computed by subtracting since `tracking_start_date`
- `src/hooks/useComputedWalletBalance.ts`, `src/hooks/useClientWallet.ts`

**Dual Stripe Accounts:**
- `management` account: monthly management fees, subscriptions — `STRIPE_MANAGEMENT_SECRET_KEY`
- `ad_spend` account: wallet top-ups, ad spend charges — `STRIPE_AD_SPEND_SECRET_KEY`
- `client_payment_methods` table stores cards per account with `stripe_account` column
- `src/config/stripe.ts` lazily loads publishable keys via `get-stripe-config` edge function

**Onboarding Automation Run (`onboarding_automation_runs`):**
- Tracks 19-step automation per client; `steps_completed[]`, `steps_failed[]`, `step_data` (JSONB)
- `src/hooks/useOnboardingAutomation.ts` provides `startAutomation`, `resumeFromStep` mutations
- Frontend widget: `src/components/admin/OnboardingAutomationWidget.tsx`

**Support Ticket (`support_tickets` + `ticket_replies`):**
- `ticket_type`: `client_support` or `internal`
- SLA deadline enforced; `priority` enum: `low/normal/high/urgent`
- `src/hooks/useTicketDashboard.ts` for admin; `src/hooks/useClients.ts` (useSupportTickets) for client view

**GHL OAuth Token Storage:**
- GHL access token stored encrypted (AES-GCM) in Supabase secrets or DB
- `ghl-create-subaccount` and `ghl-inject-twilio` both perform AES-GCM decrypt before API calls
- Company ID hardcoded: `30bFOq4ZtlhKuMOvVPwA`

## Entry Points

**Web App:**
- Location: `src/main.tsx` → `src/App.tsx`
- Triggers: Browser navigation to `alphaagent.io`
- Responsibilities: Provider tree setup (QueryClient, Auth, Router, Contexts), all route definitions

**Hub Layout:**
- Location: `src/components/hub/AgentHubLayout.tsx`
- Triggers: Any `/hub/*` route when authenticated
- Responsibilities: Sidebar nav (admin vs. client nav sections), outlet rendering, unread badge

**Hub Index Redirect:**
- Location: `HubIndex` function in `src/App.tsx`
- Triggers: `GET /hub` (root)
- Responsibilities: Admins → `/hub/admin/clients`; clients → `PortalAdminClientDetail` (their own portal)

**Client Detail (Admin):**
- Location: `src/pages/portal/admin/ClientDetail.tsx`
- Triggers: `/hub/admin/clients/:id` or `/hub` for client role
- Responsibilities: All client data rendering via tabbed layout — onboarding, performance, leads, billing, wallet, campaigns, chat, settings

**Edge Function Webhooks:**
- `supabase/functions/lead-webhook/index.ts` — receives leads from lead sources (no JWT)
- `supabase/functions/stripe-webhook/index.ts` — receives Stripe ad spend events (no JWT)
- `supabase/functions/stripe-billing-webhook/index.ts` — receives Stripe management billing events
- `supabase/functions/agent-onboarding-webhook/index.ts` — triggers onboarding from external sources

**iOS App:**
- Location: `AlphaHub/App/AlphaHubApp.swift`
- Triggers: App launch
- Responsibilities: Auth check, biometric lock, data load via `DataManager.loadAllData()`

## Error Handling

**Strategy:** Fail visibly at query boundary, toast for mutations

**Patterns:**
- TanStack Query `error` state displayed as UI fallback or skeleton in components
- Mutations use `onError` callback to call `toast()` from `sonner`
- Edge functions return structured `{ error: string }` JSON with HTTP status codes
- `ErrorBoundary` wraps the entire route tree in `src/App.tsx`
- Edge functions log errors via `console.error()` (visible in Supabase function logs)
- Onboarding automation stores per-step errors in `onboarding_automation_runs.error_log` JSONB

## Cross-Cutting Concerns

**Logging:** `console.log/error` in edge functions; visible in Supabase dashboard logs. No structured logging framework.

**Validation:** Input validation is ad-hoc in edge functions (manual checks) and implicit via Supabase column constraints. No validation library.

**Authentication:**
- Web: Supabase Auth JWT, session persisted in `localStorage`; role from `get_user_role` RPC
- Edge functions: JWT verified by default; exceptions declared in `supabase/config.toml` with `verify_jwt = false`
- MFA: TOTP optional for admins; enforced by `ProtectedRoute` checking `mfaStatus`
- iOS: Supabase Auth + biometric lock layer in `BiometricManager`

**Realtime:**
- Chat uses Supabase Realtime channels (`chat_messages`, `admin_dm_messages`, `admin_channel_messages`)
- Ticket dashboard uses Realtime for live ticket updates (`useTicketRealtime` in `useTicketDashboard.ts`)
- iOS: `RealtimeManager` manages channel subscriptions for chat unread counts

**Multi-tenant:**
- All clients share one Supabase project and one GHL company
- Tenant isolation enforced by RLS on all client-linked tables (filtering by `client_id` or `user_id`)
- "Multi-tenant" in the sense of two business owners (Alpha Agent + Tierre Browne) is not code-level — it is operational (separate Stripe accounts, separate GHL subaccounts per client)

---

*Architecture analysis: 2026-03-12*
