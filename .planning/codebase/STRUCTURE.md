# Codebase Structure

**Analysis Date:** 2026-03-12

## Directory Layout

```
copy-alphahub/                         # Project root
├── src/                               # React web app source
│   ├── App.tsx                        # Root component: provider tree + all route definitions
│   ├── main.tsx                       # Vite entry point
│   ├── components/                    # Reusable UI components
│   │   ├── admin/                     # Admin-only widgets and dialogs
│   │   │   └── tickets/               # Ticket-specific sub-components
│   │   ├── admin-chat/                # Channel management dialog
│   │   ├── agreement/                 # Agreement signing UI
│   │   ├── analytics/                 # Chart components (SpendByClient, FunnelViz, etc.)
│   │   ├── app/                       # ProtectedRoute wrapper
│   │   ├── attribution/               # B2B attribution components
│   │   ├── auth/                      # Login, MFAVerification forms
│   │   ├── campaigns/                 # CampaignCommandCenter, ProposalApprovalModal
│   │   ├── courses/                   # Course/lesson rendering
│   │   ├── hub/                       # Layout shell and banners
│   │   ├── partner/                   # Partner referral components
│   │   ├── portal/                    # Core client portal widgets
│   │   │   ├── chat/                  # Chat UI: ChatPanel, AdminChatView, ChatInput
│   │   │   └── onboarding/            # Onboarding checklist, stage progress
│   │   ├── sales/                     # Sales pipeline components
│   │   ├── tv/                        # TV/dashboard display components
│   │   └── ui/                        # shadcn/ui primitives
│   ├── config/
│   │   └── stripe.ts                  # Dual Stripe account lazy-loader
│   ├── contexts/
│   │   ├── AuthContext.tsx            # Auth state, role, MFA methods
│   │   ├── ClientPreviewContext.tsx   # Admin "view as client" mode (?viewAs=)
│   │   ├── NotificationContext.tsx    # Browser notification state
│   │   └── CalculatorContext.tsx      # Calculator widget state
│   ├── hooks/                         # All data fetching (TanStack React Query)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts              # Supabase JS client (singleton)
│   │       └── types.ts              # Auto-generated DB types (do not edit)
│   ├── lib/
│   │   └── utils.ts                   # cn() helper (clsx + tailwind-merge)
│   ├── pages/                         # Route-level page components
│   │   ├── Index.tsx                  # Public marketing homepage
│   │   ├── auth/                      # Login, ForgotPassword, ResetPassword
│   │   ├── hub/                       # Unified agent hub pages
│   │   │   ├── admin/                 # Admin-only pages (behind ProtectedRoute requiredRole="admin")
│   │   │   │   ├── CommandCenter.tsx  # Campaigns + Lead Router + Change Log + Settings
│   │   │   │   ├── UnifiedChat.tsx    # Client inbox + Team chat tabs
│   │   │   │   ├── UnifiedSales.tsx   # Pipeline + Attribution + Referrals tabs
│   │   │   │   ├── TVAnalytics.tsx    # Analytics view switcher
│   │   │   │   ├── BillingDashboard.tsx # Revenue, wallets, disputes
│   │   │   │   ├── TicketDashboard.tsx  # Support ticket management
│   │   │   │   ├── TeamChat.tsx       # Admin DM + channels (legacy, now in UnifiedChat)
│   │   │   │   ├── GHLBridge.tsx      # GHL OAuth + field mapping
│   │   │   │   ├── LeadStats.tsx      # Lead router stats
│   │   │   │   ├── CampaignChanges.tsx # Campaign change log
│   │   │   │   ├── CampaignSettings.tsx # Router settings
│   │   │   │   ├── Analytics.tsx      # Analytics
│   │   │   │   ├── Attribution.tsx    # B2B attribution
│   │   │   │   ├── CustomerJourney.tsx # Customer journey map
│   │   │   │   └── ReferralAdmin.tsx  # Referral program admin
│   │   │   ├── tv/                    # TV/display dashboard pages
│   │   │   │   ├── CEOBoard.tsx       # CEO revenue dashboard
│   │   │   │   ├── EngineRoom.tsx     # Daily ad engine metrics
│   │   │   │   ├── ClientSuccess.tsx  # Client health metrics
│   │   │   │   ├── Watchtower.tsx     # Alert monitoring
│   │   │   │   ├── AgentLeaderboards.tsx # Lead/revenue leaderboard
│   │   │   │   ├── AIAutopilot.tsx    # Autopilot status
│   │   │   │   ├── InternalSales.tsx  # Internal sales metrics
│   │   │   │   └── AlertCenter.tsx    # System alerts view
│   │   │   ├── Profile.tsx            # Agent profile page
│   │   │   ├── Settings.tsx           # Agent settings
│   │   │   ├── Referrals.tsx          # Agent referral program
│   │   │   └── SignAgreement.tsx      # Full-screen agreement signing
│   │   ├── portal/                    # Client + admin portal pages
│   │   │   ├── admin/
│   │   │   │   ├── ClientDetail.tsx   # Primary admin screen: full client record
│   │   │   │   ├── Clients.tsx        # Client list with filtering
│   │   │   │   ├── ArchivedClients.tsx # Archived/churned clients
│   │   │   │   ├── Settings.tsx       # Portal settings
│   │   │   │   └── ChatInbox.tsx      # Admin chat inbox
│   │   │   ├── Chat.tsx               # Client-side chat page
│   │   │   └── Support.tsx            # Client support tickets
│   │   └── app/                       # Legacy /app routes (courses, community)
│   └── styles/                        # Global CSS
├── supabase/
│   ├── config.toml                    # Function JWT bypass declarations
│   ├── functions/                     # ~100 Deno edge functions
│   └── migrations/                    # Timestamped SQL migrations
├── AlphaHub/                          # iOS app (Swift/SwiftUI)
│   ├── App/                           # App entry point, AppDelegate
│   ├── Core/
│   │   ├── Auth/                      # AuthManager, BiometricManager
│   │   ├── Data/                      # DataManager (central state)
│   │   │   └── Models/                # Swift model structs
│   │   ├── Design/                    # Colors, typography, spacing constants
│   │   ├── Navigation/                # AppRouter, MainTabView
│   │   ├── Realtime/                  # RealtimeManager (Supabase channels)
│   │   └── Notifications/             # PushNotificationManager
│   ├── Features/
│   │   ├── Dashboard/                 # DashboardView, wallet hero, business results
│   │   ├── Billing/                   # Billing records view
│   │   ├── Chat/                      # Chat UI
│   │   ├── Leads/                     # Leads list
│   │   └── Login/                     # Login screen
│   └── Shared/                        # Shared Swift components, modifiers
├── public/                            # Static assets
├── .planning/                         # GSD planning docs
│   └── codebase/                      # Codebase analysis docs (this file)
├── .env                               # Local env vars (gitignored)
├── package.json                       # Node deps
├── tailwind.config.ts                 # Tailwind config with custom theme
├── tsconfig.app.json                  # TypeScript config
├── vite.config.ts                     # Vite build config with @ alias
└── vercel.json                        # Vercel routing (SPA fallback)
```

