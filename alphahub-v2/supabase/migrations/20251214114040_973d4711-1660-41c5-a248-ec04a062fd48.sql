-- Add 'client' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  profile_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'at_risk', 'cancelled')),
  management_fee NUMERIC DEFAULT 0,
  monthly_ad_spend NUMERIC DEFAULT 0,
  renewal_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create performance_snapshots table
CREATE TABLE public.performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  leads_delivered_this_month INTEGER DEFAULT 0,
  booked_calls_this_month INTEGER DEFAULT 0,
  cost_per_lead NUMERIC DEFAULT 0,
  fulfillment_status TEXT NOT NULL DEFAULT 'green' CHECK (fulfillment_status IN ('green', 'yellow', 'red')),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('billing', 'leads', 'tech', 'other')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reply_at TIMESTAMPTZ
);

-- Create ticket_replies table for conversation thread
CREATE TABLE public.ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_admin_reply BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

-- RLS for clients table
CREATE POLICY "Admins can manage all clients"
ON public.clients FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their own record"
ON public.clients FOR SELECT
USING (user_id = auth.uid());

-- RLS for performance_snapshots
CREATE POLICY "Admins can manage all snapshots"
ON public.performance_snapshots FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their own performance"
ON public.performance_snapshots FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.clients
  WHERE clients.id = performance_snapshots.client_id
  AND clients.user_id = auth.uid()
));

-- RLS for support_tickets
CREATE POLICY "Admins can manage all tickets"
ON public.support_tickets FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their own tickets"
ON public.support_tickets FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.clients
  WHERE clients.id = support_tickets.client_id
  AND clients.user_id = auth.uid()
));

CREATE POLICY "Clients can create their own tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.clients
  WHERE clients.id = client_id
  AND clients.user_id = auth.uid()
));

-- RLS for ticket_replies
CREATE POLICY "Admins can manage all replies"
ON public.ticket_replies FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view replies on their tickets"
ON public.ticket_replies FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.support_tickets t
  JOIN public.clients c ON c.id = t.client_id
  WHERE t.id = ticket_replies.ticket_id
  AND c.user_id = auth.uid()
));

CREATE POLICY "Users can create replies on their tickets"
ON public.ticket_replies FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.support_tickets t
    JOIN public.clients c ON c.id = t.client_id
    WHERE t.id = ticket_id
    AND c.user_id = auth.uid()
  )
);

-- Create updated_at trigger for clients
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique constraint on client email
CREATE UNIQUE INDEX clients_email_idx ON public.clients(email);

-- Create index for faster lookups
CREATE INDEX clients_user_id_idx ON public.clients(user_id);
CREATE INDEX clients_status_idx ON public.clients(status);
CREATE INDEX performance_snapshots_client_id_idx ON public.performance_snapshots(client_id);
CREATE INDEX support_tickets_client_id_idx ON public.support_tickets(client_id);
CREATE INDEX ticket_replies_ticket_id_idx ON public.ticket_replies(ticket_id);