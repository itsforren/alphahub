# Codebase Structure

**Analysis Date:** 2026-03-04

## Directory Layout

```
project-root/
├── src/                        # Frontend React application
│   ├── main.tsx                # Entry point (initialization + render)
│   ├── App.tsx                 # Root component (providers + routes)
│   ├── index.css               # Global styles
│   ├── assets/                 # Images and static files
│   ├── components/             # React components (organized by feature)
│   │   ├── ui/                 # shadcn/ui primitives (Radix-based)
│   │   ├── app/                # Generic app components (ProtectedRoute, etc.)
│   │   ├── auth/               # Authentication forms
│   │   ├── admin/              # Admin-specific components
│   │   ├── portal/             # Client portal UI (billing, chat, wallet)
│   │   ├── hub/                # Hub layout and hub-specific components
│   │   ├── sales/              # Sales/pipeline components
│   │   ├── analytics/          # Analytics components
│   │   ├── campaigns/          # Campaign management components
│   │   ├── courses/            # Learning platform components
│   │   ├── admin-chat/         # Unified chat system
│   │   ├── attribution/        # Attribution tracking UI
│   │   ├── partner/            # Partner program components
│   │   ├── tv/                 # TV analytics screens
│   │   ├── agreement/          # Agreement signing
│   │   ├── onboarding/         # Onboarding flows
│   │   ├── chat/               # Chat UI (inside portal)
│   │   ├── ErrorBoundary.tsx   # Error catching wrapper
│   │   ├── Navbar.tsx          # Marketing site navbar
│   │   ├── NavLink.tsx         # Active link wrapper
│   │   ├── BrowserNotificationProvider.tsx
│   │   ├── LiveNotifications.tsx # Real-time notification display
│   │   └── [Marketing Components] # HeroSection, ROICalculator, etc.
│   ├── pages/                  # Route pages (organized by area)
│   │   ├── Index.tsx           # Homepage
│   │   ├── Pricing.tsx         # Pricing page
│   │   ├── Terms.tsx, Privacy.tsx, About.tsx, Blog.tsx
│   │   ├── Apply.tsx           # Application form
│   │   ├── Partner.tsx, PartnerPricing.tsx
│   │   ├── BookCall.tsx, ScheduleOnboarding.tsx
│   │   ├── auth/               # Auth pages (Login, ForgotPassword, ResetPassword)
│   │   ├── app/                # OLD: App-specific pages (redirected to /hub)
│   │   │   ├── Courses.tsx, CourseDetail.tsx, LessonView.tsx
│   │   │   ├── Profile.tsx, Settings.tsx, CommunityFeed.tsx
│   │   │   └── admin/          # OLD: Admin pages (AdminDashboard, AdminUsers, AdminCourses)
│   │   ├── portal/             # OLD: Portal pages (redirected to /hub)
│   │   │   ├── Chat.tsx, Support.tsx
│   │   │   └── admin/          # OLD: Portal admin (Clients, ClientDetail, Settings)
│   │   ├── hub/                # NEW: Unified hub pages (active routes)
│   │   │   ├── Profile.tsx, Settings.tsx, Referrals.tsx, SignAgreement.tsx
│   │   │   ├── admin/          # Admin hub routes
│   │   │   │   ├── CommandCenter.tsx (Campaigns, Lead Router, Settings)
│   │   │   │   ├── UnifiedChat.tsx (Client Inbox, Team Chat)
│   │   │   │   ├── UnifiedSales.tsx (Pipeline, Attribution, Referrals)
│   │   │   │   ├── TVAnalytics.tsx (Marketing, Client Success)
│   │   │   │   ├── BillingDashboard.tsx
│   │   │   │   ├── GHLBridge.tsx, TicketDashboard.tsx
│   │   │   │   └── [Legacy pages]
│   │   │   └── tv/             # TV screens (separate admin section)
│   │   │       ├── CEOBoard.tsx, Watchtower.tsx, EngineRoom.tsx
│   │   │       ├── AlertCenter.tsx, AIAutopilot.tsx, AgentLeaderboards.tsx
│   │   │       └── [Additional analytics screens]
│   │   └── admin/              # OLD: Marketing site admin pages
│   ├── hooks/                  # Custom React hooks (60+ total)
│   │   ├── useAuth.ts          # Auth hook (from AuthContext)
│   │   ├── use-toast.ts        # Toast notifications
│   │   ├── useBillingRecords.ts # Billing data + mutations
│   │   ├── useBillingDashboard.ts, useBillingTracker.ts
│   │   ├── useClients.ts       # Client list + client detail
│   │   ├── useClientWallet.ts, useClientCredits.ts
│   │   ├── useChat.ts          # Chat messages + unread count
│   │   ├── useAdminChat.ts     # Admin unified chat
│   │   ├── useCampaignCommandCenter.ts (38KB – complex state)
│   │   ├── useChat.ts, useChatSLAMetrics.ts
│   │   ├── useAgreement.ts, useAgreementOTP.ts
│   │   ├── useCourseAnalytics.ts, useCourseEnrollment.ts
│   │   ├── useEngineRoomData.ts, useEngineData.ts
│   │   ├── useCEOBoardData.ts
│   │   ├── useClientSuccessData.ts
│   │   ├── useAuditLog.ts, useAgreementTracking.ts
│   │   └── [Additional domain-specific hooks]
│   ├── contexts/               # React Context providers
│   │   ├── AuthContext.tsx     # User session, profile, role, MFA
│   │   ├── NotificationContext.tsx # Live notifications with seed RNG
│   │   ├── CalculatorContext.tsx # ROI calculator state
│   │   └── ClientPreviewContext.tsx # Preview mode state
│   ├── integrations/           # External service clients
│   │   └── supabase/           # Supabase configuration
│   │       ├── client.ts       # Singleton Supabase client
│   │       └── types.ts        # Auto-generated DB types (auto-generated)
│   ├── config/                 # Configuration
│   │   ├── stripe.ts           # Stripe client lazy initialization
│   │   ├── conversion.ts       # Conversion tracking config
│   │   └── webhook.ts          # Webhook configuration
│   ├── lib/                    # Utilities and helpers
│   │   ├── tracking.ts         # Attribution tracking (visitor ID, UTM, GTM)
│   │   ├── generateAgreementPdf.ts # PDF generation for agreements
│   │   ├── agreementsStorage.ts
│   │   ├── confetti.ts
│   │   ├── parseLinks.tsx
│   │   └── utils.ts            # General utilities (cn, etc.)
│   └── styles/                 # Stylesheets
│       └── liquid-glass.css    # Themed glass morphism
├── supabase/                   # Backend infrastructure
│   ├── functions/              # Deno edge functions (110+ total)
│   │   ├── [Webhook functions]
│   │   │   ├── stripe-webhook/              # Payment events
│   │   │   ├── lead-webhook/                # Lead routing
│   │   │   ├── agent-onboarding-webhook/    # Agent signup
│   │   │   ├── lead-status-webhook/         # Lead status updates
│   │   │   ├── fathom-webhook/              # Call tracking
│   │   │   ├── prospect-abandoned-webhook/
│   │   │   ├── ghl-stage-sync/              # CRM sync
│   │   │   └── [Additional webhooks]
│   │   ├── [Scheduled jobs]
│   │   │   ├── auto-recharge-run/           # Auto-recharge wallets (hourly)
│   │   │   ├── billing-collections-run/     # Billing collection (daily)
│   │   │   ├── check-lead-router-health/
│   │   │   ├── check-automation-timeout/
│   │   │   ├── morning-review-job/
│   │   │   ├── outcome-tracker-job/
│   │   │   ├── plaid-daily-refresh/         # Banking refresh
│   │   │   └── [Additional jobs]
│   │   ├── [Integration functions]
│   │   │   ├── sync-google-ads/              # Google Ads sync
│   │   │   ├── sync-meta-ads/                # Meta Ads sync
│   │   │   ├── sync-ghl-appointments/        # GHL CRM sync
│   │   │   ├── ghl-provision-phone/          # Twilio provision
│   │   │   ├── crm-oauth-callback/           # OAuth flow
│   │   │   └── [Additional integrations]
│   │   ├── [Billing functions]
│   │   │   ├── create-stripe-invoice/
│   │   │   ├── create-stripe-subscription/
│   │   │   ├── save-payment-method/
│   │   │   ├── stripe-billing-webhook/
│   │   │   ├── sync-stripe-cards/
│   │   │   └── [Additional billing]
│   │   ├── [Auth/account functions]
│   │   │   ├── create-user-account/          # Onboarding
│   │   │   ├── verify-onboarding/
│   │   │   ├── admin-delete-user/, admin-reset-user/, admin-set-password/
│   │   │   ├── send-auth-email/, send-password-reset/
│   │   │   └── [Additional auth]
│   │   ├── [Utility functions]
│   │   │   ├── track-event/                  # Event tracking
│   │   │   ├── fetch-link-preview/
│   │   │   ├── data-migration-helper/
│   │   │   ├── token-bridge/ (MCP proxy)
│   │   │   └── [Additional utilities]
│   │   └── index.ts            # (May not exist – functions are standalone)
│   ├── migrations/             # SQL migrations (if present)
│   └── config.toml             # Function registration + cron schedules
├── public/                     # Static assets (fonts, favicons, etc.)
├── index.html                  # HTML entry point
├── tsconfig.json               # TypeScript config
├── tsconfig.app.json, tsconfig.node.json # Specific configs
├── vite.config.ts              # Vite build config
├── tailwind.config.ts          # Tailwind CSS config
├── eslint.config.js            # ESLint rules
├── postcss.config.js           # PostCSS config
├── components.json             # shadcn/ui CLI config
├── package.json                # Dependencies and scripts
├── package-lock.json           # Lock file
├── .env.example                # Env var template
├── .env                        # (Gitignored) Runtime vars
├── .gitignore                  # Git exclusions
├── README.md                   # Project README
└── .planning/                  # GSD planning directory
    └── codebase/               # Codebase analysis (this doc)
```

