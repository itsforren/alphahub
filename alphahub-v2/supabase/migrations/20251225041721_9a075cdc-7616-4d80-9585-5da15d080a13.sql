-- Create ghl_oauth_tokens table to store encrypted agency tokens
CREATE TABLE public.ghl_oauth_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  company_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ghl_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can access tokens
CREATE POLICY "Admins can manage GHL tokens"
ON public.ghl_oauth_tokens
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create ghl_api_logs table for API request logging
CREATE TABLE public.ghl_api_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_type TEXT NOT NULL,
  company_id TEXT,
  location_id TEXT,
  status TEXT NOT NULL,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ghl_api_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view GHL API logs"
ON public.ghl_api_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert logs (edge functions)
CREATE POLICY "Service role can insert logs"
ON public.ghl_api_logs
FOR INSERT
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_ghl_oauth_tokens_updated_at
BEFORE UPDATE ON public.ghl_oauth_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();