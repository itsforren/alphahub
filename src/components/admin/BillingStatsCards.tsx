import { DollarSign, TrendingUp, AlertTriangle, ArrowUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/tv/AnimatedNumber';

interface BillingStatsCardsProps {
  managementFeesCollected: number;
  managementFeesExpected: number;
  managementFeesPending: number;
  adSpendCollected: number;
  adSpendExpected: number;
  adSpendPending: number;
  clientsNeedingAttention: number;
  overdueCount: number;
  failedPaymentsCount: number;
  disputesCount: number;
  isLoading?: boolean;
}

interface RevenueStatCardProps {
  title: string;
  collected: number;
  expected: number;
  pendingCount: number;
  icon: React.ReactNode;
  variant: 'success' | 'primary';
  isLoading?: boolean;
  expectedLabel?: string;
  pendingLabel?: string;
}

interface AttentionStatCardProps {
  title: string;
  value: number;
  overdueCount: number;
  failedCount: number;
  disputesCount: number;
  lowWalletCount?: number;
  icon: React.ReactNode;
  isLoading?: boolean;
}

function RevenueStatCard({
  title,
  collected,
  expected,
  pendingCount,
  icon,
  variant,
  isLoading,
  expectedLabel = 'expected',
  pendingLabel,
}: RevenueStatCardProps) {
  const variantStyles = {
    success: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    primary: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  };

  const iconStyles = {
    success: 'bg-green-500/20 text-green-400',
    primary: 'bg-blue-500/20 text-blue-400',
  };

  const collectedColor = {
    success: 'text-green-400',
    primary: 'text-blue-400',
  };

  const expectedGlow = {
    success: 'text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]',
    primary: 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]',
  };

  return (
    <div className={cn(
      'rounded-xl border p-5 bg-gradient-to-br backdrop-blur-sm',
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={cn('p-2.5 rounded-lg', iconStyles[variant])}>
          {icon}
        </div>
      </div>
      
      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="space-y-3">
          {/* Collected - Main value */}
          <div>
            <span className={cn('text-3xl font-bold', collectedColor[variant])}>
              <AnimatedNumber value={collected} format="currency" />
            </span>
            <span className="text-sm text-muted-foreground ml-2">collected</span>
          </div>
          
          {/* Expected / Pipeline - Prominent secondary */}
          <div className="flex items-center gap-2">
            <ArrowUp className={cn('w-4 h-4', expectedGlow[variant])} />
            <span className={cn('text-xl font-semibold', expectedGlow[variant])}>
              <AnimatedNumber value={expected} format="currency" />
            </span>
            <span className="text-sm text-muted-foreground">{expectedLabel}</span>
          </div>

          {/* Pending count - Tertiary */}
          <p className="text-xs text-muted-foreground">
            {pendingLabel ?? `${pendingCount} pending invoice${pendingCount !== 1 ? 's' : ''}`}
          </p>
        </div>
      )}
    </div>
  );
}

function AttentionStatCard({
  title,
  value,
  overdueCount,
  failedCount,
  disputesCount,
  lowWalletCount = 0,
  icon,
  isLoading,
}: AttentionStatCardProps) {
  const hasIssues = value > 0;
  
  return (
    <div className={cn(
      'rounded-xl border p-5 bg-gradient-to-br backdrop-blur-sm',
      hasIssues 
        ? 'from-red-500/20 to-pink-500/20 border-red-500/30' 
        : 'from-blue-500/20 to-cyan-500/20 border-blue-500/20'
    )}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={cn(
          'p-2.5 rounded-lg',
          hasIssues ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
        )}>
          {icon}
        </div>
      </div>
      
      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="space-y-3">
          {/* Main value */}
          <div>
            <span className={cn(
              'text-3xl font-bold',
              hasIssues ? 'text-red-400' : 'text-foreground'
            )}>
              <AnimatedNumber value={value} format="number" />
            </span>
            <span className="text-sm text-muted-foreground ml-2">
              {value === 1 ? 'client' : 'clients'}
            </span>
          </div>
          
          {/* Breakdown */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className={overdueCount > 0 ? 'text-red-400' : ''}>
              {overdueCount} overdue
            </span>
            <span className={failedCount > 0 ? 'text-orange-400' : ''}>
              {failedCount} failed
            </span>
            <span className={disputesCount > 0 ? 'text-yellow-400' : ''}>
              {disputesCount} disputes
            </span>
            {lowWalletCount > 0 && (
              <span className="text-amber-400">{lowWalletCount} low wallet</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function BillingStatsCards({
  managementFeesCollected,
  managementFeesExpected,
  managementFeesPending,
  adSpendCollected,
  adSpendExpected,
  adSpendPending,
  clientsNeedingAttention,
  overdueCount,
  failedPaymentsCount,
  disputesCount,
  isLoading,
}: BillingStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <RevenueStatCard
        title="Management Fees"
        collected={managementFeesCollected}
        expected={managementFeesExpected}
        pendingCount={managementFeesPending}
        icon={<DollarSign className="w-5 h-5" />}
        variant="success"
        isLoading={isLoading}
      />
      <RevenueStatCard
        title="Ad Spend"
        collected={adSpendCollected}
        expected={adSpendExpected}
        pendingCount={adSpendPending}
        icon={<TrendingUp className="w-5 h-5" />}
        variant="primary"
        expectedLabel="wallet pipeline"
        pendingLabel={`${adSpendPending} auto-billing client${adSpendPending !== 1 ? 's' : ''}`}
        isLoading={isLoading}
      />
      <AttentionStatCard
        title="Clients Needing Attention"
        value={clientsNeedingAttention}
        overdueCount={overdueCount}
        failedCount={failedPaymentsCount}
        disputesCount={disputesCount}
        icon={<AlertTriangle className="w-5 h-5" />}
        isLoading={isLoading}
      />
    </div>
  );
}
