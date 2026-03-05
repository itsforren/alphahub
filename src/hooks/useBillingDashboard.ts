import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, addDays, differenceInDays, parseISO, isValid, format, getDaysInMonth, startOfMonth, subMonths } from 'date-fns';

export interface BillingDashboardStats {
  managementFeesCollected: number;
  managementFeesExpected: number;
  managementFeesPending: number;
  adSpendCollected: number;
  adSpendExpected: number;    // Sum of wallet recharge amounts for auto-billing clients
  adSpendPending: number;     // Count of auto-billing clients
  clientsNeedingAttention: number;
  overdueCount: number;
  failedPaymentsCount: number;
  lowWalletCount: number;
  disputesCount: number;
}

export interface WalletPipelineItem {
  clientId: string;
  clientName: string;
  threshold: number;
  autoChargeAmount: number | null;
  autoBillingEnabled: boolean;
  lastAutoChargeAt: string | null;
  lastChargeFailedAt: string | null;
}

export interface RevenueIntelligence {
  // Month-to-date actuals
  mtdAdSpend: number;
  mtdManagementFees: number;
  // Last month actuals (for comparison)
  lastMonthAdSpend: number;
  lastMonthManagementFees: number;
  // Monthly ceiling from wallet thresholds (structural max per month)
  monthlyAdSpendCeiling: number;
  // Projected management fees = ceiling × (performancePct / 100)
  projectedManagementFees: number;
  // MTD run-rate projection = (MTD / days_elapsed) × days_in_month
  runRateAdSpend: number;
  runRateManagementFees: number;
  // Settings
  performancePct: number;
  autoClientCount: number;
  currentMonth: string; // e.g. "March 2026"
  daysElapsed: number;
  daysInMonth: number;
}

export interface UpcomingPayment {
  id: string;
  clientId: string;
  clientName: string;
  dueDate: string;
  billingType: 'ad_spend' | 'management';
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes: string | null;
  recurrenceType: string | null;
  daysUntilDue: number;
  statusColor: 'green' | 'yellow' | 'red' | 'gray';
}

export interface FailedPayment {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  billingType: 'ad_spend' | 'management';
  lastError: string | null;
  attempts: number;
  dueDate: string | null;
}

export interface Dispute {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  status: string;
  reason: string | null;
  evidenceDeadline: string | null;
  createdAt: string;
}

function getStatusColor(dueDate: string | null, status: string): 'green' | 'yellow' | 'red' | 'gray' {
  if (status === 'cancelled' || status === 'paid') return 'gray';
  if (status === 'overdue') return 'red';
  
  if (!dueDate) return 'gray';
  
  const parsedDate = parseISO(dueDate);
  if (!isValid(parsedDate)) return 'gray';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDateObj = new Date(parsedDate);
  dueDateObj.setHours(0, 0, 0, 0);
  
  const daysUntil = differenceInDays(dueDateObj, today);
  
  if (daysUntil < 0) return 'red'; // Overdue
  if (daysUntil <= 2) return 'red'; // 0-2 days
  if (daysUntil <= 7) return 'yellow'; // 3-7 days
  return 'green'; // 8+ days
}

function getDaysUntilDue(dueDate: string | null): number {
  if (!dueDate) return 0;
  const parsedDate = parseISO(dueDate);
  if (!isValid(parsedDate)) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDateObj = new Date(parsedDate);
  dueDateObj.setHours(0, 0, 0, 0);
  
  return differenceInDays(dueDateObj, today);
}

