import { DollarSign, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useUpcomingPayments } from '@/hooks/useUpcomingPayments';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface UpcomingPaymentsWidgetProps {
  clientId: string;
}

export function UpcomingPaymentsWidget({ clientId }: UpcomingPaymentsWidgetProps) {
  const { data, isLoading } = useUpcomingPayments(clientId);

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  const { adSpend, management } = data || {};

  if (!adSpend && !management) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const getDueStatus = (daysUntilDue: number | null) => {
    if (daysUntilDue === null) return { label: 'No due date', color: 'text-muted-foreground', bgColor: 'bg-muted/50', icon: null };
    if (daysUntilDue < 0) return { label: `Overdue by ${Math.abs(daysUntilDue)} days`, color: 'text-destructive', bgColor: 'bg-destructive/10', icon: AlertCircle };
    if (daysUntilDue === 0) return { label: 'Due today', color: 'text-orange-600', bgColor: 'bg-orange-500/10', icon: AlertCircle };
    if (daysUntilDue <= 3) return { label: `Due in ${daysUntilDue} days`, color: 'text-orange-600', bgColor: 'bg-orange-500/10', icon: AlertCircle };
    if (daysUntilDue <= 7) return { label: `Due in ${daysUntilDue} days`, color: 'text-yellow-600', bgColor: 'bg-yellow-500/10', icon: null };
    return { label: `Due in ${daysUntilDue} days`, color: 'text-green-600', bgColor: 'bg-green-500/10', icon: CheckCircle2 };
  };

  const PaymentBadge = ({ 
    type, 
    amount, 
    dueDate, 
    daysUntilDue 
  }: { 
    type: 'ad_spend' | 'management'; 
    amount: number; 
    dueDate: string | null;
    daysUntilDue: number | null;
  }) => {
    const status = getDueStatus(daysUntilDue);
    const Icon = type === 'ad_spend' ? DollarSign : CreditCard;
    const label = type === 'ad_spend' ? 'Ad Spend' : 'Mgmt Fee';
    const StatusIcon = status.icon;

    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border",
        status.bgColor,
        "border-border/50"
      )}>
        <Icon className="w-4 h-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}:</span>
          <span className="text-sm font-semibold text-foreground">{formatCurrency(amount)}</span>
          <span className={cn("text-sm font-medium", status.color)}>
            {status.label}
          </span>
          {StatusIcon && <StatusIcon className={cn("w-4 h-4", status.color)} />}
          {dueDate && (
            <span className="text-xs text-muted-foreground">
              ({format(parseISO(dueDate), 'MMM d')})
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-wrap gap-3">
      {adSpend && (
        <PaymentBadge
          type="ad_spend"
          amount={adSpend.amount}
          dueDate={adSpend.due_date}
          daysUntilDue={adSpend.daysUntilDue}
        />
      )}
      {management && (
        <PaymentBadge
          type="management"
          amount={management.amount}
          dueDate={management.due_date}
          daysUntilDue={management.daysUntilDue}
        />
      )}
    </div>
  );
}
