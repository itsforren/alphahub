-- Dual Campaign Support: allow multiple campaigns per client
-- Drop the UNIQUE(client_id) constraint so a client can have >1 campaign row

ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_client_id_key;

-- Add per-campaign fields
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS states TEXT,
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Backfill existing clients into campaigns table (skip if already there)
INSERT INTO campaigns (id, client_id, google_customer_id, google_campaign_id, is_primary, label, states)
SELECT
  gen_random_uuid(),
  c.id,
  split_part(c.google_campaign_id, ':', 1),
  split_part(c.google_campaign_id, ':', 2),
  true,
  'Campaign 1',
  c.states
FROM clients c
WHERE c.google_campaign_id IS NOT NULL
  AND c.google_campaign_id LIKE '%:%'
ON CONFLICT (google_customer_id, google_campaign_id) DO UPDATE
  SET is_primary = true,
      label = COALESCE(campaigns.label, 'Campaign 1'),
      states = EXCLUDED.states;

-- Add secondary template setting to onboarding_settings
INSERT INTO onboarding_settings (setting_key, setting_value, description)
VALUES ('template_campaign_id_secondary', '', 'Secondary Google Ads campaign template (revamped style)')
ON CONFLICT (setting_key) DO NOTHING;
