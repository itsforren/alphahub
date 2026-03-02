# Phase 4: Stripe Migration - Research

**Researched:** 2026-03-01
**Domain:** Stripe webhook migration, dual-account billing, idempotent event processing
**Confidence:** HIGH

## Summary

Phase 4 migrates two Stripe accounts' webhook endpoints from the old Supabase project (`qydkrpirrfelgtcqasdx`) to the new one (`qcunascacayiiuufjtaq`). The codebase has three webhook handler functions: `stripe-billing-webhook` (primary, with signature verification), `stripe-webhook` (legacy conversion tracking, no signature verification), and `dispute-webhook` (dispute handling, no signature verification). Both Stripe accounts currently point all their webhooks at the old project URL.

The critical constraint is preventing double-processing of live billing events when both old and new endpoints are active simultaneously. After deep code analysis, all three webhook handlers already have robust idempotency guards: `stripe-billing-webhook` checks `record.status === 'paid'`, deduplicates by `stripe_invoice_id`, and checks for existing deposits by `billing_record_id`; `stripe-webhook` deduplicates by `transaction_id` in the `conversions` table; `dispute-webhook` deduplicates by `stripe_dispute_id` in the `disputes` table. This means the parallel endpoint approach is safe because both old and new endpoints hitting the same shared database will naturally deduplicate.

The investigation into hardcoded Stripe price IDs (a deferred concern) is now resolved: price IDs are dynamically created per subscription in `create-stripe-subscription` and stored in `client_stripe_subscriptions.stripe_price_id`. No hardcoded price IDs exist in the codebase.

**Primary recommendation:** Use parallel endpoints (add new alongside old) since all webhook handlers are already idempotent against the shared database. Switch both accounts simultaneously. Test with Stripe test events first, then a real small-amount transaction on James Warren's account.

## Standard Stack

This phase is primarily a configuration/operational task, not a library integration task. The tools involved are:

### Core
| Tool | Purpose | Why Standard |
|------|---------|--------------|
| Stripe Dashboard | Create/manage webhook endpoints for both accounts | Only way to configure webhook URLs and obtain signing secrets |
| Supabase CLI (`supabase secrets set`) | Configure webhook signing secrets | Standard secret management for edge functions |
| Stripe CLI (`stripe trigger`) | Send test events to verify endpoints | Official Stripe testing tool |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `curl` | Direct HTTP testing of edge function endpoints | Quick smoke tests before full Stripe integration |
| Supabase Dashboard (Logs) | Monitor edge function invocation logs | Verify webhook events are being received and processed |

### No Library Changes Needed
The edge functions use raw `fetch()` to call `https://api.stripe.com/v1/*` with `Authorization: Bearer` headers. No Stripe SDK is used. The webhook signature verification in `stripe-billing-webhook` uses `crypto.subtle` (Deno built-in). No new dependencies are needed.

## Architecture Patterns

### Current Webhook Architecture

```
Stripe Management Account
  |
  +-- webhook endpoint --> stripe-billing-webhook (old URL)
  +-- webhook endpoint --> stripe-webhook (old URL, legacy)
  +-- webhook endpoint --> dispute-webhook (old URL)

Stripe Ad Spend Account
  |
  +-- webhook endpoint --> stripe-billing-webhook (old URL)
  +-- webhook endpoint --> stripe-webhook (old URL, legacy)
  +-- webhook endpoint --> dispute-webhook (old URL)
```

### Target Architecture (Same function names, new URLs)

```
Stripe Management Account
  |
  +-- NEW webhook endpoint --> stripe-billing-webhook (new URL)
  +-- Keep old endpoint active as fallback (disable in Phase 6)

Stripe Ad Spend Account
  |
  +-- NEW webhook endpoint --> stripe-billing-webhook (new URL)
  +-- Keep old endpoint active as fallback (disable in Phase 6)
```

### Pattern: Parallel Endpoints with Shared Database Idempotency

**What:** Add new webhook endpoints in Stripe Dashboard pointing to new Supabase project URLs. Keep old endpoints active. Both endpoints deliver events to their respective handlers, but since both old and new projects share the same database (migrated in Phase 2), the idempotency guards prevent double-processing.

**Why this is safe (code-level evidence):**

