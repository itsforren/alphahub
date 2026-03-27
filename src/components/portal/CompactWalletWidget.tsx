import { Wallet, Calendar, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CompactWalletWidgetProps {
  remainingBalance: number;
  trackedSpend: number;
  totalDeposits: number;
  threshold?: number;
  trackingStartDate: string | null;
  onSettingsClick?: () => void;
}

export function CompactWalletWidget({
  remainingBalance,
  trackedSpend,
  totalDeposits,
  threshold = 150,
  trackingStartDate,
}: CompactWalletWidgetProps) {
  const isNegative = remainingBalance < 0;
  const isLowBalance = remainingBalance <= threshold && !isNegative;
  const spendPercent = totalDeposits > 0 
    ? Math.min(100, (trackedSpend / totalDeposits) * 100) 
    : 0;

  // Not tracking yet
  if (!trackingStartDate) {
    return (
      <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Ad Spend Wallet</p>
            <p className="text-sm font-medium text-foreground">Not tracking yet</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'p-3 rounded-xl border transition-all',
      isNegative 
        ? 'bg-gradient-to-r from-red-500/10 to-transparent border-red-500/30' 
        : isLowBalance 
          ? 'bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/30'
          : 'bg-gradient-to-r from-blue-500/10 to-blue-500/5 border-blue-500/20'
    )}>
      <div className="flex items-center gap-3">
        {/* Icon + Balance */}
        <div className="flex items-center gap-3 min-w-[140px]">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
            isNegative ? 'bg-red-500/20' : isLowBalance ? 'bg-orange-500/20' : 'bg-blue-500/20'
          )}>
            <Wallet className={cn(
              'w-5 h-5',
              isNegative ? 'text-red-400' : isLowBalance ? 'text-orange-400' : 'text-blue-400'
            )} />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Remaining Balance</p>
            <p className={cn(
              'text-xl font-bold leading-tight',
              isNegative ? 'text-red-400' : isLowBalance ? 'text-orange-400' : 'text-foreground'
            )}>
              {isNegative && '-'}${Math.abs(remainingBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Progress Bar + Info */}
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <TrendingDown className="w-2.5 h-2.5" />
              Tracked Spend: ${trackedSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span>Deposited: ${totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="h-2 bg-background/50 rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full transition-all',
                isNegative ? 'bg-red-500' : isLowBalance ? 'bg-orange-500' : 'bg-blue-500'
              )}
              style={{ width: `${spendPercent}%` }}
            />
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="w-2.5 h-2.5" />
            Tracking since: {format(new Date(trackingStartDate), 'MMM d, yyyy')}
          </div>
        </div>

        {/* Stats Boxes */}
        <div className="hidden md:flex items-center gap-2">
          <div className="text-center px-3 py-1.5 bg-muted/40 rounded-lg">
            <div className="text-sm font-semibold text-foreground">${Math.round(trackedSpend)}</div>
            <div className="text-[9px] text-muted-foreground uppercase">Spend</div>
          </div>
        </div>
      </div>
    </div>
  );
}
