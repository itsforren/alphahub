-- =====================================================
-- LEAD PIPELINE METRICS + BACKFILL LEAD_DATE
-- =====================================================

-- 1. Create lead_pipeline_metrics table for tracking
CREATE TABLE IF NOT EXISTS public.lead_pipeline_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  agent_id text,
  stage text NOT NULL CHECK (stage IN ('webhook_received', 'stored', 'delivered', 'failed')),
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(metric_date, agent_id, stage)
);

-- Enable RLS
ALTER TABLE public.lead_pipeline_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policy: Only admins can manage pipeline metrics
CREATE POLICY "Admins can manage pipeline metrics" ON public.lead_pipeline_metrics
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for fast queries
CREATE INDEX idx_pipeline_metrics_date ON public.lead_pipeline_metrics(metric_date);
CREATE INDEX idx_pipeline_metrics_agent ON public.lead_pipeline_metrics(agent_id);
CREATE INDEX idx_pipeline_metrics_stage ON public.lead_pipeline_metrics(stage);

-- 2. Create upsert function for incrementing metrics
CREATE OR REPLACE FUNCTION public.increment_pipeline_metric(
  p_agent_id text,
  p_stage text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.lead_pipeline_metrics (metric_date, agent_id, stage, count)
  VALUES (CURRENT_DATE, p_agent_id, p_stage, 1)
  ON CONFLICT (metric_date, agent_id, stage)
  DO UPDATE SET 
    count = lead_pipeline_metrics.count + 1,
    updated_at = now();
END;
$$;

-- 3. Backfill lead_date where null (since Dec 15, 2025)
UPDATE public.leads 
SET lead_date = created_at 
WHERE lead_date IS NULL 
AND created_at >= '2025-12-15'::timestamptz;

-- 4. Add index on lead_date for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_lead_date ON public.leads(lead_date);