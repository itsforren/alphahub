-- Phase 4: Add referral_code column to prospects table
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_prospects_referral_code ON public.prospects(referral_code);

-- Update the trigger function to handle both prospects and prospect_attribution tables
CREATE OR REPLACE FUNCTION public.link_prospect_to_referrer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referrer_client_id UUID;
  v_referral_code_id UUID;
  v_code TEXT;
  v_prospect_id UUID;
  v_prospect_email TEXT;
  v_prospect_name TEXT;
BEGIN
  -- Get referral code and prospect_id based on which table triggered
  IF TG_TABLE_NAME = 'prospects' THEN
    v_code := NEW.referral_code;
    v_prospect_id := NEW.id;
    v_prospect_email := NEW.email;
    v_prospect_name := COALESCE(NEW.name, '');
  ELSIF TG_TABLE_NAME = 'prospect_attribution' THEN
    v_code := NEW.referral_code;
    v_prospect_id := NEW.prospect_id;
    -- Get prospect details
    SELECT email, COALESCE(name, '') INTO v_prospect_email, v_prospect_name
    FROM prospects WHERE id = v_prospect_id;
  END IF;
  
  -- Skip if no referral code
  IF v_code IS NULL OR v_code = '' THEN
    RETURN NEW;
  END IF;
  
  -- Look up the referral code
  SELECT rc.client_id, rc.id 
  INTO v_referrer_client_id, v_referral_code_id
  FROM referral_codes rc
  WHERE rc.code = v_code
  AND rc.is_active = true;

  IF v_referrer_client_id IS NOT NULL THEN
    -- Update the prospect with the referrer
    UPDATE prospects
    SET referrer_client_id = v_referrer_client_id
    WHERE id = v_prospect_id
    AND (referrer_client_id IS NULL OR referrer_client_id != v_referrer_client_id);

    -- Create a pending referral record if it doesn't exist
    INSERT INTO referrals (
      referrer_client_id,
      referral_code_id,
      referred_email,
      referred_name,
      status
    )
    VALUES (
      v_referrer_client_id,
      v_referral_code_id,
      v_prospect_email,
      v_prospect_name,
      'pending'::referral_status
    )
    ON CONFLICT DO NOTHING;
    
    -- Increment usage count on referral code
    UPDATE referral_codes
    SET times_used = COALESCE(times_used, 0) + 1
    WHERE id = v_referral_code_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing triggers and recreate
DROP TRIGGER IF EXISTS trigger_link_prospect_referrer ON prospect_attribution;
DROP TRIGGER IF EXISTS trigger_link_prospect_to_referrer ON prospects;

-- Trigger on prospects table for direct referral_code inserts
CREATE TRIGGER trigger_link_prospect_to_referrer
  AFTER INSERT OR UPDATE OF referral_code ON prospects
  FOR EACH ROW
  WHEN (NEW.referral_code IS NOT NULL AND NEW.referral_code != '')
  EXECUTE FUNCTION link_prospect_to_referrer();

-- Trigger on prospect_attribution for attribution-based referrals  
CREATE TRIGGER trigger_link_prospect_referrer
  AFTER INSERT OR UPDATE OF referral_code ON prospect_attribution
  FOR EACH ROW
  WHEN (NEW.referral_code IS NOT NULL AND NEW.referral_code != '')
  EXECUTE FUNCTION link_prospect_to_referrer();