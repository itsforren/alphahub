# Alpha Hub — Billing & Stripe System

> Complete reference for how billing, payments, wallets, and Stripe integration work.

## Dual Stripe Account Architecture

Alpha Hub uses **two completely separate Stripe accounts**, each with its own API key, webhook secret, and customer records:

| Account | Purpose | Env Var | Billing Type |
|---------|---------|---------|-------------|
| **Management** | Monthly management fees ($1,497/mo per client) | `STRIPE_MANAGEMENT_SECRET_KEY` | `management` |
| **Ad Spend** | Client ad budget deposits and wallet recharges | `STRIPE_AD_SPEND_SECRET_KEY` | `ad_spend` |

**Account routing logic:**
```typescript
stripeAccount = record.billing_type === 'management' ? 'management' : 'ad_spend'
```

**Integration pattern:** All Stripe calls use raw `fetch()` to `https://api.stripe.com/v1/...` — no Stripe SDK.

## Database Schema

### billing_records
The central billing table — every charge, subscription payment, and invoice gets a record here.

| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Primary key |
| client_id | UUID FK | Links to clients |
| billing_type | `management` \| `ad_spend` | Which Stripe account |
| amount | numeric | Dollar amount |
| status | `pending` \| `paid` \| `overdue` \| `cancelled` | Payment state |
| billing_period_start/end | date | Period covered |
| due_date | date | When payment is due |
| paid_at | timestamp | When payment succeeded (null if unpaid) |
| recurrence_type | `one_time` \| `bi_weekly` \| `monthly` | Billing frequency |
| is_recurring_parent | boolean | If true, generates child records |
| parent_billing_id | UUID | Links to parent for recurring chains |
| next_due_date | date | Next recurring charge date |
| stripe_invoice_id | string | Stripe invoice ID |
| stripe_payment_intent_id | string | Stripe PaymentIntent ID |
| stripe_subscription_id | string | Stripe subscription ID |
| stripe_account | `management` \| `ad_spend` | Which Stripe account charged |
| payment_link | string | Hosted invoice URL (for manual payment) |
| charge_attempts | number | Failed charge count |
| last_charge_error | string | Error message from last failure |
| credit_amount_used | number | Credit applied to reduce payment |
| credit_applied_id | UUID | Which credit was used |

### client_wallets
One wallet per client — tracks ad spend balance and auto-recharge settings.

| Field | Type | Purpose |
|-------|------|---------|
| client_id | UUID | One per client |
| tracking_start_date | date | **CRITICAL** — when wallet balance tracking begins |
| low_balance_threshold | numeric | Default $150, triggers safe mode check |
| auto_charge_amount | numeric | Amount to auto-recharge (null = disabled) |
| auto_billing_enabled | boolean | If true, auto-recharge is active |
| monthly_ad_spend_cap | numeric | Max spend per month (null = unlimited) |
| billing_mode | `manual` \| `auto_stripe` \| `admin_exempt` | Billing automation mode |
| ad_spend_balance | numeric | **DEPRECATED** — never updated, do not use |
| last_auto_charge_at | timestamp | Last successful auto-charge |
| last_charge_failed_at | timestamp | Last failed charge |

### wallet_transactions
Every deposit and adjustment to a client's wallet.

| Field | Type | Purpose |
|-------|------|---------|
| wallet_id | UUID FK | Links to client_wallets |
| client_id | UUID FK | Links to clients |
| transaction_type | `deposit` \| `spend` \| `adjustment` | Transaction type |
| amount | numeric | Dollar amount |
| billing_record_id | UUID | Links to billing record that created this deposit |
| balance_after | numeric | **NOT USED** — compute balance on-the-fly |

### client_stripe_customers
Maps clients to Stripe customer IDs (one per account).

### client_stripe_subscriptions
Tracks active Stripe subscriptions with period dates.

### client_payment_methods
Stores default payment methods per Stripe account.

## Wallet Balance Computation

**Hook:** `src/hooks/useComputedWalletBalance.ts`

```
walletBalance = totalDeposits - displayedSpend

Where:
  totalDeposits = SUM(wallet_transactions WHERE transaction_type = 'deposit')
  trackedSpend = SUM(ad_spend_daily.cost WHERE spend_date >= tracking_start_date)
  displayedSpend = trackedSpend * (1 + performancePercentage / 100)
```

**Critical rules:**
- `tracking_start_date` MUST be set or balance = 0 (not tracked)
- `ad_spend_balance` field on client_wallets is **DEPRECATED** — never used
- `balance_after` on transactions is **NOT USED** — always compute on-the-fly
- Performance percentage is a system-wide setting (default 0%), stored in `onboarding_settings`
- Wallets are created implicitly during first billing record creation or wallet deposit

## Auto-Recharge System

**Edge function:** `supabase/functions/auto-recharge-run/index.ts`
**Schedule:** Hourly via pg_cron (job ID 18)

