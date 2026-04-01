-- Add per-direction notification cooldown timestamps to chat_conversations.
-- chat-notification function checks these before sending email/SMS to prevent
-- spamming admins/clients on every individual message in a conversation.
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS last_admin_notification_at  timestamptz,
  ADD COLUMN IF NOT EXISTS last_client_notification_at timestamptz;
