import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────

export type DiscoveryOutcome =
  | 'scheduled'           // legacy
  | 'strategy_booked'     // zoom/strategy call confirmed
  | 'cant_book_now'       // qualified but couldn't book
  | 'not_a_fit'
  | 'voicemail'
  | 'no_answer'
  | 'call_back'
  | 'long_term_nurture'
  | 'bad_number'
  | 'intro_scheduled'     // bad timing, booked discovery for later
  | 'bad_timing';         // bad timing, no booking made

export type Temperature = string;

export type DiscoveryStage =
  | 'new'
  | 'attempt_1'
  | 'attempt_2'
  | 'attempt_3'
  | 'attempt_4'
  | 'intro_scheduled'
  | 'callback_scheduled'
  | 'discovery_complete'
  | 'strategy_booked'
  | 'booked'              // legacy
  | 'completed'
  | 'long_term_nurture'
  | 'lost';

export interface DiscoveryFormData {
  spouse?: string;
  kids?: string;
  kid_details?: string;
  contribution?: string;
  retire_age?: string;
  accounts?: { type: string; balance: string }[];
  health_conditions?: string[];
  tobacco?: string;
  tobacco_type?: string;
  tobacco_frequency?: string;
  felony?: string;
  qualifies?: string;
  interests?: string[];
  interest_other?: string;
  occupation?: string;
  notes?: string;
  savings?: string;
  investments?: string[];
  callback_date?: string;
  dq_reason?: string;
  annuity_opportunity?: string;
}

export interface DiscoveryCall {
  id: string;
  lead_id: string;
  agent_id: string;
  attempt_number: number;
  called_by: string | null;
  called_by_name: string | null;
  answered: boolean | null;
  outcome: DiscoveryOutcome | null;
  bad_number_reason: string | null;
  temperature: Temperature | null;
  discovery_data: DiscoveryFormData;
  appointment_booked_at: string | null;
  appointment_datetime: string | null;
  ghl_synced_at: string | null;
  ghl_sync_error: string | null;
  call_date: string;
  created_at: string;
}

export interface SaveDiscoveryCallInput {
  lead_id: string;
  agent_id: string;
  attempt_number: number;
  answered: boolean;
  outcome?: DiscoveryOutcome;
  bad_number_reason?: string;
  temperature?: Temperature;
  discovery_data?: DiscoveryFormData;
  appointment_datetime?: string;
}

// ── Hooks ────────────────────────────────────────────────────────────────────

/** Fetch all discovery calls for a specific lead */
export function useDiscoveryCallsForLead(leadId: string | null) {
  return useQuery({
    queryKey: ['discovery-calls', 'lead', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('discovery_calls')
        .select('*')
        .eq('lead_id', leadId)
        .order('call_date', { ascending: false });
      if (error) throw error;
      return data as DiscoveryCall[];
    },
    enabled: !!leadId,
  });
}

/** Save a discovery call and update the lead's discovery stage */
export function useSaveDiscoveryCall() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (input: SaveDiscoveryCallInput) => {
      const calledByName = profile?.name || user?.email || 'Unknown';

      // 1. Insert discovery call
      const { data: call, error: callError } = await supabase
        .from('discovery_calls')
        .insert({
          lead_id: input.lead_id,
          agent_id: input.agent_id,
          attempt_number: input.attempt_number,
          called_by: user?.id,
          called_by_name: calledByName,
          answered: input.answered,
          outcome: input.outcome || null,
          bad_number_reason: input.bad_number_reason || null,
          temperature: input.temperature || null,
          discovery_data: (input.discovery_data || {}) as any,
          appointment_datetime: input.appointment_datetime || null,
          appointment_booked_at: input.outcome === 'scheduled' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (callError) throw callError;

      // 2. Determine new discovery stage
      let newStage: DiscoveryStage;
      let lostReason: string | null = null;

      if (input.outcome === 'strategy_booked' || input.outcome === 'scheduled') {
        newStage = 'strategy_booked';
      } else if (input.outcome === 'cant_book_now') {
        newStage = 'discovery_complete';
      } else if (input.outcome === 'intro_scheduled') {
        newStage = 'intro_scheduled';
      } else if (input.outcome === 'not_a_fit') {
        newStage = 'lost';
        lostReason = 'not_a_fit';
      } else if (input.outcome === 'bad_number') {
        newStage = 'lost';
        lostReason = input.bad_number_reason || 'bad_number';
      } else if (input.outcome === 'long_term_nurture') {
        newStage = 'long_term_nurture';
      } else if (input.outcome === 'call_back') {
        newStage = 'callback_scheduled';
      } else if (input.outcome === 'bad_timing') {
        // Bad timing but didn't schedule — keep in same attempt stage
        const nextAttempt = Math.min(input.attempt_number, 4);
        newStage = nextAttempt > 0 ? (`attempt_${nextAttempt}` as DiscoveryStage) : 'new';
      } else {
        // voicemail, no_answer
        const nextAttempt = Math.min(input.attempt_number + 1, 4);
        newStage = `attempt_${nextAttempt}` as DiscoveryStage;
      }

      // 3. Update lead
      const leadUpdate: Record<string, any> = {
        discovery_stage: newStage,
        last_call_attempt_at: new Date().toISOString(),
        call_attempt_count: input.attempt_number,
        last_attempted_by: calledByName,
        last_attempted_by_id: user?.id,
        currently_being_worked: false,
        work_started_at: null,
      };

      if (input.temperature) {
        leadUpdate.discovery_temperature = input.temperature;
      }
      if (lostReason) {
        leadUpdate.lost_reason = lostReason;
      }

      const { error: leadError } = await supabase
        .from('leads')
        .update(leadUpdate)
        .eq('id', input.lead_id);

      if (leadError) throw leadError;

      // 4. Trigger GHL sync (fire-and-forget, direct fetch to avoid JWT issues)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      fetch(`${supabaseUrl}/functions/v1/sync-discovery-to-ghl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({ lead_id: input.lead_id, discovery_call_id: call.id }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            console.error('GHL sync failed:', data?.error || res.status);
            supabase
              .from('discovery_calls')
              .update({ ghl_sync_error: data?.error || `HTTP ${res.status}` })
              .eq('id', call.id);
          }
        })
        .catch((err) => {
          console.error('GHL sync network error:', err);
        });

      return call;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ['discovery-queue'] });
      queryClient.invalidateQueries({ queryKey: ['discovery-calls', 'lead', input.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['discovery-stats'] });
    },
    onError: (error) => {
      console.error('Failed to save discovery call:', error);
      toast.error('Failed to save call');
    },
  });
}

/** Claim a lead (mark as being worked) */
export function useClaimLead() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('leads')
        .update({
          currently_being_worked: true,
          work_started_at: new Date().toISOString(),
          last_attempted_by: profile?.name || user?.email || 'Unknown',
          last_attempted_by_id: user?.id,
        })
        .eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovery-queue'] });
    },
  });
}

/** Release a lead (unmark as being worked) */
export function useReleaseLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('leads')
        .update({
          currently_being_worked: false,
          work_started_at: null,
        })
        .eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovery-queue'] });
    },
  });
}
