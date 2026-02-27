# Architecture: AlphaHub Lovable-to-Self-Managed Migration

**Domain:** Lovable Cloud SaaS platform migration to self-managed Supabase
**Researched:** 2026-02-26
**Overall confidence:** HIGH (based on direct codebase inspection + official Supabase documentation)

## Current System Architecture

### Component Map

```
                    USERS (Clients, Admin, Referrers)
                              |
                    conscious.sysconscious.com
                              |
                   +----------+-----------+
                   |                      |
            PUBLIC PAGES            AUTHENTICATED APP
           (marketing, blog,       (hub/, portal/, admin/)
            apply, pricing)              |
                   |                     |
                   +----------+----------+
                              |
                     REACT SPA (Vite)
                   Lovable-hosted CDN
                              |
              +---------------+---------------+
              |               |               |
        Supabase Client   Edge Functions   Storage
        (supabase-js)     (90+ Deno)      (media bucket)
              |               |               |
              +-------+-------+               |
                      |                       |
              SUPABASE PROJECT                |
           qydkrpirrfelgtcqasdx               |
              |       |       |               |
           Auth    Postgres  Realtime    S3 Storage
           (email+  (111      (chat,     (headshots,
            MFA)   tables)   tickets,    agreements,
                             leads,      courses)
                             billing)
                      |
        +-------------+-------------+
        |             |             |
   Stripe (2x)   Google Ads    GoHighLevel
   mgmt + ad     MCC API      CRM/OAuth
   spend accts                      |
        |             |        +----+----+
        |             |        |         |
   Webhooks-->   Sync Jobs   Twilio   Plaid
   Edge Fns      (cron)      Phone    Banking
                             Provisn
```

### Component Inventory

| Component | Technology | Scale | Migration Complexity |
|-----------|-----------|-------|---------------------|
| Frontend SPA | React 18 + Vite + TypeScript + Tailwind + shadcn/ui | ~100+ pages/components | LOW -- re-point env vars |
| Database | PostgreSQL via Supabase | 111 tables, 131 migrations, 87 functions/triggers, 14+ RPC functions | MEDIUM -- pg_dump/restore |
| Auth | Supabase Auth (email/password + MFA/TOTP) | ~15+ users | MEDIUM -- JWT secret handling |
| Edge Functions | Deno runtime, Supabase-hosted | 90+ functions, 29K lines total | HIGH -- bulk deploy + secrets |
| Storage | Supabase Storage (S3-backed) | 1 bucket: "media" | LOW -- single bucket migration |
| Realtime | Supabase Realtime (Postgres Changes) | ~9 active subscriptions | LOW -- works automatically with new project |
| MCP Proxy | Edge Function (mcp-proxy, 542 lines) | 52 tools | LOW -- re-deploys with edge functions |
| Local MCP Server | Node.js (alphahub-mcp) | 16 registered tools | LOW -- update env vars |
| Stripe Integration | 2 Stripe accounts, 5 billing edge functions, webhooks | Live billing, 70+ subscriptions | HIGH -- webhook endpoint updates |
| Google Ads | MCC API integration via edge functions | Multiple client campaigns | MEDIUM -- no endpoint changes needed |
| GoHighLevel | OAuth + API via edge functions | CRM integration | MEDIUM -- update redirect URIs |
| Plaid | Banking API via edge functions | Connected bank accounts | LOW -- server-side only |
| Slack | Webhook notifications | 2 webhook URLs | LOW -- Slack-side config unchanged |
| Resend | Email delivery | Auth emails | LOW -- API key transfer |
| Twilio | Phone provisioning | Sub-account creation | LOW -- API key transfer |
| Webflow | CMS integration | Agent profiles | LOW -- API key transfer |
| Fathom | Call analytics | Call recording integration | LOW -- API key transfer |

### Frontend Architecture

The frontend is a standard Vite + React 18 SPA with these key characteristics:

**Framework:** React 18 with TypeScript, SWC compiler, Tailwind CSS 3, shadcn/ui components
**State Management:** React Query (TanStack) for server state, React Context for auth/notifications
**Routing:** React Router v6 with lazy-loaded routes
**Lovable-Specific:** Uses `lovable-tagger` dev dependency (can be removed) and `componentTagger()` Vite plugin (only in dev mode)