### Preconditions (ALL must be true)
1. `auto_billing_enabled = true`
2. `auto_charge_amount != null`
3. Client status = `active`
4. `remainingBalance <= low_balance_threshold` (default $150)
5. No existing unpaid charge in last 24 hours (dedup)
6. Last paid charge > 2.5 hours ago (cooldown)
7. Max 2 charge attempts per client per day
8. Monthly cap not exceeded (if set)
9. Default payment method exists

### Charge Amount Logic
```typescript
chargeAmount = wallet.auto_charge_amount

if (wallet.monthly_ad_spend_cap) {
  monthlySpent = sum of paid ad_spend records in last 30 days
  remainingCap = monthly_ad_spend_cap - monthlySpent
  chargeAmount = min(chargeAmount, remainingCap)
}

if (chargeAmount < $50) → skip, trigger safe mode instead
```

### Charge Mechanism
- Uses direct Stripe PaymentIntent (ad_spend account only)
- `confirm: 'true'` for immediate charge
- `off_session: 'true'` for unilateral charge

### Outcomes
| Status | Action |
|--------|--------|
| `succeeded` | billing_record → `paid`, wallet deposit created |
| `requires_action` | billing_record → `pending`, payment_link saved, safe mode triggered |
| Failed | billing_record → `overdue`, safe mode triggered |

### Safe Mode Trigger
When recharge fails or balance stays low:
1. Calls `check-low-balance` edge function
2. Reduces ALL campaign budgets to $0.01/day (penny budget)
3. Saves `pre_safe_mode_budget` for restoration
4. Logs to `campaign_audit_log`

## Stripe Webhook Handling

**Edge function:** `supabase/functions/stripe-billing-webhook/index.ts`

**Signature verification:** HMAC-SHA256 with separate secrets per account:
- `STRIPE_MANAGEMENT_WEBHOOK_SECRET`
- `STRIPE_AD_SPEND_WEBHOOK_SECRET`

### Events Handled

#### `invoice.paid`
1. Lookup billing_record by `stripe_invoice_id` OR `stripe_subscription_id` + period
2. Mark status → `paid`, set `paid_at`
3. For ad_spend: create wallet deposit via `ensureWalletDeposit()`
4. Set `tracking_start_date` on wallet (if earlier than current)
5. If subscription: trigger `process-referral-commission` for management fees
6. If recurring: generate next pending billing record
7. Resolve any active `billing_collections` records

**Wallet deposit idempotency:**
```typescript
// Check if deposit already exists before creating
if (existingDeposit) return;
// Set tracking_start_date if not set or if date is earlier
if (!wallet.tracking_start_date || date < wallet.tracking_start_date) {
  wallet.tracking_start_date = date;
}
// Create deposit transaction
```

#### `invoice.payment_failed`
- Increment `charge_attempts`
- Set `last_charge_error`
- Create `system_alert` with severity='high'
- Update wallet: `last_charge_failed_at`

#### `invoice.payment_action_required`
- Save `payment_link = invoice.hosted_invoice_url` to billing_record

#### `customer.subscription.updated`
- Sync period dates
- If status='active': create pending billing record for upcoming period

#### `customer.subscription.deleted`
- Mark local subscription as `canceled`

#### `invoice.upcoming`
- Pre-creates pending billing record before invoice finalized

#### `payment_intent.succeeded`
- Safety net for ad_spend PaymentIntents without associated invoices
- Creates wallet deposit

## Subscription Flow

**Edge function:** `supabase/functions/create-stripe-subscription/index.ts`

1. Get/create Stripe customer with metadata
2. Check idempotency (local DB + Stripe directly)
3. Find active subscription in Stripe (prevents duplicates on retry)
4. Create dynamic price in Stripe
5. Create subscription with `payment_behavior='allow_incomplete'`
6. Force-pay first invoice with default payment method
7. Create billing record (marked `paid` if charge succeeded)
8. Create next-period pending record (shows upcoming charge in UI)

**Key:** Checks Stripe directly before creating to catch race conditions where DB write failed after Stripe charge.

## One-Off Invoice Flow

**Edge function:** `supabase/functions/create-stripe-invoice/index.ts`

**For Ad Spend (direct PaymentIntent):**
1. Create PaymentIntent with `confirm: 'true'` + `off_session: 'true'`
2. If `succeeded`: mark `paid`, create wallet deposit
3. If `requires_action`: save payment link, stay `pending`
4. If failed: mark `overdue`

**For Management (invoice flow):**
1. Create invoice (draft)
2. Attach invoice item
3. Finalize → generates hosted_invoice_url
4. Try auto-payment with default method
5. If succeeds: mark `paid`
6. If no default method: send invoice to customer

## Billing Collections Escalation

**Edge function:** `supabase/functions/billing-collections-run/index.ts`

Email escalation timeline:

