# Alpha Hub — Master System Document

> The authoritative reference for the entire Alpha Hub platform. Read this first, then drill into domain-specific docs as needed.

## What Is Alpha Hub?

Alpha Hub (alphaagent.io) is a production SaaS platform for managing insurance agent clients. It handles:
- **Client onboarding** — 18-step automated pipeline (GHL CRM + Twilio + Webflow + Google Ads)
- **Billing & payments** — Dual Stripe accounts (management fees + ad spend wallets)
- **Campaign management** — Google Ads budget control, health scoring, AI-driven proposals
- **Lead pipeline** — Facebook/Google ads → AI voice qualification → CRM → appointment booking
- **Support** — Real-time chat, support tickets with SLA tracking
- **Analytics** — 8 TV dashboard screens, command center, leaderboards
- **iOS app** — Native SwiftUI client app with biometric auth
- **Referral program** — Client and partner referral tracking with commission payouts
- **Agreement signing** — Full e-signature flow with audit trail and OTP verification
- **Courses** — Educational content platform with enrollment and progress tracking

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    LEAD SOURCES                          │
│   Facebook Ads  ·  Google Ads  ·  Instantly Cold Email   │
└──────────┬──────────┬──────────┬────────────────────────┘
           │          │          │
┌──────────▼──────────▼──────────▼────────────────────────┐
│              GoHighLevel CRM                             │
│  Alpha: wDoj91sbkfxZnMbow2G5                             │
│  Tierre: cG5nCjfCmB7uGHINTm6L                           │
│  53 custom fields · 40 tags · 10 workflows               │
└──────────┬───────────────────┬──────────────────────────┘
           │                   │
  GHL Workflows          Webhooks to n8n
           │                   │
┌──────────▼───────────────────▼──────────────────────────┐
│         n8n (cortex.sysconscious.com)                    │
│   ElevenLabs AI voice calls · 16 webhook endpoints       │
│   Multi-tenant config router · Docker on VPS              │
└──────┬──────────┬──────────┬────────────────────────────┘
       │          │          │
  ElevenLabs   Calendars    Slack
  AI Voice     Booking      Notifications
       │          │          │
┌──────▼──────────▼──────────▼────────────────────────────┐
│         Alpha Hub (alphaagent.io)                         │
│   Frontend: Vite + React 18 + TypeScript + Tailwind       │
│   Backend: Supabase (PostgreSQL + 111 Edge Functions)     │
│   Billing: 2 Stripe accounts (management + ad_spend)      │
│   Hosting: Vercel (manual deploy trigger)                 │
│   iOS: Native SwiftUI app                                 │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui (53 components) |
| State | TanStack React Query (server state) + React Context (auth/calc/notifications) |
| Backend | Supabase PostgreSQL + Deno Edge Functions |
| Auth | Supabase Auth (email/password + TOTP MFA) |
| Payments | 2 Stripe accounts via raw fetch() (no SDK) |
| CRM | GoHighLevel (LeadConnector) V2 API |
| Voice | ElevenLabs AI agents via n8n |
| Phone | Twilio (master account, provisioned per client) |
| Ads | Google Ads API v22 |
| Email | Resend (billing collections) |
| Pages | Webflow CMS API (landing/scheduler/profile pages) |
| iOS | SwiftUI + Supabase Swift SDK |
| Hosting | Vercel (frontend) + Supabase (backend) + VPS (n8n) |
| Automation | n8n on Docker (72.61.6.102) |

## Deployment

| Component | How to Deploy |
|-----------|--------------|
| Frontend | Push to `main` on `itsforren/alphahub` → manually trigger Vercel API |
| Edge Functions | `npx supabase functions deploy <name> --project-ref qcunascacayiiuufjtaq` |
| DB Migrations | Supabase Management API or migrations folder |
| n8n Workflows | Import via n8n UI at cortex.sysconscious.com |
| iOS App | Xcode build + TestFlight / App Store |

## Multi-Tenant Setup

Two tenants share infrastructure via config router:

| Property | Alpha Agent | Tierre Browne |
|----------|------------|---------------|
| Business | Lead gen for insurance agents | Recruiting agents to join team |
| GHL Location | `wDoj91sbkfxZnMbow2G5` | `cG5nCjfCmB7uGHINTm6L` |
| Min Budget | $1,500/mo | $2,500/mo |
| Tag Prefix | `aa-` | `tb-` |

## Core Data Model

### Primary Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `clients` | Client records (100+ fields) | id, agent_id, name, email, status, onboarding_status, subaccount_id, google_campaign_id |
| `campaigns` | Google Ads campaigns (1:many per client) | client_id, google_customer_id, google_campaign_id, current_daily_budget, safe_mode, health_score, status |
| `ad_spend_daily` | Daily ad metrics from Google Ads | client_id, campaign_id, spend_date, cost, impressions, clicks, conversions |
| `client_wallets` | Ad spend wallet per client | client_id, tracking_start_date, low_balance_threshold, auto_charge_amount, auto_billing_enabled |
| `wallet_transactions` | Deposits and adjustments | wallet_id, client_id, transaction_type, amount |
| `billing_records` | All billing (management + ad spend) | client_id, billing_type, amount, status, stripe_invoice_id, stripe_account |
| `client_stripe_customers` | Stripe customer mapping | client_id, stripe_account, stripe_customer_id |
| `client_stripe_subscriptions` | Active subscriptions | client_id, stripe_subscription_id, stripe_account, amount, status |
| `proposals` | AI budget change recommendations | campaign_id, proposed_action_type, proposed_daily_budget, status, reason_codes |
| `decision_events` | Historical AI decisions (training data) | campaign_id, decision_type, was_approved, features_at_decision |
| `campaign_audit_log` | All campaign changes | campaign_id, action, actor, old_value, new_value |
| `campaign_budget_changes` | Budget change history | campaign_id, old_budget, new_budget, change_source, triggered_by |
| `rolling_snapshots` | 7-day rolling metrics | campaign_id, snapshot_date, last_7d_spend, delta_spend_pct |
| `campaign_settings` | Health thresholds + auto-approve rules | campaign_id (null=global), ctr_red_threshold, max_budget_change_pct |
| `onboarding_automation_runs` | 18-step automation state | client_id, status, current_step, steps_completed, step_data |
| `ghl_oauth_tokens` | Encrypted GHL OAuth tokens | company_id, access_token (AES-GCM encrypted), expires_at |
| `conversations` | Chat conversations | participants, type (client/team) |
| `messages` | Chat messages | conversation_id, sender_id, content, attachments |
| `tickets` | Support tickets | client_id, title, status, priority, category, sla_deadline |
| `profiles` | User profiles | id (FK auth.users), role, first_name, last_name, avatar_url |

