import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { applyPerformancePercentage } from '@/hooks/usePerformancePercentage';
export interface Campaign {
  id: string;
  client_id: string;
  google_campaign_id: string;
  google_customer_id: string;
  current_daily_budget: number;
  status: 'green' | 'yellow' | 'red';
  safe_mode: boolean;
  safe_mode_reason: string | null;
  safe_mode_budget_used: number | null;
  health_score: number | null;
  ai_summary: string | null;
  reason_codes: string[];
  last_status_change_at: string | null;
  created_at: string;
  updated_at: string;
  // Ignore fields
  ignored: boolean;
  ignored_reason: string | null;
  ignored_at: string | null;
  ignored_by: string | null;
  ignored_until: string | null;
}

export interface Proposal {
  id: string;
  campaign_id: string;
  client_id: string;
  proposed_action_type: 'SET_BUDGET' | 'SAFE_MODE' | 'INVESTIGATE' | 'RESTORE_BUDGET';
  current_daily_budget: number | null;
  proposed_daily_budget: number | null;
  delta_pct: number | null;
  reason_codes: string[];
  ai_summary: string | null;
  ai_diagnosis: string | null;
  health_score: number | null;
  pacing_info: Record<string, unknown> | null;
  status: 'pending' | 'approved' | 'denied' | 'executed' | 'auto_executed';
  recommendation_confidence: number | null;
  similar_cases_count: number | null;
  similar_cases_summary: string | null;
  policy_version: string | null;
  user_override_budget: number | null;
  user_decline_reason: string | null;
  created_at: string;
  // Joined data
  clients?: { name: string; email: string };
  campaigns?: Campaign;
}

export interface WalletInfo {
  walletRemaining: number;
  daysRemaining: number;
  requiredDailySpend: number;
  cycleEnd: string | null;
  spentToDate: number; // Raw spend from Google Ads
  displayedSpend: number; // Spend with performance fee applied
  targetSpend: number;
  walletUtilizationPct: number;
  paceDrift: number;
  paceStatus: 'ahead' | 'on_pace' | 'behind';
}

export interface CampaignWithClient extends Campaign {
  clients: { 
    id: string;
    name: string; 
    email: string;
    ad_spend_budget: number | null;
    billing_status: string | null;
    url_slug: string | null;
    status: string | null;
  };
  proposals?: Proposal[];
  // Yesterday's metrics
  yesterdaySpend: number;
  yesterdayConversions: number;
  yesterdayCPL: number;
  yesterdayCTR: number;
  yesterdayUtilization: number;
  yesterdayOverdelivery: boolean;
  // 7-day trends
  last7dSpend: number;
  last7dConversions: number;
  last7dCPL: number | null;
  last7dCTR: number;
  last7dCVR: number;
  last7dAvgCPL: number | null; // Average CPL over last 7 days
  // Pacing info
  walletInfo: WalletInfo | null;
  // Badge flags
  noSpend: boolean;
  noData: boolean;
  // NEW: Health score pillars
  health_label: string | null;
  health_score_delivery: number | null;
  health_score_cvr: number | null;
  health_score_cpl: number | null;
  health_score_booked_call: number | null;
  health_score_downstream: number | null;
  health_drivers: { positive?: string[]; negative?: string[] } | null;
  // NEW: Lead/booked metrics
  leads_last_7d: number | null;
  booked_calls_last_7d: number | null;
  booked_call_rate_7d: number | null;
  leads_yesterday: number | null;
  booked_calls_yesterday: number | null;
  // NEW: Downstream metrics
  cpbc_7d: number | null;
  cpsa_7d: number | null;
  cp_issued_paid_7d: number | null;
  apps_submitted_7d: number | null;
  issued_paid_7d: number | null;
  // NEW: Pacing fields (from campaigns table)
  wallet_remaining: number | null;
  days_remaining_in_cycle: number | null;
  required_daily_spend: number | null;
  pace_drift_pct: number | null;
}

export interface DailySpendRecord {
  id: string;
  client_id: string;
  campaign_id: string;
  spend_date: string;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  ctr: number;
  cpc: number;
  budget_daily: number | null;
  budget_utilization: number | null;
  overdelivery: boolean;
  campaign_enabled: boolean;
}

