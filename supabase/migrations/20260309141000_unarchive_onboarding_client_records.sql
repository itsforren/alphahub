-- Undo archival of billing records for onboarding clients
-- The previous migration archived ALL non-active client records,
-- but onboarding clients still need their billing records visible.
UPDATE billing_records
SET archived_at = NULL,
    notes = REPLACE(COALESCE(notes, ''), ' [Auto-archived: client not active]', '')
WHERE archived_at IS NOT NULL
  AND notes LIKE '%Auto-archived: client not active%'
  AND client_id IN (
    SELECT id::text FROM clients WHERE status = 'onboarding'
  );
