# Phase 3: Backend Infrastructure - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy all server-side automation from the old Lovable-managed Supabase project to the new self-managed Supabase project. This includes 106 edge functions with 41 manual secrets, 6 cron jobs, 3 storage buckets (317 files), and 11 Realtime table publications. This is a 1:1 migration — replicate exactly what exists, no changes to behavior or security posture.

</domain>

<decisions>
## Implementation Decisions

### LLM Provider Replacement
- Replace Lovable AI gateway (`ai.gateway.lovable.dev`) with Anthropic API (Claude Sonnet 4.6)
- 5 functions affected: `analyze-prospect`, `generate-agent-bio`, `generate-dispute-evidence`, `verify-onboarding`, `verify-onboarding-live`
- Secret name: `LLM_API_KEY` (generic naming, not provider-specific)
- Code change required: convert from OpenAI chat completions format to Anthropic messages API format
- Anthropic API key already available — user will provide the value
- No special quality tuning needed — Sonnet 4.6 is an upgrade from Gemini 2.5 Flash, current behavior is fine

### Missing Secrets Strategy
- Locate ALL 16 missing secret values BEFORE deploying any functions
- User has access to all external service dashboards (Plaid, Resend, Twilio master, Fathom, Slack, GHL)
- Plan should include a guided secret-gathering step with dashboard URLs and instructions for each missing secret
- Stripe webhook secrets (2): set placeholder values during Phase 3. Real values will be generated in Phase 4 when new webhook endpoints are created
- LLM_API_KEY: user will provide Anthropic API key value

### Security Remediation
- NO security fixes during this migration — clean 1:1 transition only
- chat-attachments bucket: keep as PUBLIC (matching current production state)
- stripe-webhook and dispute-webhook: keep without signature verification (matching current state)
- admin-set-password: keep hardcoded secret `alpha-admin-2024` (matching current state)
- Full security audit to be done as a separate phase after migration is fully complete and verified

### App URL
- `PUBLIC_APP_URL` set to `https://hub.alphaagent.io` (staging subdomain)
- `hub.alphaagent.io` chosen as staging URL — matches app's internal name (AlphaHub)
- Whether to keep `hub.alphaagent.io` permanently or switch to `alphaagent.io` will be decided during Phase 5/6
- This URL currently only affects Slack morning review notification links

### Claude's Discretion
- Edge function deployment strategy (batch size, order)
- config.toml schedule key handling (must resolve before `supabase link`)
- Cron job creation timing (when to enable high-frequency jobs)
- Storage file migration script approach
- Verification depth for each function category

</decisions>

<specifics>
## Specific Ideas

- User wants a clean 1:1 transition — no changes, no "improvements," no fixes. Replicate exactly what exists, then do a full security audit later
- The Anthropic API key is already available in the user's environment
- User prefers guided walkthrough for locating missing secrets rather than doing it independently

</specifics>

<deferred>
## Deferred Ideas

- **Security Audit & Hardening** — Full security review of the entire app after migration is complete. Covers: chat-attachments bucket access, Stripe webhook signature verification, hardcoded secrets, and any other issues identified during migration
- **Permanent URL decision** — Whether production app lives at `hub.alphaagent.io` or `alphaagent.io` — decide during Phase 5/6

</deferred>

---

*Phase: 03-backend-infrastructure*
*Context gathered: 2026-02-27*
