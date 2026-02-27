import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeadStats {
  totalLeads: number;
  deliveredLeads: number;
  failedLeads: number;
  pendingLeads: number;
  deliverySuccessRate: number;
  
  // Funnel stats
  newLeads: number;
  bookedCalls: number;
  applications: number;
  issuedPaid: number;
  
  // Premium stats
  totalTargetPremium: number;
  totalIssuedPremium: number;
}

export interface LeadWithDetails {
  id: string;
  lead_id: string;
  agent_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  state: string | null;
  status: string | null;
  lead_source: string | null;
  delivery_status: string | null;
  delivery_error: string | null;
  delivery_attempts: number | null;
  delivered_at: string | null;
  ghl_contact_id: string | null;
  created_at: string | null;
  target_premium: number | null;
  issued_premium: number | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  gclid: string | null;
  client_name?: string;
}

export interface AgentPerformance {
  agent_id: string;
  client_name: string;
  total_leads: number;
  booked_calls: number;
  applications: number;
  issued_paid: number;
  total_target_premium: number;
  total_issued_premium: number;
  delivery_success_rate: number;
}

interface LeadStatsFilters {
  startDate?: string;
  endDate?: string;
  agentId?: string;
  status?: string;
  deliveryStatus?: string;
  source?: string;
}

export function useLeadStats(filters?: LeadStatsFilters) {
  return useQuery({
    queryKey: ['lead-stats', filters],
    queryFn: async (): Promise<LeadStats> => {
      let query = supabase.from('leads').select('*', { count: 'exact' });

      // Apply date filters
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.agentId) {
        query = query.eq('agent_id', filters.agentId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.deliveryStatus) {
        query = query.eq('delivery_status', filters.deliveryStatus);
      }
      if (filters?.source) {
        query = query.eq('lead_source', filters.source);
      }

      const { data: leads, count, error } = await query;

      if (error) throw error;

      const totalLeads = count || 0;
      const deliveredLeads = leads?.filter(l => l.delivery_status === 'delivered').length || 0;
      const failedLeads = leads?.filter(l => ['failed', 'failed_permanent'].includes(l.delivery_status || '')).length || 0;
      const pendingLeads = leads?.filter(l => ['pending', 'retrying'].includes(l.delivery_status || '')).length || 0;
      
      const newLeads = leads?.filter(l => l.status === 'new').length || 0;
      const bookedCalls = leads?.filter(l => ['booked call', 'booked_call', 'rescheduled', 'no_show'].includes(l.status || '')).length || 0;
      const applications = leads?.filter(l => ['submitted', 'approved'].includes(l.status || '')).length || 0;
      const issuedPaid = leads?.filter(l => l.status === 'issued paid').length || 0;

      const totalTargetPremium = leads?.reduce((sum, l) => sum + (Number(l.target_premium) || 0), 0) || 0;
      const totalIssuedPremium = leads?.reduce((sum, l) => sum + (Number(l.issued_premium) || 0), 0) || 0;

      return {
        totalLeads,
        deliveredLeads,
        failedLeads,
        pendingLeads,
        deliverySuccessRate: totalLeads > 0 ? (deliveredLeads / totalLeads) * 100 : 0,
        newLeads,
        bookedCalls,
        applications,
        issuedPaid,
        totalTargetPremium,
        totalIssuedPremium,
      };
    },
  });
}

export function useLeadsWithFilters(filters?: LeadStatsFilters) {
  return useQuery({
    queryKey: ['leads-filtered', filters],
    queryFn: async (): Promise<LeadWithDetails[]> => {
      // First get leads
      let query = supabase.from('leads').select('*').order('created_at', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.agentId) {
        query = query.eq('agent_id', filters.agentId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.deliveryStatus) {
        query = query.eq('delivery_status', filters.deliveryStatus);
      }
      if (filters?.source) {
        query = query.eq('lead_source', filters.source);
      }

      const { data: leads, error } = await query.limit(500);
      if (error) throw error;

      // Get client names
      const { data: clients } = await supabase.from('clients').select('agent_id, name');
      const clientMap = new Map(clients?.map(c => [c.agent_id, c.name]) || []);

      return (leads || []).map(lead => ({
        ...lead,
        client_name: clientMap.get(lead.agent_id) || 'Unknown',
      }));
    },
  });
}

export function useAgentPerformance(filters?: LeadStatsFilters) {
  return useQuery({
    queryKey: ['agent-performance', filters],
    queryFn: async (): Promise<AgentPerformance[]> => {
      // Get all leads
      let query = supabase.from('leads').select('*');

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data: leads, error } = await query;
      if (error) throw error;

      // Get clients
      const { data: clients } = await supabase.from('clients').select('agent_id, name');
      const clientMap = new Map(clients?.map(c => [c.agent_id, c.name]) || []);

      // Group by agent
      const agentStats = new Map<string, AgentPerformance>();

      for (const lead of leads || []) {
        const existing = agentStats.get(lead.agent_id) || {
          agent_id: lead.agent_id,
          client_name: clientMap.get(lead.agent_id) || 'Unknown',
          total_leads: 0,
          booked_calls: 0,
          applications: 0,
          issued_paid: 0,
          total_target_premium: 0,
          total_issued_premium: 0,
          delivery_success_rate: 0,
        };

        existing.total_leads++;
        if (lead.delivery_status === 'delivered') existing.delivery_success_rate++;
        
        if (['booked call', 'booked_call', 'rescheduled', 'no_show'].includes(lead.status || '')) {
          existing.booked_calls++;
        }
        if (['submitted', 'approved'].includes(lead.status || '')) {
          existing.applications++;
        }
        if (lead.status === 'issued paid') {
          existing.issued_paid++;
        }
        
        existing.total_target_premium += Number(lead.target_premium) || 0;
        existing.total_issued_premium += Number(lead.issued_premium) || 0;

        agentStats.set(lead.agent_id, existing);
      }

      // Calculate delivery success rate as percentage
      const results = Array.from(agentStats.values()).map(agent => ({
        ...agent,
        delivery_success_rate: agent.total_leads > 0 
          ? (agent.delivery_success_rate / agent.total_leads) * 100 
          : 0,
      }));

      return results.sort((a, b) => b.total_leads - a.total_leads);
    },
  });
}

export function useLeadDeliveryLogs(leadId?: string) {
  return useQuery({
    queryKey: ['lead-delivery-logs', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('lead_delivery_logs')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });
}

export function useUniqueLeadSources() {
  return useQuery({
    queryKey: ['unique-lead-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('lead_source')
        .not('lead_source', 'is', null);

      if (error) throw error;

      const sources = new Set(data?.map(l => l.lead_source).filter(Boolean) || []);
      return Array.from(sources).sort();
    },
  });
}