export interface RollingSnapshot {
  id: string;
  campaign_id: string;
  snapshot_date: string;
  last_7d_spend: number;
  last_7d_conversions: number;
  last_7d_ctr: number;
  last_7d_cvr: number;
  last_7d_cpl: number | null;
  prior_7d_spend: number;
  prior_7d_conversions: number;
  delta_spend_pct: number | null;
  delta_conversions_pct: number | null;
  delta_cpl_pct: number | null;
}

export interface CampaignSettings {
  id: string;
  campaign_id: string | null;
  auto_approve_green: boolean;
  auto_approve_yellow: boolean;
  auto_approve_red: boolean;
  safe_mode_auto_trigger: boolean;
  ctr_red_threshold: number;
  cvr_red_threshold: number;
  no_conv_spend_threshold: number;
  not_spending_budget_threshold: number;
  not_spending_spend_threshold: number;
  clicks_no_conv_threshold: number;
  cpl_yellow_threshold: number;
  max_budget_change_pct: number;
  target_spend_pct: number;
  policy_version: string;
  ai_provider: string;
  custom_ai_server_url: string | null;
  reminder_quiet_hours_start: number;
  reminder_quiet_hours_end: number;
  slack_webhook_url: string | null;
}

export interface CommandCenterStats {
  totalSpendYesterday: number;
  totalConversionsYesterday: number;
  avgCPL: number;
  avgCTR: number;
  avgCVR: number;
  avgCPC: number;
  avgUtilization: number;
  overdeliveryCount: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
  safeModeCount: number;
  pendingApprovalsCount: number;
  // Wallet stats
  totalWalletRemaining: number;
  behindPaceCount: number;
  noSpendCount: number;
  // NEW: Health label counts
  healthyCount: number;
  goodCount: number;
  atRiskCount: number;
  criticalCount: number;
  lowBookedRateCount: number;
}

// Get today's date in Eastern timezone
function getTodayEastern(): string {
  const now = new Date();
  const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return eastern.toISOString().split('T')[0];
}

// Get yesterday's date in Eastern timezone
function getYesterdayEastern(): string {
  const now = new Date();
  const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  eastern.setDate(eastern.getDate() - 1);
  return eastern.toISOString().split('T')[0];
}

