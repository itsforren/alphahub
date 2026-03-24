import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useCallback, useMemo } from 'react';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'client' | 'admin';
  sender_avatar_url: string | null;
  message: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  persona_name?: string | null;
  persona_title?: string | null;
  read_at: string | null;
  created_at: string;
}

export const CHAT_PERSONAS = [
  { id: 'default', name: 'You', title: null, color: 'blue' },
  { id: 'finance', name: 'Alpha Finance', title: 'Finance Department', color: 'red' },
  { id: 'support', name: 'Alpha Support', title: 'Support Team', color: 'green' },
  { id: 'onboarding', name: 'Alpha Onboarding', title: 'Onboarding Team', color: 'purple' },
] as const;

export type ChatPersonaId = typeof CHAT_PERSONAS[number]['id'];

export interface ChatConversation {
  id: string;
  client_id: string;
  status: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count_client: number;
  unread_count_admin: number;
  created_at: string;
  updated_at: string;
  clients?: {
    id: string;
    name: string;
    email: string;
    profile_image_url: string | null;
  };
}

interface BusinessHours {
  start: number;
  end: number;
  timezone: string;
  days: string[];
}

const MESSAGES_PER_PAGE = 50;

// Check if within business hours (9-5 EST, Mon-Fri)
export function isWithinBusinessHours(): boolean {
  const now = new Date();
  
  // Get EST time
  const estOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  };
  const dayOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    weekday: 'short',
  };
  
  const hour = parseInt(new Intl.DateTimeFormat('en-US', estOptions).format(now));
  const day = new Intl.DateTimeFormat('en-US', dayOptions).format(now);
  
  const isWeekend = day === 'Sat' || day === 'Sun';
  const isBusinessHour = hour >= 9 && hour < 17;
  
  return !isWeekend && isBusinessHour;
}

// Hook to get or create conversation for a client
export function useClientConversation(clientId: string | undefined) {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['chat-conversation', clientId],
    queryFn: async () => {
      if (!clientId) throw new Error('No client ID');
      
      // Try to get existing conversation
      const { data: existing, error: fetchError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      if (existing) return existing as ChatConversation;
      
      // Create new conversation
      const { data: newConvo, error: createError } = await supabase
        .from('chat_conversations')
        .insert({ client_id: clientId })
        .select()
        .single();
      
      if (createError) throw createError;
      return newConvo as ChatConversation;
    },
    enabled: !!clientId && !!user,
  });
}

// Hook to get conversation by ID (for admins)
export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['chat-conversation-detail', conversationId],
    queryFn: async () => {
      if (!conversationId) throw new Error('No conversation ID');
      
      const { data, error } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          clients (
            id,
            name,
            email,
            profile_image_url
          )
        `)
        .eq('id', conversationId)
        .single();
      
      if (error) throw error;
      return data as ChatConversation;
    },
    enabled: !!conversationId,
  });
}

// Hook to get all conversations (for admin inbox)
export function useAllConversations() {
  return useQuery({
    queryKey: ['chat-conversations-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          clients (
            id,
            name,
            email,
            profile_image_url
          )
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false });
      
      if (error) throw error;
      return data as ChatConversation[];
    },
  });
}

// Hook for paginated messages with infinite scroll
export function useChatMessages(conversationId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: async ({ pageParam }) => {
      if (!conversationId) throw new Error('No conversation ID');
      
      let query = supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);
      
      if (pageParam) {
        query = query.lt('created_at', pageParam);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return {
        messages: (data as ChatMessage[]).reverse(), // Reverse so oldest first in display
        nextCursor: data.length === MESSAGES_PER_PAGE ? data[data.length - 1]?.created_at : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
    enabled: !!conversationId,
  });
}

// Hook to send a message
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user, profile, role } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      message,
      attachment,
      personaId,
    }: {
      conversationId: string;
      message: string;
      attachment?: { url: string; type: string; name: string };
      personaId?: ChatPersonaId;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const senderRole = role === 'admin' ? 'admin' : 'client';

      // For clients, fetch their name and profile image from the clients table
      let senderName = profile?.name || user.email?.split('@')[0] || 'User';
      let senderAvatarUrl = profile?.avatar_url || null;

      if (role !== 'admin') {
        // Try to get client info for better name/avatar
        const { data: client } = await supabase
          .from('clients')
          .select('name, profile_image_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (client) {
          senderName = client.name || senderName;
          senderAvatarUrl = client.profile_image_url || senderAvatarUrl;
        }
      }

      // Admin persona override
      const persona = personaId && personaId !== 'default'
        ? CHAT_PERSONAS.find(p => p.id === personaId)
        : null;

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_name: persona ? persona.name : senderName,
          sender_role: senderRole,
          sender_avatar_url: persona ? null : senderAvatarUrl,
          message,
          attachment_url: attachment?.url || null,
          attachment_type: attachment?.type || null,
          attachment_name: attachment?.name || null,
          persona_name: persona?.name || null,
          persona_title: persona?.title || null,
        })
        .select()
        .single();

      if (error) {
        // Silently ignore duplicate message errors from the DB trigger
        if (error.code === '23505' || error.message?.includes('Duplicate message')) {
          console.warn('Duplicate message suppressed');
          return null;
        }
        throw error;
      }
      
      // Send email notification for the new message (skip for suppressed duplicates)
      if (data) {
        try {
          await supabase.functions.invoke('chat-notification', {
            body: {
              message: data,
              type: 'INSERT'
            }
          });
        } catch (notifError) {
          console.error('Failed to send chat notification:', notifError);
        }

        // Stella AI is now triggered via database trigger (pg_net) - no frontend call needed
      }

      return data as ChatMessage;
    },
    onSuccess: (_, variables) => {
      // Only invalidate conversation metadata here — the realtime subscription
      // already handles ['chat-messages'] invalidation. Doing both causes double
      // refetch and duplicate messages in the UI.
      queryClient.invalidateQueries({ queryKey: ['chat-conversations-all'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversation', variables.conversationId] });
    },
  });
}

// Hook to mark messages as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { role } = useAuth();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const userRole = role === 'admin' ? 'admin' : 'client';
      
      const { error } = await supabase.rpc('mark_messages_read', {
        p_conversation_id: conversationId,
        p_user_role: userRole,
      });
      
      if (error) throw error;
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations-all'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversation'] });
      queryClient.invalidateQueries({ queryKey: ['chat-unread-count'] });
    },
  });
}

// Hook to get total unread count (for badges)
export function useUnreadCount(isAdmin: boolean) {
  return useQuery({
    queryKey: ['chat-unread-count', isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        // Admin: sum all unread_count_admin
        const { data, error } = await supabase
          .from('chat_conversations')
          .select('unread_count_admin');
        
        if (error) throw error;
        return data.reduce((sum, c) => sum + (c.unread_count_admin || 0), 0);
      } else {
        // Client: get their conversation's unread_count_client
        const { data, error } = await supabase
          .from('chat_conversations')
          .select('unread_count_client');
        
        if (error) throw error;
        return data.reduce((sum, c) => sum + (c.unread_count_client || 0), 0);
      }
    },
  });
}

// Hook for real-time message updates
export function useChatRealtime(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('New message received:', payload);
          queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['chat-conversations-all'] });
          queryClient.invalidateQueries({ queryKey: ['chat-unread-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);
}

// Hook to listen for all conversation updates (for admin inbox)
export function useConversationsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('chat-conversations-all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-conversations-all'] });
          queryClient.invalidateQueries({ queryKey: ['chat-unread-count'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-conversations-all'] });
          queryClient.invalidateQueries({ queryKey: ['chat-unread-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
