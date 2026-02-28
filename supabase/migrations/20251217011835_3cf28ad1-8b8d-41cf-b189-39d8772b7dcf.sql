-- Add column to track actual credit amount used per billing record
ALTER TABLE public.billing_records 
ADD COLUMN IF NOT EXISTS credit_amount_used numeric DEFAULT 0;