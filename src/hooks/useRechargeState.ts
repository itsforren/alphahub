import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RechargeState {
  state: string;
  attempt_number: number;
  last_charge_at: string | null;
  last_failure_at: string | null;
  last_failure_reason: string | null;
  safe_mode_active: boolean;
  safe_mode_activated_at: string | null;
  charge_attempts_today: number;
}

export function useRechargeState(clientId: string | undefined) {
  return useQuery({
    queryKey: ['recharge-state', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from('recharge_state')
        .select('state, attempt_number, last_charge_at, last_failure_at, last_failure_reason, safe_mode_active, safe_mode_activated_at, charge_attempts_today')
        .eq('client_id', clientId)
        .maybeSingle();
      if (error) throw error;
      return data as RechargeState | null;
    },
    enabled: !!clientId,
    refetchInterval: 30000, // Poll every 30s for near-real-time status
  });
}
