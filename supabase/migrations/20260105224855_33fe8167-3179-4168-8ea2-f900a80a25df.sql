-- Set default values for success_manager columns to Sierra Reigh
ALTER TABLE clients 
ALTER COLUMN success_manager_name SET DEFAULT 'Sierra Reigh',
ALTER COLUMN success_manager_email SET DEFAULT 'sierra@alphaagent.io',
ALTER COLUMN success_manager_image_url SET DEFAULT 'https://qydkrpirrfelgtcqasdx.supabase.co/storage/v1/object/public/media/profile-photos/1766368659922-oq4x14.jpg';

-- Update existing clients who have NULL success manager info
UPDATE clients 
SET 
  success_manager_name = 'Sierra Reigh',
  success_manager_email = 'sierra@alphaagent.io',
  success_manager_image_url = 'https://qydkrpirrfelgtcqasdx.supabase.co/storage/v1/object/public/media/profile-photos/1766368659922-oq4x14.jpg'
WHERE success_manager_name IS NULL 
   OR success_manager_email IS NULL 
   OR success_manager_image_url IS NULL;