## Directory Purposes

**`src/hooks/`:**
- Purpose: Every Supabase query and mutation is encapsulated here as a TanStack React Query hook
- Contains: Named hooks per domain — all return `{ data, isLoading, error }` or `useMutation` objects
- Key files:
  - `useClients.ts` — client CRUD, support tickets; also exports `Client` interface
  - `useClientData.tsx` — re-exports useClients hooks (compatibility alias)
  - `useComputedWalletBalance.ts` — balance formula + low-balance trigger
  - `useClientWallet.ts` — wallet config CRUD, transaction log
  - `useBillingRecords.ts` — per-client billing record CRUD
  - `useBillingDashboard.ts` — aggregated billing stats for admin dashboard
  - `useLeads.ts` — lead CRUD, status transitions
  - `useLeadMetrics.ts` — aggregate CPL, bookings, premium totals for a client
  - `useChat.ts` — client-to-admin conversations and messages; realtime subscriptions
  - `useAdminChat.ts` — admin DM conversations, channels, realtime
  - `useTicketDashboard.ts` — admin ticket list with filters, SLA tracking, realtime
  - `useOnboardingAutomation.ts` — 19-step automation run state
  - `useCampaigns.ts` — campaign rows per client
  - `useSalesPipeline.ts` — prospect records, pipeline stages
  - `useAgreement.ts` — client agreement templates and signed agreements
  - `usePaymentMethods.ts` — stored Stripe cards per Stripe account
  - `usePlaidLink.ts` — Plaid bank linking flow
  - `usePortalSettings.ts` — which portal sections are visible (global toggle)
  - `usePerformancePercentage.ts` — global ad-spend inflation setting
  - `useSystemAlerts.ts` — system alert records

