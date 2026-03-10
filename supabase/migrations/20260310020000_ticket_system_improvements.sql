-- =============================================================================
-- Ticket System Improvements Migration
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Expand ticket_type CHECK constraint
-- ---------------------------------------------------------------------------
-- The inline CHECK constraint has an auto-generated name. Try known patterns.
DO $$
BEGIN
  -- Try the most common auto-generated constraint name patterns
  ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_ticket_type_check;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_ticket_type_check1;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- Recreate with expanded values
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_ticket_type_check
  CHECK (ticket_type IN ('client_support', 'internal', 'bug_report', 'feature_request', 'update', 'system_change'));

-- ---------------------------------------------------------------------------
-- 2. Add labels column to support_tickets
-- ---------------------------------------------------------------------------
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS labels JSONB DEFAULT '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- 3. Create ticket_attachments table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES public.ticket_replies(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT attachment_parent_check CHECK (ticket_id IS NOT NULL OR reply_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON public.ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_reply_id ON public.ticket_attachments(reply_id);

-- ---------------------------------------------------------------------------
-- 4. Create ticket_activity_log table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_activity_log_ticket_id ON public.ticket_activity_log(ticket_id);

-- ---------------------------------------------------------------------------
-- 5. Create ticket_templates table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  priority ticket_priority NOT NULL DEFAULT 'normal',
  ticket_type TEXT DEFAULT 'internal',
  labels JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6. Create ticket-attachments storage bucket
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. RLS Policies
-- ---------------------------------------------------------------------------

-- === ticket_attachments ===
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to ticket attachments"
  ON public.ticket_attachments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view attachments on their own tickets"
  ON public.ticket_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      JOIN public.clients c ON c.id = t.client_id
      WHERE t.id = ticket_attachments.ticket_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attachments on their own tickets"
  ON public.ticket_attachments FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      JOIN public.clients c ON c.id = t.client_id
      WHERE t.id = ticket_id
      AND c.user_id = auth.uid()
    )
  );

-- === ticket_activity_log ===
ALTER TABLE public.ticket_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to ticket activity log"
  ON public.ticket_activity_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view activity on their own tickets"
  ON public.ticket_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      JOIN public.clients c ON c.id = t.client_id
      WHERE t.id = ticket_activity_log.ticket_id
      AND c.user_id = auth.uid()
    )
  );

-- === ticket_templates ===
ALTER TABLE public.ticket_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full CRUD on ticket templates"
  ON public.ticket_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read active ticket templates"
  ON public.ticket_templates FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

-- === Storage policies for ticket-attachments bucket ===

-- Public read access (bucket is public)
CREATE POLICY "Anyone can read ticket attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ticket-attachments');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload ticket attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND auth.uid() IS NOT NULL
  );

-- ---------------------------------------------------------------------------
-- 8. Auto activity logging trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_ticket_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ticket_activity_log (ticket_id, user_id, action, old_value, new_value, metadata)
    VALUES (
      NEW.id,
      auth.uid(),
      'status_change',
      OLD.status,
      NEW.status,
      jsonb_build_object('field', 'status')
    );
  END IF;

  -- Log priority changes
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.ticket_activity_log (ticket_id, user_id, action, old_value, new_value, metadata)
    VALUES (
      NEW.id,
      auth.uid(),
      'priority_change',
      OLD.priority::text,
      NEW.priority::text,
      jsonb_build_object('field', 'priority')
    );
  END IF;

  -- Log assignment changes
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.ticket_activity_log (ticket_id, user_id, action, old_value, new_value, metadata)
    VALUES (
      NEW.id,
      auth.uid(),
      'assignment_change',
      OLD.assigned_to::text,
      NEW.assigned_to::text,
      jsonb_build_object('field', 'assigned_to')
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if present, then create
DROP TRIGGER IF EXISTS trigger_log_ticket_changes ON public.support_tickets;
CREATE TRIGGER trigger_log_ticket_changes
  AFTER UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_ticket_changes();

-- ---------------------------------------------------------------------------
-- 9. Update support_agents
-- ---------------------------------------------------------------------------

-- Link Sierra Reigh to her user_id
UPDATE public.support_agents
SET user_id = 'f12f4bfc-711a-4c20-bfd8-33f35017de65'
WHERE id = '15ee1086-0fba-4b1b-8f75-c17d85764267';

-- Add Forren Warren as a support agent
INSERT INTO public.support_agents (user_id, name, email, is_active, categories)
VALUES (
  'd49ea69f-8c84-47f1-8024-0954acc374e0',
  'Forren Warren',
  'forren@alphaagent.io',
  true,
  ARRAY['billing', 'leads', 'tech', 'onboarding', 'other']
)
ON CONFLICT (email) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  categories = EXCLUDED.categories,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 10. Insert default templates
-- ---------------------------------------------------------------------------
INSERT INTO public.ticket_templates (name, subject, message, category, priority, ticket_type, labels, is_active)
VALUES
  (
    'Campaign Pause Request',
    'Request to Pause Campaign',
    'Hi team,

I would like to request a pause on my Google Ads campaign effective immediately. Please confirm once the campaign has been paused and let me know if there are any pending charges or considerations I should be aware of.

Thank you.',
    'tech',
    'high',
    'internal',
    '["campaign", "pause"]'::jsonb,
    true
  ),
  (
    'Wallet Refill Needed',
    'Ad Spend Wallet Refill Required',
    'The ad spend wallet balance is running low and needs to be refilled to keep campaigns running without interruption. Please process a refill at your earliest convenience.',
    'billing',
    'urgent',
    'internal',
    '["billing", "wallet"]'::jsonb,
    true
  ),
  (
    'Lead Quality Issue',
    'Reporting Lead Quality Concern',
    'I have been receiving leads that do not meet the expected quality criteria. Please review the recent lead delivery and advise on any adjustments that can be made to improve targeting and lead quality.',
    'leads',
    'normal',
    'client_support',
    '["leads", "quality"]'::jsonb,
    true
  ),
  (
    'New Feature Request',
    'Feature Request Submission',
    'I would like to submit a feature request for consideration. Please see the details below and let me know if additional information is needed.',
    'other',
    'normal',
    'feature_request',
    '["feature-request"]'::jsonb,
    true
  )
ON CONFLICT DO NOTHING;
