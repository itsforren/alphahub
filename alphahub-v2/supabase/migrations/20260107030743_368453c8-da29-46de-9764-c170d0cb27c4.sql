-- Create the agreements storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('agreements', 'agreements', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the agreements bucket
CREATE POLICY "Clients can view their own agreements"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'agreements' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can upload agreements"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'agreements' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Admins can manage all agreements"
ON storage.objects FOR ALL
USING (
  bucket_id = 'agreements' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);