ALTER TABLE public.client_wallets
ADD COLUMN IF NOT EXISTS monthly_ad_spend_cap NUMERIC;

ALTER TABLE public.client_wallets
ADD COLUMN IF NOT EXISTS billing_mode TEXT DEFAULT 'manual'
CHECK (billing_mode IN ('manual', 'auto_stripe'));

COMMENT ON COLUMN public.client_wallets.monthly_ad_spend_cap IS 'Maximum ad spend charges per calendar month. NULL means no cap.';
COMMENT ON COLUMN public.client_wallets.billing_mode IS 'manual = admin marks paid, auto_stripe = Stripe auto-charges saved card';