-- Add A2P status tracking columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS a2p_brand_status text DEFAULT 'unknown';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS a2p_campaign_status text DEFAULT 'unknown';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS a2p_last_synced_at timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS a2p_brand_id text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS a2p_campaign_id text;

-- Add comment for documentation
COMMENT ON COLUMN clients.a2p_brand_status IS 'A2P brand registration status: unknown, not_started, submitted, pending, approved, rejected';
COMMENT ON COLUMN clients.a2p_campaign_status IS 'A2P campaign registration status: unknown, not_started, submitted, pending, approved, rejected';