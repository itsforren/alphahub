-- Create client_credits table for referral credits
CREATE TABLE public.client_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  applied_to_billing_id UUID REFERENCES public.billing_records(id) ON DELETE SET NULL,
  applied_at TIMESTAMP WITH TIME ZONE,
  expires_at DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add payment_reference and credit_applied_id to billing_records
ALTER TABLE public.billing_records 
ADD COLUMN payment_reference TEXT,
ADD COLUMN credit_applied_id UUID REFERENCES public.client_credits(id) ON DELETE SET NULL;

-- Enable RLS on client_credits
ALTER TABLE public.client_credits ENABLE ROW LEVEL SECURITY;

-- RLS policy for admins
CREATE POLICY "Admins can manage all credits"
ON public.client_credits
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_client_credits_client_id ON public.client_credits(client_id);
CREATE INDEX idx_client_credits_available ON public.client_credits(client_id) WHERE applied_to_billing_id IS NULL;

-- Trigger for updated_at
CREATE TRIGGER update_client_credits_updated_at
BEFORE UPDATE ON public.client_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();