-- Phase 1: Add referrer tracking to prospects and commission config

-- Add referrer_client_id to prospects table to track who referred this prospect
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS referrer_client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Create referral commission config table
CREATE TABLE IF NOT EXISTS public.referral_commission_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_percentage NUMERIC NOT NULL DEFAULT 10,
  billing_types TEXT[] DEFAULT ARRAY['management'],
  is_lifetime BOOLEAN DEFAULT true,
  max_months INTEGER, -- null = lifetime
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default configuration (10% commission on management fees, lifetime)
INSERT INTO public.referral_commission_config (commission_percentage, billing_types, is_lifetime, max_months)
VALUES (10, ARRAY['management'], true, NULL)
ON CONFLICT DO NOTHING;

-- Enable RLS on commission config
ALTER TABLE public.referral_commission_config ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage commission config
CREATE POLICY "Admins can manage commission config"
ON public.referral_commission_config FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add billing_record_id to referral_rewards to track which billing generated the commission
ALTER TABLE public.referral_rewards ADD COLUMN IF NOT EXISTS billing_record_id UUID REFERENCES billing_records(id) ON DELETE SET NULL;

-- Add referred_client_name to referral_rewards for easier display
ALTER TABLE public.referral_rewards ADD COLUMN IF NOT EXISTS referred_client_name TEXT;

-- Create function to link prospect to referrer when attribution has a referral_code
CREATE OR REPLACE FUNCTION public.link_prospect_to_referrer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_client_id UUID;
  v_referral_code_id UUID;
BEGIN
  -- Only run on INSERT
  IF TG_OP = 'INSERT' AND NEW.referral_code IS NOT NULL THEN
    -- Look up the referral code
    SELECT rc.client_id, rc.id 
    INTO v_referrer_client_id, v_referral_code_id
    FROM referral_codes rc
    WHERE rc.code = NEW.referral_code
    AND rc.is_active = true;

    IF v_referrer_client_id IS NOT NULL THEN
      -- Update the prospect with the referrer
      UPDATE prospects
      SET referrer_client_id = v_referrer_client_id
      WHERE id = NEW.prospect_id;

      -- Create a pending referral record
      INSERT INTO referrals (
        referrer_client_id,
        referral_code_id,
        referred_email,
        referred_name,
        status
      )
      SELECT 
        v_referrer_client_id,
        v_referral_code_id,
        p.email,
        COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''),
        'pending'::referral_status
      FROM prospects p
      WHERE p.id = NEW.prospect_id
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on prospect_attribution to link prospects to referrers
DROP TRIGGER IF EXISTS link_prospect_to_referrer_trigger ON prospect_attribution;
CREATE TRIGGER link_prospect_to_referrer_trigger
AFTER INSERT ON prospect_attribution
FOR EACH ROW
EXECUTE FUNCTION link_prospect_to_referrer();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_prospects_referrer_client_id ON prospects(referrer_client_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_billing_record_id ON referral_rewards(billing_record_id);

-- Add policy for clients to view their own referral commission config (read-only)
CREATE POLICY "Clients can view active commission config"
ON public.referral_commission_config FOR SELECT
USING (is_active = true);