import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, format, subDays } from 'date-fns';

export interface EngineRoomMetrics {
  // Client Marketing Ops
  totalWalletBalance: number;
  adSpendMTD: number;
  dailySpendData: Array<{ date: string; spend: number }>;
  avgDailySpend: number;
  todaySpend: number;
  totalDailyBudget: number;
  paceDriftPct: number;
  leadsMTD: number;
  avgCPL: number;
  avgCTR: number;
  lpConversionRate: number; // Google Ads CVR (conversions/clicks)
  leadDeliveryRate: number;
  uniqueLeadRate: number;
  routerHealthStatus: 'green' | 'yellow' | 'red';
  routerHealthMessage: string | null;
  noDataCampaigns: number;
  safeModeCount: number;

  // AI Autopilot Metrics
  suggestionAcceptanceRate: number;
  avgConfidenceScore: number;
  killCount: number;
  scaleCount: number;
  falsePositiveRate: number;
  optimizationFrequency: number;
  totalProposals: number;

  // Bot Metrics (placeholders)
  botEngagementRate: number | null;
  botResolutionRate: number | null;
  humanHandoffRate: number | null;
  botToAppointmentConversion: number | null;
  sentimentScore: number | null;
}

export function useEngineRoomData() {
  return useQuery({
    queryKey: ['engine-room-data'],
    queryFn: async (): Promise<EngineRoomMetrics> => {
      const today = new Date();
      const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
      const todayStr = format(today, 'yyyy-MM-dd');
      const sevenDaysAgo = format(subDays(today, 7), 'yyyy-MM-dd');
      const threeDaysAgo = format(subDays(today, 3), 'yyyy-MM-dd');

      // Fetch all data in parallel
      const [
        walletsResult,
        campaignsResult,
        adSpendMTDResult,
        dailySpendResult,
        leadsMTDResult,
        leadsDeliveryResult,
        routerAlertsResult,
        proposalsResult,
        proposalsWeekResult,
      ] = await Promise.all([
        // Total wallet balances
        supabase.from('client_wallets').select('ad_spend_balance'),
        
        // Campaign data
        supabase.from('campaigns').select(`
          id,
          wallet_remaining,
          pace_drift_pct,
          safe_mode,
          status,
          current_daily_budget,
          leads_last_7d,
          clients!inner(id, status)
        `).eq('ignored', false),
        
        // MTD ad spend with aggregates
        supabase.from('ad_spend_daily')
          .select('cost, clicks, impressions, conversions, ctr')
          .gte('spend_date', monthStart),
        
        // Daily spend for chart (last 30 days for context)
        supabase.from('ad_spend_daily')
          .select('spend_date, cost')
          .gte('spend_date', format(subDays(today, 30), 'yyyy-MM-dd'))
          .order('spend_date', { ascending: true }),
        
        // Leads MTD
        supabase.from('leads')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', monthStart),
        
        // Lead delivery stats
        supabase.from('leads')
          .select('delivery_status')
          .gte('created_at', monthStart),
        
        // Router health alerts (unacknowledged)
        supabase.from('system_alerts')
          .select('id, alert_type, severity, title')
          .in('alert_type', ['lead_router_health', 'stuck_leads', 'delivery_failure_spike'])
          .is('acknowledged_at', null)
          .order('created_at', { ascending: false })
          .limit(5),
        
        // All proposals for acceptance/denial rates
        supabase.from('proposals')
          .select('id, status, proposed_action_type, recommendation_confidence, delta_pct')
          .gte('created_at', monthStart),
        
        // Proposals in last 7 days for frequency
        supabase.from('proposals')
          .select('id, campaign_id')
          .gte('created_at', sevenDaysAgo),
      ]);

      // Calculate wallet metrics - sum of all client wallet balances
      const wallets = walletsResult.data || [];
      const totalWalletBalance = wallets.reduce((sum, w) => sum + (w.ad_spend_balance || 0), 0);

      // Campaign metrics
      const campaigns = campaignsResult.data || [];
      const activeCampaigns = campaigns.filter(c => 
        (c.clients as { status: string }).status === 'active'
      );

      const avgPaceDrift = activeCampaigns.length > 0
        ? activeCampaigns.reduce((sum, c) => sum + (c.pace_drift_pct || 0), 0) / activeCampaigns.length
        : 0;

      const safeModeCount = campaigns.filter(c => c.safe_mode).length;
      
      // Total daily budget (sum of all campaign budgets)
      const totalDailyBudget = activeCampaigns.reduce((sum, c) => sum + (c.current_daily_budget || 0), 0);

      // Calculate daily spend metrics
      const dailySpendRaw = dailySpendResult.data || [];
      
      // Today's spend
      const todaySpend = dailySpendRaw
        .filter(d => d.spend_date === todayStr)
        .reduce((sum, d) => sum + (d.cost || 0), 0);
      
      // Average daily spend (last 7 days)
      const last7DaysSpend = dailySpendRaw
        .filter(d => d.spend_date >= sevenDaysAgo)
        .reduce((sum, d) => sum + (d.cost || 0), 0);
      const avgDailySpend = last7DaysSpend / 7;

      // Ad spend metrics
      const adSpendData = adSpendMTDResult.data || [];
      const adSpendMTD = adSpendData.reduce((sum, d) => sum + (d.cost || 0), 0);
      const totalClicks = adSpendData.reduce((sum, d) => sum + (d.clicks || 0), 0);
      const totalImpressions = adSpendData.reduce((sum, d) => sum + (d.impressions || 0), 0);
      const totalConversions = adSpendData.reduce((sum, d) => sum + (d.conversions || 0), 0);
      
      // CTR from impressions and clicks
      const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      
      // LP Conversion Rate = CVR from Google Ads = Conversions / Clicks
      const lpConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      // Daily spend chart data
      const dailySpendMap = new Map<string, number>();
      (dailySpendResult.data || []).forEach(d => {
        const existing = dailySpendMap.get(d.spend_date) || 0;
        dailySpendMap.set(d.spend_date, existing + (d.cost || 0));
      });
      const dailySpendData = Array.from(dailySpendMap.entries())
        .map(([date, spend]) => ({ date, spend }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Leads
      const leadsMTD = leadsMTDResult.count || 0;
      const avgCPL = leadsMTD > 0 ? adSpendMTD / leadsMTD : 0;

      // Lead delivery rate
      const allLeads = leadsDeliveryResult.data || [];
      const deliveredLeads = allLeads.filter(l => l.delivery_status === 'delivered').length;
      const leadDeliveryRate = allLeads.length > 0 ? (deliveredLeads / allLeads.length) * 100 : 100;

      // Unique lead rate (placeholder - would need duplicate detection)
      const uniqueLeadRate = 95; // Placeholder

      // Router health
      const routerAlerts = routerAlertsResult.data || [];
      let routerHealthStatus: 'green' | 'yellow' | 'red' = 'green';
      let routerHealthMessage: string | null = null;
      
      if (routerAlerts.length > 0) {
        const hasHighSeverity = routerAlerts.some(a => a.severity === 'high');
        routerHealthStatus = hasHighSeverity ? 'red' : 'yellow';
        routerHealthMessage = routerAlerts[0]?.title || null;
      }

      // No data campaigns (have spend but no leads in last 7 days)
      const noDataCampaigns = activeCampaigns.filter(c => 
        (c.current_daily_budget || 0) > 0 && (c.leads_last_7d || 0) === 0
      ).length;

      // AI Autopilot metrics
      const proposals = proposalsResult.data || [];
      const totalProposals = proposals.length;
      
      const executedProposals = proposals.filter(p => 
        p.status === 'executed' || p.status === 'auto_executed' || p.status === 'approved'
      ).length;
      const deniedProposals = proposals.filter(p => p.status === 'denied').length;
      
      const suggestionAcceptanceRate = totalProposals > 0 
        ? (executedProposals / totalProposals) * 100 
        : 0;
      
      const falsePositiveRate = totalProposals > 0 
        ? (deniedProposals / totalProposals) * 100 
        : 0;

      // Average confidence
      const proposalsWithConfidence = proposals.filter(p => p.recommendation_confidence != null);
      const avgConfidenceScore = proposalsWithConfidence.length > 0
        ? proposalsWithConfidence.reduce((sum, p) => sum + (p.recommendation_confidence || 0), 0) / proposalsWithConfidence.length
        : 0;

      // Kill count (SAFE_MODE actions)
      const killCount = proposals.filter(p => 
        p.proposed_action_type === 'SAFE_MODE' && 
        (p.status === 'executed' || p.status === 'auto_executed')
      ).length;

      // Scale count (SET_BUDGET with positive delta)
      const scaleCount = proposals.filter(p => 
        p.proposed_action_type === 'SET_BUDGET' && 
        (p.delta_pct || 0) > 0 &&
        (p.status === 'executed' || p.status === 'auto_executed')
      ).length;

      // Optimization frequency (proposals per campaign per week)
      const weekProposals = proposalsWeekResult.data || [];
      const uniqueCampaignsWithProposals = new Set(weekProposals.map(p => p.campaign_id)).size;
      const optimizationFrequency = uniqueCampaignsWithProposals > 0
        ? weekProposals.length / uniqueCampaignsWithProposals
        : 0;

      return {
        // Marketing Ops
        totalWalletBalance,
        adSpendMTD,
        dailySpendData,
        avgDailySpend,
        todaySpend,
        totalDailyBudget,
        paceDriftPct: avgPaceDrift,
        leadsMTD,
        avgCPL,
        avgCTR,
        lpConversionRate,
        leadDeliveryRate,
        uniqueLeadRate,
        routerHealthStatus,
        routerHealthMessage,
        noDataCampaigns,
        safeModeCount,

        // AI Autopilot
        suggestionAcceptanceRate,
        avgConfidenceScore,
        killCount,
        scaleCount,
        falsePositiveRate,
        optimizationFrequency,
        totalProposals,

        // Bot metrics (placeholders)
        botEngagementRate: null,
        botResolutionRate: null,
        humanHandoffRate: null,
        botToAppointmentConversion: null,
        sentimentScore: null,
      };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
