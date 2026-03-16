import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientWallet } from '@/hooks/useClientWallet';
import { useRechargeState } from '@/hooks/useRechargeState';
import { useComputedWalletBalance } from '@/hooks/useComputedWalletBalance';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

interface ClientWalletCardProps {
  clientId: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export function ClientWalletCard({ clientId }: ClientWalletCardProps) {
  // Canonical balance from RPC with 30-second polling
  const balanceQuery = useQuery({
    queryKey: ['computed-wallet-balance-rpc', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('compute_wallet_balance', {
        p_client_id: clientId,
      });
      if (error) throw error;
      return Number(data) ?? 0;
    },
    enabled: !!clientId,
    refetchInterval: 30_000,
  });

  // Deposit/spend breakdown (no polling needed for these)
  const { totalDeposits, displayedSpend, isLoading: breakdownLoading } =
    useComputedWalletBalance(clientId);

  // Wallet settings for auto-recharge display
  const { data: wallet } = useClientWallet(clientId);

  // Recharge state for safe mode detection (already polls 30s)
  const { data: rechargeState } = useRechargeState(clientId);

  const balance = balanceQuery.data ?? 0;
  const isLoading = balanceQuery.isLoading;

  return (
    <Card>
      <CardContent className="pt-6 pb-6">
        {/* Balance display */}
        <div className="text-center">
          {isLoading ? (
            <Skeleton className="h-12 w-40 mx-auto" />
          ) : (
            <p className="text-4xl font-bold">{formatCurrency(balance)}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">Account Balance</p>
          {!breakdownLoading && (
            <div className="mt-3 flex justify-center gap-6 text-sm text-muted-foreground">
              <span>Deposits: {formatCurrency(totalDeposits)}</span>
              <span>Ad Spend: {formatCurrency(displayedSpend)}</span>
            </div>
          )}
        </div>

        {/* Safe mode warning - client-friendly language */}
        {rechargeState?.safe_mode_active === true && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            <p className="text-sm text-amber-200">
              Campaigns paused - your account balance is being replenished
            </p>
          </div>
        )}

        {/* Read-only auto-recharge info */}
        {wallet?.auto_billing_enabled === true && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Auto-recharge: {formatCurrency(wallet.auto_charge_amount ?? 0)} when
            balance drops below {formatCurrency(wallet.low_balance_threshold ?? 0)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
