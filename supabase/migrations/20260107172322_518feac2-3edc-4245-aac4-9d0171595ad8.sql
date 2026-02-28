-- First, delete duplicate referrals (keep only the first one per email + referrer combo)
DELETE FROM referrals r1
USING referrals r2
WHERE r1.id > r2.id
  AND r1.referred_email = r2.referred_email
  AND r1.referrer_client_id = r2.referrer_client_id;

-- Add unique constraint to prevent future duplicates
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_unique_email_referrer;
ALTER TABLE referrals ADD CONSTRAINT referrals_unique_email_referrer 
  UNIQUE (referred_email, referrer_client_id);

-- Update the trigger function to use ON CONFLICT properly
CREATE OR REPLACE FUNCTION public.link_prospect_to_referrer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code text;
  v_referrer_client_id uuid;
  v_referral_code_id uuid;
  v_prospect_id uuid;
  v_prospect_email text;
  v_prospect_name text;
BEGIN
  -- Determine which table triggered us and get prospect info
  IF TG_TABLE_NAME = 'prospect_attribution' THEN
    v_referral_code := NEW.referral_code;
    v_prospect_id := NEW.prospect_id;
    
    -- Fetch prospect info
    SELECT id, email, name INTO v_prospect_id, v_prospect_email, v_prospect_name
    FROM prospects WHERE id = NEW.prospect_id;
  ELSE
    -- prospects table
    v_referral_code := NEW.referral_code;
    v_prospect_id := NEW.id;
    v_prospect_email := NEW.email;
    v_prospect_name := NEW.name;
    
    -- Fallback: look up from visitor_sessions if referral_code is null
    IF v_referral_code IS NULL AND NEW.visitor_id IS NOT NULL THEN
      SELECT vs.referral_code INTO v_referral_code
      FROM visitor_sessions vs
      WHERE vs.visitor_id = NEW.visitor_id
        AND vs.referral_code IS NOT NULL
      ORDER BY vs.created_at DESC
      LIMIT 1;
    END IF;
  END IF;

  -- If we still don't have a referral code, nothing to do
  IF v_referral_code IS NULL OR v_referral_code = '' THEN
    RETURN NEW;
  END IF;

  -- Look up the referral code (case-insensitive)
  SELECT rc.id, rc.client_id INTO v_referral_code_id, v_referrer_client_id
  FROM referral_codes rc
  WHERE LOWER(rc.code) = LOWER(v_referral_code)
  LIMIT 1;

  -- If referral code doesn't exist, nothing to do
  IF v_referrer_client_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Update the prospect with referrer info (only for prospects table trigger)
  IF TG_TABLE_NAME = 'prospects' THEN
    -- Use NEW to update the row being inserted/updated
    NEW.referral_code := v_referral_code;
    NEW.referrer_client_id := v_referrer_client_id;
    NEW.lead_source := 'Referral'; -- Capitalized to match UI
  END IF;

  -- Insert into referrals table (idempotent with ON CONFLICT)
  INSERT INTO referrals (
    referrer_client_id,
    referral_code_id,
    referred_email,
    referred_name,
    referred_at,
    status
  ) VALUES (
    v_referrer_client_id,
    v_referral_code_id,
    v_prospect_email,
    v_prospect_name,
    now(),
    'pending'
  )
  ON CONFLICT (referred_email, referrer_client_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop and recreate triggers to use BEFORE instead of AFTER (so we can modify NEW)
DROP TRIGGER IF EXISTS trg_link_prospect_referrer_on_prospects ON prospects;
DROP TRIGGER IF EXISTS trg_link_prospect_referrer_on_attribution ON prospect_attribution;

-- Create BEFORE trigger on prospects
CREATE TRIGGER trg_link_prospect_referrer_on_prospects
  BEFORE INSERT OR UPDATE OF referral_code, visitor_id
  ON prospects
  FOR EACH ROW
  EXECUTE FUNCTION link_prospect_to_referrer();

-- Create AFTER trigger on prospect_attribution (just for referral insert, doesn't modify row)
CREATE TRIGGER trg_link_prospect_referrer_on_attribution
  AFTER INSERT OR UPDATE OF referral_code
  ON prospect_attribution
  FOR EACH ROW
  EXECUTE FUNCTION link_prospect_to_referrer();

-- Fix existing prospects with lowercase lead_source
UPDATE prospects SET lead_source = 'Referral' WHERE lead_source = 'referral';