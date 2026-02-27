import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, differenceInDays, differenceInMonths } from 'date-fns';

interface CEOBoardMetrics {
  // Financial Metrics
  managementFeeRevenueMTD: number;
  adSpendDepositsCollected: number;
  performanceFeeRevenue: number;
  totalRevenue: number;
  averageClientLTV: number;
  averageClientLifespan: number;
  profitMTD: number;
  profitProjected: number;
  profitMargin: number;
  churnCount: number;
  churnRate: number;
  activeAgentsCount: number;
  
  // Goals
  revenueGoal: number;
  profitGoal: number;
  
  // Data availability flags
  needsSetup: string[];
}

export function useCEOBoardData() {
  return useQuery({
    queryKey: ['ceo-board-data'],
    queryFn: async (): Promise<CEOBoardMetrics> => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const daysElapsed = differenceInDays(now, monthStart) + 1;
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      
      const needsSetup: string[] = [];

      // Fetch billing records for revenue calculations
      const { data: billingRecords } = await supabase
        .from('billing_records')
        .select('*')
        .eq('status', 'paid')
        .gte('paid_at', monthStart.toISOString());

      // Fetch all clients with relevant fields
      const { data: allClients } = await supabase
        .from('clients')
        .select('id, name, start_date, deleted_at, created_at, status, commission_contract_percent, historical_total_paid, end_date, profit_margin');

      // Fetch ALL billing records for LTV calculation (not just MTD)
      const { data: allBillingRecords } = await supabase
        .from('billing_records')
        .select('client_id, amount, status')
        .eq('status', 'paid');

      // Fetch performance percentage from settings
      const { data: perfSettings } = await supabase
        .from('onboarding_settings')
        .select('setting_value')
        .eq('setting_key', 'performance_percentage')
        .maybeSingle();

      // Fetch revenue and profit goals
      const { data: revenueGoalSetting } = await supabase
        .from('onboarding_settings')
        .select('setting_value')
        .eq('setting_key', 'revenue_goal_mtd')
        .maybeSingle();

      const { data: profitGoalSetting } = await supabase
        .from('onboarding_settings')
        .select('setting_value')
        .eq('setting_key', 'profit_goal_mtd')
        .maybeSingle();

      const perfValue = perfSettings?.setting_value;
      const performancePercentage = typeof perfValue === 'number' ? perfValue : 
        (typeof perfValue === 'string' ? parseFloat(perfValue) : 10);

      // Parse goals with defaults
      const rawRevenueGoal = revenueGoalSetting?.setting_value;
      const rawProfitGoal = profitGoalSetting?.setting_value;
      const revenueGoal = typeof rawRevenueGoal === 'number' ? rawRevenueGoal : 
        (typeof rawRevenueGoal === 'string' ? parseFloat(rawRevenueGoal) : 50000);
      const profitGoal = typeof rawProfitGoal === 'number' ? rawProfitGoal : 
        (typeof rawProfitGoal === 'string' ? parseFloat(rawProfitGoal) : 25000);

      // === FINANCIAL METRICS ===
      
      // Management Fee Revenue MTD
      const managementFees = billingRecords?.filter(r => r.billing_type === 'management') || [];
      const managementFeeRevenueMTD = managementFees.reduce((sum, r) => sum + (r.amount || 0), 0);

      // Ad Spend Deposits Collected
      const adSpendDeposits = billingRecords?.filter(r => r.billing_type === 'ad_spend') || [];
      const adSpendDepositsCollected = adSpendDeposits.reduce((sum, r) => sum + (r.amount || 0), 0);

      // Performance Fee Revenue (percentage of ad spend deposits collected)
      const performanceFeeRevenue = adSpendDepositsCollected * (performancePercentage / 100);

      // Total Revenue (all money collected from clients)
      const totalRevenue = managementFeeRevenueMTD + adSpendDepositsCollected;
      
      // Profit MTD (money we keep = management fee + performance fee)
      const profitMTD = managementFeeRevenueMTD + performanceFeeRevenue;
      
      // Projected Profit
      const profitProjected = daysElapsed > 0 
        ? (profitMTD / daysElapsed) * daysInMonth 
        : 0;
      
      // Profit Margin (profit / revenue * 100)
      const profitMargin = totalRevenue > 0 ? (profitMTD / totalRevenue) * 100 : 0;

      // Active Agents Count
      const activeAgentsCount = allClients?.filter(c => c.status === 'active' && !c.deleted_at).length || 0;

      // Average Client LTV & Lifespan
      const activeClients = allClients?.filter(c => !c.deleted_at) || [];
      const clientsWithStartDate = allClients?.filter(c => c.start_date) || [];
      
      // Default profit margin for LTV calculation
      const DEFAULT_PROFIT_MARGIN = 50;
      
      let averageClientLTV = 0;
      let averageClientLifespan = 0;
      
      if (clientsWithStartDate.length > 0) {
        // Calculate average lifespan in months using end_date (if set), deleted_at, or now
        const lifespans = clientsWithStartDate.map(c => {
          const start = new Date(c.start_date!);
          let end: Date;
          if (c.end_date) {
            end = new Date(c.end_date);
          } else if (c.deleted_at) {
            end = new Date(c.deleted_at);
          } else {
            end = now;
          }
          return differenceInMonths(end, start) || 1;
        });
        averageClientLifespan = lifespans.reduce((a, b) => a + b, 0) / lifespans.length;
        
        // Calculate Profit LTV for each client
        const clientProfitLTVs = clientsWithStartDate.map(c => {
          const historicalPaid = c.historical_total_paid || 0;
          const billingPaid = allBillingRecords
            ?.filter(r => r.client_id === c.id)
            .reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
          const totalPaid = historicalPaid + billingPaid;
          const margin = c.profit_margin ?? DEFAULT_PROFIT_MARGIN;
          return totalPaid * (margin / 100);
        });
        
        averageClientLTV = clientProfitLTVs.length > 0 
          ? clientProfitLTVs.reduce((a, b) => a + b, 0) / clientProfitLTVs.length 
          : 0;
      } else {
        needsSetup.push('Client Start Dates');
      }

      // Churn Count & Rate
      const churnedThisMonth = allClients?.filter(c => 
        c.deleted_at && 
        new Date(c.deleted_at).getMonth() === now.getMonth() &&
        new Date(c.deleted_at).getFullYear() === now.getFullYear()
      ) || [];
      const churnCount = churnedThisMonth.length;
      const activeAtMonthStart = activeClients.length + churnCount;
      const churnRate = activeAtMonthStart > 0 ? (churnCount / activeAtMonthStart) * 100 : 0;

      return {
        managementFeeRevenueMTD,
        adSpendDepositsCollected,
        performanceFeeRevenue,
        totalRevenue,
        averageClientLTV,
        averageClientLifespan,
        profitMTD,
        profitProjected,
        profitMargin,
        churnCount,
        churnRate,
        activeAgentsCount,
        revenueGoal,
        profitGoal,
        needsSetup,
      };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

// Hook to update goals
export function useUpdateCEOGoals() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: 'revenue_goal_mtd' | 'profit_goal_mtd'; value: number }) => {
      // Check if setting exists
      const { data: existing } = await supabase
        .from('onboarding_settings')
        .select('id')
        .eq('setting_key', key)
        .maybeSingle();
      
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('onboarding_settings')
          .update({ setting_value: String(value), updated_at: new Date().toISOString() })
          .eq('setting_key', key);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('onboarding_settings')
          .insert({ setting_key: key, setting_value: String(value) });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ceo-board-data'] });
    },
  });
}
