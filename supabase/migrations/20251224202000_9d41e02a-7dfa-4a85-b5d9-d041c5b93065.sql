-- Insert the performance percentage setting with 7% default
INSERT INTO public.onboarding_settings (setting_key, setting_value, description)
VALUES ('performance_percentage', '7', 'Percentage to increase displayed ad spend (e.g., 7 means +7%)')
ON CONFLICT (setting_key) DO NOTHING;