1. **`stripe-billing-webhook` idempotency (7 guards):**
   - `invoice.paid`: Checks `record.status === 'paid'` before processing (line 246-249)
   - `invoice.paid` (subscription): Checks `existingByInvoice` by `stripe_invoice_id` (line 280-299)
   - `invoice.paid` (one-off): Checks `existingDeposit` by `billing_record_id` + `transaction_type='deposit'` (line 443-449)
   - `payment_intent.succeeded`: Checks `record.status === 'paid'` (line 942-944)
   - `payment_intent.succeeded`: Checks `existingDeposit` (line 978-984)
   - `customer.subscription.updated`: Checks `existingRecord` by `stripe_subscription_id` + `billing_period_start` (line 784-790)
   - `invoice.upcoming`: Checks `existingRecord` by `stripe_subscription_id` + `billing_period_start` (line 882-891)

2. **`stripe-webhook` idempotency (1 guard):**
   - `checkout.session.completed` / `payment_intent.succeeded`: Checks `existingConversion` by `transaction_id` (line 73-89)

3. **`dispute-webhook` idempotency (1 guard):**
   - All dispute events: Checks `existingDispute` by `stripe_dispute_id` (line 97-103). If exists, updates status rather than creating duplicate.

**Critical detail:** Both old and new Supabase projects connect to the SAME database (the new one, migrated in Phase 2). The old project's edge functions still write to the old database (unless bridge function routes them). However, since we are adding NEW endpoints (not changing old ones), the new endpoint handlers run on the new project against the new database. The old endpoints continue hitting the old project/database. This means during the parallel period, events go to BOTH databases -- but only the new database matters going forward. The old endpoints become irrelevant once we stop looking at the old database.

**WAIT -- Correction:** Re-reading the architecture: the old project's edge functions connect to the OLD database. The new project's edge functions connect to the NEW database. During parallel operation, the same Stripe event would be processed by BOTH projects against DIFFERENT databases. This is actually NOT a double-processing problem for the new system -- it's just the old system continuing to do what it always did. The new system processes independently. There's no cross-database conflict.

**Recommendation:** Parallel endpoints are safe. The only risk is if someone looks at the OLD database for billing status while the NEW database is the source of truth. This is a human workflow issue, not a technical one.

### Pattern: Signature Verification with Dual Secrets

**What:** `stripe-billing-webhook` tries both `STRIPE_MANAGEMENT_WEBHOOK_SECRET` and `STRIPE_AD_SPEND_WEBHOOK_SECRET` to determine which account sent the event.

**Code (lines 145-158):**
```typescript
const managementSecret = Deno.env.get('STRIPE_MANAGEMENT_WEBHOOK_SECRET') || '';
const adSpendSecret = Deno.env.get('STRIPE_AD_SPEND_WEBHOOK_SECRET') || '';

let verifiedAccount: 'management' | 'ad_spend' | null = null;
if (managementSecret && await verifySignature(body, signature, managementSecret)) {
  verifiedAccount = 'management';
} else if (adSpendSecret && await verifySignature(body, signature, adSpendSecret)) {
  verifiedAccount = 'ad_spend';
}

if (!verifiedAccount) {
  return jsonResponse({ error: 'Invalid signature' }, 401);
}
```

**Implication:** When new webhook endpoints are created in Stripe, NEW signing secrets are generated. These MUST be set as Supabase secrets on the new project BEFORE the new endpoints start receiving events. Otherwise, every event will fail signature verification with a 401 response.

### Anti-Patterns to Avoid

- **Updating the old endpoint URL instead of creating a new one:** This would break signature verification (old signing secret no longer matches) and eliminate the fallback. Always create a NEW endpoint.
- **Setting webhook secrets before creating the Stripe endpoint:** The signing secret is generated BY Stripe when the endpoint is created. You must create the endpoint first, copy the secret, then set it in Supabase.
- **Forgetting to register all required event types on new endpoints:** The new endpoint must listen for the same event types as the old one.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom crypto | Existing `verifySignature()` function in `stripe-billing-webhook` | Already implemented correctly using HMAC-SHA256 via `crypto.subtle`. Battle-tested in production. |
| Stripe event type filtering | Custom event router | Stripe Dashboard event type selection | Register only the needed events in Stripe Dashboard rather than filtering in code |
| Idempotency for billing events | Custom dedup system | Existing database-level checks | All three webhook handlers already have idempotency guards checking `status`, `stripe_invoice_id`, `transaction_id`, `stripe_dispute_id` |
| Test event generation | Custom test scripts | Stripe CLI `stripe trigger` or Dashboard test events | Stripe provides official test event tools that generate properly formatted events |

