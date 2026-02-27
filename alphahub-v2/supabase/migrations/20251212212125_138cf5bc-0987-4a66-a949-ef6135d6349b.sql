-- Create a table for shared live stats that sync across all users
CREATE TABLE public.live_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stat_key TEXT NOT NULL UNIQUE,
  stat_value NUMERIC NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.live_stats ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the stats (public data)
CREATE POLICY "Anyone can view live stats" 
ON public.live_stats 
FOR SELECT 
USING (true);

-- Only edge functions or admin can update (using service role)
-- For now, allow updates from anyone to test
CREATE POLICY "Anyone can update stats" 
ON public.live_stats 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can insert stats" 
ON public.live_stats 
FOR INSERT 
WITH CHECK (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stats;

-- Insert initial stat values
INSERT INTO public.live_stats (stat_key, stat_value) VALUES 
  ('target_premium', 8500),
  ('applications', 3),
  ('calls_booked', 2),
  ('today_premium', 0)
ON CONFLICT (stat_key) DO NOTHING;

-- Create function to increment stats
CREATE OR REPLACE FUNCTION public.increment_stat(key TEXT, amount NUMERIC DEFAULT 1)
RETURNS NUMERIC AS $$
DECLARE
  new_value NUMERIC;
BEGIN
  UPDATE public.live_stats 
  SET stat_value = stat_value + amount, last_updated = now()
  WHERE stat_key = key
  RETURNING stat_value INTO new_value;
  
  RETURN new_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;