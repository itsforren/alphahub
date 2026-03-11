-- Add secondary referrer column to clients table (5% commission tier)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS referred_by_client_id_secondary UUID REFERENCES clients(id);

CREATE INDEX IF NOT EXISTS idx_clients_referred_by_secondary
  ON clients(referred_by_client_id_secondary);
