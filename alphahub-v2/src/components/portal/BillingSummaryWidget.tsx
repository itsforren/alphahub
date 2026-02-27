import { useBillingRecords, BillingRecord } from '@/hooks/useBillingRecords';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, AlertCircle, Megaphone, CreditCard, ExternalLink } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';

interface BillingSummaryWidgetProps {
  clientId: string;
  onAddRecord: () => void;
  onViewAll: () => void;
}

export function BillingSummaryWidget({ clientId, onAddRecord, onViewAll }: BillingSummaryWidgetProps) {
  const { data: records, isLoading } = useBillingRecords(clientId);

  const pendingRecords = records?.filter(r => r.status === 'pending' || r.status === 'overdue') || [];
  const adSpendPending = pendingRecords.filter(r => r.billing_type === 'ad_spend');
  const managementPending = pendingRecords.filter(r => r.billing_type === 'management');

  const totalAdSpend = adSpendPending.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalManagement = managementPending.reduce((sum, r) => sum + Number(r.amount), 0);

  const overdueRecords = pendingRecords.filter(r => r.status === 'overdue' || (r.due_date && isPast(parseISO(r.due_date)) && !isToday(parseISO(r.due_date))));

  const nextDue = pendingRecords
    .filter(r => r.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0];

  if (isLoading) {
    return (
      <Card className="frosted-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="frosted-card">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Billing Summary</CardTitle>
        <Button size="sm" variant="ghost" onClick={onAddRecord} className="h-8 gap-1">
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Outstanding Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-blue-400 font-medium">Ad Spend</span>
            </div>
            <div className="text-lg font-bold text-foreground">
              ${totalAdSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">
              {adSpendPending.length} pending
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-purple-400 font-medium">Management</span>
            </div>
            <div className="text-lg font-bold text-foreground">
              ${totalManagement.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">
              {managementPending.length} pending
            </div>
          </div>
        </div>

        {/* Alerts */}
        {overdueRecords.length > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">
              {overdueRecords.length} overdue payment{overdueRecords.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Next Due */}
        {nextDue && (
          <div className="text-sm text-muted-foreground">
            Next due: {format(parseISO(nextDue.due_date!), 'MMM d, yyyy')}
            {nextDue.payment_link && (
              <a 
                href={nextDue.payment_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
              >
                Pay <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* View All Button */}
        <Button variant="outline" size="sm" className="w-full" onClick={onViewAll}>
          View All Records
        </Button>
      </CardContent>
    </Card>
  );
}
