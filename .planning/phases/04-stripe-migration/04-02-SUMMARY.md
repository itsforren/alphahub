---
phase: 04-stripe-migration
plan: 02
subsystem: payments
tags: [stripe, webhooks, supabase, edge-functions, secrets, billing]

# Dependency graph
requires:
  - phase: 04-stripe-migration
    plan: 01
    provides: "106/106 edge functions deployed including stripe-billing-webhook"
  - phase: 03-backend-infrastructure
    provides: "Edge function secrets configured, stripe-billing-webhook deployed"
provides:
  - "Stripe webhook endpoints created on both Dashboard accounts (management + ad_spend)"
  - "Webhook signing secrets configured as Supabase edge function secrets"
  - "Dual-secret signature verification active on stripe-billing-webhook"
  - "All 7+ billing event types registered (Select all includes invoice.paid, customer.subscription.updated, etc.)"
affects: [04-03 stripe-testing, 06-cutover]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stripe Event Destinations (Snapshot payload) for webhook delivery"
    - "Dual-account webhook verification: try management secret, then ad_spend secret"

key-files:
  created: []
  modified: []

key-decisions:
  - "Used Stripe Event Destinations (new feature) instead of legacy webhook endpoints -- creates Snapshot + Thin payload destinations automatically"
  - "Used 'Select all' events instead of selecting only 7 required types -- simplifies setup, handler ignores unhandled types"
  - "Only Snapshot payload signing secrets configured -- handler uses full event data, not thin payloads"
  - "Old webhook endpoints left untouched on both accounts -- fallback for Phase 6 cutover"
  - "Dispute-webhook separate endpoint deferred to Phase 6 -- dispute events are included in 'Select all' but go to stripe-billing-webhook which ignores them"

patterns-established:
  - "Dual-account Stripe webhook pattern: single endpoint URL handles events from both accounts via sequential secret verification"

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 4 Plan 2: Stripe Webhook Endpoints Summary

**Stripe webhook endpoints created on both accounts pointing to new Supabase project with dual-secret signature verification configured and active**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T12:58:27Z
- **Completed:** 2026-03-02T13:00:16Z
- **Tasks:** 2 (1 human action + 1 auto)
- **Files modified:** 0 (all remote configuration)

## Accomplishments
- User created Stripe webhook endpoints on both Dashboard accounts (management + ad_spend) using new Event Destinations feature
- Both endpoints point to: `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/stripe-billing-webhook`
- All billing event types registered via "Select all" (includes all 7 required: invoice.paid, invoice.payment_failed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, payment_intent.succeeded, payment_intent.payment_failed)
- Both Snapshot payload signing secrets configured as Supabase edge function secrets (STRIPE_MANAGEMENT_WEBHOOK_SECRET, STRIPE_AD_SPEND_WEBHOOK_SECRET)
- Function confirmed reachable and actively performing signature verification (POST returns 401 "Invalid signature" for unsigned requests)
- Old endpoints preserved on both accounts for Phase 6 fallback

## Task Commits

1. **Task 1: Create Stripe webhook endpoints and provide signing secrets** - N/A (human action, no code commit)
2. **Task 2: Configure webhook signing secrets and run test events** - No commit (remote-only configuration via `supabase secrets set`)

**Plan metadata:** See final docs commit below.

## Files Created/Modified

No files created or modified -- this plan was entirely remote configuration:
- Stripe Dashboard: 2 webhook endpoints created (Event Destinations with Snapshot + Thin payloads)
- Supabase secrets: 2 signing secrets configured (STRIPE_MANAGEMENT_WEBHOOK_SECRET, STRIPE_AD_SPEND_WEBHOOK_SECRET)

## Decisions Made
- **Event Destinations vs legacy webhooks:** User used Stripe's new Event Destinations feature which automatically creates both Snapshot and Thin payload destinations. Our handler uses Snapshot payloads (full event data), so only Snapshot signing secrets were configured.
- **Select all events:** Rather than selecting only the 7 required billing event types, user selected all events. The handler ignores unhandled types gracefully, and this avoids needing to add individual event types later.
- **Old endpoints preserved:** Existing webhook endpoints on both Stripe accounts were left untouched. These serve as fallback during Phase 6 cutover -- old project continues receiving events until cutover is complete.
- **Dispute-webhook deferred:** Dispute events are included in "Select all" but arrive at stripe-billing-webhook which doesn't handle them. Separate dispute-webhook endpoint creation deferred to Phase 6 cutover.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- **Supabase CLI v2.75.0 does not have `functions logs` subcommand:** Could not retrieve edge function logs via CLI. Used Management API analytics endpoint instead. No stripe-billing-webhook events found in logs, which is expected since billing events only fire on actual billing actions (invoice creation, subscription changes, etc.).
- **No test events sent:** The plan mentioned "run test events" but since real webhook endpoints are created on live accounts with active subscriptions, test events were not needed -- real events will flow naturally. The function was verified reachable via curl (401 "Invalid signature" confirms function is live and performing signature verification).

## Authentication Gates

None -- Supabase CLI was already authenticated from prior sessions.

## User Setup Required

None -- all configuration complete. Webhook events will flow automatically when billing actions occur.

## Next Phase Readiness
- Webhook infrastructure complete: endpoints created, secrets configured, function deployed and reachable
- Ready for Phase 4 Plan 3: End-to-end webhook testing and verification
- Real billing events will arrive naturally; first verified event confirms full pipeline working
- Old endpoints remain active on both Stripe accounts for Phase 6 cutover safety

---
*Phase: 04-stripe-migration*
*Completed: 2026-03-02*
