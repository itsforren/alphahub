-- Create table for admin direct message conversations
CREATE TABLE public.admin_dm_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_preview TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(participant1_id, participant2_id),
  CONSTRAINT different_participants CHECK (participant1_id < participant2_id)
);

-- Create table for admin DM messages
CREATE TABLE public.admin_dm_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.admin_dm_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for admin channels
CREATE TABLE public.admin_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for channel members
CREATE TABLE public.admin_channel_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.admin_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Create table for channel messages
CREATE TABLE public.admin_channel_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.admin_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.admin_dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_channel_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_dm_conversations
CREATE POLICY "Admins can view their own DM conversations"
ON public.admin_dm_conversations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') AND 
  (participant1_id = auth.uid() OR participant2_id = auth.uid())
);

CREATE POLICY "Admins can create DM conversations"
ON public.admin_dm_conversations
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') AND
  (participant1_id = auth.uid() OR participant2_id = auth.uid())
);

CREATE POLICY "Admins can update their own DM conversations"
ON public.admin_dm_conversations
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') AND 
  (participant1_id = auth.uid() OR participant2_id = auth.uid())
);

-- RLS policies for admin_dm_messages
CREATE POLICY "Admins can view messages in their conversations"
ON public.admin_dm_messages
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM public.admin_dm_conversations c
    WHERE c.id = admin_dm_messages.conversation_id
    AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);

CREATE POLICY "Admins can send messages in their conversations"
ON public.admin_dm_messages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') AND
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.admin_dm_conversations c
    WHERE c.id = admin_dm_messages.conversation_id
    AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);

CREATE POLICY "Admins can update read status on messages"
ON public.admin_dm_messages
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM public.admin_dm_conversations c
    WHERE c.id = admin_dm_messages.conversation_id
    AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);

-- RLS policies for admin_channels
CREATE POLICY "Admins can view channels they are members of"
ON public.admin_channels
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM public.admin_channel_members m
    WHERE m.channel_id = admin_channels.id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can create channels"
ON public.admin_channels
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') AND
  created_by = auth.uid()
);

CREATE POLICY "Channel creators can update channels"
ON public.admin_channels
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') AND
  created_by = auth.uid()
);

CREATE POLICY "Channel creators can delete channels"
ON public.admin_channels
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') AND
  created_by = auth.uid()
);

-- RLS policies for admin_channel_members
CREATE POLICY "Admins can view channel members"
ON public.admin_channel_members
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM public.admin_channel_members m
    WHERE m.channel_id = admin_channel_members.channel_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Channel creators can manage members"
ON public.admin_channel_members
FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM public.admin_channels c
    WHERE c.id = admin_channel_members.channel_id AND c.created_by = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM public.admin_channels c
    WHERE c.id = admin_channel_members.channel_id AND c.created_by = auth.uid()
  )
);

-- RLS policies for admin_channel_messages
CREATE POLICY "Channel members can view messages"
ON public.admin_channel_messages
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM public.admin_channel_members m
    WHERE m.channel_id = admin_channel_messages.channel_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Channel members can send messages"
ON public.admin_channel_messages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') AND
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.admin_channel_members m
    WHERE m.channel_id = admin_channel_messages.channel_id AND m.user_id = auth.uid()
  )
);

-- Trigger to update conversation on new DM message
CREATE OR REPLACE FUNCTION public.update_admin_dm_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_dm_conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.message, 100),
    updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_admin_dm_conversation_on_message
AFTER INSERT ON public.admin_dm_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_admin_dm_on_message();

-- Enable realtime for admin chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_channel_messages;

-- Create indexes for performance
CREATE INDEX idx_admin_dm_messages_conversation ON public.admin_dm_messages(conversation_id);
CREATE INDEX idx_admin_dm_messages_created_at ON public.admin_dm_messages(created_at DESC);
CREATE INDEX idx_admin_channel_messages_channel ON public.admin_channel_messages(channel_id);
CREATE INDEX idx_admin_channel_messages_created_at ON public.admin_channel_messages(created_at DESC);
CREATE INDEX idx_admin_channel_members_user ON public.admin_channel_members(user_id);
CREATE INDEX idx_admin_channel_members_channel ON public.admin_channel_members(channel_id);