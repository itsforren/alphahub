import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, eachDayOfInterval, startOfDay } from 'date-fns';

export interface DailyMetric {
  date: string;
  leads: number;
  booked: number;
  submitted: number;
  approved: number;
  issued: number;
}

export interface ClientSuccessMetrics {
  // Funnel metrics
  totalLeads: number;
  totalBookedCalls: number;
  bookedRate: number;
  totalSubmittedApps: number;
  submissionRate: number;
  totalApprovedPolicies: number;
  approvalRate: number;
  totalIssuedPaid: number;
  issuedPaidRate: number;
  
  // Premium & Commission
  totalIssuedPremium: number;
  totalIssuedCommissions: number;
  
  // Cost metrics
  cpbc: number;
  cpsa: number;
  cpIssuedPaid: number;
  totalAdSpend: number;
  
  // Leaderboards
  topReferringAgents: AgentRank[];
  topAgentsByLeadVolume: AgentRank[];
  topAgentsByBookedCalls: AgentRank[];
  topAgentsByIssuedPremium: AgentRank[];
  topAgentsByLowestCPL: AgentRank[];
  
  // Top Producers (commission-based)
  topProducers: TopProducer[];

  // Referral totals
  totalReferrals: number;
  referralCreditsGenerated: number;
  
  // Daily trend data
  dailyMetrics: DailyMetric[];
  
  // Metadata
  lastUpdated: Date;
}

export interface AgentRank {
  id: string;
  name: string;
  value: number;
  rank: number;
}

export interface TopProducer {
  id: string;
  name: string;
  rank: number;
  submittedPremium: number;
  incomingCommissions: number;
  paidCommissions: number;
  avgCommissionSize: number;
}

