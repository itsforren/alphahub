import { useNavigate } from 'react-router-dom';
import { DollarSign, AlertCircle, Clock, CalendarCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ManagementFeeGap } from '@/hooks/useBillingDashboard';

interface ManagementFeeEnforcerWidgetProps {
  gaps: ManagementFeeGap[];
  expectedRevenue: number;
  clientCount: number;
  isLoading?: boolean;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function statusIcon(status: ManagementFeeGap['status']) {
  switch (status) {
    case 'missing_subscription': return <AlertCircle className="w-4 h-4 text-red-400" />;
    case 'no_recent_payment': return <Clock className="w-4 h-4 text-yellow-400" />;
    default: return <CalendarCheck className="w-4 h-4 text-green-400" />;
  }
}

function statusLabel(status: ManagementFeeGap['status']) {
  switch (status) {
    case 'missing_subscription': return 'No Stripe Sub';
    case 'no_recent_payment': return 'No Recent Payment';
    default: return 'OK';
  }
}

function statusBadgeClass(status: ManagementFeeGap['status']) {
  switch (status) {
    case 'missing_subscription': return 'bg-red-500/10 text-red-400 border-red-500/30';
    case 'no_recent_payment': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    default: return 'bg-green-500/10 text-green-400 border-green-500/30';
  }
}

export function ManagementFeeEnforcerWidget({ gaps, expectedRevenue, clientCount, isLoading }: ManagementFeeEnforcerWidgetProps) {
  const navigate = useNavigate();
  const hasGaps = gaps.length > 0;
  const borderClass = hasGaps ? 'border-orange-500/20' : 'border-border/50';
  const bgClass = hasGaps ? 'bg-orange-500/5' : 'bg-card/50';

  const missingSubs = gaps.filter(g => g.status === 'missing_subscription');
  const noRecentPay = gaps.filter(g => g.status === 'no_recent_payment');
  const missingRevenue = gaps.reduce((sum, g) => {
    const freq = g.billingFrequency || 'monthly';
    return sum + (freq === 'bi_weekly' ? g.managementFee * 2.17 : g.managementFee);
  }, 0);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="p-4 space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border overflow-hidden', borderClass, bgClass)}>
      <div className={cn('p-4 border-b', hasGaps ? 'border-orange-500/20' : 'border-border/50')}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <DollarSign className={cn('w-5 h-5', hasGaps ? 'text-orange-400' : 'text-green-400')} />
            Management Fee Enforcer
            {hasGaps && (
              <Badge variant="outline" className="ml-1 bg-orange-500/10 text-orange-400 border-orange-500/30">
                {gaps.length} gap{gaps.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </h3>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Expected: {fmt(expectedRevenue)}/mo</p>
            <p className="text-xs text-muted-foreground">{clientCount} client{clientCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {!hasGaps ? (
        <div className="p-6 text-center">
          <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">All active clients have recent management fee payments</p>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          {missingRevenue > 0 && (
            <div className="px-4 py-2 bg-orange-500/10 border-b border-orange-500/10 flex items-center justify-between">
              <span className="text-xs text-orange-400 font-medium">
                {missingSubs.length > 0 && `${missingSubs.length} need subscription setup`}
                {missingSubs.length > 0 && noRecentPay.length > 0 && ' · '}
                {noRecentPay.length > 0 && `${noRecentPay.length} no recent payment`}
              </span>
              <span className="text-xs text-orange-400 font-semibold">
                ~{fmt(missingRevenue)}/mo at risk
              </span>
            </div>
          )}

          <div className="divide-y divide-orange-500/10">
            {gaps.slice(0, 10).map((gap) => (
              <div
                key={gap.clientId}
                className="p-4 hover:bg-orange-500/5 cursor-pointer transition-colors"
                onClick={() => navigate(`/hub/admin/clients/${gap.clientId}?tab=billing`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center',
                      gap.status === 'missing_subscription' ? 'bg-red-500/10' : 'bg-yellow-500/10'
                    )}>
                      {statusIcon(gap.status)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{gap.clientName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={cn('text-xs', statusBadgeClass(gap.status))}>
                          {statusLabel(gap.status)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {fmt(gap.managementFee)}/{gap.billingFrequency === 'bi_weekly' ? '2wk' : 'mo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {gap.lastPaidAt && (
                    <span className="text-xs text-muted-foreground">
                      Last paid: {new Date(gap.lastPaidAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {gaps.length > 10 && (
            <div className="p-3 border-t border-orange-500/10 text-center">
              <span className="text-xs text-muted-foreground">
                + {gaps.length - 10} more
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
