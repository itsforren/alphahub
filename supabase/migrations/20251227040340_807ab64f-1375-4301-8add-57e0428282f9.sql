-- Create expense_categories table with standard business categories
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',
  is_tax_deductible BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage expense categories"
ON public.expense_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert standard business expense categories
INSERT INTO public.expense_categories (name, color, icon, is_tax_deductible, display_order) VALUES
('Advertising & Marketing', '#ef4444', 'megaphone', true, 1),
('Software & Subscriptions', '#8b5cf6', 'code', true, 2),
('Office Supplies', '#3b82f6', 'package', true, 3),
('Professional Services', '#06b6d4', 'briefcase', true, 4),
('Travel & Transportation', '#10b981', 'plane', true, 5),
('Meals & Entertainment', '#f59e0b', 'utensils', false, 6),
('Insurance', '#ec4899', 'shield', true, 7),
('Utilities', '#6366f1', 'zap', true, 8),
('Rent & Facilities', '#14b8a6', 'building', true, 9),
('Payroll & Contractors', '#f97316', 'users', true, 10),
('Bank Fees & Interest', '#64748b', 'credit-card', true, 11),
('Taxes & Licenses', '#dc2626', 'file-text', true, 12),
('Equipment & Assets', '#0ea5e9', 'monitor', true, 13),
('Education & Training', '#a855f7', 'graduation-cap', true, 14),
('Miscellaneous', '#94a3b8', 'more-horizontal', true, 99);

-- Create bank_accounts table for Plaid connections
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plaid_item_id TEXT UNIQUE,
  plaid_access_token_encrypted TEXT,
  institution_name TEXT NOT NULL,
  institution_id TEXT,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'checking',
  account_subtype TEXT,
  mask TEXT,
  current_balance NUMERIC DEFAULT 0,
  available_balance NUMERIC,
  currency_code TEXT DEFAULT 'USD',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_cursor TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage bank accounts"
ON public.bank_accounts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create expenses table for transactions
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  plaid_transaction_id TEXT UNIQUE,
  transaction_date DATE NOT NULL,
  posted_date DATE,
  merchant_name TEXT,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency_code TEXT DEFAULT 'USD',
  is_pending BOOLEAN NOT NULL DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  is_manual_entry BOOLEAN NOT NULL DEFAULT false,
  is_auto_categorized BOOLEAN DEFAULT false,
  receipt_url TEXT,
  notes TEXT,
  tags TEXT[],
  plaid_category TEXT[],
  plaid_personal_finance_category JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage expenses"
ON public.expenses
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for common queries
CREATE INDEX idx_expenses_transaction_date ON public.expenses(transaction_date DESC);
CREATE INDEX idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX idx_expenses_bank_account_id ON public.expenses(bank_account_id);
CREATE INDEX idx_expenses_merchant_name ON public.expenses(merchant_name);

-- Create categorization_rules table for auto-categorization
CREATE TABLE public.categorization_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'contains',
  match_value TEXT NOT NULL,
  match_field TEXT NOT NULL DEFAULT 'merchant_name',
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_match_type CHECK (match_type IN ('exact', 'contains', 'starts_with', 'ends_with', 'regex')),
  CONSTRAINT valid_match_field CHECK (match_field IN ('merchant_name', 'description'))
);

-- Enable RLS
ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage categorization rules"
ON public.categorization_rules
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for rule matching
CREATE INDEX idx_categorization_rules_priority ON public.categorization_rules(priority DESC, is_active);

-- Insert some common auto-categorization rules
INSERT INTO public.categorization_rules (category_id, rule_name, match_type, match_value, priority) VALUES
((SELECT id FROM public.expense_categories WHERE name = 'Software & Subscriptions'), 'OpenAI', 'contains', 'OPENAI', 100),
((SELECT id FROM public.expense_categories WHERE name = 'Software & Subscriptions'), 'Google Cloud', 'contains', 'GOOGLE*CLOUD', 99),
((SELECT id FROM public.expense_categories WHERE name = 'Software & Subscriptions'), 'AWS', 'contains', 'AMAZON WEB SERVICES', 98),
((SELECT id FROM public.expense_categories WHERE name = 'Software & Subscriptions'), 'Stripe', 'contains', 'STRIPE', 97),
((SELECT id FROM public.expense_categories WHERE name = 'Advertising & Marketing'), 'Facebook Ads', 'contains', 'FACEBOOKADS', 100),
((SELECT id FROM public.expense_categories WHERE name = 'Advertising & Marketing'), 'Google Ads', 'contains', 'GOOGLE*ADS', 99),
((SELECT id FROM public.expense_categories WHERE name = 'Office Supplies'), 'Amazon', 'contains', 'AMZN', 50),
((SELECT id FROM public.expense_categories WHERE name = 'Bank Fees & Interest'), 'Bank Fee', 'contains', 'FEE', 30);

-- Add trigger for updated_at
CREATE TRIGGER update_expense_categories_updated_at
BEFORE UPDATE ON public.expense_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categorization_rules_updated_at
BEFORE UPDATE ON public.categorization_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();