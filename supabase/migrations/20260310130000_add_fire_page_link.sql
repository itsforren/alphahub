-- Add fire_page_link column to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS fire_page_link text;
