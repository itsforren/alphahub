import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  severity: string;
  metadata: Record<string, unknown>;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
}

interface UseNotificationsOptions {
  unacknowledgedOnly?: boolean;
  limit?: number;
  alertType?: string;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    unacknowledgedOnly = true,
    limit = 20,
    alertType,
  } = options;

  const queryClient = useQueryClient();

  // Real-time subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel('system_alerts_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'system_alerts',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['notifications', { unacknowledgedOnly, limit, alertType }],
    queryFn: async () => {
      let query = supabase
        .from('system_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (unacknowledgedOnly) {
        query = query.is('acknowledged_at', null);
      }

      if (alertType) {
        query = query.eq('alert_type', alertType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Notification[];
    },
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('system_alerts')
        .select('id', { count: 'exact', head: true })
        .is('acknowledged_at', null);

      if (error) throw error;
      return count ?? 0;
    },
    // Poll every 30s as a fallback alongside realtime
    refetchInterval: 30000,
  });
}

export function useAcknowledgeNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, userId }: { alertId: string; userId: string }) => {
      const { error } = await supabase
        .from('system_alerts')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: userId,
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
    },
  });
}

export function useAcknowledgeAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { error } = await supabase
        .from('system_alerts')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: userId,
        })
        .is('acknowledged_at', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
    },
  });
}
