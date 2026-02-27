-- Add call_count and lead_source columns to prospects table
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS call_count integer DEFAULT 0;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS lead_source text;

-- Add comment for documentation
COMMENT ON COLUMN prospects.call_count IS 'Number of completed calls with this prospect';
COMMENT ON COLUMN prospects.lead_source IS 'Manual lead source: Referral, Facebook, Instagram, SEO, YouTube, Partner, Direct, Other';