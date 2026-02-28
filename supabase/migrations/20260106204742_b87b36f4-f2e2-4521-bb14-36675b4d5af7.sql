-- Create agreements table with full audit trail
CREATE TABLE public.agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Status & Timing
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'expired')),
  signed_at TIMESTAMPTZ,
  
  -- Signer Information (captured/verified at signing)
  signer_full_name TEXT,
  signer_email TEXT,
  signer_phone TEXT,
  signer_state TEXT,
  signer_business_address TEXT,
  signer_license_number TEXT,
  signer_license_states TEXT[],
  
  -- SMS OTP Verification
  otp_verified BOOLEAN DEFAULT false,
  otp_verified_at TIMESTAMPTZ,
  otp_provider_receipt JSONB,
  
  -- Signature Data
  signature_drawn_url TEXT,
  signature_typed TEXT,
  electronic_intent_accepted BOOLEAN DEFAULT false,
  electronic_intent_accepted_at TIMESTAMPTZ,
  printed_name TEXT,
  
  -- Key Terms Checkboxes (individual timestamps)
  key_terms_checkboxes JSONB DEFAULT '{}',
  
  -- Initials Capture
  initials_ip_no_copying TEXT,
  initials_ip_no_copying_at TIMESTAMPTZ,
  
  -- Legal Audit Trail
  ip_address TEXT,
  ip_forwarded_for TEXT,
  user_agent TEXT,
  platform_os TEXT,
  screen_resolution TEXT,
  language_locale TEXT,
  geolocation_city TEXT,
  geolocation_region TEXT,
  session_id TEXT,
  csrf_token_id TEXT,
  referrer_url TEXT,
  utm_params JSONB,
  
  -- Behavioral Tracking
  page_load_at TIMESTAMPTZ,
  signed_at_local_offset INTEGER,
  scrolled_to_bottom BOOLEAN DEFAULT false,
  scrolled_to_bottom_at TIMESTAMPTZ,
  time_on_page_seconds INTEGER,
  focus_events JSONB,
  
  -- Document Storage & Verification
  template_id TEXT DEFAULT 'alpha-agent-v4',
  contract_content TEXT,
  contract_content_hash TEXT,
  pdf_url TEXT,
  pdf_hash TEXT,
  
  -- Payment Linking
  payment_customer_id TEXT,
  payment_invoice_id TEXT,
  payment_subscription_id TEXT,
  payment_amount NUMERIC,
  payment_date TIMESTAMPTZ,
  payment_last4 TEXT,
  payment_brand TEXT,
  payment_auth_code TEXT,
  
  -- Hash Verification Log
  hash_emailed_at TIMESTAMPTZ,
  hash_email_message_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_agreements_client_id ON public.agreements(client_id);
CREATE INDEX idx_agreements_status ON public.agreements(status);

-- Enable RLS
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

-- RLS Policies using has_role function
CREATE POLICY "Clients can view own agreements" ON public.agreements
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Clients can create own agreements" ON public.agreements
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Clients can update own pending agreements" ON public.agreements
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) AND status = 'pending');

CREATE POLICY "Admins can manage all agreements" ON public.agreements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create agreement_templates table
CREATE TABLE public.agreement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL UNIQUE DEFAULT 'alpha-agent-v4',
  name TEXT NOT NULL DEFAULT 'Default Agreement',
  version TEXT NOT NULL DEFAULT 'v4.0',
  is_active BOOLEAN DEFAULT true,
  content TEXT NOT NULL,
  key_terms JSONB DEFAULT '[]',
  initials_sections JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Enable RLS on templates
ALTER TABLE public.agreement_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage templates" ON public.agreement_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read active templates" ON public.agreement_templates
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Update clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS agreement_id UUID REFERENCES public.agreements(id),
ADD COLUMN IF NOT EXISTS custom_agreement_content TEXT;

-- Create storage bucket for agreements
INSERT INTO storage.buckets (id, name, public)
VALUES ('agreements', 'agreements', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload to agreements"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'agreements');

CREATE POLICY "Users can view own agreement files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'agreements' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM clients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all agreement files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'agreements' AND
  public.has_role(auth.uid(), 'admin')
);