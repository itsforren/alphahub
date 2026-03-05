import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CreditCard, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRetryPayment } from '@/hooks/useBillingDashboard';
import type { FailedPayment } from '@/hooks/useBillingDashboard';
import { toast } from 'sonner';

interface FailedPaymentsWidgetProps {
  payments: FailedPayment[];
  isLoading?: boolean;
}

function getErrorLabel(error: string | null): string {
  if (!error) return 'Unknown error';
  
  const errorMap: Record<string, string> = {
    'card_declined': 'Card declined',
    'insufficient_funds': 'Insufficient funds',
    'expired_card': 'Expired card',
    'incorrect_cvc': 'Incorrect CVC',
    'processing_error': 'Processing error',
    'card_not_supported': 'Card not supported',
  };
  
  // Check for partial matches
  for (const [key, label] of Object.entries(errorMap)) {
    if (error.toLowerCase().includes(key.replace('_', ' ')) || error.toLowerCase().includes(key)) {
      return label;
    }
  }
  
  // Truncate long errors
  return error.length > 30 ? error.slice(0, 30) + '...' : error;
}

export function FailedPaymentsWidget({ payments, isLoading }: FailedPaymentsWidgetProps) {
  const navigate = useNavigate();
  const retryMutation = useRetryPayment();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetry = async (payment: FailedPayment, e: React.MouseEvent) => {
    e.stopPropagation();
    setRetryingId(payment.id);
    try {
      const result = await retryMutation.mutateAsync(payment.id);
      if (result?.auto_charged) {
        toast.success(`$${payment.amount.toFixed(2)} charged successfully for ${payment.clientName}`);
      } else {
        toast.info(`Payment requires action for ${payment.clientName}`, { description: 'A payment link has been sent' });
      }
    } catch (err: any) {
      toast.error(`Retry failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setRetryingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-red-500/20 overflow-hidden bg-red-500/5">
        <div className="p-4 border-b border-red-500/20">
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!payments.length) {
    return (
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
        <div className="p-4 border-b border-border/50">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-muted-foreground" />
            Failed Payments
          </h3>
        </div>
        <div className="p-8 text-center">
          <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No failed payments</p>
        </div>
      </div>
    );
  }

  const handleClick = (clientId: string) => {
    navigate(`/hub/admin/clients/${clientId}?tab=billing`);
  };

  return (
    <div className="rounded-xl border border-red-500/20 overflow-hidden bg-red-500/5">
      <div className="p-4 border-b border-red-500/20">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          Failed Payments
          <Badge variant="destructive" className="ml-auto">
            {payments.length}
          </Badge>
        </h3>
      </div>
      
      <div className="divide-y divide-red-500/10">
        {payments.slice(0, 5).map((payment) => (
          <div 
            key={payment.id}
            className="p-4 hover:bg-red-500/5 cursor-pointer transition-colors flex items-center justify-between"
            onClick={() => handleClick(payment.clientId)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">{payment.clientName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-red-400">{getErrorLabel(payment.lastError)}</span>
                  {payment.attempts > 1 && (
                    <Badge variant="outline" className="text-xs bg-red-500/10 border-red-500/30 text-red-400">
                      {payment.attempts} attempts
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    payment.billingType === 'management'
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  )}
                >
                  {payment.billingType === 'management' ? 'Mgmt' : 'Ad Spend'}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                disabled={retryingId === payment.id}
                onClick={(e) => handleRetry(payment, e)}
              >
                <RefreshCw className={cn('w-3 h-3', retryingId === payment.id && 'animate-spin')} />
                {retryingId === payment.id ? '...' : 'Retry'}
              </Button>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>
      
      {payments.length > 5 && (
        <div className="p-3 border-t border-red-500/10 text-center">
          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
            View all {payments.length} failed payments
          </Button>
        </div>
      )}
    </div>
  );
}
