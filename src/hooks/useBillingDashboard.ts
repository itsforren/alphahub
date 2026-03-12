import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  subDays,
  addDays,
  differenceInDays,
  parseISO,
  isValid,
  format,
  getDaysInMonth,
  startOfMonth,
  subMonths,
} from 'date-fns';

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

export interface ManagementFeeGap {
  clientId: string;
  clientName: string;
  managementFee: number;
  billingFrequency: string;
  hasStripeSubscription: boolean;
  lastPaidAt: string | null;
  status: 'missing_subscription' | 'no_recent_payment' | 'ok';
}

export interface AdSpendIntelligence {
  // Actual Google Ads spend MTD from ad_spend_daily (excluding ignored campaigns)
  googleAdsSpendMtd: number;
  // Total wallet deposits MTD (Stripe ad_spend charges)
  walletDepositsMtd: number;
  // Sum of current wallet balances across all active clients
  totalWalletBalance: number;
  // Total Stripe ad spend + management charges MTD
  totalStripeCharged: number;
  // Management fees collected MTD
  managementCharged: number;
  // Overall health
  overallStatus: 'green' | 'yellow' | 'red';
  // Per-client breakdown
  clients: Array<{
    clientId: string;
    clientName: string;
    googleAdsSpend: number;
    walletDeposits: number;
    walletBalance: number;
    status: 'green' | 'yellow' | 'red';
  }>;
  // Excluded campaigns
  excludedCampaignIds: string[];
  ignoredCampaignCount: number;
  // Period info
  currentMonth: string;
  daysElapsed: number;
  daysInMonth: number;
}

export interface RevenueIntelligence {
  // Period actuals (current month MTD or selected past month)
  mtdAdSpend: number;
  mtdManagementFees: number;
  // Previous period actuals (for comparison)
  lastMonthAdSpend: number;
  lastMonthManagementFees: number;
  // Monthly ceiling from wallet thresholds (structural max per cycle)
  monthlyAdSpendCeiling: number;
  // Subscription-based management fee projection (current active subs)
  projectedManagementFees: number;
  activeSubscriptionCount: number;
  // Expected management revenue from clients.management_fee (ground truth)
  expectedManagementRevenue: number;
  expectedManagementClientCount: number;
  managementFeeGapCount: number;
  managementFeeGaps: ManagementFeeGap[];
  // MTD run-rate projection = (MTD / days_elapsed) × days_in_month
  runRateAdSpend: number;
  runRateManagementFees: number;
  // Settings
  performancePct: number;
  autoClientCount: number;
  currentMonth: string; // e.g. "March 2026"
  daysElapsed: number;
  daysInMonth: number;
  overdueCount: number;
  failedPaymentsCount: number;
  disputesCount: number;
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

export interface OverdueBillingRecord {
  id: string;
  clientId: string;
  clientName: string;
  dueDate: string;
  billingType: 'ad_spend' | 'management';
  amount: number;
  status: 'pending' | 'overdue';
  notes: string | null;
  recurrenceType: string | null;
  daysOverdue: number;
  stripeInvoiceId: string | null;
  stripeSubscriptionId: string | null;
  stripePaymentIntentId: string | null;
  stripeAccount: string | null;
  paymentLink: string | null;
  lastChargeError: string | null;
}

export interface UpcomingBillingRecord {
  id: string;
  clientId: string;
  clientName: string;
  dueDate: string;
  billingType: 'ad_spend' | 'management';
  amount: number;
  notes: string | null;
  recurrenceType: string | null;
  daysUntilDue: number;
  stripeInvoiceId: string | null;
  stripeSubscriptionId: string | null;
  stripePaymentIntentId: string | null;
  stripeAccount: string | null;
  paymentLink: string | null;
}

export interface PaidBillingRecord {
  id: string;
  clientId: string;
  clientName: string;
  paidAt: string;
  dueDate: string | null;
  billingType: 'ad_spend' | 'management';
  amount: number;
  notes: string | null;
  recurrenceType: string | null;
  stripeInvoiceId: string | null;
  stripeSubscriptionId: string | null;
  stripePaymentIntentId: string | null;
  stripeAccount: string | null;
  paymentLink: string | null;
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