**Environment Variables (Frontend):**
```
VITE_SUPABASE_URL              -- Supabase project URL
VITE_SUPABASE_PUBLISHABLE_KEY  -- Supabase anon key
VITE_SUPABASE_ANON_KEY         -- Used in some hooks (same as publishable key)
VITE_STRIPE_MANAGEMENT_PUBLISHABLE_KEY  -- Stripe public key (management)
VITE_STRIPE_AD_SPEND_PUBLISHABLE_KEY    -- Stripe public key (ad spend)
```

**Supabase Client Setup** (`src/integrations/supabase/client.ts`):
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true }
});
```

This is the single point where the frontend connects to Supabase. Changing the env vars changes the entire backend connection.

**Auth Model:**
- Email/password sign-in only (no OAuth providers like Google)
- MFA via TOTP (authenticator app)
- Role-based access: admin, member, client, referrer, guest
- Role determined by `get_user_role` RPC function
- Client auto-linking via `link_client_to_user` RPC function

**Realtime Subscriptions (9 active):**
- Chat messages (useChat.ts -- 2 channels)
- Admin chat (useAdminChat.ts -- 2 channels)
- Notifications (NotificationContext.tsx)
- Onboarding automation status (useOnboardingAutomation.ts)
- Lead pipeline health (LeadPipelineHealthWidget.tsx -- 2 channels)
- Ticket dashboard (useTicketDashboard.ts)

### Edge Functions Architecture

**Total: 90+ functions, ~29,000 lines of TypeScript (Deno runtime)**

The edge functions fall into distinct categories by trigger type:

**Webhook Receivers (external services call these):**
| Function | Caller | Lines | Critical? |
|----------|--------|-------|-----------|
| stripe-webhook (billing) | Stripe (both accounts) | ~489 | YES -- live billing |
| dispute-webhook | Stripe (disputes) | ~100 | YES |
| lead-webhook | External lead sources | ~471 | YES |
| lead-status-webhook | GHL/CRM | ~457 | YES |
| agent-onboarding-webhook | GHL | ~1004 | YES |
| agent-update-webhook | GHL | ~396 | MEDIUM |
| submit-webhook | Public form | ~100 | MEDIUM |
| fathom-webhook | Fathom | ~100 | LOW |
| prospect-booking-webhook | Booking system | ~578 | MEDIUM |
| google-ads-enhanced-conversion | Frontend/tracking | ~200 | MEDIUM |
| ghl-stage-sync | GHL | ~100 | MEDIUM |

**Scheduled/Cron Functions:**
| Function | Schedule | Purpose |
|----------|----------|---------|
| prospect-inactivity-check | Every minute | Check prospect engagement |
| auto-recharge-run | Daily 6 AM UTC (config unclear) | Wallet auto-recharge |
| morning-review-job | Daily (config unclear) | Slack campaign review |
| billing-collections-run | Periodic | Overdue invoice escalation |
| aggregate-client-kpis | Periodic | KPI rollup |

**MCP Proxy (the God Mode endpoint):**
- `mcp-proxy/index.ts` -- 542 lines, 52 tools
- Accessed via HTTP POST with `x-mcp-secret` header
- Contains ALL query logic for the business intelligence layer
- Used by both Claude Code (via local MCP server) and OpenClaw/MoltBot

**API Functions (frontend calls these):**
- create-setup-intent, save-payment-method (Stripe card capture)
- create-stripe-invoice (billing)
- create-user-account, admin-delete-user, admin-reset-user, admin-set-password
- send-auth-email, send-password-reset
- run-full-onboarding (2,037 lines -- largest function)
- verify-onboarding, verify-onboarding-live
- All GHL functions (create-subaccount, create-user, inject-twilio, provision-phone, etc.)
- All Plaid functions (create-link-token, exchange-token, sync-transactions, get-balances)
- sync-google-ads, sync-all-google-ads, sync-google-ads-targeting
- update-google-ads-budget, update-google-ads-targeting

**Environment Secrets Required (Edge Functions):**
| Secret | Used By | Category |
|--------|---------|----------|
| SUPABASE_URL | All functions | Auto-set |
| SUPABASE_SERVICE_ROLE_KEY | All functions | Auto-set |
| SUPABASE_ANON_KEY | Some functions | Auto-set |
| STRIPE_MANAGEMENT_SECRET_KEY | Stripe functions | Billing |
| STRIPE_AD_SPEND_SECRET_KEY | Stripe functions | Billing |
| STRIPE_MANAGEMENT_WEBHOOK_SECRET | stripe-webhook | Billing |
| STRIPE_AD_SPEND_WEBHOOK_SECRET | stripe-webhook | Billing |
| MCP_PROXY_SECRET | mcp-proxy | MCP |
| GOOGLE_ADS_CLIENT_ID | Google Ads functions | Ads |
| GOOGLE_ADS_CLIENT_SECRET | Google Ads functions | Ads |
| GOOGLE_ADS_DEVELOPER_TOKEN | Google Ads functions | Ads |
| GOOGLE_ADS_MCC_CUSTOMER_ID | Google Ads functions | Ads |
| GOOGLE_ADS_REFRESH_TOKEN | Google Ads functions | Ads |
| GHL_AGENCY_API_KEY | GHL functions | CRM |
| GHL_CLIENT_ID | GHL OAuth | CRM |
| GHL_CLIENT_SECRET | GHL OAuth | CRM |
| GHL_COMPANY_ID | GHL functions | CRM |
| GHL_PROSPECT_WEBHOOK_URL | GHL functions | CRM |
| GHL_STAGE_WEBHOOK_URL | GHL functions | CRM |
| GHL_INSTALL_URL | GHL OAuth | CRM |
| GHL_REDIRECT_URI | GHL OAuth | CRM |
| GHL_SAAS_PLAN_ID | GHL functions | CRM |
| MASTER_TWILIO_ACCOUNT_SID | Twilio functions | Phone |
| MASTER_TWILIO_AUTH_TOKEN | Twilio functions | Phone |
| TWILIO_ACCOUNT_SID | Twilio functions | Phone |
| TWILIO_AUTH_TOKEN | Twilio functions | Phone |
| TWILIO_PHONE_NUMBER | Twilio functions | Phone |
| PLAID_CLIENT_ID | Plaid functions | Banking |
| PLAID_SECRET | Plaid functions | Banking |
| PLAID_ENV | Plaid functions | Banking |
| SLACK_ADS_MANAGER_WEBHOOK_URL | Slack notifications | Notifications |
| SLACK_ADS_MANAGER_SIGNING_SECRET | Slack actions | Notifications |
| SLACK_CHAT_WEBHOOK_URL | Chat notifications | Notifications |
| RESEND_API_KEY | Email sending | Email |
| WEBFLOW_API_TOKEN | CMS sync | CMS |
| WEBFLOW_SITE_ID | CMS sync | CMS |
| FATHOM_API_KEY | Call analytics | Analytics |
| CONVERSION_API_KEY | Enhanced conversions | Tracking |
| ENCRYPTION_KEY | Data encryption | Security |
| ONBOARDING_BRIDGE_KEY | Onboarding auth | Security |
| LOVABLE_API_KEY | Agent bio generation | AI |
| PUBLIC_APP_URL | Slack link generation | Config |

**Total: ~40 unique secrets** that must be transferred to the new Supabase project.

### Database Architecture

**Scale:** 111 tables, 131 migration files, 87 function/trigger definitions, 14+ RPC functions, 5,672-line TypeScript types file

**Key Table Groups (inferred from types, hooks, and edge functions):**
- **clients** -- core client records
- **profiles** -- user profiles
- **user_roles** -- RBAC
- **client_wallets** + **wallet_transactions** -- ad spend wallet system
- **billing_records** -- invoicing
- **billing_collections** -- payment escalation
- **client_payment_methods** -- Stripe card storage
- **client_stripe_customers** -- Stripe customer mapping
- **ad_spend_daily** -- Google Ads spend tracking
- **campaigns** -- campaign data
- **leads** -- lead pipeline
- **chat_conversations** + **chat_messages** -- messaging
- **support_tickets** -- support system
- **onboarding_checklists** + **onboarding_items** -- onboarding
- **agreements** -- client agreements/contracts
- **referral_commissions** -- referral tracking
- **system_alerts** -- operational alerts
- **courses** + **lessons** -- education content
- **prospects** -- sales pipeline
- **bank_accounts** + **bank_transactions** -- Plaid banking

**RPC Functions Used by Frontend:**
- `get_user_role` -- returns prioritized role for a user
- `link_client_to_user` -- auto-links client record to auth user
- `mark_messages_read` -- bulk mark chat messages as read
- `initialize_onboarding_checklist` -- sets up client onboarding

### Data Flow Diagrams

**Client Billing Flow:**
```
Client Card Save                   Daily Cron
       |                               |
  create-setup-intent            auto-recharge-run
       |                               |
  save-payment-method          Check wallet balance
       |                          < threshold?
  Stripe SetupIntent                   |
       |                    create-stripe-invoice
       |                               |
       +----->  Stripe API  <----------+
                    |
              Charge/Invoice
                    |
              Webhook fires
                    |
           stripe-billing-webhook
                    |
         +-------- | --------+
         |                   |
   Mark billing        Create wallet
   record paid         deposit (if ad spend)
         |                   |
   Generate next        Update balance
   month's record            |
         |              Low balance?
   Process referral          |
   commission          check-low-balance
                             |
                        Safe Mode?
                        Slack Alert
