-- =====================================================
-- Phase 2: Data Model Expansion for Downstream Metrics
-- =====================================================

-- Create daily KPI aggregation table for downstream outcome tracking
CREATE TABLE IF NOT EXISTS public.client_kpi_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  date date NOT NULL,
  -- Lead counts
  leads integer DEFAULT 0,
  booked_calls integer DEFAULT 0,
  shows integer DEFAULT 0,
  apps_submitted integer DEFAULT 0,
  approvals integer DEFAULT 0,
  declines integer DEFAULT 0,
  issued_paid integer DEFAULT 0,
  -- Premium values
  submitted_premium numeric DEFAULT 0,
  approved_premium numeric DEFAULT 0,
  issued_premium numeric DEFAULT 0,
  -- Ad metrics (from ad_spend_daily)
  ad_spend numeric DEFAULT 0,
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  -- Computed rates (stored for quick access)
  booked_rate numeric,
  app_rate numeric,
  issued_rate numeric,
  -- Cost metrics
  cpl numeric,
  cpbc numeric,
  cpsa numeric,
  cp_issued_paid numeric,
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT client_kpi_daily_unique UNIQUE(client_id, date)
);

-- Create rolling KPI table for 7-day and prior 7-day rollups
CREATE TABLE IF NOT EXISTS public.client_kpi_rolling (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  snapshot_date date NOT NULL,
  -- Last 7 days totals
  leads_7d integer DEFAULT 0,
  booked_calls_7d integer DEFAULT 0,
  apps_submitted_7d integer DEFAULT 0,
  issued_paid_7d integer DEFAULT 0,
  ad_spend_7d numeric DEFAULT 0,
  -- Last 7 days rates
  booked_rate_7d numeric,
  cpbc_7d numeric,
  cpsa_7d numeric,
  cp_issued_paid_7d numeric,
  -- Prior 7 days for delta comparison
  leads_prior_7d integer DEFAULT 0,
  booked_calls_prior_7d integer DEFAULT 0,
  ad_spend_prior_7d numeric DEFAULT 0,
  cpbc_prior_7d numeric,
  -- Deltas
  booked_rate_delta numeric,
  cpbc_delta numeric,
  -- Metadata
  created_at timestamptz DEFAULT now(),
  CONSTRAINT client_kpi_rolling_unique UNIQUE(client_id, snapshot_date)
);

-- Add downstream metrics columns to campaigns table for quick access
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS health_score_downstream integer,
ADD COLUMN IF NOT EXISTS cpbc_7d numeric,
ADD COLUMN IF NOT EXISTS cpsa_7d numeric,
ADD COLUMN IF NOT EXISTS cp_issued_paid_7d numeric,
ADD COLUMN IF NOT EXISTS apps_submitted_7d integer,
ADD COLUMN IF NOT EXISTS issued_paid_7d integer;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_kpi_daily_client_date ON public.client_kpi_daily(client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_client_kpi_rolling_client_date ON public.client_kpi_rolling(client_id, snapshot_date DESC);

-- Enable RLS
ALTER TABLE public.client_kpi_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_kpi_rolling ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access
CREATE POLICY "Authenticated users can read client KPIs" ON public.client_kpi_daily
FOR SELECT USING (true);

CREATE POLICY "Service role can manage client KPIs" ON public.client_kpi_daily
FOR ALL USING (true);

CREATE POLICY "Authenticated users can read rolling KPIs" ON public.client_kpi_rolling
FOR SELECT USING (true);

CREATE POLICY "Service role can manage rolling KPIs" ON public.client_kpi_rolling
FOR ALL USING (true);