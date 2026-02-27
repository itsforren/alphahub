-- Add historical total paid for LTV backfill
ALTER TABLE clients ADD COLUMN IF NOT EXISTS historical_total_paid DECIMAL DEFAULT 0;

-- Add editable end_date for cohort retention (separate from deleted_at)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS end_date DATE;

-- Optional: client-specific margin override (defaults to 50% if null)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS profit_margin DECIMAL;