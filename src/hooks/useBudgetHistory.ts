import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BudgetHistoryEntry {
  id: string;
  created_at: string;
  campaign_id: string | null;
  action: string;
  actor: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason_codes: string[] | null;
  notes: string | null;
}

export function useBudgetHistory(clientId: string | undefined) {
  return useQuery({
    queryKey: ['budget-history', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_audit_log')
        .select('id, created_at, campaign_id, action, actor, old_value, new_value, reason_codes, notes')
        .eq('client_id', clientId!)
        .in('action', ['budget_change', 'safe_mode_enter', 'safe_mode_exit', 'campaign_pause', 'campaign_enable'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as BudgetHistoryEntry[];
    },
    enabled: !!clientId,
  });
}
