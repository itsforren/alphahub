# Feature Landscape: AlphaHub Migration

**Domain:** Lovable-to-self-managed Supabase migration of a production ad operations platform
**Researched:** 2026-02-26
**Confidence:** HIGH (derived from direct source code analysis of the existing codebase)

---

## System Overview

AlphaHub is a multi-tenant insurance agent management platform with 111 database tables, 90+ edge functions, 14 RPC functions, and a React frontend with ~60 pages/routes. The system handles $100K+/cycle in live billing across dual Stripe accounts. This is a 1:1 migration, not a rebuild.

**Source repo:** `/Users/forren/workspace/connect-proxis-alphahub/alpha-agent-flow/`
**Supabase project:** `qydkrpirrfelgtcqasdx`
**Live URL:** `https://conscious.sysconscious.com`

---

## Table Stakes (Must Migrate or App Breaks)

Features without which the platform cannot serve its core business function. Missing any of these means the app is non-functional for existing clients and admin.

### TS-1: Supabase Database Schema + Data

| Attribute | Detail |
|-----------|--------|
| **What** | 111 tables, all RLS policies, 14 RPC functions, triggers, indexes, enums |
| **Why critical** | Every feature reads/writes to this database. Zero functionality without it. |
| **Complexity** | HIGH |
| **Tables (key)** | `clients`, `client_wallets`, `wallet_transactions`, `billing_records`, `billing_collections`, `leads`, `ad_spend_daily`, `campaigns`, `chat_conversations`, `chat_messages`, `support_tickets`, `ticket_replies`, `system_alerts`, `onboarding_checklist`, `profiles`, `user_roles`, `agreements`, `referrals`, `referral_partners`, `prospects`, `proposals` |
| **RPC functions** | `get_user_role`, `has_role`, `link_client_to_user`, `get_or_create_conversation`, `calculate_sla_deadline`, `get_support_agent_for_category`, `initialize_onboarding_checklist`, `mark_messages_read`, `increment_stat`, `increment_pipeline_metric`, `is_enrolled`, `get_or_create_referral_code`, `get_or_create_partner_referral_code`, `generate_referral_code` |
| **Enums** | `app_role`, `billing_status`, `billing_type`, `onboarding_check_status`, `onboarding_status`, `referral_status`, `reward_status`, `ticket_priority` |
| **Migration concern** | 133+ migrations exist. Best approach: dump the CURRENT schema state from production (not replay migrations). Data must transfer with zero loss -- especially financial data. |
| **Dependency** | Everything depends on this. Migrate first. |

### TS-2: Supabase Auth (Email/Password + MFA)

