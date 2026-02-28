import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RouterStatus {
  clientId: string;
  clientName: string;
  agentId: string | null;
  subaccountId: string | null;
  ghlUserId: string | null;
  crmDeliveryEnabled: boolean;
  status: 'ready' | 'partial' | 'not_ready' | 'disabled';
  issues: string[];
  leadCount: number;
  deliveredCount: number;
  failedCount: number;
}

interface ClientData {
  id: string;
  name: string;
  agent_id: string | null;
  subaccount_id: string | null;
  ghl_user_id: string | null;
  crm_delivery_enabled: boolean | null;
  status: string;
}

export function useRouterStatus() {
  return useQuery({
    queryKey: ['router-status'],
    queryFn: async () => {
      // Get all clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, agent_id, subaccount_id, ghl_user_id, status')
        .eq('status', 'active');

      if (clientsError) throw clientsError;

      // Cast to include potential crm_delivery_enabled field
      const clientsWithCrm = clients as unknown as ClientData[];

      // Get lead counts per agent
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('agent_id, delivery_status');

      if (leadsError) throw leadsError;

      // Aggregate lead counts
      const leadCounts: Record<string, { total: number; delivered: number; failed: number }> = {};
      for (const lead of leads || []) {
        if (!lead.agent_id) continue;
        if (!leadCounts[lead.agent_id]) {
          leadCounts[lead.agent_id] = { total: 0, delivered: 0, failed: 0 };
        }
        leadCounts[lead.agent_id].total++;
        if (lead.delivery_status === 'delivered') {
          leadCounts[lead.agent_id].delivered++;
        } else if (lead.delivery_status === 'failed' || lead.delivery_status === 'failed_permanent') {
          leadCounts[lead.agent_id].failed++;
        }
      }

      // Build router status for each client
      const statuses: RouterStatus[] = (clientsWithCrm || []).map(client => {
        const issues: string[] = [];
        
        if (!client.agent_id) issues.push('Missing Agent ID');
        if (!client.subaccount_id) issues.push('Missing Subaccount ID');
        if (!client.ghl_user_id) issues.push('Missing GHL User ID');
        
        const crmEnabled = client.crm_delivery_enabled !== false;
        
        let status: RouterStatus['status'] = 'ready';
        if (!crmEnabled) {
          status = 'disabled';
        } else if (!client.agent_id || !client.subaccount_id) {
          status = 'not_ready';
        } else if (!client.ghl_user_id) {
          status = 'partial';
        }

        const counts = client.agent_id ? leadCounts[client.agent_id] : null;

        return {
          clientId: client.id,
          clientName: client.name,
          agentId: client.agent_id,
          subaccountId: client.subaccount_id,
          ghlUserId: client.ghl_user_id,
          crmDeliveryEnabled: crmEnabled,
          status,
          issues,
          leadCount: counts?.total || 0,
          deliveredCount: counts?.delivered || 0,
          failedCount: counts?.failed || 0,
        };
      });

      // Sort: not_ready first, then partial, then ready
      statuses.sort((a, b) => {
        const order = { not_ready: 0, partial: 1, disabled: 2, ready: 3 };
        return order[a.status] - order[b.status];
      });

      return statuses;
    },
  });
}
