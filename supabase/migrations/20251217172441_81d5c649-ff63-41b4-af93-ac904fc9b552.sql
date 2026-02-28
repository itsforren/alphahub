-- Create onboarding_settings table for storing campaign creation configuration
CREATE TABLE public.onboarding_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage onboarding settings
CREATE POLICY "Admins can manage onboarding settings" 
ON public.onboarding_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_onboarding_settings_updated_at
BEFORE UPDATE ON public.onboarding_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.onboarding_settings (setting_key, setting_value, description) VALUES
  ('template_campaign_id', '', 'Google Ads campaign ID to copy as template (format: customerId:campaignId)'),
  ('landing_page_base_url', 'https://www.taxfreewealthplan.com/discover/discover-our-wealth-secrets-', 'Base URL for landing pages - agent name will be appended'),
  ('url_params_format', 'agent_id={agent_id}', 'URL parameters format - {agent_id} will be replaced with actual agent ID'),
  ('default_customer_id', '6551751244', 'Default Google Ads customer ID for API calls'),
  ('auto_create_campaigns', 'true', 'Whether to automatically create campaigns on new client onboard');