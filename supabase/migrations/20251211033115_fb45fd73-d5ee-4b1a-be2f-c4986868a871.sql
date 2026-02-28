-- Add policies for managing testimonials and screenshots (public access for admin)
CREATE POLICY "Allow all insert on testimonials" 
ON public.testimonials 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all update on testimonials" 
ON public.testimonials 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow all delete on testimonials" 
ON public.testimonials 
FOR DELETE 
USING (true);

CREATE POLICY "Admin can view all testimonials" 
ON public.testimonials 
FOR SELECT 
USING (true);

-- Drop the old select policy
DROP POLICY IF EXISTS "Anyone can view active testimonials" ON public.testimonials;

CREATE POLICY "Allow all insert on screenshots" 
ON public.business_screenshots 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all update on screenshots" 
ON public.business_screenshots 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow all delete on screenshots" 
ON public.business_screenshots 
FOR DELETE 
USING (true);

CREATE POLICY "Admin can view all screenshots" 
ON public.business_screenshots 
FOR SELECT 
USING (true);

-- Drop the old select policy
DROP POLICY IF EXISTS "Anyone can view active screenshots" ON public.business_screenshots;