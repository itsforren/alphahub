-- Add start_date for accurate lifespan/LTV calculations (editable)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS start_date DATE;

-- Add churn_reason for tracking cancellation reasons
ALTER TABLE clients ADD COLUMN IF NOT EXISTS churn_reason TEXT;

-- Add first_contact_at for Speed to Lead tracking on prospects
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_contact_at TIMESTAMPTZ;

-- Create Internal Marketing Settings Table for Google/Meta Ads tracking
CREATE TABLE IF NOT EXISTS internal_marketing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE internal_marketing_settings ENABLE ROW LEVEL SECURITY;

-- Admin can manage internal marketing settings
CREATE POLICY "Admin can manage internal marketing settings"
  ON internal_marketing_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_internal_marketing_settings_updated_at
  BEFORE UPDATE ON internal_marketing_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO internal_marketing_settings (setting_key, setting_value) VALUES
  ('google_ads_internal_campaign_id', '""'::jsonb),
  ('meta_ads_config', '{"access_token": "", "ad_account_id": "", "campaign_ids": []}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;