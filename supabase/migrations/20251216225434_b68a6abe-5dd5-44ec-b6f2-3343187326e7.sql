-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage all billing records" ON public.billing_records;

-- Create a proper PERMISSIVE policy for admins
CREATE POLICY "Admins can manage all billing records"
ON public.billing_records
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));