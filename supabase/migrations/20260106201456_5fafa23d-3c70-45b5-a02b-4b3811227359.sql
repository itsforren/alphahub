-- Add commission contract percentage column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS commission_contract_percent NUMERIC DEFAULT 100;

COMMENT ON COLUMN public.clients.commission_contract_percent IS 'IUL life commission contract percentage (e.g., 130 means 130%)';