-- Phase 2, Plan 02: Constraints and Deprecations
-- DBFN-11: Trigger constraint for paid records requiring stripe_payment_intent_id
-- DBFN-07: Document existing wallet transaction uniqueness enforcement
-- DBFN-12: Deprecate tracking_start_date
-- DBFN-13: Deprecate ad_spend_balance
-- DBFN-14: UTC convention documentation

-- =============================================================================
-- DBFN-11: Enforce that paid billing records have stripe_payment_intent_id
-- Exemption: records with source = 'v1_manual' (legacy unverified records)
-- Exemption: records with source IS NULL (existing code paths not yet updated -- tightened in Phase 3)
-- Implemented as trigger (not CHECK) per 02-RESEARCH.md recommendation
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_paid_stripe_pi()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only enforce on records that explicitly declare a source
  -- source IS NULL = existing code (exempt until Phase 3 rewrites set source explicitly)
  -- source = 'v1_manual' = legacy records (always exempt)
  IF NEW.status = 'paid'
    AND NEW.source IS NOT NULL
    AND NEW.source NOT IN ('v1_manual')
    AND NEW.stripe_payment_intent_id IS NULL
  THEN
    RAISE EXCEPTION 'billing record with status=paid must have stripe_payment_intent_id (unless source is v1_manual). Record id: %', NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop and recreate to ensure idempotency
DROP TRIGGER IF EXISTS trg_enforce_paid_stripe_pi ON billing_records;
CREATE TRIGGER trg_enforce_paid_stripe_pi
  BEFORE INSERT OR UPDATE ON billing_records
  FOR EACH ROW
  EXECUTE FUNCTION enforce_paid_stripe_pi();

-- =============================================================================
-- DBFN-07: Wallet transaction uniqueness
-- Existing indexes already enforce one deposit per billing_record_id:
--   uq_wallet_transactions_billing_record_deposit (billing_record_id WHERE NOT NULL AND type='deposit')
--   idx_wallet_tx_billing_record_deposit (billing_record_id, transaction_type WHERE NOT NULL)
-- Broader constraint (any type per billing_record_id) deferred to Phase 3
-- =============================================================================

COMMENT ON INDEX uq_wallet_transactions_billing_record_deposit IS 'DBFN-07: Enforces one deposit per billing_record. Broader constraint deferred to Phase 3.';

-- =============================================================================
-- DBFN-12: Deprecate tracking_start_date
-- =============================================================================

COMMENT ON COLUMN client_wallets.tracking_start_date IS 'DEPRECATED (Phase 2, DBFN-12): Replaced by first-deposit-date derivation in compute_wallet_balance(). Still read by edge functions until Phase 3+ updates them. Do NOT drop until Phase 10.';

-- =============================================================================
-- DBFN-13: Deprecate ad_spend_balance
-- =============================================================================

COMMENT ON COLUMN client_wallets.ad_spend_balance IS 'DEPRECATED (Phase 2, DBFN-13): Balance is computed dynamically from wallet_transactions and ad_spend_daily. Column retained for backward compatibility. Do NOT drop until Phase 10.';

-- =============================================================================
-- DBFN-14: UTC convention documentation
-- All TIMESTAMPTZ columns store UTC internally per PostgreSQL behavior.
-- No CHECK constraint needed -- TIMESTAMPTZ handles this at the type level.
-- =============================================================================

COMMENT ON TABLE billing_records IS 'Central billing table. All TIMESTAMPTZ columns store UTC internally per DBFN-14 convention.';
COMMENT ON TABLE client_wallets IS 'Per-client wallet config. All TIMESTAMPTZ columns store UTC internally per DBFN-14 convention.';
COMMENT ON TABLE wallet_transactions IS 'Wallet transaction ledger. All TIMESTAMPTZ columns store UTC internally per DBFN-14 convention.';
