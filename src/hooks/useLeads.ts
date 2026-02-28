import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { getClientIdFromAgentId } from './useLeadMetrics';

export interface Lead {
  id: string;
  lead_id: string;
  agent_id: string;
  lead_date: string | null;
  state: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  age: string | null;
  employment: string | null;
  interest: string | null;
  savings: string | null;
  investments: string | null;
  timezone: string | null;
  lead_source: string | null;
  status: string;
  notes: string | null;
  lead_data: Json;
  webhook_payload: Json | null;
  target_premium: number | null;
  submitted_premium: number | null;
  approved_premium: number | null;
  issued_premium: number | null;
  submitted_at: string | null;
  approved_at: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadInput {
  lead_id: string;
  agent_id: string;
  lead_date?: string;
  state?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  age?: string;
  employment?: string;
  interest?: string;
  savings?: string;
  investments?: string;
  timezone?: string;
  lead_source?: string;
  status?: string;
  notes?: string;
  lead_data?: Json;
}

// Lead status options
export const LEAD_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'booked call', label: 'Booked Call' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'issued paid', label: 'Issued Paid' },
];

// Fetch all leads for a specific agent
export function useLeadsByAgent(agentId?: string) {
  return useQuery({
    queryKey: ['leads', 'agent', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('agent_id', agentId!)
        .order('lead_date', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!agentId,
  });
}

// Fetch all leads (admin)
export function useAllLeads() {
  return useQuery({
    queryKey: ['leads', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('lead_date', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as Lead[];
    },
  });
}

// Create a single lead
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLeadInput) => {
      const { data, error } = await supabase
        .from('leads')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as Lead;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

// Bulk import leads
export function useBulkImportLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leads: CreateLeadInput[]) => {
      // Insert in batches of 100 to avoid timeouts
      const batchSize = 100;
      const results: Lead[] = [];
      
      for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('leads')
          .upsert(batch, { onConflict: 'lead_id', ignoreDuplicates: true })
          .select();

        if (error) throw error;
        if (data) results.push(...(data as Lead[]));
      }
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

// Update lead status - with automatic client metrics recalculation
export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      notes, 
      agentId,
      target_premium,
      issued_premium 
    }: { 
      id: string; 
      status: string; 
      notes?: string; 
      agentId?: string;
      target_premium?: number | null;
      issued_premium?: number | null;
    }) => {
      const updateData: Record<string, unknown> = { status };
      if (notes !== undefined) updateData.notes = notes;
      if (target_premium !== undefined) updateData.target_premium = target_premium;
      if (issued_premium !== undefined) updateData.issued_premium = issued_premium;

      const { data, error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Get the agent_id from the lead if not provided
      const leadAgentId = agentId || (data as Lead).agent_id;
      
      // Find the client and recalculate metrics
      if (leadAgentId) {
        const clientId = await getClientIdFromAgentId(leadAgentId);
        if (clientId) {
          await recalculateClientMetrics(clientId, leadAgentId);
        }
      }
      
      return data as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['lead-metrics'] });
    },
  });
}

// Update lead premium with auto-backfill logic
export function useUpdateLeadPremium() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      lead,
      target_premium,
      submitted_premium,
      approved_premium,
      issued_premium,
      agentId,
    }: { 
      lead: Lead;
      target_premium?: number | null;
      submitted_premium?: number | null;
      approved_premium?: number | null;
      issued_premium?: number | null;
      agentId?: string;
    }) => {
      const updateData: Record<string, unknown> = {};
      
      // Always update target_premium if provided
      if (target_premium !== undefined) {
        updateData.target_premium = target_premium;
        
        // Auto-backfill logic: If previous stage premiums are 0/null, fill them with the new value
        const status = lead.status.toLowerCase();
        
        if (target_premium && target_premium > 0) {
          // If we're on submitted or beyond, and submitted_premium is 0, fill it
          if (['submitted', 'approved', 'issued paid'].includes(status)) {
            if (!lead.submitted_premium || lead.submitted_premium === 0) {
              updateData.submitted_premium = target_premium;
            }
          }
          
          // If we're on approved or beyond, and approved_premium is 0, fill it
          if (['approved', 'issued paid'].includes(status)) {
            if (!lead.approved_premium || lead.approved_premium === 0) {
              updateData.approved_premium = target_premium;
            }
          }
          
          // If we're on issued paid, and issued_premium is 0, fill it
          if (status === 'issued paid') {
            if (!lead.issued_premium || lead.issued_premium === 0) {
              updateData.issued_premium = target_premium;
            }
          }
        }
      }
      
      // Also allow direct updates to other premium fields
      if (submitted_premium !== undefined) updateData.submitted_premium = submitted_premium;
      if (approved_premium !== undefined) updateData.approved_premium = approved_premium;
      if (issued_premium !== undefined) updateData.issued_premium = issued_premium;

      const { data, error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead.id)
        .select()
        .single();

      if (error) throw error;
      
      // Recalculate client metrics
      const leadAgentId = agentId || (data as Lead).agent_id;
      if (leadAgentId) {
        const clientId = await getClientIdFromAgentId(leadAgentId);
        if (clientId) {
          await recalculateClientMetrics(clientId, leadAgentId);
        }
      }
      
      return data as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['lead-metrics'] });
    },
  });
}

