-- Add audit_events column to agreements table for comprehensive action tracking
ALTER TABLE public.agreements ADD COLUMN IF NOT EXISTS audit_events JSONB DEFAULT '[]'::jsonb;

-- Add initials_sections_completed column to store multiple initials with timestamps
ALTER TABLE public.agreements ADD COLUMN IF NOT EXISTS initials_sections_completed JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.agreements.audit_events IS 'Comprehensive audit log of all user actions during agreement signing with timestamps and IP addresses';
COMMENT ON COLUMN public.agreements.initials_sections_completed IS 'Stores initials for each section (no_refunds, chargebacks, arbitration, etc.) with timestamps and IP';