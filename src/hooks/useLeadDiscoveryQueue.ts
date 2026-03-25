import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DiscoveryStage, Temperature } from './useDiscoveryCalls';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DiscoveryLead {
  id: string;
  agent_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  state: string | null;
  age: string | null;
  lead_date: string | null;
  status: string | null;
  // Discovery tracking
  discovery_stage: DiscoveryStage | null;
  discovery_temperature: Temperature | null;
  last_call_attempt_at: string | null;
  call_attempt_count: number;
  last_attempted_by: string | null;
  last_attempted_by_id: string | null;
  currently_being_worked: boolean;
  work_started_at: string | null;
  lost_reason: string | null;
  // Delivery
  delivery_status: string | null;
  delivered_at: string | null;
  ghl_contact_id: string | null;
  // Booking
  strategy_booked_at: string | null;
  intro_scheduled_at: string | null;
  // Pre-fill data
  interest: string | null;
  savings: string | null;
  investments: string | null;
  employment: string | null;
}

export interface DiscoveryQueueData {
  queue: DiscoveryLead[];       // new + attempt_1-4, delivered only
  booked: DiscoveryLead[];      // booked stage
  all: DiscoveryLead[];         // everything
  lost: DiscoveryLead[];        // lost + long_term_nurture
  failedDelivery: DiscoveryLead[]; // delivery_status != 'delivered'
}

const LEAD_SELECT = `
  id, agent_id, first_name, last_name, email, phone, state, age,
  lead_date, status, discovery_stage, discovery_temperature,
  last_call_attempt_at, call_attempt_count, last_attempted_by,
  last_attempted_by_id, currently_being_worked, work_started_at,
  lost_reason, delivery_status, delivered_at, ghl_contact_id,
  strategy_booked_at, intro_scheduled_at,
  interest, savings, investments, employment
`;

const STALE_WORK_MINUTES = 30;

// ── Priority Scoring ────────────────────────────────────────────────────────

export function computePriorityScore(lead: DiscoveryLead): number {
  const now = Date.now();
  const leadAge = lead.lead_date ? now - new Date(lead.lead_date).getTime() : Infinity;
  const leadAgeMinutes = leadAge / 60_000;
  const lastAttemptAge = lead.last_call_attempt_at
    ? now - new Date(lead.last_call_attempt_at).getTime()
    : Infinity;
  const lastAttemptHours = lastAttemptAge / 3_600_000;
  const attempts = lead.call_attempt_count || 0;

  // Brand new lead (0 attempts, <30 min old) = HIGHEST priority (1000)
  if (attempts === 0 && leadAgeMinutes < 30) return 1000;

  // Brand new lead (0 attempts, older) = very high (900 - age penalty)
  if (attempts === 0) return 900 - Math.min(leadAgeMinutes / 60, 100);

  // Callback due now or overdue (discovery_complete stage with callback) = HIGH (800)
  if (lead.discovery_stage === 'discovery_complete') return 800;

  // Lead with <3 attempts not called today = MEDIUM (600 + recency bonus)
  const calledToday = lastAttemptHours < 12; // rough "today" check
  if (attempts < 3 && !calledToday) return 600 + (3 - attempts) * 50;

  // Lead with 4 attempts (needs final attempt) = LOWER but still needs attention (400)
  if (attempts >= 4 && !calledToday) return 400;

  // Lead with <3 attempts called today = LOW (200)
  if (attempts < 3 && calledToday) return 200;

  // Already attempted today with 4+ attempts = LOWEST (100)
  return 100;
}

// ── Hooks ────────────────────────────────────────────────────────────────────

/** Fetch all leads for an agent, organized into discovery queue sections */
export function useLeadDiscoveryQueue(agentId: string | null) {
  return useQuery({
    queryKey: ['discovery-queue', agentId],
    queryFn: async (): Promise<DiscoveryQueueData> => {
      if (!agentId) return { queue: [], booked: [], all: [], lost: [], failedDelivery: [] };

      const { data, error } = await supabase
        .from('leads')
        .select(LEAD_SELECT)
        .eq('agent_id', agentId)
        .order('lead_date', { ascending: false });

      if (error) throw error;

      const leads = (data || []) as DiscoveryLead[];
      const now = Date.now();

      // Auto-release stale work claims (>30 min)
      const processed = leads.map((lead) => {
        if (lead.currently_being_worked && lead.work_started_at) {
          const elapsed = now - new Date(lead.work_started_at).getTime();
          if (elapsed > STALE_WORK_MINUTES * 60 * 1000) {
            return { ...lead, currently_being_worked: false };
          }
        }
        return lead;
      });

      const activeStages: DiscoveryStage[] = [
        'new', 'attempt_1', 'attempt_2', 'attempt_3', 'attempt_4',
        'discovery_complete',  // qualified, needs strategy booking
      ];
      const bookedStages: DiscoveryStage[] = ['strategy_booked', 'booked', 'intro_scheduled'];
      const lostStages: DiscoveryStage[] = ['lost', 'long_term_nurture'];

      return {
        queue: processed
          .filter(
            (l) =>
              activeStages.includes(l.discovery_stage as DiscoveryStage) &&
              l.delivery_status === 'delivered'
          )
          .sort((a, b) => computePriorityScore(b) - computePriorityScore(a)),
        booked: processed.filter((l) => bookedStages.includes(l.discovery_stage as DiscoveryStage)),
        all: processed,
        lost: processed.filter((l) => lostStages.includes(l.discovery_stage as DiscoveryStage)),
        failedDelivery: processed.filter(
          (l) => l.delivery_status !== 'delivered' && l.delivery_status !== null
        ),
      };
    },
    enabled: !!agentId,
    refetchInterval: 30_000, // Refresh every 30s for multi-user awareness
  });
}

/** Fetch the current user's client record to get agent_id */
export function useMyClient() {
  return useQuery({
    queryKey: ['my-client'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('clients')
        .select('id, agent_id, name, scheduler_link, subaccount_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
