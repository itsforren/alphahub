-- Drop the old constraint
ALTER TABLE public.clients DROP CONSTRAINT clients_status_check;

-- Add updated constraint with all status options
ALTER TABLE public.clients ADD CONSTRAINT clients_status_check 
CHECK (status = ANY (ARRAY['active', 'inactive', 'paused', 'onboarding', 'pending reactivation', 'at_risk', 'cancelled']));