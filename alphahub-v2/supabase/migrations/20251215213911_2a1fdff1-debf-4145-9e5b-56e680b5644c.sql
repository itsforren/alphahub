-- Create onboarding status enum
CREATE TYPE public.onboarding_status AS ENUM ('pending', 'in_progress', 'completed');

-- Add new columns to clients table for full agent management
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS team text,
ADD COLUMN IF NOT EXISTS states text,
ADD COLUMN IF NOT EXISTS ad_spend_budget numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS mtd_ad_spend numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_daily_spend numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS mtd_leads integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS booked_calls integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS applications integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cpl numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cpa numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cpba numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cpc numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS ctr numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversion_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS nps_score numeric,
ADD COLUMN IF NOT EXISTS made_review boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS management_fee_renewal date,
ADD COLUMN IF NOT EXISTS ad_spend_renewal date,
ADD COLUMN IF NOT EXISTS nfia_link text,
ADD COLUMN IF NOT EXISTS calendar_link text,
ADD COLUMN IF NOT EXISTS crm_link text,
ADD COLUMN IF NOT EXISTS ads_link text,
ADD COLUMN IF NOT EXISTS funnel_link text,
ADD COLUMN IF NOT EXISTS intercom_link text,
ADD COLUMN IF NOT EXISTS filters_notes text,
ADD COLUMN IF NOT EXISTS onboarding_status public.onboarding_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS onboarding_call_scheduled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS contract_signed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS current_quota integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_delivered integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS behind_target integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ads_live boolean DEFAULT false;

-- Create onboarding_tasks table for tracking setup progress
CREATE TABLE public.onboarding_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  task_label text NOT NULL,
  display_order integer DEFAULT 0,
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  completed_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id, task_name)
);

-- Enable RLS on onboarding_tasks
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for onboarding_tasks
CREATE POLICY "Admins can manage all onboarding tasks"
ON public.onboarding_tasks
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their own onboarding tasks"
ON public.onboarding_tasks
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM clients c
  WHERE c.id = onboarding_tasks.client_id
  AND c.user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_onboarding_tasks_updated_at
BEFORE UPDATE ON public.onboarding_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add unique constraint on email for upsert logic
ALTER TABLE public.clients ADD CONSTRAINT clients_email_unique UNIQUE (email);