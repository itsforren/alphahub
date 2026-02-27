-- Allow clients to insert their own self-onboarding tasks
CREATE POLICY "Clients can insert their own self-onboarding tasks"
  ON public.client_self_onboarding
  FOR INSERT
  WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );