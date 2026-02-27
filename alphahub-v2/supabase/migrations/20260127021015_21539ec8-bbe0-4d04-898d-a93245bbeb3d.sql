-- Update get_user_role function to include referrer in priority order
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
      WHEN 'referrer' THEN 4
      WHEN 'guest' THEN 5 
    END
  LIMIT 1
$function$;