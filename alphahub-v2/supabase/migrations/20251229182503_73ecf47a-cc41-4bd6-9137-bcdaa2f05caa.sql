-- Fix the profiles table: remove the overly permissive policy that allows anyone to view all profiles
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;

-- Keep the existing policies:
-- "Users can view their own profile" (id = auth.uid())
-- "Admins can view all profiles" (has_role check)
-- "Users can update their own profile" (id = auth.uid())

-- The remaining policies are secure:
-- Admins can view all, users can only view/update their own