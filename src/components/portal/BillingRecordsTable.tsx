import { useState } from 'react';
import { BillingRecord, BillingStatus, useUpdateBillingRecord, useDeleteBillingRecord } from '@/hooks/useBillingRecords';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BillingTypeBadge } from './BillingTypeBadge';
import { BillingStatusBadge } from './BillingStatusBadge';
import { BillingDetailPopup } from './BillingDetailPopup';
import { ExternalLink, Pencil, Trash2, MoreHorizontal, RefreshCw, Repeat, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface BillingRecordsTableProps {
  records: BillingRecord[];
  onEdit?: (record: BillingRecord) => void;
  filterType?: 'all' | 'ad_spend' | 'management';
  filterStatus?: 'all' | BillingStatus;
}

export function BillingRecordsTable({ records, onEdit, filterType = 'all', filterStatus = 'all' }: BillingRecordsTableProps) {
  const isAdmin = !!onEdit;
  const [deleteRecord, setDeleteRecord] = useState<BillingRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<BillingRecord | null>(null);
  const updateMutation = useUpdateBillingRecord();
  const deleteMutation = useDeleteBillingRecord();

  const filteredRecords = records.filter(record => {
    if (filterType !== 'all' && record.billing_type !== filterType) return false;
    if (filterStatus !== 'all' && record.status !== filterStatus) return false;
    return true;
  });

  const handleStatusChange = async (record: BillingRecord, newStatus: BillingStatus) => {
    try {
      await updateMutation.mutateAsync({ id: record.id, status: newStatus });
      
      if (newStatus === 'paid' && record.billing_type === 'ad_spend') {
        toast.success('Payment recorded & added to wallet');
      } else {
        toast.success('Status updated');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteRecord) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteRecord.id, clientId: deleteRecord.client_id });
      toast.success('Record deleted');
      setDeleteRecord(null);
    } catch (error) {
      toast.error('Failed to delete record');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    // For date-only strings (YYYY-MM-DD), parse as local date to avoid timezone shift
    // parseISO treats date-only strings as UTC midnight, which causes off-by-one errors
    if (dateStr.length === 10 && dateStr.includes('-') && !dateStr.includes('T')) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return format(new Date(year, month - 1, day), 'MMM d, yyyy');
    }
    // For full timestamps (with time), use parseISO as normal
    return format(parseISO(dateStr), 'MMM d, yyyy');
  };

  if (filteredRecords.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No billing records found
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="block sm:hidden space-y-3">
        {filteredRecords.map((record) => (
          <div key={record.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BillingTypeBadge type={record.billing_type} />
                {record.recurrence_type !== 'one_time' && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                    {record.recurrence_type === 'bi_weekly' ? (
                      <><RefreshCw className="w-2.5 h-2.5" /> 2wk</>
                    ) : (
                      <><Repeat className="w-2.5 h-2.5" /> Mo</>
                    )}
                  </Badge>
                )}
              </div>
              {isAdmin ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setViewRecord(record)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit?.(record)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setDeleteRecord(record)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setViewRecord(record)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{formatCurrency(Number(record.amount))}</div>
                {(record.credit_amount_used && Number(record.credit_amount_used) > 0) && (
                  <span className="text-xs text-amber-400">
                    -{formatCurrency(Number(record.credit_amount_used))} credit
                  </span>
                )}
              </div>
              {isAdmin ? (
                <Select
                  value={record.status}
                  onValueChange={(value) => handleStatusChange(record, value as BillingStatus)}
                >
                  <SelectTrigger className="w-auto h-8 border-0 bg-transparent p-0">
                    <BillingStatusBadge status={record.status} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <BillingStatusBadge status={record.status} />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Created:</span>
                <span className="ml-1">{formatDate(record.created_at)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Due:</span>
                <span className="ml-1">{formatDate(record.due_date)}</span>
              </div>
            </div>

            {record.payment_link && record.status !== 'paid' && (
              <a
                href={record.payment_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
              >
                Pay Now <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ref ID</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="text-sm whitespace-nowrap">
                  {formatDate(record.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <BillingTypeBadge type={record.billing_type} />
                    {record.recurrence_type !== 'one_time' && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                        {record.recurrence_type === 'bi_weekly' ? (
                          <><RefreshCw className="w-2.5 h-2.5" /> 2wk</>
                        ) : (
                          <><Repeat className="w-2.5 h-2.5" /> Mo</>
                        )}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{formatCurrency(Number(record.amount))}</span>
                    {(record.credit_amount_used && Number(record.credit_amount_used) > 0) && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                        -{formatCurrency(Number(record.credit_amount_used))} credit
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {record.billing_period_start && record.billing_period_end
                    ? `${formatDate(record.billing_period_start)} - ${formatDate(record.billing_period_end)}`
                    : '-'}
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {formatDate(record.due_date)}
                </TableCell>
                <TableCell>
                  {isAdmin ? (
                    <Select
                      value={record.status}
                      onValueChange={(value) => handleStatusChange(record, value as BillingStatus)}
                    >
                      <SelectTrigger className="w-[130px] h-8 border-0 bg-transparent p-0">
                        <BillingStatusBadge status={record.status} />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <BillingStatusBadge status={record.status} />
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {record.payment_reference ? (
                    <span className="text-foreground font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {record.payment_reference.length > 12 
                        ? `${record.payment_reference.slice(0, 12)}...` 
                        : record.payment_reference}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {record.payment_link ? (
                    <a
                      href={record.payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                    >
                      Pay <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {isAdmin ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewRecord(record)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(record)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteRecord(record)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setViewRecord(record)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteRecord} onOpenChange={() => setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Billing Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this billing record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BillingDetailPopup 
        record={viewRecord} 
        open={!!viewRecord} 
        onOpenChange={(open) => !open && setViewRecord(null)} 
      />
    </>
  );
}
