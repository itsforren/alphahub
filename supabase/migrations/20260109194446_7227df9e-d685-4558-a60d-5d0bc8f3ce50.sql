-- Add column to store provisioned Twilio phone number for GHL subaccount
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS ghl_phone_number text;

COMMENT ON COLUMN public.clients.ghl_phone_number IS 'Twilio phone number provisioned for this client GHL subaccount';