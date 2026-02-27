-- Create client_payment_methods table
CREATE TABLE public.client_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  stripe_account TEXT NOT NULL CHECK (stripe_account IN ('ad_spend', 'management')),
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_method_id TEXT NOT NULL UNIQUE,
  card_brand TEXT,
  card_last_four TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS: Agents can only SELECT their own payment methods (linked via clients table)
CREATE POLICY "Agents can view their own payment methods"
ON public.client_payment_methods
FOR SELECT
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

-- RLS: Admins can do everything (via service role)
CREATE POLICY "Service role has full access to payment methods"
ON public.client_payment_methods
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Add columns to client_wallets
ALTER TABLE public.client_wallets 
ADD COLUMN IF NOT EXISTS auto_billing_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_auto_charge_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_charge_failed_at TIMESTAMPTZ;

-- Add columns to billing_records
ALTER TABLE public.billing_records
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS charge_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_charge_error TEXT;

-- Add column to clients
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS allow_agent_self_topup BOOLEAN DEFAULT false;

-- Create updated_at trigger for client_payment_methods
CREATE OR REPLACE FUNCTION public.update_client_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_client_payment_methods_updated_at
BEFORE UPDATE ON public.client_payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_client_payment_methods_updated_at();