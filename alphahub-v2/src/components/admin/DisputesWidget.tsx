import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { AlertCircle, Scale, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Dispute } from '@/hooks/useBillingDashboard';

interface DisputesWidgetProps {
  disputes: Dispute[];
  isLoading?: boolean;
}

function getReasonLabel(reason: string | null): string {
  if (!reason) return 'Unknown';
  
  const reasonMap: Record<string, string> = {
    'fraudulent': 'Fraudulent',
    'duplicate': 'Duplicate charge',
    'subscription_canceled': 'Sub canceled',
    'product_not_received': 'Not received',
    'product_unacceptable': 'Unacceptable',
    'unrecognized': 'Unrecognized',
    'general': 'General',
  };
  
  return reasonMap[reason] || reason;
}

function getStatusBadge(status: string) {
  if (status.includes('needs_response')) {
    return (
      <Badge variant="destructive" className="text-xs">
        Needs Response
      </Badge>
    );
  }
  if (status.includes('under_review')) {
    return (
      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 text-xs">
        Under Review
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs">
      {status}
    </Badge>
  );
}

function getDeadlineUrgency(deadline: string | null): { label: string; urgent: boolean } {
  if (!deadline) return { label: 'No deadline', urgent: false };
  
  const date = parseISO(deadline);
  if (!isValid(date)) return { label: 'Invalid date', urgent: false };
  
  const daysLeft = differenceInDays(date, new Date());
  
  if (daysLeft < 0) return { label: 'Expired', urgent: true };
  if (daysLeft === 0) return { label: 'Due today!', urgent: true };
  if (daysLeft === 1) return { label: 'Due tomorrow', urgent: true };
  if (daysLeft <= 3) return { label: `${daysLeft} days left`, urgent: true };
  return { label: format(date, 'MMM d'), urgent: false };
}

export function DisputesWidget({ disputes, isLoading }: DisputesWidgetProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-orange-500/20 overflow-hidden bg-orange-500/5">
        <div className="p-4 border-b border-orange-500/20">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!disputes.length) {
    return (
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
        <div className="p-4 border-b border-border/50">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Scale className="w-5 h-5 text-muted-foreground" />
            Active Disputes
          </h3>
        </div>
        <div className="p-8 text-center">
          <Scale className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No active disputes</p>
        </div>
      </div>
    );
  }

  const handleClick = (clientId: string) => {
    navigate(`/hub/admin/clients/${clientId}?tab=billing`);
  };

  return (
    <div className="rounded-xl border border-orange-500/20 overflow-hidden bg-orange-500/5">
      <div className="p-4 border-b border-orange-500/20">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Scale className="w-5 h-5 text-orange-400" />
          Active Disputes
          <Badge className="ml-auto bg-orange-500/20 text-orange-400 border-orange-500/30">
            {disputes.length}
          </Badge>
        </h3>
      </div>
      
      <div className="divide-y divide-orange-500/10">
        {disputes.slice(0, 5).map((dispute) => {
          const deadline = getDeadlineUrgency(dispute.evidenceDeadline);
          
          return (
            <div 
              key={dispute.id}
              className="p-4 hover:bg-orange-500/5 cursor-pointer transition-colors flex items-center justify-between"
              onClick={() => handleClick(dispute.clientId)}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  deadline.urgent ? 'bg-red-500/10' : 'bg-orange-500/10'
                )}>
                  <AlertCircle className={cn(
                    'w-5 h-5',
                    deadline.urgent ? 'text-red-400' : 'text-orange-400'
                  )} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{dispute.clientName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-muted-foreground">
                      {getReasonLabel(dispute.reason)}
                    </span>
                    {getStatusBadge(dispute.status)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    ${dispute.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <div className={cn(
                    'flex items-center gap-1 text-xs',
                    deadline.urgent ? 'text-red-400' : 'text-muted-foreground'
                  )}>
                    <Clock className="w-3 h-3" />
                    {deadline.label}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          );
        })}
      </div>
      
      {disputes.length > 5 && (
        <div className="p-3 border-t border-orange-500/10 text-center">
          <Button variant="ghost" size="sm" className="text-orange-400 hover:text-orange-300">
            View all {disputes.length} disputes
          </Button>
        </div>
      )}
    </div>
  );
}
