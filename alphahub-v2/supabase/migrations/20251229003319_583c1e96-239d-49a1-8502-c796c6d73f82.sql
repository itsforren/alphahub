-- Create table to cache all available GHL custom fields per location
CREATE TABLE public.ghl_available_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  field_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_key TEXT,
  field_type TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(location_id, field_id)
);

-- Create table for custom field mappings per client
CREATE TABLE public.ghl_custom_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  ghl_field_id TEXT,
  ghl_field_name TEXT,
  ghl_field_key TEXT,
  is_auto_matched BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, field_name)
);

-- Enable RLS
ALTER TABLE public.ghl_available_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghl_custom_field_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies for ghl_available_fields
CREATE POLICY "Admins can manage available fields"
  ON public.ghl_available_fields
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert available fields"
  ON public.ghl_available_fields
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update available fields"
  ON public.ghl_available_fields
  FOR UPDATE
  USING (true);

-- RLS policies for ghl_custom_field_mappings
CREATE POLICY "Admins can manage field mappings"
  ON public.ghl_custom_field_mappings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert mappings"
  ON public.ghl_custom_field_mappings
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update mappings"
  ON public.ghl_custom_field_mappings
  FOR UPDATE
  USING (true);

-- Add indexes for performance
CREATE INDEX idx_ghl_available_fields_location ON public.ghl_available_fields(location_id);
CREATE INDEX idx_ghl_custom_field_mappings_client ON public.ghl_custom_field_mappings(client_id);
CREATE INDEX idx_ghl_custom_field_mappings_location ON public.ghl_custom_field_mappings(location_id);