// Helper function to recalculate client metrics (now history-based)
async function recalculateClientMetrics(clientId: string, agentId: string) {
  // Get tracking_start_date from wallet
  const { data: wallet } = await supabase
    .from('client_wallets')
    .select('tracking_start_date')
    .eq('client_id', clientId)
    .maybeSingle();

  // Get leads from tracking_start_date with history timestamps
  let query = supabase
    .from('leads')
    .select('id, status, booked_call_at, submitted_at')
    .eq('agent_id', agentId);

  if (wallet?.tracking_start_date) {
    query = query.gte('lead_date', wallet.tracking_start_date);
  }

  const { data: leads } = await query;

  // Get ad spend
  let spendQuery = supabase
    .from('ad_spend_daily')
    .select('cost')
    .eq('client_id', clientId);

  if (wallet?.tracking_start_date) {
    spendQuery = spendQuery.gte('spend_date', wallet.tracking_start_date);
  }

  const { data: spendData } = await spendQuery;
  const trackedSpend = spendData?.reduce((sum, day) => sum + Number(day.cost || 0), 0) ?? 0;

  // History-based counts (won't decrease when lead moves to next stage)
  const totalLeads = leads?.length || 0;
  const bookedCalls = leads?.filter(l => l.booked_call_at !== null).length || 0;
  const submittedApps = leads?.filter(l => l.submitted_at !== null).length || 0;

  // Calculate metrics
  const cpl = totalLeads > 0 ? trackedSpend / totalLeads : 0;
  const cpbc = bookedCalls > 0 ? trackedSpend / bookedCalls : 0;

  // Update client record
  await supabase
    .from('clients')
    .update({
      mtd_leads: totalLeads,
      booked_calls: bookedCalls,
      applications: submittedApps,
      mtd_ad_spend: Math.round(trackedSpend * 100) / 100,
      cpl: Math.round(cpl * 100) / 100,
      cpba: Math.round(cpbc * 100) / 100, // Using cpba column for CPBC
    })
    .eq('id', clientId);
}

// Delete a lead
export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

// Get lead count by agent
export function useLeadCountByAgent(agentId?: string) {
  return useQuery({
    queryKey: ['leads', 'count', agentId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId!);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!agentId,
  });
}

// Remove test leads (leads with 'test' in first_name or last_name)
export function useRemoveTestLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentId: string) => {
      // First get the count of test leads
      const { data: testLeads, error: fetchError } = await supabase
        .from('leads')
        .select('id')
        .eq('agent_id', agentId)
        .or('first_name.ilike.%test%,last_name.ilike.%test%');

      if (fetchError) throw fetchError;
      
      const count = testLeads?.length || 0;
      if (count === 0) return 0;

      // Delete test leads
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('agent_id', agentId)
        .or('first_name.ilike.%test%,last_name.ilike.%test%');

      if (error) throw error;
      
      // Recalculate metrics after deletion
      const clientId = await getClientIdFromAgentId(agentId);
      if (clientId) {
        await recalculateClientMetrics(clientId, agentId);
      }

      return count;
    },
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['lead-metrics'] });
      return deletedCount;
    },
  });
}
