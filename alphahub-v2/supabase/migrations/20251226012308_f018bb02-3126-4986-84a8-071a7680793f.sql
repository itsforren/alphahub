-- Create a dedicated system alerts table instead of using chat_conversations
-- This avoids the client_id unique constraint issue
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type text NOT NULL DEFAULT 'lead_discrepancy',
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  metadata jsonb DEFAULT '{}'::jsonb,
  acknowledged_at timestamp with time zone,
  acknowledged_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage system alerts
CREATE POLICY "Admins can manage all system alerts" 
ON public.system_alerts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add comment
COMMENT ON TABLE public.system_alerts IS 'System alerts for admin notifications like lead discrepancies';