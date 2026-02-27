-- Add email column to visitor_sessions for identity resolution (the "locking" mechanism)
ALTER TABLE public.visitor_sessions ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_email ON public.visitor_sessions(email) WHERE email IS NOT NULL;

-- Create conversions table for revenue tracking
CREATE TABLE IF NOT EXISTS public.conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT,
  lead_id UUID,
  email TEXT NOT NULL,
  
  -- Transaction details
  transaction_id TEXT NOT NULL UNIQUE, -- Stripe payment_intent or checkout.session id
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'usd',
  
  -- Attribution data (captured at time of conversion)
  first_touch_source TEXT,
  first_touch_campaign TEXT,
  last_touch_source TEXT,
  last_touch_campaign TEXT,
  
  -- Metadata
  stripe_customer_id TEXT,
  product_name TEXT,
  payment_status TEXT DEFAULT 'succeeded',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversions ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversions
CREATE POLICY "Admins can manage conversions" ON public.conversions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow public insert for webhook (service role will handle this)
CREATE POLICY "Allow service role insert" ON public.conversions
  FOR INSERT WITH CHECK (true);

-- Add realtime for conversions
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversions;

-- Index for email lookups on conversions
CREATE INDEX idx_conversions_email ON public.conversions(email);
CREATE INDEX idx_conversions_visitor_id ON public.conversions(visitor_id) WHERE visitor_id IS NOT NULL;