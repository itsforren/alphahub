import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, differenceInDays, parseISO, isValid } from 'date-fns';

export interface BillingDashboardStats {
  managementFeesCollected: number;
  managementFeesExpected: number;
  managementFeesPending: number;
  adSpendCollected: number;
  adSpendExpected: number;
  adSpendPending: number;
  clientsNeedingAttention: number;
  overdueCount: number;
  failedPaymentsCount: number;
  lowWalletCount: number;
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
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      // Get all billing records for this month (based on due_date for expected)
      const { data: billingRecords, error: billingError } = await supabase
        .from('billing_records')
        .select('billing_type, amount, status, paid_at, due_date, charge_attempts, last_charge_error')
        .or(`paid_at.gte.${monthStart},due_date.gte.${monthStart}`)
        .or(`paid_at.lte.${monthEnd},due_date.lte.${monthEnd}`);

      if (billingError) throw billingError;

      // Calculate stats
      let managementFeesCollected = 0;
      let managementFeesExpected = 0;
      let managementFeesPending = 0;
      let adSpendCollected = 0;
      let adSpendExpected = 0;
      let adSpendPending = 0;
      let failedPaymentsCount = 0;

      for (const record of billingRecords || []) {
        const amount = record.amount || 0;
        
        // Check if paid this month
        const paidThisMonth = record.paid_at && 
          new Date(record.paid_at) >= new Date(monthStart) && 
          new Date(record.paid_at) <= new Date(monthEnd);
        
        // Check if due this month (for expected)
        const dueThisMonth = record.due_date && 
          new Date(record.due_date) >= new Date(monthStart) && 
          new Date(record.due_date) <= new Date(monthEnd);
        
        if (record.billing_type === 'management') {
          if (record.status === 'paid' && paidThisMonth) {
            managementFeesCollected += amount;
          }
          if (dueThisMonth && (record.status === 'pending' || record.status === 'overdue')) {
            managementFeesExpected += amount;
            managementFeesPending += 1;
          }
        } else if (record.billing_type === 'ad_spend') {
          if (record.status === 'paid' && paidThisMonth) {
            adSpendCollected += amount;
          }
          if (dueThisMonth && (record.status === 'pending' || record.status === 'overdue')) {
            adSpendExpected += amount;
            adSpendPending += 1;
          }
        }
        
        // Count failed payments (has error or multiple attempts)
        if (record.last_charge_error || (record.charge_attempts && record.charge_attempts > 1)) {
          failedPaymentsCount += 1;
        }
      }

      // Get overdue count
      const { count: overdueCount } = await supabase
        .from('billing_records')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'overdue');

      // Get low wallet count
      const { data: lowWallets } = await supabase
        .from('client_wallets')
        .select('id, low_balance_threshold, client_id')
        .not('tracking_start_date', 'is', null);

      let lowWalletCount = 0;
      // For now, just count wallets - actual balance check would need more logic
      // This is a placeholder that can be enhanced later

      // Get active disputes count
      const { count: disputesCount } = await supabase
        .from('disputes')
        .select('*', { count: 'exact', head: true })
        .in('status', ['needs_response', 'under_review', 'warning_needs_response']);

      const clientsNeedingAttention = (overdueCount || 0) + failedPaymentsCount + (disputesCount || 0);

      return {
        managementFeesCollected,
        managementFeesExpected,
        managementFeesPending,
        adSpendCollected,
        adSpendExpected,
        adSpendPending,
        clientsNeedingAttention,
        overdueCount: overdueCount || 0,
        failedPaymentsCount,
        lowWalletCount,
        disputesCount: disputesCount || 0,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useUpcomingPayments() {
  return useQuery({
    queryKey: ['billing-dashboard-upcoming'],
    queryFn: async (): Promise<UpcomingPayment[]> => {
      // Get pending and overdue billing records with client info including client_name
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
