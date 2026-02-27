-- Add NPN column to clients table for pre-filling
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS npn TEXT;

-- Add index for lookups
CREATE INDEX IF NOT EXISTS idx_clients_npn ON public.clients(npn);