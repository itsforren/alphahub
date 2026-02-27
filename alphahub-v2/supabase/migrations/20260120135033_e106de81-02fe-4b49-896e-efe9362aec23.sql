-- Add timezone column to prospects table
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS timezone text;