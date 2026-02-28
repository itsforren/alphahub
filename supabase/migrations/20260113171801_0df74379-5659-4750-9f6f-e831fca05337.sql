-- Add unique constraint on client_id for campaigns table
ALTER TABLE public.campaigns
ADD CONSTRAINT campaigns_client_id_key UNIQUE (client_id);