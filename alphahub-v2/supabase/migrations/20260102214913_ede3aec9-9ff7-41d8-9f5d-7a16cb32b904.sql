-- =====================================================
-- COMPREHENSIVE SALES TRACKER ENHANCEMENT - ALL 3 PHASES
-- =====================================================

-- ===================
-- PHASE 1: Core Fields
-- ===================

-- Intent Routing
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS intent TEXT DEFAULT 'unsure';

-- Qualification Status
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS qual_status TEXT DEFAULT 'unreviewed';

ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS disqual_reason TEXT;

-- Next Action System (CRITICAL for leak prevention)
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS next_action_type TEXT;

ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS next_action_due_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS next_action_owner_id UUID REFERENCES auth.users(id);

-- Appointment Details
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS appt_start_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS appt_end_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS appt_calendar_id TEXT;

ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS appt_count_reschedules INTEGER DEFAULT 0;

ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS appt_count_no_shows INTEGER DEFAULT 0;

-- Call Type
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS call_type TEXT DEFAULT 'system_setup';

-- Last Contact Method
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS last_contact_method TEXT;

-- ===================
-- PHASE 2: Ownership & Disposition
-- ===================

-- Ownership
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS owner_role TEXT DEFAULT 'setter';

ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id);

-- Disposition (call outcome)
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS disposition TEXT;

-- ===================
-- PHASE 3: Payment & Client Integration
-- ===================

-- Payment Fields
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS offer_selected TEXT;

ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'not_paid';

ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS payment_amount NUMERIC DEFAULT 0;

ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

-- Link to client (after Won)
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);

-- ===================
-- Sales Team Members Table
-- ===================

CREATE TABLE IF NOT EXISTS public.sales_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS for sales_team_members
ALTER TABLE public.sales_team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage sales team members" ON public.sales_team_members;
CREATE POLICY "Admins can manage sales team members"
ON public.sales_team_members FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view sales team members" ON public.sales_team_members;
CREATE POLICY "Authenticated users can view sales team members"
ON public.sales_team_members FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ===================
-- Update Pipeline Stages - Fix stage structure
-- ===================

-- Delete the No Show stage (it's now an appointment_status, not a stage)
DELETE FROM public.sales_pipeline_stages WHERE stage_key = 'no_show';

-- First, update stages that won't conflict
UPDATE public.sales_pipeline_stages 
SET stage_name = 'New Lead', ghl_tag = 'new-lead', order_index = 0 
WHERE stage_key = 'applied';

-- Update the order for existing won/lost
UPDATE public.sales_pipeline_stages SET order_index = 5, stage_name = 'Closed Won', ghl_tag = 'closed-won' WHERE stage_key = 'won';
UPDATE public.sales_pipeline_stages SET order_index = 8, stage_name = 'Closed Lost', ghl_tag = 'closed-lost' WHERE stage_key = 'lost';

-- Update booked_call to be Contacted stage
UPDATE public.sales_pipeline_stages 
SET stage_name = 'Contacted', ghl_tag = 'contacted', order_index = 1 
WHERE stage_key = 'booked_call';

-- Rename existing stages to new names/positions
UPDATE public.sales_pipeline_stages 
SET stage_name = 'Call Scheduled', ghl_tag = 'call-scheduled', order_index = 2 
WHERE stage_key = 'call_completed';

UPDATE public.sales_pipeline_stages 
SET stage_name = 'Call Completed', ghl_tag = 'call-completed', order_index = 3 
WHERE stage_key = 'follow_up';

UPDATE public.sales_pipeline_stages 
SET stage_name = 'Follow Up', ghl_tag = 'follow-up', order_index = 4 
WHERE stage_key = 'proposal_sent';

-- Delete negotiation stage - we're consolidating
DELETE FROM public.sales_pipeline_stages WHERE stage_key = 'negotiation';

-- Insert Onboarding stage
INSERT INTO public.sales_pipeline_stages (stage_name, stage_key, color, order_index, is_closed, ghl_tag)
SELECT 'Onboarding', 'onboarding', '#0ea5e9', 6, false, 'onboarding'
WHERE NOT EXISTS (SELECT 1 FROM public.sales_pipeline_stages WHERE stage_key = 'onboarding');

-- Insert Live stage
INSERT INTO public.sales_pipeline_stages (stage_name, stage_key, color, order_index, is_closed, ghl_tag)
SELECT 'Live', 'live', '#22c55e', 7, true, 'live-client'
WHERE NOT EXISTS (SELECT 1 FROM public.sales_pipeline_stages WHERE stage_key = 'live');

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_prospects_next_action_due ON public.prospects(next_action_due_at) WHERE next_action_due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospects_payment_status ON public.prospects(payment_status);
CREATE INDEX IF NOT EXISTS idx_prospects_owner ON public.prospects(owner_user_id, owner_role);