import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Partner {
  id: string;
  name: string;
  slug: string;
  ghl_location_id: string | null;
  calendar_link: string | null;
  color: string;
  commission_percent: number;
  is_active: boolean;
  created_at: string;
}

export function usePartners() {
  return useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as Partner[];
    },
  });
}
