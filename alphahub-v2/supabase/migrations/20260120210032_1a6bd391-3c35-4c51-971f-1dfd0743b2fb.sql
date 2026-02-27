-- Add a column to mark that partial answers have already been synced to GHL
ALTER TABLE public.prospects
ADD COLUMN IF NOT EXISTS partial_sync_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.prospects.partial_sync_sent_at IS 'Timestamp when partial_answers were synced to GHL due to inactivity (one-time).';

-- Helpful index for the inactivity job query
CREATE INDEX IF NOT EXISTS idx_prospects_partial_sync_sent_at
ON public.prospects (partial_sync_sent_at)
WHERE partial_sync_sent_at IS NULL;