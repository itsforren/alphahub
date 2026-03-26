import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DiscoveryCall, DiscoveryOutcome } from './useDiscoveryCalls';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DiscoveryCallStats {
  speedToLeadMinutes: number | null;
  totalAttempts: number;
  totalConnected: number;
  connectionRate: number;
  bookingRate: number;
  avgAttemptsToBook: number | null;
  lostRate: number;
  attemptDistribution: { stage: string; count: number }[];
  dispositionBreakdown: { outcome: string; count: number }[];
  temperatureDistribution: { temp: string; count: number }[];
  queueDepth: { stage: string; count: number }[];
  recentActivity: DiscoveryCall[];
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/** Aggregated discovery call stats for an agent (used in admin ClientDetail) */
export function useDiscoveryCallStats(agentId: string | null) {
  return useQuery({
    queryKey: ['discovery-stats', agentId],
    queryFn: async (): Promise<DiscoveryCallStats | null> => {
      if (!agentId) return null;

      // Fetch all discovery calls and leads in parallel
      const [callsResult, leadsResult] = await Promise.all([
        supabase
          .from('discovery_calls')
          .select('*')
          .eq('agent_id', agentId)
          .order('call_date', { ascending: false }),
        supabase
          .from('leads')
          .select('id, lead_date, discovery_stage, discovery_temperature')
          .eq('agent_id', agentId),
      ]);

      if (callsResult.error) throw callsResult.error;
      if (leadsResult.error) throw leadsResult.error;

      const calls = (callsResult.data || []) as DiscoveryCall[];
      const leads = leadsResult.data || [];

      if (calls.length === 0) return null;

      // Speed to Lead: avg time from lead_date to first call
      const leadFirstCall = new Map<string, number>();
      const leadDates = new Map<string, string>();
      leads.forEach((l) => {
        if (l.lead_date) leadDates.set(l.id, l.lead_date);
      });
      // Process calls oldest-first to find first call per lead
      const callsAsc = [...calls].reverse();
      callsAsc.forEach((c) => {
        if (!leadFirstCall.has(c.lead_id)) {
          leadFirstCall.set(c.lead_id, new Date(c.call_date).getTime());
        }
      });
      const speedDeltas: number[] = [];
      leadFirstCall.forEach((firstCallTime, leadId) => {
        const leadDate = leadDates.get(leadId);
        if (leadDate) {
          const delta = firstCallTime - new Date(leadDate).getTime();
          if (delta > 0) speedDeltas.push(delta / 60_000); // minutes
        }
      });
      const speedToLeadMinutes =
        speedDeltas.length > 0
          ? speedDeltas.reduce((a, b) => a + b, 0) / speedDeltas.length
          : null;

      // Basic counts
      const totalAttempts = calls.length;
      const totalConnected = calls.filter((c) => c.answered === true).length;
      const connectionRate = totalAttempts > 0 ? (totalConnected / totalAttempts) * 100 : 0;

      const scheduledCount = calls.filter((c) => c.outcome === 'scheduled').length;
      const bookingRate = totalConnected > 0 ? (scheduledCount / totalConnected) * 100 : 0;

      // Avg attempts to book
      const bookedCalls = calls.filter((c) => c.outcome === 'scheduled');
      const avgAttemptsToBook =
        bookedCalls.length > 0
          ? bookedCalls.reduce((sum, c) => sum + c.attempt_number, 0) / bookedCalls.length
          : null;

      // Lost rate
      const lostCount = calls.filter((c) => c.outcome === 'not_a_fit' || c.outcome === 'bad_number').length;
      const totalWorked = new Set(calls.map((c) => c.lead_id)).size;
      const lostRate = totalWorked > 0 ? (lostCount / totalWorked) * 100 : 0;

      // Attempt distribution (from leads table)
      const stageCounts: Record<string, number> = {};
      leads.forEach((l) => {
        const stage = l.discovery_stage || 'new';
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      });
      const attemptDistribution = Object.entries(stageCounts).map(([stage, count]) => ({
        stage,
        count,
      }));

      // Disposition breakdown
      const outcomeCounts: Record<string, number> = {};
      calls.forEach((c) => {
        if (c.outcome) {
          outcomeCounts[c.outcome] = (outcomeCounts[c.outcome] || 0) + 1;
        }
      });
      const dispositionBreakdown = Object.entries(outcomeCounts).map(([outcome, count]) => ({
        outcome,
        count,
      }));

      // Temperature distribution
      const tempCounts: Record<string, number> = {};
      leads.forEach((l) => {
        if (l.discovery_temperature) {
          tempCounts[l.discovery_temperature] = (tempCounts[l.discovery_temperature] || 0) + 1;
        }
      });
      const temperatureDistribution = Object.entries(tempCounts).map(([temp, count]) => ({
        temp,
        count,
      }));

      // Queue depth (active stages only)
      const activeStages = ['new', 'attempt_1', 'attempt_2', 'attempt_3', 'attempt_4'];
      const queueDepth = attemptDistribution.filter((d) => activeStages.includes(d.stage));

      // Recent activity (last 10)
      const recentActivity = calls.slice(0, 10);

      return {
        speedToLeadMinutes,
        totalAttempts,
        totalConnected,
        connectionRate,
        bookingRate,
        avgAttemptsToBook,
        lostRate,
        attemptDistribution,
        dispositionBreakdown,
        temperatureDistribution,
        queueDepth,
        recentActivity,
      };
    },
    enabled: !!agentId,
  });
}
