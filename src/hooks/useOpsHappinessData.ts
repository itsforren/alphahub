import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInMinutes, differenceInHours, differenceInDays, subDays, format, startOfMonth } from 'date-fns';

export interface OpsHappinessMetrics {
  // Row 1: The Hole in the Bucket
  churnCount: number; // Clients lost MTD
  churnPercent: number; // Annualized
  netClientGrowth: number; // New - Churned
  
  // Row 2: Speed (SLA)
  avgFirstResponseMinutes: number;
  avgResolutionHours: number;
  firstResponseBreached: boolean; // > 1 hour
  resolutionBreached: boolean; // > 24 hours
  
  // Row 3: Onboarding
  stuckClientCount: number;
  stuckClients: Array<{ id: string; clientName: string; daysStuck: number }>;
}

export function useOpsHappinessData() {
  return useQuery({
    queryKey: ['tv-ops-happiness-data'],
    queryFn: async (): Promise<OpsHappinessMetrics> => {
      const now = new Date();
      const sevenDaysAgo = format(subDays(now, 7), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      
      // Fetch chat messages for SLA calculation
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('conversation_id, sender_role, created_at')
        .gte('created_at', sevenDaysAgo)
        .order('created_at');
      
      // Fetch support tickets for resolution time
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('*')
        .gte('created_at', sevenDaysAgo);
      
      // Fetch clients for churn calculation (use deleted_at for soft-deletes, is_archived for status)
      const { data: allClients } = await supabase
        .from('clients')
        .select('id, name, deleted_at, created_at, onboarding_status, automation_started_at');
      
      // Calculate churn (deleted clients this month)
      const churnedThisMonth = allClients?.filter(c => 
        c.deleted_at && 
        format(new Date(c.deleted_at), 'yyyy-MM') === format(now, 'yyyy-MM')
      ) || [];
      const churnCount = churnedThisMonth.length;
      
      // New clients this month
      const newThisMonth = allClients?.filter(c => 
        c.created_at && 
        format(new Date(c.created_at), 'yyyy-MM') === format(now, 'yyyy-MM')
      ) || [];
      
      const netClientGrowth = newThisMonth.length - churnCount;
      
      // Annualized churn % (monthly churn * 12 / total active clients)
      const activeClients = allClients?.filter(c => !c.deleted_at) || [];
      const monthlyChurnRate = activeClients.length > 0 ? (churnCount / activeClients.length) * 100 : 0;
      const churnPercent = monthlyChurnRate * 12;
      
      // Calculate first response times
      const conversationFirstResponses: number[] = [];
      const groupedByConversation = new Map<string, Array<{ role: string; time: Date }>>();
      
      messages?.forEach(msg => {
        if (!groupedByConversation.has(msg.conversation_id)) {
          groupedByConversation.set(msg.conversation_id, []);
        }
        groupedByConversation.get(msg.conversation_id)?.push({
          role: msg.sender_role,
          time: new Date(msg.created_at),
        });
      });
      
      groupedByConversation.forEach(msgs => {
        const sorted = msgs.sort((a, b) => a.time.getTime() - b.time.getTime());
        const firstClient = sorted.find(m => m.role === 'client');
        const firstAdmin = sorted.find(m => m.role === 'admin' && firstClient && m.time > firstClient.time);
        if (firstClient && firstAdmin) {
          conversationFirstResponses.push(differenceInMinutes(firstAdmin.time, firstClient.time));
        }
      });
      
      const avgFirstResponseMinutes = conversationFirstResponses.length > 0
        ? conversationFirstResponses.reduce((a, b) => a + b, 0) / conversationFirstResponses.length
        : 0;
      
      // Resolution time
      const resolvedTickets = tickets?.filter(t => t.status === 'resolved' && t.resolved_at) || [];
      const resolutionTimes = resolvedTickets.map(t => differenceInHours(new Date(t.resolved_at!), new Date(t.created_at)));
      const avgResolutionHours = resolutionTimes.length > 0 
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length 
        : 0;
      
      // SLA breaches (NEW thresholds: 1h response, 24h resolution)
      const firstResponseBreached = avgFirstResponseMinutes > 60; // 1 hour = 60 minutes
      const resolutionBreached = avgResolutionHours > 24;
      
      // Stuck clients: in setup/onboarding for > 3 days (use onboarding_status enum)
      const stuckClients = activeClients
        .filter(c => {
          if (!c.automation_started_at) return false;
          const status = c.onboarding_status?.toLowerCase() || '';
          const isInSetup = status === 'pending' || status === 'in_progress';
          if (!isInSetup) return false;
          const daysInStage = differenceInDays(now, new Date(c.automation_started_at));
          return daysInStage > 3;
        })
        .map(c => ({
          id: c.id,
          clientName: c.name || 'Unknown',
          daysStuck: differenceInDays(now, new Date(c.automation_started_at!)),
        }))
        .sort((a, b) => b.daysStuck - a.daysStuck)
        .slice(0, 5);
      
      return {
        churnCount,
        churnPercent,
        netClientGrowth,
        avgFirstResponseMinutes,
        avgResolutionHours,
        firstResponseBreached,
        resolutionBreached,
        stuckClientCount: stuckClients.length,
        stuckClients,
      };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
