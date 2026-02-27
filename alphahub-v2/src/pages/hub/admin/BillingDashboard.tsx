import { useState } from 'react';
import { DollarSign, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { BillingStatsCards } from '@/components/admin/BillingStatsCards';
import { BillingTimelineTable } from '@/components/admin/BillingTimelineTable';
import { FailedPaymentsWidget } from '@/components/admin/FailedPaymentsWidget';
import { DisputesWidget } from '@/components/admin/DisputesWidget';
import { 
  useBillingDashboardStats, 
  useUpcomingPayments, 
  useFailedPayments, 
  useActiveDisputes 
} from '@/hooks/useBillingDashboard';

export default function BillingDashboard() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data: stats, isLoading: statsLoading } = useBillingDashboardStats();
  const { data: upcomingPayments = [], isLoading: paymentsLoading } = useUpcomingPayments();
  const { data: failedPayments = [], isLoading: failedLoading } = useFailedPayments();
  const { data: disputes = [], isLoading: disputesLoading } = useActiveDisputes();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['billing-dashboard-stats'] }),
        queryClient.refetchQueries({ queryKey: ['billing-dashboard-upcoming'] }),
        queryClient.refetchQueries({ queryKey: ['billing-dashboard-failed'] }),
        queryClient.refetchQueries({ queryKey: ['billing-dashboard-disputes'] }),
      ]);
    } finally {
      setIsRefreshing(false);
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
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

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
