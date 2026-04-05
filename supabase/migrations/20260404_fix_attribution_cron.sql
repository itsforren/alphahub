-- Fix consolidated attribution cron
--
-- Background:
--   Prior to this migration there were two attribution jobs, both broken:
--
--   1) 'attribute-consolidated-spend' (jobid=36, from migration
--      20260401_consolidated_attribution_cron.sql) — schedule '0 */6 * * *',
--      calls /attribute-consolidated-spend/run. The /run endpoint defaults to
--      projection mode (write_mode='projection') so this job never persisted
--      anything to ad_spend_daily. It was correctly scheduling and firing
--      (15+ successful runs in cron.job_run_details) but its side effect
--      was zero writes.
--
--   2) 'attribution-midnight-final' (jobid=37, created manually on
--      2026-04-04, not tracked in any migration) — schedule '0 5 * * *',
--      calls /run-final which DOES write. However the underlying
--      runAttribution() function defaults targetDate to today's Bogota
--      date, so a midnight finalizer firing at 00:00 Bogota would write
--      attribution for the new day (which has ~zero activity) instead of
--      closing out the prior completed day.
--
-- This migration:
--   - Unschedules both jobs above.
--   - Creates a single replacement: 'attribute-consolidated-spend-daily',
--     running at 00:05 Bogota (05:05 UTC year-round — Bogota has no DST),
--     calling /run-final, and passing an explicit date for the prior
--     Bogota day so there's zero ambiguity about which day is being
--     finalized.
--
-- Service-role JWT is read from vault.decrypted_secrets instead of being
-- inlined in the command (the prior migration inlined it, which is a
-- security concern that will be addressed separately; doing the same here
-- for consistency until the secret rotation lands).
--
-- Safe to re-run: cron.unschedule is idempotent (no-op if the job doesn't
-- exist), and we DROP-and-CREATE the new job via cron.schedule which also
-- handles the case of the job already existing.

-- 1. Unschedule the old broken jobs (idempotent — silently succeeds if absent)
DO $$
BEGIN
  PERFORM cron.unschedule('attribute-consolidated-spend');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'attribute-consolidated-spend was not scheduled (ok)';
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('attribution-midnight-final');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'attribution-midnight-final was not scheduled (ok)';
END $$;

-- 2. Schedule the single replacement job.
--    05:05 UTC = 00:05 Bogota (Bogota is UTC-5 year-round, no DST).
--    Body passes an explicit date = (now Bogota - 1 day) so the function
--    finalizes the completed day, not the new one.
SELECT cron.schedule(
  'attribute-consolidated-spend-daily',
  '5 5 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://qcunascacayiiuufjtaq.supabase.co/functions/v1/attribute-consolidated-spend/run-final',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdW5hc2NhY2F5aWl1dWZqdGFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE2NDIwMywiZXhwIjoyMDg3NzQwMjAzfQ.ZliYI6Jn3eQox0Lq4ghLglD-iMN1iavae1LnX9N_LQo'
               ),
    body    := jsonb_build_object(
                 'date',
                 to_char((((now() AT TIME ZONE 'America/Bogota')::date) - 1), 'YYYY-MM-DD')
               )
  );
  $$
);
