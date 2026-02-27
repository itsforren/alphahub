-- Add sales_subaccount_id setting
INSERT INTO onboarding_settings (setting_key, setting_value, description)
VALUES ('sales_subaccount_id', 'wDoj91sbkfxZnMbow2G5', 'GHL Location ID for B2B sales tracking')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now();

-- Add "No Show" pipeline stage (shift existing stages first)
UPDATE sales_pipeline_stages SET order_index = order_index + 1 WHERE order_index >= 3;

INSERT INTO sales_pipeline_stages (stage_name, stage_key, order_index, color, ghl_tag, is_closed)
VALUES ('No Show', 'no_show', 3, '#f97316', 'no-show', false)
ON CONFLICT (stage_key) DO NOTHING;

-- Add appointment tracking columns to prospects table
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS appointment_status text;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS ghl_appointment_id text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_prospects_ghl_appointment_id ON prospects(ghl_appointment_id);
CREATE INDEX IF NOT EXISTS idx_prospects_appointment_status ON prospects(appointment_status);