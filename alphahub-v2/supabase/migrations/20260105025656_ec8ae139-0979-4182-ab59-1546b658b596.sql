-- Add plaid_account_id column to track individual accounts
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS plaid_account_id TEXT;

-- Drop the problematic unique constraint on item_id
ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_plaid_item_id_key;

-- Add unique constraint on account_id instead
ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_plaid_account_id_key UNIQUE (plaid_account_id);