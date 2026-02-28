-- Add agent_id to clients table (links client to their lead Agent ID)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS agent_id TEXT UNIQUE;

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT UNIQUE NOT NULL, -- Original Lead ID from source
  agent_id TEXT NOT NULL, -- Links to client's agent_id
  lead_date TIMESTAMP WITH TIME ZONE,
  state TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  age TEXT,
  employment TEXT,
  interest TEXT,
  savings TEXT,
  investments TEXT,
  timezone TEXT,
  lead_source TEXT,
  status TEXT DEFAULT 'new', -- new, contacted, qualified, converted, lost
  notes TEXT,
  lead_data JSONB DEFAULT '{}', -- Extra fields from CSV
  webhook_payload JSONB, -- Original webhook data for debugging
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups by agent_id
CREATE INDEX idx_leads_agent_id ON public.leads(agent_id);
CREATE INDEX idx_leads_lead_date ON public.leads(lead_date DESC);
CREATE INDEX idx_leads_status ON public.leads(status);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Admin can manage all leads
CREATE POLICY "Admins can manage all leads"
ON public.leads
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Clients can view their own leads (via agent_id link)
CREATE POLICY "Clients can view their own leads"
ON public.leads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agent_id = leads.agent_id
    AND c.user_id = auth.uid()
  )
);

-- Create webhook_api_keys table
CREATE TABLE public.webhook_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- Descriptive name (e.g., "Production Webhook", "GHL Integration")
  api_key TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  request_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on webhook_api_keys
ALTER TABLE public.webhook_api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can manage webhook keys
CREATE POLICY "Admins can manage webhook keys"
ON public.webhook_api_keys
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create updated_at trigger for leads
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create updated_at trigger for webhook_api_keys
CREATE TRIGGER update_webhook_api_keys_updated_at
  BEFORE UPDATE ON public.webhook_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();