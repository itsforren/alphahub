-- Fix the agreements UPDATE RLS policy to allow status transition from 'pending' to 'signed'
DROP POLICY IF EXISTS "Clients can update own pending agreements" ON public.agreements;

CREATE POLICY "Clients can update own pending agreements"
ON public.agreements
FOR UPDATE
TO authenticated
USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  AND status = 'pending'
)
WITH CHECK (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  AND status IN ('pending', 'signed')
);