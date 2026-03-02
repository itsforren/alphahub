# Phase 4: Stripe Migration - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Re-point both Stripe accounts' (management fees and ad spend) webhook endpoints to the new Supabase edge function URLs, configure signing secrets, and verify billing flows end-to-end. Both accounts handle all event types (payments, disputes, subscriptions, etc.) through their respective webhooks.

</domain>

<decisions>
## Implementation Decisions

### Switchover Approach
- Switch both Stripe accounts (management + ad spend) at the same time, not sequentially
- User thinks of it as 2 webhooks (one per Stripe account), each catching all event types — the code-level breakdown of multiple edge functions is an implementation detail
- Claude decides: parallel endpoints (new alongside old) vs hard switch — pick the safest technical approach

### Webhook Security
- Signature verification hardening on legacy webhooks: **DEFERRED** — not part of this phase
- admin-set-password hardcoded secret ('alpha-admin-2024'): **FIX NOW** — move to env var as a quick win during this phase

### Verification Depth
- Two-stage verification: Stripe test events first (quick validation), then a real small-amount transaction (full confidence)
- Full chain verification for ad spend: payment → wallet update → Google Ads budget sync → all downstream effects
- Verification stages: Claude runs and reports test event results, user personally verifies the real transaction
- Test account: use James Warren's account for the real transaction test

### Fallback Strategy
- Keep old webhook endpoints active as fallback during testing period
- Old endpoints remain until Phase 6 cutover — disable them during full cutover, not during this phase
- **CRITICAL CONSTRAINT:** No double-processing of live billing events. Both old and new endpoints active simultaneously must NOT cause duplicate billing records, double charges, or double wallet updates. Claude must solve this technically (test mode isolation, dry-run mode, idempotency, or other approach)

### Claude's Discretion
- Parallel endpoints vs hard switch approach (pick safest)
- Whether to verify cron→Stripe flow (auto-recharge-run) as part of this phase
- Technical approach to prevent double-processing during parallel endpoint period
- Which legacy webhook functions (stripe-webhook, dispute-webhook) are still receiving live events vs superseded by stripe-billing-webhook

</decisions>

<specifics>
## Specific Ideas

- User conceptualizes Stripe setup as "2 webhooks, one per account, each catches everything" — implementation should match this mental model
- Full chain verification means more than just "200 OK from webhook" — it means tracing the effect through the entire system (wallet → Google Ads → etc.)
- James Warren is the user's own account — safe for test transactions

</specifics>

<deferred>
## Deferred Ideas

- Data freshness / delta sync at switchover — Phase 6 (Cutover & Verification)
- Stripe signature verification on legacy webhooks — security hardening pass (post-migration)
- Stripe price ID investigation (may be hardcoded in edge functions) — investigate during planning/research for this phase

</deferred>

---

*Phase: 04-stripe-migration*
*Context gathered: 2026-03-01*
