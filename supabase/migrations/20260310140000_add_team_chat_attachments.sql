-- Add attachment columns to admin DM messages
ALTER TABLE admin_dm_messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_name text;

-- Add attachment columns to admin channel messages
ALTER TABLE admin_channel_messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_name text;