// Calculate pacing and wallet info
function calculateWalletInfo(
  walletBalance: number,
  spentToDate: number,
  displayedSpend: number, // Spend with performance fee applied
  cycleEnd: string | null,
  targetSpendPct = 95
): WalletInfo | null {
  if (!walletBalance && !spentToDate) return null;

  // Use displayedSpend (with fee) for all calculations
  const totalBudget = walletBalance + displayedSpend;
  const targetSpend = totalBudget * (targetSpendPct / 100);
  
  let daysRemaining = 1;
  if (cycleEnd) {
    const end = new Date(cycleEnd);
    const now = new Date();
    daysRemaining = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const walletRemaining = walletBalance;
  const targetRemaining = Math.max(0, targetSpend - displayedSpend);
  const requiredDailySpend = targetRemaining / daysRemaining;
  
  // Wallet utilization: how much of the total budget has been spent
  const walletUtilizationPct = totalBudget > 0 ? (displayedSpend / totalBudget) * 100 : 0;
  
  // Pace drift: difference between actual avg spend and required
  const expectedSpentByNow = targetSpend * (1 - (daysRemaining / (daysRemaining + 1)));
  const paceDrift = displayedSpend - expectedSpentByNow;
  
  // Determine pace status
  let paceStatus: 'ahead' | 'on_pace' | 'behind' = 'on_pace';
  const driftPct = targetSpend > 0 ? (paceDrift / targetSpend) * 100 : 0;
  if (driftPct > 10) paceStatus = 'ahead';
  else if (driftPct < -10) paceStatus = 'behind';

  return {
    walletRemaining,
    daysRemaining,
    requiredDailySpend,
    cycleEnd,
    spentToDate, // Raw spend
    displayedSpend, // Spend with performance fee
    targetSpend,
    walletUtilizationPct,
    paceDrift,
    paceStatus,
  };
}

export function useCampaigns() {
  const today = getTodayEastern();
  const yesterday = getYesterdayEastern();

  return useQuery({
    queryKey: ['campaigns', today],
    queryFn: async () => {
      // Fetch performance percentage setting first
      const { data: perfSetting } = await supabase
        .from('onboarding_settings')
        .select('setting_value')
        .eq('setting_key', 'performance_percentage')
        .maybeSingle();

      // Never hard-code a non-zero default performance fee.
      // If missing/invalid, treat as 0%.
      const rawPerf = perfSetting?.setting_value;
      const parsedPerf = rawPerf != null ? Number(rawPerf) : NaN;
      const performancePercentage = Number.isFinite(parsedPerf) ? parsedPerf : 0;

      // Fetch campaigns with client data - ONLY active clients
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          clients!inner(id, name, email, ad_spend_budget, billing_status, url_slug, status)
        `)
        .eq('clients.status', 'active')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch today's ad spend data first (most recent available)
      let { data: metricsData } = await supabase
        .from('ad_spend_daily')
        .select('*')
        .eq('spend_date', today);

      // If no data for today, try yesterday
      if (!metricsData || metricsData.length === 0) {
        const { data: yesterdayData } = await supabase
          .from('ad_spend_daily')
          .select('*')
          .eq('spend_date', yesterday);
        metricsData = yesterdayData;
      }

      // Fetch rolling snapshots for 7-day data
      const { data: snapshots } = await supabase
        .from('rolling_snapshots')
        .select('*')
        .eq('snapshot_date', yesterday);

      // Fetch wallet data for all clients
      const clientIds = campaigns?.map(c => c.client_id) || [];

      const { data: wallets, error: walletsError } = await supabase
        .from('client_wallets')
        .select('client_id, ad_spend_balance, tracking_start_date')
        .in('client_id', clientIds);

      if (walletsError) throw walletsError;

      // Fetch all wallet deposits (source of truth for wallet funding)
      const { data: allDeposits, error: depositsError } = await supabase
        .from('wallet_transactions')
        .select('client_id, amount')
        .in('client_id', clientIds)
        .eq('transaction_type', 'deposit');

      if (depositsError) throw depositsError;

      // Fetch the most recent PAID ad_spend billing record for each client
      // This determines the billing period (cycle) for pacing calculations
      const { data: paidBillingRecords } = await supabase
        .from('billing_records')
        .select('client_id, billing_period_start, billing_period_end, amount, paid_at')
        .in('client_id', clientIds)
        .eq('billing_type', 'ad_spend')
        .eq('status', 'paid')
        .order('billing_period_end', { ascending: false });

      // Create a map of client_id -> most recent paid billing record
      const billingByClient = new Map<string, {
        billing_period_start: string | null;
        billing_period_end: string | null;
        amount: number;
      }>();
      
      paidBillingRecords?.forEach(record => {
        // Only keep the first (most recent) record for each client
        if (!billingByClient.has(record.client_id)) {
          billingByClient.set(record.client_id, {
            billing_period_start: record.billing_period_start,
            billing_period_end: record.billing_period_end,
            amount: record.amount,
          });
        }
      });

      // Fetch all ad spend for calculating spent to date within billing period
      const { data: allSpend } = await supabase
        .from('ad_spend_daily')
        .select('client_id, cost, spend_date, conversions')
        .in('client_id', clientIds);

      // Map campaigns with all metrics
      const campaignsWithMetrics = (campaigns || []).map(campaign => {
        const metricsRecord = metricsData?.find(
          r => r.client_id === campaign.client_id
        );

        const snapshot = snapshots?.find(
          s => s.campaign_id === campaign.id
        );

        const wallet = wallets?.find(w => w.client_id === campaign.client_id);
        const billingRecord = billingByClient.get(campaign.client_id);

        // Use billing period end for pacing/"days left" (wallet value itself matches Portal logic)
        const cycleEnd = billingRecord?.billing_period_end || null;

        const trackingStartDate = wallet?.tracking_start_date || null;

        // Portal logic (source of truth): deposits - (tracked spend since tracking_start_date with perf % applied)
        const clientDeposits = allDeposits?.filter(d => d.client_id === campaign.client_id) || [];
        const totalDeposits = clientDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);

        const trackedSpendRows = trackingStartDate
          ? (allSpend?.filter(s => s.client_id === campaign.client_id && s.spend_date >= trackingStartDate) || [])
          : [];

        const spentToDate = trackedSpendRows.reduce((sum, s) => sum + Number(s.cost || 0), 0);

        // Apply performance fee to get displayed spend
        const displayedSpend = applyPerformancePercentage(spentToDate, performancePercentage);

        // Wallet remaining = total deposits - displayed spend (with fee)
        const walletRemaining = trackingStartDate ? (totalDeposits - displayedSpend) : 0;

        const walletInfo = trackingStartDate
          ? calculateWalletInfo(walletRemaining, spentToDate, displayedSpend, cycleEnd)
          : null;

        // Calculate 7-day average CPL from the last 7 days of spend data
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        
        const last7dSpendData = allSpend?.filter(s => 
          s.client_id === campaign.client_id && 
          s.spend_date >= sevenDaysAgoStr
        ) || [];
        
        const last7dTotalSpend = last7dSpendData.reduce((sum, s) => sum + Number(s.cost || 0), 0);
        const last7dTotalConversions = last7dSpendData.reduce((sum, s) => sum + Number(s.conversions || 0), 0);
        const last7dAvgCPL = last7dTotalConversions > 0 ? last7dTotalSpend / last7dTotalConversions : null;

        // Determine no-spend / no-data flags
        const noSpend = metricsRecord && 
          (metricsRecord.cost || 0) < 5 && 
          (campaign.current_daily_budget || 0) > 30;
        const noData = !metricsRecord;

        return {
          ...campaign,
          yesterdaySpend: metricsRecord?.cost || 0,
          yesterdayConversions: metricsRecord?.conversions || 0,
          yesterdayCPL: metricsRecord?.conversions 
            ? metricsRecord.cost / metricsRecord.conversions 
            : 0,
          yesterdayCTR: metricsRecord?.ctr || 0,
          yesterdayUtilization: metricsRecord?.budget_utilization || 0,
          yesterdayOverdelivery: metricsRecord?.overdelivery || false,
          // 7-day trends from snapshot
          last7dSpend: snapshot?.last_7d_spend || 0,
          last7dConversions: snapshot?.last_7d_conversions || 0,
          last7dCPL: snapshot?.last_7d_cpl || null,
          last7dCTR: snapshot?.last_7d_ctr || 0,
          last7dCVR: snapshot?.last_7d_cvr || 0,
          last7dAvgCPL, // Calculated 7-day average CPL
          // Wallet/pacing
          walletInfo,
          // Flags
          noSpend: !!noSpend,
          noData: !!noData,
        };
      }) as CampaignWithClient[];

      return campaignsWithMetrics;
    },
  });
}

export function useProposals(status?: string) {
  return useQuery({
    queryKey: ['proposals', status],
    queryFn: async () => {
      let query = supabase
        .from('proposals')
        .select(`
          *,
          clients!inner(name, email),
          campaigns!inner(*)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Proposal[];
    },
  });
}

export function usePendingProposals() {
  return useProposals('pending');
}

export function useYesterdayMetrics() {
  const yesterday = getYesterdayEastern();

  return useQuery({
    queryKey: ['yesterday-metrics', yesterday],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_spend_daily')
        .select('*')
        .eq('spend_date', yesterday);

      if (error) throw error;
      return data as DailySpendRecord[];
    },
  });
}

