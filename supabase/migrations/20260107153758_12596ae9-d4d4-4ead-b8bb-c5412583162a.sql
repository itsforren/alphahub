
-- =====================================================
-- REFERRAL SYSTEM COMPLETE FIX - Part 2
-- =====================================================

-- Regenerate all existing client referral codes with new FirstLast format
DO $$
DECLARE
  client_record RECORD;
  new_code TEXT;
BEGIN
  FOR client_record IN 
    SELECT id, name FROM clients 
    WHERE name IS NOT NULL 
    AND deleted_at IS NULL
  LOOP
    -- Generate new code using updated function
    new_code := generate_referral_code(client_record.name);
    
    -- Update or insert into referral_codes (without updated_at)
    INSERT INTO referral_codes (client_id, code, is_active)
    VALUES (client_record.id, new_code, true)
    ON CONFLICT (client_id) 
    DO UPDATE SET code = new_code, is_active = true;
    
    -- Update clients table
    UPDATE clients SET referral_code = new_code WHERE id = client_record.id;
  END LOOP;
END $$;

-- Create indexes for faster referral lookups
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_prospect_attribution_referral_code ON public.prospect_attribution(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospects_referrer_client_id ON public.prospects(referrer_client_id) WHERE referrer_client_id IS NOT NULL;
