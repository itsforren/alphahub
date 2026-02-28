-- Create onboarding automation runs table
CREATE TABLE public.onboarding_automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused')),
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 16,
  
  -- Step tracking
  steps_completed JSONB DEFAULT '[]',
  steps_failed JSONB DEFAULT '[]',
  step_data JSONB DEFAULT '{}',
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_step_at TIMESTAMPTZ,
  
  -- Error handling
  error_log JSONB DEFAULT '[]',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_automation_runs ENABLE ROW LEVEL SECURITY;

-- Admin can view all automation runs
CREATE POLICY "Admins can manage automation runs"
ON public.onboarding_automation_runs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Clients can view their own automation runs
CREATE POLICY "Clients can view own automation runs"
ON public.onboarding_automation_runs
FOR SELECT
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.onboarding_automation_runs;

-- Add new columns to clients table for automation tracking
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS ai_bio TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS url_slug TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS webflow_scheduler_id TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS webflow_lander_id TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS webflow_profile_id TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS webflow_thankyou_id TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS agent_bio_input TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address_country TEXT DEFAULT 'US';

-- Create trigger for updated_at
CREATE TRIGGER update_onboarding_automation_runs_updated_at
  BEFORE UPDATE ON public.onboarding_automation_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();