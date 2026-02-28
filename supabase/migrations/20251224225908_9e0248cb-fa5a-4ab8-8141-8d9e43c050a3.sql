-- Add historical tracking columns to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS submitted_premium NUMERIC;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS approved_premium NUMERIC;

-- Add index for faster lookups by email within an agent
CREATE INDEX IF NOT EXISTS idx_leads_agent_email ON public.leads(agent_id, email);