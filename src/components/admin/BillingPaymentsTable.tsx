import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  DollarSign,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  List,
  ExternalLink,
  Archive,
  User,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { OverdueBillingRecord, UpcomingBillingRecord, PaidBillingRecord } from '@/hooks/useBillingDashboard';
import { useArchiveBillingRecord } from '@/hooks/useBillingDashboard';

interface BillingPaymentsTableProps {
  overdueRecords: OverdueBillingRecord[];
  upcomingRecords: UpcomingBillingRecord[];
  paidRecords: PaidBillingRecord[];
  isLoading?: boolean;
  selectedMonth: string;
}

// Normalized detail type for the sheet
interface BillingRecordDetail {
  id: string;
  clientId: string;
  clientName: string;
  billingType: 'ad_spend' | 'management';
  amount: number;
  status: string;
  dueDate?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  recurrenceType?: string | null;
  daysOverdue?: number;
  daysUntilDue?: number;
  stripeInvoiceId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeAccount?: string | null;
  paymentLink?: string | null;
  lastChargeError?: string | null;
}

function toDetail(r: OverdueBillingRecord | UpcomingBillingRecord | PaidBillingRecord): BillingRecordDetail {
  if ('daysOverdue' in r) {
    return { ...r, status: r.status };
  }
  if ('daysUntilDue' in r) {
    return { ...r, status: 'pending' };
  }
  return { ...r, status: 'paid' };
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = parseISO(dateStr);
  return isValid(d) ? format(d, 'MMM d, yyyy') : '—';
}

function fmtDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = parseISO(dateStr);
  return isValid(d) ? format(d, 'MMM d') : '—';
}

