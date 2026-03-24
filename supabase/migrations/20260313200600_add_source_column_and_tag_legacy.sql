-- DBFN-06: Add source column to billing_records
-- Tracks provenance: 'stripe' (webhook-confirmed), 'v1_manual' (legacy unverified), 'auto_recharge' (auto-recharge system)

-- Step 1: Add column (nullable, no default -- new records must set source explicitly)
ALTER TABLE billing_records
ADD COLUMN IF NOT EXISTS source TEXT
CHECK (source IN ('stripe', 'v1_manual', 'auto_recharge'));

-- Step 2: Tag existing paid records without Stripe PI as v1_manual
-- Per Phase 1 audit: paid records with no stripe_payment_intent_id are legacy unverified
UPDATE billing_records
SET source = 'v1_manual', updated_at = now()
WHERE status = 'paid'
  AND stripe_payment_intent_id IS NULL
  AND source IS NULL;

-- Step 3: Tag existing paid records with Stripe PI as stripe
UPDATE billing_records
SET source = 'stripe', updated_at = now()
WHERE status = 'paid'
  AND stripe_payment_intent_id IS NOT NULL
  AND source IS NULL;

-- Step 4: Tag remaining non-paid records that have stripe info as stripe
UPDATE billing_records
SET source = 'stripe', updated_at = now()
WHERE stripe_payment_intent_id IS NOT NULL
  AND source IS NULL;