```

**Lead Pipeline Flow:**
```
External Lead Source (Google Ads, Meta, etc.)
         |
    lead-webhook
         |
    Save to DB  -->  inject-lead-to-ghl
         |                    |
    Route to client      GHL CRM entry
         |                    |
    Notify admin         Sync status back
    (Slack, in-app)           |
         |              lead-status-webhook
    Track outcomes            |
         |              Update lead status
    outcome-tracker-job       |
                        sync-disposition-to-ghl
```

**Onboarding Flow:**
```
New Client Created
       |
  run-full-onboarding (2,037 lines)
       |
  +----+----+----+----+----+----+
  |    |    |    |    |    |    |
 GHL  GHL  GHL  Twilio  Web   Google
 Sub  User  Cal  Phone  flow  Ads
 Acct Creat Sync Prov   CMS   Campaign
       |
  verify-onboarding / verify-onboarding-live
       |
  initialize_onboarding_checklist (RPC)
       |
  Client sees checklist in portal
```

## Migration Architecture

### Recommended Approach: CLI-Based Backup/Restore to New supabase.com Project

Use `supabase db dump` + `psql` restore to a new Supabase project on supabase.com (managed, not self-hosted). This is the approach recommended by official Supabase documentation for project-to-project migration.

**Why not self-hosted Supabase:** Self-hosting adds Docker/infrastructure ops burden. The goal is to own the project, not the infrastructure. Managed Supabase gives the same API surface with zero DevOps.

**Why not Lovable Cloud Migrator tool:** While automated tools exist (Chrome extension, third-party services), the migration is complex enough with dual Stripe accounts and 90+ edge functions that a controlled manual migration is safer for a production billing system.

### Component Boundaries for Migration

```
LAYER 1: DATABASE (must migrate first -- everything depends on it)
  - Schema (tables, RLS, functions, triggers, extensions)
  - Data (all rows, preserving PKs and FKs)
  - Auth users (preserving hashed passwords)

