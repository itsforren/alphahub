-- Add credit_type and remaining_balance to client_credits
ALTER TABLE public.client_credits
ADD COLUMN credit_type TEXT NOT NULL DEFAULT 'referral',
ADD COLUMN original_amount NUMERIC,
ADD COLUMN remaining_balance NUMERIC;

-- Update existing records to set original_amount and remaining_balance
UPDATE public.client_credits 
SET original_amount = amount, 
    remaining_balance = CASE WHEN applied_to_billing_id IS NULL THEN amount ELSE 0 END;

-- Make original_amount and remaining_balance required going forward
ALTER TABLE public.client_credits 
ALTER COLUMN original_amount SET NOT NULL,
ALTER COLUMN remaining_balance SET NOT NULL;