export function useBillingDashboardStats() {
  return useQuery({
    queryKey: ['billing-dashboard-stats'],
    queryFn: async (): Promise<BillingDashboardStats> => {
      const now = new Date();
      const mtdStart = startOfMonth(now).toISOString(); // First of current month
      const thirtyDaysAhead = addDays(now, 30).toISOString();
      const nowIso = now.toISOString();

      // Collected month-to-date (paid_at since start of current month)
      const { data: collectedRecords, error: collectedError } = await supabase
        .from('billing_records')
        .select('billing_type, amount')
        .eq('status', 'paid')
        .gte('paid_at', mtdStart)
        .lte('paid_at', nowIso);

      if (collectedError) throw collectedError;

      // Upcoming in the next 30 days (pending/overdue, due_date within window)
      const { data: upcomingRecords, error: upcomingError } = await supabase
        .from('billing_records')
        .select('billing_type, amount, status, due_date, last_charge_error, charge_attempts')
        .in('status', ['pending', 'overdue'])
        .lte('due_date', thirtyDaysAhead);

      if (upcomingError) throw upcomingError;

      let managementFeesCollected = 0;
      let managementFeesExpected = 0;
      let managementFeesPending = 0;
      let adSpendCollected = 0;

      for (const record of collectedRecords || []) {
        if (record.billing_type === 'management') {
          managementFeesCollected += record.amount || 0;
        } else if (record.billing_type === 'ad_spend') {
          adSpendCollected += record.amount || 0;
        }
      }

      for (const record of upcomingRecords || []) {
        const amount = record.amount || 0;
        if (record.billing_type === 'management') {
          managementFeesExpected += amount;
          managementFeesPending += 1;
        }
        // Ad spend pending records are not meaningful (charge-first flow — records only
        // exist after charge fires). Pipeline is calculated from wallet thresholds below.
      }

      // Ad spend pipeline: sum of recharge amounts for all auto-billing clients.
      // This is the true "expected" ad spend revenue — what will come in as clients spend down.
      const { data: autoWallets } = await supabase
        .from('client_wallets')
        .select('low_balance_threshold, auto_charge_amount, auto_billing_enabled')
        .eq('auto_billing_enabled', true);

      const adSpendExpected = (autoWallets || []).reduce((sum, w) => {
        return sum + (w.auto_charge_amount || w.low_balance_threshold || 0);
      }, 0);
      const adSpendPending = (autoWallets || []).length;

      // Overdue count: explicit overdue status + pending records that are past due
      const { count: overdueStatusCount } = await supabase
        .from('billing_records')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'overdue')
        .is('archived_at', null);

      const { count: pastDuePendingCount } = await supabase
        .from('billing_records')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('due_date', now.toISOString().split('T')[0])
        .is('archived_at', null);

      const overdueCount = (overdueStatusCount || 0) + (pastDuePendingCount || 0);

      // Active disputes count
      const { count: disputesCount } = await supabase
        .from('disputes')
        .select('*', { count: 'exact', head: true })
        .in('status', ['needs_response', 'under_review', 'warning_needs_response', 'warning_under_review']);

      // Failed payments with errors (not archived)
      const { count: failedCount } = await supabase
        .from('billing_records')
        .select('*', { count: 'exact', head: true })
        .not('last_charge_error', 'is', null)
        .not('status', 'eq', 'paid')
        .is('archived_at', null);

      // Low wallet count: auto-billing wallets with a recent charge failure (last 7 days)
      const sevenDaysAgo = subDays(now, 7).toISOString();
      const { count: lowWalletCount } = await supabase
        .from('client_wallets')
        .select('*', { count: 'exact', head: true })
        .eq('auto_billing_enabled', true)
        .not('last_charge_failed_at', 'is', null)
        .gte('last_charge_failed_at', sevenDaysAgo);

      const totalFailed = failedCount || 0;
      const clientsNeedingAttention = overdueCount + totalFailed + (disputesCount || 0) + (lowWalletCount || 0);

      return {
        managementFeesCollected,
        managementFeesExpected,
        managementFeesPending,
        adSpendCollected,
        adSpendExpected,
        adSpendPending,
        clientsNeedingAttention,
        overdueCount,
        failedPaymentsCount: totalFailed,
        lowWalletCount: lowWalletCount || 0,
        disputesCount: disputesCount || 0,
      };
    },
    refetchInterval: 60000,
  });
}

