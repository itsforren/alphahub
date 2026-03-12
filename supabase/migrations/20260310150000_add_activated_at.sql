-- Track when a client goes from onboarding to active
ALTER TABLE clients ADD COLUMN IF NOT EXISTS activated_at timestamptz;

-- Backfill: for existing active clients, use updated_at as a best guess
UPDATE clients SET activated_at = updated_at WHERE status = 'active' AND activated_at IS NULL;
