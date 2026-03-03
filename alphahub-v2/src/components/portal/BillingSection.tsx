import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBillingRecords, useCreateBillingRecord, useUpdateBillingRecord, BillingRecord, BillingStatus, CreateBillingRecordInput, UpdateBillingRecordInput } from '@/hooks/useBillingRecords';
import { useUpcomingPayments, useFailedPayments } from '@/hooks/useBillingDashboard';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BillingRecordsTable } from './BillingRecordsTable';
import { BillingRecordModal } from './BillingRecordModal';
import { Plus, RefreshCw, Filter, ExternalLink, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface BillingSectionProps {
  clientId: string;
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
  periodStart: string | null;
  periodEnd: string | null;
  hostedUrl: string | null;
  pdfUrl: string | null;
  lastPaymentError: string | null;
  attemptCount: number;
  subscriptionId: string | null;
}

function StripeStatusBadge({ status }: { status: StripeInvoice['status'] }) {
  const map = {
    paid: 'bg-green-500/15 text-green-700 border-green-500/30',
    open: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
    void: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30',
    uncollectible: 'bg-red-500/15 text-red-700 border-red-500/30',
    draft: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', map[status] || map.draft)}>
      {status}
    </span>
  );
}

export function BillingSection({ clientId }: BillingSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BillingRecord | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'ad_spend' | 'management'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | BillingStatus>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  const queryClient = useQueryClient();
  const { data: records, isLoading, refetch } = useBillingRecords(clientId);
  const createMutation = useCreateBillingRecord();
  const updateMutation = useUpdateBillingRecord();

  // Subscriptions for this client
  const { data: subscriptions, isLoading: subsLoading } = useQuery({
    queryKey: ['client-stripe-subscriptions', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_stripe_subscriptions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Live Stripe activity — fetched directly from Stripe via edge function
  const {
    data: stripeActivity,
    isLoading: stripeLoading,
    refetch: refetchStripe,
    error: stripeError,
  } = useQuery({
    queryKey: ['stripe-activity', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-client-stripe-activity', {
        body: { clientId },
      });
      if (error) throw error;
      return data as { invoices: StripeInvoice[]; customerCount: number; message?: string };
    },
    staleTime: 60_000, // Re-fetch at most every 60s
  });

  // Global upcoming/failed hooks — filter by clientId
  const { data: allUpcoming } = useUpcomingPayments();
  const { data: allFailed } = useFailedPayments();
  const upcoming = (allUpcoming || []).filter(p => p.clientId === clientId);
  const failed = (allFailed || []).filter(p => p.clientId === clientId);

  // Count open/uncollectible in Stripe feed for badge
  const stripeAlertCount = (stripeActivity?.invoices || []).filter(
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

  // Sync button: full per-client Stripe sync — creates missing records + updates existing
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
        // Refetch everything
        refetch();
        refetchStripe();
        queryClient.invalidateQueries({ queryKey: ['billing-dashboard-failed'] });
        queryClient.invalidateQueries({ queryKey: ['billing-dashboard-upcoming'] });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetry = async (recordId: string) => {
    try {
      const { error } = await supabase.functions.invoke('create-stripe-invoice', {
        body: { billing_record_id: recordId },
      });
      if (error) toast.error('Retry failed');
      else {
        toast.success('Invoice created');
        refetch();
      }
    } catch {
      toast.error('Retry failed');
    }
  };

  if (isLoading) {
    return (
      <Card className="frosted-card">
        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="frosted-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Billing</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => handleOpenModal()} className="gap-1">
            <Plus className="w-4 h-4" />
            Add Record
          </Button>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={cn('w-4 h-4 mr-2', isSyncing && 'animate-spin')} />
            {isSyncing ? 'Syncing...' : 'Sync from Stripe'}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="stripe">
          <TabsList className="mb-4">
            <TabsTrigger value="stripe" className="gap-1.5">
              Stripe Activity
              {stripeAlertCount > 0 && (
                <Badge variant="destructive" className="px-1.5 py-0 text-xs">{stripeAlertCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-1.5">
              Upcoming
              {upcoming.length > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-xs">{upcoming.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="failed" className="gap-1.5">
              Failed
              {failed.length > 0 && (
                <Badge variant="destructive" className="px-1.5 py-0 text-xs">{failed.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Stripe Activity (live feed) ── */}
          <TabsContent value="stripe">
            {stripeLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : stripeError ? (
              <div className="flex items-center gap-2 py-6 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Could not load Stripe data.{' '}
                  {stripeActivity?.message || 'Check that this client has a Stripe customer record.'}
                </span>
              </div>
            ) : !stripeActivity?.invoices?.length ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {stripeActivity?.message || 'No Stripe invoices found for this client.'}
                {stripeActivity?.customerCount === 0 && (
                  <p className="mt-1 text-xs">No Stripe customer linked. Invoices will appear here once a payment is processed.</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Invoice</th>
                      <th className="pb-2 pr-4 font-medium">Account</th>
                      <th className="pb-2 pr-4 font-medium">Amount</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">Date</th>
                      <th className="pb-2 pr-4 font-medium">Failure Reason</th>
                      <th className="pb-2 font-medium">Links</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stripeActivity.invoices.map(inv => (
                      <tr
                        key={inv.id}
                        className={cn('border-b last:border-0', {
                          'bg-red-500/5': inv.status === 'uncollectible',
                          'bg-yellow-500/5': inv.status === 'open' && inv.attemptCount > 0,
                        })}
                      >
                        <td className="py-3 pr-4">
                          <div className="font-mono text-xs text-muted-foreground">{inv.number || inv.id.slice(0, 14)}</div>
                          {inv.description && (
                            <div className="mt-0.5 max-w-[180px] truncate text-xs text-muted-foreground" title={inv.description}>
                              {inv.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className="text-xs capitalize">{inv.stripeAccount}</Badge>
                        </td>
                        <td className="py-3 pr-4 font-medium">
                          ${inv.amount.toFixed(2)}
                          {inv.status === 'paid' && inv.amountPaid !== inv.amount && (
                            <div className="text-xs text-muted-foreground">paid ${inv.amountPaid.toFixed(2)}</div>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <StripeStatusBadge status={inv.status} />
                          {inv.attemptCount > 1 && (
                            <div className="mt-0.5 text-xs text-muted-foreground">{inv.attemptCount} attempts</div>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-xs">
                          {inv.paidAt
                            ? <span className="text-green-700">{format(parseISO(inv.paidAt), 'MMM d, yyyy')}</span>
                            : inv.created
                            ? format(parseISO(inv.created), 'MMM d, yyyy')
                            : '—'}
                        </td>
                        <td className="py-3 pr-4 max-w-[160px]">
                          {inv.lastPaymentError ? (
                            <span className="block truncate text-xs text-red-600" title={inv.lastPaymentError}>
                              {inv.lastPaymentError}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3">
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

          {/* ── Subscriptions ── */}
          <TabsContent value="subscriptions">
            {subsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !subscriptions?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No subscriptions found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Plan</th>
                      <th className="pb-2 pr-4 font-medium">Amount</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">Billing Cycle</th>
                      <th className="pb-2 font-medium">Next Billing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map(sub => (
                      <tr key={sub.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium capitalize">{sub.billing_type.replace('_', ' ')}</td>
                        <td className="py-3 pr-4">${sub.amount.toFixed(2)}</td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={sub.status === 'active' ? 'default' : 'secondary'}
                            className={sub.status === 'active' ? 'bg-green-500/20 text-green-700 border-green-500/30' : ''}
                          >
                            {sub.status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 capitalize">{sub.recurrence_type || 'monthly'}</td>
                        <td className="py-3">
                          {sub.current_period_end ? format(parseISO(sub.current_period_end), 'MMM d, yyyy') : '—'}
                          {sub.stripe_subscription_id && (
                            <a
                              href={`https://dashboard.stripe.com/subscriptions/${sub.stripe_subscription_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-xs text-blue-500 hover:underline"
                            >↗</a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── Upcoming ── */}
          <TabsContent value="upcoming">
            {!upcoming.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No upcoming payments.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Type</th>
                      <th className="pb-2 pr-4 font-medium">Amount</th>
                      <th className="pb-2 pr-4 font-medium">Due Date</th>
                      <th className="pb-2 pr-4 font-medium">Days Until Due</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map(payment => (
                      <tr
                        key={payment.id}
                        className={cn('border-b last:border-0', {
                          'border-l-2 border-l-green-500 pl-2': payment.statusColor === 'green',
                          'border-l-2 border-l-yellow-500 pl-2': payment.statusColor === 'yellow',
                          'border-l-2 border-l-red-500 pl-2': payment.statusColor === 'red',
                        })}
                      >
                        <td className="py-3 pr-4 capitalize">{payment.billingType.replace('_', ' ')}</td>
                        <td className="py-3 pr-4">${payment.amount.toFixed(2)}</td>
                        <td className="py-3 pr-4">{payment.dueDate ? format(parseISO(payment.dueDate), 'MMM d, yyyy') : '—'}</td>
                        <td className="py-3 pr-4">{payment.daysUntilDue >= 0 ? `${payment.daysUntilDue}d` : 'Overdue'}</td>
                        <td className="py-3">
                          <Badge variant={payment.status === 'overdue' ? 'destructive' : 'secondary'}>{payment.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── History ── */}
          <TabsContent value="history">
            <div className="mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                <SelectTrigger className="h-8 w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ad_spend">Ad Spend</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                <SelectTrigger className="h-8 w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
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
              onEdit={handleOpenModal}
              filterType={filterType}
              filterStatus={filterStatus}
            />
          </TabsContent>

          {/* ── Failed ── */}
          <TabsContent value="failed">
            {!failed.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No failed payments in local records.{' '}
                <button onClick={() => {}} className="text-blue-500 hover:underline text-sm">
                  Check Stripe Activity tab for live data.
                </button>
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Type</th>
                      <th className="pb-2 pr-4 font-medium">Amount</th>
                      <th className="pb-2 pr-4 font-medium">Due Date</th>
                      <th className="pb-2 pr-4 font-medium">Attempts</th>
                      <th className="pb-2 pr-4 font-medium">Failure Reason</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failed.map(payment => (
                      <tr key={payment.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 capitalize">{payment.billingType.replace('_', ' ')}</td>
                        <td className="py-3 pr-4">${payment.amount.toFixed(2)}</td>
                        <td className="py-3 pr-4">{payment.dueDate ? format(parseISO(payment.dueDate), 'MMM d, yyyy') : '—'}</td>
                        <td className="py-3 pr-4">{payment.attempts}</td>
                        <td className="py-3 pr-4 max-w-[200px]">
                          <span title={payment.lastError || undefined} className="block truncate text-xs text-red-600">
                            {payment.lastError ? payment.lastError.slice(0, 80) + (payment.lastError.length > 80 ? '…' : '') : '—'}
                          </span>
                        </td>
                        <td className="py-3">
                          <Button size="sm" variant="outline" onClick={() => handleRetry(payment.id)}>Retry</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <BillingRecordModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        clientId={clientId}
        record={editingRecord}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </Card>
  );
}
