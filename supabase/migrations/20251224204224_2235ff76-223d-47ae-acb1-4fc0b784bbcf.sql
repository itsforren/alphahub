-- Add automation tracking fields to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS automation_started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS automation_completed_at timestamp with time zone;

-- Add 'error' value to onboarding_status enum
ALTER TYPE public.onboarding_status ADD VALUE IF NOT EXISTS 'error';

-- Add automation error email setting
INSERT INTO public.onboarding_settings (setting_key, setting_value, description)
VALUES ('automation_error_email', '', 'Email address to receive automation error notifications')
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for checking stale automations
CREATE INDEX IF NOT EXISTS idx_clients_automation_status 
ON public.clients (onboarding_status, automation_started_at) 
WHERE onboarding_status = 'in_progress';