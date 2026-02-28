-- Add soft delete columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;

-- Create index for efficient queries on deleted_at
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON public.clients(deleted_at);

-- Drop existing RLS policies to recreate them
DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Clients can view their own record" ON public.clients;

-- Recreate RLS policies to exclude soft-deleted clients for normal queries
CREATE POLICY "Admins can manage all clients" ON public.clients
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their own record" ON public.clients
FOR SELECT
USING (user_id = auth.uid() AND deleted_at IS NULL);