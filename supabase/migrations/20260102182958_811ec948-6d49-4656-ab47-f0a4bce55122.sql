-- =============================================
-- SALES PIPELINE SYSTEM - COMPLETE SCHEMA
-- =============================================

-- 1. Create sales_pipeline_stages table
CREATE TABLE public.sales_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_name TEXT NOT NULL,
  stage_key TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6b7280',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  ghl_tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on sales_pipeline_stages
ALTER TABLE public.sales_pipeline_stages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_pipeline_stages
CREATE POLICY "Admins can manage pipeline stages" 
ON public.sales_pipeline_stages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view pipeline stages" 
ON public.sales_pipeline_stages 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Insert default pipeline stages
INSERT INTO public.sales_pipeline_stages (stage_name, stage_key, color, order_index, is_closed, ghl_tag) VALUES
('Applied', 'applied', '#6b7280', 0, false, NULL),
('Booked Call', 'booked_call', '#3b82f6', 1, false, 'call-booked'),
('Call Completed', 'call_completed', '#8b5cf6', 2, false, 'call-completed'),
('Follow Up', 'follow_up', '#f59e0b', 3, false, 'follow-up'),
('Proposal Sent', 'proposal_sent', '#ec4899', 4, false, 'proposal-sent'),
('Negotiation', 'negotiation', '#14b8a6', 5, false, 'negotiation'),
('Won', 'won', '#10b981', 6, true, 'closed-won'),
('Lost', 'lost', '#ef4444', 7, true, 'closed-lost');

-- 2. Update prospects table with sales tracking columns
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS pipeline_stage_id UUID REFERENCES public.sales_pipeline_stages(id),
  ADD COLUMN IF NOT EXISTS forecast_probability INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deal_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_notes TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lost_reason TEXT,
  ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT;

-- Add constraint for forecast_probability (0-100)
ALTER TABLE public.prospects
  ADD CONSTRAINT prospects_forecast_probability_check 
  CHECK (forecast_probability IS NULL OR (forecast_probability >= 0 AND forecast_probability <= 100));

-- Set default stage for existing prospects
UPDATE public.prospects 
SET pipeline_stage_id = (
  SELECT id FROM public.sales_pipeline_stages WHERE stage_key = 'applied'
) 
WHERE pipeline_stage_id IS NULL;

-- Create index for pipeline stage lookups
CREATE INDEX IF NOT EXISTS idx_prospects_pipeline_stage ON public.prospects(pipeline_stage_id);
CREATE INDEX IF NOT EXISTS idx_prospects_assigned_to ON public.prospects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_prospects_ghl_contact ON public.prospects(ghl_contact_id);

-- 3. Create call_logs table for Fathom integration
CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  call_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INTEGER,
  summary TEXT,
  action_items TEXT[],
  key_topics TEXT[],
  sentiment TEXT CHECK (sentiment IS NULL OR sentiment IN ('positive', 'neutral', 'negative')),
  recording_url TEXT,
  fathom_call_id TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on call_logs
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_logs
CREATE POLICY "Admins can manage call logs" 
ON public.call_logs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for call_logs
CREATE INDEX idx_call_logs_prospect ON public.call_logs(prospect_id);
CREATE INDEX idx_call_logs_fathom_id ON public.call_logs(fathom_call_id);
CREATE INDEX idx_call_logs_date ON public.call_logs(call_date DESC);

-- 4. Create prospect_activities table for journey timeline
CREATE TABLE public.prospect_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on prospect_activities
ALTER TABLE public.prospect_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prospect_activities
CREATE POLICY "Admins can manage prospect activities" 
ON public.prospect_activities 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow public insert for tracking (webhooks need this)
CREATE POLICY "Allow public insert for prospect activities" 
ON public.prospect_activities 
FOR INSERT 
WITH CHECK (true);

-- Indexes for prospect_activities
CREATE INDEX idx_prospect_activities_prospect ON public.prospect_activities(prospect_id);
CREATE INDEX idx_prospect_activities_type ON public.prospect_activities(activity_type);
CREATE INDEX idx_prospect_activities_date ON public.prospect_activities(created_at DESC);

-- 5. Enable realtime for sales tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.prospects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prospect_activities;