## Directory Purposes

**src/components/ui/:**
- Purpose: Reusable UI primitives from shadcn/ui
- Contains: Button, Dialog, Tabs, Accordion, Select, Input, etc.
- Pattern: Radix-based, Tailwind-styled, composed with forwardRef
- Key files: `button.tsx`, `input.tsx`, `select.tsx`, `dialog.tsx`

**src/components/portal/:**
- Purpose: Client-facing portal UI (billing, wallet, chat, onboarding)
- Contains: BillingWidget, AdSpendWallet, BillingRecordsTable, ChatPopup, AgreementSigning
- Pattern: Feature-specific components with local state or hooks
- Key files: `BillingRecordModal.tsx` (26KB), `BillingRecordsTable.tsx` (16KB)

**src/components/hub/:**
- Purpose: Unified agent hub layout and wrapper components
- Contains: AgentHubLayout (sidebar, nav), maintenance/preview banners
- Pattern: Layout wrapper, sidebar navigation with collapsible sections
- Key file: `AgentHubLayout.tsx` (16KB)

**src/hooks/:**
- Purpose: Encapsulate all server state queries
- Contains: 60+ custom hooks for billing, clients, chat, campaigns, courses, etc.
- Pattern: Wraps React Query useQuery/useMutation, returns data + mutators
- Size range: 1KB (simple queries) to 38KB (useCampaignCommandCenter)

