-- ============================================================
-- Step 1: Deduplicate billing_records and wallet_transactions
-- ============================================================
-- Problem: Stripe sync creates duplicates because:
--   (a) manual records have no stripe_invoice_id → sync can't match them
--   (b) no unique constraints → DB accepts duplicates silently
--   (c) .maybeSingle() fails when 2+ records share the same stripe_invoice_id
--
-- Strategy: Archive duplicates (keep oldest), clean up wallet deposits.

BEGIN;

-- ── 1a. Archive duplicate billing_records that share the same stripe_invoice_id ──
-- Keep the oldest record (MIN(created_at)), archive the rest.
WITH dupes AS (
  SELECT id,
         stripe_invoice_id,
         ROW_NUMBER() OVER (
           PARTITION BY stripe_invoice_id
           ORDER BY created_at ASC
         ) AS rn
  FROM billing_records
  WHERE stripe_invoice_id IS NOT NULL
    AND archived_at IS NULL
)
UPDATE billing_records br
SET archived_at = NOW(),
    notes = COALESCE(br.notes, '') || ' [Auto-archived: duplicate stripe_invoice_id]'
FROM dupes
WHERE br.id = dupes.id
  AND dupes.rn > 1;

-- ── 1b. Archive duplicate billing_records that share the same stripe_payment_intent_id ──
WITH dupes AS (
  SELECT id,
         stripe_payment_intent_id,
         ROW_NUMBER() OVER (
           PARTITION BY stripe_payment_intent_id
           ORDER BY created_at ASC
         ) AS rn
  FROM billing_records
  WHERE stripe_payment_intent_id IS NOT NULL
    AND archived_at IS NULL
)
UPDATE billing_records br
SET archived_at = NOW(),
    notes = COALESCE(br.notes, '') || ' [Auto-archived: duplicate stripe_payment_intent_id]'
FROM dupes
WHERE br.id = dupes.id
  AND dupes.rn > 1;

-- ── 1c. Archive manual records that fuzzy-match a Stripe-linked record ──
-- A manual record (no stripe_invoice_id) that matches a Stripe-linked record on:
--   same client_id + billing_type + amount + due_date within ±3 days
-- Keep the Stripe-linked record, archive the manual one.
WITH manual_dupes AS (
  SELECT m.id AS manual_id
  FROM billing_records m
  JOIN billing_records s
    ON s.client_id = m.client_id
   AND s.billing_type = m.billing_type
   AND s.amount = m.amount
   AND s.stripe_invoice_id IS NOT NULL
   AND s.archived_at IS NULL
   AND ABS(s.due_date::date - m.due_date::date) <= 3
  WHERE m.stripe_invoice_id IS NULL
    AND m.archived_at IS NULL
)
UPDATE billing_records br
SET archived_at = NOW(),
    notes = COALESCE(br.notes, '') || ' [Auto-archived: fuzzy-matched to Stripe-linked record]'
FROM manual_dupes
WHERE br.id = manual_dupes.manual_id;

-- ── 2. Delete wallet deposits that reference archived billing records ──
DELETE FROM wallet_transactions wt
WHERE wt.transaction_type = 'deposit'
  AND wt.billing_record_id IS NOT NULL
  AND wt.billing_record_id IN (
    SELECT id FROM billing_records WHERE archived_at IS NOT NULL
  );

-- ── 3. Deduplicate wallet deposits ──
-- If one billing_record_id has multiple deposit transactions, keep the first, delete the rest.
WITH deposit_dupes AS (
  SELECT id,
         billing_record_id,
         ROW_NUMBER() OVER (
           PARTITION BY billing_record_id
           ORDER BY created_at ASC
         ) AS rn
  FROM wallet_transactions
  WHERE billing_record_id IS NOT NULL
    AND transaction_type = 'deposit'
)
DELETE FROM wallet_transactions wt
USING deposit_dupes dd
WHERE wt.id = dd.id
  AND dd.rn > 1;

COMMIT;
