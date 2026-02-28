-- Add new columns to prospects table for multi-step qualification flow
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS licensed_status TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS monthly_budget_range TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS desired_timeline TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS current_bottleneck TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS qualified_path TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS payment_plan_interest TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS payment_plan_credit_available TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS calculator_notes TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS avg_monthly_issued_paid TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS has_downline BOOLEAN;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS downline_count INTEGER;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS post_booking_submitted_at TIMESTAMPTZ;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS contact_capture_at TIMESTAMPTZ;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS qualification_submit_at TIMESTAMPTZ;

-- Add index on qualified_path for quick filtering
CREATE INDEX IF NOT EXISTS idx_prospects_qualified_path ON prospects(qualified_path);

-- Add comment for documentation
COMMENT ON COLUMN prospects.qualified_path IS 'Tracks stage progression: Contact Captured, Qualified (standard), Qualified (payment plan), Disqualified (budget), Disqualified (license), Booked, Post-booking Complete';