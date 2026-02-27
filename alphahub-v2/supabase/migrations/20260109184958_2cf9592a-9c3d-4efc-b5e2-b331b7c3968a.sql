-- Add UPDATE policy for clients table so clients can update their own record (needed for contract_signed_at)
CREATE POLICY "Clients can update their own record"
ON public.clients
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND deleted_at IS NULL)
WITH CHECK (user_id = auth.uid() AND deleted_at IS NULL);

-- Add UPDATE policy for onboarding_checklist table so clients can update their own checklist items
CREATE POLICY "Clients can update their own checklist items"
ON public.onboarding_checklist
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clients c 
    WHERE c.id = onboarding_checklist.client_id 
    AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c 
    WHERE c.id = onboarding_checklist.client_id 
    AND c.user_id = auth.uid()
  )
);