-- Add admin_notes column to clients table for internal notes on client interactions
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS admin_notes text;
