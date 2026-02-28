-- 1. Add 'referrer' to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'referrer';

-- 2. Create referral_partners table
CREATE TABLE public.referral_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  referral_code TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.referral_partners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_partners
CREATE POLICY "Users can view own partner record"
  ON public.referral_partners FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all partners"
  ON public.referral_partners FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_referral_partners_updated_at
  BEFORE UPDATE ON public.referral_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Modify referral_codes to support partners
ALTER TABLE public.referral_codes 
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES referral_partners(id) ON DELETE CASCADE;

-- Update constraint to allow either client or partner
ALTER TABLE public.referral_codes DROP CONSTRAINT IF EXISTS referral_codes_client_id_fkey;
ALTER TABLE public.referral_codes ALTER COLUMN client_id DROP NOT NULL;

-- Add check constraint
ALTER TABLE public.referral_codes 
  ADD CONSTRAINT either_client_or_partner CHECK (
    (client_id IS NOT NULL AND partner_id IS NULL) OR 
    (client_id IS NULL AND partner_id IS NOT NULL)
  );

-- 4. Modify referrals table to support partner referrers
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS referrer_partner_id UUID REFERENCES referral_partners(id) ON DELETE CASCADE;

-- Make referrer_client_id nullable
ALTER TABLE public.referrals ALTER COLUMN referrer_client_id DROP NOT NULL;

-- Add check constraint for referrals
ALTER TABLE public.referrals 
  ADD CONSTRAINT either_client_or_partner_referrer CHECK (
    (referrer_client_id IS NOT NULL AND referrer_partner_id IS NULL) OR 
    (referrer_client_id IS NULL AND referrer_partner_id IS NOT NULL)
  );

-- 5. Add RLS policy for referral_codes to include partners
CREATE POLICY "Partners can view own referral codes"
  ON public.referral_codes FOR SELECT
  USING (
    partner_id IN (
      SELECT id FROM referral_partners WHERE user_id = auth.uid()
    )
  );

-- 6. Add RLS policy for referrals to include partner referrers
CREATE POLICY "Partners can view referrals they created"
  ON public.referrals FOR SELECT
  USING (
    referrer_partner_id IN (
      SELECT id FROM referral_partners WHERE user_id = auth.uid()
    )
  );

-- 7. Create function to generate partner referral code
CREATE OR REPLACE FUNCTION public.get_or_create_partner_referral_code(p_partner_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code TEXT;
  v_partner_name TEXT;
BEGIN
  -- Check if code already exists
  SELECT code INTO v_code
  FROM referral_codes
  WHERE partner_id = p_partner_id AND is_active = true;
  
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;
  
  -- Get partner name for code generation
  SELECT first_name || last_name INTO v_partner_name 
  FROM referral_partners 
  WHERE id = p_partner_id;
  
  -- Generate new code using existing function
  v_code := generate_referral_code(v_partner_name);
  
  -- Insert new referral code
  INSERT INTO referral_codes (partner_id, code)
  VALUES (p_partner_id, v_code);
  
  -- Update partner with their referral code
  UPDATE referral_partners SET referral_code = v_code WHERE id = p_partner_id;
  
  RETURN v_code;
END;
$function$;