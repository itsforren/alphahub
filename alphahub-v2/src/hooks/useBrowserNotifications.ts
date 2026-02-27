import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export function useBrowserNotifications() {
  const { user, role } = useAuth();
  const permissionRef = useRef<NotificationPermission>('default');
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastSoundTimeRef = useRef(0);

  console.log('[BrowserNotifications] Hook initialized - user:', user?.id, 'role:', role);

  // Request permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
      console.log('[BrowserNotifications] Current permission:', Notification.permission);
      
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          permissionRef.current = permission;
          console.log('[BrowserNotifications] Permission granted:', permission);
        });
      }
    }
  }, []);

  // Play notification sound using Web Audio API
  const playNotificationSound = useCallback(() => {
    console.log('[BrowserNotifications] Playing notification sound');
    const now = Date.now();
    // Throttle sounds to avoid spam (minimum 2 seconds between sounds)
    if (now - lastSoundTimeRef.current < 2000) {
      console.log('[BrowserNotifications] Sound throttled');
      return;
    }
    lastSoundTimeRef.current = now;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;

      const playNote = (freq: number, startTime: number, duration: number, volume: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, startTime);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const t = ctx.currentTime;
      // Pleasant 3-note chime (C5 - E5 - G5)
      playNote(523.25, t, 0.15, 0.12);       // C5
      playNote(659.25, t + 0.08, 0.15, 0.10); // E5
      playNote(783.99, t + 0.16, 0.2, 0.08);  // G5
    } catch (e) {
      console.error('[BrowserNotifications] Error playing notification sound:', e);
    }
  }, []);

  const showNotification = useCallback((payload: NotificationPayload) => {
    console.log('[BrowserNotifications] showNotification called:', payload.title, 'hasFocus:', document.hasFocus());
    
    // Always play sound when tab is not focused (even if notifications are blocked)
    if (!document.hasFocus()) {
      playNotificationSound();
    }

    if (!('Notification' in window)) {
      console.log('[BrowserNotifications] Notifications not supported');
      return;
    }
    if (permissionRef.current !== 'granted') {
      console.log('[BrowserNotifications] Permission not granted:', permissionRef.current);
      return;
    }
    if (document.hasFocus()) {
      console.log('[BrowserNotifications] Tab is focused, skipping visual notification');
      return;
    }

    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/favicon.png',
      tag: payload.tag,
      data: payload.data,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }, [playNotificationSound]);

  // Subscribe to client chat messages (for admins)
  useEffect(() => {
    if (!user?.id) {
      console.log('[BrowserNotifications] No user, skipping client chat subscription');
      return;
    }
    if (role !== 'admin') {
      console.log('[BrowserNotifications] Not admin, skipping client chat subscription');
      return;
    }

    console.log('[BrowserNotifications] Setting up client chat subscription for admin');

    const channel = supabase
      .channel('browser-notif-client-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          console.log('[BrowserNotifications] Received chat_messages insert:', payload);
          const message = payload.new as {
            sender_id: string;
            sender_name: string;
            sender_role: string;
            message: string;
            conversation_id: string;
          };

          // Only notify admins when a client sends a message
          if (message.sender_role === 'client') {
            showNotification({
              title: `New message from ${message.sender_name}`,
              body: message.message.substring(0, 100),
              tag: `client-chat-${message.conversation_id}`,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[BrowserNotifications] Client chat subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, role, showNotification]);

  // Subscribe to admin DM messages
  useEffect(() => {
    if (!user?.id) {
      console.log('[BrowserNotifications] No user, skipping admin DM subscription');
      return;
    }
    if (role !== 'admin') {
      console.log('[BrowserNotifications] Not admin, skipping admin DM subscription');
      return;
    }

    console.log('[BrowserNotifications] Setting up admin DM subscription');

    const channel = supabase
      .channel('browser-notif-admin-dm')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_dm_messages',
        },
        async (payload) => {
          console.log('[BrowserNotifications] Received admin_dm_messages insert:', payload);
          const message = payload.new as {
            sender_id: string;
            message: string;
            conversation_id: string;
          };

          // Don't notify if we sent the message
          if (message.sender_id === user.id) {
            console.log('[BrowserNotifications] Ignoring own message');
            return;
          }

          // Check if we're part of this conversation
          const { data: convo } = await supabase
            .from('admin_dm_conversations')
            .select('participant1_id, participant2_id')
            .eq('id', message.conversation_id)
            .single();

          if (!convo) {
            console.log('[BrowserNotifications] Conversation not found');
            return;
          }

          const isParticipant = convo.participant1_id === user.id || convo.participant2_id === user.id;
          if (!isParticipant) {
            console.log('[BrowserNotifications] Not a participant in this conversation');
            return;
          }

          // Get sender name
          const { data: sender } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', message.sender_id)
            .single();

          const senderName = sender?.name || sender?.email || 'Someone';

          showNotification({
            title: `Message from ${senderName}`,
            body: message.message.substring(0, 100),
            tag: `admin-dm-${message.conversation_id}`,
          });
        }
      )
      .subscribe((status) => {
        console.log('[BrowserNotifications] Admin DM subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, role, showNotification]);

  // Subscribe to admin channel messages
  useEffect(() => {
    if (!user?.id) {
      console.log('[BrowserNotifications] No user, skipping admin channel subscription');
      return;
    }
    if (role !== 'admin') {
      console.log('[BrowserNotifications] Not admin, skipping admin channel subscription');
      return;
    }

    console.log('[BrowserNotifications] Setting up admin channel subscription');

    const channel = supabase
      .channel('browser-notif-admin-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_channel_messages',
        },
        async (payload) => {
          console.log('[BrowserNotifications] Received admin_channel_messages insert:', payload);
          const message = payload.new as {
            sender_id: string;
            message: string;
            channel_id: string;
          };

          // Don't notify if we sent the message
          if (message.sender_id === user.id) {
            console.log('[BrowserNotifications] Ignoring own message');
            return;
          }

          // Check if we're a member of this channel
          const { data: membership } = await supabase
            .from('admin_channel_members')
            .select('id')
            .eq('channel_id', message.channel_id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!membership) {
            console.log('[BrowserNotifications] Not a member of this channel');
            return;
          }

          // Get channel name and sender name
          const [channelResult, senderResult] = await Promise.all([
            supabase.from('admin_channels').select('name').eq('id', message.channel_id).single(),
            supabase.from('profiles').select('name, email').eq('id', message.sender_id).single(),
          ]);

          const channelName = channelResult.data?.name || 'Channel';
          const senderName = senderResult.data?.name || senderResult.data?.email || 'Someone';

          showNotification({
            title: `#${channelName}`,
            body: `${senderName}: ${message.message.substring(0, 80)}`,
            tag: `admin-channel-${message.channel_id}`,
          });
        }
      )
      .subscribe((status) => {
        console.log('[BrowserNotifications] Admin channel subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, role, showNotification]);

  // Subscribe to chat messages for clients
  useEffect(() => {
    if (!user?.id) {
      console.log('[BrowserNotifications] No user, skipping client inbox subscription');
      return;
    }
    if (role === 'admin') {
      console.log('[BrowserNotifications] Is admin, skipping client inbox subscription');
      return;
    }

    console.log('[BrowserNotifications] Setting up client inbox subscription');

    const channel = supabase
      .channel('browser-notif-client-inbox')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          console.log('[BrowserNotifications] Received client inbox message:', payload);
          const message = payload.new as {
            sender_id: string;
            sender_name: string;
            sender_role: string;
            message: string;
          };

          // Notify client when admin sends a message
          if (message.sender_role === 'admin' && message.sender_id !== user.id) {
            showNotification({
              title: `New message from ${message.sender_name}`,
              body: message.message.substring(0, 100),
              tag: 'client-chat-inbox',
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[BrowserNotifications] Client inbox subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, role, showNotification]);

  return { showNotification };
}
