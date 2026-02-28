-- Add health score pillar columns and lead/booked call metrics to campaigns table

-- Health Score Components (4 pillars - total 95 points)
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS health_score_delivery INTEGER,
  ADD COLUMN IF NOT EXISTS health_score_cvr INTEGER,
  ADD COLUMN IF NOT EXISTS health_score_cpl INTEGER,
  ADD COLUMN IF NOT EXISTS health_score_booked_call INTEGER,
  ADD COLUMN IF NOT EXISTS health_label TEXT,
  ADD COLUMN IF NOT EXISTS health_drivers JSONB;

-- Lead/Booked Call Metrics (7-day)
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS leads_last_7d INTEGER,
  ADD COLUMN IF NOT EXISTS booked_calls_last_7d INTEGER,
  ADD COLUMN IF NOT EXISTS booked_call_rate_7d NUMERIC,
  ADD COLUMN IF NOT EXISTS leads_prior_7d INTEGER,
  ADD COLUMN IF NOT EXISTS booked_calls_prior_7d INTEGER,
  ADD COLUMN IF NOT EXISTS booked_call_rate_prior_7d NUMERIC;

-- Yesterday's lead metrics  
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS leads_yesterday INTEGER,
  ADD COLUMN IF NOT EXISTS booked_calls_yesterday INTEGER,
  ADD COLUMN IF NOT EXISTS booked_call_rate_yesterday NUMERIC;

-- Pacing fields
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS wallet_remaining NUMERIC,
  ADD COLUMN IF NOT EXISTS days_remaining_in_cycle INTEGER,
  ADD COLUMN IF NOT EXISTS required_daily_spend NUMERIC,
  ADD COLUMN IF NOT EXISTS pace_drift_pct NUMERIC;

-- Add lead/booked call metrics to rolling_snapshots
ALTER TABLE public.rolling_snapshots 
  ADD COLUMN IF NOT EXISTS leads_7d INTEGER,
  ADD COLUMN IF NOT EXISTS booked_calls_7d INTEGER,
  ADD COLUMN IF NOT EXISTS booked_call_rate_7d NUMERIC,
  ADD COLUMN IF NOT EXISTS health_score_breakdown JSONB;

-- Add 7-day CVR trend columns to rolling_snapshots
ALTER TABLE public.rolling_snapshots 
  ADD COLUMN IF NOT EXISTS prior_7d_cpl NUMERIC,
  ADD COLUMN IF NOT EXISTS prior_7d_cvr NUMERIC;