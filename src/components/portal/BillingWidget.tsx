import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBillingRecords, useCreateBillingRecord, useUpdateBillingRecord, BillingRecord, BillingStatus, CreateBillingRecordInput, UpdateBillingRecordInput } from '@/hooks/useBillingRecords';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BillingRecordsTable } from './BillingRecordsTable';
import { BillingRecordModal } from './BillingRecordModal';
import {
  Plus, Filter, Receipt, AlertCircle, Megaphone, CreditCard,
  RefreshCw, ExternalLink, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface BillingWidgetProps {
  clientId: string;
  isAdmin?: boolean;
}

interface StripeInvoice {
  id: string;
  stripeAccount: string;
  number: string | null;
  amount: number;
  amountPaid: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  description: string | null;
  created: string | null;
  dueDate: string | null;
  paidAt: string | null;
  hostedUrl: string | null;
  pdfUrl: string | null;
  lastPaymentError: string | null;
  attemptCount: number;
}

function StripeStatusBadge({ status }: { status: StripeInvoice['status'] }) {
  const styles: Record<string, string> = {
    paid: 'bg-green-500/15 text-green-700 border-green-500/30',
    open: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
    void: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30',
    uncollectible: 'bg-red-500/15 text-red-700 border-red-500/30',
    draft: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', styles[status] ?? styles.draft)}>
      {status}
    </span>
  );
}

export function BillingWidget({ clientId, isAdmin = true }: BillingWidgetProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BillingRecord | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'ad_spend' | 'management'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | BillingStatus>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  const queryClient = useQueryClient();
  const { data: records, isLoading, refetch } = useBillingRecords(clientId);
  const createMutation = useCreateBillingRecord();
  const updateMutation = useUpdateBillingRecord();

  // Summary stats from local records
  const pendingRecords = records?.filter(r => r.status === 'pending' || r.status === 'overdue') || [];
  const adSpendPending = pendingRecords.filter(r => r.billing_type === 'ad_spend');
  const managementPending = pendingRecords.filter(r => r.billing_type === 'management');
  const totalAdSpend = adSpendPending.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalManagement = managementPending.reduce((sum, r) => sum + Number(r.amount), 0);
  const overdueRecords = pendingRecords.filter(
    r => r.status === 'overdue' || (r.due_date && isPast(parseISO(r.due_date)) && !isToday(parseISO(r.due_date)))
  );

  // Live Stripe activity
  const { data: stripeData, isLoading: stripeLoading, refetch: refetchStripe } = useQuery({
    queryKey: ['stripe-activity', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-client-stripe-activity', {
        body: { clientId },
      });
      if (error) throw error;
      return data as { invoices: StripeInvoice[]; customerCount: number; message?: string };
    },
    staleTime: 60_000,
  });

  const stripeAlertCount = (stripeData?.invoices || []).filter(
    i => i.status === 'uncollectible' || (i.status === 'open' && i.attemptCount > 0)
  ).length;

  const handleOpenModal = (record?: BillingRecord) => {
    setEditingRecord(record || null);
    setModalOpen(true);
  };

  const handleSave = async (data: CreateBillingRecordInput | UpdateBillingRecordInput) => {
    try {
      if ('id' in data) {
        await updateMutation.mutateAsync(data as UpdateBillingRecordInput);
        toast.success('Record updated');
      } else {
        await createMutation.mutateAsync(data as CreateBillingRecordInput);
        toast.success('Record created');
      }
    } catch {
      toast.error('Failed to save record');
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-stripe-charges', {
        body: { clientId },
      });
      if (error) {
        toast.error('Sync failed');
      } else {
        const { created = 0, updated = 0 } = data || {};
        const msg = [
          created > 0 && `${created} new record${created !== 1 ? 's' : ''} imported`,
          updated > 0 && `${updated} record${updated !== 1 ? 's' : ''} updated`,
        ].filter(Boolean).join(', ');
        toast.success(msg || 'Already in sync', { description: 'Stripe sync complete' });
        refetch();
        refetchStripe();
        queryClient.invalidateQueries({ queryKey: ['billing-dashboard-failed'] });
        queryClient.invalidateQueries({ queryKey: ['billing-dashboard-upcoming'] });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="frosted-card overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20">
          <Skeleton className="h-6 w-40" />
        </div>
        <CardContent className="p-5">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="frosted-card overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Billing & Invoices</h3>
                <p className="text-xs text-muted-foreground">
                  {pendingRecords.length} pending · {records?.length || 0} total records
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="gap-1.5"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin')} />
                  {isSyncing ? 'Syncing…' : 'Sync Stripe'}
                </Button>
              )}
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => handleOpenModal()}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Record
                </Button>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Megaphone className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-blue-400 font-medium uppercase tracking-wide">Ad Spend</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                ${totalAdSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {adSpendPending.length} pending payment{adSpendPending.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-400 font-medium uppercase tracking-wide">Management</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                ${totalManagement.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {managementPending.length} pending payment{managementPending.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Overdue Alert */}
          {overdueRecords.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <span className="text-sm font-medium text-red-400">
                  {overdueRecords.length} Overdue Payment{overdueRecords.length > 1 ? 's' : ''}
                </span>
                <p className="text-xs text-muted-foreground">Action required to avoid service disruption</p>
              </div>
            </div>
          )}

          {/* Tabs: Stripe Activity | History */}
          <Tabs defaultValue="stripe">
            <TabsList className="w-full">
              <TabsTrigger value="stripe" className="flex-1 gap-1.5">
                Stripe Activity
                {stripeAlertCount > 0 && (
                  <Badge variant="destructive" className="px-1.5 py-0 text-xs">{stripeAlertCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1">
                History
              </TabsTrigger>
            </TabsList>

            {/* ── Stripe Activity ── */}
            <TabsContent value="stripe" className="mt-3">
              {stripeLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : !stripeData?.invoices?.length ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {stripeData?.customerCount === 0
                    ? 'No Stripe customer linked to this client yet.'
                    : stripeData?.message || 'No Stripe invoices found.'}
                  {isAdmin && (
                    <p className="mt-1 text-xs">Click "Sync Stripe" above to import any missing invoices.</p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground text-xs">
                        <th className="pb-2 pr-3 font-medium">Invoice</th>
                        <th className="pb-2 pr-3 font-medium">Amount</th>
                        <th className="pb-2 pr-3 font-medium">Status</th>
                        <th className="pb-2 pr-3 font-medium">Date</th>
                        <th className="pb-2 font-medium">Links</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stripeData.invoices.map(inv => (
                        <tr
                          key={inv.id}
                          className={cn('border-b last:border-0', {
                            'bg-red-500/5': inv.status === 'uncollectible',
                            'bg-yellow-500/5': inv.status === 'open' && inv.attemptCount > 0,
                          })}
                        >
                          <td className="py-2.5 pr-3">
                            <div className="font-mono text-xs text-muted-foreground">
                              {inv.number || inv.id.slice(0, 14)}
                            </div>
                            {inv.description && (
                              <div
                                className="mt-0.5 max-w-[160px] truncate text-xs text-muted-foreground"
                                title={inv.description}
                              >
                                {inv.description}
                              </div>
                            )}
                            {inv.lastPaymentError && (
                              <div className="mt-0.5 text-xs text-red-500 truncate max-w-[160px]" title={inv.lastPaymentError}>
                                {inv.lastPaymentError}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 pr-3 font-medium whitespace-nowrap">
                            ${inv.amount.toFixed(2)}
                            {inv.status === 'paid' && inv.amountPaid !== inv.amount && (
                              <div className="text-xs text-muted-foreground">paid ${inv.amountPaid.toFixed(2)}</div>
                            )}
                          </td>
                          <td className="py-2.5 pr-3">
                            <StripeStatusBadge status={inv.status} />
                            {inv.attemptCount > 1 && (
                              <div className="text-xs text-muted-foreground mt-0.5">{inv.attemptCount} attempts</div>
                            )}
                          </td>
                          <td className="py-2.5 pr-3 text-xs whitespace-nowrap">
                            {inv.paidAt
                              ? <span className="text-green-600">{format(parseISO(inv.paidAt), 'MMM d, yyyy')}</span>
                              : inv.created
                              ? format(parseISO(inv.created), 'MMM d, yyyy')
                              : '—'}
                          </td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              {inv.hostedUrl && (
                                <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer" title="View invoice">
                                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                </a>
                              )}
                              {inv.pdfUrl && (
                                <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" title="Download PDF">
                                  <FileText className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* ── History ── */}
            <TabsContent value="history" className="mt-3">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                  <SelectTrigger className="w-[100px] sm:w-[120px] h-8 text-sm">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="ad_spend">Ad Spend</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                  <SelectTrigger className="w-[100px] sm:w-[120px] h-8 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <BillingRecordsTable
                records={records || []}
                onEdit={isAdmin ? handleOpenModal : undefined}
                filterType={filterType}
                filterStatus={filterStatus}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <BillingRecordModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        clientId={clientId}
        record={editingRecord}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}
