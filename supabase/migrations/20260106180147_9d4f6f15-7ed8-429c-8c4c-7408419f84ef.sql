-- Add booked_call_at column to leads table for history tracking
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS booked_call_at TIMESTAMPTZ;

-- Create function to track lead stage history
CREATE OR REPLACE FUNCTION public.track_lead_stage_history()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to 'booked call' or beyond, set booked_call_at if not already set
  IF NEW.status IN ('booked call', 'submitted', 'approved', 'issued paid') 
     AND (OLD.status IS NULL OR OLD.status = 'new') 
     AND NEW.booked_call_at IS NULL THEN
    NEW.booked_call_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for lead stage history
DROP TRIGGER IF EXISTS trigger_track_lead_stage_history ON public.leads;
CREATE TRIGGER trigger_track_lead_stage_history
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.track_lead_stage_history();

-- Backfill booked_call_at for existing leads that have progressed beyond 'new'
UPDATE public.leads 
SET booked_call_at = COALESCE(submitted_at, approved_at, issued_at, updated_at)
WHERE status IN ('booked call', 'submitted', 'approved', 'issued paid')
  AND booked_call_at IS NULL;