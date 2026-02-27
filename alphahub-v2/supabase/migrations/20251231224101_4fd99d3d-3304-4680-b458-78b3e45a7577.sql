-- Create priority enum for tickets
CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- Create support_agents configuration table
CREATE TABLE public.support_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  categories text[] NOT NULL DEFAULT '{}',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_agents ENABLE ROW LEVEL SECURITY;

-- RLS policies for support_agents
CREATE POLICY "Admins can manage support agents"
  ON public.support_agents FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active support agents"
  ON public.support_agents FOR SELECT
  USING (is_active = true);

-- Add columns to support_tickets
ALTER TABLE public.support_tickets 
  ADD COLUMN assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN assigned_at timestamp with time zone,
  ADD COLUMN priority ticket_priority NOT NULL DEFAULT 'normal',
  ADD COLUMN sla_deadline timestamp with time zone,
  ADD COLUMN escalated_at timestamp with time zone,
  ADD COLUMN resolved_at timestamp with time zone;

-- Create index for faster queries
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX idx_support_tickets_sla_deadline ON public.support_tickets(sla_deadline);

-- Function to get default support agent for a category
CREATE OR REPLACE FUNCTION public.get_support_agent_for_category(p_category text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_user_id uuid;
BEGIN
  -- First try to find an agent that handles this category
  SELECT user_id INTO v_agent_user_id
  FROM public.support_agents
  WHERE is_active = true 
    AND p_category = ANY(categories)
  ORDER BY created_at
  LIMIT 1;
  
  -- If no category match, get the default agent
  IF v_agent_user_id IS NULL THEN
    SELECT user_id INTO v_agent_user_id
    FROM public.support_agents
    WHERE is_active = true AND is_default = true
    LIMIT 1;
  END IF;
  
  RETURN v_agent_user_id;
END;
$$;

-- Function to calculate SLA deadline based on category/priority
CREATE OR REPLACE FUNCTION public.calculate_sla_deadline(p_category text, p_priority ticket_priority)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours integer;
BEGIN
  -- Onboarding issues get 24 hours
  IF p_category = 'onboarding' THEN
    v_hours := 24;
  -- High/urgent priority get shorter SLA
  ELSIF p_priority = 'urgent' THEN
    v_hours := 4;
  ELSIF p_priority = 'high' THEN
    v_hours := 12;
  -- Normal tickets get 48 hours
  ELSE
    v_hours := 48;
  END IF;
  
  RETURN now() + (v_hours || ' hours')::interval;
END;
$$;

-- Trigger function to auto-assign tickets on creation
CREATE OR REPLACE FUNCTION public.auto_assign_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-assign if not already assigned
  IF NEW.assigned_to IS NULL THEN
    NEW.assigned_to := get_support_agent_for_category(NEW.category);
    IF NEW.assigned_to IS NOT NULL THEN
      NEW.assigned_at := now();
    END IF;
  END IF;
  
  -- Calculate SLA deadline if not set
  IF NEW.sla_deadline IS NULL THEN
    NEW.sla_deadline := calculate_sla_deadline(NEW.category, NEW.priority);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-assignment
CREATE TRIGGER trigger_auto_assign_ticket
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_ticket();

-- Enable realtime for support_tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;

-- Updated at trigger for support_agents
CREATE TRIGGER update_support_agents_updated_at
  BEFORE UPDATE ON public.support_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();