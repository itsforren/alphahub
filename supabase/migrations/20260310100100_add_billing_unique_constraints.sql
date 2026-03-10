-- ============================================================
-- Step 2: Add unique constraints to prevent future duplicates
-- ============================================================
-- Partial unique indexes: only enforce uniqueness on active (non-archived)
-- records with actual Stripe IDs. NULL values and archived records are exempt.

-- Only one active billing record per stripe_invoice_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_records_stripe_invoice_id
  ON billing_records (stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL
    AND archived_at IS NULL;

-- Only one active billing record per stripe_payment_intent_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_records_stripe_payment_intent_id
  ON billing_records (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL
    AND archived_at IS NULL;

-- Only one deposit per billing_record_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_transactions_billing_record_deposit
  ON wallet_transactions (billing_record_id)
  WHERE billing_record_id IS NOT NULL
    AND transaction_type = 'deposit';
