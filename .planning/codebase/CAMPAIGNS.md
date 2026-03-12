# Alpha Hub — Campaign & Ads Management System

> Complete reference for Google Ads management, campaign health, safe mode, AI proposals, and attribution.

## Overview

Alpha Hub manages Google Ads campaigns for insurance agent clients. Each client can have up to 2 campaigns. The system:
- **Syncs** daily metrics from Google Ads API v22
- **Tracks** daily spend with wallet protection via Safe Mode
- **Manages** budgets with full audit trails
- **Scores** campaign health across 5 pillars
- **Generates** AI-driven budget change proposals
- **Protects** wallets automatically when balance runs low
- **Trains** future AI models using decision events

## Campaign Data Model

### campaigns table (1:many per client)

| Field | Type | Purpose |
|-------|------|---------|
| client_id | UUID FK | Links to clients |
| google_customer_id | string | Google Ads customer ID (e.g., "6551751244") |
| google_campaign_id | string | Google Ads campaign ID (e.g., "23363894096") |
| label | string | Display name ("Campaign 1", "Campaign 2") |
| is_primary | boolean | First campaign = true |
| states | string | Geo-targeting states (e.g., "CA,TX,NY") |
| current_daily_budget | numeric | Current daily budget in Google Ads |
| **Safe Mode Fields** | | |
| safe_mode | boolean | Whether safe mode is active |
| safe_mode_reason | string | Why safe mode triggered (e.g., "SAFE_WALLET") |
| safe_mode_triggered_at | timestamp | When safe mode activated |
| safe_mode_budget_used | numeric | The penny-level budget set ($0.01-$1.00) |
| pre_safe_mode_budget | numeric | Budget before safe mode (for restoration) |
| **Health Score Fields** | | |
| health_score | 0-100 | Overall health score |
| health_label | string | "Healthy" / "Good" / "At Risk" / "Critical" |
| health_drivers | json | `{positive: [], negative: []}` |
| health_score_delivery | 0-100 | Lead delivery volume/quality |
| health_score_cpl | 0-100 | Cost per lead efficiency |
| health_score_cvr | 0-100 | Conversion rate quality |
| health_score_booked_call | 0-100 | Booked call rate |
| health_score_downstream | 0-100 | Applications, issued/paid |
| **Performance Fields** | | |
| leads_last_7d, booked_calls_last_7d | integer | Rolling 7-day counts |
| booked_call_rate_7d | numeric | Booked calls / leads |
| cpbc_7d, cpsa_7d | numeric | Cost per booked call, cost per submitted app |
| ai_summary | string | AI-generated campaign analysis |
| reason_codes | string[] | Status explanation codes |
| **Ignore Fields** | | |
| ignored | boolean | If true, excluded from all checks |
| ignored_reason | string | Why ignored |
| ignored_until | timestamp | Auto-unignore date |

### ad_spend_daily (one row per campaign per day)

| Field | Type | Purpose |
|-------|------|---------|
| client_id | UUID FK | Links to clients |
| campaign_id | string | Google campaign ID (not campaigns.id) |
| spend_date | date | Date of spend |
| cost | numeric | USD spent |
| impressions | numeric | Ad impressions |
| clicks | numeric | Ad clicks |
| conversions | numeric | Conversions (can be decimal) |
| ctr | numeric | Click-through rate (0-100) |
| cpc | numeric | Cost per click |
| budget_daily | numeric | Budget on that day |
| budget_utilization | numeric | cost / budget (0-1, >1 = overdelivery) |
| overdelivery | boolean | If utilization > 1 |
| campaign_enabled | boolean | Whether campaign was active |

**Unique constraint:** `(client_id, campaign_id, spend_date)`

### rolling_snapshots (7-day rolling metrics)

Updated daily by morning review job. Contains `last_7d_*` and `prior_7d_*` metrics with `delta_*_pct` changes.

### proposals (AI budget recommendations)

