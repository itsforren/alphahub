-- Fix overly-restrictive RLS policy combinations so admins can see/manage imported data

-- Clients
DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Clients can view their own record" ON public.clients;

CREATE POLICY "Admins can manage all clients"
ON public.clients
AS PERMISSIVE
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their own record"
ON public.clients
AS PERMISSIVE
FOR SELECT
USING (user_id = auth.uid());

-- Leads
DROP POLICY IF EXISTS "Admins can manage all leads" ON public.leads;
DROP POLICY IF EXISTS "Clients can view their own leads" ON public.leads;

CREATE POLICY "Admins can manage all leads"
ON public.leads
AS PERMISSIVE
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their own leads"
ON public.leads
AS PERMISSIVE
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.agent_id = public.leads.agent_id
      AND c.user_id = auth.uid()
  )
);

-- Onboarding tasks
DROP POLICY IF EXISTS "Admins can manage all onboarding tasks" ON public.onboarding_tasks;
DROP POLICY IF EXISTS "Clients can view their own onboarding tasks" ON public.onboarding_tasks;

CREATE POLICY "Admins can manage all onboarding tasks"
ON public.onboarding_tasks
AS PERMISSIVE
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their own onboarding tasks"
ON public.onboarding_tasks
AS PERMISSIVE
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = public.onboarding_tasks.client_id
      AND c.user_id = auth.uid()
  )
);
