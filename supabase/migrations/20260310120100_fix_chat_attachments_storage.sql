-- Fix chat-attachments storage bucket: ensure it exists, is public,
-- and has all necessary RLS policies for upload to work reliably.

-- Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop and recreate policies to ensure clean state
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete chat attachments" ON storage.objects;

-- SELECT: anyone can view (public bucket)
CREATE POLICY "Anyone can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

-- INSERT: authenticated users can upload
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- UPDATE: needed for multipart uploads and upserts
CREATE POLICY "Authenticated users can update chat attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-attachments')
WITH CHECK (bucket_id = 'chat-attachments');

-- DELETE: allow users to manage their uploads
CREATE POLICY "Authenticated users can delete chat attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-attachments');
