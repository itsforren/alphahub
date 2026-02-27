import { cn } from '@/lib/utils';
import { BillingStatus } from '@/hooks/useBillingRecords';
import { Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface BillingStatusBadgeProps {
  status: BillingStatus;
  className?: string;
}

const statusConfig: Record<BillingStatus, { 
  label: string; 
  className: string; 
  Icon: typeof Clock;
}> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Icon: Clock,
  },
  paid: {
    label: 'Paid',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
    Icon: CheckCircle,
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
    Icon: AlertCircle,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-muted text-muted-foreground border-border',
    Icon: XCircle,
  },
};

export function BillingStatusBadge({ status, className }: BillingStatusBadgeProps) {
  const config = statusConfig[status];
  const { Icon } = config;
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