export function useUpcomingPayments() {
  return useQuery({
    queryKey: ['billing-dashboard-upcoming'],
    queryFn: async (): Promise<UpcomingPayment[]> => {
      // Get pending and overdue billing records with client info including client_name
      const thirtyDaysAhead = addDays(new Date(), 30).toISOString();

      const { data, error } = await supabase
        .from('billing_records')
        .select(`
          id,
          client_id,
          client_name,
          billing_type,
          amount,
          status,
          due_date,
          notes,
          recurrence_type
        `)
        .in('status', ['pending', 'overdue'])
        .lte('due_date', thirtyDaysAhead)
        .order('due_date', { ascending: true })
        .limit(100);

      if (error) throw error;

      // Fetch all clients for fallback lookup
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name');

      // Create map using string comparison
      const clientMap = new Map((clients || []).map(c => [c.id, c.name]));

      return (data || []).map(record => {
        const daysUntilDue = getDaysUntilDue(record.due_date);
        // Priority: client_name column > client lookup > fallback
        const clientName = record.client_name || clientMap.get(record.client_id) || 'Deleted Client';
        return {
          id: record.id,
          clientId: record.client_id,
          clientName,
          dueDate: record.due_date || '',
          billingType: record.billing_type as 'ad_spend' | 'management',
          amount: record.amount || 0,
          status: record.status as 'pending' | 'paid' | 'overdue' | 'cancelled',
          notes: record.notes,
          recurrenceType: record.recurrence_type,
          daysUntilDue,
          statusColor: getStatusColor(record.due_date, record.status),
        };
      });
    },
    refetchInterval: 60000,
  });
}