### Computed Values (NOT stored)

| Value | Formula |
|-------|---------|
| Wallet Balance | `SUM(wallet_transactions.amount WHERE type='deposit') - SUM(ad_spend_daily.cost WHERE spend_date >= tracking_start_date) * (1 + performance_percentage/100)` |
| CPL | `mtd_ad_spend / mtd_leads` |
| Pace Drift | `actual_avg_daily_spend - required_daily_spend` |

## Critical Business Flows

### 1. Client Onboarding (18 steps)
See: [ONBOARDING.md](./ONBOARDING.md)

### 2. Billing Cycle
See: [BILLING.md](./BILLING.md)

### 3. Campaign Management
See: [CAMPAIGNS.md](./CAMPAIGNS.md)

### 4. Frontend Features
See: [FRONTEND.md](./FRONTEND.md)

## Client Lifecycle

```
Application → Onboarding (18 steps) → Active → [Paused/At Risk] → Cancelled
                                         ↑
                                    Reactivation
```

### Status Values
- **pending** — New client, awaiting onboarding
- **in_progress** — Onboarding automation running
- **automation_complete** — All 18 steps done, awaiting final setup
- **completed** — Fully onboarded
- **active** — Live client, campaigns running
- **paused** — Temporarily suspended
- **at_risk** — Warning flags (poor metrics, low balance)
- **cancelled** — Churned

## Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `STRIPE_MANAGEMENT_SECRET_KEY` | Management fee Stripe account |
| `STRIPE_AD_SPEND_SECRET_KEY` | Ad spend wallet Stripe account |
| `STRIPE_MANAGEMENT_WEBHOOK_SECRET` | Webhook verification (management) |
| `STRIPE_AD_SPEND_WEBHOOK_SECRET` | Webhook verification (ad spend) |
| `GHL_CLIENT_ID` / `GHL_CLIENT_SECRET` | GHL OAuth credentials |
| `GHL_SAAS_PLAN_ID` | GHL SaaS V2 activation |
| `MASTER_TWILIO_ACCOUNT_SID` / `MASTER_TWILIO_AUTH_TOKEN` | Twilio master account |
| `ENCRYPTION_KEY` | AES-GCM for GHL token encryption |
| `GOOGLE_ADS_*` | Google Ads API credentials (5 vars) |
| `SLACK_ADS_MANAGER_WEBHOOK_URL` | Slack notifications |
| `ONBOARDING_BRIDGE_KEY` | Onboarding API auth |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase backend |

## pg_cron Scheduled Jobs

| Job ID | Purpose | Schedule |
|--------|---------|----------|
| 17 | sync-google-ads (hourly ad spend sync) | Every hour |
| 18 | auto-recharge-run (wallet auto-recharge) | Every hour |
| 19 | morning-review-job (campaign health + proposals) | Daily |

## Known Critical Issues

1. **111 edge functions with `verify_jwt=false`** — No auth on any endpoint
2. **No tests** — Zero test coverage across entire codebase
3. **No error monitoring** — No Sentry, Datadog, or equivalent
4. **Vercel webhook broken** — Must manually trigger deploys via API
5. **sync-stripe-charges resets verify_jwt** — Must patch after every deploy
6. **GHL OAuth bridge to old project** — `crm-location-token` proxies to deprecated Supabase project
7. **`types.ts` is auto-generated** — Never edit manually
8. **`alphahub-v2/` is dead code** — Migration artifact, do not use

## Document Index

| Document | What It Covers |
|----------|---------------|
| [SYSTEM.md](./SYSTEM.md) | This file — master reference |
| [BILLING.md](./BILLING.md) | Stripe dual-account, wallet balance, auto-recharge, webhooks, collections |
| [CAMPAIGNS.md](./CAMPAIGNS.md) | Google Ads management, health scoring, safe mode, AI proposals |
| [ONBOARDING.md](./ONBOARDING.md) | 18-step automation, GHL subaccounts, Twilio provisioning |
| [FRONTEND.md](./FRONTEND.md) | All pages, components, hooks, navigation, auth |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System patterns, layers, data flow |
| [STRUCTURE.md](./STRUCTURE.md) | Directory layout, file inventory |
| [STACK.md](./STACK.md) | Technologies, dependencies, configuration |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | External API details |
| [CONVENTIONS.md](./CONVENTIONS.md) | Code patterns, naming, style |
| [TESTING.md](./TESTING.md) | Current test state (none) |
| [CONCERNS.md](./CONCERNS.md) | Tech debt, security, fragile areas |

---
*Generated: 2026-03-12*
