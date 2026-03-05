import { useState } from 'react';
import { DollarSign, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { BillingStatsCards } from '@/components/admin/BillingStatsCards';
import { BillingTimelineTable } from '@/components/admin/BillingTimelineTable';
import { FailedPaymentsWidget } from '@/components/admin/FailedPaymentsWidget';
import { DisputesWidget } from '@/components/admin/DisputesWidget';
import { WalletPipelineWidget } from '@/components/admin/WalletPipelineWidget';
import { RevenueIntelligenceCard } from '@/components/admin/RevenueIntelligenceCard';
import { toast } from 'sonner';
import {
  useBillingDashboardStats,
  useUpcomingPayments,
  useFailedPayments,
  useActiveDisputes,
  useSyncAllStripe,
  useWalletPipeline,
  useRevenueIntelligence,
} from '@/hooks/useBillingDashboard';

export default function BillingDashboard() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const syncMutation = useSyncAllStripe();

  const { data: stats, isLoading: statsLoading } = useBillingDashboardStats();
  const { data: upcomingPayments = [], isLoading: paymentsLoading } = useUpcomingPayments();
  const { data: failedPayments = [], isLoading: failedLoading } = useFailedPayments();
  const { data: disputes = [], isLoading: disputesLoading } = useActiveDisputes();
  const { data: walletPipeline = [], isLoading: pipelineLoading } = useWalletPipeline();
  const { data: revenueIntel, isLoading: intelLoading } = useRevenueIntelligence();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['billing-dashboard-stats'] }),
        queryClient.refetchQueries({ queryKey: ['billing-dashboard-upcoming'] }),
        queryClient.refetchQueries({ queryKey: ['billing-dashboard-failed'] }),
        queryClient.refetchQueries({ queryKey: ['billing-dashboard-disputes'] }),
        queryClient.refetchQueries({ queryKey: ['wallet-pipeline'] }),
        queryClient.refetchQueries({ queryKey: ['revenue-intelligence'] }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      const { updated = 0, created = 0, deposited = 0 } = result || {};
      const parts = [
        created > 0 && `${created} imported`,
        updated > 0 && `${updated} updated`,
        deposited > 0 && `${deposited} deposits added`,
      ].filter(Boolean);
      toast.success(parts.length ? parts.join(', ') : 'Already in sync', { description: 'Stripe sync complete' });
    } catch (err: any) {
      toast.error(`Sync failed: ${err?.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Billing Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Overview of all payments, collections, and disputes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncAll}
            disabled={syncMutation.isPending}
            className="gap-1.5"
          >
            <Zap className={`w-4 h-4 ${syncMutation.isPending ? 'animate-pulse' : ''}`} />
            {syncMutation.isPending ? 'Syncing…' : 'Sync All Stripe'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Revenue Intelligence Banner */}
      <RevenueIntelligenceCard data={revenueIntel} isLoading={intelLoading} />

      {/* The Big Three Stats */}
      <BillingStatsCards
        managementFeesCollected={stats?.managementFeesCollected ?? 0}
        managementFeesExpected={stats?.managementFeesExpected ?? 0}
        managementFeesPending={stats?.managementFeesPending ?? 0}
        adSpendCollected={stats?.adSpendCollected ?? 0}
        adSpendExpected={stats?.adSpendExpected ?? 0}
        adSpendPending={stats?.adSpendPending ?? 0}
        clientsNeedingAttention={stats?.clientsNeedingAttention ?? 0}
        overdueCount={stats?.overdueCount ?? 0}
        failedPaymentsCount={stats?.failedPaymentsCount ?? 0}
        disputesCount={stats?.disputesCount ?? 0}
        isLoading={statsLoading}
      />

      {/* Timeline Table */}
      <BillingTimelineTable
        payments={upcomingPayments}
        isLoading={paymentsLoading}
      />

      {/* Wallet Pipeline */}
      <WalletPipelineWidget items={walletPipeline} isLoading={pipelineLoading} />

      {/* Problem Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FailedPaymentsWidget 
          payments={failedPayments} 
          isLoading={failedLoading} 
        />
        <DisputesWidget 
          disputes={disputes} 
          isLoading={disputesLoading} 
        />
      </div>
    </div>
  );
}
