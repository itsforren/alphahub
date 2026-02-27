-- Add crm_delivery_enabled column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS crm_delivery_enabled BOOLEAN DEFAULT true;

-- Add comment
COMMENT ON COLUMN public.clients.crm_delivery_enabled IS 'Controls whether leads should be delivered to this client CRM';