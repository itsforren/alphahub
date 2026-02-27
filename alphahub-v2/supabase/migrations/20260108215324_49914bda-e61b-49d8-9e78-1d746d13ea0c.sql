-- Add column to store the GHL Contact ID for reference
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.clients.ghl_contact_id IS 'Alpha Agent Leads CRM Contact User ID from HighLevel';