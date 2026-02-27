
-- Create enhanced_conversion_logs table for auditing Google Ads Enhanced Conversion attempts
CREATE TABLE public.enhanced_conversion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  conversion_type text NOT NULL,
  email_provided text,
  phone_provided text,
  first_name_provided text,
  last_name_provided text,
  source text,
  google_api_status integer,
  google_api_response jsonb,
  success boolean DEFAULT false,
  error_message text
);

-- Enable RLS
ALTER TABLE public.enhanced_conversion_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT policy
CREATE POLICY "Admins can view conversion logs"
  ON public.enhanced_conversion_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
