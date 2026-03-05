import { useState } from 'react';
import { useBillingRecords, useCreateBillingRecord, useUpdateBillingRecord, BillingRecord, BillingStatus, CreateBillingRecordInput, UpdateBillingRecordInput } from '@/hooks/useBillingRecords';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BillingRecordsTable } from './BillingRecordsTable';
import { BillingRecordModal } from './BillingRecordModal';
import { Plus, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface BillingSectionProps {
  clientId: string;
}

export function BillingSection({ clientId }: BillingSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BillingRecord | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'ad_spend' | 'management'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | BillingStatus>('all');

  const { data: records, isLoading } = useBillingRecords(clientId);
  const createMutation = useCreateBillingRecord();
  const updateMutation = useUpdateBillingRecord();

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
      <Card className="frosted-card">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="frosted-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Billing Records</CardTitle>
        <div className="flex items-center gap-3">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="ad_spend">Ad Spend</SelectItem>
                <SelectItem value="management">Management</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
              <SelectTrigger className="w-[130px] h-8">
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

          <Button size="sm" onClick={() => handleOpenModal()} className="gap-1">
            <Plus className="w-4 h-4" />
            Add Record
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <BillingRecordsTable
          records={records || []}
          onEdit={handleOpenModal}
          filterType={filterType}
          filterStatus={filterStatus}
        />
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
