import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/components/portal/MetricsDateSelector';

export interface LeadMetrics {
  totalLeads: number;           // Leads count
  bookedCalls: number;          // Booked Calls (history-based)
  bookingPercentage: number;    // Booking % (booked / total)
  cpl: number;                  // Cost Per Lead
  cpbc: number;                 // Cost Per Booked Call
  adSpend: number;              // Ad Spend for selected range
  submittedApps: number;        // Leads with submitted_at set
  ltsaCost: number;             // Lead to Submitted App Cost
  ltsaPercentage: number;       // LTSA % (submitted / total)
  // Premium totals for Hero Stats
  totalSubmittedPremium: number;
  totalIssuedPremium: number;
  issuedPaidCount: number;
  alphaRoi: number;
}

interface MetricsOptions {
  performancePercentage?: number;      // e.g., 10 means +10%
  commissionContractPercent?: number;  // e.g., 130 means 130%
}

// Fetch lead metrics for a client with date range
export function useLeadMetrics(clientId: string, dateRange?: DateRange, options?: MetricsOptions) {
  const performancePct = options?.performancePercentage ?? 0;
  const commissionPct = options?.commissionContractPercent ?? 100;
  
  return useQuery({
    queryKey: ['lead-metrics', clientId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString(), performancePct, commissionPct],
    queryFn: async () => {
      // Fetch client and wallet data in parallel
      const [clientResult, walletResult] = await Promise.all([
        supabase
          .from('clients')
          .select('agent_id')
          .eq('id', clientId)
          .single(),
        supabase
          .from('client_wallets')
          .select('tracking_start_date')
          .eq('client_id', clientId)
          .maybeSingle()
      ]);

      if (clientResult.error) throw clientResult.error;
      if (!clientResult.data?.agent_id) return null;

      const agentId = clientResult.data.agent_id;
      const trackingStartDate = walletResult.data?.tracking_start_date;

      // Build queries for leads and spend (will run in parallel)
      let leadsQuery = supabase
        .from('leads')
        .select('id, status, lead_date, booked_call_at, submitted_at, approved_at, issued_at, submitted_premium, approved_premium, issued_premium, target_premium')
        .eq('agent_id', agentId);

      let spendQuery = supabase
        .from('ad_spend_daily')
        .select('cost')
        .eq('client_id', clientId);

      // Apply date range filter if provided, otherwise use tracking_start_date
      if (dateRange) {
        const fromStr = dateRange.from.toISOString().split('T')[0];
        const toStr = dateRange.to.toISOString().split('T')[0];
        leadsQuery = leadsQuery.gte('lead_date', fromStr).lte('lead_date', toStr);
        spendQuery = spendQuery.gte('spend_date', fromStr).lte('spend_date', toStr);
      } else if (trackingStartDate) {
        leadsQuery = leadsQuery.gte('lead_date', trackingStartDate);
        spendQuery = spendQuery.gte('spend_date', trackingStartDate);
      }

      // Fetch leads and spend in parallel
      const [leadsResult, spendResult] = await Promise.all([
        leadsQuery,
        spendQuery
      ]);

      if (leadsResult.error) throw leadsResult.error;

      const leads = leadsResult.data;
      const spendData = spendResult.data;
      const trackedSpend = spendData?.reduce((sum, day) => sum + Number(day.cost || 0), 0) ?? 0;

      // Calculate metrics using HISTORY (timestamps), not current status
      const totalLeads = leads?.length || 0;
      // Count leads that have EVER reached booked call (history-based)
      const bookedCalls = leads?.filter(l => l.booked_call_at !== null).length || 0;
      
      // Count leads that have reached submitted stage (including those that skipped directly to higher stages)
      const submittedApps = leads?.filter(l => 
        l.submitted_at !== null || 
        l.approved_at !== null || 
        l.issued_at !== null ||
        ['submitted', 'approved', 'issued paid'].includes(l.status?.toLowerCase() || '')
      ).length || 0;
      
      // Count leads that have EVER reached issued (history-based)
      const issuedPaidCount = leads?.filter(l => 
        l.issued_at !== null || 
        l.status?.toLowerCase() === 'issued paid'
      ).length || 0;

      // Apply performance fee to ad spend for accurate ROI calculation
      const adSpendWithPerformance = trackedSpend * (1 + performancePct / 100);
      
      // Commission contract multiplier
      const commissionMultiplier = commissionPct / 100;

      // Calculate premium totals
      // Submitted Business: Count any lead that has reached submitted, approved, or issued paid
      // Use submitted_premium if set, otherwise fall back to target_premium
      // Apply commission contract multiplier
      const totalSubmittedPremium = leads?.reduce((sum, l) => {
        const hasReachedSubmitted = 
          ['submitted', 'approved', 'issued paid'].includes(l.status?.toLowerCase() || '') ||
          l.submitted_at !== null ||
          l.approved_at !== null ||
          l.issued_at !== null;
          
        if (hasReachedSubmitted) {
          const basePremium = Number(l.submitted_premium || l.target_premium || 0);
          return sum + (basePremium * commissionMultiplier);
        }
        return sum;
      }, 0) ?? 0;
      
      // Issued Premium: Use issued_premium if set, otherwise fall back to target_premium
      // Apply commission contract multiplier
      const totalIssuedPremium = leads?.reduce((sum, l) => {
        if (l.issued_at !== null || l.status?.toLowerCase() === 'issued paid') {
          const basePremium = Number(l.issued_premium || l.target_premium || 0);
          return sum + (basePremium * commissionMultiplier);
        }
        return sum;
      }, 0) ?? 0;

      // Calculate percentages
      const bookingPercentage = totalLeads > 0 ? (bookedCalls / totalLeads) * 100 : 0;
      const ltsaPercentage = totalLeads > 0 ? (submittedApps / totalLeads) * 100 : 0;

      // Cost metrics (use raw spend for cost metrics, performance-adjusted for ROI)
      const cpl = totalLeads > 0 ? adSpendWithPerformance / totalLeads : 0;
      const cpbc = bookedCalls > 0 ? adSpendWithPerformance / bookedCalls : 0;
      const ltsaCost = submittedApps > 0 ? adSpendWithPerformance / submittedApps : 0;

      // ALPHA ROI: (Issued Premium - Ad Spend with performance) / Ad Spend with performance * 100
      const alphaRoi = adSpendWithPerformance > 0 
        ? ((totalIssuedPremium - adSpendWithPerformance) / adSpendWithPerformance) * 100 
        : 0;

      return {
        totalLeads,
        bookedCalls,
        bookingPercentage,
        cpl,
        cpbc,
        adSpend: adSpendWithPerformance, // Return spend with performance fee
        submittedApps,
        ltsaCost,
        ltsaPercentage,
        totalSubmittedPremium,
        totalIssuedPremium,
        issuedPaidCount,
        alphaRoi,
      } as LeadMetrics;
    },
    enabled: !!clientId,
  });
}

