-- =============================================================================
-- Discovery Calls: Universal lead call tracking tool
-- =============================================================================

-- 1A. New discovery_calls table
CREATE TABLE public.discovery_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,

  -- Who made this call
  called_by UUID REFERENCES auth.users(id),
  called_by_name TEXT,

  -- Call outcome
  answered BOOLEAN,
  outcome TEXT CHECK (outcome IN (
    'scheduled', 'not_a_fit', 'voicemail', 'no_answer',
    'call_back', 'long_term_nurture', 'bad_number'
  )),
  bad_number_reason TEXT,
  temperature TEXT CHECK (temperature IN ('hot', 'warm', 'cold')),

  -- Discovery form data (JSONB for flexibility)
  discovery_data JSONB DEFAULT '{}',

  -- Scheduling
  appointment_booked_at TIMESTAMPTZ,
  appointment_datetime TIMESTAMPTZ,

  -- GHL sync
  ghl_synced_at TIMESTAMPTZ,
  ghl_sync_error TEXT,

  -- Timestamps
  call_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dc_lead ON discovery_calls(lead_id);
CREATE INDEX idx_dc_agent ON discovery_calls(agent_id);
CREATE INDEX idx_dc_date ON discovery_calls(call_date DESC);
CREATE INDEX idx_dc_outcome ON discovery_calls(outcome);

-- RLS
ALTER TABLE discovery_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_all_discovery_calls"
  ON discovery_calls FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "client_manage_own_discovery_calls"
  ON discovery_calls FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.agent_id = discovery_calls.agent_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.agent_id = discovery_calls.agent_id
      AND c.user_id = auth.uid()
    )
  );

-- 1B. Extend leads table with discovery tracking columns
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS discovery_stage TEXT DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS discovery_temperature TEXT,
  ADD COLUMN IF NOT EXISTS last_call_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_attempt_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempted_by TEXT,
  ADD COLUMN IF NOT EXISTS last_attempted_by_id UUID,
  ADD COLUMN IF NOT EXISTS currently_being_worked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lost_reason TEXT;

-- Add check constraints separately (IF NOT EXISTS not supported for constraints)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_discovery_stage_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_discovery_stage_check
      CHECK (discovery_stage IN (
        'new', 'attempt_1', 'attempt_2', 'attempt_3', 'attempt_4',
        'booked', 'completed', 'long_term_nurture', 'lost'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_discovery_temperature_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_discovery_temperature_check
      CHECK (discovery_temperature IN ('hot', 'warm', 'cold'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_disc_stage ON leads(agent_id, discovery_stage);
CREATE INDEX IF NOT EXISTS idx_leads_disc_working ON leads(currently_being_worked) WHERE currently_being_worked = true;

-- 1C. Client UPDATE policy on leads already exists (migration 20251222011650)
-- No new policy needed.

-- 1D. Backfill: delivered leads start as 'new' in the discovery queue
UPDATE leads
  SET discovery_stage = 'new'
  WHERE delivery_status = 'delivered'
  AND discovery_stage IS NULL;
