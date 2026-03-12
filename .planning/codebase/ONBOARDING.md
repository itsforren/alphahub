# Alpha Hub — Client Onboarding & GHL Integration

> Complete reference for the 18-step automated onboarding pipeline, GHL subaccount creation, Twilio phone provisioning, and client lifecycle management.

## Overview

The onboarding system is an 18-step automated pipeline that takes a new insurance agent from sign-up to fully operational with:
- GoHighLevel CRM subaccount
- Twilio phone number
- Webflow landing/scheduler/profile/thank-you pages
- Google Ads campaign
- AI-generated bio
- NFIA (insurance agent) page
- End-to-end verification test

## The 18 Steps

| Step | Name | What It Does | Automated? |
|------|------|-------------|-----------|
| 1 | `lowercase_name` | Normalize agent name | Yes |
| 2 | `generate_slug` | Generate URL slug (agent_id-firstname-lastname) | Yes |
| 3 | `generate_bio` | Generate AI-powered bio from agent_bio_input | Yes |
| 4 | `create_nfia` | Create NFIA page on external platform | Yes (3 retries) |
| 5 | `create_scheduler` | Create Webflow scheduler page with embed placeholder | Yes |
| 6 | `create_lander` | Create Webflow lander page with redirect | Yes |
| 7 | `create_profile` | Create Webflow agent profile page (team directory) | Yes |
| 8 | `create_thankyou` | Create Webflow thank you page | Yes |
| 9 | `create_subaccount` | Create GHL subaccount + GHL user | Yes (3 retries) |
| 10 | `activate_saas` | Enable SaaS in GHL dashboard | **MANUAL** |
| 11 | `install_snapshot` | Verify/install GHL snapshot; poll for Discovery calendar | Yes (90s timeout) |
| 12 | `provision_phone` | Twilio: activate surface + inject credentials + buy number | Yes (multi-phase) |
| 13 | `pull_calendar_id` | Extract calendar ID from GHL Discovery calendar | Yes |
| 14 | `assign_calendars` | Assign GHL user to all calendars in location | Yes |
| 15 | `update_scheduler_embed` | Update Webflow scheduler with GHL calendar embed | Yes |
| 16 | `sync_crm_custom_fields` | Sync custom fields into GHL for lead routing | Yes |
| 17 | `create_google_ads` | Create Google Ads campaign + link conversion tracking | Yes |
| 18 | `verify_onboarding` | End-to-end test: submit test lead through full pipeline | Yes |

## Step Details

### Step 9: Create Subaccount & GHL User

**Edge function:** `supabase/functions/ghl-create-subaccount/index.ts`

1. **Get Agency Token:**
   - Fetches encrypted GHL OAuth token from `ghl_oauth_tokens` table
   - Auto-refreshes if within 5-min expiry buffer
   - Company ID: `30bFOq4ZtlhKuMOvVPwA`
   - Encryption: AES-GCM with 12-byte IV, key = `ENCRYPTION_KEY` secret

2. **Create GHL Location:**
   ```json
   POST /locations/ (V2 API)
   {
     "companyId": "30bFOq4ZtlhKuMOvVPwA",
     "name": "{first_name} {last_name} | AGENT",
     "email": "...",
     "phone": "...",
     "country": "US",
     "timezone": "America/New_York",
     "snapshotId": "tbDo7ohUgUrGXNwL0gzz",
     "settings": {
       "allowDuplicateContact": false,
       "allowDuplicateOpportunity": false
     }
   }
   ```

3. **Create GHL User:**
   - Via `ghl-create-user` edge function
   - Retries up to 3 times with 5s delays (location propagation lag)
   - Updates client with `ghl_user_id`

### Step 10: Activate SaaS (MANUAL)

**Not automated** — requires admin to:
1. Open GHL dashboard
2. Manually enable SaaS pricing for the location
3. Select appropriate SaaS plan

Automation pauses here until admin marks complete. When marked, automation resumes from step 11.

### Step 11: Install Snapshot & Verify Calendar

1. Check if snapshot already applied → skip to polling
2. Verify SaaS is enabled via 3 endpoints
3. If not enabled: attempt `enable-saas` (legacy) → fallback to SaaS V2 API
4. **Bounded polling:** Poll `crm-snapshot-status` every 10s for up to 90s
   - Success when: `snapshotApplied=true` OR `hasDiscoveryCalendar=true`
   - Returns "pending" if timeout (non-blocking — automation continues)

