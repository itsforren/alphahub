-- Add premium tracking columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS target_premium numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS issued_premium numeric DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.leads.target_premium IS 'Target premium amount when lead status is submitted';
COMMENT ON COLUMN public.leads.issued_premium IS 'Actual premium amount when lead status is issued paid';