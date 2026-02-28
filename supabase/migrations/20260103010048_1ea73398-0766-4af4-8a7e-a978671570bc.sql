-- Add Google Ads campaign creation tracking columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS gads_campaign_created boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gads_adgroup_created boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gads_ad_created boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gads_creation_error text,
ADD COLUMN IF NOT EXISTS gads_last_attempt_at timestamp with time zone;