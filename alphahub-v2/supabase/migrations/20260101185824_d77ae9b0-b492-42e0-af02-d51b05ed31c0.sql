-- Create billing_collections table for collections tracking
CREATE TABLE public.billing_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  billing_record_id UUID NOT NULL REFERENCES billing_records(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'none' CHECK (status IN ('none', 'reminder_sent', 'late_notice_sent', 'final_notice_sent', 'sent_to_collections', 'resolved')),
  next_action_at TIMESTAMP WITH TIME ZONE,
  last_email_sent_at TIMESTAMP WITH TIME ZONE,
  email_stage TEXT DEFAULT 'none' CHECK (email_stage IN ('none', 'reminder', 'late', 'final', 'collections')),
  escalated_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create billing_collection_events table for audit trail
CREATE TABLE public.billing_collection_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES billing_collections(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('email_sent', 'status_change', 'manual_action', 'payment_received', 'escalated')),
  email_template TEXT,
  email_subject TEXT,
  recipient_email TEXT,
  status_from TEXT,
  status_to TEXT,
  notes TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create sla_settings table for configurable KPIs
CREATE TABLE public.sla_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Insert default SLA settings
INSERT INTO public.sla_settings (setting_key, setting_value) VALUES
  ('chat_sla', '{"first_response_minutes": 30, "response_minutes": 30, "business_hours_start": 9, "business_hours_end": 17, "business_days": [1,2,3,4,5], "timezone": "America/New_York"}'),
  ('ticket_sla', '{"first_response_minutes": 60, "resolution_hours": 48, "warning_threshold_percent": 80}'),
  ('collections', '{"reminder_days_before": 3, "late_notice_days": 1, "warning_days": 7, "final_notice_days": 21, "collections_days": 30}');

-- Create client_stripe_customers table for dual Stripe accounts
CREATE TABLE public.client_stripe_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  stripe_account TEXT NOT NULL CHECK (stripe_account IN ('ad_spend', 'management')),
  stripe_customer_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, stripe_account)
);

-- Enable RLS on new tables
ALTER TABLE public.billing_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_collection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_stripe_customers ENABLE ROW LEVEL SECURITY;

-- Policies for billing_collections
CREATE POLICY "Admins can manage all billing collections"
  ON public.billing_collections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their own collection status"
  ON public.billing_collections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id::text = billing_collections.client_id AND c.user_id = auth.uid()
  ));

-- Policies for billing_collection_events
CREATE POLICY "Admins can manage all collection events"
  ON public.billing_collection_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policies for sla_settings
CREATE POLICY "Admins can manage SLA settings"
  ON public.sla_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view SLA settings"
  ON public.sla_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policies for client_stripe_customers
CREATE POLICY "Admins can manage all Stripe customers"
  ON public.client_stripe_customers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their own Stripe info"
  ON public.client_stripe_customers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id::text = client_stripe_customers.client_id AND c.user_id = auth.uid()
  ));

-- Add trigger for updated_at
CREATE TRIGGER update_billing_collections_updated_at
  BEFORE UPDATE ON public.billing_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sla_settings_updated_at
  BEFORE UPDATE ON public.sla_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_stripe_customers_updated_at
  BEFORE UPDATE ON public.client_stripe_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();