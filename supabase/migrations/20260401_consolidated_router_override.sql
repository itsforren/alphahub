-- Per-agent consolidated router override.
-- Allows admins to manually exclude an agent from receiving consolidated
-- leads (e.g. payment failed) without changing their overall active status.
-- null/true = eligible (subject to normal pool rules)
-- false     = manually excluded; consolidated_router_note holds the reason.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS consolidated_router_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS consolidated_router_note    text;