| Trigger | Stage | Template |
|---------|-------|----------|
| 3 days before due | `reminder` | Pay in 3 days |
| 1 day overdue | `late` | Payment overdue notice |
| 7 days overdue | `warning` | Urgent notice |
| 21 days overdue | `final` | Collections warning |
| 30 days overdue | `collections` | Sent to collections dept |

Sends templated HTML email via Resend. Tracks stage in `billing_collections` table.

## Stripe Reconciliation (sync-stripe-charges)

**Edge function:** `supabase/functions/sync-stripe-charges/index.ts`
**Critical:** After deploying, MUST patch `verify_jwt=false` (deploy resets it).

**Two modes:**
1. **Per-client sync** — Full reconciliation for one client
2. **Global sync** — Update all pending/overdue records with Stripe status

**Per-client process:**
1. Auto-discover Stripe customers by email search (both accounts)
2. Auto-discover subscriptions from each customer
3. Paginate through all invoices for last 60 days
4. For each invoice: match to billing_record by stripe_invoice_id or fuzzy-match (client_id, billing_type, amount, due_date ±3 days)
5. Create new billing_record if no match
6. Update status if changed
7. Create wallet deposit if newly paid ad_spend
8. Discover standalone PaymentIntents not linked to invoices
9. Back-fill Stripe IDs on existing manual records

## Billing Record Lifecycle

```
Create (pending)
  ↓
[Manual review] OR [Auto-charge] OR [Email invoice]
  ↓
Payment attempt
  ↓
Success → Mark PAID → Create wallet deposit (if ad_spend)
  │          │
  │          └→ Create NEXT recurring record (if recurring)
  │          └→ Process referral commission (if management)
  │
Failure → Mark OVERDUE → Collections emails → Eventually sent to collections
```

## Edge Functions (Billing-Related)

| Function | Purpose |
|----------|---------|
| `stripe-billing-webhook` | Main webhook handler for invoice/subscription events |
| `add-wallet-credit` | Manual wallet deposit creation |
| `auto-recharge-run` | Hourly auto-recharge for low balance |
| `billing-collections-run` | Email escalation for overdue invoices |
| `check-low-balance` | Triggers safe mode when wallet drops |
| `sync-stripe-charges` | Reconciliation: syncs all Stripe data to DB |
| `create-stripe-invoice` | Creates invoices and charges directly |
| `create-stripe-subscription` | Creates subscriptions with initial payment |
| `manual-wallet-refill` | Manual refill endpoint |
| `save-payment-method` | Saves payment methods |
| `sync-stripe-cards` | Card sync |
| `get-stripe-config` | Returns publishable keys |
| `enforce-management-billing` | Management fee enforcement |
| `mark-overdue-billing` | Marks unpaid invoices overdue |
| `verify-wallet-charges` | Verification logic |
| `weekly-billing-audit` | Audit trail |
| `fetch-client-stripe-activity` | Client stripe history |

## React Hooks (Billing-Related)

| Hook | Purpose |
|------|---------|
| `useComputedWalletBalance` | Wallet balance computation (deposits - tracked spend) |
| `useBillingRecords` | Payment history |
| `useClientWallet` | Wallet settings and state |
| `usePaymentMethods` | Payment cards |
| `useUpcomingPayments` | Future payment schedule |
| `useBillingDashboard` | All billing data aggregated |
| `useBillingTracker` | Billing calculations |

## UI Components (Billing-Related)

| Component | Purpose |
|-----------|---------|
| `BillingWidget.tsx` | Main billing display (NOT BillingSection.tsx) |
| `AdSpendWalletWidget.tsx` | Wallet balance display |
| `BillingRecordsTable.tsx` | Detailed billing history |
| `BillingRecordModal.tsx` | Billing detail popup |
| `UpcomingPaymentsWidget.tsx` | Future payments |
| `PaymentMethodCard.tsx` | Payment method display |
| `AdSpendSetupCard.tsx` | Initial wallet setup |
| `DailySpendChart.tsx` | Spend visualization |

## Key Business Rules

1. **Ad spend billing creates wallet deposits; management billing does not**
2. **Wallet balance = deposits - (tracked spend x (1 + performance fee))** — never from a stored field
3. **`tracking_start_date` is mandatory** — without it, balance = 0
4. **Auto-recharge has 2.5-hour cooldown** to prevent rapid successive charges
5. **Max 2 charge attempts per client per day**
6. **Monthly caps prevent overcharging** even if threshold requests more
7. **Credits reduce payment amount**, not wallet balance
8. **Subscriptions auto-generate next-period records** on webhook
9. **All operations are idempotent** — check for existing records before creating
10. **Safe mode is triggered by low balance detection**, not by failed charge alone
11. **Wallet balance check fires once per UI session** (cached by `lowBalanceCheckedRef`)
12. **`admin_exempt` billing mode bypasses** wallet-based safe mode

---
*Generated: 2026-03-12*
