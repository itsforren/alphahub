-- Allow clients to update status on their own leads
CREATE POLICY "Clients can update status on their own leads"
ON public.leads
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM clients c
  WHERE c.agent_id = leads.agent_id
  AND c.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM clients c
  WHERE c.agent_id = leads.agent_id
  AND c.user_id = auth.uid()
));