  if (daysUntil < 0) return 'red';
  if (daysUntil <= 2) return 'red';
  if (daysUntil <= 7) return 'yellow';
  return 'green';
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

// Fetch paid billing records using two-query union (handles paid_at IS NULL edge case)
async function fetchPaidRecords(
  selectFields: string,
  windowStart: string,
  windowEnd: string,
) {
  const [withPaidAt, withoutPaidAt] = await Promise.all([
    supabase
      .from('billing_records')
      .select(selectFields)
      .eq('status', 'paid')
      .not('paid_at', 'is', null)
      .gte('paid_at', windowStart)
      .lte('paid_at', windowEnd),
    supabase
      .from('billing_records')
      .select(selectFields + ', updated_at')
      .eq('status', 'paid')
      .is('paid_at', null)
      .gte('updated_at', windowStart)
      .lte('updated_at', windowEnd),
  ]);
  return [...(withPaidAt.data || []), ...(withoutPaidAt.data || [])];
}

export function useBillingDashboardStats() {
  return useQuery({
    queryKey: ['billing-dashboard-stats'],
    queryFn: async (): Promise<BillingDashboardStats> => {
      const now = new Date();
      const mtdStart = startOfMonth(now).toISOString();
      const thirtyDaysAhead = addDays(now, 30).toISOString();
      const nowIso = now.toISOString();

      // Collected month-to-date — two-query union handles paid_at IS NULL edge case
      const collectedRecords = await fetchPaidRecords('billing_type, amount', mtdStart, nowIso);

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

      for (const record of collectedRecords) {
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
      }

      // Ad spend pipeline: sum of recharge amounts for all auto-billing clients
      const { data: autoWallets } = await supabase
        .from('client_wallets')
        .select('low_balance_threshold, auto_charge_amount, auto_billing_enabled')
        .eq('auto_billing_enabled', true);

      const adSpendExpected = (autoWallets || []).reduce((sum, w) => {
        return sum + (w.auto_charge_amount || w.low_balance_threshold || 0);
      }, 0);
      const adSpendPending = (autoWallets || []).length;

      // Overdue count: explicit overdue status + pending records that are past due
      // Fetch active client IDs to filter out non-active clients
      const { data: activeClientsForStats } = await supabase
        .from('clients')
        .select('id, status')
        .in('status', ['active', 'onboarding']);
      const activeIdsForStats = new Set(
        (activeClientsForStats || []).filter((c: any) => c.status === 'active' || c.status === 'onboarding').map((c: any) => c.id)
      );

      const { data: overdueStatusData } = await supabase
        .from('billing_records')
        .select('client_id')
        .eq('status', 'overdue')
        .is('archived_at', null);

      const { data: pastDuePendingData } = await supabase
        .from('billing_records')
        .select('client_id')
        .eq('status', 'pending')
        .lt('due_date', now.toISOString().split('T')[0])
        .is('archived_at', null);

      const overdueCount =
        (overdueStatusData || []).filter(r => activeIdsForStats.has(r.client_id)).length +
        (pastDuePendingData || []).filter(r => activeIdsForStats.has(r.client_id)).length;

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
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

// Legacy hook — kept for any existing usage; use useOverdueBillingRecords + useUpcomingBillingRecords instead
export function useUpcomingPayments() {
  return useQuery({
    queryKey: ['billing-dashboard-upcoming'],
    queryFn: async (): Promise<UpcomingPayment[]> => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const thirtyDaysAhead = addDays(now, 30).toISOString();

      const { data, error } = await supabase
        .from('billing_records')
        .select('id, client_id, client_name, billing_type, amount, status, due_date, notes, recurrence_type')
        .eq('status', 'pending')
        .gte('due_date', todayStr)
        .lte('due_date', thirtyDaysAhead)
        .is('archived_at', null)
        .order('due_date', { ascending: true })
        .limit(100);

      if (error) throw error;

      const { data: clients } = await supabase.from('clients').select('id, name');
      const clientMap = new Map((clients || []).map(c => [c.id, c.name]));

      return (data || []).map(record => {
        const daysUntilDue = getDaysUntilDue(record.due_date);
        const clientName = record.client_name || clientMap.get(record.client_id) || 'Former Client';
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
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

// All overdue records — past-due pending + explicit overdue status, no date cap
// Only includes records for ACTIVE clients (excludes cancelled, inactive, paused, etc.)
export function useOverdueBillingRecords() {
  return useQuery({
    queryKey: ['billing-overdue'],
    queryFn: async (): Promise<OverdueBillingRecord[]> => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      const overdueFields = 'id, client_id, client_name, billing_type, amount, status, due_date, notes, recurrence_type, stripe_invoice_id, stripe_subscription_id, stripe_payment_intent_id, stripe_account, payment_link, last_charge_error';

      const [overdueStatus, pendingPastDue, clientsRes] = await Promise.all([
        supabase
          .from('billing_records')
          .select(overdueFields)
          .eq('status', 'overdue')
          .is('archived_at', null)
          .order('due_date', { ascending: true })
          .limit(200),
        supabase
          .from('billing_records')
          .select(overdueFields)
          .eq('status', 'pending')
          .lt('due_date', todayStr)
          .is('archived_at', null)
          .order('due_date', { ascending: true })
          .limit(200),
        supabase.from('clients').select('id, name, status'),
      ]);

      const clientMap = new Map((clientsRes.data || []).map(c => [c.id, c.name]));
      // Show billing for active + onboarding clients; exclude cancelled, inactive, paused, etc.
      const activeClientIds = new Set(
        (clientsRes.data || []).filter(c => c.status === 'active' || c.status === 'onboarding').map(c => c.id)
      );

      const combined = [...(overdueStatus.data || []), ...(pendingPastDue.data || [])];
      // Deduplicate by id (shouldn't overlap, but be safe)
      const seen = new Set<string>();
      const unique = combined.filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        // Only show overdue records for active clients
        if (!activeClientIds.has(r.client_id)) return false;
        return true;
      });
      // Sort oldest first
      unique.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

      return unique.map(r => {
        const clientName = r.client_name || clientMap.get(r.client_id) || 'Former Client';
        const daysOverdue = r.due_date
          ? Math.max(0, differenceInDays(now, parseISO(r.due_date)))
          : 0;
        return {
          id: r.id,
          clientId: r.client_id,
          clientName,
          dueDate: r.due_date || '',
          billingType: r.billing_type as 'ad_spend' | 'management',
          amount: r.amount || 0,
          status: r.status as 'pending' | 'overdue',
          notes: r.notes,
          recurrenceType: r.recurrence_type,
          daysOverdue,
          stripeInvoiceId: (r as any).stripe_invoice_id ?? null,
          stripeSubscriptionId: (r as any).stripe_subscription_id ?? null,
          stripePaymentIntentId: (r as any).stripe_payment_intent_id ?? null,
          stripeAccount: (r as any).stripe_account ?? null,
          paymentLink: (r as any).payment_link ?? null,
          lastChargeError: (r as any).last_charge_error ?? null,
        };
      });
    },
    refetchInterval: 60000,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

// Upcoming — only future-pending records in the next 30 days
export function useUpcomingBillingRecords() {
  return useQuery({
    queryKey: ['billing-upcoming'],
    queryFn: async (): Promise<UpcomingBillingRecord[]> => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const thirtyDaysAhead = addDays(now, 30).toISOString();

      const upcomingFields = 'id, client_id, client_name, billing_type, amount, due_date, notes, recurrence_type, stripe_invoice_id, stripe_subscription_id, stripe_payment_intent_id, stripe_account, payment_link';

      const { data, error } = await supabase
        .from('billing_records')
        .select(upcomingFields)
        .eq('status', 'pending')
        .gte('due_date', todayStr)
        .lte('due_date', thirtyDaysAhead)
        .is('archived_at', null)
        .order('due_date', { ascending: true })
        .limit(100);

      if (error) throw error;

      const { data: clients } = await supabase.from('clients').select('id, name');
      const clientMap = new Map((clients || []).map(c => [c.id, c.name]));

      return (data || []).map(r => ({
        id: r.id,
        clientId: r.client_id,
        clientName: r.client_name || clientMap.get(r.client_id) || 'Former Client',
        dueDate: r.due_date || '',
        billingType: r.billing_type as 'ad_spend' | 'management',
        amount: r.amount || 0,
        notes: r.notes,
        recurrenceType: r.recurrence_type,
        daysUntilDue: getDaysUntilDue(r.due_date),
        stripeInvoiceId: (r as any).stripe_invoice_id ?? null,
        stripeSubscriptionId: (r as any).stripe_subscription_id ?? null,
        stripePaymentIntentId: (r as any).stripe_payment_intent_id ?? null,
        stripeAccount: (r as any).stripe_account ?? null,
        paymentLink: (r as any).payment_link ?? null,
      }));
    },
    refetchInterval: 60000,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

// Paid records in a given date window (two-query union for paid_at fallback)
export function usePaidBillingRecords(startIso: string, endIso: string) {
  return useQuery({
    queryKey: ['billing-paid', startIso, endIso],
    queryFn: async (): Promise<PaidBillingRecord[]> => {
      const fields = 'id, client_id, client_name, billing_type, amount, paid_at, due_date, notes, recurrence_type, stripe_invoice_id, stripe_subscription_id, stripe_payment_intent_id, stripe_account, payment_link';

      const [withPaidAt, withoutPaidAt] = await Promise.all([
        supabase
          .from('billing_records')
          .select(fields)
          .eq('status', 'paid')
          .not('paid_at', 'is', null)
          .gte('paid_at', startIso)
          .lte('paid_at', endIso)
          .order('paid_at', { ascending: false })
          .limit(200),
        supabase
          .from('billing_records')
          .select(fields + ', updated_at')
          .eq('status', 'paid')
          .is('paid_at', null)
          .gte('updated_at', startIso)
          .lte('updated_at', endIso)
          .order('updated_at', { ascending: false })
          .limit(200),
      ]);

      const { data: clients } = await supabase.from('clients').select('id, name');
      const clientMap = new Map((clients || []).map(c => [c.id, c.name]));

      const combined = [
        ...(withPaidAt.data || []).map((r: any) => ({ ...r, effectiveDate: r.paid_at as string })),
        ...(withoutPaidAt.data || []).map((r: any) => ({ ...r, effectiveDate: r.updated_at as string })),
      ];
      combined.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

      return combined.map(r => ({
        id: r.id,
        clientId: r.client_id,
        clientName: r.client_name || clientMap.get(r.client_id) || 'Former Client',
        paidAt: r.effectiveDate,
        dueDate: r.due_date,
        billingType: r.billing_type as 'ad_spend' | 'management',
        amount: r.amount || 0,
        notes: r.notes,
        recurrenceType: r.recurrence_type,
        stripeInvoiceId: r.stripe_invoice_id ?? null,
        stripeSubscriptionId: r.stripe_subscription_id ?? null,
        stripePaymentIntentId: r.stripe_payment_intent_id ?? null,
        stripeAccount: r.stripe_account ?? null,
        paymentLink: r.payment_link ?? null,
      }));
    },
    refetchInterval: 60000,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useFailedPayments() {
  return useQuery({
    queryKey: ['billing-dashboard-failed'],
    queryFn: async (): Promise<FailedPayment[]> => {
      // Only show unresolved failures: has charge error, not yet paid, not archived
      const [recordsRes, clientsRes] = await Promise.all([
        supabase
          .from('billing_records')
          .select('id, client_id, client_name, billing_type, amount, due_date, charge_attempts, last_charge_error')
          .not('last_charge_error', 'is', null)
          .neq('status', 'paid')
          .neq('status', 'cancelled')
          .is('archived_at', null)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('clients').select('id, name, status'),
      ]);

      if (recordsRes.error) throw recordsRes.error;

      const clientMap = new Map((clientsRes.data || []).map(c => [c.id, c.name]));
      // Show billing for active + onboarding clients; exclude cancelled, inactive, paused, etc.
      const activeClientIds = new Set(
        (clientsRes.data || []).filter(c => c.status === 'active' || c.status === 'onboarding').map(c => c.id)
      );

      // Filter to active clients only
      return (recordsRes.data || [])
        .filter(record => activeClientIds.has(record.client_id))
        .map(record => ({
          id: record.id,
          clientId: record.client_id,
          clientName: record.client_name || clientMap.get(record.client_id) || 'Former Client',
          amount: record.amount || 0,
          billingType: record.billing_type as 'ad_spend' | 'management',
          lastError: record.last_charge_error,
          attempts: record.charge_attempts || 0,
          dueDate: record.due_date,
        }));
    },
    refetchInterval: 60000,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useActiveDisputes() {
  return useQuery({
    queryKey: ['billing-dashboard-disputes'],
    queryFn: async (): Promise<Dispute[]> => {
      const { data, error } = await supabase
        .from('disputes')
        .select('id, client_id, amount, status, reason, evidence_due_by, created_at')
        .in('status', ['needs_response', 'under_review', 'warning_needs_response', 'warning_under_review'])
        .order('evidence_due_by', { ascending: true })
        .limit(20);

      if (error) throw error;

      const { data: clients } = await supabase.from('clients').select('id, name');
      const clientMap = new Map((clients || []).map(c => [c.id, c.name]));

      return (data || []).map(dispute => ({
        id: dispute.id,
        clientId: dispute.client_id || '',
        clientName: dispute.client_id ? (clientMap.get(dispute.client_id) || 'Unknown Client') : 'Unknown Client',
        amount: (dispute.amount || 0) / 100,
        status: dispute.status,
        reason: dispute.reason,
        evidenceDeadline: dispute.evidence_due_by,
        createdAt: dispute.created_at,
      }));
    },
    refetchInterval: 60000,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

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
      queryClient.invalidateQueries({ queryKey: ['billing-overdue'] });
    },
  });
}

export function useArchiveBillingRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (billingRecordId: string) => {
      const { error } = await supabase
        .from('billing_records')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', billingRecordId);
      if (error) throw new Error(error.message || 'Archive failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-overdue'] });
      queryClient.invalidateQueries({ queryKey: ['billing-upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['billing-paid'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-intelligence'] });
      queryClient.invalidateQueries({ queryKey: ['billing-dashboard-stats'] });
    },
  });
}

// Revenue intelligence — MTD actuals + projections. Accepts optional date window for historical months.
export function useRevenueIntelligence(startIso?: string, endIso?: string) {
  return useQuery({
    queryKey: ['revenue-intelligence', startIso, endIso],
    queryFn: async (): Promise<RevenueIntelligence> => {
      const now = new Date();
      const windowStartDate = startIso ? parseISO(startIso) : startOfMonth(now);
      const windowStart = windowStartDate.toISOString();
      const windowEnd = endIso || now.toISOString();

      const daysInMonth = getDaysInMonth(windowStartDate);
      const isCurrentMonth = format(windowStartDate, 'yyyy-MM') === format(now, 'yyyy-MM');
      const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
      const currentMonth = format(windowStartDate, 'MMMM yyyy');

      // Previous period for comparison (one month before windowStart)
      const lastMonthStart = startOfMonth(subMonths(windowStartDate, 1)).toISOString();
      const lastMonthEnd = windowStart;

      // 60-day lookback for management projection (catches monthly + bi-weekly clients)
      const sixtyDaysAgo = subDays(now, 60).toISOString();

      // Fetch MTD actuals, last-month actuals in parallel with other data
      const [mtdRecords, lastMonthRecords, autoWallets, perfSetting, recentMgmtWithPaidAt, recentMgmtWithoutPaidAt, overdueRes, failedRes, disputesRes, activeClientsWithFees] =
        await Promise.all([
          fetchPaidRecords('billing_type, amount', windowStart, windowEnd),
          fetchPaidRecords('billing_type, amount', lastMonthStart, lastMonthEnd),
          supabase
            .from('client_wallets')
            .select('low_balance_threshold, auto_charge_amount, auto_billing_enabled')
            .eq('auto_billing_enabled', true),
          supabase
            .from('onboarding_settings')
            .select('setting_value')
            .eq('setting_key', 'performance_percentage')
            .maybeSingle(),
          // Management projection — clients who actually paid in last 60 days (ground truth)
          supabase
            .from('billing_records')
            .select('client_id, amount, recurrence_type, paid_at')
            .eq('billing_type', 'management')
            .eq('status', 'paid')
            .not('paid_at', 'is', null)
            .gte('paid_at', sixtyDaysAgo)
            .order('paid_at', { ascending: false }),
          // Same query with updated_at fallback for records where paid_at is NULL
          supabase
            .from('billing_records')
            .select('client_id, amount, recurrence_type, updated_at')
            .eq('billing_type', 'management')
            .eq('status', 'paid')
            .is('paid_at', null)
            .gte('updated_at', sixtyDaysAgo)
            .order('updated_at', { ascending: false }),
          // Attention counts
          supabase
            .from('billing_records')
            .select('*', { count: 'exact', head: true })
            .or(`status.eq.overdue,and(status.eq.pending,due_date.lt.${now.toISOString().split('T')[0]})`)
            .is('archived_at', null),
          supabase
            .from('billing_records')
            .select('*', { count: 'exact', head: true })
            .not('last_charge_error', 'is', null)
            .not('status', 'eq', 'paid')
            .is('archived_at', null),
          supabase
            .from('disputes')
            .select('*', { count: 'exact', head: true })
            .in('status', ['needs_response', 'under_review', 'warning_needs_response', 'warning_under_review']),
          // Active clients with management_fee > 0 for gap detection
          supabase
            .from('clients')
            .select('id, name, management_fee, billing_frequency, management_stripe_subscription_id, status')
            .eq('status', 'active')
            .gt('management_fee', 0),
        ]);

      const performancePct = perfSetting.data?.setting_value != null
        ? Number(perfSetting.data.setting_value)
        : 0;

      // MTD actuals
      let mtdAdSpend = 0;
      let mtdManagementFees = 0;
      for (const r of mtdRecords) {
        if (r.billing_type === 'ad_spend') mtdAdSpend += r.amount || 0;
        if (r.billing_type === 'management') mtdManagementFees += r.amount || 0;
      }

      // Last month actuals
      let lastMonthAdSpend = 0;
      let lastMonthManagementFees = 0;
      for (const r of lastMonthRecords) {
        if (r.billing_type === 'ad_spend') lastMonthAdSpend += r.amount || 0;
        if (r.billing_type === 'management') lastMonthManagementFees += r.amount || 0;
      }

      // Monthly ceiling from wallet thresholds
      const monthlyAdSpendCeiling = (autoWallets.data || []).reduce((sum, w) => {
        return sum + (w.auto_charge_amount || w.low_balance_threshold || 0);
      }, 0);
      const autoClientCount = (autoWallets.data || []).length;

      // Management fee projection — ground truth from billing_records payment history.
      // Merge paid_at + updated_at fallback records, take most recent per client,
      // then sum monthly equivalents (bi-weekly × 2.17 to normalize to monthly).
      const recentMgmt = [
        ...(recentMgmtWithPaidAt.data || []).map((r: any) => ({ ...r, effectiveDate: r.paid_at as string })),
        ...(recentMgmtWithoutPaidAt.data || []).map((r: any) => ({ ...r, effectiveDate: r.updated_at as string })),
      ];
      recentMgmt.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

      // Keep only the most recent payment per client
      const latestPerClient = new Map<string, { amount: number; recurrence_type: string | null }>();
      for (const r of recentMgmt) {
        if (!latestPerClient.has(r.client_id)) {
          latestPerClient.set(r.client_id, { amount: r.amount || 0, recurrence_type: r.recurrence_type });
        }
      }

      const activeSubscriptionCount = latestPerClient.size;
      const projectedManagementFees = [...latestPerClient.values()].reduce((sum, r) => {
        const multiplier = r.recurrence_type === 'bi_weekly' ? 2.17 : 1;
        return sum + r.amount * multiplier;
      }, 0);

      // Expected management revenue from clients.management_fee (ground truth)
      const feeClients = (activeClientsWithFees.data || []) as Array<{
        id: string; name: string; management_fee: number;
        billing_frequency: string | null; management_stripe_subscription_id: string | null; status: string;
      }>;
      const expectedManagementRevenue = feeClients.reduce((sum, c) => {
        const freq = c.billing_frequency || 'monthly';
        const monthlyEquiv = freq === 'bi_weekly' ? c.management_fee * 2.17 : c.management_fee;
        return sum + monthlyEquiv;
      }, 0);
      const expectedManagementClientCount = feeClients.length;

      // Detect management fee gaps: clients with fee set but no recent payment
      const managementFeeGaps: ManagementFeeGap[] = [];
      for (const c of feeClients) {
        const hasSub = !!c.management_stripe_subscription_id;
        const paidRecord = latestPerClient.get(c.id);
        // Find most recent paid_at for this client from the merged records
        const recentRecord = recentMgmt.find(r => r.client_id === c.id);
        const lastPaidAt = recentRecord?.effectiveDate || null;

        if (!hasSub && !paidRecord) {
          managementFeeGaps.push({
            clientId: c.id, clientName: c.name,
            managementFee: c.management_fee,
            billingFrequency: c.billing_frequency || 'monthly',
            hasStripeSubscription: false, lastPaidAt,
            status: 'missing_subscription',
          });
        } else if (!paidRecord) {
          managementFeeGaps.push({
            clientId: c.id, clientName: c.name,
            managementFee: c.management_fee,
            billingFrequency: c.billing_frequency || 'monthly',
            hasStripeSubscription: hasSub, lastPaidAt,
            status: 'no_recent_payment',
          });
        }
      }

      // Run-rate projections (linear extrapolation, only meaningful for current month)
      const runRateAdSpend = daysElapsed > 0 ? (mtdAdSpend / daysElapsed) * daysInMonth : 0;
      const runRateManagementFees = daysElapsed > 0 ? (mtdManagementFees / daysElapsed) * daysInMonth : 0;

      return {
        mtdAdSpend,
        mtdManagementFees,
        lastMonthAdSpend,
        lastMonthManagementFees,
        monthlyAdSpendCeiling,
        projectedManagementFees,
        activeSubscriptionCount,
        expectedManagementRevenue,
        expectedManagementClientCount,
        managementFeeGapCount: managementFeeGaps.length,
        managementFeeGaps,
        runRateAdSpend,
        runRateManagementFees,
        performancePct,
        autoClientCount,
        currentMonth,
        daysElapsed,
        daysInMonth,
        overdueCount: overdueRes.count || 0,
        failedPaymentsCount: failedRes.count || 0,
        disputesCount: disputesRes.count || 0,
      };
    },
    refetchInterval: 60000,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

// All auto-billing wallets — pipeline widget
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

      const { data: clients } = await supabase.from('clients').select('id, name');
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
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

// Wallet charge verification — checks recent charges for deposit issues
export function useWalletVerification() {
  return useQuery({
    queryKey: ['wallet-verification'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('verify-wallet-charges', {
        body: {},
      });
      if (error) throw new Error(error.message || 'Verification failed');
      return data as { success: boolean; checked: number; issues: Array<{
        type: 'missing_deposit' | 'amount_mismatch' | 'stripe_not_succeeded' | 'stripe_amount_mismatch';
        billingRecordId: string;
        clientId: string;
        clientName: string;
        chargeAmount: number;
        depositAmount: number | null;
        stripeAmount: number | null;
        paymentIntentId: string | null;
        paidAt: string | null;
      }> };
    },
    refetchInterval: 120000, // Check every 2 minutes
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

// Ad Spend Intelligence — Google Ads spend vs wallet deposits vs wallet balances
export function useAdSpendIntelligence(startIso?: string, endIso?: string) {
  return useQuery({
    queryKey: ['ad-spend-intelligence', startIso, endIso],
    queryFn: async (): Promise<AdSpendIntelligence> => {
      const now = new Date();
      const windowStartDate = startIso ? parseISO(startIso) : startOfMonth(now);
      const windowStart = windowStartDate.toISOString();
      const windowEnd = endIso || now.toISOString();
      const windowStartStr = format(windowStartDate, 'yyyy-MM-dd');
      const windowEndStr = format(endIso ? parseISO(endIso) : now, 'yyyy-MM-dd');

      const daysInMo = getDaysInMonth(windowStartDate);
      const isCurrentMonth = format(windowStartDate, 'yyyy-MM') === format(now, 'yyyy-MM');
      const daysElapsed = isCurrentMonth ? now.getDate() : daysInMo;
      const currentMonth = format(windowStartDate, 'MMMM yyyy');

      const [
        adSpendDailyRes,
        ignoredCampaignsRes,
        excludedSettingRes,
        walletDepositsRes,
        billingRecordsRes,
        walletsRes,
        clientsRes,
      ] = await Promise.all([
        // Google Ads actual spend
        supabase
          .from('ad_spend_daily')
          .select('client_id, campaign_id, cost')
          .gte('spend_date', windowStartStr)
          .lte('spend_date', windowEndStr),
        // Ignored campaigns
        supabase
          .from('campaigns')
          .select('google_campaign_id')
          .eq('ignored', true),
        // Additional excluded campaign IDs
        supabase
          .from('onboarding_settings')
          .select('setting_value')
          .eq('setting_key', 'excluded_ad_spend_campaign_ids')
          .maybeSingle(),
        // Wallet deposits MTD
        supabase
          .from('wallet_transactions')
          .select('client_id, amount')
          .eq('transaction_type', 'deposit')
          .gte('created_at', windowStart)
          .lte('created_at', windowEnd),
        // Paid billing records MTD (for Stripe totals)
        fetchPaidRecords('billing_type, amount, client_id', windowStart, windowEnd),
        // Current wallet balances + tracking data
        supabase
          .from('client_wallets')
          .select('client_id, ad_spend_balance, tracking_start_date'),
        // Active clients
        supabase
          .from('clients')
          .select('id, name, status')
          .in('status', ['active', 'onboarding']),
      ]);

      // Build exclusion set
      const ignoredGoogleIds = new Set(
        (ignoredCampaignsRes.data || []).map(c => c.google_campaign_id)
      );
      const extraExcluded: string[] = excludedSettingRes.data?.setting_value
        ? excludedSettingRes.data.setting_value.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];
      const allExcluded = new Set([...ignoredGoogleIds, ...extraExcluded]);
      const excludedCampaignIds = [...allExcluded];

      const clientMap = new Map((clientsRes.data || []).map(c => [c.id, c.name]));

      // Google Ads spend per client (excluding ignored campaigns)
      const clientAdSpend = new Map<string, number>();
      for (const row of adSpendDailyRes.data || []) {
        if (allExcluded.has(row.campaign_id)) continue;
        const prev = clientAdSpend.get(row.client_id) || 0;
        clientAdSpend.set(row.client_id, prev + (row.cost || 0));
      }
      const googleAdsSpendMtd = [...clientAdSpend.values()].reduce((a, b) => a + b, 0);

      // Wallet deposits per client MTD
      const clientDeposits = new Map<string, number>();
      let walletDepositsMtd = 0;
      for (const tx of walletDepositsRes.data || []) {
        const prev = clientDeposits.get(tx.client_id) || 0;
        clientDeposits.set(tx.client_id, prev + (tx.amount || 0));
        walletDepositsMtd += tx.amount || 0;
      }

      // Wallet balances (computed: total deposits - total ad_spend_daily since tracking_start)
      // Single batch: fetch all deposits + all ad_spend_daily, aggregate in memory
      const walletTrackingMap = new Map(
        (walletsRes.data || []).map(w => [w.client_id, w.tracking_start_date])
      );
      // Find earliest tracking start to fetch all spend in one query
      const trackingDates = [...walletTrackingMap.values()].filter(Boolean) as string[];
      const earliestTracking = trackingDates.length > 0
        ? trackingDates.reduce((a, b) => a < b ? a : b)
        : null;

      const [allDepositsRes, allSpendRes] = await Promise.all([
        supabase.from('wallet_transactions').select('client_id, amount').in('transaction_type', ['deposit', 'adjustment']),
        earliestTracking
          ? supabase.from('ad_spend_daily').select('client_id, spend_date, cost').gte('spend_date', earliestTracking)
          : Promise.resolve({ data: [] as Array<{ client_id: string; spend_date: string; cost: number | null }> }),
      ]);

      const totalDepositsPerClient = new Map<string, number>();
      for (const tx of allDepositsRes.data || []) {
        const prev = totalDepositsPerClient.get(tx.client_id) || 0;
        totalDepositsPerClient.set(tx.client_id, prev + (tx.amount || 0));
      }

      // Aggregate spend per client, respecting each client's tracking_start_date
      const totalSpendPerClient = new Map<string, number>();
      for (const row of (('data' in allSpendRes ? allSpendRes.data : allSpendRes) || []) as Array<{ client_id: string; spend_date: string; cost: number | null }>) {
        const trackStart = walletTrackingMap.get(row.client_id);
        if (!trackStart || row.spend_date < trackStart) continue;
        const prev = totalSpendPerClient.get(row.client_id) || 0;
        totalSpendPerClient.set(row.client_id, prev + (row.cost || 0));
      }

      const walletBalanceMap = new Map<string, number>();
      for (const [clientId, trackStart] of walletTrackingMap) {
        if (!trackStart) continue;
        const deposits = totalDepositsPerClient.get(clientId) || 0;
        const spend = totalSpendPerClient.get(clientId) || 0;
        walletBalanceMap.set(clientId, deposits - spend);
      }

      let totalWalletBalance = 0;
      for (const bal of walletBalanceMap.values()) {
        totalWalletBalance += bal;
      }

      // Billing records totals
      let managementCharged = 0;
      let adSpendCharged = 0;
      for (const r of billingRecordsRes) {
        if (r.billing_type === 'management') managementCharged += r.amount || 0;
        if (r.billing_type === 'ad_spend') adSpendCharged += r.amount || 0;
      }
      const totalStripeCharged = managementCharged + adSpendCharged;

      // Per-client breakdown
      const allClientIds = new Set([...clientAdSpend.keys(), ...clientDeposits.keys()]);
      const clients = [...allClientIds]
        .filter(id => clientMap.has(id))
        .map(id => {
          const googleAdsSpend = clientAdSpend.get(id) || 0;
          const walletDeposits = clientDeposits.get(id) || 0;
          const walletBalance = walletBalanceMap.get(id) || 0;
          // Status: green if wallet has enough buffer, yellow if tight, red if negative
          let status: 'green' | 'yellow' | 'red' = 'green';
          if (walletBalance < 0) status = 'red';
          else if (walletBalance < 100) status = 'yellow';
          return {
            clientId: id,
            clientName: clientMap.get(id) || 'Unknown',
            googleAdsSpend,
            walletDeposits,
            walletBalance,
            status,
          };
        })
        .sort((a, b) => a.walletBalance - b.walletBalance);

      // Overall status: green if total balance is healthy, yellow if <$500 total, red if negative
      let overallStatus: 'green' | 'yellow' | 'red' = 'green';
      if (totalWalletBalance < 0) overallStatus = 'red';
      else if (clients.some(c => c.status === 'red')) overallStatus = 'red';
      else if (totalWalletBalance < 500 || clients.some(c => c.status === 'yellow')) overallStatus = 'yellow';

      return {
        googleAdsSpendMtd,
        walletDepositsMtd,
        totalWalletBalance,
        totalStripeCharged,
        managementCharged,
        overallStatus,
        clients,
        excludedCampaignIds,
        ignoredCampaignCount: ignoredGoogleIds.size,
        currentMonth,
        daysElapsed,
        daysInMonth: daysInMo,
      };
    },
    refetchInterval: 120000,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

// Excluded campaign IDs settings — for ad spend intelligence
export function useExcludedCampaigns() {
  return useQuery({
    queryKey: ['excluded-campaigns-setting'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('onboarding_settings')
        .select('setting_value')
        .eq('setting_key', 'excluded_ad_spend_campaign_ids')
        .maybeSingle();
      if (error) throw error;
      if (!data?.setting_value) return [];
      return data.setting_value.split(',').map((s: string) => s.trim()).filter(Boolean);
    },
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useUpdateExcludedCampaigns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (campaignIds: string[]) => {
      const { error } = await supabase
        .from('onboarding_settings')
        .upsert({
          setting_key: 'excluded_ad_spend_campaign_ids',
          setting_value: campaignIds.join(','),
          description: 'Comma-separated campaign IDs excluded from ad spend intelligence tracking',
        }, { onConflict: 'setting_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excluded-campaigns-setting'] });
      queryClient.invalidateQueries({ queryKey: ['ad-spend-intelligence'] });
    },
  });
}

// Billing Integrity Audit — per-client reconciliation of ad spend, wallet deposits, and Stripe charges
export interface BillingIntegrityRow {
  clientId: string;
  clientName: string;
  mtdAdSpend: number;
  totalDeposits: number;
  totalAdjustments: number;
  walletBalance: number;
  stripeBackedTotal: number;
  stripeBackedCount: number;
  unbackedTotal: number;
  unbackedCount: number;
  billingRecordTotal: number;
  billingRecordCount: number;
  status: 'clean' | 'warning' | 'problem';
  issues: string[];
}

export function useBillingIntegrity() {
  return useQuery({
    queryKey: ['billing-integrity'],
    queryFn: async (): Promise<BillingIntegrityRow[]> => {
      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');

      const [clientsRes, walletsRes, adSpendRes, depositsRes, adjustmentsRes, billingRes] = await Promise.all([
        supabase.from('clients').select('id, name').in('status', ['active', 'onboarding']),
        supabase.from('client_wallets').select('client_id, tracking_start_date'),
        // MTD ad spend
        supabase.from('ad_spend_daily').select('client_id, cost').gte('spend_date', monthStart),
        // All deposits
        supabase.from('wallet_transactions').select('client_id, amount, billing_record_id').eq('transaction_type', 'deposit'),
        // All adjustments
        supabase.from('wallet_transactions').select('client_id, amount').eq('transaction_type', 'adjustment'),
        // All paid ad_spend billing records
        supabase.from('billing_records').select('id, client_id, amount, stripe_payment_intent_id, stripe_account, notes').eq('billing_type', 'ad_spend').eq('status', 'paid'),
      ]);

      const clientMap = new Map((clientsRes.data || []).map(c => [c.id, c.name]));
      const walletClients = new Set((walletsRes.data || []).map(w => w.client_id));
      const trackingMap = new Map((walletsRes.data || []).map(w => [w.client_id, w.tracking_start_date]));

      // MTD ad spend per client
      const mtdSpend = new Map<string, number>();
      for (const row of adSpendRes.data || []) {
        mtdSpend.set(row.client_id, (mtdSpend.get(row.client_id) || 0) + Number(row.cost || 0));
      }

      // All-time wallet deposits per client + count unbacked
      const depositsByClient = new Map<string, { total: number; records: Array<{ amount: number; billing_record_id: string | null }> }>();
      for (const tx of depositsRes.data || []) {
        const entry = depositsByClient.get(tx.client_id) || { total: 0, records: [] };
        entry.total += Number(tx.amount || 0);
        entry.records.push({ amount: Number(tx.amount || 0), billing_record_id: tx.billing_record_id });
        depositsByClient.set(tx.client_id, entry);
      }

      // All-time adjustments per client
      const adjustmentsByClient = new Map<string, number>();
      for (const tx of adjustmentsRes.data || []) {
        adjustmentsByClient.set(tx.client_id, (adjustmentsByClient.get(tx.client_id) || 0) + Number(tx.amount || 0));
      }

      // Billing records per client — split by Stripe-backed or not
      const billingByClient = new Map<string, { backed: number; backedCount: number; unbacked: number; unbackedCount: number; total: number; count: number }>();
      for (const rec of billingRes.data || []) {
        const entry = billingByClient.get(rec.client_id) || { backed: 0, backedCount: 0, unbacked: 0, unbackedCount: 0, total: 0, count: 0 };
        const amt = Number(rec.amount || 0);
        entry.total += amt;
        entry.count++;
        if (rec.stripe_payment_intent_id) {
          entry.backed += amt;
          entry.backedCount++;
        } else {
          entry.unbacked += amt;
          entry.unbackedCount++;
        }
        billingByClient.set(rec.client_id, entry);
      }

      // Compute tracked spend per client for balance
      const trackingDates = [...trackingMap.values()].filter(Boolean) as string[];
      const earliest = trackingDates.length > 0 ? trackingDates.reduce((a, b) => a < b ? a : b) : null;
      let allSpendData: Array<{ client_id: string; spend_date: string; cost: number | null }> = [];
      if (earliest) {
        const { data } = await supabase.from('ad_spend_daily').select('client_id, spend_date, cost').gte('spend_date', earliest);
        allSpendData = data || [];
      }
      const trackedSpendByClient = new Map<string, number>();
      for (const row of allSpendData) {
        const trackStart = trackingMap.get(row.client_id);
        if (!trackStart || row.spend_date < trackStart) continue;
        trackedSpendByClient.set(row.client_id, (trackedSpendByClient.get(row.client_id) || 0) + Number(row.cost || 0));
      }

      // Build rows for all clients that have a wallet
      const rows: BillingIntegrityRow[] = [];
      for (const clientId of walletClients) {
        const name = clientMap.get(clientId);
        if (!name) continue;

        const mtd = mtdSpend.get(clientId) || 0;
        const deps = depositsByClient.get(clientId);
        const totalDeposits = deps?.total || 0;
        const totalAdjustments = adjustmentsByClient.get(clientId) || 0;
        const trackedSpend = trackedSpendByClient.get(clientId) || 0;
        const walletBalance = totalDeposits + totalAdjustments - trackedSpend;
        const billing = billingByClient.get(clientId) || { backed: 0, backedCount: 0, unbacked: 0, unbackedCount: 0, total: 0, count: 0 };

        // Check for deposits without a billing_record_id (unbacked deposits)
        const unbackedDeposits = deps?.records.filter(r => !r.billing_record_id) || [];
        const unbackedDepositTotal = unbackedDeposits.reduce((s, r) => s + r.amount, 0);

        const issues: string[] = [];
        if (billing.unbackedCount > 0) {
          issues.push(`${billing.unbackedCount} billing record(s) ($${billing.unbacked.toFixed(0)}) without Stripe PI`);
        }
        if (unbackedDeposits.length > 0) {
          issues.push(`${unbackedDeposits.length} deposit(s) ($${unbackedDepositTotal.toFixed(0)}) without billing record`);
        }
        if (walletBalance < 0) {
          issues.push(`Negative balance: -$${Math.abs(walletBalance).toFixed(2)}`);
        }

        let status: 'clean' | 'warning' | 'problem' = 'clean';
        if (billing.unbackedCount > 0 || unbackedDeposits.length > 0) status = 'problem';
        else if (walletBalance < 0) status = 'warning';

        rows.push({
          clientId,
          clientName: name,
          mtdAdSpend: mtd,
          totalDeposits,
          totalAdjustments,
          walletBalance,
          stripeBackedTotal: billing.backed,
          stripeBackedCount: billing.backedCount,
          unbackedTotal: billing.unbacked + unbackedDepositTotal,
          unbackedCount: billing.unbackedCount + unbackedDeposits.length,
          billingRecordTotal: billing.total,
          billingRecordCount: billing.count,
          status,
          issues,
        });
      }

      // Sort: problems first, then warnings, then clean
      const order = { problem: 0, warning: 1, clean: 2 };
      rows.sort((a, b) => order[a.status] - order[b.status] || a.clientName.localeCompare(b.clientName));

      return rows;
    },
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
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
      queryClient.invalidateQueries({ queryKey: ['billing-overdue'] });
      queryClient.invalidateQueries({ queryKey: ['billing-upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-intelligence'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-verification'] });
      queryClient.invalidateQueries({ queryKey: ['ad-spend-intelligence'] });
    },
  });
}