**Key insight:** This phase is primarily an operations/configuration phase, not a coding phase. The edge function code is already correct and deployed. The work is: create Stripe endpoints, configure secrets, verify the flow.

## Common Pitfalls

### Pitfall 1: Webhook Secret Timing
**What goes wrong:** Setting up the Stripe endpoint URL but forgetting to immediately copy the signing secret and set it in Supabase. Events start arriving, signature verification fails, all events return 401.
**Why it happens:** The Stripe Dashboard shows the signing secret only briefly after endpoint creation (you must click "Reveal" to see it).
**How to avoid:** Immediately after creating each endpoint in Stripe Dashboard: (1) Click "Reveal" to see the signing secret, (2) Copy it, (3) Run `supabase secrets set STRIPE_*_WEBHOOK_SECRET=whsec_...` before doing anything else.
**Warning signs:** Edge function logs showing `"Webhook signature verification failed"` / 401 responses.

### Pitfall 2: Missing Event Types on New Endpoint
**What goes wrong:** New endpoint only receives some events. Subscriptions update but invoices don't trigger billing records, or disputes don't create alerts.
**Why it happens:** When creating a new webhook endpoint in Stripe, you must explicitly select which event types to listen for. If you miss some, those events never reach the new endpoint.
**How to avoid:** Register these exact event types for `stripe-billing-webhook`:
  - `invoice.paid`
  - `invoice.payment_failed`
  - `invoice.payment_action_required`
  - `invoice.upcoming`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `payment_intent.succeeded`

For `dispute-webhook` (if kept as separate endpoint):
  - `charge.dispute.created`
  - `charge.dispute.updated`
  - `charge.dispute.closed`
  - `charge.dispute.funds_reinstated`
  - `charge.dispute.funds_withdrawn`

For `stripe-webhook` (legacy, if still active):
  - `checkout.session.completed`
  - `payment_intent.succeeded`
**Warning signs:** Some billing events showing in Stripe Dashboard as "sent" but no corresponding processing in edge function logs.

### Pitfall 3: Testing Against Production Data
**What goes wrong:** Test invoice charges a real client's card, or test event creates duplicate billing records in production database.
**Why it happens:** Stripe test events from the Dashboard use fake data. But manually creating a test invoice on a real customer in live mode actually charges their card.
**How to avoid:** Stage 1 verification uses Stripe Dashboard "Send test webhook" feature (fake data, no real charges). Stage 2 uses James Warren's account (user's own account) with a real small-amount transaction.
**Warning signs:** Unexpected billing records appearing for real clients during testing.

### Pitfall 4: Forgetting admin-set-password Fix
**What goes wrong:** The `admin-set-password` function still uses hardcoded secret `'alpha-admin-2024'` instead of an environment variable.
**Why it happens:** It's a quick-win side task that could be forgotten among the Stripe work.
**How to avoid:** Include it as an explicit task in the plan. The fix is: replace `admin_secret !== 'alpha-admin-2024'` with `admin_secret !== Deno.env.get('ADMIN_SET_PASSWORD_SECRET')` and set the secret via `supabase secrets set ADMIN_SET_PASSWORD_SECRET=...`.
**Warning signs:** Code review showing hardcoded secret still present.

### Pitfall 5: Not Deploying Remaining 6 Functions First
**What goes wrong:** Some billing flows depend on functions that weren't deployed due to the old free-tier limit (now resolved with Pro upgrade).
**Why it happens:** Pro upgrade was done during Phase 5, but the 6 functions were never actually deployed.
**How to avoid:** Deploy the 6 remaining functions at the start of Phase 4 (or as a prerequisite): `verify-google-ads-campaign`, `verify-lead-delivery`, `verify-onboarding-live`, `verify-onboarding`, `webflow-cms-create`, `webflow-cms-update`.
**Warning signs:** 404 errors when the billing chain tries to call verification functions.

## Code Examples

