-- Phase 3: Remove admin_exempt billing mode (WALL-15)
-- All clients must go through wallet enforcement, no exceptions.
-- Pre-migration check confirmed 0 clients had admin_exempt billing mode.

-- Step 1: Migrate any admin_exempt clients to manual billing mode
-- (manual still requires payment but doesn't auto-charge)
UPDATE client_wallets
SET billing_mode = 'manual',
    updated_at = NOW()
WHERE billing_mode = 'admin_exempt';

-- Step 2: Drop and recreate the CHECK constraint without admin_exempt
-- First, find and drop the existing constraint
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'client_wallets'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%admin_exempt%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE client_wallets DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END $$;

-- Step 3: Add new CHECK constraint without admin_exempt (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'client_wallets'
      AND con.conname = 'client_wallets_billing_mode_check'
  ) THEN
    ALTER TABLE client_wallets
    ADD CONSTRAINT client_wallets_billing_mode_check
    CHECK (billing_mode IN ('auto_stripe', 'manual'));
  END IF;
END $$;
