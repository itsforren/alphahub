import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, subDays } from 'date-fns';

export interface VaultMetrics {
  // Row 1: The Split
  netRevenue: number; // Mgmt Fees + Setups (YOUR money)
  adWalletBalance: number; // Client Deposits (THEIR money)
  ltv: number; // Lifetime Value per client
  
  // Row 2: The Bleed
  failedPaymentsCount: number;
  failedPaymentsAmount: number;
  overdueInvoices: Array<{ id: string; clientName: string; amount: number; daysOverdue: number }>;
}

export function useVaultData() {
  return useQuery({
    queryKey: ['tv-vault-data'],
    queryFn: async (): Promise<VaultMetrics> => {
      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const sevenDaysAgo = format(subDays(now, 7), 'yyyy-MM-dd');
      
      // Fetch paid billing records for revenue calculation
      const { data: paidRecords } = await supabase
        .from('billing_records')
        .select('amount, paid_at, billing_type, client_id')
        .eq('status', 'paid')
        .gte('paid_at', monthStart);
      
      // Fetch pending/failed records
      const { data: pendingRecords } = await supabase
        .from('billing_records')
        .select('id, amount, due_date, charge_attempts, client_id, billing_type')
        .eq('status', 'pending');
      
      // Compute ad wallet balance via RPC (replaces deprecated ad_spend_balance field)
      const { data: activeWalletClients } = await supabase
        .from('client_wallets')
        .select('client_id');
      
      // Fetch clients for names and LTV calc
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, created_at')
        .is('deleted_at', null);
      
      // Calculate Net Revenue (Management fees - NOT ad spend deposits)
      const netRevenue = paidRecords
        ?.filter(r => r.billing_type === 'management')
        .reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
      
      // Calculate Ad Wallet Balance from computed balances (deposits - spend with performance markup)
      let adWalletBalance = 0;
      for (const w of (activeWalletClients || [])) {
        const { data } = await supabase.rpc('compute_wallet_balance', { p_client_id: w.client_id });
        adWalletBalance += data?.remaining_balance ?? 0;
      }
      
      // Calculate LTV (average revenue per client)
      const totalRevenue = paidRecords?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
      const clientCount = clients?.length || 1;
      const ltv = totalRevenue / clientCount;
      
      // Failed payments (charge_attempts > 0)
      const failedPayments = pendingRecords?.filter(r => (r.charge_attempts || 0) > 0) || [];
      const failedPaymentsCount = failedPayments.length;
      const failedPaymentsAmount = failedPayments.reduce((sum, r) => sum + (r.amount || 0), 0);
      
      // Overdue invoices (> 7 days past due)
      const clientMap = new Map(clients?.map(c => [c.id, c.name]) || []);
      const overdueRecords = pendingRecords
        ?.filter(r => {
          if (!r.due_date) return false;
          const dueDate = new Date(r.due_date);
          const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysOverdue > 7;
        })
        .map(r => ({
          id: r.id,
          clientName: clientMap.get(r.client_id) || 'Unknown',
          amount: r.amount || 0,
          daysOverdue: Math.floor((now.getTime() - new Date(r.due_date!).getTime()) / (1000 * 60 * 60 * 24)),
        }))
        .sort((a, b) => b.daysOverdue - a.daysOverdue)
        .slice(0, 3) || [];
      
      return {
        netRevenue,
        adWalletBalance,
        ltv,
        failedPaymentsCount,
        failedPaymentsAmount,
        overdueInvoices: overdueRecords,
      };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
