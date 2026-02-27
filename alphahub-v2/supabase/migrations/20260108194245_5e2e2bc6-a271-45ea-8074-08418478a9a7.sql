-- Add closed-won data fields to prospects table
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS management_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_type text DEFAULT 'full', -- 'full' or 'partial'
  ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ad_spend_budget numeric DEFAULT 0;