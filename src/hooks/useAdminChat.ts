import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface AdminProfile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface AdminDMConversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  other_participant?: AdminProfile;
}

export interface AdminDMMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  sender?: AdminProfile;
}

export interface AdminChannel {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
}

export interface AdminChannelMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  sender?: AdminProfile;
}

// Fetch all admin users
export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (error) throw error;

      const userIds = data.map(r => r.user_id);
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .in('id', userIds);

      if (profileError) throw profileError;

      return profiles as AdminProfile[];
    },
  });
}

// Fetch DM conversations for current user
export function useAdminDMConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-dm-conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('admin_dm_conversations')
        .select('*')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Get other participant profiles
      const otherIds = data.map(c => 
        c.participant1_id === user.id ? c.participant2_id : c.participant1_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .in('id', otherIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(c => ({
        ...c,
        other_participant: profileMap.get(
          c.participant1_id === user.id ? c.participant2_id : c.participant1_id
        ),
      })) as AdminDMConversation[];
    },
    enabled: !!user?.id,
  });
}

// Fetch or create DM conversation
export function useGetOrCreateDMConversation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Ensure consistent ordering for the unique constraint
      const [p1, p2] = [user.id, otherUserId].sort();

      // Try to find existing conversation
      const { data: existing } = await supabase
        .from('admin_dm_conversations')
        .select('id')
        .eq('participant1_id', p1)
        .eq('participant2_id', p2)
        .maybeSingle();

      if (existing) return existing.id;

      // Create new conversation
      const { data, error } = await supabase
        .from('admin_dm_conversations')
        .insert({ participant1_id: p1, participant2_id: p2 })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dm-conversations'] });
    },
  });
}

// Fetch DM messages
export function useAdminDMMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['admin-dm-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('admin_dm_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set(data.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .in('id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(m => ({
        ...m,
        sender: profileMap.get(m.sender_id),
      })) as AdminDMMessage[];
    },
    enabled: !!conversationId,
  });
}

// Send DM message
export function useSendAdminDM() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, message, attachment }: { conversationId: string; message: string; attachment?: { url: string; type: string; name: string } }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('admin_dm_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          message,
          ...(attachment && {
            attachment_url: attachment.url,
            attachment_type: attachment.type,
            attachment_name: attachment.name,
          }),
        });

      if (error) {
        if (error.code === '23505' || error.message?.includes('Duplicate message')) {
          console.warn('Duplicate DM suppressed');
          return;
        }
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-dm-messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['admin-dm-conversations'] });
    },
  });
}

// Fetch channels user is a member of
export function useAdminChannels() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-channels', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('admin_channels')
        .select('*')
        .order('name');

      if (error) throw error;

      // Get member counts
      const channelIds = data.map(c => c.id);
      const { data: members } = await supabase
        .from('admin_channel_members')
        .select('channel_id')
        .in('channel_id', channelIds);

      const countMap = new Map<string, number>();
      members?.forEach(m => {
        countMap.set(m.channel_id, (countMap.get(m.channel_id) || 0) + 1);
      });

      return data.map(c => ({
        ...c,
        member_count: countMap.get(c.id) || 0,
      })) as AdminChannel[];
    },
    enabled: !!user?.id,
  });
}

// Create channel
export function useCreateChannel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description, memberIds }: { name: string; description?: string; memberIds: string[] }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Create channel
      const { data: channel, error } = await supabase
        .from('admin_channels')
        .insert({ name, description, created_by: user.id })
        .select('id')
        .single();

      if (error) throw error;

      // Add creator and selected members
      const allMemberIds = [...new Set([user.id, ...memberIds])];
      const memberInserts = allMemberIds.map(userId => ({
        channel_id: channel.id,
        user_id: userId,
      }));

      const { error: memberError } = await supabase
        .from('admin_channel_members')
        .insert(memberInserts);

      if (memberError) throw memberError;

      return channel.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-channels'] });
    },
  });
}

// Fetch channel messages
export function useAdminChannelMessages(channelId: string | undefined) {
  return useQuery({
    queryKey: ['admin-channel-messages', channelId],
    queryFn: async () => {
      if (!channelId) return [];

      const { data, error } = await supabase
        .from('admin_channel_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set(data.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .in('id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(m => ({
        ...m,
        sender: profileMap.get(m.sender_id),
      })) as AdminChannelMessage[];
    },
    enabled: !!channelId,
  });
}

// Send channel message
export function useSendChannelMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, message, attachment }: { channelId: string; message: string; attachment?: { url: string; type: string; name: string } }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('admin_channel_messages')
        .insert({
          channel_id: channelId,
          sender_id: user.id,
          message,
          ...(attachment && {
            attachment_url: attachment.url,
            attachment_type: attachment.type,
            attachment_name: attachment.name,
          }),
        });

      if (error) {
        if (error.code === '23505' || error.message?.includes('Duplicate message')) {
          console.warn('Duplicate channel message suppressed');
          return;
        }
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-channel-messages', variables.channelId] });
    },
  });
}

// Fetch channel members
export function useChannelMembers(channelId: string | undefined) {
  return useQuery({
    queryKey: ['admin-channel-members', channelId],
    queryFn: async () => {
      if (!channelId) return [];

      const { data, error } = await supabase
        .from('admin_channel_members')
        .select('user_id')
        .eq('channel_id', channelId);

      if (error) throw error;

      const userIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .in('id', userIds);

      return profiles as AdminProfile[];
    },
    enabled: !!channelId,
  });
}

// Real-time subscription for DM messages
export function useAdminDMRealtime(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`admin-dm-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_dm_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-dm-messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['admin-dm-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);
}

// Real-time subscription for channel messages
export function useAdminChannelRealtime(channelId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`admin-channel-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_channel_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-channel-messages', channelId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);
}
