-- DBFN-05: Add 'charging' status to billing_status enum
-- The 'charging' status represents a billing record where a Stripe PaymentIntent
-- has been created but not yet confirmed by webhook. Phase 3 will use this status
-- in the auto-recharge flow.
-- PG 15 supports ALTER TYPE ADD VALUE IF NOT EXISTS inside transactions.
ALTER TYPE billing_status ADD VALUE IF NOT EXISTS 'charging';