LAYER 2: EDGE FUNCTIONS (must deploy before frontend can work)
  - All 90+ functions
  - All 40+ secrets
  - config.toml (JWT verification, cron schedules)

LAYER 3: STORAGE (can be parallel with edge functions)
  - "media" bucket recreation
  - Storage object migration (headshots, agreements, course media)

LAYER 4: EXTERNAL SERVICE RE-POINTING (after edge functions are live)
  - Stripe webhook endpoints (CRITICAL -- affects live billing)
  - GHL OAuth redirect URIs
  - Any external services calling old Supabase URLs

LAYER 5: FRONTEND (last -- depends on all above being ready)
  - Update env vars to point to new Supabase project
  - Remove lovable-tagger dependency
  - Deploy to new hosting (Vercel, Cloudflare Pages, or VPS)
  - DNS cutover

LAYER 6: MCP + ANCILLARY (after cutover)
  - Update alphahub-mcp env vars
  - Update ~/.claude.json config
  - Update OpenClaw/MoltBot HTTP endpoint
```

### Migration Order (Dependency-Based)

```
Phase 1: Provision + Schema
  [Create new Supabase project]
       |
  [Dump schema from old project]
       |
  [Dump data from old project]
       |
  [Restore schema to new project]
       |
  [Restore data to new project]
       |
  [Verify table counts, RLS policies, functions]

Phase 2: Auth + Secrets
  [Copy JWT secret from old project to new project (optional)]
       |
  [Verify auth users migrated with passwords]
       |
  [Set all 40+ secrets via supabase CLI or dashboard]
       |
  [Configure auth providers (email settings, redirect URLs)]

