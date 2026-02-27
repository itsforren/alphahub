-- NPS Responses table for tracking client feedback
CREATE TABLE public.nps_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback TEXT,
  google_review_offered BOOLEAN DEFAULT false,
  google_review_completed BOOLEAN DEFAULT false,
  google_review_credit_applied BOOLEAN DEFAULT false,
  video_review_offered BOOLEAN DEFAULT false,
  video_review_completed BOOLEAN DEFAULT false,
  video_review_credit_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

-- Policies for nps_responses
CREATE POLICY "Admins can view all NPS responses"
ON public.nps_responses FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage NPS responses"
ON public.nps_responses FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can create their own NPS responses"
ON public.nps_responses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Clients can view their own NPS responses"
ON public.nps_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.user_id = auth.uid()
  )
);

-- Index for faster lookups
CREATE INDEX idx_nps_responses_client_id ON public.nps_responses(client_id);
CREATE INDEX idx_nps_responses_created_at ON public.nps_responses(created_at DESC);

-- Disputes table for tracking chargebacks
CREATE TABLE public.disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  stripe_dispute_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'usd',
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, won, lost, needs_response
  evidence_due_by TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Only admins can access disputes
CREATE POLICY "Admins can manage disputes"
ON public.disputes FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for disputes
CREATE INDEX idx_disputes_client_id ON public.disputes(client_id);
CREATE INDEX idx_disputes_status ON public.disputes(status);
CREATE INDEX idx_disputes_created_at ON public.disputes(created_at DESC);

-- Add last_nps_prompt_at to clients to track when we last asked for NPS
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_nps_prompt_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS nps_prompt_count INTEGER DEFAULT 0;

-- Trigger to update updated_at on nps_responses
CREATE TRIGGER update_nps_responses_updated_at
BEFORE UPDATE ON public.nps_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on disputes
CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();