**src/contexts/:**
- Purpose: Global client-only state providers
- Contains: Auth (user + session), Notifications, Calculator, ClientPreview
- Pattern: createContext + custom hook for consuming context
- Usage: AuthProvider wraps entire app, AuthContext.useAuth() in components

**src/pages/:**
- Purpose: Route-specific pages (shown by Router)
- Organization: By route path (pages/auth/, pages/app/, pages/hub/, pages/admin/)
- Pattern: Full-screen page components, may import feature components
- Size: 10-50KB (complex pages like BillingDashboard, CommandCenter)

**supabase/functions/:**
- Purpose: Serverless backend logic (Deno runtime)
- Organization: By purpose (webhooks, jobs, integrations, auth, billing)
- Pattern: Each function is standalone Deno script, receives HTTP request
- Pattern: Most return CORS headers, all have verify_jwt: false in config.toml
- Trigger: HTTP POST from webhooks (Stripe, leads, etc.) or cron schedule

**src/config/:**
- Purpose: Runtime configuration and service initialization
- Pattern: Lazy loading (e.g., getStripePromise caches instance per account)
- Depends on: Environment variables, Supabase functions for secrets

**src/lib/:**
- Purpose: Shared utilities and helpers
- Contents: Tracking/attribution logic, PDF generation, link parsing
- Pattern: Imported as needed by components/pages
- Size: 1-27KB per utility

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React app initialization, tracking setup
- `src/App.tsx`: Root component with providers and route definitions
- `index.html`: HTML entry point (includes Vite entry script)
- `supabase/functions/[name]/index.ts`: Each edge function entry

**Configuration:**
- `.env`: Runtime environment variables (VITE_*, SUPABASE_*)
- `vite.config.ts`: Build and dev server config
- `tailwind.config.ts`: Design system tokens (colors, spacing, etc.)
- `tsconfig.json`: TypeScript compiler options
- `supabase/config.toml`: Function registration + cron schedule definitions

**Core Logic:**
- `src/contexts/AuthContext.tsx`: User session and authentication
- `src/hooks/`: All server state queries (billing, clients, chat, etc.)
- `src/integrations/supabase/client.ts`: Supabase client singleton
- `src/lib/tracking.ts`: Attribution tracking and UTM capture

**Testing:**
- No test files detected (testing not set up)
- Files follow naming conventions suitable for Jest/Vitest

## Naming Conventions