| Field | Type | Purpose |
|-------|------|---------|
| campaign_id | UUID FK | Which campaign |
| proposed_action_type | enum | `SET_BUDGET` / `SAFE_MODE` / `INVESTIGATE` / `RESTORE_BUDGET` |
| current_daily_budget | numeric | Budget now |
| proposed_daily_budget | numeric | Proposed budget |
| delta_pct | numeric | Change percentage |
| reason_codes | string[] | Why this proposal |
| ai_summary, ai_diagnosis | string | Explanation |
| status | enum | `pending` / `approved` / `denied` / `executed` / `auto_executed` |
| recommendation_confidence | 0-100 | Confidence score |

### campaign_settings (thresholds)

Global settings (campaign_id = null) or per-campaign overrides:
- `auto_approve_green`, `auto_approve_yellow`, `auto_approve_red` — Auto-approval rules
- `ctr_red_threshold`, `cvr_red_threshold`, `cpl_yellow_threshold` — Health thresholds
- `max_budget_change_pct` — Max allowed budget change (e.g., 50%)
- `target_spend_pct` — Target budget utilization (default 95%)

## Ad Spend Data Flow

```
Google Ads API v22
    ↓
[sync-google-ads] Edge Function (hourly via pg_cron)
    ├→ Queries: cost_micros, impressions, clicks, conversions, CTR, CPC
    ├→ Queries: campaign budget + geo targeting
    ├→ Default sync range: last 7 days
    ├→ For each day:
    │   └→ Upsert to ad_spend_daily (on conflict: client_id, campaign_id, spend_date)
    └→ Update campaigns table: current_daily_budget, updated_at

[Computed in useCampaignCommandCenter]
    ├→ MTD spend: SUM(ad_spend_daily.cost) WHERE spend_date >= month_start
    ├→ CPL: mtd_spend / mtd_leads
    ├→ CPC: SUM(cost) / SUM(clicks)
    ├→ CTR: SUM(clicks) / SUM(impressions) * 100
    ├→ CVR: SUM(conversions) / SUM(clicks) * 100
    └→ Update clients table: mtd_ad_spend, ctr, cpc, cpl, conversion_rate
```

## Campaign Creation

**Edge function:** `supabase/functions/create-google-ads-campaign/index.ts`

### Steps:
1. **User clicks "Build Campaign"** in CampaignPanel.tsx
   - Selects template: "Original (Standard)" or "Revamp (Secondary)"
2. **Frontend invokes** `create-google-ads-campaign`
   - Payload: `{ clientId, agentName, agentId, states, budget, landingPage, templateType }`
3. **Edge function creates in Google Ads:**
   - Step 1: Campaign creation with budget
   - Step 2: Ad groups from template with state targeting
   - Step 3: Responsive search ads with headlines/descriptions + landing page
4. **Database sync:**
   - Insert to `campaigns` table (is_primary = true if first, false otherwise)
   - Update `clients` table with `gads_campaign_created = true`

### Manual Campaign Addition
- User enters existing Google Ads campaign ID (format: `customerId:campaignId`)
- Upserts to campaigns table

### Business Rules
- **Max 2 campaigns per client** (enforced in UI — "Build Campaign" hidden when count >= 2)
- Primary campaign auto-assigned for first campaign
- Secondary campaign uses different template (`template_campaign_id_secondary` setting)

## Budget Management

### Budget Update Flow
1. Admin edits budget in EditBudgetDialog
2. Calls `update-google-ads-budget` edge function
3. Function:
   - Looks up campaign in campaigns table
   - Calls Google Ads API: `GET campaign.campaign_budget` → find resource name
   - Calls Google Ads API: `PATCH campaignBudgets:mutate` with new amountMicros
   - Updates `campaigns.current_daily_budget`
   - Inserts to `campaign_budget_changes` (old_budget, new_budget, change_source, change_reason)
   - Recalculates `clients.target_daily_spend` as SUM of all campaigns

### Budget Constraints
- Minimum budget: $1/day
- Max change: constrained by `campaign_settings.max_budget_change_pct`
- Must have valid `google_customer_id:google_campaign_id` format

