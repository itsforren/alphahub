# Architecture

**Analysis Date:** 2026-03-04

## Pattern Overview

**Overall:** React SPA with Supabase backend, edge functions, and context-based state management

**Key Characteristics:**
- Client-side routing with React Router (v6) for multi-tenant hub experience
- Lazy-loaded route components for performance optimization
- TanStack React Query for server state management and caching
- Supabase Auth with MFA support and role-based access control (RBAC)
- Deno edge functions for webhook handling, billing, and external API integrations
- Multi-context architecture for global state (Auth, Notifications, Calculator, Client Preview)

## Layers

**Presentation Layer:**
- Purpose: React UI components using shadcn/ui (Radix primitives) with Tailwind CSS
- Location: `src/components/`
- Contains: Page components (`src/pages/`), feature components (portal, admin, hub, etc.), UI primitives
- Depends on: Hooks, Contexts, Router, Icons (lucide-react)
- Used by: BrowserRouter (entry point)

**State Management Layer:**
- Purpose: Global state and server state caching
- Location: `src/contexts/`, TanStack React Query client
- Contains: AuthContext, NotificationContext, CalculatorContext, ClientPreviewContext
- Patterns: Context API for global app state, React Query for server state with automatic caching/refetching
- Depends on: Supabase client, edge functions
- Used by: All page and feature components

**Data Access Layer:**
- Purpose: Hooks and custom queries abstracting data fetching
- Location: `src/hooks/`
- Contains: 60+ custom hooks (useBillingRecords, useClients, useChat, useCampaignCommandCenter, etc.)
- Pattern: Each hook wraps one or more React Query queries/mutations
- Depends on: Supabase client, types from `src/integrations/supabase/types.ts`
- Used by: Components throughout the app

**Integration Layer:**
- Purpose: Supabase client initialization and type generation
- Location: `src/integrations/supabase/`
- Contains: `client.ts` (Supabase client initialization), `types.ts` (auto-generated from database schema)
- Pattern: Singleton Supabase client with auto-session persistence and refresh
- Depends on: Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Used by: All hooks and edge functions

**Edge Functions Layer:**
- Purpose: Backend logic running on Supabase Deno runtime
- Location: `supabase/functions/`
- Contains: 110+ functions for webhooks, integrations, billing, onboarding, sync jobs
- Patterns:
  - Webhook receivers (lead-webhook, stripe-webhook, fathom-webhook, etc.)
  - Scheduled jobs (auto-recharge-run, billing-collections-run, check-lead-router-health, etc.)
  - OAuth callbacks (crm-oauth-callback, crm-location-token)
  - One-off operations (create-user-account, sync-stripe-charges, etc.)
- Depends on: Deno standard library, @supabase/supabase-js, fetch API
- Used by: External webhooks, cron jobs via Supabase scheduler, frontend function invocation

**Configuration Layer:**
- Purpose: Static and runtime configuration
- Location: `src/config/`
- Contains: Stripe client initialization (management + ad_spend accounts), webhook config
- Pattern: Lazy initialization and caching to avoid loading unused services
- Depends on: Environment variables, Supabase functions for fetching secrets
- Used by: Components requiring Stripe or webhook functionality

**Utilities Layer:**
- Purpose: Shared helper functions
- Location: `src/lib/`
- Contains: Attribution tracking (visitor ID, UTM capture, GTM integration), PDF generation, utils
- Depends on: Supabase for tracking persistence
- Used by: Pages, components, contexts

## Data Flow

**Authentication Flow:**

1. User visits `/login`
2. LoginPage calls `AuthContext.signIn()` which invokes Supabase Auth
3. AuthContext fetches user profile from `profiles` table, detects role
4. User session persisted via Supabase auto-refresh to localStorage
5. ProtectedRoute checks AuthContext.user; redirects if not authenticated
6. Role-based access: ProtectedRoute checks requiredRole against user profile

**Hub Navigation Flow:**

1. ProtectedRoute wraps AgentHubLayout
2. AgentHubLayout renders sidebar with role-based nav sections
3. Sidebar items conditionally show based on isAdmin, isReferrer, etc.
4. Routes under `/hub` are nested within AgentHubLayout outlet
5. URL changes trigger Outlet re-render with matching page component

**Billing Data Flow:**

1. Component (e.g., BillingDashboard) mounts
2. Calls useBillingRecords() hook → React Query query
3. Hook calls supabase.from('billing_records').select()
4. Data cached by React Query, auto-refetch on stale interval
5. useMutation in hook handles create/update operations
6. Mutations trigger invalidateQueries to refresh cache
7. Stripe webhook from supabase-functions/stripe-webhook/ creates new billing_record
8. Next refetch picks up new data

**Attribution Tracking Flow:**

1. main.tsx calls initTracking() on app load
2. tracking.ts generates/retrieves visitor_id from localStorage
3. setupAutoTracking() captures UTM params from URL
4. On page view: dispatch event to GTM dataLayer + Supabase tracking table
5. First-touch (channel, source, campaign) stored once
6. Last-touch updated on each page
7. Referral code stored separately (aa_ref cookie fallback)

**State Management:**

- **AuthContext**: User session, profile, role, MFA status — refresh on app startup
- **NotificationContext**: Live notifications with seeded random for consistency
- **CalculatorContext**: ROI calculator state (budget, leads, ROI) — form state
- **ClientPreviewContext**: Preview banner state for admins viewing clients

## Key Abstractions

