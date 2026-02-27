-- Add referrer and manual source columns to prospects table
ALTER TABLE prospects 
ADD COLUMN IF NOT EXISTS referrer_url text,
ADD COLUMN IF NOT EXISTS first_referrer_url text,
ADD COLUMN IF NOT EXISTS manual_source text,
ADD COLUMN IF NOT EXISTS manual_referrer_agent_name text;

-- Add referrer columns to prospect_attribution table
ALTER TABLE prospect_attribution
ADD COLUMN IF NOT EXISTS referrer_url text,
ADD COLUMN IF NOT EXISTS first_referrer_url text;