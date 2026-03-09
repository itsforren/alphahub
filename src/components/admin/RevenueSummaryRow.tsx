import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { RevenueIntelligence } from '@/hooks/useBillingDashboard';

interface RevenueSummaryRowProps {
  data?: RevenueIntelligence;
  isLoading?: boolean;
  isCurrentMonth?: boolean;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function TrendPct({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 || current === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium ml-1', up ? 'text-green-400' : 'text-red-400')}>
      {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export function RevenueSummaryRow({ data, isLoading, isCurrentMonth = true }: RevenueSummaryRowProps) {
  const navigate = useNavigate();

  if (isLoading || !data) {
    return (
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/30">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-5 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const {
    mtdAdSpend,
    mtdManagementFees,
    lastMonthAdSpend,
    lastMonthManagementFees,
    monthlyAdSpendCeiling,
    projectedManagementFees,
    activeSubscriptionCount,
    expectedManagementRevenue,
    expectedManagementClientCount,
    managementFeeGapCount,
    performancePct,
    autoClientCount,
    currentMonth,
    overdueCount,
    failedPaymentsCount,
    disputesCount,
  } = data;

  const mtdLabel = isCurrentMonth ? 'collected MTD' : `collected in ${currentMonth}`;
  const projectedLabel = isCurrentMonth ? 'projected this month' : null;
  const revenueGap = expectedManagementRevenue - mtdManagementFees;

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/30">

        {/* Column 1: Management Fees */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-md bg-green-500/10">
              <DollarSign className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Agency Revenue</p>
              <p className="text-xs text-muted-foreground">Management fees collected</p>
            </div>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{fmt(mtdManagementFees)}</span>
            <TrendPct current={mtdManagementFees} previous={lastMonthManagementFees} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{mtdLabel}</p>

          {expectedManagementRevenue > 0 && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-base font-semibold text-muted-foreground">{fmt(expectedManagementRevenue)}</p>
                  <p className="text-xs text-muted-foreground">expected from {expectedManagementClientCount} client{expectedManagementClientCount !== 1 ? 's' : ''}</p>
                </div>
                {isCurrentMonth && revenueGap > 0 && (
                  <div className="text-right">
                    <p className={cn('text-sm font-semibold', revenueGap > expectedManagementRevenue * 0.5 ? 'text-red-400' : 'text-yellow-400')}>
                      -{fmt(revenueGap)}
                    </p>
                    <p className="text-xs text-muted-foreground">gap</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {projectedLabel && projectedManagementFees > 0 && (
            <div className="mt-2 pt-2 border-t border-border/20">
              <p className="text-sm text-muted-foreground">{fmt(projectedManagementFees)} <span className="text-xs">{projectedLabel}</span></p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {activeSubscriptionCount > 0 && (
              <span>{activeSubscriptionCount} paying client{activeSubscriptionCount !== 1 ? 's' : ''}</span>
            )}
            {managementFeeGapCount > 0 && (
              <span className="text-orange-400">{managementFeeGapCount} missing payment{managementFeeGapCount !== 1 ? 's' : ''}</span>
            )}
            {performancePct > 0 && (
              <span className="text-purple-400">{performancePct}% performance fee</span>
            )}
            {lastMonthManagementFees > 0 && (
              <span>Last month: {fmt(lastMonthManagementFees)}</span>
            )}
          </div>
        </div>

        {/* Column 2: Ad Spend */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-md bg-blue-500/10">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Ad Spend Managed</p>
              <p className="text-xs text-muted-foreground">Pass-through to platforms</p>
            </div>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{fmt(mtdAdSpend)}</span>
            <TrendPct current={mtdAdSpend} previous={lastMonthAdSpend} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{mtdLabel}</p>

          {projectedLabel && monthlyAdSpendCeiling > 0 && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <p className="text-base font-semibold text-muted-foreground">{fmt(monthlyAdSpendCeiling)}</p>
              <p className="text-xs text-muted-foreground">wallet pipeline (total recharge pool)</p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {autoClientCount > 0 && (
              <span>{autoClientCount} auto-billing client{autoClientCount !== 1 ? 's' : ''}</span>
            )}
            {lastMonthAdSpend > 0 && (
              <span>Last month: {fmt(lastMonthAdSpend)}</span>
            )}
          </div>
        </div>

        {/* Column 3: Needs Attention */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-md bg-orange-500/10">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Needs Attention</p>
              <p className="text-xs text-muted-foreground">Items requiring action</p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => navigate('/hub/admin/billing?tab=overdue')}
              className={cn(
                'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors text-left',
                overdueCount > 0
                  ? 'bg-red-500/10 hover:bg-red-500/15 text-red-400'
                  : 'bg-muted/30 hover:bg-muted/50 text-muted-foreground',
              )}
            >
              <span>Overdue</span>
              <span className="font-bold">{overdueCount}</span>
            </button>
            <button
              onClick={() => navigate('/hub/admin/billing')}
              className={cn(
                'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors text-left',
                failedPaymentsCount > 0
                  ? 'bg-orange-500/10 hover:bg-orange-500/15 text-orange-400'
                  : 'bg-muted/30 hover:bg-muted/50 text-muted-foreground',
              )}
            >
              <span>Failed payments</span>
              <span className="font-bold">{failedPaymentsCount}</span>
            </button>
            <button
              onClick={() => navigate('/hub/admin/billing')}
              className={cn(
                'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors text-left',
                managementFeeGapCount > 0
                  ? 'bg-yellow-500/10 hover:bg-yellow-500/15 text-yellow-400'
                  : 'bg-muted/30 hover:bg-muted/50 text-muted-foreground',
              )}
            >
              <span>Mgmt fee gaps</span>
              <span className="font-bold">{managementFeeGapCount}</span>
            </button>
            <button
              onClick={() => navigate('/hub/admin/billing')}
              className={cn(
                'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors text-left',
                disputesCount > 0
                  ? 'bg-yellow-500/10 hover:bg-yellow-500/15 text-yellow-400'
                  : 'bg-muted/30 hover:bg-muted/50 text-muted-foreground',
              )}
            >
              <span>Disputes</span>
              <span className="font-bold">{disputesCount}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
