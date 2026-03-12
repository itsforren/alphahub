-- Prevent duplicate wallet deposits for the same billing record
-- Null billing_record_id rows are unaffected (WHERE clause excludes them)
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_tx_billing_record_deposit
ON wallet_transactions (billing_record_id, transaction_type)
WHERE billing_record_id IS NOT NULL;
