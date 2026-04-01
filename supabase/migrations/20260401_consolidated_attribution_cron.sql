-- pg_cron job: run consolidated spend attribution every 6 hours
-- Calls attribute-consolidated-spend/run via pg_net HTTP POST
-- Runs at midnight, 6am, noon, 6pm ET (UTC: 05:00, 11:00, 17:00, 23:00)
-- Using UTC hours that correspond to 6-hour blocks (exact ET offset varies by DST,
-- but the edge function always reads today's ET date dynamically).

SELECT cron.schedule(
  'attribute-consolidated-spend',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://qcunascacayiiuufjtaq.supabase.co/functions/v1/attribute-consolidated-spend/run',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdW5hc2NhY2F5aWl1dWZqdGFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE2NDIwMywiZXhwIjoyMDg3NzQwMjAzfQ.ZliYI6Jn3eQox0Lq4ghLglD-iMN1iavae1LnX9N_LQo'
               ),
    body    := '{}'::jsonb
  );
  $$
);
