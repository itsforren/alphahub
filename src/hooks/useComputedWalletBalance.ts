import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';
import { usePerformancePercentage, applyPerformancePercentage } from '@/hooks/usePerformancePercentage';

export interface ComputedWalletBalance {
  totalDeposits: number;
  trackedSpend: number;
  displayedSpend: number; // Spend with performance percentage applied
  remainingBalance: number;
  trackingStartDate: string | null;
  isLoading: boolean;
  performancePercentage: number;
}

// Default threshold - actual threshold comes from client_wallets.low_balance_threshold
const DEFAULT_LOW_BALANCE_THRESHOLD = 150;

export function useComputedWalletBalance(clientId?: string) {
  // Track if we've already triggered the low balance check for this client
  const lowBalanceCheckedRef = useRef<string | null>(null);

  // Fetch performance percentage setting
  const { data: performancePercentage, isLoading: percentageLoading } = usePerformancePercentage();

  // Fetch wallet with tracking start date and low balance threshold
  const walletQuery = useQuery({
    queryKey: ['client-wallet-tracking', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data, error } = await supabase
        .from('client_wallets')
        .select('id, tracking_start_date, low_balance_threshold')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch total deposits from wallet_transactions
  const depositsQuery = useQuery({
    queryKey: ['wallet-deposits', clientId],
    queryFn: async () => {
      if (!clientId) return 0;
      
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('amount')
        .eq('client_id', clientId)
        .in('transaction_type', ['deposit', 'adjustment']);

      if (error) throw error;
      
      return data?.reduce((sum, tx) => sum + Number(tx.amount), 0) ?? 0;
    },
    enabled: !!clientId,
  });

  // Fetch tracked ad spend from ad_spend_daily
  const spendQuery = useQuery({
    queryKey: ['tracked-ad-spend', clientId, walletQuery.data?.tracking_start_date],
    queryFn: async () => {
      if (!clientId || !walletQuery.data?.tracking_start_date) return 0;

      const { data, error } = await supabase
        .from('ad_spend_daily')
        .select('cost')
        .eq('client_id', clientId)
        .gte('spend_date', walletQuery.data.tracking_start_date);

      if (error) throw error;

      return data?.reduce((sum, day) => sum + Number(day.cost || 0), 0) ?? 0;
    },
    enabled: !!clientId && !!walletQuery.data?.tracking_start_date,
  });

  // Canonical balance from compute_wallet_balance() RPC — single source of truth
  const balanceQuery = useQuery({
    queryKey: ['computed-wallet-balance-rpc', clientId],
    queryFn: async () => {
      if (!clientId) return 0;

      const { data, error } = await supabase.rpc('compute_wallet_balance', {
        p_client_id: clientId,
      });

      if (error) throw error;
      // RPC returns a composite type {remaining_balance, total_deposits, ...}
      if (typeof data === 'object' && data !== null && 'remaining_balance' in data) {
        return Number((data as Record<string, unknown>).remaining_balance) || 0;
      }
      return Number(data) || 0;
    },
    enabled: !!clientId,
  });

  const totalDeposits = depositsQuery.data ?? 0;
  const trackedSpend = spendQuery.data ?? 0;
  const pct = performancePercentage ?? 0;
  const displayedSpend = applyPerformancePercentage(trackedSpend, pct);
  const remainingBalance = balanceQuery.data ?? 0;
  const trackingStartDate = walletQuery.data?.tracking_start_date ?? null;
  // Use per-client threshold or default
  const lowBalanceThreshold = walletQuery.data?.low_balance_threshold ?? DEFAULT_LOW_BALANCE_THRESHOLD;

  // Trigger low balance check when balance drops to threshold or below
  useEffect(() => {
    // Only trigger if:
    // 1. We have a valid clientId
    // 2. Balance is at or below per-client threshold
    // 3. We haven't already checked this client in this session
    // 4. Data is loaded (not in initial loading state)
    if (
      clientId && 
      remainingBalance <= lowBalanceThreshold && 
      lowBalanceCheckedRef.current !== clientId &&
      !walletQuery.isLoading &&
      !depositsQuery.isLoading &&
      !spendQuery.isLoading &&
      !balanceQuery.isLoading &&
      !percentageLoading &&
      totalDeposits > 0 // Only trigger if there's actually been deposits (tracking is active)
    ) {
      lowBalanceCheckedRef.current = clientId;
      
      console.log(`Low balance detected ($${remainingBalance.toFixed(2)}) below threshold ($${lowBalanceThreshold}), triggering budget reduction check...`);
      
      // Call the low balance check edge function
      supabase.functions.invoke('check-low-balance', {
        body: { clientId }
      }).then(({ data, error }) => {
        if (error) {
          console.error('Low balance check failed:', error);
        } else {
          console.log('Low balance check result:', data);
        }
      });
    }
  }, [clientId, remainingBalance, lowBalanceThreshold, totalDeposits, walletQuery.isLoading, depositsQuery.isLoading, spendQuery.isLoading, balanceQuery.isLoading, percentageLoading]);

  const refetch = () => {
    walletQuery.refetch();
    depositsQuery.refetch();
    spendQuery.refetch();
    balanceQuery.refetch();
  };

  return {
    totalDeposits,
    trackedSpend,
    displayedSpend,
    remainingBalance,
    trackingStartDate,
    performancePercentage,
    isLoading: walletQuery.isLoading || depositsQuery.isLoading || spendQuery.isLoading || balanceQuery.isLoading || percentageLoading,
    refetch,
  };
}
