-- Update get_user_role function to include 'client' role in priority
-- Priority: admin > member > client > guest
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'member' THEN 2 
      WHEN 'client' THEN 3
      WHEN 'guest' THEN 4 
    END
  LIMIT 1
$function$;

-- Clean up duplicate roles: remove 'guest' role for users who already have 'client' role
DELETE FROM public.user_roles ur1
WHERE ur1.role = 'guest'
AND EXISTS (
  SELECT 1 FROM public.user_roles ur2 
  WHERE ur2.user_id = ur1.user_id 
  AND ur2.role = 'client'
);