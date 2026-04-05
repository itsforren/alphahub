-- Client pause → pool + billing flag sync
--
-- When a client's status is changed to a "not receiving leads" state
-- (paused, cancelled, inactive, pending reactivation), automatically flip:
--
--   clients.consolidated_router_enabled  → false
--   clients.consolidated_router_note     → "Client status: <status>" (only if currently null)
--   client_wallets.auto_billing_enabled  → false
--
-- This is belt-and-suspenders. The router and auto-recharge functions already
-- filter on status='active', so a paused client is already excluded at the
-- query level. The trigger makes the exclusion explicit in the flag tables
-- so the state is auditable and survives any future refactor that drops the
-- status filter.
--
-- Only fires on TRANSITIONS (OLD.status IS DISTINCT FROM NEW.status) so
-- updates that don't touch status don't touch the flags.
--
-- Re-enabling (status → 'active') is intentionally NOT handled — that's a
-- deliberate manual action. Prevents accidental re-enable from a brief
-- status round-trip.

CREATE OR REPLACE FUNCTION public.sync_client_pause_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pause_statuses text[] := ARRAY['paused', 'cancelled', 'inactive', 'pending reactivation'];
BEGIN
  -- Only act on actual status transitions
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Transition INTO a pause state → sync flags off
  IF NEW.status = ANY(pause_statuses) THEN
    -- Flip router flag and set note (preserve any existing manual note)
    NEW.consolidated_router_enabled := false;
    IF NEW.consolidated_router_note IS NULL OR NEW.consolidated_router_note = '' THEN
      NEW.consolidated_router_note := format('Client status: %s', NEW.status);
    END IF;

    -- Flip auto-billing off in the wallet row (if one exists)
    UPDATE public.client_wallets
       SET auto_billing_enabled = false
     WHERE client_id = NEW.id
       AND auto_billing_enabled IS DISTINCT FROM false;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_client_pause_flags() IS
  'BEFORE UPDATE trigger on clients: when status transitions into paused/cancelled/inactive/pending reactivation, flip consolidated_router_enabled and auto_billing_enabled off. Re-enabling on status→active is intentionally NOT handled and must be manual.';


DROP TRIGGER IF EXISTS sync_client_pause_flags_trigger ON public.clients;
CREATE TRIGGER sync_client_pause_flags_trigger
  BEFORE UPDATE OF status ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_client_pause_flags();


-- One-time sync for existing paused/cancelled/inactive/pending reactivation clients
-- whose flags are currently inconsistent (router still enabled or auto_billing still on).
-- Safe to re-run: only touches rows that are actually out of sync.
UPDATE public.clients
   SET consolidated_router_enabled = false,
       consolidated_router_note    = COALESCE(
         NULLIF(consolidated_router_note, ''),
         format('Client status: %s', status)
       )
 WHERE status IN ('paused', 'cancelled', 'inactive', 'pending reactivation')
   AND (consolidated_router_enabled IS DISTINCT FROM false OR consolidated_router_note IS NULL);

UPDATE public.client_wallets cw
   SET auto_billing_enabled = false
  FROM public.clients c
 WHERE cw.client_id = c.id
   AND c.status IN ('paused', 'cancelled', 'inactive', 'pending reactivation')
   AND cw.auto_billing_enabled IS DISTINCT FROM false;
