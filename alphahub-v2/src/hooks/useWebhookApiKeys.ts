import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WebhookApiKey {
  id: string;
  name: string;
  api_key: string;
  is_active: boolean;
  last_used_at: string | null;
  request_count: number;
  created_at: string;
  updated_at: string;
}

// Fetch all webhook API keys
export function useWebhookApiKeys() {
  return useQuery({
    queryKey: ['webhook-api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WebhookApiKey[];
    },
  });
}

// Create a new API key
export function useCreateWebhookApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('webhook_api_keys')
        .insert({ name })
        .select()
        .single();

      if (error) throw error;
      return data as WebhookApiKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-api-keys'] });
    },
  });
}

// Toggle API key active status
export function useToggleWebhookApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('webhook_api_keys')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WebhookApiKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-api-keys'] });
    },
  });
}

// Delete an API key
export function useDeleteWebhookApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('webhook_api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-api-keys'] });
    },
  });
}

// Regenerate API key
export function useRegenerateWebhookApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Generate a new random key
      const newKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const { data, error } = await supabase
        .from('webhook_api_keys')
        .update({ api_key: newKey })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WebhookApiKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-api-keys'] });
    },
  });
}
