-- Add google_campaign_id to clients table for Google Ads integration
ALTER TABLE public.clients 
ADD COLUMN google_campaign_id TEXT;

-- Create ad_spend_daily table for storing daily spend data
CREATE TABLE public.ad_spend_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  spend_date DATE NOT NULL,
  cost NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, campaign_id, spend_date)
);

-- Enable RLS
ALTER TABLE public.ad_spend_daily ENABLE ROW LEVEL SECURITY;

-- RLS policy: Admins can manage all ad spend data
CREATE POLICY "Admins can manage all ad spend data"
ON public.ad_spend_daily
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policy: Clients can view their own ad spend data
CREATE POLICY "Clients can view their own ad spend data"
ON public.ad_spend_daily
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM clients c
  WHERE c.id = ad_spend_daily.client_id
  AND c.user_id = auth.uid()
));

-- Create index for faster queries
CREATE INDEX idx_ad_spend_daily_client_date ON public.ad_spend_daily(client_id, spend_date);
CREATE INDEX idx_ad_spend_daily_campaign ON public.ad_spend_daily(campaign_id);

-- Add comment for documentation
COMMENT ON TABLE public.ad_spend_daily IS 'Daily ad spend data synced from Google Ads API';
COMMENT ON COLUMN public.clients.google_campaign_id IS 'Google Ads campaign ID for automatic spend sync';