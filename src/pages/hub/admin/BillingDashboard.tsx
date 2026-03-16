import { useState, useMemo } from 'react';
import { DollarSign, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { RevenueSummaryRow } from '@/components/admin/RevenueSummaryRow';
import { BillingPaymentsTable } from '@/components/admin/BillingPaymentsTable';
import { FailedPaymentsWidget } from '@/components/admin/FailedPaymentsWidget';
import { DisputesWidget } from '@/components/admin/DisputesWidget';
import { WalletPipelineWidget } from '@/components/admin/WalletPipelineWidget';
import { WalletVerificationWidget } from '@/components/admin/WalletVerificationWidget';
import { ManagementFeeEnforcerWidget } from '@/components/admin/ManagementFeeEnforcerWidget';
import { WeeklyAuditWidget } from '@/components/admin/WeeklyAuditWidget';
import { AdSpendIntelligenceWidget } from '@/components/admin/AdSpendIntelligenceWidget';
import { BillingIntegrityAudit } from '@/components/admin/BillingIntegrityAudit';
import { BillingSummaryCards } from '@/components/admin/BillingSummaryCards';
import { StaleChargingPanel } from '@/components/admin/StaleChargingPanel';
import { toast } from 'sonner';
import {
  useRevenueIntelligence,
  useAdSpendIntelligence,
  useBillingIntegrity,
  useOverdueBillingRecords,
  useUpcomingBillingRecords,
  usePaidBillingRecords,
  useFailedPayments,
  useActiveDisputes,
  useSyncAllStripe,
  useWalletPipeline,
  useWalletVerification,
} from '@/hooks/useBillingDashboard';
import { useAllClientVerifications } from '@/hooks/useBillingVerification';

export default function BillingDashboard() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const syncMutation = useSyncAllStripe();

  // Month selector — defaults to current month
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(startOfMonth(new Date()));

  // Memoize date window — prevents query keys from changing every millisecond
  // (new Date() in render would produce a different string each ms, causing infinite re-fetches)
  const { startIso, endIso, isCurrentMonth } = useMemo(() => {
    const now = new Date();
    const isCurrent = format(selectedMonthDate, 'yyyy-MM') === format(now, 'yyyy-MM');
    return {
      startIso: selectedMonthDate.toISOString(),
      endIso: isCurrent ? now.toISOString() : endOfMonth(selectedMonthDate).toISOString(),
      isCurrentMonth: isCurrent,
    };
  }, [selectedMonthDate]);

  const { data: revenueIntel, isLoading: intelLoading } = useRevenueIntelligence(startIso, endIso);
  const { data: adSpendIntel, isLoading: adSpendLoading } = useAdSpendIntelligence(startIso, endIso);
  const { data: overdueRecords = [], isLoading: overdueLoading } = useOverdueBillingRecords();
  const { data: upcomingRecords = [], isLoading: upcomingLoading } = useUpcomingBillingRecords();
  const { data: paidRecords = [], isLoading: paidLoading } = usePaidBillingRecords(startIso, endIso);
  const { data: failedPayments = [], isLoading: failedLoading } = useFailedPayments();
  const { data: disputes = [], isLoading: disputesLoading } = useActiveDisputes();
  const { data: walletPipeline = [], isLoading: pipelineLoading } = useWalletPipeline();
  const { data: walletVerification, isLoading: verificationLoading } = useWalletVerification();
  const { data: integrityRows = [], isLoading: integrityLoading } = useBillingIntegrity();
  const { data: verificationMap, isLoading: allVerifLoading } = useAllClientVerifications();

  const paymentsLoading = overdueLoading || upcomingLoading || paidLoading;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['revenue-intelligence'] }),
        queryClient.refetchQueries({ queryKey: ['ad-spend-intelligence'] }),
        queryClient.refetchQueries({ queryKey: ['billing-overdue'] }),
        queryClient.refetchQueries({ queryKey: ['billing-upcoming'] }),
        queryClient.refetchQueries({ queryKey: ['billing-paid'] }),
        queryClient.refetchQueries({ queryKey: ['billing-dashboard-failed'] }),
        queryClient.refetchQueries({ queryKey: ['billing-dashboard-disputes'] }),
        queryClient.refetchQueries({ queryKey: ['wallet-pipeline'] }),
        queryClient.refetchQueries({ queryKey: ['wallet-verification'] }),
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

  // Build last 12 months for picker (stable — doesn't depend on now)
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(startOfMonth(new Date()), i);
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy'), isCurrent: i === 0 };
  }), []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Billing Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Payments, collections, and revenue intelligence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Month picker */}
          <Select
            value={format(selectedMonthDate, 'yyyy-MM')}
            onValueChange={(v) => setSelectedMonthDate(startOfMonth(new Date(v + '-01T12:00:00')))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}{opt.isCurrent ? ' (MTD)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

      {/* Revenue Snapshot */}
      <RevenueSummaryRow
        data={revenueIntel}
        isLoading={intelLoading}
        isCurrentMonth={isCurrentMonth}
      />

      {/* Ad Spend Intelligence */}
      <AdSpendIntelligenceWidget
        data={adSpendIntel}
        isLoading={adSpendLoading}
        isCurrentMonth={isCurrentMonth}
      />

      {/* Billing Health Summary Cards */}
      <BillingSummaryCards
        rows={integrityRows}
        verificationMap={verificationMap}
        projectedAdSpend={adSpendIntel?.googleAdsSpendMtd && adSpendIntel.daysElapsed > 0
          ? (adSpendIntel.googleAdsSpendMtd / adSpendIntel.daysElapsed) * adSpendIntel.daysInMonth
          : 0}
        isLoading={integrityLoading || adSpendLoading}
        isVerificationLoading={allVerifLoading}
      />

      {/* Stale Charging Records Monitor */}
      <StaleChargingPanel />

      {/* Payments Table (Overdue / Upcoming / Paid / All) */}
      <BillingPaymentsTable
        overdueRecords={overdueRecords}
        upcomingRecords={upcomingRecords}
        paidRecords={paidRecords}
        isLoading={paymentsLoading}
        selectedMonth={revenueIntel?.currentMonth ?? format(selectedMonthDate, 'MMMM yyyy')}
      />

      {/* Enforcement Row: Wallet Verification + Management Fee Enforcer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WalletVerificationWidget
          issues={walletVerification?.issues || []}
          checked={walletVerification?.checked || 0}
          isLoading={verificationLoading}
        />
        <ManagementFeeEnforcerWidget
          gaps={revenueIntel?.managementFeeGaps || []}
          expectedRevenue={revenueIntel?.expectedManagementRevenue || 0}
          clientCount={revenueIntel?.expectedManagementClientCount || 0}
          isLoading={intelLoading}
        />
      </div>

      {/* Billing Integrity Audit — per-client reconciliation */}
      <BillingIntegrityAudit />

      {/* Bottom Row: Pipeline + Failed + Disputes + Weekly Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WalletPipelineWidget items={walletPipeline} isLoading={pipelineLoading} />

        <div className="space-y-6">
          <FailedPaymentsWidget payments={failedPayments} isLoading={failedLoading} />
          <DisputesWidget disputes={disputes} isLoading={disputesLoading} />
          <WeeklyAuditWidget />
        </div>
      </div>
    </div>
  );
}
