-- Create billing type enum
CREATE TYPE public.billing_type AS ENUM ('ad_spend', 'management');

-- Create billing status enum
CREATE TYPE public.billing_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');

-- Create billing_records table
CREATE TABLE public.billing_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  billing_type billing_type NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  billing_period_start DATE,
  billing_period_end DATE,
  due_date DATE,
  status billing_status NOT NULL DEFAULT 'pending',
  payment_link TEXT,
  stripe_invoice_id TEXT,
  stripe_account TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (admin only for now)
CREATE POLICY "Admins can manage all billing records"
ON public.billing_records
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_billing_records_updated_at
BEFORE UPDATE ON public.billing_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_billing_records_client_id ON public.billing_records(client_id);
CREATE INDEX idx_billing_records_status ON public.billing_records(status);
CREATE INDEX idx_billing_records_due_date ON public.billing_records(due_date);