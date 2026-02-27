-- Add ignore columns to campaigns table for temporarily excluding campaigns from attention views
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ignored boolean DEFAULT false;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ignored_reason text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ignored_at timestamptz;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ignored_by uuid REFERENCES auth.users(id);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ignored_until timestamptz;