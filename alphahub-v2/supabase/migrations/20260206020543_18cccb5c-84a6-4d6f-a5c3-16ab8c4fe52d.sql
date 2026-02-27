-- Add client_name column to billing_records for data preservation after client deletion
ALTER TABLE billing_records ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Backfill existing records with current client names
UPDATE billing_records br
SET client_name = c.name
FROM clients c
WHERE br.client_id::text = c.id::text
AND br.client_name IS NULL;