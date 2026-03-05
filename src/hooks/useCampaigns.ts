import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCampaigns(clientId?: string) {
  return useQuery({
    queryKey: ['campaigns', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('client_id', clientId!)
        .order('is_primary', { ascending: false })
        .order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}
