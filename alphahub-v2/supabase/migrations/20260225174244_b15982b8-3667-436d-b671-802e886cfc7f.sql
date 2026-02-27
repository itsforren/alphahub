UPDATE onboarding_automation_runs 
SET 
  status = 'running',
  current_step = 11,
  steps_completed = '[1,2,3,4,5,6,7,8,9,10]'::jsonb,
  steps_failed = '[]'::jsonb,
  step_data = step_data || '{"step_10": {"skipped": true, "reason": "Manually skipped - SaaS V2 422 error, will activate separately"}}'::jsonb,
  error_log = '[]'::jsonb
WHERE id = 'a94b63a5-989a-44e8-a8ca-a5eccd95de7d';