-- Add utm_id and ttclid columns to prospect_attribution for internal storage
ALTER TABLE prospect_attribution 
ADD COLUMN IF NOT EXISTS first_touch_utm_id text,
ADD COLUMN IF NOT EXISTS first_touch_ttclid text,
ADD COLUMN IF NOT EXISTS last_touch_utm_id text,
ADD COLUMN IF NOT EXISTS last_touch_ttclid text;