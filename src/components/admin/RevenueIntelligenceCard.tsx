import { BarChart3, TrendingUp, DollarSign, Percent, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { RevenueIntelligence } from '@/hooks/useBillingDashboard';

interface RevenueIntelligenceCardProps {
  data?: RevenueIntelligence;
  isLoading?: boolean;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-medium',
      up ? 'text-green-400' : 'text-red-400'
    )}>
      {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function MetricColumn({
  label,
  sublabel,
  icon,
  iconColor,
  borderColor,
  mtdValue,
  mtdLabel = 'collected MTD',
  projectedValue,
  projectedLabel,
  projectedSublabel,
  lastMonthValue,
  extra,
}: {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  iconColor: string;
  borderColor: string;
  mtdValue: number | string;
  mtdLabel?: string;
  projectedValue: number | string;
  projectedLabel: string;
  projectedSublabel?: string;
  lastMonthValue?: number;
  extra?: React.ReactNode;
}) {
  return (
    <div className={cn('p-6 border-r last:border-r-0', borderColor)}>
      <div className="flex items-center gap-2 mb-4">
        <div className={cn('p-1.5 rounded-md', iconColor)}>{icon}</div>
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        </div>
      </div>

      {/* MTD Actual */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">
            {typeof mtdValue === 'number' ? fmt(mtdValue) : mtdValue}
          </span>
          {lastMonthValue !== undefined && typeof mtdValue === 'number' && (
            <TrendBadge current={mtdValue} previous={lastMonthValue} />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{mtdLabel}</p>
      </div>

      {/* Projected */}
      <div className="pt-3 border-t border-border/30">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-muted-foreground">
            {typeof projectedValue === 'number' ? fmt(projectedValue) : projectedValue}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{projectedLabel}</p>
        {projectedSublabel && (
          <p className="text-xs text-muted-foreground/70 mt-0.5">{projectedSublabel}</p>
        )}
      </div>

      {extra && <div className="mt-3">{extra}</div>}
    </div>
  );
}

export function RevenueIntelligenceCard({ data, isLoading }: RevenueIntelligenceCardProps) {
  if (isLoading || !data) {
    return (
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid grid-cols-3 divide-x divide-border/30">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-6 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-20" />
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
    runRateAdSpend,
    runRateManagementFees,
    performancePct,
    autoClientCount,
    currentMonth,
    daysElapsed,
    daysInMonth,
  } = data;

  const daysRemaining = daysInMonth - daysElapsed;
  const mtdThroughput = mtdAdSpend + mtdManagementFees;
  const projectedThroughput = monthlyAdSpendCeiling + projectedManagementFees;

  // Use wallet-ceiling projection for ad spend, run-rate for management (more accurate for fixed fees)
  const bestAdSpendProjection = Math.max(monthlyAdSpendCeiling, runRateAdSpend);
  const bestMgmtProjection = projectedManagementFees > 0 ? projectedManagementFees : runRateManagementFees;

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-transparent flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Revenue Intelligence</h2>
          <Badge variant="outline" className="text-xs ml-1">{currentMonth}</Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{daysElapsed} of {daysInMonth} days · {daysRemaining} remaining</span>
          {performancePct > 0 && (
            <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-400">
              {performancePct}% performance fee
            </Badge>
          )}
        </div>
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/30">
        {/* Column 1: Ad Spend Managed */}
        <MetricColumn
          label="Ad Spend Managed"
          sublabel="Pass-through to Google / Meta"
          icon={<TrendingUp className="w-4 h-4 text-blue-400" />}
          iconColor="bg-blue-500/10"
          borderColor="border-border/30"
          mtdValue={mtdAdSpend}
          mtdLabel="collected this month"
          projectedValue={bestAdSpendProjection}
          projectedLabel={`est. full month (${autoClientCount} client threshold${autoClientCount !== 1 ? 's' : ''})`}
          projectedSublabel={runRateAdSpend > 0 ? `Run rate: ${fmt(runRateAdSpend)}/mo` : undefined}
          lastMonthValue={lastMonthAdSpend}
          extra={
            lastMonthAdSpend > 0 ? (
              <p className="text-xs text-muted-foreground">
                Last month: {fmt(lastMonthAdSpend)}
              </p>
            ) : undefined
          }
        />

        {/* Column 2: Agency Revenue */}
        <MetricColumn
          label="Agency Revenue"
          sublabel="What you keep (management fees)"
          icon={<DollarSign className="w-4 h-4 text-green-400" />}
          iconColor="bg-green-500/10"
          borderColor="border-border/30"
          mtdValue={mtdManagementFees}
          mtdLabel="collected this month"
          projectedValue={bestMgmtProjection}
          projectedLabel={
            performancePct > 0
              ? `est. full month (${performancePct}% × threshold pool)`
              : 'est. full month (set performance fee to project)'
          }
          lastMonthValue={lastMonthManagementFees}
          extra={
            lastMonthManagementFees > 0 ? (
              <p className="text-xs text-muted-foreground">
                Last month: {fmt(lastMonthManagementFees)}
              </p>
            ) : undefined
          }
        />

        {/* Column 3: Performance Rate + Summary */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-md bg-purple-500/10">
              <Percent className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Performance Rate</p>
              <p className="text-xs text-muted-foreground">Dynamically configured</p>
            </div>
          </div>

          <div className="mb-4">
            <span className="text-4xl font-bold text-purple-400">
              {performancePct > 0 ? `${performancePct}%` : '—'}
            </span>
            <p className="text-xs text-muted-foreground mt-1">of ad spend managed</p>
          </div>

          {/* Monthly summary */}
          <div className="space-y-2 pt-3 border-t border-border/30">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">MTD throughput</span>
              <span className="font-medium text-foreground">{fmt(mtdThroughput)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">MTD agency revenue</span>
              <span className="font-medium text-green-400">{fmt(mtdManagementFees)}</span>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-border/20">
              <span className="text-muted-foreground">Projected month total</span>
              <span className="font-medium text-foreground">{fmt(projectedThroughput)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Projected agency revenue</span>
              <span className="font-medium text-green-400">{fmt(bestMgmtProjection)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
