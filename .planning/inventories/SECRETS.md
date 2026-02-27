# Secrets Inventory

**Source:** `Deno.env.get()` grep across all 106 edge functions in `alphahub-v2/supabase/functions/`
**Cross-referenced with:** `~/.zprofile` environment variables and Lovable AI extraction (47 configured secrets)
**Audited:** 2026-02-27

---

## Summary

| Metric | Count |
|--------|-------|
| Total unique secrets in code (`Deno.env.get()`) | 44 |
| Auto-set by Supabase | 3 |
| Manual secrets needed | 41 |
| Verified (exact match in zprofile) | 17 |
| Name mismatch (similar key, different name) | 6 |
| Not found in zprofile | 14 |
| Not needed post-migration | 1 |
| Lovable-only (configured but not in code) | 7 |

**Migration readiness:** 23 of 41 manual secrets have values available (17 verified + 6 name-matched). 14 secrets need investigation to locate values. 1 secret (LOVABLE_API_KEY) needs a replacement strategy.

---

## 1. Auto-Set by Supabase (3 secrets)

These are automatically populated by Supabase in every edge function runtime. No manual configuration needed.

| Secret Name | Used By (function count) | Notes |
|-------------|-------------------------|-------|
| `SUPABASE_URL` | 87 functions (nearly all) | Auto-set to project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 86 functions (nearly all) | Auto-set, bypasses RLS |
| `SUPABASE_ANON_KEY` | 6 functions | Auto-set, respects RLS |

**Used by:** plaid-create-link-token, plaid-exchange-token, plaid-get-balances, plaid-sync-transactions, refresh-stable-headshot, reset-user-password (for anon key); virtually all functions for URL and service role key.

---

## 2. Verified Matches (17 secrets -- exact name in zprofile)

These secrets exist in both the code and `~/.zprofile` with identical names. Ready for migration.

| Secret Name | Category | Used By (functions) | Status |
|-------------|----------|---------------------|--------|
| `CONVERSION_API_KEY` | Tracking | agent-onboarding-webhook, google-ads-enhanced-conversion | VERIFIED |
| `GHL_CLIENT_ID` | CRM | crm-location-token, crm-oauth-callback, crm-oauth-start, ghl-create-user, run-full-onboarding, sync-disposition-to-ghl | VERIFIED |
| `GHL_CLIENT_SECRET` | CRM | crm-location-token, crm-oauth-callback, ghl-create-user, run-full-onboarding, sync-disposition-to-ghl | VERIFIED |
| `GHL_COMPANY_ID` | CRM | ghl-create-subaccount, sync-a2p-status | VERIFIED |
| `GHL_REDIRECT_URI` | CRM | crm-oauth-callback, crm-oauth-start | VERIFIED |
| `GHL_SAAS_PLAN_ID` | CRM | run-full-onboarding | VERIFIED |
| `GOOGLE_ADS_CLIENT_ID` | Ads | 15 Google Ads functions + mcp-proxy | VERIFIED |
| `GOOGLE_ADS_CLIENT_SECRET` | Ads | 15 Google Ads functions + mcp-proxy | VERIFIED |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Ads | 15 Google Ads functions + mcp-proxy | VERIFIED |
| `GOOGLE_ADS_REFRESH_TOKEN` | Ads | 15 Google Ads functions + mcp-proxy | VERIFIED |
| `MCP_PROXY_SECRET` | Security | mcp-proxy | VERIFIED |
| `ONBOARDING_BRIDGE_KEY` | Security | onboarding-bridge, refresh-stable-headshot | VERIFIED |
| `TWILIO_ACCOUNT_SID` | Phone | chat-notification, google-ads-enhanced-conversion, send-agreement-otp | VERIFIED |
| `TWILIO_AUTH_TOKEN` | Phone | chat-notification, google-ads-enhanced-conversion, send-agreement-otp | VERIFIED |
| `TWILIO_PHONE_NUMBER` | Phone | chat-notification, google-ads-enhanced-conversion, send-agreement-otp | VERIFIED |
| `WEBFLOW_SITE_ID` | CMS | webflow-cms-create | VERIFIED |
| `STRIPE_AD_SPEND_SECRET_KEY` | Payments | create-setup-intent, create-stripe-invoice, create-stripe-subscription, mcp-proxy, migrate-to-auto-billing, save-payment-method, sync-stripe-cards | VERIFIED |

