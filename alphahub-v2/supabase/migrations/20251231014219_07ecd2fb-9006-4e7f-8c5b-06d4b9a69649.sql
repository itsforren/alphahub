-- Add password_set_at column to track if user has set their own password
ALTER TABLE public.clients 
ADD COLUMN password_set_at timestamp with time zone DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.clients.password_set_at IS 'Timestamp when user set their own password. NULL means they still have a temp password from onboarding.';