-- Add discovery_calendar_id column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS discovery_calendar_id text;