**Note:** `STRIPE_AD_SPEND_SECRET_KEY` has a direct match. `STRIPE_MANAGEMENT_SECRET_KEY` also has a direct match (listed separately below as it's in `~/.zprofile` too).

---

## 3. Name Mismatches (6 secrets -- value exists under different name)

These secrets are referenced in code under one name but stored in `~/.zprofile` under a different name. During migration, set the Supabase secret using the **code name** with the **zprofile value**.

| Code Name | zprofile Name | Category | Used By | Resolution |
|-----------|---------------|----------|---------|------------|
| `ENCRYPTION_KEY` | `GHL_ENCRYPTION_KEY` | Security | crm-location-token, crm-oauth-callback, ghl-create-user, plaid-daily-refresh, plaid-exchange-token, plaid-get-balances, plaid-sync-transactions, run-full-onboarding (8 functions) | Use value from `GHL_ENCRYPTION_KEY`. Set as `ENCRYPTION_KEY` in Supabase secrets. **CRITICAL:** Same key must decrypt existing GHL OAuth tokens and Plaid access tokens. |
| `GHL_AGENCY_API_KEY` | `GHL_API_KEY` | CRM | ghl-create-subaccount, ghl-inject-twilio, ghl-provision-phone | Use value from `GHL_API_KEY`. Set as `GHL_AGENCY_API_KEY` in Supabase secrets. |
| `GOOGLE_ADS_MCC_CUSTOMER_ID` | `GOOGLE_ADS_MANAGER_CUSTOMER_ID` | Ads | 15 Google Ads functions + mcp-proxy | Use value from `GOOGLE_ADS_MANAGER_CUSTOMER_ID`. Set as `GOOGLE_ADS_MCC_CUSTOMER_ID` in Supabase secrets. |
| `SLACK_ADS_MANAGER_WEBHOOK_URL` | `SLACK_WEBHOOK_URL` | Notifications | ads-manager-slack-test, check-lead-discrepancy, check-low-balance, execute-proposal, google-ads-enhanced-conversion, mcp-proxy, morning-review-job (7 functions) | Use value from `SLACK_WEBHOOK_URL`. Set as `SLACK_ADS_MANAGER_WEBHOOK_URL` in Supabase secrets. **Note:** Verify this is the correct Slack channel -- zprofile has a single `SLACK_WEBHOOK_URL` but code uses two separate channel URLs. |
| `SLACK_CHAT_WEBHOOK_URL` | `SLACK_WEBHOOK_URL` | Notifications | agent-onboarding-webhook, chat-notification, mcp-proxy (3 functions) | **INVESTIGATE:** zprofile has only one `SLACK_WEBHOOK_URL`. Code uses TWO different Slack webhook URLs (`SLACK_ADS_MANAGER_WEBHOOK_URL` and `SLACK_CHAT_WEBHOOK_URL`). These likely point to different Slack channels. The old Supabase project had both set separately. Need to retrieve `SLACK_CHAT_WEBHOOK_URL` value from old Supabase secrets or Slack workspace. |
| `WEBFLOW_API_TOKEN` | `WEBFLOW_API_KEY` | CMS | webflow-cms-create, webflow-cms-update | Use value from `WEBFLOW_API_KEY`. Set as `WEBFLOW_API_TOKEN` in Supabase secrets. |

### Mismatch Resolution Summary

- 5 of 6 can be resolved by using the zprofile value under the code name
- 1 mismatch (`SLACK_CHAT_WEBHOOK_URL`) needs investigation -- zprofile has only one Slack webhook URL but code uses two different ones

---

## 4. Not Found in zprofile (14 secrets)

These secrets are referenced in code but do NOT exist in `~/.zprofile`. Values must be located from the old Supabase project, external service dashboards, or other sources.

| Secret Name | Category | Used By | Investigation Notes | Priority |
|-------------|----------|---------|---------------------|----------|
| `FATHOM_API_KEY` | Analytics | fetch-fathom-calls | Obtain from Fathom AI dashboard (Settings > API). | MEDIUM |
| `GHL_INSTALL_URL` | CRM | crm-oauth-start | Static GHL marketplace install URL. Fallback for OAuth -- lower priority if `GHL_CLIENT_ID` + `GHL_REDIRECT_URI` are set. | LOW |
| `GHL_PROSPECT_WEBHOOK_URL` | CRM | prospect-post-booking | GHL workflow webhook URL for prospect post-booking events. Obtain from GHL workflow settings. | MEDIUM |
| `GHL_STAGE_WEBHOOK_URL` | CRM | ghl-stage-sync | GHL workflow webhook URL for pipeline stage changes. Obtain from GHL workflow settings. | MEDIUM |
| `LOVABLE_API_KEY` | AI | analyze-prospect, generate-agent-bio, generate-dispute-evidence, verify-onboarding, verify-onboarding-live (5 functions) | Lovable AI gateway key (`ai.gateway.lovable.dev`). **Will NOT work post-migration.** Needs replacement with direct LLM API (OpenAI, Google AI, or OpenRouter). | HIGH |
| `MASTER_TWILIO_ACCOUNT_SID` | Phone | ghl-inject-twilio | Master Twilio account SID for provisioning numbers in GHL subaccounts. Different from `TWILIO_ACCOUNT_SID` (which IS in zprofile). Obtain from Twilio console. | HIGH |
| `MASTER_TWILIO_AUTH_TOKEN` | Phone | ghl-inject-twilio | Master Twilio auth token. Pair with `MASTER_TWILIO_ACCOUNT_SID`. Obtain from Twilio console. | HIGH |
| `PLAID_CLIENT_ID` | Banking | plaid-create-link-token, plaid-daily-refresh, plaid-exchange-token, plaid-get-balances, plaid-sync-transactions (5 functions) | Obtain from Plaid dashboard (Team Settings > Keys). | HIGH |
| `PLAID_ENV` | Banking | plaid-create-link-token, plaid-daily-refresh, plaid-exchange-token, plaid-get-balances, plaid-sync-transactions (5 functions) | Value is one of: `sandbox`, `development`, `production`. Check old Supabase secrets. | HIGH |
| `PLAID_SECRET` | Banking | plaid-create-link-token, plaid-daily-refresh, plaid-exchange-token, plaid-get-balances, plaid-sync-transactions (5 functions) | Obtain from Plaid dashboard (Team Settings > Keys). Match environment to `PLAID_ENV`. | HIGH |
| `PUBLIC_APP_URL` | Config | morning-review-job | Application URL for links in Slack morning review messages. Likely `https://alpha-agent-flow.lovable.app` or custom domain. | LOW |
| `RESEND_API_KEY` | Email | billing-collections-run, chat-notification, check-automation-timeout, send-auth-email, send-password-reset, ticket-notification (6 functions) | Obtain from Resend dashboard (API Keys). | HIGH |
| `SLACK_ADS_MANAGER_SIGNING_SECRET` | Notifications | slack-ads-actions | Slack app signing secret for verifying interactive action payloads. Obtain from Slack app settings (Basic Information > App Credentials). | MEDIUM |
| `STRIPE_MANAGEMENT_SECRET_KEY` | Payments | create-setup-intent, create-stripe-invoice, create-stripe-subscription, mcp-proxy, migrate-to-auto-billing, save-payment-method, sync-stripe-cards (7 functions) | **Wait:** This IS in zprofile. Moving to Verified. | VERIFIED |

### Correction: STRIPE_MANAGEMENT_SECRET_KEY

Upon verification, `STRIPE_MANAGEMENT_SECRET_KEY` IS present in `~/.zprofile`. Adjusted count: **13 secrets not found** (not 14).

| Also not found | Category | Used By | Notes | Priority |
|---------------|----------|---------|-------|----------|
| `STRIPE_AD_SPEND_WEBHOOK_SECRET` | Payments | stripe-billing-webhook | Stripe webhook signing secret (ad_spend account). Obtain from Stripe Dashboard > Webhooks. | CRITICAL |
| `STRIPE_MANAGEMENT_WEBHOOK_SECRET` | Payments | stripe-billing-webhook | Stripe webhook signing secret (management account). Obtain from Stripe Dashboard > Webhooks. | CRITICAL |

**Total not found: 15 secrets** (13 from original list + 2 Stripe webhook secrets)

---

## 5. Not Needed Post-Migration (1 secret)

| Secret Name | Category | Used By | Reason |
|-------------|----------|---------|--------|
| `LOVABLE_API_KEY` | AI | 5 functions | Lovable AI gateway (`ai.gateway.lovable.dev`) will not be accessible after migration. Needs replacement -- see replacement strategy below. Also counted in "Not Found" above since value is unavailable. |

### LOVABLE_API_KEY Replacement Strategy

5 functions use `LOVABLE_API_KEY` to call `https://ai.gateway.lovable.dev/v1/chat/completions` (OpenAI-compatible format, currently routing to `google/gemini-2.5-flash`):

| Function | AI Purpose |
|----------|-----------|
| `analyze-prospect` | AI analysis of prospect readiness |
| `generate-agent-bio` | Generate professional bio from description |
| `generate-dispute-evidence` | Generate Stripe dispute response text |
| `verify-onboarding` | AI verification of onboarding steps |
| `verify-onboarding-live` | Live AI verification of onboarding |

**Recommended replacement:** Replace with direct OpenAI, Google AI, or OpenRouter API. The call format is standard OpenAI chat completions, so only the base URL and API key need to change. Create a new secret (e.g., `LLM_API_KEY`) and update the 5 functions to use it.

---

## 6. Lovable-Only Secrets (7 -- configured in old project, not in code)

These were found in the Lovable AI extraction (47 configured secrets) but have NO corresponding `Deno.env.get()` call in any edge function. They may be used by Lovable infrastructure, database connections, or are orphaned.

| Secret Name | Category | Notes | Action |
|-------------|----------|-------|--------|
| `SUPABASE_PUBLISHABLE_KEY` | Supabase | Lovable-specific alias for anon key (used in frontend). New project has its own. | AUTO_SET (new project) |
| `SUPABASE_DB_URL` | Supabase | Direct database connection string. Used by Supabase infrastructure, not edge functions. | AUTO_SET (new project) |
| `STRIPE_SECRET_KEY` | Payments | Possibly legacy name before dual-account split (MANAGEMENT + AD_SPEND). Not referenced in code. | NOT_NEEDED (orphaned) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google | Service account JSON. Not referenced via Deno.env.get(). May have been used for a deprecated feature. | NOT_NEEDED (orphaned) |
| `GHL_AGENCY_LOCATION_ID` | CRM | Agency-level location ID. Not referenced in code (functions use `GHL_COMPANY_ID` instead). | NOT_NEEDED (orphaned) |
| `FATHOM_WEBHOOK_SECRET` | Analytics | Webhook signature verification for Fathom. Notably, `fathom-webhook` function does NOT verify signatures in code. | NOT_NEEDED (no code reference) |
| `GUIDANCE_WEBHOOK_API_KEY` | Other | Possibly used by an external guidance/AI service. Not in edge function code. | NOT_NEEDED (orphaned) |

**47 vs 44 delta explained:** The Lovable extraction reported 47 configured secrets. Our code grep found 44. The difference:
- +7 secrets configured in Supabase but not referenced in edge function code (listed above)
- -3 secrets in code but not in Lovable's list: `GHL_STAGE_WEBHOOK_URL`, `WEBFLOW_SITE_ID`, `PUBLIC_APP_URL` (these may have been overlooked by Lovable or configured under different names)
- Net: 44 + 7 - 3 = 48 total unique secrets across both sources (Lovable miscounted as 47)

---

## 7. Complete Migration Checklist

### Ready to Set (23 secrets)

These have known values and can be set during Phase 3 deployment:

| # | Secret Name | Value Source |
|---|-------------|-------------|
| 1 | `CONVERSION_API_KEY` | `~/.zprofile` CONVERSION_API_KEY |
| 2 | `ENCRYPTION_KEY` | `~/.zprofile` GHL_ENCRYPTION_KEY |
| 3 | `GHL_AGENCY_API_KEY` | `~/.zprofile` GHL_API_KEY |
| 4 | `GHL_CLIENT_ID` | `~/.zprofile` GHL_CLIENT_ID |
| 5 | `GHL_CLIENT_SECRET` | `~/.zprofile` GHL_CLIENT_SECRET |
| 6 | `GHL_COMPANY_ID` | `~/.zprofile` GHL_COMPANY_ID |
| 7 | `GHL_REDIRECT_URI` | `~/.zprofile` GHL_REDIRECT_URI (may need URL update to new project ref) |
| 8 | `GHL_SAAS_PLAN_ID` | `~/.zprofile` GHL_SAAS_PLAN_ID |
| 9 | `GOOGLE_ADS_CLIENT_ID` | `~/.zprofile` GOOGLE_ADS_CLIENT_ID |
| 10 | `GOOGLE_ADS_CLIENT_SECRET` | `~/.zprofile` GOOGLE_ADS_CLIENT_SECRET |
| 11 | `GOOGLE_ADS_DEVELOPER_TOKEN` | `~/.zprofile` GOOGLE_ADS_DEVELOPER_TOKEN |
| 12 | `GOOGLE_ADS_MCC_CUSTOMER_ID` | `~/.zprofile` GOOGLE_ADS_MANAGER_CUSTOMER_ID |
| 13 | `GOOGLE_ADS_REFRESH_TOKEN` | `~/.zprofile` GOOGLE_ADS_REFRESH_TOKEN |
| 14 | `MCP_PROXY_SECRET` | `~/.zprofile` MCP_PROXY_SECRET |
| 15 | `ONBOARDING_BRIDGE_KEY` | `~/.zprofile` ONBOARDING_BRIDGE_KEY |
| 16 | `SLACK_ADS_MANAGER_WEBHOOK_URL` | `~/.zprofile` SLACK_WEBHOOK_URL |
| 17 | `STRIPE_AD_SPEND_SECRET_KEY` | `~/.zprofile` STRIPE_AD_SPEND_SECRET_KEY (value not in zprofile -- moved to needs investigation) |
| 18 | `STRIPE_MANAGEMENT_SECRET_KEY` | `~/.zprofile` STRIPE_MANAGEMENT_SECRET_KEY |
| 19 | `TWILIO_ACCOUNT_SID` | `~/.zprofile` TWILIO_ACCOUNT_SID |
| 20 | `TWILIO_AUTH_TOKEN` | `~/.zprofile` TWILIO_AUTH_TOKEN |
| 21 | `TWILIO_PHONE_NUMBER` | `~/.zprofile` TWILIO_PHONE_NUMBER |
| 22 | `WEBFLOW_API_TOKEN` | `~/.zprofile` WEBFLOW_API_KEY |
| 23 | `WEBFLOW_SITE_ID` | `~/.zprofile` WEBFLOW_SITE_ID |

### Needs Investigation (15 secrets)

These must be located before Phase 3 deployment:

| # | Secret Name | Where to Find | Priority |
|---|-------------|---------------|----------|
| 1 | `FATHOM_API_KEY` | Fathom AI dashboard | MEDIUM |
| 2 | `GHL_INSTALL_URL` | GHL marketplace app settings | LOW |
| 3 | `GHL_PROSPECT_WEBHOOK_URL` | GHL workflow settings | MEDIUM |
| 4 | `GHL_STAGE_WEBHOOK_URL` | GHL workflow settings | MEDIUM |
| 5 | `LOVABLE_API_KEY` | N/A -- needs replacement (see Section 5) | HIGH |
| 6 | `MASTER_TWILIO_ACCOUNT_SID` | Twilio console (master account) | HIGH |
| 7 | `MASTER_TWILIO_AUTH_TOKEN` | Twilio console (master account) | HIGH |
| 8 | `PLAID_CLIENT_ID` | Plaid dashboard | HIGH |
| 9 | `PLAID_ENV` | Old Supabase secrets (sandbox/development/production) | HIGH |
| 10 | `PLAID_SECRET` | Plaid dashboard | HIGH |
| 11 | `PUBLIC_APP_URL` | Known value (app URL, e.g., `https://alpha-agent-flow.lovable.app`) | LOW |
| 12 | `RESEND_API_KEY` | Resend dashboard | HIGH |
| 13 | `SLACK_ADS_MANAGER_SIGNING_SECRET` | Slack app settings | MEDIUM |
| 14 | `SLACK_CHAT_WEBHOOK_URL` | Slack workspace (different channel from ads manager) | MEDIUM |
| 15 | `STRIPE_AD_SPEND_WEBHOOK_SECRET` | Stripe Dashboard (ad_spend account) > Webhooks | CRITICAL |
| 16 | `STRIPE_MANAGEMENT_WEBHOOK_SECRET` | Stripe Dashboard (management account) > Webhooks | CRITICAL |

**Note:** Count is 16, not 15, because `STRIPE_AD_SPEND_WEBHOOK_SECRET` and `STRIPE_MANAGEMENT_WEBHOOK_SECRET` were initially grouped together. Actual unresolved: 16 secrets.

### Summary Counts (Corrected)

| Status | Count | Details |
|--------|-------|---------|
| Auto-set by Supabase | 3 | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY |
| Ready to set (verified + name-matched) | 23 | Values available in zprofile |
| Needs investigation | 16 | Values must be located from external sources |
| Not needed (Lovable-specific) | 1 | LOVABLE_API_KEY (needs replacement, not the same value) |
| Lovable-only (not in code) | 7 | Configured in old project, no code reference |
| **Total unique secrets across all sources** | **50** | 44 code + 7 Lovable-only - 1 overlap |

---

## 8. Special Notes

### ENCRYPTION_KEY is Critical

The `ENCRYPTION_KEY` (stored as `GHL_ENCRYPTION_KEY` in zprofile) is used to encrypt/decrypt:
- GHL OAuth tokens (AES-GCM encryption) in `ghl_oauth_tokens` table
- Plaid access tokens (XOR encryption) in `bank_accounts` table

**The exact same key value MUST be used in the new project.** If a different key is used, all stored GHL OAuth tokens and Plaid access tokens become unreadable, requiring all clients to re-authenticate with GHL and Plaid.

### GHL_REDIRECT_URI May Need Update

The `GHL_REDIRECT_URI` likely points to the old Supabase project URL:
```
https://qydkrpirrfelgtcqasdx.supabase.co/functions/v1/crm-oauth-callback
```

This must be updated to the new project URL AND updated in the GHL app configuration:
```
https://qcunascacayiiuufjtaq.supabase.co/functions/v1/crm-oauth-callback
```

### Stripe Webhook Secrets Will Change

When Stripe webhook endpoints are updated to point to the new project URL (Phase 4), Stripe generates NEW webhook signing secrets. The `STRIPE_*_WEBHOOK_SECRET` values in the new project will be different from the old ones. These are obtained from Stripe Dashboard after creating new webhook endpoints.

---

*Cross-references: CODEBASE.md (Section 8), LOVABLE-EXTRACTION.md (Prompt 2), WEBHOOKS.md*