**Files:**
- Components: PascalCase.tsx (e.g., `ErrorBoundary.tsx`, `Navbar.tsx`)
- Hooks: useXxx.ts (e.g., `useBillingRecords.ts`, `useClients.ts`)
- Contexts: XxxContext.tsx (e.g., `AuthContext.tsx`, `NotificationContext.tsx`)
- Pages: PascalCase.tsx (e.g., `Index.tsx`, `BillingDashboard.tsx`)
- Utils/config: camelCase.ts (e.g., `stripe.ts`, `tracking.ts`)
- Directories: kebab-case (e.g., `admin-chat`, `auth`, `hub`)

**Functions:**
- React components: PascalCase (e.g., `export const ErrorBoundary = ()`)
- Hooks: camelCase with `use` prefix (e.g., `export function useBillingRecords()`)
- Utilities: camelCase (e.g., `initTracking()`, `getStripePromise()`)

**Variables:**
- camelCase for constants and variables
- UPPER_CASE for env vars (VITE_SUPABASE_URL)
- PascalCase for types/interfaces (e.g., `interface BillingRecord`)

**Types:**
- Interfaces: XxxContextType, XxxProps, XxxOptions
- Type exports: Exported alongside implementation (e.g., `export type BillingType`)
- Discriminated unions for status/type fields (e.g., `type BillingStatus = 'pending' | 'paid' | 'overdue'`)

## Where to Add New Code

**New Feature (e.g., "Referral Management"):**
1. Create feature-specific directory if large: `src/components/referrals/`
2. Primary code locations:
   - `src/pages/hub/Referrals.tsx` (or `src/pages/hub/admin/ReferralAdmin.tsx`)
   - `src/components/referrals/ReferralCard.tsx`, ReferralStats.tsx, etc.
   - `src/hooks/useReferrals.ts` (server state queries)
   - `src/contexts/ReferralContext.tsx` (if shared state needed)
3. Register routes in `src/App.tsx` Routes section
4. Add nav item in `src/components/hub/AgentHubLayout.tsx` if user-facing

**New Component/Module:**
- Location: `src/components/[feature]/ComponentName.tsx`
- Pattern: Functional component with TypeScript props interface
- Imports: shadcn/ui from `@/components/ui/`, hooks from `@/hooks/`
- Export: Default or named export (prefer named for easier refactoring)

**New Data Fetching Hook:**
- Location: `src/hooks/useNewFeature.ts`
- Pattern:
  ```typescript
  import { useQuery, useMutation } from '@tanstack/react-query';
  import { supabase } from '@/integrations/supabase/client';

  export function useNewFeature(params?: QueryParams) {
    const query = useQuery({
      queryKey: ['newFeature', params],
      queryFn: () => supabase.from('table').select().match(params),
    });
    const mutation = useMutation({
      mutationFn: (data) => supabase.from('table').insert(data),
      onSuccess: () => queryClient.invalidateQueries(['newFeature']),
    });
    return { ...query, createItem: mutation.mutate };
  }
  ```
- Cache key convention: Lower case, matches table name

**New Edge Function:**
- Location: `supabase/functions/function-name/index.ts`
- Pattern:
  ```typescript
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
  const corsHeaders = { 'Access-Control-Allow-Origin': '*' };
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    try {
      const payload = await req.json();
      // Process logic here
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
    }
  });
  ```
- Register in `supabase/config.toml` with `[functions.function-name]` and `verify_jwt = false`
- Deploy: `supabase functions deploy function-name`

**New Utility:**
- Location: `src/lib/newUtility.ts` (if general) or `src/lib/[feature]/index.ts`
- Pattern: Export named functions, avoid default exports
- Example: `export function formatCurrency(amount: number): string { ... }`

**New Page/Route:**
- Create page in `src/pages/[area]/PageName.tsx`
- Add route in `src/App.tsx` Routes section:
  ```typescript
  <Route path="/hub/new-page" element={
    <ProtectedRoute requiredRole="admin">
      <NewPage />
    </ProtectedRoute>
  } />
  ```
- Add nav item in `src/components/hub/AgentHubLayout.tsx` if needed

## Special Directories

**src/assets/:**
- Purpose: Images and media files
- Generated: No
- Committed: Yes
- Usage: Import in components as `import img from '@/assets/image.png'`

**supabase/migrations/:**
- Purpose: SQL schema migrations (if database changes needed)
- Generated: No (manually created)
- Committed: Yes
- Deployment: `supabase db push`

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (npm install)
- Committed: No (.gitignored)

**.lovable/:**
- Purpose: Lovable editor metadata
- Generated: Yes (auto by Lovable)
- Committed: Yes
- NOTE: Do NOT modify or delete

**.planning/codebase/:**
- Purpose: GSD analysis and planning documents
- Generated: Yes (by GSD commands)
- Committed: Yes
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

---

*Structure analysis: 2026-03-04*
