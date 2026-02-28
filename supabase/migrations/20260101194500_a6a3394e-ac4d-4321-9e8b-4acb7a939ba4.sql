-- Attribution Tracking System Tables

-- Visitor Sessions: Stores each unique visitor session with attribution data
CREATE TABLE public.visitor_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- UTM Parameters
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  
  -- Ad Platform Click IDs
  gclid TEXT,
  fbclid TEXT,
  
  -- Session Context
  referrer_url TEXT,
  referral_code TEXT,
  landing_page TEXT,
  device_type TEXT,
  user_agent TEXT,
  ip_country TEXT,
  ip_region TEXT,
  
  -- Conversion tracking
  converted_at TIMESTAMP WITH TIME ZONE,
  lead_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Visitor Events: Granular event tracking for each visitor action
CREATE TABLE public.visitor_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'page_view', 'form_start', 'form_submit', 'button_click', 'email_click', 'scroll', etc.
  event_data JSONB DEFAULT '{}'::jsonb,
  page_url TEXT,
  element_id TEXT,
  element_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lead Attribution: Links leads to their full attribution journey
CREATE TABLE public.lead_attribution (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  visitor_id TEXT NOT NULL,
  
  -- First Touch Attribution
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
  
  -- Last Touch Attribution
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
  
  -- Attribution Summary
  touch_count INTEGER DEFAULT 1,
  total_page_views INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 1,
  time_to_conversion_hours NUMERIC,
  referral_code TEXT,
  conversion_path JSONB DEFAULT '[]'::jsonb, -- Array of all touchpoints
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email Click Tracking: For trackable email links
CREATE TABLE public.email_tracking_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_id TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  campaign_name TEXT,
  email_template TEXT,
  destination_url TEXT NOT NULL,
  recipient_email TEXT,
  client_id UUID,
  
  -- Stats
  click_count INTEGER DEFAULT 0,
  first_clicked_at TIMESTAMP WITH TIME ZONE,
  last_clicked_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_visitor_sessions_visitor_id ON public.visitor_sessions(visitor_id);
CREATE INDEX idx_visitor_sessions_session_id ON public.visitor_sessions(session_id);
CREATE INDEX idx_visitor_sessions_created_at ON public.visitor_sessions(created_at DESC);
CREATE INDEX idx_visitor_sessions_utm_source ON public.visitor_sessions(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX idx_visitor_sessions_referral_code ON public.visitor_sessions(referral_code) WHERE referral_code IS NOT NULL;

CREATE INDEX idx_visitor_events_visitor_id ON public.visitor_events(visitor_id);
CREATE INDEX idx_visitor_events_session_id ON public.visitor_events(session_id);
CREATE INDEX idx_visitor_events_event_type ON public.visitor_events(event_type);
CREATE INDEX idx_visitor_events_created_at ON public.visitor_events(created_at DESC);

CREATE INDEX idx_lead_attribution_lead_id ON public.lead_attribution(lead_id);
CREATE INDEX idx_lead_attribution_visitor_id ON public.lead_attribution(visitor_id);
CREATE INDEX idx_lead_attribution_first_touch_source ON public.lead_attribution(first_touch_source) WHERE first_touch_source IS NOT NULL;
CREATE INDEX idx_lead_attribution_referral_code ON public.lead_attribution(referral_code) WHERE referral_code IS NOT NULL;

CREATE INDEX idx_email_tracking_links_tracking_id ON public.email_tracking_links(tracking_id);

-- Enable RLS
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tracking_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow public insert for tracking (rate-limited by edge function)
-- Visitor Sessions
CREATE POLICY "Allow public insert for tracking" ON public.visitor_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all sessions" ON public.visitor_sessions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Allow public update for last_seen" ON public.visitor_sessions
  FOR UPDATE USING (true);

-- Visitor Events
CREATE POLICY "Allow public insert for events" ON public.visitor_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all events" ON public.visitor_events
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Lead Attribution
CREATE POLICY "Allow public insert for attribution" ON public.lead_attribution
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage attribution" ON public.lead_attribution
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Email Tracking Links
CREATE POLICY "Admins can manage email tracking" ON public.email_tracking_links
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Allow public update for click tracking" ON public.email_tracking_links
  FOR UPDATE USING (true);

-- Trigger for updated_at on lead_attribution
CREATE TRIGGER update_lead_attribution_updated_at
  BEFORE UPDATE ON public.lead_attribution
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();