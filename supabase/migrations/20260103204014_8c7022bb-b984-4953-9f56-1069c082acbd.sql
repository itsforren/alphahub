-- Lead status history table to track all status changes
CREATE TABLE public.lead_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  source_stage text, -- Original GHL stage name for debugging
  target_premium numeric,
  changed_at timestamptz DEFAULT now(),
  changed_by text DEFAULT 'webhook', -- 'webhook', 'manual', 'sync'
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_lead_status_history_lead_id ON lead_status_history(lead_id);
CREATE INDEX idx_lead_status_history_changed_at ON lead_status_history(changed_at DESC);

-- Enable RLS
ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage lead history"
  ON lead_status_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow webhook inserts (public for edge function)
CREATE POLICY "Allow webhook insert for lead history"
  ON lead_status_history FOR INSERT
  WITH CHECK (true);

-- Allow clients to view their own lead history
CREATE POLICY "Clients can view their own lead history"
  ON lead_status_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM leads l
    JOIN clients c ON c.agent_id = l.agent_id
    WHERE l.id = lead_status_history.lead_id
    AND c.user_id = auth.uid()
  ));