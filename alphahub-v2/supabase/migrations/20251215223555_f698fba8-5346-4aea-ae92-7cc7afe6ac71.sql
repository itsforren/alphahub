-- Add success manager columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS success_manager_name text,
ADD COLUMN IF NOT EXISTS success_manager_email text,
ADD COLUMN IF NOT EXISTS success_manager_phone text,
ADD COLUMN IF NOT EXISTS success_manager_image_url text;