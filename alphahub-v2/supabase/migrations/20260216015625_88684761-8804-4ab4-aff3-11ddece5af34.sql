
-- Add account_category and account_label columns to bank_accounts
ALTER TABLE public.bank_accounts 
  ADD COLUMN IF NOT EXISTS account_category text NOT NULL DEFAULT 'business',
  ADD COLUMN IF NOT EXISTS account_label text;