export function useFailedPayments() {
  return useQuery({
    queryKey: ['billing-dashboard-failed'],
    queryFn: async (): Promise<FailedPayment[]> => {
      const { data, error } = await supabase
        .from('billing_records')
        .select(`
          id,
          client_id,
          client_name,
          billing_type,
          amount,
          due_date,
          charge_attempts,
          last_charge_error
        `)
        .not('last_charge_error', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch all clients for fallback lookup
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name');

      const clientMap = new Map((clients || []).map(c => [c.id, c.name]));

      return (data || []).map(record => ({
        id: record.id,
        clientId: record.client_id,
        clientName: record.client_name || clientMap.get(record.client_id) || 'Deleted Client',
        amount: record.amount || 0,
        billingType: record.billing_type as 'ad_spend' | 'management',
        lastError: record.last_charge_error,
        attempts: record.charge_attempts || 0,
        dueDate: record.due_date,
      }));
    },
    refetchInterval: 60000,
  });
}

export function useActiveDisputes() {
  return useQuery({
    queryKey: ['billing-dashboard-disputes'],
    queryFn: async (): Promise<Dispute[]> => {
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          id,
          client_id,
          amount,
          status,
          reason,
          evidence_due_by,
          created_at
        `)
        .in('status', ['needs_response', 'under_review', 'warning_needs_response', 'warning_under_review'])
        .order('evidence_due_by', { ascending: true })
        .limit(20);

      if (error) throw error;

      // Fetch all clients and filter in memory since client_id may be text
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name');

      const clientMap = new Map((clients || []).map(c => [c.id, c.name]));

      return (data || []).map(dispute => ({
        id: dispute.id,
        clientId: dispute.client_id || '',
        clientName: dispute.client_id ? (clientMap.get(dispute.client_id) || 'Unknown Client') : 'Unknown Client',
        amount: (dispute.amount || 0) / 100, // Convert from cents
        status: dispute.status,
        reason: dispute.reason,
        evidenceDeadline: dispute.evidence_due_by,
        createdAt: dispute.created_at,
      }));
    },
    refetchInterval: 60000,
  });
}

// Retry a failed billing record — calls create-stripe-invoice again
export function useRetryPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (billingRecordId: string) => {
      const { data, error } = await supabase.functions.invoke('create-stripe-invoice', {
        body: { billing_record_id: billingRecordId },
      });
      if (error) throw new Error(error.message || 'Retry failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-dashboard-failed'] });
      queryClient.invalidateQueries({ queryKey: ['billing-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['billing-dashboard-upcoming'] });
    },
  });
}

// Full revenue intelligence — MTD actuals + monthly projections from wallet thresholds
export function useRevenueIntelligence() {
  return useQuery({
    queryKey: ['revenue-intelligence'],
    queryFn: async (): Promise<RevenueIntelligence> => {
      const now = new Date();
      const mtdStart = startOfMonth(now).toISOString();
      const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
      const lastMonthEnd = startOfMonth(now).toISOString(); // exclusive upper bound
      const nowIso = now.toISOString();
      const daysElapsed = now.getDate(); // 1-31
      const daysInMonth = getDaysInMonth(now);
      const currentMonth = format(now, 'MMMM yyyy');

      // MTD billing records
      const { data: mtdRecords } = await supabase
        .from('billing_records')
        .select('billing_type, amount')
        .eq('status', 'paid')
        .gte('paid_at', mtdStart)
        .lte('paid_at', nowIso);

      // Last month billing records (for comparison)
      const { data: lastMonthRecords } = await supabase
        .from('billing_records')
        .select('billing_type, amount')
        .eq('status', 'paid')
        .gte('paid_at', lastMonthStart)
        .lt('paid_at', lastMonthEnd);

      // Auto-billing wallets for ceiling calculation
      const { data: autoWallets } = await supabase
        .from('client_wallets')
        .select('low_balance_threshold, auto_charge_amount, auto_billing_enabled')
        .eq('auto_billing_enabled', true);

      // Performance percentage from settings
      const { data: perfSetting } = await supabase
        .from('onboarding_settings')
        .select('setting_value')
        .eq('setting_key', 'performance_percentage')
        .maybeSingle();

      const performancePct = perfSetting?.setting_value != null
        ? Number(perfSetting.setting_value)
        : 0;

      // Calculate MTD actuals
      let mtdAdSpend = 0;
      let mtdManagementFees = 0;
      for (const r of mtdRecords || []) {
        if (r.billing_type === 'ad_spend') mtdAdSpend += r.amount || 0;
        if (r.billing_type === 'management') mtdManagementFees += r.amount || 0;
      }

      // Calculate last month actuals
      let lastMonthAdSpend = 0;
      let lastMonthManagementFees = 0;
      for (const r of lastMonthRecords || []) {
        if (r.billing_type === 'ad_spend') lastMonthAdSpend += r.amount || 0;
        if (r.billing_type === 'management') lastMonthManagementFees += r.amount || 0;
      }

      // Monthly ceiling from wallet thresholds
      const monthlyAdSpendCeiling = (autoWallets || []).reduce((sum, w) => {
        return sum + (w.auto_charge_amount || w.low_balance_threshold || 0);
      }, 0);
      const autoClientCount = (autoWallets || []).length;

      // Projected management fees = ceiling × (perf% / 100)
      const projectedManagementFees = performancePct > 0
        ? monthlyAdSpendCeiling * (performancePct / 100)
        : 0;

      // MTD run-rate projection (linear extrapolation to end of month)
      const runRateAdSpend = daysElapsed > 0
        ? (mtdAdSpend / daysElapsed) * daysInMonth
        : 0;
      const runRateManagementFees = daysElapsed > 0
        ? (mtdManagementFees / daysElapsed) * daysInMonth
        : 0;

      return {
        mtdAdSpend,
        mtdManagementFees,
        lastMonthAdSpend,
        lastMonthManagementFees,
        monthlyAdSpendCeiling,
        projectedManagementFees,
        runRateAdSpend,
        runRateManagementFees,
        performancePct,
        autoClientCount,
        currentMonth,
        daysElapsed,
        daysInMonth,
      };
    },
    refetchInterval: 60000,
  });
}

// All auto-billing wallets — used to show the ad spend revenue pipeline on admin dashboard
export function useWalletPipeline() {
  return useQuery({
    queryKey: ['wallet-pipeline'],
    queryFn: async (): Promise<WalletPipelineItem[]> => {
      const { data: wallets, error } = await supabase
        .from('client_wallets')
        .select('client_id, low_balance_threshold, auto_charge_amount, auto_billing_enabled, last_auto_charge_at, last_charge_failed_at')
        .eq('auto_billing_enabled', true)
        .order('last_auto_charge_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const { data: clients } = await supabase
        .from('clients')
        .select('id, name');

      const clientMap = new Map((clients || []).map(c => [c.id, c.name]));

      return (wallets || []).map(w => ({
        clientId: w.client_id,
        clientName: clientMap.get(w.client_id) || 'Unknown Client',
        threshold: w.low_balance_threshold || 0,
        autoChargeAmount: w.auto_charge_amount,
        autoBillingEnabled: w.auto_billing_enabled ?? false,
        lastAutoChargeAt: w.last_auto_charge_at,
        lastChargeFailedAt: w.last_charge_failed_at,
      }));
    },
    refetchInterval: 60000,
  });
}

// Global Stripe sync — reconciles all pending/overdue records against Stripe
export function useSyncAllStripe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-stripe-charges', {
        body: {},
      });
      if (error) throw new Error(error.message || 'Sync failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['billing-dashboard-failed'] });
      queryClient.invalidateQueries({ queryKey: ['billing-dashboard-upcoming'] });
    },
  });
}
