-- Add prospect_id column to clients table for bidirectional prospect-client linking
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES public.prospects(id);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_clients_prospect_id ON public.clients(prospect_id);