import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CallerStats {
  caller_name: string;
  calls_made: number;
  connected: number;
  booked: number;
  pickup_rate: number;
  rank: number;
}

export function useCallerLeaderboard(agentId: string | null) {
  return useQuery({
    queryKey: ['caller-leaderboard', agentId],
    queryFn: async (): Promise<CallerStats[]> => {
      if (!agentId) return [];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('discovery_calls')
        .select('called_by_name, answered, outcome, call_date')
        .eq('agent_id', agentId)
        .gte('call_date', todayStart.toISOString());

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Group by caller
      const grouped = new Map<string, { calls: number; connected: number; booked: number }>();
      data.forEach((c) => {
        const name = c.called_by_name || 'Unknown';
        const entry = grouped.get(name) || { calls: 0, connected: 0, booked: 0 };
        entry.calls++;
        if (c.answered) entry.connected++;
        if (c.outcome === 'strategy_booked' || c.outcome === 'scheduled') entry.booked++;
        grouped.set(name, entry);
      });

      // Convert to array, sort by calls made desc, assign ranks
      const stats = Array.from(grouped.entries())
        .map(([name, s]) => ({
          caller_name: name,
          calls_made: s.calls,
          connected: s.connected,
          booked: s.booked,
          pickup_rate: s.calls > 0 ? Math.round((s.connected / s.calls) * 100) : 0,
          rank: 0,
        }))
        .sort((a, b) => b.calls_made - a.calls_made);

      stats.forEach((s, i) => (s.rank = i + 1));
      return stats;
    },
    enabled: !!agentId,
    refetchInterval: 60_000,
  });
}