Phase 3: Edge Functions
  [Link local project to new Supabase project]
       |
  [Deploy all 90+ edge functions]
       |
  [Verify config.toml settings (JWT, cron schedules)]
       |
  [Test critical functions: mcp-proxy, stripe-webhook, lead-webhook]

Phase 4: Storage
  [Create "media" bucket in new project]
       |
  [Download all objects from old project's S3]
       |
  [Upload all objects to new project's S3]
       |
  [Verify public URLs work]

Phase 5: Validation (pre-cutover)
  [Test auth flow (login, MFA)]
       |
  [Test MCP proxy (all 52 tools)]
       |
  [Test frontend against new backend (staging)]
       |
  [Verify Realtime subscriptions work]
       |
  [Verify storage URLs render]
       |
  [Dry-run Stripe webhook with test events]

Phase 6: Cutover (the big switch)
  [Announce maintenance window]
       |
  [Freeze old database (read-only or stop writes)]
       |
  [Final data sync (delta since Phase 1)]
       |
  [Update Stripe webhook endpoints (both accounts)]
       |
  [Update GHL OAuth redirect URIs]
       |
  [Deploy frontend with new env vars]
       |
  [DNS cutover: conscious.sysconscious.com -> new hosting]
       |
  [Update alphahub-mcp + OpenClaw endpoints]
       |
  [Verify everything works]
       |
  [Unfreeze / go live]
```

### Cutover Strategy: Brief Downtime Window

**Recommended: Scheduled maintenance window (30-60 minutes)**

The system has live billing but brief downtime is acceptable per PROJECT.md. The key risk is NOT downtime itself but data inconsistency -- if someone makes a payment during the migration gap, it could be lost.

**Cutover Sequence (detailed):**

1. **T-24h:** Announce maintenance to clients via chat/email
2. **T-0:** Begin maintenance window
3. **T+2min:** Put old Lovable app in maintenance mode (or add maintenance banner)
4. **T+5min:** Final pg_dump of delta data from old project
5. **T+10min:** Restore delta data to new project (with `session_replication_role = replica`)
6. **T+15min:** Update Stripe webhook endpoints in BOTH Stripe dashboards
   - Management account: point all webhooks to new `https://[NEW_PROJECT_REF].supabase.co/functions/v1/stripe-billing-webhook`
   - Ad spend account: same
   - Dispute webhook: same
7. **T+18min:** Update GHL OAuth redirect URIs if needed
8. **T+20min:** Deploy frontend to new hosting with new env vars
9. **T+25min:** DNS cutover for conscious.sysconscious.com
10. **T+30min:** Smoke test all critical flows
11. **T+35min:** Update MCP endpoints
12. **T+40min:** End maintenance window, announce completion

**Zero-Data-Loss Guarantee:**
- The key to zero data loss is the "freeze + delta sync" approach
- Between the initial dump (Phase 1) and cutover (Phase 6), new data will accumulate in the old database
- The delta sync at T+5min captures everything added/changed since Phase 1
- Stripe webhooks should be updated BEFORE going live to prevent missed payment events
- Consider: temporarily pause `auto-recharge-run` cron during the window

### DNS/Domain Transition Plan

**Current:** `conscious.sysconscious.com` points to Lovable's hosting

**Target:** `conscious.sysconscious.com` points to new hosting (Vercel, Cloudflare Pages, or VPS)

**Options for frontend hosting:**

| Host | Pros | Cons | Recommendation |
|------|------|------|----------------|
| Vercel | Zero-config Vite deploy, global CDN, free tier | Another vendor dependency | RECOMMENDED for simplicity |
| Cloudflare Pages | Fast, free, great DX | Slightly more config | Good alternative |
| VPS (existing at 72.61.6.102) | Full control, no new vendor | More ops, no CDN by default | Only if avoiding vendors |

**DNS Transition Steps:**
1. Deploy frontend to new host (get preview URL)
2. Verify everything works on preview URL
3. Update DNS: `conscious.sysconscious.com` CNAME -> new host
4. Wait for DNS propagation (5-30 min with low TTL)
5. Verify SSL certificate issued
6. Old Lovable deployment becomes unreachable (expected)

**Important:** Set DNS TTL to 60 seconds a few days before cutover to minimize propagation delay.

### Risk Matrix

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Missed Stripe webhook during cutover | HIGH -- lost payment | MEDIUM | Freeze + fast cutover; verify webhook delivery in Stripe dashboard post-cutover |
| Auth users can't log in post-migration | HIGH -- total outage | LOW | Copy JWT secret OR accept one-time re-authentication |
| Edge function secrets misconfigured | HIGH -- broken features | MEDIUM | Systematic checklist; test each function category before cutover |
| Storage objects not migrated | MEDIUM -- missing images | LOW | Verify object counts match pre/post |
| RLS policies not migrated correctly | HIGH -- data exposure OR broken queries | LOW | pg_dump includes RLS; verify with test queries |
| Cron functions don't trigger | MEDIUM -- wallet auto-recharge stops | MEDIUM | Verify cron config in config.toml; manually trigger to test |
| Delta data sync misses records | HIGH -- data loss | LOW | Compare row counts before/after; check for timestamp gaps |
| DNS propagation delay | MEDIUM -- some users see old site | LOW | Low TTL pre-cutover; both old and new should work briefly |
| Lovable-specific code breaks | LOW | LOW | Only `lovable-tagger` (dev only) and `componentTagger()` (dev only); remove both |

### What Stays the Same (No Migration Needed)

These external services are called BY the edge functions using API keys. They don't need to know about the migration -- just the secrets need to be transferred:

- Stripe API (both accounts) -- customer IDs, subscriptions, payment methods all live in Stripe
- Google Ads MCC -- campaigns live in Google
- Plaid -- bank connections live in Plaid
- Twilio -- phone numbers live in Twilio
- Slack -- webhooks are outbound only
- Resend -- email delivery is outbound only
- Webflow -- CMS is outbound only
- Fathom -- call data lives in Fathom

### What MUST Be Updated (Inbound Endpoints)

These services call INTO AlphaHub and must be told the new URL:

| Service | What to Update | Where |
|---------|---------------|-------|
| Stripe (management) | Webhook endpoint URL | Stripe Dashboard > Developers > Webhooks |
| Stripe (ad spend) | Webhook endpoint URL | Stripe Dashboard > Developers > Webhooks |
| GHL | OAuth redirect URI, webhook URLs | GHL Developer Portal + GHL_REDIRECT_URI secret |
| External lead sources | lead-webhook URL | Whatever system sends leads |
| Fathom | fathom-webhook URL | Fathom settings |
| MCP consumers | mcp-proxy URL | alphahub-mcp env, OpenClaw/MoltBot config |
| Tracking script | tracking-script function URL | Any pages with the tracking script embedded |
| `PUBLIC_APP_URL` secret | Links in Slack messages | Update secret value in new project |

## Post-Migration Architecture (Target State)

```
                    USERS
                      |
           conscious.sysconscious.com
                      |
              Vercel / CF Pages
                      |
                 REACT SPA
              (self-deployed)
                      |
          +-----------+-----------+
          |           |           |
    Supabase Client  Edge Fns   Storage
    (supabase-js)    (90+)     (media)
          |           |           |
          +-----+-----+          |
                |                 |
          NEW SUPABASE PROJECT    |
          (self-owned, managed)   |
          |       |       |       |
       Auth    Postgres  Realtime   S3
                  |
    +-------------+-------------+
    |             |             |
  Stripe      Google Ads    GoHighLevel
  (unchanged)  (unchanged)   (updated URIs)
```

The target state is architecturally identical to the current state. The only difference is ownership -- the Supabase project and frontend hosting are under direct control rather than Lovable's management.

## Sources

- Direct codebase inspection: `/Users/forren/workspace/connect-proxis-alphahub/alpha-agent-flow/` (HIGH confidence)
- System status document: `/Users/forren/workspace/alpha-hub-stripe-billing-status.txt` (HIGH confidence)
- [Supabase Migration Guide](https://supabase.com/docs/guides/platform/migrating-within-supabase) (HIGH confidence)
- [Supabase CLI Backup/Restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) (HIGH confidence)
- [Supabase Auth User Migration](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects) (HIGH confidence)
- [Supabase Edge Function Deployment](https://supabase.com/docs/guides/functions/deploy) (HIGH confidence)
- [Lovable Self-Hosting Docs](https://docs.lovable.dev/tips-tricks/self-hosting) (MEDIUM confidence)
- [Lovable Cloud to Supabase Migration Tools](https://nextlovable.com/lovable-cloud-migrator) (LOW confidence -- third party)
