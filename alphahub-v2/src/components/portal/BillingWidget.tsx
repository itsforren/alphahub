import { useState } from 'react';
import { useBillingRecords, useCreateBillingRecord, useUpdateBillingRecord, BillingRecord, BillingStatus, CreateBillingRecordInput, UpdateBillingRecordInput } from '@/hooks/useBillingRecords';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BillingRecordsTable } from './BillingRecordsTable';
import { BillingRecordModal } from './BillingRecordModal';
import { Plus, Filter, Receipt, AlertCircle, Megaphone, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface BillingWidgetProps {
  clientId: string;
  isAdmin?: boolean;
}

export function BillingWidget({ clientId, isAdmin = true }: BillingWidgetProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BillingRecord | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'ad_spend' | 'management'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | BillingStatus>('all');
  const [isExpanded, setIsExpanded] = useState(true);

  const { data: records, isLoading } = useBillingRecords(clientId);
  const createMutation = useCreateBillingRecord();
  const updateMutation = useUpdateBillingRecord();

  // Calculate summary stats
  const pendingRecords = records?.filter(r => r.status === 'pending' || r.status === 'overdue') || [];
  const adSpendPending = pendingRecords.filter(r => r.billing_type === 'ad_spend');
  const managementPending = pendingRecords.filter(r => r.billing_type === 'management');
  const totalAdSpend = adSpendPending.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalManagement = managementPending.reduce((sum, r) => sum + Number(r.amount), 0);
  const overdueRecords = pendingRecords.filter(r => r.status === 'overdue' || (r.due_date && isPast(parseISO(r.due_date)) && !isToday(parseISO(r.due_date))));

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
    } catch (error) {
      toast.error('Failed to save record');
      throw error;
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
        {/* Header with gradient */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Billing & Invoices</h3>
                <p className="text-xs text-muted-foreground">
                  {pendingRecords.length} pending • {records?.length || 0} total records
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => handleOpenModal()} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4" />
                Add Record
              </Button>
            )}
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
                <p className="text-xs text-muted-foreground">
                  Action required to avoid service disruption
                </p>
              </div>
            </div>
          )}

          {/* Expandable Records Table */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-10 px-3 bg-muted/50 hover:bg-muted">
                <span className="text-sm font-medium">View All Records</span>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              {/* Filters */}
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

              {/* Records Table */}
              <BillingRecordsTable
                records={records || []}
                onEdit={isAdmin ? handleOpenModal : undefined}
                filterType={filterType}
                filterStatus={filterStatus}
              />
            </CollapsibleContent>
          </Collapsible>
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
