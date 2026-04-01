-- EC Enhancement Queue
-- Decouples enhanced conversion calls from the lead submission flow.
-- pg_cron processes this queue every 5 minutes so the first EC attempt
-- fires 5+ minutes after the lead — giving Google Ads time to process
-- the click-to-conversion before we try to enhance it.

CREATE TABLE IF NOT EXISTS ec_enhancement_queue (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             text        NOT NULL,
  email                text        NOT NULL,
  phone                text,
  first_name           text,
  last_name            text,
  gclid                text,
  conversion_date_time timestamptz NOT NULL,
  process_after        timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  status               text        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempts             int         NOT NULL DEFAULT 0,
  max_attempts         int         NOT NULL DEFAULT 5,
  last_error           text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ec_enhancement_queue_pending_idx
  ON ec_enhancement_queue (process_after)
  WHERE status = 'pending';

-- Processor function: called by pg_cron every 5 minutes.
-- Picks up pending items due for processing and fires HTTP calls via pg_net.
CREATE OR REPLACE FUNCTION process_ec_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item      RECORD;
  v_svc_key   text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdW5hc2NhY2F5aWl1dWZqdGFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE2NDIwMywiZXhwIjoyMDg3NzQwMjAzfQ.ZliYI6Jn3eQox0Lq4ghLglD-iMN1iavae1LnX9N_LQo';
  v_url       text := 'https://qcunascacayiiuufjtaq.supabase.co/functions/v1/enhance-iul-conversion';
BEGIN

  FOR v_item IN
    SELECT id, order_id, email, phone, first_name, last_name,
           gclid, conversion_date_time, attempts
    FROM   ec_enhancement_queue
    WHERE  status = 'pending'
      AND  process_after <= now()
      AND  attempts < max_attempts
    ORDER  BY process_after
    LIMIT  20
  LOOP
    -- Mark processing before the async HTTP call (prevents duplicate fire)
    UPDATE ec_enhancement_queue
    SET    status = 'processing',
           attempts = attempts + 1
    WHERE  id = v_item.id;

    -- Fire and forget — edge function writes result back to this table
    PERFORM net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', 'Bearer ' || v_svc_key
                 ),
      body    := jsonb_build_object(
                   'queue_id',             v_item.id,
                   'order_id',             v_item.order_id,
                   'email',                v_item.email,
                   'phone',                v_item.phone,
                   'firstName',            v_item.first_name,
                   'lastName',             v_item.last_name,
                   'gclid',                v_item.gclid,
                   'conversion_date_time', v_item.conversion_date_time,
                   'attempt',              v_item.attempts + 1
                 )
    );
  END LOOP;
END;
$$;

-- Schedule: every 5 minutes
SELECT cron.schedule(
  'process-ec-enhancement-queue',
  '*/5 * * * *',
  'SELECT process_ec_queue()'
);
