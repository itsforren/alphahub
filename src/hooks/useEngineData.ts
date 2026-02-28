import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

export interface EngineMetrics {
  // Today's metrics with pacing
  adSpendToday: number;
  pacingPercent: number;
  dailyBudget: number;
  
  // Leads with CPL
  leadsToday: number;
  cpl: number;
  
  // Booked Calls with CPBC
  bookedCallsToday: number;
  cpbc: number;
  
  // Issued Paid with ROI
  issuedPaidToday: number;
  roas: number;
  
  // 30-day metrics for trend comparison
  adSpend30d: number;
  leads30d: number;
  bookedCalls30d: number;
  issuedPaid30d: number;
  
  // Signal Strength
  signalStrengthPercent: number;
  
  // Efficiency Gauges (new targets per spec)
  bookedRate: number;
  bookedRateTarget: number;
  showRate: number;
  showRateTarget: number;
  closeRate: number;
  closeRateTarget: number;
  
  // Top 5 clients by Issued Paid Revenue
  topClients: Array<{
    id: string;
    name: string;
    issuedPaid: number;
  }>;
}

export function useEngineData() {
  return useQuery({
    queryKey: ['tv-engine-data'],
    queryFn: async (): Promise<EngineMetrics> => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      
      // Fetch today's data
      const { data: todayData } = await supabase
        .from('client_kpi_daily')
        .select('*')
        .eq('date', today);
      
      // Fetch 30-day data
      const { data: thirtyDayData } = await supabase
        .from('client_kpi_daily')
        .select('*')
        .gte('date', thirtyDaysAgo);
      
      // Fetch campaigns for budget info and leaderboard
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select(`
          id,
          health_score,
          issued_paid_7d,
          current_daily_budget,
          status,
          clients!inner(id, name)
        `)
        .eq('ignored', false)
        .not('health_score', 'is', null);
      
      // Aggregate today's metrics
      const adSpendToday = todayData?.reduce((sum, r) => sum + (r.ad_spend || 0), 0) || 0;
      const leadsToday = todayData?.reduce((sum, r) => sum + (r.leads || 0), 0) || 0;
      const bookedCallsToday = todayData?.reduce((sum, r) => sum + (r.booked_calls || 0), 0) || 0;
      const issuedPaidToday = todayData?.reduce((sum, r) => sum + (r.issued_paid || 0), 0) || 0;
      
      // Calculate daily budget from campaigns
      const dailyBudget = campaigns?.reduce((sum, c) => sum + (c.current_daily_budget || 0), 0) || 1;
      const pacingPercent = dailyBudget > 0 ? (adSpendToday / dailyBudget) * 100 : 0;
      
      // CPL = Ad Spend / Leads
      const cpl = leadsToday > 0 ? adSpendToday / leadsToday : 0;
      
      // CPBC = Ad Spend / Booked Calls
      const cpbc = bookedCallsToday > 0 ? adSpendToday / bookedCallsToday : 0;
      
      // ROAS = Issued Paid / Ad Spend
      const roas = adSpendToday > 0 ? issuedPaidToday / adSpendToday : 0;
      
      // Aggregate 30-day metrics
      const adSpend30d = thirtyDayData?.reduce((sum, r) => sum + (r.ad_spend || 0), 0) || 0;
      const leads30d = thirtyDayData?.reduce((sum, r) => sum + (r.leads || 0), 0) || 0;
      const bookedCalls30d = thirtyDayData?.reduce((sum, r) => sum + (r.booked_calls || 0), 0) || 0;
      const issuedPaid30d = thirtyDayData?.reduce((sum, r) => sum + (r.issued_paid || 0), 0) || 0;
      const shows30d = thirtyDayData?.reduce((sum, r) => sum + (r.shows || 0), 0) || 0;
      
      // Calculate efficiency rates with NEW targets (60%, 70%, 20%)
      const bookedRate = leads30d > 0 ? (bookedCalls30d / leads30d) * 100 : 0;
      const showRate = bookedCalls30d > 0 ? (shows30d / bookedCalls30d) * 100 : 0;
      const closeRate = shows30d > 0 ? (issuedPaid30d / shows30d) * 100 : 0;
      
      // Signal Strength: % of campaigns with active status
      const activeCampaigns = campaigns?.filter(c => c.status === 'ENABLED' || c.status === 'active').length || 0;
      const totalCampaigns = campaigns?.length || 1;
      const signalStrengthPercent = (activeCampaigns / totalCampaigns) * 100;
      
      // Top 5 clients by Issued Paid Revenue
      const clientsWithIssuedPaid = campaigns?.map(c => ({
        id: (c.clients as { id: string }).id,
        name: (c.clients as { name: string }).name,
        issuedPaid: c.issued_paid_7d || 0,
      })) || [];
      
      const topClients = [...clientsWithIssuedPaid]
        .sort((a, b) => b.issuedPaid - a.issuedPaid)
        .slice(0, 5);
      
      return {
        adSpendToday,
        pacingPercent,
        dailyBudget,
        leadsToday,
        cpl,
        bookedCallsToday,
        cpbc,
        issuedPaidToday,
        roas,
        adSpend30d,
        leads30d,
        bookedCalls30d,
        issuedPaid30d,
        signalStrengthPercent,
        bookedRate,
        bookedRateTarget: 60,
        showRate,
        showRateTarget: 70,
        closeRate,
        closeRateTarget: 20,
        topClients,
      };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
