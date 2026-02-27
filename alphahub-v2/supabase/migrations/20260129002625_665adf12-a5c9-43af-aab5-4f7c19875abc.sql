-- Drop existing admin policy for support_tickets
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.support_tickets;

-- Create new policy that allows both admin AND member roles to manage tickets
CREATE POLICY "Staff can manage all tickets" 
ON public.support_tickets 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'member'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'member'::app_role)
);