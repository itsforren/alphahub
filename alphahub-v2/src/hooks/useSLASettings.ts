import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChatSLASettings {
  first_response_minutes: number;
  response_minutes: number;
  business_hours_start: number;
  business_hours_end: number;
  business_days: number[];
  timezone: string;
}

export interface TicketSLASettings {
  first_response_minutes: number;
  resolution_hours: number;
  warning_threshold_percent: number;
}

export interface CollectionsSettings {
  reminder_days_before: number;
  late_notice_days: number;
  warning_days: number;
  final_notice_days: number;
  collections_days: number;
}

const DEFAULT_CHAT_SLA: ChatSLASettings = {
  first_response_minutes: 30,
  response_minutes: 30,
  business_hours_start: 9,
  business_hours_end: 17,
  business_days: [1, 2, 3, 4, 5],
  timezone: 'America/New_York',
};

const DEFAULT_TICKET_SLA: TicketSLASettings = {
  first_response_minutes: 60,
  resolution_hours: 48,
  warning_threshold_percent: 80,
};

const DEFAULT_COLLECTIONS: CollectionsSettings = {
  reminder_days_before: 3,
  late_notice_days: 1,
  warning_days: 7,
  final_notice_days: 21,
  collections_days: 30,
};

export function useChatSLASettings() {
  return useQuery({
    queryKey: ['sla-settings', 'chat_sla'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_settings')
        .select('setting_value')
        .eq('setting_key', 'chat_sla')
        .single();

      if (error || !data) return DEFAULT_CHAT_SLA;
      return data.setting_value as unknown as ChatSLASettings;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTicketSLASettings() {
  return useQuery({
    queryKey: ['sla-settings', 'ticket_sla'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_settings')
        .select('setting_value')
        .eq('setting_key', 'ticket_sla')
        .single();

      if (error || !data) return DEFAULT_TICKET_SLA;
      return data.setting_value as unknown as TicketSLASettings;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCollectionsSettings() {
  return useQuery({
    queryKey: ['sla-settings', 'collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_settings')
        .select('setting_value')
        .eq('setting_key', 'collections')
        .single();

      if (error || !data) return DEFAULT_COLLECTIONS;
      return data.setting_value as unknown as CollectionsSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSLASettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      key, 
      value 
    }: { 
      key: 'chat_sla' | 'ticket_sla' | 'collections';
      value: ChatSLASettings | TicketSLASettings | CollectionsSettings;
    }) => {
      const { error } = await supabase
        .from('sla_settings')
        .update({ setting_value: value as any })
        .eq('setting_key', key);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sla-settings', variables.key] });
    },
  });
}
