import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SystemAlert {
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

export function useSystemAlerts(unacknowledgedOnly = true) {
  return useQuery({
    queryKey: ['system-alerts', unacknowledgedOnly],
    queryFn: async () => {
      let query = supabase
        .from('system_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (unacknowledgedOnly) {
        query = query.is('acknowledged_at', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SystemAlert[];
    },
  });
}

export function useAcknowledgeAlert() {
  return async (alertId: string, userId: string) => {
    const { error } = await supabase
      .from('system_alerts')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userId,
      })
      .eq('id', alertId);

    if (error) throw error;
  };
}
