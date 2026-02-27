-- Phase 4: Automatic Referral Activation
-- Create a trigger function that activates referrals when prospects.client_id is set

CREATE OR REPLACE FUNCTION public.activate_referral_on_prospect_conversion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referral_record RECORD;
BEGIN
  -- Only proceed if client_id was just set (changed from NULL to a value)
  IF NEW.client_id IS NOT NULL AND (OLD.client_id IS NULL OR OLD.client_id IS DISTINCT FROM NEW.client_id) THEN
    -- Set converted_at if not already set
    IF NEW.converted_at IS NULL THEN
      NEW.converted_at := now();
    END IF;
    
    -- Look for a pending referral by email
    SELECT id, referrer_client_id INTO v_referral_record
    FROM referrals
    WHERE LOWER(referred_email) = LOWER(NEW.email)
      AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_referral_record.id IS NOT NULL THEN
      -- Prevent self-referral
      IF v_referral_record.referrer_client_id IS DISTINCT FROM NEW.client_id THEN
        -- Update the referral to active
        UPDATE referrals
        SET 
          referred_client_id = NEW.client_id,
          status = 'active',
          activated_at = now(),
          updated_at = now()
        WHERE id = v_referral_record.id;
        
        RAISE NOTICE 'Referral % activated for client %', v_referral_record.id, NEW.client_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on prospects table
DROP TRIGGER IF EXISTS trg_activate_referral_on_conversion ON prospects;
CREATE TRIGGER trg_activate_referral_on_conversion
  BEFORE UPDATE OF client_id ON prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_referral_on_prospect_conversion();

-- Backfill: Link existing prospects to clients by matching email
-- This updates prospects that have matching client emails but no client_id set
UPDATE prospects p
SET 
  client_id = c.id,
  converted_at = COALESCE(p.converted_at, c.created_at)
FROM clients c
WHERE LOWER(p.email) = LOWER(c.email)
  AND p.client_id IS NULL
  AND c.deleted_at IS NULL;

-- Backfill: Activate any pending referrals that now have a matching client
UPDATE referrals r
SET 
  referred_client_id = c.id,
  status = 'active',
  activated_at = COALESCE(r.activated_at, now()),
  updated_at = now()
FROM clients c
WHERE LOWER(r.referred_email) = LOWER(c.email)
  AND r.status = 'pending'
  AND r.referred_client_id IS NULL
  AND c.deleted_at IS NULL
  AND r.referrer_client_id IS DISTINCT FROM c.id;