function BillingTypeBadge({ type }: { type: 'ad_spend' | 'management' }) {
  if (type === 'management') {
    return (
      <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
        <DollarSign className="w-3 h-3 mr-1" />
        Mgmt Fee
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
      <TrendingUp className="w-3 h-3 mr-1" />
      Ad Spend
    </Badge>
  );
}

function RecurrenceBadge({ type }: { type: string | null | undefined }) {
  if (!type || type === 'one_time') return null;
  const label = type === 'bi_weekly' ? 'Bi-weekly' : type === 'monthly' ? 'Monthly' : type;
  return (
    <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted text-xs ml-1">
      <RefreshCw className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

function StripeLink({ label, id, href }: { label: string; id: string | null | undefined; href: string | null | undefined }) {
  if (!id) return <span className="text-muted-foreground text-sm">—</span>;
  const url = href || null;
  return (
    <div className="flex items-center gap-2">
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-foreground truncate max-w-[220px]">{id}</code>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

// --- Detail Sheet ---
function BillingRecordDetailSheet({
  record,
  open,
  onClose,
}: {
  record: BillingRecordDetail | null;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const archiveMutation = useArchiveBillingRecord();

  if (!record) return null;

  const isOverdue = record.status === 'overdue' || (record.status === 'pending' && record.daysOverdue !== undefined);
  const isPaid = record.status === 'paid';

  const stripeAccount = record.stripeAccount;
  const stripeBase = 'https://dashboard.stripe.com';

  const invoiceUrl = record.stripeInvoiceId
    ? `${stripeBase}/invoices/${record.stripeInvoiceId}`
    : null;
  const subscriptionUrl = record.stripeSubscriptionId
    ? `${stripeBase}/subscriptions/${record.stripeSubscriptionId}`
    : null;
  const paymentIntentUrl = record.stripePaymentIntentId
    ? `${stripeBase}/payments/${record.stripePaymentIntentId}`
    : null;

  const handleArchive = async () => {
    try {
      await archiveMutation.mutateAsync(record.id);
      toast.success('Record archived');
      onClose();
    } catch (err: any) {
      toast.error(`Archive failed: ${err?.message}`);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center justify-between pr-8">
            <span>Payment Details</span>
            <div className="flex items-center gap-2">
              <BillingTypeBadge type={record.billingType} />
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Client + Amount */}
          <div className="rounded-lg border border-border/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => { navigate(`/hub/admin/clients/${record.clientId}?tab=billing`); onClose(); }}
                className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors group"
              >
                <User className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                {record.clientName}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <span className="text-2xl font-bold text-foreground">{fmt(record.amount)}</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <RecurrenceBadge type={record.recurrenceType} />
              {isPaid && (
                <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/30 text-green-400">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Paid
                </Badge>
              )}
              {isOverdue && (
                <Badge variant="outline" className="text-xs bg-red-500/10 border-red-500/30 text-red-400">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {record.daysOverdue === 0 ? 'Due today' : `${record.daysOverdue}d overdue`}
                </Badge>
              )}
              {!isPaid && !isOverdue && record.daysUntilDue !== undefined && (
                <Badge variant="outline" className={cn(
                  'text-xs',
                  record.daysUntilDue <= 2
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : record.daysUntilDue <= 7
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                    : 'bg-green-500/10 border-green-500/30 text-green-400',
                )}>
                  <Clock className="w-3 h-3 mr-1" />
                  Due in {record.daysUntilDue}d
                </Badge>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dates</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {record.dueDate && (
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="font-medium">{fmtDate(record.dueDate)}</p>
                </div>
              )}
              {record.paidAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Paid At</p>
                  <p className="font-medium text-green-400">{fmtDate(record.paidAt)}</p>
                </div>
              )}
            </div>
          </div>

          <Separator className="opacity-30" />

          {/* Stripe IDs */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Stripe
              {stripeAccount && (
                <span className="ml-2 font-normal normal-case text-xs">
                  ({stripeAccount === 'management' ? 'Management account' : 'Ad Spend account'})
                </span>
              )}
            </p>

            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Invoice ID</p>
                <StripeLink label="Invoice" id={record.stripeInvoiceId} href={invoiceUrl} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Subscription ID</p>
                <StripeLink label="Subscription" id={record.stripeSubscriptionId} href={subscriptionUrl} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Payment Intent</p>
                <StripeLink label="Payment" id={record.stripePaymentIntentId} href={paymentIntentUrl} />
              </div>
              {record.paymentLink && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Payment Link</p>
                  <a
                    href={record.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Open payment link <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Last charge error */}
          {record.lastChargeError && (
            <>
              <Separator className="opacity-30" />
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Charge Error</p>
                <p className="text-xs text-red-400 bg-red-500/10 rounded-md px-3 py-2 border border-red-500/20">
                  {record.lastChargeError}
                </p>
              </div>
            </>
          )}

          {/* Notes */}
          {record.notes && (
            <>
              <Separator className="opacity-30" />
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
                <p className="text-sm text-muted-foreground">{record.notes}</p>
              </div>
            </>
          )}

          <Separator className="opacity-30" />

          {/* Actions */}
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => { navigate(`/hub/admin/clients/${record.clientId}?tab=billing`); onClose(); }}
            >
              <User className="w-4 h-4" />
              View client billing
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
            {!isPaid && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-orange-400 border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-300"
                onClick={handleArchive}
                disabled={archiveMutation.isPending}
              >
                <Archive className="w-4 h-4" />
                {archiveMutation.isPending ? 'Archiving…' : 'Archive this record'}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// --- Overdue Table ---
function OverdueRows({
  records,
  onSelect,
  onArchive,
}: {
  records: OverdueBillingRecord[];
  onSelect: (r: BillingRecordDetail) => void;
  onArchive: (id: string) => void;
}) {
  if (!records.length) {
    return (
      <div className="p-12 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No overdue payments</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[200px]">Client</TableHead>
            <TableHead className="w-[110px]">Due Date</TableHead>
            <TableHead className="w-[160px]">Type</TableHead>
            <TableHead className="w-[100px] text-right">Amount</TableHead>
            <TableHead className="w-[150px]">Overdue By</TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map(r => (
            <TableRow
              key={r.id}
              className="cursor-pointer hover:bg-red-500/5 transition-colors border-l-2 border-l-red-500/40"
              onClick={() => onSelect(toDetail(r))}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span className="font-medium text-foreground">{r.clientName}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{fmtDateShort(r.dueDate)}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <BillingTypeBadge type={r.billingType} />
                  <RecurrenceBadge type={r.recurrenceType} />
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">
                {fmt(r.amount)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs bg-red-500/10 border-red-500/30 text-red-400">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {r.daysOverdue === 0 ? 'Today' : `${r.daysOverdue}d overdue`}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10"
                    title="Archive record"
                    onClick={(e) => { e.stopPropagation(); onArchive(r.id); }}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// --- Upcoming Table ---
function UpcomingRows({
  records,
  onSelect,
}: {
  records: UpcomingBillingRecord[];
  onSelect: (r: BillingRecordDetail) => void;
}) {
  if (!records.length) {
    return (
      <div className="p-12 text-center">
        <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No upcoming payments in the next 30 days</p>
      </div>
    );
  }

  function getDueBadge(days: number) {
    if (days <= 2) return { cls: 'bg-red-500/10 border-red-500/30 text-red-400', label: days === 0 ? 'Due today' : `Due in ${days}d` };
    if (days <= 7) return { cls: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400', label: `Due in ${days}d` };
    return { cls: 'bg-green-500/10 border-green-500/30 text-green-400', label: `Due in ${days}d` };
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[200px]">Client</TableHead>
            <TableHead className="w-[110px]">Due Date</TableHead>
            <TableHead className="w-[160px]">Type</TableHead>
            <TableHead className="w-[100px] text-right">Amount</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map(r => {
            const badge = getDueBadge(r.daysUntilDue);
            return (
              <TableRow
                key={r.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSelect(toDetail(r))}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      r.daysUntilDue <= 2 ? 'bg-red-500' : r.daysUntilDue <= 7 ? 'bg-yellow-500' : 'bg-green-500',
                    )} />
                    <span className="font-medium text-foreground">{r.clientName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{fmtDateShort(r.dueDate)}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <BillingTypeBadge type={r.billingType} />
                    <RecurrenceBadge type={r.recurrenceType} />
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold text-foreground">
                  {fmt(r.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('text-xs', badge.cls)}>
                    <Clock className="w-3 h-3 mr-1" />
                    {badge.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// --- Paid Table ---
function PaidRows({
  records,
  selectedMonth,
  onSelect,
}: {
  records: PaidBillingRecord[];
  selectedMonth: string;
  onSelect: (r: BillingRecordDetail) => void;
}) {
  if (!records.length) {
    return (
      <div className="p-12 text-center">
        <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No payments collected in {selectedMonth}</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[200px]">Client</TableHead>
            <TableHead className="w-[110px]">Paid</TableHead>
            <TableHead className="w-[160px]">Type</TableHead>
            <TableHead className="w-[100px] text-right">Amount</TableHead>
            <TableHead className="w-[150px]" />
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map(r => (
            <TableRow
              key={r.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onSelect(toDetail(r))}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <span className="font-medium text-foreground">{r.clientName}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{fmtDateShort(r.paidAt)}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <BillingTypeBadge type={r.billingType} />
                  <RecurrenceBadge type={r.recurrenceType} />
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold text-green-400">
                {fmt(r.amount)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/30 text-green-400">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Paid
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// --- All Table ---
function AllRows({
  overdue,
  upcoming,
  paid,
  selectedMonth,
  onSelect,
  onArchive,
}: {
  overdue: OverdueBillingRecord[];
  upcoming: UpcomingBillingRecord[];
  paid: PaidBillingRecord[];
  selectedMonth: string;
  onSelect: (r: BillingRecordDetail) => void;
  onArchive: (id: string) => void;
}) {
  const totalCount = overdue.length + upcoming.length + paid.length;

  if (!totalCount) {
    return (
      <div className="p-12 text-center">
        <List className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No billing records for {selectedMonth}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[200px]">Client</TableHead>
            <TableHead className="w-[110px]">Date</TableHead>
            <TableHead className="w-[160px]">Type</TableHead>
            <TableHead className="w-[100px] text-right">Amount</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {overdue.length > 0 && (
            <TableRow className="hover:bg-transparent bg-red-500/5">
              <TableCell colSpan={6} className="py-1.5">
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                  Overdue ({overdue.length})
                </span>
              </TableCell>
            </TableRow>
          )}
          {overdue.map(r => (
            <TableRow
              key={r.id}
              className="cursor-pointer hover:bg-red-500/5 transition-colors border-l-2 border-l-red-500/40"
              onClick={() => onSelect(toDetail(r))}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span className="font-medium text-foreground">{r.clientName}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{fmtDateShort(r.dueDate)}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <BillingTypeBadge type={r.billingType} />
                  <RecurrenceBadge type={r.recurrenceType} />
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">{fmt(r.amount)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs bg-red-500/10 border-red-500/30 text-red-400">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {r.daysOverdue === 0 ? 'Today' : `${r.daysOverdue}d overdue`}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10"
                    title="Archive record"
                    onClick={(e) => { e.stopPropagation(); onArchive(r.id); }}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}

          {upcoming.length > 0 && (
            <TableRow className="hover:bg-transparent bg-muted/20">
              <TableCell colSpan={6} className="py-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Upcoming ({upcoming.length})
                </span>
              </TableCell>
            </TableRow>
          )}
          {upcoming.map(r => (
            <TableRow
              key={r.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onSelect(toDetail(r))}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    r.daysUntilDue <= 2 ? 'bg-red-500' : r.daysUntilDue <= 7 ? 'bg-yellow-500' : 'bg-green-500',
                  )} />
                  <span className="font-medium text-foreground">{r.clientName}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{fmtDateShort(r.dueDate)}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <BillingTypeBadge type={r.billingType} />
                  <RecurrenceBadge type={r.recurrenceType} />
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">{fmt(r.amount)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground">
                  <Clock className="w-3 h-3 mr-1" />
                  In {r.daysUntilDue}d
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}

          {paid.length > 0 && (
            <TableRow className="hover:bg-transparent bg-green-500/5">
              <TableCell colSpan={6} className="py-1.5">
                <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">
                  Paid ({paid.length})
                </span>
              </TableCell>
            </TableRow>
          )}
          {paid.map(r => (
            <TableRow
              key={r.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onSelect(toDetail(r))}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <span className="font-medium text-foreground">{r.clientName}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{fmtDateShort(r.paidAt)}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <BillingTypeBadge type={r.billingType} />
                  <RecurrenceBadge type={r.recurrenceType} />
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold text-green-400">{fmt(r.amount)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/30 text-green-400">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Paid
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function BillingPaymentsTable({
  overdueRecords,
  upcomingRecords,
  paidRecords,
  isLoading,
  selectedMonth,
}: BillingPaymentsTableProps) {
  const [selectedRecord, setSelectedRecord] = useState<BillingRecordDetail | null>(null);
  const archiveMutation = useArchiveBillingRecord();

  const handleArchive = async (id: string) => {
    try {
      await archiveMutation.mutateAsync(id);
      toast.success('Record archived');
    } catch (err: any) {
      toast.error(`Archive failed: ${err?.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
        <div className="p-4 border-b border-border/50">
          <Skeleton className="h-8 w-96" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const overdueTotal = overdueRecords.reduce((s, r) => s + r.amount, 0);
  const upcomingTotal = upcomingRecords.reduce((s, r) => s + r.amount, 0);
  const paidTotal = paidRecords.reduce((s, r) => s + r.amount, 0);
  const allCount = overdueRecords.length + upcomingRecords.length + paidRecords.length;

  function TabLabel({
    icon,
    label,
    count,
    total,
    colorClass,
  }: {
    icon: React.ReactNode;
    label: string;
    count: number;
    total: number;
    colorClass?: string;
  }) {
    return (
      <span className="flex items-center gap-1.5">
        {icon}
        <span>{label}</span>
        {count > 0 && (
          <>
            <span className={cn('font-semibold', colorClass)}>({count})</span>
            <span className="text-muted-foreground hidden sm:inline">· {fmt(total)}</span>
          </>
        )}
      </span>
    );
  }

  return (
    <>
      <BillingRecordDetailSheet
        record={selectedRecord}
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />

      <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
        <Tabs defaultValue="overdue">
          <div className="px-4 pt-4 border-b border-border/50">
            <TabsList className="bg-transparent border border-border/50 h-auto p-0 gap-0 w-full sm:w-auto">
              <TabsTrigger
                value="overdue"
                className="rounded-none first:rounded-l-md last:rounded-r-md border-r border-border/50 px-4 py-2 data-[state=active]:bg-red-500/10 data-[state=active]:text-red-400"
              >
                <TabLabel
                  icon={<AlertCircle className="w-3.5 h-3.5" />}
                  label="Overdue"
                  count={overdueRecords.length}
                  total={overdueTotal}
                  colorClass="text-red-400"
                />
              </TabsTrigger>
              <TabsTrigger
                value="upcoming"
                className="rounded-none border-r border-border/50 px-4 py-2 data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-400"
              >
                <TabLabel
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label="Upcoming"
                  count={upcomingRecords.length}
                  total={upcomingTotal}
                  colorClass="text-yellow-400"
                />
              </TabsTrigger>
              <TabsTrigger
                value="paid"
                className="rounded-none border-r border-border/50 px-4 py-2 data-[state=active]:bg-green-500/10 data-[state=active]:text-green-400"
              >
                <TabLabel
                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  label="Paid"
                  count={paidRecords.length}
                  total={paidTotal}
                  colorClass="text-green-400"
                />
              </TabsTrigger>
              <TabsTrigger
                value="all"
                className="rounded-none last:rounded-r-md px-4 py-2"
              >
                <TabLabel
                  icon={<List className="w-3.5 h-3.5" />}
                  label="All"
                  count={allCount}
                  total={overdueTotal + upcomingTotal + paidTotal}
                />
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overdue" className="m-0">
            <OverdueRows records={overdueRecords} onSelect={setSelectedRecord} onArchive={handleArchive} />
          </TabsContent>
          <TabsContent value="upcoming" className="m-0">
            <UpcomingRows records={upcomingRecords} onSelect={setSelectedRecord} />
          </TabsContent>
          <TabsContent value="paid" className="m-0">
            <PaidRows records={paidRecords} selectedMonth={selectedMonth} onSelect={setSelectedRecord} />
          </TabsContent>
          <TabsContent value="all" className="m-0">
            <AllRows
              overdue={overdueRecords}
              upcoming={upcomingRecords}
              paid={paidRecords}
              selectedMonth={selectedMonth}
              onSelect={setSelectedRecord}
              onArchive={handleArchive}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