| Attribute | Detail |
|-----------|--------|
| **What** | Email/password authentication with TOTP MFA support. Roles: admin, member, client, referrer, guest. |
| **Why critical** | Every protected route requires auth. Auth context drives the entire UI (role-based nav, admin guards). |
| **Complexity** | MEDIUM |
| **Auth methods** | `signInWithPassword`, `signUp`, `resetPasswordForEmail`, MFA (TOTP enroll/verify/unenroll/challenge) |
| **No OAuth found** | Despite project context mentioning "Google Auth", the codebase uses email/password only. No `signInWithOAuth` calls exist anywhere in the source. |
| **Key files** | `src/contexts/AuthContext.tsx`, `src/components/app/ProtectedRoute.tsx`, `src/components/auth/MFAEnrollment.tsx`, `src/components/auth/MFAVerification.tsx` |
| **Migration concern** | Auth users live in Supabase's `auth.users` table. Must export from old project and import to new. Password hashes must transfer or users need password resets. MFA factors must transfer. |
| **Dependency** | Blocks all protected features (everything in /hub/*). |

### TS-3: Client Management Core

| Attribute | Detail |
|-----------|--------|
| **What** | Client CRUD, list/search/filter, detail views with tabbed interface (Overview, Billing, Leads, Chat, Onboarding, Settings) |
| **Why critical** | Primary admin workflow. Admin lives in client detail views. |
| **Complexity** | MEDIUM |
| **Key pages** | `portal/admin/Clients.tsx`, `portal/admin/ClientDetail.tsx` (the biggest, most complex page), `portal/admin/ArchivedClients.tsx` |
| **Key hooks** | `useClients.ts`, `useClientData.tsx`, `useClientSuccessData.ts` |
| **Key tables** | `clients` (massive -- 100+ columns), `profiles`, `user_roles` |
| **Migration concern** | Mostly frontend reads from Supabase. Works as-is once DB and auth are migrated. |
| **Dependency** | Depends on TS-1, TS-2. |

### TS-4: Ad Spend Wallet System

| Attribute | Detail |
|-----------|--------|
| **What** | Per-client wallet with balance tracking, daily burn rate, runway calculation, auto-recharge, low-balance alerts, safe mode |
| **Why critical** | Wallet balances determine whether Google Ads campaigns run. Wrong balance = lost ad spend or stopped campaigns. This is the most financially sensitive feature. |
| **Complexity** | HIGH |
| **Key tables** | `client_wallets`, `wallet_transactions`, `ad_spend_daily` |
| **Key hooks** | `useClientWallet.ts`, `useComputedWalletBalance.ts` |
| **Key edge functions** | `check-low-balance`, `auto-recharge-run` (daily cron at 6 AM UTC) |
| **Computed balance** | `Balance = Total Deposits - (Tracked Spend x Performance %)` -- computed in `mcp-proxy/computed-wallet.ts` |
| **Migration concern** | Wallet state (balances, thresholds, auto_charge_amount, billing_mode, monthly_ad_spend_cap) must transfer exactly. The `auto-recharge-run` cron must be re-registered on the new Supabase project. |
| **Dependency** | Depends on TS-1, TS-6 (Stripe for auto-recharge). |

### TS-5: Billing Records & Collections

| Attribute | Detail |
|-----------|--------|
| **What** | Billing record creation, status management (pending/paid/overdue/cancelled), payment tracking, recurring billing generation, collections escalation engine |
| **Why critical** | Revenue collection. 70+ active recurring subscriptions. $100K+/cycle. Billing records drive cash flow. |
| **Complexity** | HIGH |
| **Key tables** | `billing_records`, `billing_collections`, `billing_collection_events` |
| **Key hooks** | `useBillingRecords.ts` (includes downstream actions on "paid": wallet deposit + next recurring record + referral commission), `useBillingDashboard.ts`, `useBillingTracker.ts` |
| **Collections flow** | `reminder -> warning -> urgent -> final_notice -> suspended` |
| **Key edge function** | `billing-collections-run` |
| **Migration concern** | Must preserve billing_mode (manual vs auto_stripe) per client. Active recurring schedules must not break. |
| **Dependency** | Depends on TS-1, TS-6 (Stripe). |

### TS-6: Stripe Integration (Dual Accounts)

| Attribute | Detail |
|-----------|--------|
| **What** | Two separate Stripe accounts: "management" (service fees) and "ad_spend" (wallet deposits). Customers, invoices, subscriptions, charges, payouts, payment methods, webhooks. |
| **Why critical** | Revenue collection mechanism. Without Stripe, no money comes in. Live billing with real customers. |
| **Complexity** | HIGH |
| **Key tables** | `client_stripe_customers`, `client_payment_methods`, `disputes` |
| **Key edge functions** | `create-setup-intent`, `save-payment-method`, `create-stripe-invoice`, `stripe-billing-webhook` (489 lines -- THE critical webhook handler), `auto-recharge-run`, `dispute-webhook`, `stripe-webhook` |
| **Stripe secrets (6)** | `STRIPE_MANAGEMENT_SECRET_KEY`, `STRIPE_AD_SPEND_SECRET_KEY`, `STRIPE_MANAGEMENT_WEBHOOK_SECRET`, `STRIPE_AD_SPEND_WEBHOOK_SECRET`, `VITE_STRIPE_MANAGEMENT_PUBLISHABLE_KEY`, `VITE_STRIPE_AD_SPEND_PUBLISHABLE_KEY` |
| **Frontend** | `src/config/stripe.ts` (dual Stripe instance loader), `usePaymentMethods.ts`, `PaymentMethodCard.tsx`, `AdSpendSetupCard.tsx` |
| **Migration concern** | Stripe customer IDs, subscription IDs, and payment methods are in Stripe itself (not migrated). What migrates: the local mapping tables (`client_stripe_customers`, `client_payment_methods`). Webhook endpoints must be re-registered to point at the new Supabase project URL. This is the highest-risk migration item. |
| **Dependency** | Depends on TS-1 (mapping tables), edge functions deployment. |

### TS-7: Edge Functions (Core Subset)

| Attribute | Detail |
|-----------|--------|
| **What** | The ~15 edge functions that power core billing, wallet, and webhook flows |
| **Why critical** | These run server-side logic that the frontend cannot. Without them, billing automation, webhook handling, and ad operations break. |
| **Complexity** | HIGH |
| **Critical functions** | `stripe-billing-webhook`, `create-stripe-invoice`, `create-setup-intent`, `save-payment-method`, `auto-recharge-run`, `check-low-balance`, `dispute-webhook`, `billing-collections-run`, `process-referral-commission`, `chat-notification`, `ticket-notification` |
| **All functions (90+)** | See complete list in the supabase/functions/ directory. All have `verify_jwt = false` in config.toml. |
| **Runtime** | Deno (Supabase Edge Functions) |
| **Secrets needed** | `MCP_PROXY_SECRET`, `STRIPE_*` keys (6), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, plus Google Ads, GHL, Plaid, Slack, Twilio, ElevenLabs, Webflow, Fathom API keys |
| **Migration concern** | All functions must be deployed to the new Supabase project. Secrets must be configured in the new project's vault. Cron schedules (auto-recharge-run, prospect-inactivity-check) must be re-registered. |
| **Dependency** | Depends on TS-1 (database access), new Supabase project creation. |

### TS-8: Supabase Storage Buckets

| Attribute | Detail |
|-----------|--------|
| **What** | Three storage buckets used by the app |
| **Why critical** | Missing files = broken profile photos, missing agreements, lost chat attachments |
| **Complexity** | LOW |
| **Buckets** | `media` (public: headshots, lesson files, prospect photos, screenshots), `agreements` (private: signed PDFs, signature images), `chat-attachments` (public: chat file uploads) |
| **Migration concern** | Create buckets in new project, transfer files. Bucket policies (public vs private) must match. |
| **Dependency** | Depends on new Supabase project creation. |

### TS-9: Supabase Realtime Subscriptions

| Attribute | Detail |
|-----------|--------|
| **What** | 8 components use Supabase Realtime channels for live updates |
| **Why critical** | Chat and notifications rely on realtime. Without it, messages don't appear until page refresh. |
| **Complexity** | LOW |
| **Files using Realtime** | `useChat.ts`, `useAdminChat.ts`, `useTicketDashboard.ts`, `useOnboardingAutomation.ts`, `useBrowserNotifications.ts`, `NotificationContext.tsx`, `LeadPipelineHealthWidget.tsx` |
| **Migration concern** | Realtime is a Supabase feature that works automatically with the new project. No code changes needed -- just needs correct Supabase URL in the client. |
| **Dependency** | Depends on TS-1 (tables), TS-2 (auth for RLS). |

---

## Important (Should Migrate for Full Functionality)

Features that are actively used but the platform can technically operate without them for a brief period during migration.

### IMP-1: MCP Proxy (God Mode)

| Attribute | Detail |
|-----------|--------|
| **What** | The `mcp-proxy` edge function -- 2,644 lines, 52 tools for querying the entire system via HTTP or MCP protocol |
| **Why important** | Used by OpenClaw/MoltBot for automated business monitoring, and by Claude Code for ad-hoc operations. Not user-facing in the frontend. |
| **Complexity** | MEDIUM |
| **Key file** | `supabase/functions/mcp-proxy/index.ts` (+ `computed-wallet.ts` helper) |
| **Migration concern** | Deploy as an edge function. Update `MCP_PROXY_SECRET`. Update the local `alphahub-mcp` wrapper to point at new URL. Update any external integrations (OpenClaw). |
| **Dependency** | Depends on TS-1 (database), TS-7 (edge function deployment). |

### IMP-2: Google Ads Integration

| Attribute | Detail |
|-----------|--------|
| **What** | Sync Google Ads campaigns, spend data, budget management, targeting, enhanced conversions, MCC billing |
| **Why important** | Core business operation -- managing client ad campaigns. But sync happens via edge functions on a schedule, not real-time user interaction. |
| **Complexity** | MEDIUM |
| **Key edge functions** | `sync-google-ads`, `sync-all-google-ads`, `sync-google-ads-targeting`, `update-google-ads-budget`, `update-google-ads-targeting`, `create-google-ads-campaign`, `verify-google-ads-campaign`, `google-ads-enhanced-conversion`, `sync-internal-google-ads` |
| **Key tables** | `ad_spend_daily`, `campaigns`, `campaign_settings`, `campaign_audit_log` |
| **Key hooks** | `useCampaignCommandCenter.ts`, `useAccountWideMetrics.ts` |
| **Migration concern** | Google Ads API keys/credentials must transfer. Edge functions re-deployed. Campaign data is already in the DB (migrated with TS-1). |
| **Dependency** | Depends on TS-1, TS-7. |

### IMP-3: Chat & Communications System

| Attribute | Detail |
|-----------|--------|
| **What** | Client-admin chat (real-time), admin team chat (channels + DMs), support tickets with SLA tracking, chat attachments, link previews, browser notifications |
| **Why important** | Active client communication channel. Clients expect to message admin and get responses. |
| **Complexity** | MEDIUM |
| **Key tables** | `chat_conversations`, `chat_messages`, `chat_settings`, `admin_channels`, `admin_channel_members`, `admin_channel_messages`, `admin_dm_conversations`, `admin_dm_messages`, `support_tickets`, `ticket_replies`, `support_agents`, `sla_settings` |
| **Key hooks** | `useChat.ts`, `useAdminChat.ts`, `useTicketDashboard.ts`, `useChatSLAMetrics.ts`, `useSupportAgents.ts`, `useSLASettings.ts` |
| **Key pages** | `portal/Chat.tsx`, `portal/Support.tsx`, `hub/admin/UnifiedChat.tsx`, `hub/admin/TicketDashboard.tsx` |
| **Key edge functions** | `chat-notification`, `ticket-notification`, `fetch-link-preview` |
| **Migration concern** | Chat history must transfer (part of DB migration). Realtime subscriptions work automatically. |
| **Dependency** | Depends on TS-1, TS-2, TS-8 (attachments), TS-9 (realtime). |

### IMP-4: Lead Pipeline & Tracking

| Attribute | Detail |
|-----------|--------|
| **What** | Lead ingestion via webhooks, status tracking, pipeline metrics, delivery to GHL, lead router health, funnel visualization, per-agent breakdown |
| **Why important** | Leads are the product. Clients pay for lead delivery. Pipeline must keep flowing. |
| **Complexity** | MEDIUM |
| **Key tables** | `leads`, `lead_status_history`, `lead_delivery_logs`, `lead_pipeline_metrics`, `lead_attribution` |
| **Key edge functions** | `lead-webhook`, `lead-status-webhook`, `inject-lead-to-ghl`, `retry-failed-lead-delivery`, `check-lead-discrepancy`, `check-lead-router-health`, `send-test-lead`, `verify-lead-delivery` |
| **Key hooks** | `useLeads.ts`, `useLeadMetrics.ts`, `useLeadStats.ts` |
| **Migration concern** | Webhook URLs must be updated at the lead sources to point at new Supabase function URLs. This is an external dependency that requires coordination. |
| **Dependency** | Depends on TS-1, TS-7. External webhook sources must be updated. |

### IMP-5: Onboarding System

| Attribute | Detail |
|-----------|--------|
| **What** | Client onboarding checklists, automation runs, GHL subaccount creation, phone provisioning, A2P status sync, verification steps |
| **Why important** | New clients go through onboarding. But existing clients are already onboarded, so brief outage is tolerable. |
| **Complexity** | MEDIUM |
| **Key tables** | `onboarding_checklist`, `onboarding_tasks`, `onboarding_settings`, `onboarding_automation_runs`, `client_self_onboarding` |
| **Key edge functions** | `run-full-onboarding`, `onboarding-bridge`, `verify-onboarding`, `verify-onboarding-live`, `agent-onboarding-webhook`, `agent-update-webhook`, `ghl-create-subaccount`, `ghl-create-user`, `ghl-inject-twilio`, `ghl-provision-phone`, `sync-a2p-status` |
| **Key hooks** | `useOnboardingChecklist.ts`, `useOnboardingAutomation.ts`, `useClientSelfOnboarding.ts` |
| **Migration concern** | GHL OAuth tokens stored in `ghl_oauth_tokens` must transfer. External GHL webhook URLs must be updated. |
| **Dependency** | Depends on TS-1, TS-7. External GHL integration. |

### IMP-6: System Alerts & Dashboard

| Attribute | Detail |
|-----------|--------|
| **What** | System-wide alerts (low wallets, overdue invoices, failed charges, unsafe campaigns, urgent tickets, stalled onboarding), daily dashboard heartbeat |
| **Why important** | Admin's primary visibility into system health. Without alerts, problems go unnoticed. |
| **Complexity** | LOW |
| **Key tables** | `system_alerts` |
| **Key hooks** | `useSystemAlerts.ts`, `useRedAlertData.ts` |
| **Migration concern** | Data migrates with DB. Alert generation depends on edge functions (check-low-balance, auto-recharge-run, billing-collections-run). |
| **Dependency** | Depends on TS-1, TS-7. |

### IMP-7: GHL (GoHighLevel) Bridge

| Attribute | Detail |
|-----------|--------|
| **What** | OAuth-based GHL integration, CRM sync, calendar discovery, contact lookup, custom field mappings, stage sync, appointment sync |
| **Why important** | Connects the lead delivery pipeline to client CRMs. Active integration used for lead routing. |
| **Complexity** | MEDIUM |
| **Key tables** | `ghl_oauth_tokens`, `ghl_api_logs`, `ghl_available_fields`, `ghl_custom_field_mappings` |
| **Key edge functions** | `crm-oauth-start`, `crm-oauth-callback`, `crm-location-token`, `crm-discovery-calendar`, `ghl-stage-sync`, `ghl-sync-custom-fields`, `ghl-assign-user-to-all-calendars`, `lookup-ghl-contact`, `sync-ghl-appointments`, `sync-disposition-to-ghl`, `prospect-sync-custom-fields` |
| **Key page** | `hub/admin/GHLBridge.tsx` |
| **Migration concern** | OAuth tokens in `ghl_oauth_tokens` must transfer. OAuth redirect URLs must be updated to new Supabase project. GHL API credentials must be set as secrets. |
| **Dependency** | Depends on TS-1, TS-7. |

---

## Deferrable (Can Be Added Back After Initial Migration)

Features that are nice-to-have, peripheral, or can tolerate being offline during and briefly after migration.

### DEF-1: TV Analytics / Executive Dashboards

| Attribute | Detail |
|-----------|--------|
| **What** | TV-mode dashboards: CEO Board, Engine Room, Client Success, Alert Center, Agent Leaderboards, AI Autopilot, Internal Sales, Watchtower |
| **Why deferrable** | Read-only visualization. Does not affect core operations. Data is there once DB migrates; these just render it. |
| **Complexity** | LOW |
| **Key pages** | `hub/tv/CEOBoard.tsx`, `hub/tv/EngineRoom.tsx`, `hub/tv/ClientSuccess.tsx`, `hub/tv/AlertCenter.tsx`, `hub/tv/AgentLeaderboards.tsx`, `hub/tv/AIAutopilot.tsx`, `hub/tv/InternalSales.tsx`, `hub/tv/Watchtower.tsx` |
| **Key hooks** | `useCEOBoardData.ts`, `useEngineRoomData.ts`, `useOpsHappinessData.ts`, `useWatchtowerData.ts`, `useInternalSalesData.ts`, `useSalesCommandData.ts` |
| **TV components** | Custom `src/components/tv/` directory with animated gauges, counters, backgrounds (18 specialized components) |
| **Migration concern** | Pure frontend. Works automatically once DB is accessible. |
| **Dependency** | Depends on TS-1. |

### DEF-2: Sales Pipeline & Prospect Management

| Attribute | Detail |
|-----------|--------|
| **What** | Kanban board for prospects, call logging, Fathom call integration, disposition tracking, attribution, prospect journey timeline |
| **Why deferrable** | Internal sales tool. Does not affect existing client operations. |
| **Complexity** | MEDIUM |
| **Key tables** | `prospects` (massive table), `prospect_activities`, `prospect_attribution`, `prospect_available_fields`, `prospect_field_mappings`, `sales_pipeline_stages`, `sales_team_members`, `call_logs`, `decision_events` |
| **Key hooks** | `useSalesPipeline.ts`, `useSalesTeam.ts` |
| **Key edge functions** | `prospect-booking-webhook`, `prospect-contact-capture`, `prospect-qualification-submit`, `prospect-post-booking`, `prospect-inactivity-check` (cron: every minute), `prospect-abandoned-webhook`, `analyze-prospect`, `fathom-webhook`, `fetch-fathom-calls` |
| **Key page** | `hub/admin/UnifiedSales.tsx` |
| **Migration concern** | External webhook URLs (prospect booking, Fathom) need updating. The `prospect-inactivity-check` cron runs every minute. |
| **Dependency** | Depends on TS-1, TS-7. |

### DEF-3: Courses & Learning Platform

| Attribute | Detail |
|-----------|--------|
| **What** | Course catalog, lessons with video (HLS), progress tracking, ratings, community feed, admin course management |
| **Why deferrable** | Educational content platform for agents. Not revenue-critical. |
| **Complexity** | LOW |
| **Key tables** | `courses`, `modules`, `lessons`, `lesson_progress`, `lesson_ratings`, `enrollments`, `course_user_progress`, `community_posts`, `community_comments` |
| **Key pages** | `app/Courses.tsx`, `app/CourseDetail.tsx`, `app/LessonView.tsx`, `app/CommunityFeed.tsx`, `app/admin/AdminCourses.tsx` |
| **Key hooks** | `useCourseAnalytics.ts` |
| **Migration concern** | Course media stored in `media` bucket. Video content likely external (HLS.js for streaming). |
| **Dependency** | Depends on TS-1, TS-2, TS-8 (media bucket). |

### DEF-4: Referral & Partner System

| Attribute | Detail |
|-----------|--------|
| **What** | Referral codes, commission tracking, partner management, referral rewards, partner application/pricing pages |
| **Why deferrable** | Business development feature. Existing referrals tracked in DB; new referrals can wait briefly. |
| **Complexity** | LOW |
| **Key tables** | `referrals`, `referral_codes`, `referral_partners`, `referral_rewards`, `referral_commission_config`, `partners` |
| **Key hooks** | `useReferralData.ts`, `useReferralPartner.ts`, `usePartners.ts` |
| **Key edge function** | `process-referral-commission` |
| **Key pages** | `hub/Referrals.tsx`, `hub/admin/ReferralAdmin.tsx`, `Partner.tsx`, `PartnerPricing.tsx` |
| **Migration concern** | Commission processing happens as part of billing webhook -- so it migrates with TS-6. |
| **Dependency** | Depends on TS-1, TS-5 (billing triggers commissions). |

### DEF-5: Plaid Banking Integration

| Attribute | Detail |
|-----------|--------|
| **What** | Bank account linking via Plaid, balance checking, transaction sync, cash flow summary |
| **Why deferrable** | Internal financial visibility tool. Not client-facing. Business can operate without it. |
| **Complexity** | LOW |
| **Key tables** | `bank_accounts` |
| **Key edge functions** | `plaid-create-link-token`, `plaid-exchange-token`, `plaid-sync-transactions`, `plaid-get-balances` |
| **Key hooks** | `usePlaidLink.ts`, `useVaultData.ts` |
| **Migration concern** | Plaid access tokens stored in DB must transfer. Plaid API key must be set as secret. |
| **Dependency** | Depends on TS-1, TS-7. |

### DEF-6: Agreement Signing System

| Attribute | Detail |
|-----------|--------|
| **What** | Digital agreement signing with OTP verification, signature capture (react-signature-canvas), PDF generation (jspdf), agreement templates |
| **Why deferrable** | Used during onboarding for new clients. Existing clients have already signed. |
| **Complexity** | LOW |
| **Key tables** | `agreements`, `agreement_otps`, `agreement_templates` |
| **Key hooks** | `useAgreement.ts`, `useAgreementOTP.ts`, `useAgreementTracking.ts` |
| **Key edge functions** | `send-agreement-otp`, `verify-agreement-otp` |
| **Key page** | `hub/SignAgreement.tsx` |
| **Migration concern** | Signed agreements stored in `agreements` storage bucket (private). Must transfer files. |
| **Dependency** | Depends on TS-1, TS-2, TS-8 (agreements bucket). |

### DEF-7: Public Marketing Pages

| Attribute | Detail |
|-----------|--------|
| **What** | Homepage, About, Pricing, Blog, Apply form, Book Call, Partner pages, Privacy/Terms, Welcome page |
| **Why deferrable** | Marketing/sales funnel pages. Not related to core platform operations. |
| **Complexity** | LOW |
| **Key pages** | `Index.tsx`, `About.tsx`, `Pricing.tsx`, `Blog.tsx`, `BlogPost.tsx`, `Apply.tsx` (46K lines -- largest file), `BookCall.tsx`, `Partner.tsx`, `PartnerPricing.tsx`, `BookPartnerCall.tsx`, `CallConfirmed.tsx`, `FollowUpCallVideo.tsx`, `Welcome.tsx`, `Privacy.tsx`, `Terms.tsx` |
| **Special** | Apply page includes Google Ads enhanced conversion tracking via edge function |
| **Migration concern** | These are purely frontend. Work automatically once deployed. |
| **Dependency** | Minimal. Some edge function calls (conversion tracking). |

### DEF-8: Webflow CMS Integration

| Attribute | Detail |
|-----------|--------|
| **What** | Creates/updates CMS items in Webflow (likely agent bio pages) |
| **Why deferrable** | External marketing website integration. Not core operations. |
| **Complexity** | LOW |
| **Key edge functions** | `webflow-cms-create`, `webflow-cms-update` |
| **Migration concern** | Webflow API key must be set as secret. |
| **Dependency** | Depends on TS-7. |

### DEF-9: Meta Ads Integration

| Attribute | Detail |
|-----------|--------|
| **What** | Sync Meta (Facebook) ads data |
| **Why deferrable** | Secondary ad platform. Google Ads is primary. |
| **Complexity** | LOW |
| **Key edge function** | `sync-meta-ads` |
| **Migration concern** | Meta API credentials must transfer. |
| **Dependency** | Depends on TS-1, TS-7. |

### DEF-10: Financial Tracking (Expenses, Snapshots)

| Attribute | Detail |
|-----------|--------|
| **What** | Expense tracking, categorization rules, performance snapshots, rolling snapshots |
| **Why deferrable** | Internal financial tools. Routes already redirect to /hub/admin/clients. |
| **Complexity** | LOW |
| **Key tables** | `expenses`, `expense_categories`, `categorization_rules`, `performance_snapshots`, `rolling_snapshots` |
| **Key hooks** | `useExpenses.ts` |
| **Migration concern** | Data migrates with DB. |
| **Dependency** | Depends on TS-1. |

### DEF-11: Slack Integration

| Attribute | Detail |
|-----------|--------|
| **What** | Slack notifications for alerts, ads actions, chat notifications |
| **Why deferrable** | Notification channel. System functions without it; alerts still appear in-app. |
| **Complexity** | LOW |
| **Key edge functions** | `slack-ads-actions`, `ads-manager-slack-test` |
| **Migration concern** | Slack webhook URLs stored as secrets. |
| **Dependency** | Depends on TS-7. |

---

## Anti-Features (Do NOT Build During Migration)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| New features or redesigns | This is a 1:1 migration. Adding features increases risk and timeline. | Migrate first, iterate second. |
| Zero-downtime migration | Vastly more complex. Brief planned downtime is acceptable for this business size. | Do a clean cutover with brief downtime. |
| Changing Stripe account structure | Dual-account is deeply embedded. Restructuring would require rewriting billing logic. | Keep dual-account as-is. |
| Migrating away from Supabase | The entire codebase is built on Supabase (auth, DB, edge functions, storage, realtime). | Keep Supabase, just own the project. |
| Replaying 133 migrations | Some may conflict, have been modified, or depend on data states that no longer exist. | Dump current schema state and restore. |
| Custom auth system | The app uses Supabase Auth deeply (MFA, roles, RLS). Building custom auth is a rewrite. | Use Supabase Auth in the new project. |

---

## Feature Dependencies Graph

```
TS-1 (Database) ─────────────────────────────────────────────────────────┐
   |                                                                     |
   ├── TS-2 (Auth) ──────────────────────────────────────────────┐       |
   |      |                                                      |       |
   |      ├── TS-3 (Client Management)                          |       |
   |      |      |                                               |       |
   |      ├── TS-9 (Realtime) ── IMP-3 (Chat)                  |       |
   |      |                                                      |       |
   |      └── DEF-3 (Courses), DEF-6 (Agreements)              |       |
   |                                                              |       |
   ├── TS-7 (Edge Functions) ────────────────────────────────────┤       |
   |      |                                                      |       |
   |      ├── TS-6 (Stripe) ── TS-5 (Billing) ── TS-4 (Wallets)|       |
   |      |      |                                               |       |
   |      |      └── DEF-4 (Referrals, commission processing)   |       |
   |      |                                                      |       |
   |      ├── IMP-1 (MCP Proxy)                                 |       |
   |      ├── IMP-2 (Google Ads)                                 |       |
   |      ├── IMP-4 (Lead Pipeline)                              |       |
   |      ├── IMP-5 (Onboarding / GHL)                          |       |
   |      ├── IMP-7 (GHL Bridge)                                 |       |
   |      ├── DEF-2 (Sales Pipeline)                             |       |
   |      ├── DEF-5 (Plaid Banking)                              |       |
   |      └── DEF-8,9,11 (Webflow, Meta, Slack)                 |       |
   |                                                              |       |
   ├── TS-8 (Storage) ── IMP-3 (Chat attachments)               |       |
   |                   ── DEF-6 (Agreement PDFs)                 |       |
   |                   ── DEF-3 (Course media)                   |       |
   |                                                              |       |
   └── DEF-1 (TV Dashboards), DEF-7 (Public pages),             |       |
       DEF-10 (Expenses), IMP-6 (Alerts)                         |       |
                                                                  |       |
                              All features depend on TS-1 ────────┘───────┘
```

---

## MVP Migration Recommendation

The critical migration path is:

1. **TS-1** (Database) -- Must be first. Everything depends on it.
2. **TS-2** (Auth) -- Must follow immediately. Can't test anything without auth.
3. **TS-8** (Storage) -- Quick win. Create 3 buckets, transfer files.
4. **TS-7** (Edge Functions, billing subset first) -- Deploy the ~15 critical functions.
5. **TS-6** (Stripe) -- Re-register webhooks, set secrets, test payment flow.
6. **TS-5 + TS-4** (Billing + Wallets) -- Verify end-to-end billing works.
7. **TS-3** (Client Management) -- Frontend re-pointed to new backend.
8. **TS-9** (Realtime) -- Automatic, just verify.

Then bring up Important features: IMP-1 through IMP-7.
Then Deferrable features: DEF-1 through DEF-11 (most work automatically once DB + edge functions are live).

---

## Migration Complexity Summary

| Category | Count | Complexity | Notes |
|----------|-------|------------|-------|
| Database tables | 111 | HIGH | Schema dump + data transfer |
| Edge functions | 90+ | HIGH | Deploy all, configure secrets, re-register crons/webhooks |
| RPC functions | 14 | MEDIUM | Included in schema dump |
| Storage buckets | 3 | LOW | media, agreements, chat-attachments |
| Frontend pages | ~60 | LOW | Re-point Supabase client URL, redeploy |
| Realtime channels | 8 uses | LOW | Automatic with new Supabase client |
| External webhook registrations | ~10+ | MEDIUM | Stripe (2), lead sources, GHL, Fathom, prospect booking -- all need URL updates |
| Environment secrets | 20+ | MEDIUM | All must be set in new Supabase project vault |
| Auth users | ~20+ | MEDIUM | Must export/import auth.users table including password hashes |

---

## Sources

- **HIGH confidence (direct source code analysis):**
  - `/Users/forren/workspace/connect-proxis-alphahub/alpha-agent-flow/` -- Full source repository
  - `/Users/forren/workspace/connect-proxis-alphahub/alpha-agent-flow/src/integrations/supabase/types.ts` -- 5,672-line generated types file documenting all 111 tables, 14 RPCs, 8 enums
  - `/Users/forren/workspace/connect-proxis-alphahub/alpha-agent-flow/supabase/config.toml` -- All 90+ edge function registrations
  - `/Users/forren/workspace/connect-proxis-alphahub/alpha-agent-flow/src/App.tsx` -- Complete routing structure
  - `/Users/forren/workspace/connect-proxis-alphahub/alpha-agent-flow/src/contexts/AuthContext.tsx` -- Auth implementation
  - `/Users/forren/workspace/alphahub-mcp/` -- MCP server source
  - `/Users/forren/workspace/alpha-hub-stripe-billing-status.txt` -- Comprehensive system status document (46K)