**ProtectedRoute (Abstraction):**
- Purpose: Guard routes requiring authentication/authorization
- File: `src/components/app/ProtectedRoute.tsx`
- Pattern: Wrapper component checking AuthContext.user and requiredRole
- Usage: Wraps hub routes, admin routes, protected pages
- Fallback: Redirects to /login if user not authenticated

**Custom Hooks Pattern (Abstraction):**
- Purpose: Encapsulate server state queries with React Query
- Examples: `useBillingRecords`, `useClients`, `useChat`, `useCampaignCommandCenter`
- Pattern:
  ```typescript
  export function useBillingRecords(clientId?: string) {
    const { data, isLoading, error } = useQuery({
      queryKey: ['billing_records', clientId],
      queryFn: () => fetchFromSupabase(...)
    });
    const createMutation = useMutation({...});
    return { data, isLoading, error, createBillingRecord: createMutation.mutate, ... }
  }
  ```
- Benefit: Decouples components from query details, enables caching

**Context Provider Chain (Abstraction):**
- File: `src/App.tsx`
- Pattern: Nested providers wrap routes
- Order (innermost to outermost):
  1. QueryClientProvider (React Query)
  2. TooltipProvider (shadcn/ui)
  3. CalculatorProvider
  4. NotificationProvider
  5. AuthProvider
  6. BrowserNotificationProvider
  7. BrowserRouter (React Router)
  8. HelmetProvider (Meta tags)

**Edge Function Pattern (Abstraction):**
- Purpose: Serverless handlers for webhooks and integrations
- Pattern:
  ```typescript
  const corsHeaders = { 'Access-Control-Allow-Origin': '*' };
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    try {
      const payload = await req.json();
      // Process payload
      // Write to database via supabase
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error) {
      return errorResponse(error);
    }
  });
  ```

## Entry Points

**Client Entry Point:**
- Location: `src/main.tsx`
- Triggers: App load in `index.html`
- Responsibilities:
  1. Initialize tracking (visitor ID, UTM capture, auto-tracking)
  2. Mount React app to DOM root element
  3. Setup HelmetProvider for meta tags

**App Root Component:**
- Location: `src/App.tsx`
- Triggers: main.tsx render
- Responsibilities:
  1. Wrap all providers (React Query, Auth, Router, Contexts)
  2. Setup BrowserRouter with route definitions
  3. Configure lazy-loaded routes with Suspense
  4. Redirect old routes (legacy /app → /hub, /portal → /hub)
  5. Render error boundary and global toasts (Toaster, Sonner)

**Hub Layout:**
- Location: `src/components/hub/AgentHubLayout.tsx`
- Triggers: ProtectedRoute wrapping `/hub` routes
- Responsibilities:
  1. Render collapsible sidebar with role-based nav
  2. Render main content area via Outlet
  3. Render maintenance/preview banners
  4. Handle sidebar collapse/expand state

**Webhook Entry Points:**
- stripe-webhook: Payment events → create billing_record
- lead-webhook: Inbound lead → create lead, assign to campaign
- agent-onboarding-webhook: Agent signup → create user account, provision GHL
- fathom-webhook: Call tracking → update call_tracking table
- location: `supabase/functions/[function-name]/index.ts`

## Error Handling

**Strategy:** Multi-layer error catching with fallbacks

**Patterns:**

1. **ErrorBoundary (React):**
   - Location: `src/components/ErrorBoundary.tsx`
   - Catches render errors in subtree
   - Shows error stack in dev, graceful message in prod
   - Allows user to retry
   - Used at root and key sections

2. **React Query Error States:**
   - Components access `error` from hooks
   - Show error toast via `toast.error(error.message)`
   - Retry button available via `refetch()` from hook
   - Example: `useBillingRecords` returns `{ error, refetch }`

3. **Try-Catch in Async Functions:**
   - Edge functions wrap all logic in try-catch
   - Return 400+ status with error message
   - Frontend mutations catch and display to user
   - Example: Stripe webhook catches missing customer email

4. **Network Error Handling:**
   - Supabase client auto-retries with exponential backoff
   - Edge functions validate CORS before processing
   - Frontend displays connection error toast if offline

5. **Validation Errors:**
   - Form components use react-hook-form + Zod
   - Invalid fields show inline error messages
   - Edge functions validate payload shape and return 400 if invalid

## Cross-Cutting Concerns

**Logging:**
- Approach: console.log/error in edge functions for server logs
- Frontend: No centralized logger (uses Sonner toast for user errors)
- Browser console for debugging via dev tools

**Validation:**
- Frontend: Zod schemas in form components (e.g., LoginForm)
- Backend: Edge functions validate payload shape before processing
- Database: Supabase RLS policies enforce access control

**Authentication:**
- Supabase Auth with email/password + optional MFA
- JWT token stored in browser localStorage (auto-managed by Supabase client)
- AuthContext exposes signIn, signUp, signOut, MFA enrollment/verification
- Role detection via profiles table (admin, member, client, referrer, guest)

**Rate Limiting:**
- No explicit client-side rate limiting (delegated to Supabase API)
- Edge functions may implement rate limiting for webhooks (not detected in code)
- Stripe API calls rate limited by Stripe

**Caching:**
- React Query caches server state with configurable TTL (staleTime)
- Stripe client loaded once and cached per account type
- Edge function data (e.g., tracking events) written directly to DB (no caching)

---

*Architecture analysis: 2026-03-04*
