import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format, subDays, parseISO } from 'date-fns';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface AccountWideMetrics {
  // Ad Spend Metrics
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  avgCTR: number;
  avgCVR: number;
  avgCostPerConversion: number;
  
  // Funnel Metrics
  totalLeads: number;
  bookedCalls: number;
  submittedApps: number;
  approvedApps: number;
  issuedPaid: number;
  
  // Cost Per Metrics
  cpl: number;
  cpba: number;
  cpSubmitted: number;
  cpApproved: number;
  cpIssuedPaid: number;
  
  // Premium Metrics
  totalTargetPremium: number;
  totalSubmittedPremium: number;
  totalApprovedPremium: number;
  totalIssuedPremium: number;
}

export interface DailySpendData {
  date: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
}

export interface ClientSpendData {
  clientId: string;
  clientName: string;
  totalSpend: number;
  totalLeads: number;
  bookedCalls: number;
  submittedApps: number;
  issuedPaid: number;
  cpl: number;
  cpba: number;
  targetPremium: number;
  issuedPremium: number;
}

const FUNNEL_ORDER = ['new', 'contacted', 'booked', 'showed', 'submitted', 'approved', 'issued_paid'];

function getStatusIndex(status: string): number {
  return FUNNEL_ORDER.indexOf(status?.toLowerCase() || 'new');
}

function isAtOrBeyond(currentStatus: string, targetStatus: string): boolean {
  return getStatusIndex(currentStatus) >= getStatusIndex(targetStatus);
}