## Safe Mode (Low Balance Protection)

**Edge function:** `supabase/functions/check-low-balance/index.ts`
**Trigger:** Hourly pg_cron job + UI wallet balance check

### When It Activates
Wallet balance ≤ `low_balance_threshold` (default $150)

### What It Does
For each campaign (from campaigns table):
1. Skip if already in safe mode or ignored or `admin_exempt`
2. Try budget ladder: **$0.01 → $0.10 → $1.00** (stops at first successful Google Ads API call)
3. Update campaigns table:
   - `safe_mode = true`
   - `safe_mode_triggered_at = now`
   - `safe_mode_reason = "SAFE_WALLET"`
   - `safe_mode_budget_used = $X`
   - `pre_safe_mode_budget = previous budget`
4. Insert to `campaign_budget_changes` (change_source = "safe_mode_enter")
5. Insert to `decision_events` (decision_type = "AUTO_SAFE_MODE")

### Recovery
1. Client deposits funds → wallet balance recovers above threshold
2. Admin clicks "Restore Budget" → calls `update-google-ads-budget` with `pre_safe_mode_budget`
3. `safe_mode` set to false, normal status restored

## Campaign Health Scoring

### Health Score Pillars (0-95 max)

| Pillar | Max Points | What It Measures |
|--------|-----------|-----------------|
| Delivery | 25 | Campaign enabled + spending |
| CVR | 25 | Conversion rate quality |
| CPL | 25 | Cost per lead efficiency |
| Booked Calls | 20 | Lead-to-call conversion |
| Total | 95 | |

### Health Labels

| Score | Label | Color |
|-------|-------|-------|
| 80-100 | Healthy | Green |
| 60-79 | Good | Yellow-green |
| 40-59 | At Risk | Yellow |
| <40 | Critical | Red |

### Campaign Status (green/yellow/red)
- **Green:** All thresholds met, no issues
- **Yellow:** Minor issues (low CTR, suboptimal CPL)
- **Red:** Major issues (no spend, high CPL, low CVR)
- **Safe Mode:** Overrides normal status when active

## Morning Review Job

**Edge function:** `supabase/functions/morning-review-job/index.ts` (~1,850 lines)
**Schedule:** Daily via pg_cron

### Per-Client Process:
1. **Fetch Google Ads metrics** (yesterday, 7-day, prior 7-day)
2. **Fetch lead pipeline data** (leads, booked calls, applications)
3. **Calculate health score** across 5 pillars
4. **Apply business rules:**
   - Green → no action
   - Yellow → create pending proposal
   - Red → create pending proposal
   - 2+ critical failures → **auto-execute safe mode** (no admin approval)
5. **Generate AI analysis** (deterministic rules, not LLM)
6. **Create proposal** with reason codes, confidence, diagnosis
7. **Post to Slack** with approve/deny buttons
8. **Process all campaigns** (primary + secondary)

### Auto-Execute Triggers (NO admin approval needed):
- 2+ critical metric failures simultaneously
- Immediately pennies ALL client campaigns
- Logged as `status: 'auto_executed'` in proposals table

## Pacing Metrics

Computed in `useCampaignCommandCenter.ts` (2,500+ lines):

| Metric | Formula |
|--------|---------|
| Wallet Remaining | total_deposits - (tracked_spend * perf_fee) |
| Days Remaining | Until billing_period_end |
| Required Daily Spend | (target_spend - spent_to_date) / days_remaining |
| Target Spend | total_budget * 95% (configurable target_spend_pct) |
| Wallet Utilization % | (spent_to_date / total_budget) * 100 |
| Pace Drift | actual_avg_spend - expected_avg_spend |
| Pace Status | "ahead" (>10%), "behind" (<-10%), "on_pace" |

## Performance Fee

- Stored in `onboarding_settings` as `performance_percentage` (default 0%)
- Applied to ALL wallet calculations:
  ```
  displayed_spend = tracked_spend * (1 + performance_percentage / 100)
  wallet_balance = total_deposits - displayed_spend
  ```
