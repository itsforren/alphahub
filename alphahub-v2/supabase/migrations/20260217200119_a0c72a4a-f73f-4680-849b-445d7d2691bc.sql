
-- Allow clients to insert their own billing records
CREATE POLICY "Clients can insert own billing records"
ON public.billing_records FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id::text = billing_records.client_id
      AND c.user_id = auth.uid()
  )
);

-- Allow clients to update their own billing records
CREATE POLICY "Clients can update own billing records"
ON public.billing_records FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id::text = billing_records.client_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id::text = billing_records.client_id
      AND c.user_id = auth.uid()
  )
);
