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
  booked_call_at: string | null;
  // Premiums
  target_premium: number | null;
  submitted_premium: number | null;
  approved_premium: number | null;
  issued_premium: number | null;
  submitted_at: string | null;
  approved_at: string | null;
  issued_at: string | null;
  // Pre-fill data
  interest: string | null;
  savings: string | null;
  investments: string | null;
  employment: string | null;
}

export interface DiscoveryQueueData {
  queue: DiscoveryLead[];          // new + attempt_1-4, delivered only
  callbacks: DiscoveryLead[];      // callback_scheduled
  introBooked: DiscoveryLead[];    // intro_scheduled
  strategyBooked: DiscoveryLead[]; // strategy_booked, booked
  all: DiscoveryLead[];            // everything
  lost: DiscoveryLead[];           // lost + long_term_nurture
  failedDelivery: DiscoveryLead[]; // delivery_status != 'delivered'
}

const LEAD_SELECT = `
  id, agent_id, first_name, last_name, email, phone, state, age,
  lead_date, status, discovery_stage, discovery_temperature,
  last_call_attempt_at, call_attempt_count, last_attempted_by,
  last_attempted_by_id, currently_being_worked, work_started_at,
  lost_reason, delivery_status, delivered_at, ghl_contact_id,
  strategy_booked_at, intro_scheduled_at, booked_call_at,
  target_premium, submitted_premium, approved_premium, issued_premium,
  submitted_at, approved_at, issued_at,
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
      if (!agentId) return { queue: [], callbacks: [], introBooked: [], strategyBooked: [], all: [], lost: [], failedDelivery: [] };

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
        'no_show',             // discovery no-show, back in queue
        'strategy_no_show',    // strategy no-show, needs rebook (HIGH priority)
        'cancelled',           // cancelled, needs follow-up
        'reschedule_needed',   // needs rescheduling
      ];
      const lostStages: DiscoveryStage[] = ['lost', 'long_term_nurture'];

      return {
        queue: processed
          .filter(
            (l) =>
              activeStages.includes(l.discovery_stage as DiscoveryStage) &&
              l.delivery_status === 'delivered'
          )
          .sort((a, b) => computePriorityScore(b) - computePriorityScore(a)),
        callbacks: processed.filter((l) => l.discovery_stage === 'callback_scheduled'),
        introBooked: processed.filter((l) => l.discovery_stage === 'intro_scheduled'),
        strategyBooked: processed.filter((l) => l.discovery_stage === 'strategy_booked' || l.discovery_stage === 'booked'),
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

// Team member mappings — maps user_id to agent config
// This is the source of truth for who can access which agent's leads
const TEAM_MEMBERS: Record<string, { agent_id: string; callback_calendar_id: string; role: string; name: string }> = {
  '2145cc04-a44e-4dea-b51f-6d91a71447d8': { agent_id: 'EIx4YsVXAfD6hoIX2ixz', callback_calendar_id: '7DRohwRVnVUA5QvMOiHN', role: 'closer', name: 'James Warren' },
  'f12f4bfc-711a-4c20-bfd8-33f35017de65': { agent_id: 'EIx4YsVXAfD6hoIX2ixz', callback_calendar_id: '8Plj0zg1g4QOHKuQ10MW', role: 'setter', name: 'Sierra Warren' },
  'b5af9972-c8ed-43ef-a3a4-4487ea7c56a9': { agent_id: 'EIx4YsVXAfD6hoIX2ixz', callback_calendar_id: '8Plj0zg1g4QOHKuQ10MW', role: 'setter', name: 'Sierra Smith' },
};

/** Fetch the current user's client record OR team membership to get agent_id */
export function useMyClient() {
  return useQuery({
    queryKey: ['my-client'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // Check team member mapping FIRST (handles Sierra and other setters)
      const teamData = TEAM_MEMBERS[user.id];
      if (teamData) {
        const { data: agentClient } = await supabase
          .from('clients')
          .select('id, agent_id, name, scheduler_link, subaccount_id')
          .eq('agent_id', teamData.agent_id)
          .eq('status', 'active')
          .limit(1)
          .single();

        if (agentClient) {
          return {
            ...agentClient,
            callback_calendar_id: teamData.callback_calendar_id,
            team_role: teamData.role,
            team_member_name: teamData.name,
          };
        }
      }

      // Fallback: direct client record (agent owner)
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id, name, scheduler_link, subaccount_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (clientData?.agent_id) return clientData;

      return null;
    },
  });
}
