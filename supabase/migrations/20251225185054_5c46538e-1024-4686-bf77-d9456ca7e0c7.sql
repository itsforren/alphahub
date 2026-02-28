-- Add ghl_user_id column to clients table for auto-assigning leads in GHL
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS ghl_user_id text;