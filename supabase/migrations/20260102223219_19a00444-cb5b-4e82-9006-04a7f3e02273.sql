-- Fix stage_key values to align with stage_name
UPDATE sales_pipeline_stages SET stage_key = 'new_lead' WHERE stage_name = 'New Lead';
UPDATE sales_pipeline_stages SET stage_key = 'contacted' WHERE stage_name = 'Contacted';
UPDATE sales_pipeline_stages SET stage_key = 'call_scheduled' WHERE stage_name = 'Call Scheduled';
UPDATE sales_pipeline_stages SET stage_key = 'call_completed' WHERE stage_name = 'Call Completed';
UPDATE sales_pipeline_stages SET stage_key = 'follow_up' WHERE stage_name = 'Follow Up';
UPDATE sales_pipeline_stages SET stage_key = 'closed_won' WHERE stage_name = 'Closed Won';
UPDATE sales_pipeline_stages SET stage_key = 'closed_lost' WHERE stage_name = 'Closed Lost';
UPDATE sales_pipeline_stages SET stage_key = 'onboarding' WHERE stage_name = 'Onboarding';
UPDATE sales_pipeline_stages SET stage_key = 'live' WHERE stage_name = 'Live';

-- Move existing prospects with confirmed/scheduled appointments to Call Scheduled stage
UPDATE prospects 
SET pipeline_stage_id = (SELECT id FROM sales_pipeline_stages WHERE stage_key = 'call_scheduled' LIMIT 1)
WHERE appointment_status IN ('confirmed', 'scheduled', 'booked', 'rescheduled')
AND pipeline_stage_id = (SELECT id FROM sales_pipeline_stages WHERE stage_name = 'New Lead' LIMIT 1);