### Step 12: Provision Phone (Three Phases)

**Phase 1: Activate Twilio Surface** (`ghl-inject-twilio`)
- Switches GHL phone provider from LeadConnector to Twilio
- Tries 15+ endpoint variants across 4 hosts
- Success on first 2xx or 422 (already active)
- 4s propagation delay after success

**Phase 2: Inject Master Twilio Credentials** (`ghl-inject-twilio`)
- Uses hardcoded `MASTER_TWILIO_ACCOUNT_SID` + `MASTER_TWILIO_AUTH_TOKEN`
- Tries 20+ credential injection endpoints
- Success on first 2xx response

**Phase 3: Provision Phone Number** (`ghl-provision-phone`)
1. Extract area code from client phone or `preferredAreaCode`
2. Search available numbers via GHL API (tries 4 API bases)
3. **FATAL:** 422 with "does not have twilio account" → STOP (Twilio not injected)
4. Area code fallback: tries primary + up to 7 nearby codes (e.g., DFW: 214, 972, 469, 817, 682)
5. Purchase first available number via GHL API

### Step 18: Final Verification

End-to-end test:
1. Checks all Webflow pages are live
2. Constructs test URL with agent_id
3. Detects form on scheduler/lander
4. Submits test lead into lead webhook
5. Verifies test lead appears in database
6. Verifies delivery into GHL CRM (if enabled)

## Automation State Management

### onboarding_automation_runs table

| Field | Type | Purpose |
|-------|------|---------|
| client_id | UUID FK | Which client |
| status | enum | `pending` / `running` / `completed` / `failed` / `paused` |
| current_step | integer | Step currently executing (1-18) |
| total_steps | integer | Always 18 |
| steps_completed | JSONB array | List of completed step numbers |
| steps_failed | JSONB array | List of failed step numbers |
| step_data | JSONB object | `{step_1: {success, data, error, timestamp}, ...}` |
| error_log | JSONB array | `[{error, timestamp}, ...]` |
| retry_count | integer | Current retry count |
| max_retries | integer | Default 3 |

### Status Transitions
```
pending → running (automation starts)
running → completed (all 18 steps pass)
running → failed (2+ steps fail or max retries exceeded)
running → paused (manual step pending, e.g., step 10)
paused → running (admin marks manual step complete)
```

## Edge Functions (Onboarding-Related)

| Function | Purpose |
|----------|---------|
| `run-full-onboarding` | Main orchestrator — executes all 18 steps sequentially |
| `onboarding-bridge` | Bridge API for external systems; CRUD ops on clients and automation runs |
| `verify-onboarding` | Legacy verification endpoint |
| `verify-onboarding-live` | Real-time verification of all onboarding artifacts |
| `ghl-create-subaccount` | Creates GHL location with OAuth token management |
| `ghl-create-user` | Creates GHL user tied to subaccount |
| `ghl-inject-twilio` | Two-phase Twilio injection (activate + inject credentials) |
| `ghl-provision-phone` | Searches and purchases Twilio phone numbers |
| `ghl-assign-user-to-all-calendars` | Assigns user to all calendars |
| `ghl-sync-custom-fields` | Syncs custom fields into GHL |
| `ghl-stage-sync` | Synchronizes deal stages |
| `crm-snapshot-status` | Checks if GHL snapshot applied |
| `crm-discovery-calendar` | Verifies calendar availability |
| `crm-location-token` | Retrieves location-scoped OAuth token |
| `crm-oauth-callback` | Handles GHL OAuth flow |
| `generate-agent-bio` | Generates AI bio |
| `nfia-create-agent` | Creates NFIA page |
| `webflow-cms-create` / `webflow-cms-update` | Creates/updates Webflow pages |
| `send-test-lead` | Sends test lead through pipeline |
| `refresh-stable-headshot` | Refreshes agent headshot |
| `check-automation-timeout` | Monitors for stuck automation runs |

## Client Data Model

### Key Client Fields

