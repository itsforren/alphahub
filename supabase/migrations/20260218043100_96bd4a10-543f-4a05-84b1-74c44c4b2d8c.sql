
-- Add stripe_subscription_id to billing_records
ALTER TABLE public.billing_records 
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Create client_stripe_subscriptions table
CREATE TABLE IF NOT EXISTS public.client_stripe_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  stripe_account text NOT NULL,
  stripe_subscription_id text NOT NULL,
  stripe_price_id text,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'active',
  billing_type text NOT NULL DEFAULT 'management',
  amount numeric NOT NULL DEFAULT 0,
  recurrence_type text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(stripe_subscription_id)
);

-- Enable RLS
ALTER TABLE public.client_stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage subscriptions"
ON public.client_stripe_subscriptions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Clients can view their own subscriptions
CREATE POLICY "Clients can view own subscriptions"
ON public.client_stripe_subscriptions
FOR SELECT
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_client_stripe_subscriptions_updated_at
  BEFORE UPDATE ON public.client_stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