- Centralized function: `applyPerformancePercentage()` in useCampaignCommandCenter

## Attribution Model

### Current State
- Leads attributed at **client level** (not per-campaign)
- Lead metrics: leads_last_7d, booked_calls_last_7d, booked_call_rate_7d
- Downstream: apps_submitted_7d, issued_paid_7d

### Metrics Computed
| Metric | Formula |
|--------|---------|
| CPL | mtd_ad_spend / mtd_leads |
| CPBC | mtd_ad_spend / booked_calls |
| CPSA | mtd_ad_spend / apps_submitted |
| Booked Call Rate | booked_calls / leads * 100 |

### Future
Per-campaign UTM tracking for finer attribution (not yet implemented).

## Ignored Campaigns

Campaigns can be marked ignored:
- **Excluded from:** safe mode checks, health calculations, proposal generation
- **Fields:** `ignored`, `ignored_reason`, `ignored_at`, `ignored_by`, `ignored_until`
- **Can un-ignore anytime** via Command Center

## Edge Functions (Campaign-Related)

| Function | Purpose |
|----------|---------|
| `update-google-ads-budget` | Updates daily budget in Google Ads API |
| `sync-google-ads` | Fetches daily metrics from Google Ads, syncs to ad_spend_daily |
| `sync-all-google-ads` | Bulk sync for all clients |
| `sync-meta-ads` | Fetches Meta/Facebook Ads spend (not persisted to ad_spend_daily) |
| `create-google-ads-campaign` | Creates new campaign from template |
| `sync-google-ads-targeting` | Syncs geo-targeting from Google Ads |
| `pause-google-ads-campaign` | Pauses campaign in Google Ads |
| `verify-google-ads-campaign` | Verifies campaign exists |
| `add-keywords-to-campaign` | Adds keywords |
| `update-google-ads-targeting` | Updates targeting settings |
| `update-google-ads-url` | Updates landing page URL |
| `check-low-balance` | Safe mode trigger |
| `morning-review-job` | Daily health check + proposal generation |
| `google-ads-enhanced-conversion` | Enhanced conversions tracking |

## React Components (Campaign-Related)

| Component | Purpose |
|-----------|---------|
| `CampaignPanel.tsx` | Per-client campaign management (build, edit, sync, states) |
| `CampaignCommandCenter.tsx` | Admin command center for all campaigns |
| `CampaignDetailModal.tsx` | Detailed campaign metrics + AI analysis |
| `CampaignStatusBadge.tsx` | Visual status indicator |
| `EditBudgetDialog.tsx` | Budget adjustment UI |
| `StateSelector.tsx` | Geo-targeting state selection |
| `GoogleAdsSyncButton.tsx` | Manual sync trigger |
| `ManualBudgetDialog.tsx` | Override budget |
| `ProposalApprovalModal.tsx` | AI proposal approval UI |
| `IgnoreCampaignDialog.tsx` | Ignore/un-ignore campaign |
| `HealthScorePillarBreakdown.tsx` | Detailed health breakdown |
| `WalletProgressBar.tsx` | Budget progress visualization |

## Complete Business Flow Example

1. **Onboarding:** Admin builds primary Google Ads campaign via CampaignPanel → create-google-ads-campaign edge function → creates in Google Ads → upserts to campaigns table
2. **Daily sync:** sync-google-ads runs hourly → upserts to ad_spend_daily → rolling_snapshots updated
3. **Budget adjustment:** Admin edits budget → update-google-ads-budget → Google Ads API → campaigns table → campaign_budget_changes audit
4. **Morning review:** morning-review-job analyzes all campaigns → computes health → creates proposals → posts to Slack
5. **Low balance:** check-low-balance detects wallet_balance $120 < threshold $150 → tries budget ladder $0.01 → safe mode activated for ALL campaigns
6. **Recovery:** Client deposits $500 → next check-low-balance passes → admin restores budget → safe_mode = false

---
*Generated: 2026-03-12*
