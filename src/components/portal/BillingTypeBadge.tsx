import { cn } from '@/lib/utils';
import { BillingType } from '@/hooks/useBillingRecords';
import { CreditCard, Megaphone } from 'lucide-react';

interface BillingTypeBadgeProps {
  type: BillingType;
  className?: string;
}

export function BillingTypeBadge({ type, className }: BillingTypeBadgeProps) {
  const isAdSpend = type === 'ad_spend';
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        isAdSpend 
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
          : 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
        className
      )}
    >
      {isAdSpend ? (
        <Megaphone className="w-3 h-3" />
      ) : (
        <CreditCard className="w-3 h-3" />
      )}
      {isAdSpend ? 'Ad Spend' : 'Management'}
    </span>
  );
}
