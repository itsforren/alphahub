-- Create enum types for referral and reward statuses
CREATE TYPE referral_status AS ENUM ('pending', 'signed_up', 'active', 'churned');
CREATE TYPE reward_status AS ENUM ('pending', 'approved', 'paid', 'cancelled');

-- Create referral_codes table
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT unique_client_referral_code UNIQUE(client_id)
);

-- Create referrals table to track each referral
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  referred_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  referred_name TEXT,
  status referral_status NOT NULL DEFAULT 'pending',
  referred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signed_up_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create referral_rewards table to track rewards and payouts
CREATE TABLE public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  referrer_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  reward_type TEXT NOT NULL DEFAULT 'signup_bonus',
  status reward_status NOT NULL DEFAULT 'pending',
  period_start DATE,
  period_end DATE,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add referral tracking columns to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS referred_by_client_id UUID REFERENCES clients(id);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- Enable RLS on all tables
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_codes
CREATE POLICY "Clients can view their own referral code"
ON public.referral_codes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM clients c 
  WHERE c.id = referral_codes.client_id 
  AND c.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all referral codes"
ON public.referral_codes FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for referrals
CREATE POLICY "Clients can view their own referrals"
ON public.referrals FOR SELECT
USING (EXISTS (
  SELECT 1 FROM clients c 
  WHERE c.id = referrals.referrer_client_id 
  AND c.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all referrals"
ON public.referrals FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for referral_rewards
CREATE POLICY "Clients can view their own rewards"
ON public.referral_rewards FOR SELECT
USING (EXISTS (
  SELECT 1 FROM clients c 
  WHERE c.id = referral_rewards.referrer_client_id 
  AND c.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all rewards"
ON public.referral_rewards FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Function to generate a unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code(client_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_code TEXT;
  random_suffix TEXT;
  full_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Format: ALPHA-{FIRST4LETTERS}{RANDOM4}
  base_code := 'ALPHA-' || UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(client_name, 'USER'), '[^a-zA-Z]', '', 'g'), 1, 4));
  
  LOOP
    random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 4));
    full_code := base_code || random_suffix;
    
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = full_code) INTO code_exists;
    
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN full_code;
END;
$$;

-- Function to get or create referral code for a client
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code(p_client_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_client_name TEXT;
BEGIN
  -- Check if code already exists
  SELECT code INTO v_code
  FROM referral_codes
  WHERE client_id = p_client_id AND is_active = true;
  
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;
  
  -- Get client name for code generation
  SELECT name INTO v_client_name FROM clients WHERE id = p_client_id;
  
  -- Generate new code
  v_code := generate_referral_code(v_client_name);
  
  -- Insert new referral code
  INSERT INTO referral_codes (client_id, code)
  VALUES (p_client_id, v_code);
  
  -- Update client with their referral code
  UPDATE clients SET referral_code = v_code WHERE id = p_client_id;
  
  RETURN v_code;
END;
$$;

-- Trigger to auto-generate referral codes for new clients
CREATE OR REPLACE FUNCTION public.auto_generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM get_or_create_referral_code(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_client_created_generate_referral_code
AFTER INSERT ON clients
FOR EACH ROW
EXECUTE FUNCTION auto_generate_referral_code();

-- Create indexes for performance
CREATE INDEX idx_referral_codes_client_id ON referral_codes(client_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referrals_referrer_client_id ON referrals(referrer_client_id);
CREATE INDEX idx_referrals_referred_client_id ON referrals(referred_client_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referral_rewards_referrer_client_id ON referral_rewards(referrer_client_id);
CREATE INDEX idx_referral_rewards_status ON referral_rewards(status);
CREATE INDEX idx_clients_referred_by ON clients(referred_by_client_id);
CREATE INDEX idx_clients_referral_code ON clients(referral_code);