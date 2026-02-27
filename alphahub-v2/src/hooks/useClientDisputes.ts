import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientDispute {
  id: string;
  amount: number;
  reason: string | null;
  status: string;
  evidenceDueBy: string | null;
  createdAt: string;
}

export function useClientDisputes(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-disputes', clientId],
    queryFn: async (): Promise<ClientDispute[]> => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('disputes')
        .select('id, amount, reason, status, evidence_due_by, created_at')
        .eq('client_id', clientId)
        .in('status', ['needs_response', 'under_review', 'warning_needs_response', 'warning_under_review'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(d => ({
        id: d.id,
        amount: (d.amount || 0) / 100,
        reason: d.reason,
        status: d.status,
        evidenceDueBy: d.evidence_due_by,
        createdAt: d.created_at,
      }));
    },
    enabled: !!clientId,
  });
}
