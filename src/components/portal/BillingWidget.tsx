import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBillingRecords, useCreateBillingRecord, useUpdateBillingRecord, BillingRecord, BillingStatus, CreateBillingRecordInput, UpdateBillingRecordInput } from '@/hooks/useBillingRecords';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BillingRecordsTable } from './BillingRecordsTable';
import { BillingRecordModal } from './BillingRecordModal';
import {
  Plus, Filter, Receipt, AlertCircle, Megaphone, CreditCard, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { isPast, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface BillingWidgetProps {
  clientId: string;
  isAdmin?: boolean;
}


export function BillingWidget({ clientId, isAdmin = true }: BillingWidgetProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BillingRecord | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'ad_spend' | 'management'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | BillingStatus>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const queryClient = useQueryClient();
  const { data: records, isLoading, refetch } = useBillingRecords(clientId, showArchived);
  const createMutation = useCreateBillingRecord();
  const updateMutation = useUpdateBillingRecord();

  // Summary stats
  const pendingRecords = records?.filter(r => r.status === 'pending' || r.status === 'overdue') || [];
  const adSpendPending = pendingRecords.filter(r => r.billing_type === 'ad_spend');
  const managementPending = pendingRecords.filter(r => r.billing_type === 'management');
  const totalAdSpend = adSpendPending.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalManagement = managementPending.reduce((sum, r) => sum + Number(r.amount), 0);
  const overdueRecords = pendingRecords.filter(
    r => r.status === 'overdue' || (r.due_date && isPast(parseISO(r.due_date)) && !isToday(parseISO(r.due_date)))
  );

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
        const msg = (error as any)?.message || (error as any)?.context?.message || JSON.stringify(error);
        console.error('Sync error:', error);
        toast.error(`Sync failed: ${msg}`);
      } else {
        const { created = 0, updated = 0, deposited = 0 } = data || {};
        const parts = [
          created > 0 && `${created} new record${created !== 1 ? 's' : ''} imported`,
          updated > 0 && `${updated} status${updated !== 1 ? 'es' : ''} updated`,
          deposited > 0 && `${deposited} wallet deposit${deposited !== 1 ? 's' : ''} added`,
        ].filter(Boolean);
        toast.success(parts.length ? parts.join(', ') : 'Already in sync', { description: 'Stripe sync complete' });
        refetch();
        queryClient.invalidateQueries({ queryKey: ['billing-dashboard-failed'] });
        queryClient.invalidateQueries({ queryKey: ['billing-dashboard-upcoming'] });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['client-wallet'] });
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

          {/* Filters + Records */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {!showArchived && (
              <>
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
              </>
            )}
            <Button
              size="sm"
              variant={showArchived ? 'secondary' : 'ghost'}
              onClick={() => setShowArchived(!showArchived)}
              className="h-8 text-xs gap-1.5 ml-auto"
            >
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </Button>
          </div>
          <BillingRecordsTable
            records={records || []}
            onEdit={isAdmin ? handleOpenModal : undefined}
            filterType={showArchived ? 'all' : filterType}
            filterStatus={showArchived ? 'all' : filterStatus}
            isArchiveView={showArchived}
          />
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
