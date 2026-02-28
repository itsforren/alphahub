-- Fix: ad_spend_daily.conversions must accept decimal values from Google Ads
ALTER TABLE public.ad_spend_daily
  ALTER COLUMN conversions TYPE numeric
  USING conversions::numeric;

ALTER TABLE public.ad_spend_daily
  ALTER COLUMN conversions SET DEFAULT 0;