| Category | Fields |
|----------|--------|
| **Identity** | id, agent_id (unique), name, email (unique), phone |
| **Status** | status (active/paused/at_risk/cancelled), onboarding_status (pending/in_progress/automation_complete/completed/error) |
| **GHL** | subaccount_id, ghl_user_id, ghl_contact_id, ghl_agent_ref |
| **Webflow** | webflow_scheduler_id, webflow_lander_id, webflow_profile_id, webflow_thankyou_id |
| **URLs** | scheduler_link, lander_link, crm_link, nfia_link, ads_link, agreement_link |
| **Ads** | google_campaign_id, states, target_daily_spend, mtd_ad_spend |
| **Financial** | management_fee, monthly_ad_spend, renewal_date, billing_frequency |
| **Performance** | mtd_leads, booked_calls, applications, cpl, ctr, conversion_rate |
| **Referral** | referral_code, referred_by_client_id |
| **Agent Info** | url_slug, ai_bio, timezone, npn, team, package_type |
| **Timestamps** | created_at, contract_signed_at, automation_completed_at, activated_at |
| **Success Manager** | success_manager_name, success_manager_email, success_manager_phone, success_manager_image_url |

## Client Lifecycle

```
Application (Apply.tsx)
    ↓
Client Record Created (status: pending)
    ↓
Agreement Signed (contract_signed_at set)
    ↓
Automation Starts (onboarding_status: in_progress)
    ↓
18 Steps Execute (see above)
    ↓ (pauses at step 10 for manual SaaS activation)
Automation Complete (onboarding_status: automation_complete, automation_completed_at set)
    ↓
Admin Final Review
    ↓
Activated (status: active, activated_at set)
    ↓
Ongoing Operations (campaigns, billing, support)
    ↓
[Paused] ←→ [Active] → [At Risk] → [Cancelled]
```

## Morning Review Job

**Edge function:** `supabase/functions/morning-review-job/index.ts` (~1,850 lines)

Daily health check for all active clients:
1. Fetch Google Ads metrics (yesterday, 7-day, prior 7-day)
2. Fetch lead pipeline data
3. Calculate health score (0-95) across 5 pillars
4. Apply business rules (green/yellow/red)
5. If 2+ critical failures → **auto-execute safe mode** (no approval needed)
6. Otherwise → create pending proposal for admin review
7. Process all campaigns per client (primary + secondary)
8. Post to Slack with approve/deny buttons
9. Log to campaign_audit_log, decision_events, rolling_snapshots

## Frontend Components (Onboarding-Related)

| Component | Purpose |
|-----------|---------|
| `OnboardingAutomationWidget.tsx` | 18-step progress display, verification checks, retry buttons |
| `OnboardingTasksWidget.tsx` | Client self-onboarding checklist |
| `ClientSelfOnboarding.tsx` | Client-facing onboarding UI |
| `OnboardingPaymentFlow.tsx` | Collect payment info during onboarding |
| `OnboardingHero.tsx` | Onboarding welcome screen |
| `ClientDetailView.tsx` | Full client management hub |
| `ClientBulkImport.tsx` | Import clients from CSV |

## Key Secrets & Constants

| Secret / Constant | Value / Purpose |
|-------------------|----------------|
| `GHL_CLIENT_ID` / `GHL_CLIENT_SECRET` | GHL OAuth credentials |
| `GHL_SAAS_PLAN_ID` | SaaS V2 activation |
| `MASTER_TWILIO_ACCOUNT_SID` / `MASTER_TWILIO_AUTH_TOKEN` | Twilio master account |
| `ENCRYPTION_KEY` | AES-GCM for GHL token encryption |
| `ONBOARDING_BRIDGE_KEY` | Onboarding API auth |
| GHL Company ID | `30bFOq4ZtlhKuMOvVPwA` |
| GHL Snapshot ID | `tbDo7ohUgUrGXNwL0gzz` |
| Webflow Site Domain | `www.taxfreewealthplan.com` |
| GHL API Version | `2021-07-28` |

## Critical Gotchas

1. **Step 10 blocks automation** — admin must manually enable SaaS in GHL
2. **GHL location propagation takes 10-30s** — step 9 user creation retries 3x with 5s delays
3. **Snapshot polling bounded to 90s** — returns "pending" if timeout (non-blocking)
4. **Twilio MUST be injected before provisioning** — 422 "no twilio account" is FATAL
5. **Master Twilio account** — all clients share one master SID (not per-client)
6. **15+ activation endpoints, 20+ credential endpoints** — GHL API fragmentation
7. **Steps check idempotency** — skip if artifacts already exist (e.g., webflow_scheduler_id present)
8. **Email uniqueness constraint** — prevents duplicate client records
9. **GHL tokens are AES-GCM encrypted** with auto-refresh within 5-min buffer
10. **Morning review auto-executes safe mode** if 2+ critical failures (no admin approval)

---
*Generated: 2026-03-12*
