-- Allow admins to view all client payment methods
CREATE POLICY "Admins can view all payment methods"
ON public.client_payment_methods
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage (insert/update/delete) all client payment methods
CREATE POLICY "Admins can manage all payment methods"
ON public.client_payment_methods
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));