import { BillingRecord } from '@/hooks/useBillingRecords';
import { useClientCredits } from '@/hooks/useClientCredits';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BillingTypeBadge } from './BillingTypeBadge';
import { BillingStatusBadge } from './BillingStatusBadge';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { CalendarDays, CreditCard, FileText, RefreshCw, Repeat, DollarSign, Clock, ExternalLink, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BillingDetailPopupProps {
  record: BillingRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillingDetailPopup({ record, open, onOpenChange }: BillingDetailPopupProps) {
  const { data: clientCredits = [] } = useClientCredits(record?.client_id);
  
  if (!record) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(parseISO(date), 'MMM d, yyyy');
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return '-';
    return format(parseISO(date), 'MMM d, yyyy h:mm a');
  };

  // Find credit applied to this record
  const appliedCredit = clientCredits.find(c => c.applied_to_billing_id === record.id);
  const creditAmountUsed = appliedCredit ? (appliedCredit.original_amount - appliedCredit.remaining_balance) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Billing Record Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with type and status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BillingTypeBadge type={record.billing_type} />
              {record.recurrence_type !== 'one_time' && (
                <Badge variant="outline" className="gap-1">
                  {record.recurrence_type === 'bi_weekly' ? (
                    <><RefreshCw className="w-3 h-3" /> Bi-Weekly</>
                  ) : (
                    <><Repeat className="w-3 h-3" /> Monthly</>
                  )}
                </Badge>
              )}
            </div>
            <BillingStatusBadge status={record.status} />
          </div>

          {/* Amount */}
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Amount</p>
            <p className="text-3xl font-bold">{formatCurrency(Number(record.amount))}</p>
            {appliedCredit && (
              <div className="mt-2 space-y-1">
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                  <Gift className="w-3 h-3 mr-1" />
                  {formatCurrency(creditAmountUsed)} Credit Applied
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Applied on {formatDateTime(appliedCredit.applied_at)}
                </p>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Due Date
              </p>
              <p className="text-sm font-medium">{formatDate(record.due_date)}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Created
              </p>
              <p className="text-sm font-medium">{formatDateTime(record.created_at)}</p>
            </div>

            {record.billing_period_start && record.billing_period_end && (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Period Start</p>
                  <p className="text-sm font-medium">{formatDate(record.billing_period_start)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Period End</p>
                  <p className="text-sm font-medium">{formatDate(record.billing_period_end)}</p>
                </div>
              </>
            )}

            {record.paid_at && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Paid At
                </p>
                <p className="text-sm font-medium text-green-400">{formatDateTime(record.paid_at)}</p>
              </div>
            )}

            {record.next_due_date && record.recurrence_type !== 'one_time' && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Next Due
                </p>
                <p className="text-sm font-medium">{formatDate(record.next_due_date)}</p>
              </div>
            )}
          </div>

          {/* Payment Reference */}
          {record.payment_reference && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Payment Reference
              </p>
              <p className="text-sm font-mono bg-muted px-3 py-2 rounded">{record.payment_reference}</p>
            </div>
          )}

          {/* Notes */}
          {record.notes && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm bg-muted px-3 py-2 rounded">{record.notes}</p>
            </div>
          )}

          {/* Payment Link */}
          {record.payment_link && (
            <Button variant="outline" className="w-full" asChild>
              <a href={record.payment_link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Payment Link
              </a>
            </Button>
          )}

          {/* Record ID */}
          <p className="text-[10px] text-muted-foreground text-center">
            Record ID: {record.id}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}