### Verified: How stripe-billing-webhook Determines Account (from source code)
```typescript
// Source: alphahub-v2/supabase/functions/stripe-billing-webhook/index.ts lines 109-130
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const parts = signature.split(',');
  const timestampPart = parts.find(p => p.startsWith('t='));
  const sigPart = parts.find(p => p.startsWith('v1='));
  if (!timestampPart || !sigPart) return false;

  const timestamp = timestampPart.split('=')[1];
  const expectedSig = sigPart.split('=')[1];
  const payload = `${timestamp}.${body}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );

  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const computedSig = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  return computedSig === expectedSig;
}
```

### Verified: Full Ad Spend Payment Chain
```
auto-recharge-run (cron, daily 6AM UTC)
  |-- queries client_wallets where billing_mode='auto_stripe' AND auto_billing_enabled=true
  |-- computes wallet balance (deposits - tracked spend)
  |-- if balance <= threshold:
  |     |-- creates billing_record (type='ad_spend', status='pending')
  |     |-- calls create-stripe-invoice(billing_record_id)
  |           |-- creates Stripe PaymentIntent (for ad_spend with card on file)
  |           |-- if succeeded:
  |           |     |-- marks billing_record as 'paid'
  |           |     |-- creates wallet_transaction (deposit)
  |           |     |-- calls restoreCampaignBudgetIfSafeMode()
  |           |           |-- calls update-google-ads-budget
  |           |-- if webhook needed (async payment):
  |                 |-- stripe-billing-webhook receives payment_intent.succeeded
  |                       |-- marks billing_record as 'paid'
  |                       |-- creates wallet_transaction (deposit)
  |                       |-- calls restoreCampaignBudgetIfSafeMode()
