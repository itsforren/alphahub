-- Prevent duplicate chat messages: same sender + same message within 2 seconds
CREATE OR REPLACE FUNCTION prevent_duplicate_chat_message()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM chat_messages
    WHERE conversation_id = NEW.conversation_id
      AND sender_id = NEW.sender_id
      AND message = NEW.message
      AND created_at > NOW() - INTERVAL '2 seconds'
  ) THEN
    RAISE EXCEPTION 'Duplicate message detected' USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_chat_message ON chat_messages;
CREATE TRIGGER trg_prevent_duplicate_chat_message
  BEFORE INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_chat_message();

-- Same for admin DM messages
CREATE OR REPLACE FUNCTION prevent_duplicate_admin_dm_message()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM admin_dm_messages
    WHERE conversation_id = NEW.conversation_id
      AND sender_id = NEW.sender_id
      AND message = NEW.message
      AND created_at > NOW() - INTERVAL '2 seconds'
  ) THEN
    RAISE EXCEPTION 'Duplicate message detected' USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_admin_dm_message ON admin_dm_messages;
CREATE TRIGGER trg_prevent_duplicate_admin_dm_message
  BEFORE INSERT ON admin_dm_messages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_admin_dm_message();

-- Same for admin channel messages
CREATE OR REPLACE FUNCTION prevent_duplicate_admin_channel_message()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM admin_channel_messages
    WHERE channel_id = NEW.channel_id
      AND sender_id = NEW.sender_id
      AND message = NEW.message
      AND created_at > NOW() - INTERVAL '2 seconds'
  ) THEN
    RAISE EXCEPTION 'Duplicate message detected' USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_admin_channel_message ON admin_channel_messages;
CREATE TRIGGER trg_prevent_duplicate_admin_channel_message
  BEFORE INSERT ON admin_channel_messages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_admin_channel_message();
