-- ============================================================================
-- CAMPAIGN COMMAND CENTER - COMPLETE DATABASE SCHEMA
-- ============================================================================

-- 1) CAMPAIGNS TABLE - One campaign per client (future: multiple per customer)
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  google_campaign_id TEXT NOT NULL,
  google_customer_id TEXT NOT NULL,
  current_daily_budget NUMERIC DEFAULT 0,
  last_budget_change_at TIMESTAMPTZ,
  last_budget_change_by TEXT CHECK (last_budget_change_by IN ('AUTO', 'USER', 'SAFE_MODE')),
  safe_mode BOOLEAN DEFAULT false,
  safe_mode_triggered_at TIMESTAMPTZ,
  safe_mode_reason TEXT,
  safe_mode_budget_used NUMERIC, -- Track which fallback was used (0.01, 0.10, or 1.00)
  status TEXT DEFAULT 'green' CHECK (status IN ('green', 'yellow', 'red')),
  last_status_change_at TIMESTAMPTZ,
  reason_codes TEXT[] DEFAULT '{}',
  health_score INTEGER,
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(google_customer_id, google_campaign_id)
);

-- Index for client lookups
CREATE INDEX idx_campaigns_client_id ON campaigns(client_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage campaigns"
  ON public.campaigns
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) EXTEND AD_SPEND_DAILY - Add budget tracking fields
ALTER TABLE public.ad_spend_daily
ADD COLUMN IF NOT EXISTS campaign_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS budget_daily NUMERIC,
ADD COLUMN IF NOT EXISTS budget_utilization NUMERIC,
ADD COLUMN IF NOT EXISTS overdelivery BOOLEAN DEFAULT false;

-- 3) ROLLING_SNAPSHOTS TABLE - 7d vs prior 7d metrics
CREATE TABLE public.rolling_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  -- Last 7 days
  last_7d_spend NUMERIC DEFAULT 0,
  last_7d_clicks INTEGER DEFAULT 0,
  last_7d_impressions INTEGER DEFAULT 0,
  last_7d_conversions INTEGER DEFAULT 0,
  last_7d_ctr NUMERIC,
  last_7d_cvr NUMERIC,
  last_7d_cpl NUMERIC,
  last_7d_cpc NUMERIC,
  last_7d_avg_utilization NUMERIC,
  -- Prior 7 days
  prior_7d_spend NUMERIC DEFAULT 0,
  prior_7d_clicks INTEGER DEFAULT 0,
  prior_7d_impressions INTEGER DEFAULT 0,
  prior_7d_conversions INTEGER DEFAULT 0,
  prior_7d_ctr NUMERIC,
  prior_7d_cvr NUMERIC,
  prior_7d_cpl NUMERIC,
  prior_7d_cpc NUMERIC,
  -- Deltas (% change)
  delta_spend_pct NUMERIC,
  delta_conversions_pct NUMERIC,
  delta_ctr_pct NUMERIC,
  delta_cvr_pct NUMERIC,
  delta_cpl_pct NUMERIC,
  delta_cpc_pct NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, snapshot_date)
);

ALTER TABLE public.rolling_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rolling_snapshots"
  ON public.rolling_snapshots
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) CAMPAIGN_SETTINGS TABLE - Global and per-campaign settings
CREATE TABLE public.campaign_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  -- Policy version for learning correlation
  policy_version TEXT DEFAULT 'v1.0',
  -- Auto-approve toggles (all default OFF)
  auto_approve_green BOOLEAN DEFAULT false,
  auto_approve_yellow BOOLEAN DEFAULT false,
  auto_approve_red BOOLEAN DEFAULT false,
  safe_mode_auto_trigger BOOLEAN DEFAULT true,
  -- KPI Thresholds
  ctr_red_threshold NUMERIC DEFAULT 5.0,
  cvr_red_threshold NUMERIC DEFAULT 4.0,
  no_conv_spend_threshold NUMERIC DEFAULT 60.0,
  not_spending_budget_threshold NUMERIC DEFAULT 30.0,
  not_spending_spend_threshold NUMERIC DEFAULT 5.0,
  clicks_no_conv_threshold INTEGER DEFAULT 50,
  cpl_yellow_threshold NUMERIC DEFAULT 50.0,
  max_budget_change_pct NUMERIC DEFAULT 20.0,
  target_spend_pct NUMERIC DEFAULT 95.0,
  -- AI Provider settings
  ai_provider TEXT DEFAULT 'lovable_llm' CHECK (ai_provider IN ('lovable_llm', 'custom_ai_server')),
  custom_ai_server_url TEXT,
  -- Reminder settings (Eastern time hours)
  reminder_quiet_hours_start INTEGER DEFAULT 22,
  reminder_quiet_hours_end INTEGER DEFAULT 8,
  -- Slack integration
  slack_webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Partial unique indexes for global row uniqueness fix
CREATE UNIQUE INDEX campaign_settings_global_unique 
  ON campaign_settings ((1)) WHERE campaign_id IS NULL;
CREATE UNIQUE INDEX campaign_settings_campaign_unique 
  ON campaign_settings (campaign_id) WHERE campaign_id IS NOT NULL;

