-- Create prospects table for B2B tracking (agents interested in AlphaAgent)
CREATE TABLE public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  team_size TEXT,
  monthly_production TEXT,
  biggest_challenge TEXT,
  timeline_to_scale TEXT,
  additional_info TEXT,
  source_page TEXT, -- e.g., '/partner', '/', '/book-call'
  status TEXT NOT NULL DEFAULT 'applied', -- applied, booked, converted, churned
  application_submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  calendar_booked_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prospect_attribution table for B2B attribution tracking
CREATE TABLE public.prospect_attribution (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  
  -- First touch attribution
  first_touch_source TEXT,
  first_touch_medium TEXT,
  first_touch_campaign TEXT,
  first_touch_content TEXT,
  first_touch_term TEXT,
  first_touch_gclid TEXT,
  first_touch_fbclid TEXT,
  first_touch_referrer TEXT,
  first_touch_landing_page TEXT,
  first_touch_at TIMESTAMP WITH TIME ZONE,
  
  -- Last touch attribution
  last_touch_source TEXT,
  last_touch_medium TEXT,
  last_touch_campaign TEXT,
  last_touch_content TEXT,
  last_touch_term TEXT,
  last_touch_gclid TEXT,
  last_touch_fbclid TEXT,
  last_touch_referrer TEXT,
  last_touch_landing_page TEXT,
  last_touch_at TIMESTAMP WITH TIME ZONE,
  
  -- Journey stats
  total_sessions INTEGER DEFAULT 1,
  total_page_views INTEGER DEFAULT 0,
  time_to_conversion_hours NUMERIC,
  referral_code TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_attribution ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prospects
CREATE POLICY "Admins can manage all prospects"
ON public.prospects
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Allow public insert for prospects"
ON public.prospects
FOR INSERT
WITH CHECK (true);

-- RLS Policies for prospect_attribution
CREATE POLICY "Admins can manage prospect attribution"
ON public.prospect_attribution
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Allow public insert for prospect attribution"
ON public.prospect_attribution
FOR INSERT
WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX idx_prospects_visitor_id ON public.prospects(visitor_id);
CREATE INDEX idx_prospects_email ON public.prospects(email);
CREATE INDEX idx_prospects_status ON public.prospects(status);
CREATE INDEX idx_prospects_created_at ON public.prospects(created_at);
CREATE INDEX idx_prospect_attribution_prospect_id ON public.prospect_attribution(prospect_id);
CREATE INDEX idx_prospect_attribution_visitor_id ON public.prospect_attribution(visitor_id);

-- Add trigger for updated_at
CREATE TRIGGER update_prospects_updated_at
BEFORE UPDATE ON public.prospects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prospect_attribution_updated_at
BEFORE UPDATE ON public.prospect_attribution
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();