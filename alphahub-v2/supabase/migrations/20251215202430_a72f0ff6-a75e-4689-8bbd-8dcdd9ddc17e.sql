-- Add recurrence fields to billing_records
ALTER TABLE public.billing_records 
ADD COLUMN recurrence_type TEXT DEFAULT 'one_time' CHECK (recurrence_type IN ('one_time', 'bi_weekly', 'monthly')),
ADD COLUMN next_due_date DATE,
ADD COLUMN is_recurring_parent BOOLEAN DEFAULT false,
ADD COLUMN parent_billing_id UUID REFERENCES public.billing_records(id);

-- Create client_wallets table for tracking ad spend balance
CREATE TABLE public.client_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE,
  ad_spend_balance NUMERIC NOT NULL DEFAULT 0,
  low_balance_threshold NUMERIC NOT NULL DEFAULT 150,
  auto_charge_amount NUMERIC,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on client_wallets
ALTER TABLE public.client_wallets ENABLE ROW LEVEL SECURITY;

-- Admin only policy for wallets
CREATE POLICY "Admins can manage all wallets"
ON public.client_wallets
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create wallet transactions table for audit trail
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES public.client_wallets(id) ON DELETE CASCADE NOT NULL,
  client_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'spend', 'adjustment')),
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  description TEXT,
  billing_record_id UUID REFERENCES public.billing_records(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on wallet_transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Admin only policy for transactions
CREATE POLICY "Admins can manage all wallet transactions"
ON public.wallet_transactions
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_client_id ON public.wallet_transactions(client_id);
CREATE INDEX idx_billing_records_recurrence ON public.billing_records(recurrence_type, next_due_date);

-- Trigger to update updated_at on wallets
CREATE TRIGGER update_client_wallets_updated_at
BEFORE UPDATE ON public.client_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();