export function useAccountWideMetrics(dateRange: DateRange) {
  return useQuery({
    queryKey: ['account-wide-metrics', dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<AccountWideMetrics> => {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');
      
      // Fetch ad spend and leads data in parallel
      const [adSpendResult, leadsResult] = await Promise.all([
        supabase
          .from('ad_spend_daily')
          .select('cost, impressions, clicks, conversions')
          .gte('spend_date', fromDate)
          .lte('spend_date', toDate),
        supabase
          .from('leads')
          .select('status, target_premium, submitted_premium, approved_premium, issued_premium, created_at')
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
      ]);
      
      if (adSpendResult.error) throw adSpendResult.error;
      if (leadsResult.error) throw leadsResult.error;
      
      const adSpendData = adSpendResult.data;
      const leadsData = leadsResult.data;
      
      // Calculate ad spend metrics
      const totalSpend = adSpendData?.reduce((sum, row) => sum + (Number(row.cost) || 0), 0) || 0;
      const totalImpressions = adSpendData?.reduce((sum, row) => sum + (Number(row.impressions) || 0), 0) || 0;
      const totalClicks = adSpendData?.reduce((sum, row) => sum + (Number(row.clicks) || 0), 0) || 0;
      const totalConversions = adSpendData?.reduce((sum, row) => sum + (Number(row.conversions) || 0), 0) || 0;
      
      const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgCVR = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
      const avgCostPerConversion = totalConversions > 0 ? totalSpend / totalConversions : 0;
      
      // Calculate funnel metrics
      const totalLeads = leadsData?.length || 0;
      const bookedCalls = leadsData?.filter(l => isAtOrBeyond(l.status || 'new', 'booked')).length || 0;
      const submittedApps = leadsData?.filter(l => isAtOrBeyond(l.status || 'new', 'submitted')).length || 0;
      const approvedApps = leadsData?.filter(l => isAtOrBeyond(l.status || 'new', 'approved')).length || 0;
      const issuedPaid = leadsData?.filter(l => isAtOrBeyond(l.status || 'new', 'issued_paid')).length || 0;
      
      // Calculate cost per metrics
      const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
      const cpba = bookedCalls > 0 ? totalSpend / bookedCalls : 0;
      const cpSubmitted = submittedApps > 0 ? totalSpend / submittedApps : 0;
      const cpApproved = approvedApps > 0 ? totalSpend / approvedApps : 0;
      const cpIssuedPaid = issuedPaid > 0 ? totalSpend / issuedPaid : 0;
      
      // Calculate premium metrics
      const totalTargetPremium = leadsData?.reduce((sum, l) => sum + (Number(l.target_premium) || 0), 0) || 0;
      const totalSubmittedPremium = leadsData?.reduce((sum, l) => sum + (Number(l.submitted_premium) || 0), 0) || 0;
      const totalApprovedPremium = leadsData?.reduce((sum, l) => sum + (Number(l.approved_premium) || 0), 0) || 0;
      const totalIssuedPremium = leadsData?.reduce((sum, l) => sum + (Number(l.issued_premium) || 0), 0) || 0;
      
      return {
        totalSpend,
        totalImpressions,
        totalClicks,
        totalConversions,
        avgCTR,
        avgCVR,
        avgCostPerConversion,
        totalLeads,
        bookedCalls,
        submittedApps,
        approvedApps,
        issuedPaid,
        cpl,
        cpba,
        cpSubmitted,
        cpApproved,
        cpIssuedPaid,
        totalTargetPremium,
        totalSubmittedPremium,
        totalApprovedPremium,
        totalIssuedPremium,
      };
    },
  });
}

export function useDailySpendData(dateRange: DateRange) {
  return useQuery({
    queryKey: ['daily-spend-data', dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<DailySpendData[]> => {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('ad_spend_daily')
        .select('spend_date, cost, clicks, impressions, conversions')
        .gte('spend_date', fromDate)
        .lte('spend_date', toDate)
        .order('spend_date', { ascending: true });
      
      if (error) throw error;
      
      // Aggregate by date
      const byDate: Record<string, DailySpendData> = {};
      
      data?.forEach(row => {
        const date = row.spend_date;
        if (!byDate[date]) {
          byDate[date] = { date, spend: 0, clicks: 0, impressions: 0, conversions: 0 };
        }
        byDate[date].spend += Number(row.cost) || 0;
        byDate[date].clicks += Number(row.clicks) || 0;
        byDate[date].impressions += Number(row.impressions) || 0;
        byDate[date].conversions += Number(row.conversions) || 0;
      });
      
      return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    },
  });
}

export function useClientSpendData(dateRange: DateRange) {
  return useQuery({
    queryKey: ['client-spend-data', dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<ClientSpendData[]> => {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');
      
      // Fetch all data in parallel
      const [clientsResult, adSpendResult, leadsResult] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name, agent_id')
          .eq('status', 'active'),
        supabase
          .from('ad_spend_daily')
          .select('client_id, cost')
          .gte('spend_date', fromDate)
          .lte('spend_date', toDate),
        supabase
          .from('leads')
          .select('agent_id, status, target_premium, issued_premium, created_at')
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
      ]);
      
      if (clientsResult.error) throw clientsResult.error;
      if (adSpendResult.error) throw adSpendResult.error;
      if (leadsResult.error) throw leadsResult.error;
      
      const clients = clientsResult.data;
      const adSpendData = adSpendResult.data;
      const leadsData = leadsResult.data;
      
      // Aggregate by client
      const clientMetrics: Record<string, ClientSpendData> = {};
      
      clients?.forEach(client => {
        clientMetrics[client.id] = {
          clientId: client.id,
          clientName: client.name,
          totalSpend: 0,
          totalLeads: 0,
          bookedCalls: 0,
          submittedApps: 0,
          issuedPaid: 0,
          cpl: 0,
          cpba: 0,
          targetPremium: 0,
          issuedPremium: 0,
        };
      });
      
      // Sum ad spend per client
      adSpendData?.forEach(row => {
        if (clientMetrics[row.client_id]) {
          clientMetrics[row.client_id].totalSpend += Number(row.cost) || 0;
        }
      });
      
      // Map leads to clients via agent_id
      const agentToClient: Record<string, string> = {};
      clients?.forEach(client => {
        if (client.agent_id) {
          agentToClient[client.agent_id] = client.id;
        }
      });
      
      leadsData?.forEach(lead => {
        const clientId = agentToClient[lead.agent_id];
        if (clientId && clientMetrics[clientId]) {
          clientMetrics[clientId].totalLeads += 1;
          if (isAtOrBeyond(lead.status || 'new', 'booked')) {
            clientMetrics[clientId].bookedCalls += 1;
          }
          if (isAtOrBeyond(lead.status || 'new', 'submitted')) {
            clientMetrics[clientId].submittedApps += 1;
          }
          if (isAtOrBeyond(lead.status || 'new', 'issued_paid')) {
            clientMetrics[clientId].issuedPaid += 1;
          }
          clientMetrics[clientId].targetPremium += Number(lead.target_premium) || 0;
          clientMetrics[clientId].issuedPremium += Number(lead.issued_premium) || 0;
        }
      });
      
      // Calculate cost per metrics
      Object.values(clientMetrics).forEach(client => {
        client.cpl = client.totalLeads > 0 ? client.totalSpend / client.totalLeads : 0;
        client.cpba = client.bookedCalls > 0 ? client.totalSpend / client.bookedCalls : 0;
      });
      
      return Object.values(clientMetrics)
        .filter(c => c.totalSpend > 0 || c.totalLeads > 0)
        .sort((a, b) => b.totalSpend - a.totalSpend);
    },
  });
}
