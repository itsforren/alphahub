-- Add headshot_url column to prospects table
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS headshot_url text;