**`src/components/portal/`:**
- Purpose: Reusable widgets used in `ClientDetail` and client-facing pages
- Key files:
  - `BillingWidget.tsx` — tabbed billing summary shown in ClientDetail (not BillingSection)
  - `AdSpendWalletWidget.tsx` — wallet balance + transaction history widget
  - `CampaignPanel.tsx` — campaign cards with safe-mode indicators
  - `OnboardingPaymentFlow.tsx` — Stripe Elements payment setup dialog
  - `AgreementSigningWidget.tsx` / `AgreementSignedWidget.tsx` — agreement state in ClientDetail
  - `chat/AdminChatView.tsx` — admin side of client chat
  - `chat/ChatPanel.tsx` — client-facing chat panel
  - `onboarding/OnboardingStageProgress.tsx` — visual onboarding progress bar

**`src/components/admin/`:**
- Purpose: Admin-only widgets that are embedded in settings, billing dashboard, or ClientDetail
- Key files:
  - `OnboardingAutomationWidget.tsx` — displays 19-step automation progress
  - `BillingPaymentsTable.tsx` / `RevenueSummaryRow.tsx` — billing dashboard components
  - `WalletPipelineWidget.tsx` — wallet low-balance pipeline view
  - `ManagementFeeEnforcerWidget.tsx` — finds clients missing subscriptions

**`src/components/campaigns/`:**
- Purpose: Campaign command center UI — health scores, proposals, budget controls
- Key files:
  - `CampaignCommandCenter.tsx` — main admin campaign management UI
  - `ProposalApprovalModal.tsx` — budget change proposal review
  - `HealthScoreIndicator.tsx` — per-campaign health status

**`src/components/hub/`:**
- Purpose: Hub layout and ambient banners
- Key files:
  - `AgentHubLayout.tsx` — primary layout shell for all `/hub/*` routes; renders nav + `<Outlet />`

