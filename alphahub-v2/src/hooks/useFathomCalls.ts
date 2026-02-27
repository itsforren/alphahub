import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FathomCall {
  id: string;
  title?: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  summary?: string;
  action_items?: string[];
  key_topics?: string[];
  sentiment?: string;
  recording_url?: string;
  participants?: Array<{
    email?: string;
    name?: string;
  }>;
}

interface UseFathomCallsOptions {
  email?: string | null;
  name?: string | null;
  showAll?: boolean;
}

export function useFathomCalls(options: UseFathomCallsOptions) {
  const { email, name, showAll = false } = options;
  
  return useQuery({
    queryKey: ['fathom-calls', email, name, showAll],
    queryFn: async (): Promise<FathomCall[]> => {
      if (!email && !name && !showAll) return [];

      const { data, error } = await supabase.functions.invoke('fetch-fathom-calls', {
        body: { email, name, limit: 20, showAll },
      });

      if (error) {
        console.error('Error fetching Fathom calls:', error);
        throw new Error(error.message || 'Failed to fetch calls from Fathom');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data?.calls || [];
    },
    enabled: !!(email || name || showAll),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useImportFathomCall(prospectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (call: FathomCall) => {
      // Check if call already exists
      const { data: existing } = await supabase
        .from('call_logs')
        .select('id')
        .eq('fathom_call_id', call.id)
        .single();

      if (existing) {
        throw new Error('Call already imported');
      }

      // Insert the call log
      const { data, error } = await supabase
        .from('call_logs')
        .insert({
          prospect_id: prospectId,
          call_date: call.started_at,
          duration_seconds: call.duration_seconds,
          summary: call.summary,
          action_items: call.action_items || [],
          key_topics: call.key_topics || [],
          sentiment: call.sentiment,
          recording_url: call.recording_url,
          fathom_call_id: call.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospect-detail', prospectId] });
    },
  });
}