-- Insert global defaults row
INSERT INTO campaign_settings (campaign_id) VALUES (NULL);

ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaign_settings"
  ON public.campaign_settings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 5) PROPOSALS TABLE - Approval queue with learning fields
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  proposed_action_type TEXT NOT NULL CHECK (proposed_action_type IN ('SET_BUDGET', 'SAFE_MODE', 'INVESTIGATE', 'RESTORE_BUDGET')),
  current_daily_budget NUMERIC,
  proposed_daily_budget NUMERIC,
  delta_pct NUMERIC,
  reason_codes TEXT[] DEFAULT '{}',
  ai_summary TEXT,
  ai_diagnosis TEXT,
  health_score INTEGER,
  pacing_info JSONB,
  -- Learning/confidence fields
  recommendation_confidence NUMERIC,
  similar_cases_count INTEGER DEFAULT 0,
  similar_cases_summary TEXT,
  policy_version TEXT,
  ai_provider TEXT,
  -- Status and approval
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'executed', 'auto_executed')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  -- User feedback (from denial flow)
  user_override_budget NUMERIC,
  user_decline_reason TEXT,
  decision_outcome TEXT CHECK (decision_outcome IN (
    'APPROVE_AS_IS', 'APPROVE_WITH_EDIT', 'DENY_NO_CHANGE', 
    'DENY_SET_SAFE_MODE', 'ESCALATE_INVESTIGATION'
  )),
  primary_reason_category TEXT,
  specific_reason_codes TEXT[],
  next_action TEXT,
  confidence_override TEXT,
  user_note TEXT,
  -- Execution
  executed_at TIMESTAMPTZ,
  execution_result JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_proposals_campaign_id ON proposals(campaign_id);
CREATE INDEX idx_proposals_client_id ON proposals(client_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage proposals"
  ON public.proposals
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 6) CAMPAIGN_AUDIT_LOG TABLE - Complete audit trail
CREATE TABLE public.campaign_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  actor TEXT NOT NULL CHECK (actor IN ('AUTO', 'USER', 'SYSTEM', 'SAFE_MODE')),
  actor_user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason_codes TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaign_audit_log_campaign ON campaign_audit_log(campaign_id);
CREATE INDEX idx_campaign_audit_log_created ON campaign_audit_log(created_at DESC);

ALTER TABLE public.campaign_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view campaign_audit_log"
  ON public.campaign_audit_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert campaign_audit_log"
  ON public.campaign_audit_log
  FOR INSERT
  WITH CHECK (true);

-- 7) DECISION_EVENTS TABLE - Learning/memory for similarity and future training
CREATE TABLE public.decision_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Policy/AI context
  policy_version TEXT,
  ai_provider TEXT,
  -- Decision metadata
  decision_type TEXT CHECK (decision_type IN (
    'PROPOSAL', 'AUTO_SAFE_MODE', 'AUTO_EXECUTION', 'MANUAL_OVERRIDE'
  )),
  status_at_decision TEXT,
  reason_codes TEXT[] DEFAULT '{}',
  -- Proposed action
  proposed_action_type TEXT,
  proposed_daily_budget NUMERIC,
  proposed_delta_pct NUMERIC,
  proposed_pacing_info JSONB,
  -- Human decision
  was_approved BOOLEAN,
  decision_at TIMESTAMPTZ,
  final_action_type TEXT,
  final_daily_budget NUMERIC,
  final_delta_pct NUMERIC,
  -- User feedback dropdowns (EXACT SPEC)
  decision_outcome TEXT CHECK (decision_outcome IN (
    'APPROVE_AS_IS', 'APPROVE_WITH_EDIT', 'DENY_NO_CHANGE', 
    'DENY_SET_SAFE_MODE', 'ESCALATE_INVESTIGATION'
  )),
  primary_reason_category TEXT,
  specific_reason_codes TEXT[],
  next_action TEXT,
  confidence_override TEXT,
  user_note TEXT,
  -- Features at decision time (CRITICAL: snapshot for learning)
  features_at_decision JSONB NOT NULL DEFAULT '{}',
  -- Outcomes (populated by outcome-tracker-job)
  outcome_1d JSONB,
  outcome_3d JSONB,
  outcome_7d JSONB,
  outcome_score_3d NUMERIC,
  outcome_score_7d NUMERIC,
  -- Similarity data
  similar_cases_ids UUID[],
  recommendation_confidence NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_decision_events_campaign ON decision_events(campaign_id);
CREATE INDEX idx_decision_events_created ON decision_events(created_at DESC);
CREATE INDEX idx_decision_events_status ON decision_events(status_at_decision);
CREATE INDEX idx_decision_events_outcome ON decision_events(decision_outcome);

ALTER TABLE public.decision_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage decision_events"
  ON public.decision_events
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 8) ADD BILLING CYCLE FIELDS TO CLIENTS
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS billing_cycle_start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS billing_cycle_end_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'active' 
  CHECK (billing_status IN ('active', 'past_due', 'payment_failed', 'suspended'));

-- 9) UPDATED_AT TRIGGERS
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

CREATE TRIGGER campaign_settings_updated_at
  BEFORE UPDATE ON campaign_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

CREATE TRIGGER decision_events_updated_at
  BEFORE UPDATE ON decision_events
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();