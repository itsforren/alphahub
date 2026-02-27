-- Create client self-onboarding checklist table for client-facing tasks
CREATE TABLE public.client_self_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  task_label TEXT NOT NULL,
  help_url TEXT,
  display_order INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, task_key)
);

-- Enable Row Level Security
ALTER TABLE public.client_self_onboarding ENABLE ROW LEVEL SECURITY;

-- Clients can view and update their own tasks
CREATE POLICY "Clients can view their own self-onboarding tasks"
ON public.client_self_onboarding
FOR SELECT
USING (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);

CREATE POLICY "Clients can update their own self-onboarding tasks"
ON public.client_self_onboarding
FOR UPDATE
USING (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);

-- Admins can do everything
CREATE POLICY "Admins can manage all self-onboarding tasks"
ON public.client_self_onboarding
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_client_self_onboarding_updated_at
BEFORE UPDATE ON public.client_self_onboarding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_client_self_onboarding_client_id ON public.client_self_onboarding(client_id);

-- Make support_tickets.client_id nullable for internal tickets
ALTER TABLE public.support_tickets ALTER COLUMN client_id DROP NOT NULL;

-- Add ticket_type column for distinguishing internal vs client tickets
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'support_tickets' 
                 AND column_name = 'ticket_type') THEN
    ALTER TABLE public.support_tickets ADD COLUMN ticket_type TEXT DEFAULT 'client_support' CHECK (ticket_type IN ('client_support', 'internal'));
  END IF;
END $$;