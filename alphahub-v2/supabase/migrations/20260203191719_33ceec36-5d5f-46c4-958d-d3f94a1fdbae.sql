-- Add column to preserve the GHL agent reference separately from billing contact
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS ghl_agent_ref TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.ghl_agent_ref IS 'GHL agent_id from webhook (agent reference, not for SaaS billing)';