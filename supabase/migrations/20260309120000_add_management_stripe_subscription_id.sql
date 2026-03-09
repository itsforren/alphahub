-- Add management_stripe_subscription_id to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS management_stripe_subscription_id TEXT;

-- Update active clients with $0 management_fee to $1,497 (the default)
-- EXCEPT: Tierre Browne, James Warren (exempt — prepaid special arrangements)
-- EXCEPT: Cancelled/inactive clients
UPDATE public.clients
SET management_fee = 1497
WHERE status = 'active'
  AND (management_fee IS NULL OR management_fee = 0)
  AND name NOT ILIKE '%tierre browne%'
  AND name NOT ILIKE '%james warren%';
