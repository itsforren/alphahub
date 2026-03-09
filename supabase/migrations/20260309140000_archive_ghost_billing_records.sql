-- Archive overdue/pending billing records for non-active clients
-- These are ghost invoices from cancelled, inactive, paused, or pending reactivation clients
UPDATE billing_records
SET archived_at = NOW(),
    notes = COALESCE(notes, '') || ' [Auto-archived: client not active]'
WHERE archived_at IS NULL
  AND status IN ('pending', 'overdue')
  AND client_id IN (
    SELECT id::text FROM clients WHERE status != 'active'
  );

-- Archive orphan records — client_id doesn't exist in the clients table at all
UPDATE billing_records
SET archived_at = NOW(),
    notes = COALESCE(notes, '') || ' [Auto-archived: orphan record — no matching client]'
WHERE archived_at IS NULL
  AND status IN ('pending', 'overdue')
  AND client_id NOT IN (SELECT id::text FROM clients);
