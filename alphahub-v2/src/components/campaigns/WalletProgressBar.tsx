import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { differenceInDays, format } from 'date-fns';

interface WalletProgressBarProps {
  spentToDate: number;
  targetSpend: number;
  cycleEndDate: string | null;
  className?: string;
}

export function WalletProgressBar({
  spentToDate,
  targetSpend,
  cycleEndDate,
  className,
}: WalletProgressBarProps) {
  const progressPercent = targetSpend > 0 
    ? Math.min(100, (spentToDate / targetSpend) * 100) 
    : 0;
  
  const daysRemaining = cycleEndDate 
    ? Math.max(0, differenceInDays(new Date(cycleEndDate), new Date()))
    : null;

  // Determine if on track
  // If we're at or ahead of where we should be (linear), show green
  // If behind, show yellow/red
  const totalDays = 30;
  const daysPassed = daysRemaining !== null ? totalDays - daysRemaining : 0;
  const expectedProgress = (daysPassed / totalDays) * 100;
  const progressDiff = progressPercent - expectedProgress;

  let progressColor = 'bg-green-500';
  if (progressDiff < -20) {
    progressColor = 'bg-red-500';
  } else if (progressDiff < -10) {
    progressColor = 'bg-yellow-500';
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-2 min-w-[120px]", className)}>
          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all", progressColor)}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {Math.round(progressPercent)}%
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1 text-sm">
          <p className="font-medium">Wallet Progress</p>
          <p>Spent: {formatCurrency(spentToDate)} / {formatCurrency(targetSpend)}</p>
          <p>Target: 95% by cycle end</p>
          {daysRemaining !== null && (
            <p className="text-muted-foreground">
              {daysRemaining} days remaining
              {cycleEndDate && ` (ends ${format(new Date(cycleEndDate), 'MMM d')})`}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
