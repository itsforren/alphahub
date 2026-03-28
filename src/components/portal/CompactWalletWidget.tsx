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

  if (!trackingStartDate) {
    return (
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white/20" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-white/25 uppercase tracking-wider">Ad Spend Wallet</p>
            <p className="text-sm font-medium text-white/40">Not tracking yet</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'p-3 rounded-xl border transition-all',
      isNegative
        ? 'bg-red-500/[0.06] border-red-500/20'
        : isLowBalance
          ? 'bg-amber-500/[0.06] border-amber-500/20'
          : 'bg-white/[0.02] border-white/[0.06]'
    )}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 min-w-[130px]">
          <div className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border',
            isNegative ? 'bg-red-500/10 border-red-500/20' : isLowBalance ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/[0.04] border-white/[0.06]'
          )}>
            <Wallet className={cn(
              'w-4 h-4',
              isNegative ? 'text-red-400' : isLowBalance ? 'text-amber-400' : 'text-white/30'
            )} />
          </div>
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-wider">Balance</p>
            <p className={cn(
              'text-lg font-semibold leading-tight',
              isNegative ? 'text-red-400' : isLowBalance ? 'text-amber-400' : 'text-white/85'
            )}>
              {isNegative && '-'}${Math.abs(remainingBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between text-[9px] text-white/25">
            <span className="flex items-center gap-0.5">
              <TrendingDown className="w-2.5 h-2.5" />
              Spend: ${trackedSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span>Deposited: ${totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isNegative ? 'bg-red-500/70' : isLowBalance ? 'bg-amber-500/70' : 'bg-white/20'
              )}
              style={{ width: `${spendPercent}%` }}
            />
          </div>
          <div className="flex items-center gap-1 text-[9px] text-white/20">
            <Calendar className="w-2.5 h-2.5" />
            Since {format(new Date(trackingStartDate), 'MMM d, yyyy')}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <div className="text-center px-3 py-1.5 bg-white/[0.03] border border-white/[0.04] rounded-lg">
            <div className="text-sm font-semibold text-white/70">${Math.round(trackedSpend)}</div>
            <div className="text-[8px] text-white/25 uppercase tracking-wider">Spend</div>
          </div>
        </div>
      </div>
    </div>
  );
}
