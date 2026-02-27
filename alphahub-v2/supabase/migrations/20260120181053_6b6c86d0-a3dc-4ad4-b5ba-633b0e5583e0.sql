-- Create table for prospect custom field mappings
CREATE TABLE public.prospect_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'wDoj91sbkfxZnMbow2G5',
  internal_field_name TEXT NOT NULL,
  ghl_field_id TEXT,
  ghl_field_key TEXT,
  ghl_field_name TEXT,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(location_id, internal_field_name)
);

-- Create table for caching available GHL fields for prospects
CREATE TABLE public.prospect_available_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'wDoj91sbkfxZnMbow2G5',
  field_id TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(location_id, field_id)
);

-- Enable RLS
ALTER TABLE public.prospect_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_available_fields ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage prospect field mappings"
ON public.prospect_field_mappings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage prospect available fields"
ON public.prospect_available_fields
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role can read mappings (for edge functions)
CREATE POLICY "Service role can read prospect field mappings"
ON public.prospect_field_mappings
FOR SELECT
USING (true);

CREATE POLICY "Service role can read prospect available fields"
ON public.prospect_available_fields
FOR SELECT
USING (true);

-- Updated at trigger
CREATE TRIGGER update_prospect_field_mappings_updated_at
  BEFORE UPDATE ON public.prospect_field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prospect_available_fields_updated_at
  BEFORE UPDATE ON public.prospect_available_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();