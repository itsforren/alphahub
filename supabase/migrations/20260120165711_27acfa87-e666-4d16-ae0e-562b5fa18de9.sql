-- Add GHL contact ID tracking and partial answers storage
ALTER TABLE prospects 
ADD COLUMN IF NOT EXISTS ghl_contact_id text,
ADD COLUMN IF NOT EXISTS ghl_location_id text,
ADD COLUMN IF NOT EXISTS partial_answers jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS form_completed_at timestamptz;

-- Create index for inactivity check queries
CREATE INDEX IF NOT EXISTS idx_prospects_last_activity 
ON prospects(last_activity_at) 
WHERE form_completed_at IS NULL;