**`supabase/functions/`:**
- Purpose: All server-side logic; each subdirectory is one independently deployed Deno function
- Key function groups:
  - **Onboarding**: `run-full-onboarding`, `verify-onboarding`, `ghl-create-subaccount`, `ghl-inject-twilio`, `ghl-provision-phone`, `create-google-ads-campaign`
  - **Billing/Wallet**: `stripe-billing-webhook`, `stripe-webhook`, `add-wallet-credit`, `check-low-balance`, `auto-recharge-run`, `billing-collections-run`, `enforce-management-billing`, `mark-overdue-billing`, `weekly-billing-audit`
  - **Google Ads**: `sync-google-ads`, `sync-all-google-ads`, `update-google-ads-budget`, `morning-review-job`, `create-google-ads-campaign`, `pause-google-ads-campaign`, `sync-google-ads-targeting`
  - **Leads**: `lead-webhook`, `inject-lead-to-ghl`, `lead-status-webhook`, `check-lead-router-health`, `retry-failed-lead-delivery`, `verify-lead-delivery`
  - **GHL/CRM**: `ghl-create-subaccount`, `ghl-inject-twilio`, `ghl-provision-phone`, `crm-oauth-start`, `crm-oauth-callback`, `crm-location-token`, `ghl-stage-sync`, `sync-disposition-to-ghl`, `sync-ghl-appointments`
  - **Sales/Prospects**: `prospect-booking-webhook`, `prospect-contact-capture`, `prospect-post-booking`, `prospect-qualification-submit`, `execute-proposal`
  - **Agreement**: `send-agreement-otp`, `verify-agreement-otp`
  - **Plaid**: `plaid-create-link-token`, `plaid-exchange-token`, `plaid-get-balances`, `plaid-daily-refresh`, `plaid-sync-transactions`
  - **Notifications**: `chat-notification`, `ticket-notification`, `hourly-approval-reminder`
  - **User Management**: `create-user-account`, `admin-set-password`, `admin-reset-user`, `set-client-password`
  - **Scheduled Jobs**: `morning-review-job`, `billing-collections-run`, `outcome-tracker-job`, `check-subscription-dates`, `cleanup-archived-clients`
  - **Webflow**: `webflow-cms-create`, `webflow-cms-update`
  - **Meta Ads**: `sync-meta-ads`
  - **Fathom/Calls**: `fetch-fathom-calls`, `fathom-webhook`

**`supabase/migrations/`:**
- Purpose: Ordered SQL migration history; applied to Supabase project
- Naming: `YYYYMMDDHHMMSS_<description>.sql` for auto-generated, `YYYYMMDDHHMMSS_<semantic-name>.sql` for manual
- Do not edit existing migrations; always add new files

**`AlphaHub/` (iOS):**
- Purpose: SwiftUI native app for client-role users only
- `AlphaHub/Core/Data/DataManager.swift` — single `@Observable` class holding all state; loaded at login
- `AlphaHub/Core/Auth/AuthManager.swift` — Supabase auth session management
- `AlphaHub/Features/Dashboard/DashboardView.swift` — primary screen with wallet hero + business results

## Key File Locations

**Entry Points:**
- `src/main.tsx` — Vite entry; mounts `<App />`
- `src/App.tsx` — Provider tree + all route definitions (the single routing file)
- `AlphaHub/App/AlphaHubApp.swift` — iOS app entry point

**Configuration:**
- `.env` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (gitignored)
- `supabase/config.toml` — function-level JWT bypass configuration
- `vite.config.ts` — `@` alias points to `src/`
- `tailwind.config.ts` — custom color tokens, dark mode class strategy
- `components.json` — shadcn/ui configuration

**Core Logic:**
- `src/contexts/AuthContext.tsx` — role resolution, MFA, session lifecycle
- `src/contexts/ClientPreviewContext.tsx` — admin impersonation via `?viewAs=` URL param
- `src/hooks/useComputedWalletBalance.ts` — wallet balance formula + low-balance automation trigger
- `src/config/stripe.ts` — dual Stripe account management
- `src/integrations/supabase/client.ts` — Supabase JS singleton
- `src/integrations/supabase/types.ts` — auto-generated DB types (never edit manually)
- `src/lib/utils.ts` — `cn()` utility

**Primary Admin Screens:**
- `src/pages/portal/admin/ClientDetail.tsx` — most complex page; tabbed client record view
- `src/pages/portal/admin/Clients.tsx` — client list with status/package filters
- `src/pages/hub/admin/BillingDashboard.tsx` — revenue + wallet + dispute management
- `src/pages/hub/admin/CommandCenter.tsx` — campaigns + lead router + audit log
- `src/pages/hub/admin/TicketDashboard.tsx` — support ticket management

