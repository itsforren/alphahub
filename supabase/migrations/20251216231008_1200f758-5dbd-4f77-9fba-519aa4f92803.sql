-- Add tracking_start_date column to client_wallets table
ALTER TABLE public.client_wallets 
ADD COLUMN tracking_start_date date DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.client_wallets.tracking_start_date IS 'Date from which ad spend is tracked against this wallet. Set on first deposit.';