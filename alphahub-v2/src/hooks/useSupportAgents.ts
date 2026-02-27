import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SupportAgent {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  is_active: boolean;
  categories: string[];
  is_default: boolean;
  team?: string;
  created_at: string;
  updated_at: string;
}

export function useSupportAgents() {
  return useQuery({
    queryKey: ['support-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_agents')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as SupportAgent[];
    },
  });
}

export function useCreateSupportAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agent: Omit<SupportAgent, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('support_agents')
        .insert(agent)
        .select()
        .single();

      if (error) throw error;
      return data as SupportAgent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-agents'] });
    },
  });
}

export function useUpdateSupportAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SupportAgent> & { id: string }) => {
      const { data, error } = await supabase
        .from('support_agents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SupportAgent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-agents'] });
    },
  });
}

export function useDeleteSupportAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('support_agents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-agents'] });
    },
  });
}