```

### Verified: admin-set-password Fix Pattern
```typescript
// CURRENT (hardcoded, line 22):
if (admin_secret !== 'alpha-admin-2024') {

// FIX TO:
const expectedSecret = Deno.env.get('ADMIN_SET_PASSWORD_SECRET');
if (!expectedSecret || admin_secret !== expectedSecret) {
```

### Setting Webhook Secrets via CLI
```bash
# After creating new endpoints in Stripe Dashboard and copying the signing secrets:
supabase secrets set STRIPE_MANAGEMENT_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXX
supabase secrets set STRIPE_AD_SPEND_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXX
```

## Key Investigation Results

### RESOLVED: Stripe Price IDs Are NOT Hardcoded

The pending concern from STATE.md ("Stripe price IDs may be hardcoded in edge functions") is resolved.

**Finding:** Price IDs are dynamically created in `create-stripe-subscription` (line 372-387) using `POST /v1/prices` with custom parameters per subscription. They are stored in `client_stripe_subscriptions.stripe_price_id` column (created in migration `20260218043100`). No `STRIPE_MANAGEMENT_PRICE_ID` or `STRIPE_AD_SPEND_PRICE_ID` environment variables exist or are needed.

**Confidence:** HIGH -- verified by code grep showing only 3 references to `price_id`, all dynamic reads/writes.

### RESOLVED: Legacy Webhook Functions Status

**`stripe-webhook`** handles `checkout.session.completed` and `payment_intent.succeeded` for conversion tracking (visitor attribution). It writes to the `conversions` table. It does NOT handle billing records, wallet deposits, or subscriptions. It is separate from the billing flow.

**`dispute-webhook`** handles `charge.dispute.*` events. It writes to the `disputes` table and creates `system_alerts`. It is separate from the billing flow.

**Both lack signature verification** but this is a DEFERRED item (not this phase per CONTEXT.md). During this migration, they should still be pointed at the new URL to ensure events reach the new database, but signature verification hardening is out of scope.

### RESOLVED: Double-Processing Risk Assessment

**Risk level: LOW** -- Both databases are separate (old project DB and new project DB). During the parallel endpoint period:
- Old endpoints deliver to old project functions which write to OLD database
- New endpoints deliver to new project functions which write to NEW database
- There is no cross-database write conflict
- The old database becomes irrelevant once migration is complete
- Within each database, all handlers are idempotent (9 total guards identified)

The only edge case: if a Stripe event is delivered to the new endpoint while the new project's webhook secret is still a placeholder, the event will be rejected with 401. Stripe will retry (up to 3 days in live mode with exponential backoff), so as long as the real secret is configured within hours, no events are permanently lost.

### Webhook Event Types Summary

| Function | Event Types | Signature Verified |
|----------|------------|-------------------|
| `stripe-billing-webhook` | `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, `invoice.upcoming`, `customer.subscription.updated`, `customer.subscription.deleted`, `payment_intent.succeeded` | YES (HMAC-SHA256) |
| `stripe-webhook` | `checkout.session.completed`, `payment_intent.succeeded` | NO |
| `dispute-webhook` | `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`, `charge.dispute.funds_reinstated`, `charge.dispute.funds_withdrawn` | NO |

### Cron Job: auto-recharge-run Verification

The `auto-recharge-run` cron job (daily at 6AM UTC) is the key automated billing flow. It:
1. Queries `client_wallets` for clients needing recharge
2. Calls `create-stripe-invoice` which uses `STRIPE_AD_SPEND_SECRET_KEY`
3. The Stripe API keys are the same regardless of which Supabase project calls them
4. The cron job on the new project was already configured in Phase 3 (pg_cron + vault)

This flow should be verified as part of this phase since it exercises the full ad spend chain.

### Remaining 6 Functions (Blocked Until Pro Upgrade, Now Unblocked)

Per STATE.md, the Supabase Pro upgrade is complete. These 6 functions need deployment:
- `verify-google-ads-campaign`
- `verify-lead-delivery`
- `verify-onboarding-live`
- `verify-onboarding`
- `webflow-cms-create`
- `webflow-cms-update`

None of these are directly in the Stripe billing path, but they should be deployed as a cleanup task during this phase since they are now unblocked.

## Operational Procedure: Stripe Dashboard Webhook Setup

### For Each Stripe Account (Management + Ad Spend):

1. **Navigate:** Stripe Dashboard > Developers > Webhooks
2. **Click:** "Add endpoint" (creates NEW endpoint, keeps old one)
3. **Endpoint URL:** `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/stripe-billing-webhook`
4. **Select events:** All 7 events listed in the table above for stripe-billing-webhook
5. **Click:** "Add endpoint" to save
6. **Immediately:** Click "Reveal" next to "Signing secret" to copy `whsec_...` value
7. **Run:** `supabase secrets set STRIPE_*_WEBHOOK_SECRET=whsec_...`

Repeat for the dispute-webhook endpoint if disputes are configured as a separate endpoint:
- **Endpoint URL:** `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/dispute-webhook`
- **Events:** 5 dispute events

Repeat for stripe-webhook if still receiving live events:
- **Endpoint URL:** `https://qcunascacayiiuufjtaq.supabase.co/functions/v1/stripe-webhook`
- **Events:** `checkout.session.completed`, `payment_intent.succeeded`

### Decision: Legacy Functions (stripe-webhook, dispute-webhook)

**Recommendation (Claude's discretion):** Create new endpoints for ALL three webhook functions, not just `stripe-billing-webhook`. Reason: even though `stripe-webhook` and `dispute-webhook` lack signature verification, they still process events that write to the database. If we only migrate `stripe-billing-webhook`, disputes and conversion tracking will continue writing to the OLD database instead of the new one.

However, the user's mental model is "2 webhooks, one per account." The implementation detail of 3 functions per account should be presented as "each Stripe account needs endpoints for billing, disputes, and conversion tracking" or consolidated into fewer endpoints if the Stripe Dashboard allows routing multiple event types to one URL.

**Simplest approach:** Create ONE webhook endpoint per Stripe account pointing to `stripe-billing-webhook`, and register ALL event types (billing + dispute + checkout). The `stripe-billing-webhook` code already gracefully handles unknown events (returns `{ received: true }` for any unhandled type). Then, dispute events and checkout events can be handled by adding handlers to `stripe-billing-webhook` or left unhandled on the new project until Phase 6 cutover addresses the legacy functions.

**RECOMMENDED approach:** Create separate endpoints for each function to maintain the current architecture. This is cleaner and avoids modifying code during a migration phase.

## Verification Strategy

### Stage 1: Stripe Test Events (No Real Charges)
1. In Stripe Dashboard, go to each new webhook endpoint
2. Click "Send test webhook"
3. Select each event type and send
4. Verify in Supabase edge function logs that the event was received
5. For `stripe-billing-webhook`: verify 200 response and signature verification passed
6. For `dispute-webhook`: verify event was received (will fail gracefully with no matching data)

### Stage 2: Real Small-Amount Transaction (James Warren's Account)
1. Find James Warren's client record in the database
2. Create a small-amount billing record (e.g., $1 ad spend deposit)
3. Trigger `create-stripe-invoice` for that record
4. Verify: billing_record updated to 'paid', wallet_transaction created, wallet balance increased
5. User personally verifies the charge in their Stripe account / bank

### Stage 3: Monitor Live Subscriptions
1. Wait for natural subscription events to fire (70+ active subscriptions)
2. Monitor new endpoint logs for incoming events
3. Verify billing records are being created/updated in new database
4. Compare event counts between old and new endpoints

## Open Questions

1. **Which Stripe account are the legacy webhooks (stripe-webhook, dispute-webhook) registered on?**
   - What we know: The WEBHOOKS.md inventory says "check both accounts" for these functions
   - What's unclear: Whether they are actually registered on both accounts or just one
   - Recommendation: Check the Stripe Dashboard for both accounts during implementation. Only create new endpoints where old ones actually exist.

2. **Are the remaining 6 edge functions needed before Stripe testing?**
   - What we know: None are in the direct Stripe billing path
   - What's unclear: Whether any Stripe billing flow indirectly calls them
   - Recommendation: Deploy them first as a quick cleanup task. Low risk, removes uncertainty.

3. **How will the user access the Stripe Dashboard for both accounts?**
   - What we know: Two separate Stripe accounts (management + ad_spend) with separate logins
   - What's unclear: Whether the user has direct dashboard access or needs to share credentials
   - Recommendation: The user performs Stripe Dashboard operations; Claude provides exact steps and verifies results.

## Sources

### Primary (HIGH confidence)
- Source code analysis: `alphahub-v2/supabase/functions/stripe-billing-webhook/index.ts` (1018 lines, complete read)
- Source code analysis: `alphahub-v2/supabase/functions/stripe-webhook/index.ts` (165 lines, complete read)
- Source code analysis: `alphahub-v2/supabase/functions/dispute-webhook/index.ts` (205 lines, complete read)
- Source code analysis: `alphahub-v2/supabase/functions/auto-recharge-run/index.ts` (261 lines, complete read)
- Source code analysis: `alphahub-v2/supabase/functions/create-stripe-invoice/index.ts` (463 lines, complete read)
- Source code analysis: `alphahub-v2/supabase/functions/create-stripe-subscription/index.ts` (545 lines, complete read)
- Source code analysis: `alphahub-v2/supabase/functions/admin-set-password/index.ts` (63 lines, complete read)
- Source code analysis: `alphahub-v2/supabase/functions/get-stripe-config/index.ts` (19 lines, complete read)
- `.planning/inventories/WEBHOOKS.md` - Complete webhook inventory
- `.planning/inventories/SECRETS.md` - Complete secrets inventory
- `.planning/inventories/CODEBASE.md` - Edge function inventory
- `.planning/phases/04-stripe-migration/04-CONTEXT.md` - User decisions
- `.planning/STATE.md` - Project state and accumulated context
- `.planning/phases/03-backend-infrastructure/03-VERIFICATION.md` - Phase 3 verification results

### Secondary (MEDIUM confidence)
- [Stripe Webhook Documentation](https://docs.stripe.com/webhooks) - Best practices, retry behavior, signature verification
- [Stripe Webhook Endpoints API](https://docs.stripe.com/api/webhook_endpoints) - Endpoint creation, up to 16 per account
- [Stripe Dashboard Webhook Setup](https://docs.stripe.com/development/dashboard/webhooks) - UI-based endpoint creation

### Tertiary (LOW confidence)
- WebSearch results on parallel webhook migration patterns - general guidance, not Stripe-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All based on direct source code analysis and Stripe official docs
- Architecture: HIGH - Complete code review of all 3 webhook handlers + 3 billing functions
- Pitfalls: HIGH - Derived from actual code patterns and known Stripe behavior
- Double-processing analysis: HIGH - 9 idempotency guards identified with line numbers
- Price ID investigation: HIGH - Resolved via code grep (0 hardcoded, 3 dynamic references)
- Legacy function status: HIGH - Complete read of both functions confirms behavior

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable -- no library upgrades involved, primarily operational work)
