-- Add resolution notes to support tickets for tracking what was fixed and how
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolution_notes text;
