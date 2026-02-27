-- Insert default success manager settings
INSERT INTO public.onboarding_settings (setting_key, setting_value, description)
VALUES 
  ('default_success_manager_name', '', 'Default success manager name for all clients'),
  ('default_success_manager_email', '', 'Default success manager email'),
  ('default_success_manager_phone', '', 'Default success manager phone'),
  ('default_success_manager_image_url', '', 'Default success manager profile image URL'),
  ('default_calendar_link', '', 'Default calendar link for booking calls')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert agent portal visibility settings (all default to true)
INSERT INTO public.onboarding_settings (setting_key, setting_value, description)
VALUES 
  ('agent_portal_show_billing', 'true', 'Show billing section in agent portal'),
  ('agent_portal_show_wallet', 'true', 'Show wallet balance in agent portal'),
  ('agent_portal_show_performance_metrics', 'true', 'Show CPL, CPA, and other performance metrics'),
  ('agent_portal_show_referrals', 'true', 'Show referrals section in agent portal'),
  ('agent_portal_show_leads', 'true', 'Show leads section in agent portal')
ON CONFLICT (setting_key) DO NOTHING;