-- Create sheet_config table for storing Google Sheets connection and mappings
CREATE TABLE public.sheet_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_url text NOT NULL,
  sheet_tab text NOT NULL DEFAULT 'Agent_Config',
  column_mappings jsonb NOT NULL DEFAULT '{}'::jsonb,
  refresh_interval_seconds integer NOT NULL DEFAULT 300,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sheet_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage sheet config
CREATE POLICY "Admins can manage sheet config"
ON public.sheet_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone authenticated can read sheet config (needed for edge function context)
CREATE POLICY "Authenticated users can view sheet config"
ON public.sheet_config
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_sheet_config_updated_at
BEFORE UPDATE ON public.sheet_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();