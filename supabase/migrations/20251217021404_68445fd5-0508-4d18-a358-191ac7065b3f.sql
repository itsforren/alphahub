-- Add new link columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS tfwp_profile_link text,
ADD COLUMN IF NOT EXISTS agreement_link text;