-- 1. Chat Conversations (one per client)
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count_client INTEGER NOT NULL DEFAULT 0,
  unread_count_admin INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- 2. Chat Messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('client', 'admin')),
  sender_avatar_url TEXT,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Chat Settings
CREATE TABLE public.chat_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default business hours setting
INSERT INTO public.chat_settings (setting_key, setting_value) VALUES 
('business_hours', '{"start": 9, "end": 17, "timezone": "America/New_York", "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}'::jsonb);

-- Create indexes for performance
CREATE INDEX idx_chat_conversations_client_id ON public.chat_conversations(client_id);
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX idx_chat_conversations_last_message ON public.chat_conversations(last_message_at DESC NULLS LAST);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Admins can manage all conversations"
ON public.chat_conversations FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their own conversation"
ON public.chat_conversations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.clients c
  WHERE c.id = chat_conversations.client_id
  AND c.user_id = auth.uid()
));

CREATE POLICY "Clients can insert their own conversation"
ON public.chat_conversations FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.clients c
  WHERE c.id = chat_conversations.client_id
  AND c.user_id = auth.uid()
));

-- RLS Policies for chat_messages
CREATE POLICY "Admins can manage all messages"
ON public.chat_messages FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view messages in their conversation"
ON public.chat_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.chat_conversations cc
  JOIN public.clients c ON c.id = cc.client_id
  WHERE cc.id = chat_messages.conversation_id
  AND c.user_id = auth.uid()
));

CREATE POLICY "Clients can insert messages in their conversation"
ON public.chat_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.chat_conversations cc
    JOIN public.clients c ON c.id = cc.client_id
    WHERE cc.id = chat_messages.conversation_id
    AND c.user_id = auth.uid()
  )
);

-- RLS Policies for chat_settings
CREATE POLICY "Anyone can view chat settings"
ON public.chat_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage chat settings"
ON public.chat_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;

-- Function to get or create conversation for a client
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_client_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  SELECT id INTO v_conversation_id
  FROM public.chat_conversations
  WHERE client_id = p_client_id;
  
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.chat_conversations (client_id)
    VALUES (p_client_id)
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$;

-- Function to update conversation on new message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.message, 100),
    updated_at = now(),
    unread_count_client = CASE WHEN NEW.sender_role = 'admin' THEN unread_count_client + 1 ELSE unread_count_client END,
    unread_count_admin = CASE WHEN NEW.sender_role = 'client' THEN unread_count_admin + 1 ELSE unread_count_admin END
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_chat_message_insert
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_on_message();

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id UUID, p_user_role TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark individual messages as read
  UPDATE public.chat_messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_role != p_user_role
    AND read_at IS NULL;
  
  -- Reset unread count
  IF p_user_role = 'client' THEN
    UPDATE public.chat_conversations
    SET unread_count_client = 0
    WHERE id = p_conversation_id;
  ELSE
    UPDATE public.chat_conversations
    SET unread_count_admin = 0
    WHERE id = p_conversation_id;
  END IF;
END;
$$;