// Update client metrics based on lead counts (history-based)
export function useUpdateClientMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      // Fetch client and wallet data in parallel
      const [clientResult, walletResult] = await Promise.all([
        supabase
          .from('clients')
          .select('agent_id')
          .eq('id', clientId)
          .single(),
        supabase
          .from('client_wallets')
          .select('tracking_start_date')
          .eq('client_id', clientId)
          .maybeSingle()
      ]);

      if (!clientResult.data?.agent_id) throw new Error('Client not found or no agent_id');

      const agentId = clientResult.data.agent_id;
      const trackingStartDate = walletResult.data?.tracking_start_date;

      // Build queries
      let leadsQuery = supabase
        .from('leads')
        .select('id, status, booked_call_at, submitted_at')
        .eq('agent_id', agentId);

      let spendQuery = supabase
        .from('ad_spend_daily')
        .select('cost')
        .eq('client_id', clientId);

      if (trackingStartDate) {
        leadsQuery = leadsQuery.gte('lead_date', trackingStartDate);
        spendQuery = spendQuery.gte('spend_date', trackingStartDate);
      }

      // Fetch leads and spend in parallel
      const [leadsResult, spendResult] = await Promise.all([
        leadsQuery,
        spendQuery
      ]);

      const leads = leadsResult.data;
      const spendData = spendResult.data;
      const trackedSpend = spendData?.reduce((sum, day) => sum + Number(day.cost || 0), 0) ?? 0;

      // History-based counts
      const totalLeads = leads?.length || 0;
      const bookedCalls = leads?.filter(l => l.booked_call_at !== null).length || 0;
      const submittedApps = leads?.filter(l => l.submitted_at !== null).length || 0;

      // Calculate metrics using tracked spend
      const cpl = totalLeads > 0 ? trackedSpend / totalLeads : 0;
      const cpbc = bookedCalls > 0 ? trackedSpend / bookedCalls : 0;
      const ltsaCost = submittedApps > 0 ? trackedSpend / submittedApps : 0;
      const bookingPercentage = totalLeads > 0 ? (bookedCalls / totalLeads) * 100 : 0;
      const ltsaPercentage = totalLeads > 0 ? (submittedApps / totalLeads) * 100 : 0;

      // Update client record with tracked spend as mtd_ad_spend for display
      const { error } = await supabase
        .from('clients')
        .update({
          mtd_leads: totalLeads,
          booked_calls: bookedCalls,
          applications: submittedApps,
          mtd_ad_spend: Math.round(trackedSpend * 100) / 100,
          cpl: Math.round(cpl * 100) / 100,
          cpba: Math.round(cpbc * 100) / 100, // Using cpba column for CPBC value
        })
        .eq('id', clientId);

      if (error) throw error;

      return { 
        totalLeads, 
        bookedCalls, 
        submittedApps, 
        cpl, 
        cpbc, 
        ltsaCost, 
        bookingPercentage, 
        ltsaPercentage 
      };
    },
    onSuccess: (_, clientId) => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['lead-metrics', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

// Get client ID from agent ID
export async function getClientIdFromAgentId(agentId: string): Promise<string | null> {
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('agent_id', agentId)
    .maybeSingle();
  
  return data?.id || null;
}
