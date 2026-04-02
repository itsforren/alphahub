-- Security hardening: fix 4 RLS gaps identified in audit
-- Applied 2026-04-01

-- 1. campaign_budget_changes: was open to public (USING: true, TO public)
--    Anyone with the anon key could read AND write budget changes.
DROP POLICY IF EXISTS "Service role full access" ON campaign_budget_changes;
CREATE POLICY "Admins can manage campaign budget changes" ON campaign_budget_changes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. ec_enhancement_queue: RLS was OFF — exposed email, phone, first/last name (PII)
ALTER TABLE ec_enhancement_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage EC queue" ON ec_enhancement_queue
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
-- Note: service_role (edge functions, cron jobs) bypasses RLS entirely — no policy needed for that

-- 3. nfia_agents: RLS was OFF — exposed agent email, phone, NPN, license numbers
ALTER TABLE nfia_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage NFIA agents" ON nfia_agents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
-- Published agents are intentionally public (used on landing pages)
CREATE POLICY "Anyone can view published agents" ON nfia_agents
  FOR SELECT TO public
  USING (published_at IS NOT NULL);

-- 4. team_notification_preferences: RLS was OFF — exposed team member email/phone
ALTER TABLE team_notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage team notification prefs" ON team_notification_preferences
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Clients can manage their own team prefs" ON team_notification_preferences
  FOR ALL TO authenticated
  USING (agent_id = (SELECT agent_id FROM clients WHERE user_id = auth.uid() AND deleted_at IS NULL LIMIT 1))
  WITH CHECK (agent_id = (SELECT agent_id FROM clients WHERE user_id = auth.uid() AND deleted_at IS NULL LIMIT 1));
