# Plan 03-04 Summary: Secrets Gathering

## Status: COMPLETE

## What Was Done

### Task 1: Generate .env.secrets file with known values pre-filled
- Created `alphahub-v2/supabase/.env.secrets` with all secrets
- Auto-populated 20 secrets from `~/.zprofile` environment variables
- Found 2 additional matches in zprofile during checkpoint: `ANTHROPIC_API` → `LLM_API_KEY`, `SLACK_WEBHOOK_URL_DIALER_ALPHA` → `SLACK_CHAT_WEBHOOK_URL`
- File added to `.gitignore` (ephemeral -- will be deleted after upload)

### Task 2: Checkpoint -- User provided remaining values
- User provided 8 secret values: RESEND_API_KEY, MASTER_TWILIO_ACCOUNT_SID, MASTER_TWILIO_AUTH_TOKEN, STRIPE_AD_SPEND_SECRET_KEY, STRIPE_MANAGEMENT_SECRET_KEY, TWILIO_PHONE_NUMBER, SLACK_ADS_MANAGER_SIGNING_SECRET, FATHOM_API_KEY
- Removed 3 Plaid secrets (PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV) -- not in use
- Removed 3 optional GHL URL secrets (GHL_PROSPECT_WEBHOOK_URL, GHL_STAGE_WEBHOOK_URL, GHL_INSTALL_URL) -- code handles gracefully when not set; dynamic OAuth preferred

## Final File State

| Category | Count | Notes |
|----------|-------|-------|
| Auto-populated from zprofile | 20 | Verified non-empty |
| Known values | 1 | PUBLIC_APP_URL |
| User-provided | 10 | All filled |
| Stripe Phase 4 placeholders | 2 | Intentional -- set after webhook creation |
| **Total active secrets** | **33** | Ready for `supabase secrets set --env-file` |

## Deviations from Plan

1. **Plaid secrets removed**: User confirmed Plaid not in use. 3 secrets dropped (PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV).
2. **GHL optional URLs not set**: GHL_PROSPECT_WEBHOOK_URL, GHL_STAGE_WEBHOOK_URL, GHL_INSTALL_URL left unset (removed from file to prevent code from POSTing to literal "PLACEHOLDER" strings). Functions handle missing env vars gracefully.
3. **Secret count reduced from 41 to 33**: Net reduction of 6 secrets (3 Plaid + 3 GHL URLs) plus 2 that were already consolidated.
4. **GHL_REDIRECT_URI verified**: Points to `conscious.sysconscious.com` (custom domain), not old Supabase URL. No update needed for Phase 3; routing update is a Phase 6 cutover task.

## Key Findings

- **GHL OAuth ready**: All GHL credentials present. Existing encrypted tokens in `ghl_oauth_tokens` table migrated in Phase 2. ENCRYPTION_KEY matches zprofile value.
- **Google Ads OAuth ready**: All 5 tokens present. Stateless refresh token pattern -- no callback URLs involved.
- **MASTER_TWILIO credentials**: Same as TWILIO credentials (same account, not separate master/sub).

## Artifacts

- `alphahub-v2/supabase/.env.secrets` -- 33 secrets ready for bulk upload

## Commits

No code commits (file is gitignored and ephemeral).