export function useCommandCenterStats() {
  const today = getTodayEastern();
  const yesterday = getYesterdayEastern();

  return useQuery({
    queryKey: ['command-center-stats', today],
    queryFn: async () => {
      // Get today's spend data first, then fallback to yesterday
      let { data: spendData } = await supabase
        .from('ad_spend_daily')
        .select('*')
        .eq('spend_date', today);

      if (!spendData || spendData.length === 0) {
        const { data: yesterdaySpend } = await supabase
          .from('ad_spend_daily')
          .select('*')
          .eq('spend_date', yesterday);
        spendData = yesterdaySpend;
      }

      // Get campaigns for status counts - ONLY for active clients
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          id, client_id, status, safe_mode, current_daily_budget,
          health_score, health_label, booked_call_rate_7d, ignored,
          clients!inner(id, status)
        `)
        .eq('clients.status', 'active');

      if (campaignsError) throw campaignsError;

      // Get pending proposals count - ONLY for active clients
      // First get campaign IDs for active clients
      const activeCampaignIds = campaigns?.map(c => c.id) || [];
      
      const { count: pendingCount, error: pendingError } = await supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .in('campaign_id', activeCampaignIds.length > 0 ? activeCampaignIds : ['__none__']);

      if (pendingError) throw pendingError;

      // Fetch performance percentage setting
      const { data: perfSetting } = await supabase
        .from('onboarding_settings')
        .select('setting_value')
        .eq('setting_key', 'performance_percentage')
        .maybeSingle();
      
      // Never hard-code a non-zero default performance fee.
      // If missing/invalid, treat as 0%.
      const rawPerf = perfSetting?.setting_value;
      const parsedPerf = rawPerf != null ? Number(rawPerf) : NaN;
      const performancePercentage = Number.isFinite(parsedPerf) ? parsedPerf : 0;

      // Get wallet data - only for active clients (tracking start date + deposits + spend)
      const clientIds = campaigns?.map(c => c.client_id) || [];
      const { data: wallets } = await supabase
        .from('client_wallets')
        .select('client_id, ad_spend_balance, tracking_start_date')
        .in('client_id', clientIds);

      // Get all wallet deposits
      const { data: allDeposits } = await supabase
        .from('wallet_transactions')
        .select('client_id, amount')
        .in('client_id', clientIds)
        .eq('transaction_type', 'deposit');

      // Get all ad spend
      const { data: allWalletSpend } = await supabase
        .from('ad_spend_daily')
        .select('client_id, cost, spend_date')
        .in('client_id', clientIds);

      // Calculate stats - only include records for active clients
      const activeClientIds = new Set(clientIds);
      const activeRecords = (spendData || []).filter(r => activeClientIds.has(r.client_id));
      
      const totalSpendYesterday = activeRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
      const totalConversionsYesterday = activeRecords.reduce((sum, r) => sum + (r.conversions || 0), 0);
      
      // Weighted CPL: total spend / total conversions (not average of individual CPLs)
      const avgCPL = totalConversionsYesterday > 0
        ? totalSpendYesterday / totalConversionsYesterday
        : 0;

      const avgCTR = activeRecords.length > 0
        ? activeRecords.reduce((sum, r) => sum + (r.ctr || 0), 0) / activeRecords.length
        : 0;

      const avgCVR = activeRecords.length > 0
        ? activeRecords.reduce((sum, r) => {
            const cvr = r.clicks > 0 ? (r.conversions / r.clicks) * 100 : 0;
            return sum + cvr;
          }, 0) / activeRecords.length
        : 0;

      const avgCPC = activeRecords.length > 0
        ? activeRecords.reduce((sum, r) => sum + (r.cpc || 0), 0) / activeRecords.length
        : 0;

      const recordsWithUtilization = activeRecords.filter(r => r.budget_utilization !== null);
      const avgUtilization = recordsWithUtilization.length > 0
        ? recordsWithUtilization.reduce((sum, r) => sum + (r.budget_utilization || 0), 0) / recordsWithUtilization.length
        : 0;

      const overdeliveryCount = activeRecords.filter(r => r.overdelivery).length;

      // Campaign status counts
      const campaignList = campaigns || [];
      const greenCount = campaignList.filter(c => c.status === 'green' && !c.safe_mode).length;
      const yellowCount = campaignList.filter(c => c.status === 'yellow' && !c.safe_mode).length;
      const redCount = campaignList.filter(c => c.status === 'red' && !c.safe_mode).length;
      const safeModeCount = campaignList.filter(c => c.safe_mode).length;

      // Wallet stats - calculate as Total Deposits - (Tracked Spend * 1.10) for each client
      let totalWalletRemaining = 0;
      
      for (const clientId of clientIds) {
        const wallet = wallets?.find(w => w.client_id === clientId);
        const trackingStartDate = wallet?.tracking_start_date;
        
        if (!trackingStartDate) continue;
        
        // Sum deposits for this client
        const clientDeposits = allDeposits?.filter(d => d.client_id === clientId) || [];
        const deposits = clientDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);
        
        // Sum ad spend since tracking start date
        const clientSpend = allWalletSpend?.filter(s => 
          s.client_id === clientId && s.spend_date >= trackingStartDate
        ) || [];
        const rawSpend = clientSpend.reduce((sum, s) => sum + Number(s.cost || 0), 0);
        
        // Apply performance fee using the centralized function
        const displayedSpend = applyPerformancePercentage(rawSpend, performancePercentage);
        const remaining = deposits - displayedSpend;
        
        totalWalletRemaining += remaining;
      }

      // No spend count - only for active clients
      const noSpendCount = activeRecords.filter(r => {
        const campaign = campaignList.find(c => c.client_id === r.client_id);
        return (r.cost || 0) < 5 && (campaign?.current_daily_budget || 0) > 30;
      }).length;

      // Behind pace count (simplified - would need full pacing calc)
      const behindPaceCount = 0; // TODO: Calculate based on full pacing data

      // Health label counts (exclude ignored)
      const nonIgnored = campaignList.filter((c: typeof campaignList[0]) => !c.ignored);
      const healthyCount = nonIgnored.filter((c: typeof campaignList[0]) => c.health_label === 'Healthy').length;
      const goodCount = nonIgnored.filter((c: typeof campaignList[0]) => c.health_label === 'Good').length;
      const atRiskCount = nonIgnored.filter((c: typeof campaignList[0]) => c.health_label === 'At Risk').length;
      const criticalCount = nonIgnored.filter((c: typeof campaignList[0]) => c.health_label === 'Critical').length;
      const lowBookedRateCount = nonIgnored.filter((c: typeof campaignList[0]) => 
        c.booked_call_rate_7d != null && c.booked_call_rate_7d < 50
      ).length;

      return {
        totalSpendYesterday,
        totalConversionsYesterday,
        avgCPL,
        avgCTR,
        avgCVR,
        avgCPC,
        avgUtilization,
        overdeliveryCount,
        greenCount,
        yellowCount,
        redCount,
        safeModeCount,
        pendingApprovalsCount: pendingCount || 0,
        totalWalletRemaining,
        behindPaceCount,
        noSpendCount,
        healthyCount,
        goodCount,
        atRiskCount,
        criticalCount,
        lowBookedRateCount,
      } as CommandCenterStats;
    },
  });
}

export function useCampaignSettings() {
  return useQuery({
    queryKey: ['campaign-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_settings')
        .select('*')
        .is('campaign_id', null)
        .single();

      if (error) throw error;
      return data as CampaignSettings;
    },
  });
}

export function useApproveProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ proposalId, overrideBudget }: { proposalId: string; overrideBudget?: number }) => {
      const { data, error } = await supabase.functions.invoke('execute-proposal', {
        body: { proposalId, action: 'approve', overrideBudget },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['command-center-stats'] });
    },
  });
}

export function useDenyProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      decisionOutcome,
      primaryReasonCategory,
      specificReasonCodes,
      nextAction,
      confidenceOverride,
      userNote,
      overrideBudget,
    }: {
      proposalId: string;
      decisionOutcome: string;
      primaryReasonCategory: string;
      specificReasonCodes: string[];
      nextAction: string;
      confidenceOverride?: string;
      userNote?: string;
      overrideBudget?: number;
    }) => {
      // Update the proposal with denial info
      const { error } = await supabase
        .from('proposals')
        .update({
          status: 'denied',
          user_decline_reason: `${decisionOutcome}: ${primaryReasonCategory}`,
          user_override_budget: overrideBudget,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId);

      if (error) throw error;

      // Create decision event
      const { data: proposal } = await supabase
        .from('proposals')
        .select('*, campaigns(*)')
        .eq('id', proposalId)
        .single();

      if (proposal) {
        const campaignData = proposal.campaigns as { status?: string } | null;
        await supabase.from('decision_events').insert([{
          campaign_id: proposal.campaign_id,
          client_id: proposal.client_id,
          proposal_id: proposalId,
          decision_type: 'PROPOSAL',
          status_at_decision: campaignData?.status || 'unknown',
          reason_codes: proposal.reason_codes || [],
          proposed_action_type: proposal.proposed_action_type,
          proposed_daily_budget: proposal.proposed_daily_budget,
          proposed_delta_pct: proposal.delta_pct,
          was_approved: false,
          decision_at: new Date().toISOString(),
          decision_outcome: decisionOutcome,
          primary_reason_category: primaryReasonCategory,
          specific_reason_codes: specificReasonCodes,
          next_action: nextAction,
          confidence_override: confidenceOverride,
          user_note: userNote,
          features_at_decision: proposal.pacing_info || {},
          policy_version: proposal.policy_version,
          ai_provider: 'lovable_llm',
        }]);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useUpdateCampaignSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<CampaignSettings>) => {
      const { error } = await supabase
        .from('campaign_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .is('campaign_id', null);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-settings'] });
    },
  });
}

export function useRollingSnapshots(campaignId?: string) {
  return useQuery({
    queryKey: ['rolling-snapshots', campaignId],
    queryFn: async () => {
      let query = supabase
        .from('rolling_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(7);

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RollingSnapshot[];
    },
    enabled: !!campaignId,
  });
}

// Hook for running the morning review job manually
export function useRunMorningReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('morning-review-job', {
        body: {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['command-center-stats'] });
    },
  });
}

// Hook for manual budget override
export function useManualBudgetOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      clientId,
      newBudget,
      reasonCategory,
      reasonDetail,
      previousBudget,
    }: {
      campaignId: string;
      clientId: string;
      newBudget: number;
      reasonCategory: string;
      reasonDetail: string;
      previousBudget: number;
    }) => {
      // 0. Identify the actor (for audit constraints)
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.warn('Unable to resolve current user for audit log:', userError);
      }
      const actorUserId = userData?.user?.id ?? null;

      // 1. Call Google Ads API to update the budget in Google
      console.log(`Calling update-google-ads-budget for client ${clientId} with budget $${newBudget}`);
      
      const { data: gadsResult, error: gadsError } = await supabase.functions.invoke(
        'update-google-ads-budget',
        {
          body: { clientId, newDailyBudget: newBudget },
        }
      );

      // Track Google Ads update result
      let googleAdsUpdated = false;
      let googleAdsError: string | null = null;

      if (gadsError) {
        googleAdsError = gadsError.message || 'Failed to call Google Ads API';
        console.error('Google Ads budget update failed:', gadsError);
      } else if (gadsResult && !gadsResult.success) {
        googleAdsError = gadsResult.error || 'Unknown Google Ads error';
        console.error('Google Ads budget update returned error:', gadsResult.error);
      } else if (gadsResult?.success) {
        googleAdsUpdated = true;
        console.log('Google Ads budget updated successfully:', gadsResult);
      }

      // 2. Update campaign budget in database and ALWAYS reset status after manual override
      const campaignUpdate: Record<string, unknown> = {
        current_daily_budget: newBudget,
        last_budget_change_at: new Date().toISOString(),
        last_budget_change_by: 'USER',
        updated_at: new Date().toISOString(),
        // ALWAYS reset status after manual override - pending next AI review
        status: 'yellow',
        health_score: 60,
        reason_codes: ['MANUAL_OVERRIDE_PENDING_REVIEW'],
        ai_summary: `Manual budget override applied ($${previousBudget.toFixed(2)} → $${newBudget.toFixed(2)}). ${googleAdsUpdated ? 'Google Ads budget updated.' : 'Note: Google Ads update may have failed.'} Pending next AI review.`,
      };

      // Reset safe mode if the reason is safe_mode_reset
      if (reasonCategory === 'safe_mode_reset') {
        campaignUpdate.safe_mode = false;
        campaignUpdate.safe_mode_reason = null;
        campaignUpdate.safe_mode_triggered_at = null;
        campaignUpdate.safe_mode_budget_used = null;
      }

      const { error: campaignError } = await supabase
        .from('campaigns')
        .update(campaignUpdate)
        .eq('id', campaignId);

      if (campaignError) throw campaignError;

      // 3. Log to campaign audit log for AI training
      const { error: auditError } = await supabase
        .from('campaign_audit_log')
        .insert({
          campaign_id: campaignId,
          client_id: clientId,
          action: 'MANUAL_BUDGET_OVERRIDE',
          actor: 'USER',
          actor_user_id: actorUserId,
          old_value: { daily_budget: previousBudget },
          new_value: { 
            daily_budget: newBudget, 
            google_ads_updated: googleAdsUpdated,
            google_ads_error: googleAdsError,
          },
          reason_codes: [reasonCategory],
          notes: reasonDetail || null,
        });

      if (auditError) throw auditError;

      // 4. Create a decision event for AI learning (best-effort)
      const { error: decisionError } = await supabase.from('decision_events').insert({
        campaign_id: campaignId,
        client_id: clientId,
        decision_type: 'MANUAL_OVERRIDE',
        status_at_decision: 'manual',
        reason_codes: [reasonCategory],
        proposed_action_type: 'MANUAL',
        proposed_daily_budget: newBudget,
        proposed_delta_pct:
          previousBudget > 0 ? ((newBudget - previousBudget) / previousBudget) * 100 : 0,
        was_approved: true,
        decision_at: new Date().toISOString(),
        decision_outcome: 'MANUAL_OVERRIDE',
        primary_reason_category: reasonCategory,
        specific_reason_codes: [reasonCategory],
        next_action: 'applied',
        user_note: reasonDetail || null,
        ai_provider: 'USER',
      });

      if (decisionError) {
        console.error('Failed to create decision event:', decisionError);
      }

      return { 
        success: true, 
        newBudget, 
        googleAdsUpdated,
        googleAdsError,
      };
    },
    onSuccess: () => {
      // Force refetch all campaign queries (including those with date keys)
      queryClient.invalidateQueries({ queryKey: ['campaigns'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['command-center-stats'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['proposals'], refetchType: 'all' });
    },
  });
}

// Hook for ignoring a campaign
export function useIgnoreCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      clientId,
      reason,
      notes,
      ignoreUntil,
    }: {
      campaignId: string;
      clientId: string;
      reason: string;
      notes?: string;
      ignoreUntil?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const actorUserId = userData?.user?.id ?? null;

      const { error } = await supabase
        .from('campaigns')
        .update({
          ignored: true,
          ignored_reason: reason,
          ignored_at: new Date().toISOString(),
          ignored_by: actorUserId,
          ignored_until: ignoreUntil || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (error) throw error;

      // Log to audit
      await supabase.from('campaign_audit_log').insert({
        campaign_id: campaignId,
        client_id: clientId,
        action: 'CAMPAIGN_IGNORED',
        actor: 'USER',
        actor_user_id: actorUserId,
        new_value: { reason, notes, ignore_until: ignoreUntil },
        notes: notes || null,
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['command-center-stats'], refetchType: 'all' });
    },
  });
}

// Hook for un-ignoring a campaign
export function useUnignoreCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      clientId,
    }: {
      campaignId: string;
      clientId: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const actorUserId = userData?.user?.id ?? null;

      const { error } = await supabase
        .from('campaigns')
        .update({
          ignored: false,
          ignored_reason: null,
          ignored_at: null,
          ignored_by: null,
          ignored_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (error) throw error;

      // Log to audit
      await supabase.from('campaign_audit_log').insert({
        campaign_id: campaignId,
        client_id: clientId,
        action: 'CAMPAIGN_UNIGNORED',
        actor: 'USER',
        actor_user_id: actorUserId,
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['command-center-stats'], refetchType: 'all' });
    },
  });
}