export function useClientSuccessData() {
  return useQuery({
    queryKey: ['client-success-data'],
    queryFn: async (): Promise<ClientSuccessMetrics> => {
      // Rolling 30 days
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      // Fetch ONLY ROUTED leads (webhook_payload IS NOT NULL) for last 30 days
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, agent_id, status, booked_call_at, submitted_premium, approved_premium, issued_premium, created_at')
        .gte('created_at', thirtyDaysAgo)
        .not('webhook_payload', 'is', null);

      // Fetch ALL-TIME leads for top producers leaderboard
      const { data: allTimeLeadsData, error: allTimeLeadsError } = await supabase
        .from('leads')
        .select('id, agent_id, status, submitted_premium, issued_premium')
        .not('webhook_payload', 'is', null);

      if (allTimeLeadsError) throw allTimeLeadsError;
      
      if (leadsError) throw leadsError;
      
      // Fetch clients for agent names and commission rates
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, agent_id, name, commission_contract_percent')
        .eq('status', 'active');
      
      if (clientsError) throw clientsError;
      
      // Fetch ad spend rolling 30 days
      const { data: adSpendData, error: adSpendError } = await supabase
        .from('ad_spend_daily')
        .select('client_id, cost')
        .gte('spend_date', thirtyDaysAgo);
      
      if (adSpendError) throw adSpendError;
      
      // Fetch referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('id, referrer_client_id, status, created_at')
        .gte('created_at', thirtyDaysAgo);
      
      if (referralsError) throw referralsError;
      
      // Fetch referral rewards
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('referral_rewards')
        .select('id, referrer_client_id, amount, status')
        .gte('created_at', thirtyDaysAgo);
      
      if (rewardsError) throw rewardsError;
      
      const leads = leadsData || [];
      const allTimeLeads = allTimeLeadsData || [];
      const clients = clientsData || [];
      const adSpend = adSpendData || [];
      const referrals = referralsData || [];
      const rewards = rewardsData || [];

      // Create client lookup by agent_id (since leads use agent_id)
      const clientByAgentId = new Map(clients.map(c => [c.agent_id, c]));
      const clientById = new Map(clients.map(c => [c.id, c]));

      // Calculate funnel metrics
      const totalLeads = leads.length;
      const bookedLeads = leads.filter(l => l.booked_call_at !== null);
      const totalBookedCalls = bookedLeads.length;
      const bookedRate = totalLeads > 0 ? (totalBookedCalls / totalLeads) * 100 : 0;
      
      const submittedLeads = leads.filter(l => 
        l.status === 'submitted' || l.status === 'approved' || l.status === 'issued paid'
      );
      const totalSubmittedApps = submittedLeads.length;
      const submissionRate = totalLeads > 0 ? (totalSubmittedApps / totalLeads) * 100 : 0;
      
      const approvedLeads = leads.filter(l => 
        l.status === 'approved' || l.status === 'issued paid'
      );
      const totalApprovedPolicies = approvedLeads.length;
      const approvalRate = totalSubmittedApps > 0 ? (totalApprovedPolicies / totalSubmittedApps) * 100 : 0;
      
      const issuedPaidLeads = leads.filter(l => l.status === 'issued paid');
      const totalIssuedPaid = issuedPaidLeads.length;
      const issuedPaidRate = totalApprovedPolicies > 0 ? (totalIssuedPaid / totalApprovedPolicies) * 100 : 0;
      
      // Calculate premium totals
      const totalIssuedPremium = issuedPaidLeads.reduce((sum, l) => sum + (l.issued_premium || 0), 0);
      
      // Calculate issued commissions (based on issued premium × commission rate)
      let totalIssuedCommissions = 0;
      issuedPaidLeads.forEach(lead => {
        const client = clientByAgentId.get(lead.agent_id);
        if (client && client.commission_contract_percent) {
          totalIssuedCommissions += (lead.issued_premium || 0) * (client.commission_contract_percent / 100);
        }
      });
      
      // Calculate total ad spend
      const totalAdSpend = adSpend.reduce((sum, s) => sum + (s.cost || 0), 0);
      
      // Calculate cost metrics
      const cpbc = totalBookedCalls > 0 ? totalAdSpend / totalBookedCalls : 0;
      const cpsa = totalSubmittedApps > 0 ? totalAdSpend / totalSubmittedApps : 0;
      const cpIssuedPaid = totalIssuedPaid > 0 ? totalAdSpend / totalIssuedPaid : 0;
      
      // Calculate referral metrics
      const totalReferrals = referrals.length;
      const referralCreditsGenerated = rewards
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      
      // Build leaderboards by agent_id
      const leadsByAgent = new Map<string, number>();
      leads.forEach(l => {
        if (l.agent_id) {
          leadsByAgent.set(l.agent_id, (leadsByAgent.get(l.agent_id) || 0) + 1);
        }
      });
      
      // Booked calls by agent
      const bookedByAgent = new Map<string, number>();
      bookedLeads.forEach(l => {
        if (l.agent_id) {
          bookedByAgent.set(l.agent_id, (bookedByAgent.get(l.agent_id) || 0) + 1);
        }
      });
      
      // Issued premium by agent
      const premiumByAgent = new Map<string, number>();
      issuedPaidLeads.forEach(l => {
        if (l.agent_id) {
          premiumByAgent.set(l.agent_id, (premiumByAgent.get(l.agent_id) || 0) + (l.issued_premium || 0));
        }
      });
      
      // Ad spend by client for CPL calculation (need to map agent_id to client_id)
      const spendByAgent = new Map<string, number>();
      adSpend.forEach(s => {
        const client = clientById.get(s.client_id);
        if (client?.agent_id) {
          spendByAgent.set(client.agent_id, (spendByAgent.get(client.agent_id) || 0) + (s.cost || 0));
        }
      });
      
      // Referrals by client
      const referralsByClient = new Map<string, number>();
      referrals.forEach(r => {
        if (r.referrer_client_id) {
          referralsByClient.set(r.referrer_client_id, (referralsByClient.get(r.referrer_client_id) || 0) + 1);
        }
      });
      
      // Helper to build ranked list by agent_id - FILTER OUT "Unknown" entries
      const buildAgentRanking = (dataMap: Map<string, number>, ascending = false): AgentRank[] => {
        const entries = Array.from(dataMap.entries())
          .map(([agentId, value]) => {
            const client = clientByAgentId.get(agentId);
            // Skip if no client found or name is empty
            if (!client?.name) return null;
            return {
              id: client.id || agentId,
              name: client.name.split(' ')[0], // First name only for cleaner display
              value,
              rank: 0
            };
          })
          .filter((e): e is AgentRank => e !== null && e.value > 0)
          .sort((a, b) => ascending ? a.value - b.value : b.value - a.value)
          .slice(0, 5); // Only top 5
        
        entries.forEach((e, i) => e.rank = i + 1);
        return entries;
      };
      
      // Helper to build ranked list by client_id - FILTER OUT "Unknown" entries
      const buildClientRanking = (dataMap: Map<string, number>, ascending = false): AgentRank[] => {
        const entries = Array.from(dataMap.entries())
          .map(([clientId, value]) => {
            const client = clientById.get(clientId);
            // Skip if no client found or name is empty
            if (!client?.name) return null;
            return {
              id: clientId,
              name: client.name.split(' ')[0], // First name only for cleaner display
              value,
              rank: 0
            };
          })
          .filter((e): e is AgentRank => e !== null && e.value > 0)
          .sort((a, b) => ascending ? a.value - b.value : b.value - a.value)
          .slice(0, 5); // Only top 5
        
        entries.forEach((e, i) => e.rank = i + 1);
        return entries;
      };
      
      // Calculate CPL by agent (only for agents with both spend and leads)
      const cplByAgent = new Map<string, number>();
      leadsByAgent.forEach((leadCount, agentId) => {
        const spend = spendByAgent.get(agentId) || 0;
        if (spend > 0 && leadCount > 0) {
          cplByAgent.set(agentId, spend / leadCount);
        }
      });
      
      // Build top producers (commission-based, ranked by paid commissions, all-time)
      const submittedPremByAgent = new Map<string, number>();
      const incomingCommByAgent = new Map<string, number>();
      const paidCommByAgent = new Map<string, number>();
      const submittedCountByAgent = new Map<string, number>();

      const allSubmittedLeads = allTimeLeads.filter(l =>
        l.status === 'submitted' || l.status === 'approved' || l.status === 'issued paid'
      );
      const allIssuedPaidLeads = allTimeLeads.filter(l => l.status === 'issued paid');

      // Submitted premium (raw) + incoming commissions (premium × rate)
      allSubmittedLeads.forEach(lead => {
        if (!lead.agent_id) return;
        const client = clientByAgentId.get(lead.agent_id);
        const rate = (client?.commission_contract_percent ?? 0) / 100;
        const premium = lead.submitted_premium || 0;
        submittedPremByAgent.set(lead.agent_id, (submittedPremByAgent.get(lead.agent_id) || 0) + premium);
        incomingCommByAgent.set(lead.agent_id, (incomingCommByAgent.get(lead.agent_id) || 0) + premium * rate);
        submittedCountByAgent.set(lead.agent_id, (submittedCountByAgent.get(lead.agent_id) || 0) + 1);
      });

      // Paid = issued-paid leads × commission rate
      allIssuedPaidLeads.forEach(lead => {
        if (!lead.agent_id) return;
        const client = clientByAgentId.get(lead.agent_id);
        const rate = (client?.commission_contract_percent ?? 0) / 100;
        const premium = lead.issued_premium || 0;
        paidCommByAgent.set(lead.agent_id, (paidCommByAgent.get(lead.agent_id) || 0) + premium * rate);
      });

      // Combine into TopProducer[], rank by paidCommissions desc, top 3
      const allAgentIds = new Set([...incomingCommByAgent.keys(), ...paidCommByAgent.keys()]);
      const topProducers: TopProducer[] = Array.from(allAgentIds)
        .map(agentId => {
          const client = clientByAgentId.get(agentId);
          if (!client?.name) return null;
          const submitted = submittedPremByAgent.get(agentId) || 0;
          const incoming = incomingCommByAgent.get(agentId) || 0;
          const paid = paidCommByAgent.get(agentId) || 0;
          const count = submittedCountByAgent.get(agentId) || 0;
          return {
            id: client.id || agentId,
            name: client.name.split(' ')[0],
            rank: 0,
            submittedPremium: submitted,
            incomingCommissions: incoming,
            paidCommissions: paid,
            avgCommissionSize: count > 0 ? incoming / count : 0,
          };
        })
        .filter((p): p is TopProducer => p !== null && (p.paidCommissions > 0 || p.incomingCommissions > 0))
        .sort((a, b) => b.paidCommissions - a.paidCommissions)
        .slice(0, 3);

      topProducers.forEach((p, i) => p.rank = i + 1);

      // Build daily metrics for the chart
      const today = startOfDay(new Date());
      const thirtyDaysAgoDate = subDays(today, 29);
      const dateRange = eachDayOfInterval({ start: thirtyDaysAgoDate, end: today });
      
      const dailyMetrics: DailyMetric[] = dateRange.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
        
        // Count leads created on this day
        const dayLeads = leads.filter(l => {
          const created = new Date(l.created_at);
          return created >= dayStart && created <= dayEnd;
        }).length;
        
        // Count booked calls on this day
        const dayBooked = leads.filter(l => {
          if (!l.booked_call_at) return false;
          const booked = new Date(l.booked_call_at);
          return booked >= dayStart && booked <= dayEnd;
        }).length;
        
        // Count submitted apps on this day (using status and approximating by created_at for submitted)
        const daySubmitted = leads.filter(l => {
          if (!['submitted', 'approved', 'issued paid'].includes(l.status || '')) return false;
          // We use submitted_premium as a proxy - if they have it, count by created_at
          if (!l.submitted_premium) return false;
          const created = new Date(l.created_at);
          return created >= dayStart && created <= dayEnd;
        }).length;
        
        // Count approved on this day
        const dayApproved = leads.filter(l => {
          if (!['approved', 'issued paid'].includes(l.status || '')) return false;
          if (!l.approved_premium) return false;
          const created = new Date(l.created_at);
          return created >= dayStart && created <= dayEnd;
        }).length;
        
        // Count issued paid on this day
        const dayIssued = leads.filter(l => {
          if (l.status !== 'issued paid') return false;
          const created = new Date(l.created_at);
          return created >= dayStart && created <= dayEnd;
        }).length;
        
        return {
          date: dayStr,
          leads: dayLeads,
          booked: dayBooked,
          submitted: daySubmitted,
          approved: dayApproved,
          issued: dayIssued,
        };
      });

      return {
        totalLeads,
        totalBookedCalls,
        bookedRate,
        totalSubmittedApps,
        submissionRate,
        totalApprovedPolicies,
        approvalRate,
        totalIssuedPaid,
        issuedPaidRate,
        totalIssuedPremium,
        totalIssuedCommissions,
        cpbc,
        cpsa,
        cpIssuedPaid,
        totalAdSpend,
        topReferringAgents: buildClientRanking(referralsByClient),
        topAgentsByLeadVolume: buildAgentRanking(leadsByAgent),
        topAgentsByBookedCalls: buildAgentRanking(bookedByAgent),
        topAgentsByIssuedPremium: buildAgentRanking(premiumByAgent),
        topAgentsByLowestCPL: buildAgentRanking(cplByAgent, true),
        topProducers,
        totalReferrals,
        referralCreditsGenerated,
        dailyMetrics,
        lastUpdated: new Date(),
      };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