**Critical Edge Functions:**
- `supabase/functions/run-full-onboarding/index.ts` — 19-step onboarding orchestrator
- `supabase/functions/stripe-billing-webhook/index.ts` — billing event processor + safe-mode restore
- `supabase/functions/check-low-balance/index.ts` — wallet protection + Google Ads safe-mode
- `supabase/functions/morning-review-job/index.ts` — daily pacing review + budget autopilot
- `supabase/functions/lead-webhook/index.ts` — lead intake (no JWT)
- `supabase/functions/add-wallet-credit/index.ts` — wallet deposit ledger entry

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `ClientDetail.tsx`, `BillingWidget.tsx`)
- Hooks: `camelCase.ts` prefixed with `use` (e.g., `useClientWallet.ts`)
- Edge functions: `kebab-case/index.ts` (e.g., `run-full-onboarding/index.ts`)
- Migrations: `YYYYMMDDHHMMSS_description.sql`
- Swift files: `PascalCase.swift`

**Directories:**
- Feature grouping by domain: `portal/`, `hub/`, `campaigns/`, `sales/`, `analytics/`
- Admin sub-grouping: `src/components/admin/`, `src/pages/hub/admin/`, `src/pages/portal/admin/`

**React Query Keys:**
- Single resource: `['client', clientId]`
- Collection: `['clients']`
- Nested resource: `['lead-metrics', clientId, from, to]`
- Dashboard: `['billing-dashboard']`, `['tv-vault-data']`

## Where to Add New Code

**New client portal widget:**
- Implementation: `src/components/portal/<WidgetName>.tsx`
- Data hook: `src/hooks/use<Domain>.ts`
- Import into: `src/pages/portal/admin/ClientDetail.tsx` (appropriate tab)

**New admin page:**
- Page component: `src/pages/hub/admin/<PageName>.tsx`
- Route: Add lazy import + `<Route>` in `src/App.tsx` under the `/hub` parent, wrapped in `<ProtectedRoute requiredRole="admin">`
- Nav link: Add to `adminNavSections` array in `src/components/hub/AgentHubLayout.tsx`

**New edge function:**
- Directory: `supabase/functions/<kebab-name>/index.ts`
- Register in `supabase/config.toml` only if JWT bypass is needed (`verify_jwt = false`)
- Deploy: `npx supabase functions deploy <name> --project-ref qcunascacayiiuufjtaq`
- Pattern: Create Supabase client with service role key for DB operations; always handle OPTIONS for CORS

**New database table:**
- Migration file: `supabase/migrations/<timestamp>_<description>.sql`
- Regenerate types: `supabase gen types typescript --project-id qcunascacayiiuufjtaq > src/integrations/supabase/types.ts`

**New React Query hook:**
- File: `src/hooks/use<Domain>.ts`
- Export named functions (not default exports)
- Always use `queryKey` arrays that include all filter params to avoid stale cache hits

**New admin component (widget, dialog, table):**
- Location: `src/components/admin/<ComponentName>.tsx` for admin-only
- Location: `src/components/portal/<ComponentName>.tsx` if visible to clients as well

## Special Directories

**`.planning/`:**
- Purpose: GSD project planning — phases, codebase analysis, research
- Generated: No
- Committed: Yes (planning docs committed to repo)

**`dist/`:**
- Purpose: Vite production build output
- Generated: Yes (by `npm run build`)
- Committed: No (gitignored)

**`node_modules/`:**
- Purpose: NPM dependencies
- Generated: Yes
- Committed: No

**`AlphaHub/AlphaHub.xcodeproj/`:**
- Purpose: Xcode project files for iOS app
- Generated: Partially (user-specific files gitignored, project file committed)
- Committed: Project file yes; user data no

**`alphahub-v2/`:**
- Purpose: Secondary Supabase CLI working directory; contains `supabase/functions/` with debug-only functions
- Note: The primary functions directory is `supabase/functions/` at root — NOT `alphahub-v2/supabase/functions/`
- Committed: Yes (small utility functions only)

**`_backup/`:**
- Purpose: Local backup files
- Generated: Manual
- Committed: Yes (but should be treated as read-only reference)

---

*Structure analysis: 2026-03-12*
