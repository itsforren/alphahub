-- Create table for storing agreement OTPs
CREATE TABLE public.agreement_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  verified_at TIMESTAMPTZ,
  agreement_id UUID REFERENCES public.agreements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agreement_otps ENABLE ROW LEVEL SECURITY;

-- Create index for email lookups
CREATE INDEX idx_agreement_otps_email ON public.agreement_otps(email);

-- Create index for expiry cleanup
CREATE INDEX idx_agreement_otps_expires_at ON public.agreement_otps(expires_at);

-- Policy: Allow insert for anyone (public endpoint)
CREATE POLICY "Allow insert for OTP requests"
ON public.agreement_otps
FOR INSERT
WITH CHECK (true);

-- Policy: Allow update for verification attempts
CREATE POLICY "Allow update for OTP verification"
ON public.agreement_otps
FOR UPDATE
USING (true);

-- Policy: Allow select for verification
CREATE POLICY "Allow select for OTP verification"
ON public.agreement_otps
FOR SELECT
USING (true);