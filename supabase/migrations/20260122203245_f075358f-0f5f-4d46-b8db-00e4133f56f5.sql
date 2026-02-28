-- Add cache-busting timestamp for headshots
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS headshot_updated_at TIMESTAMPTZ;

-- Backfill for existing rows
UPDATE public.clients
SET headshot_updated_at = COALESCE(headshot_updated_at, updated_at, now())
WHERE headshot_updated_at IS NULL;
