-- Create partners table for strategic partner tracking
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  ghl_location_id TEXT,
  calendar_link TEXT,
  color TEXT NOT NULL DEFAULT '#8b5cf6',
  commission_percent NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Admins can manage partners
CREATE POLICY "Admins can manage partners" ON public.partners
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Authenticated users can view active partners
CREATE POLICY "Authenticated users can view active partners" ON public.partners
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- Add partner_id to prospects table
ALTER TABLE public.prospects 
  ADD COLUMN partner_id UUID REFERENCES public.partners(id);

-- Add index for filtering by partner
CREATE INDEX idx_prospects_partner ON public.prospects(partner_id);

-- Insert first strategic partner
INSERT INTO public.partners (name, slug, color) VALUES
  ('Tier Brown', 'tier_brown', '#f59e0b');