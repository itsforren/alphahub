-- Update function to generate simple FirstNameLastName codes (no ALPHA- prefix)
CREATE OR REPLACE FUNCTION generate_referral_code(client_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_code text;
  full_code text;
  code_exists boolean;
  counter integer := 0;
BEGIN
  -- Remove special characters and spaces, keep letters only
  base_code := regexp_replace(client_name, '[^a-zA-Z]', '', 'g');
  full_code := base_code;
  
  -- Check for uniqueness, add number suffix if needed
  LOOP
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE LOWER(code) = LOWER(full_code)) INTO code_exists;
    IF NOT code_exists THEN EXIT; END IF;
    counter := counter + 1;
    full_code := base_code || counter::text;
    IF counter > 100 THEN EXIT; END IF;
  END LOOP;
  
  RETURN full_code;
END;
$$;

-- Backfill existing ALPHA- prefixed codes to simple format
UPDATE referral_codes 
SET code = regexp_replace(
  regexp_replace(code, '^ALPHA-', ''),
  '[0-9]+$', ''
)
WHERE code LIKE 'ALPHA-%';

-- Also update any referral_code in clients table
UPDATE clients
SET referral_code = regexp_replace(
  regexp_replace(referral_code, '^ALPHA-', ''),
  '[0-9]+$', ''
)
WHERE referral_code LIKE 'ALPHA-%';

-- Add sales_calendar_ids setting if not exists
INSERT INTO onboarding_settings (setting_key, setting_value)
VALUES ('sales_calendar_ids', '[]')
ON CONFLICT (setting_key) DO NOTHING;