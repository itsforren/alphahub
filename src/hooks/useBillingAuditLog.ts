import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BillingAuditEntry {
  id: string;
  client_id: string;
  changed_by: string | null;
  change_source: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  // Enriched via client lookup
  client_name?: string;
}

export function useBillingAuditLog(clientId?: string, limit = 50) {
  return useQuery({
    queryKey: ['billing-audit-log', clientId, limit],
    queryFn: async () => {
      let query = supabase
        .from('billing_settings_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with client names (batch lookup)
      if (data && data.length > 0) {
        const clientIds = [...new Set(data.map((d: any) => d.client_id))];
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name')
          .in('id', clientIds);

        const clientMap = new Map(clients?.map((c: any) => [c.id, c.name]) || []);

        return data.map((entry: any) => ({
          ...entry,
          client_name: clientMap.get(entry.client_id) || entry.client_id,
        })) as BillingAuditEntry[];
      }

      return (data || []) as BillingAuditEntry[];
    },
  });
}
