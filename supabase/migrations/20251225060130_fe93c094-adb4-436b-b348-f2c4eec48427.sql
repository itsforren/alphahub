-- Add delivery tracking columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivery_error TEXT,
ADD COLUMN IF NOT EXISTS delivery_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_delivery_attempt_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
ADD COLUMN IF NOT EXISTS utm_content TEXT,
ADD COLUMN IF NOT EXISTS utm_term TEXT,
ADD COLUMN IF NOT EXISTS gclid TEXT,
ADD COLUMN IF NOT EXISTS fbclid TEXT;

-- Create lead_delivery_logs table for tracking all delivery attempts
CREATE TABLE IF NOT EXISTS public.lead_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL, -- success, failed
  ghl_location_id TEXT,
  ghl_contact_id TEXT,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on lead_delivery_logs
ALTER TABLE public.lead_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Admins can manage all delivery logs
CREATE POLICY "Admins can manage all delivery logs"
ON public.lead_delivery_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries on lead_id
CREATE INDEX IF NOT EXISTS idx_lead_delivery_logs_lead_id ON public.lead_delivery_logs(lead_id);

-- Create index for querying failed deliveries for retry
CREATE INDEX IF NOT EXISTS idx_leads_delivery_status ON public.leads(delivery_status) WHERE delivery_status IN ('pending', 'failed');