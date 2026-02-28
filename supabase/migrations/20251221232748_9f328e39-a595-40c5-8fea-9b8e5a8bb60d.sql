-- Allow authenticated users (non-admins) to read onboarding settings (defaults)
CREATE POLICY "Authenticated users can read onboarding settings"
ON public.onboarding_settings
FOR SELECT
TO authenticated
USING (true);