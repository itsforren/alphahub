import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SalesTeamMember {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  role: 'setter' | 'closer' | 'onboarding';
  is_active: boolean;
  created_at: string;
}

export function useSalesTeam() {
  return useQuery({
    queryKey: ['sales-team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_team_members')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as SalesTeamMember[];
    },
  });
}

export function useSalesTeamByRole(role: 'setter' | 'closer' | 'onboarding') {
  return useQuery({
    queryKey: ['sales-team', role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_team_members')
        .select('*')
        .eq('is_active', true)
        .eq('role', role)
        .order('name');

      if (error) throw error;
      return data as SalesTeamMember[];
    },
  });
}
