import { useState } from 'react';
import { BillingRecord, BillingStatus, useUpdateBillingRecord, useDeleteBillingRecord, useArchiveBillingRecord, useRestoreBillingRecord } from '@/hooks/useBillingRecords';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BillingTypeBadge } from './BillingTypeBadge';
import { BillingStatusBadge } from './BillingStatusBadge';
import { BillingDetailPopup } from './BillingDetailPopup';
import { ExternalLink, Pencil, Trash2, MoreHorizontal, RefreshCw, Repeat, Eye, AlertTriangle, CheckCircle2, Archive, RotateCcw, SquareArrowOutUpRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface BillingRecordsTableProps {
  records: BillingRecord[];
  onEdit?: (record: BillingRecord) => void;
  filterType?: 'all' | 'ad_spend' | 'management';
  filterStatus?: 'all' | BillingStatus;
  isArchiveView?: boolean;
}

export function BillingRecordsTable({ records, onEdit, filterType = 'all', filterStatus = 'all', isArchiveView = false }: BillingRecordsTableProps) {
  const isAdmin = !!onEdit;
  const [deleteRecord, setDeleteRecord] = useState<BillingRecord | null>(null);
  const [archiveRecord, setArchiveRecord] = useState<BillingRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<BillingRecord | null>(null);
  const updateMutation = useUpdateBillingRecord();
  const deleteMutation = useDeleteBillingRecord();
  const archiveMutation = useArchiveBillingRecord();
  const restoreMutation = useRestoreBillingRecord();
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
      toast.success('Record permanently deleted');
      setDeleteRecord(null);
    } catch (error) {
      toast.error('Failed to delete record');
    }
  };

  const handleArchive = async (removeWalletDeposit: boolean) => {
    if (!archiveRecord) return;
    try {
      await archiveMutation.mutateAsync({
        id: archiveRecord.id,
        clientId: archiveRecord.client_id,
        removeWalletDeposit,
      });
      toast.success('Record archived');
      setArchiveRecord(null);
    } catch (error) {
      toast.error('Failed to archive record');
    }
  };

  const handleRestore = async (record: BillingRecord) => {
    try {
      await restoreMutation.mutateAsync({ id: record.id, clientId: record.client_id });
      toast.success('Record restored');
    } catch (error) {
      toast.error('Failed to restore record');
    }
  };

  const getStripeUrl = (record: BillingRecord): string | null => {
    if (record.stripe_invoice_id) return `https://dashboard.stripe.com/invoices/${record.stripe_invoice_id}`;
    if (record.stripe_payment_intent_id) return `https://dashboard.stripe.com/payments/${record.stripe_payment_intent_id}`;
    return null;
  };

  const getStripeRefLabel = (record: BillingRecord): string | null => {
    if (record.stripe_invoice_id) return record.stripe_invoice_id.slice(0, 14) + '…';
    if (record.stripe_payment_intent_id) return record.stripe_payment_intent_id.slice(0, 14) + '…';
    return null;
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
          <div key={record.id} className={`rounded-lg border bg-card p-4 space-y-3 ${record.is_duplicate ? 'border-amber-500/50 bg-amber-500/5' : 'border-border'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <BillingTypeBadge type={record.billing_type} />
                {record.source === 'admin_credit' ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-emerald-500/40 text-emerald-400">Credit</Badge>
                ) : record.stripe_invoice_id || record.stripe_payment_intent_id ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-blue-500/40 text-blue-400">Stripe</Badge>
                ) : record.notes?.includes('Auto-recharge') || record.notes?.includes('auto-recharge') ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-violet-500/40 text-violet-400">Auto</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground">Manual</Badge>
                )}
                {record.recurrence_type !== 'one_time' && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                    {record.recurrence_type === 'bi_weekly' ? (
                      <><RefreshCw className="w-2.5 h-2.5" /> 2wk</>
                    ) : (
                      <><Repeat className="w-2.5 h-2.5" /> Mo</>
                    )}
                  </Badge>
                )}
                {record.is_duplicate && (
                  <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                    <AlertTriangle className="w-3 h-3" /> Duplicate?
                  </span>
                )}
                {record.source === 'v1_manual' && (
                  <Badge className="text-[10px] px-1.5 py-0 h-5 bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/20">
                    Legacy
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
                    {!isArchiveView && (
                      <DropdownMenuItem onClick={() => onEdit?.(record)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {isArchiveView ? (
                      <>
                        <DropdownMenuItem onClick={() => handleRestore(record)}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Restore
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteRecord(record)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Permanently
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => setArchiveRecord(record)}
                        className="text-amber-500 focus:text-amber-500"
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    )}
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
                {Number(record.credit_amount_used) > 0 && (
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
              {record.paid_at && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Paid:</span>
                  <span className="ml-1 text-emerald-400">{formatDate(record.paid_at)}</span>
                </div>
              )}
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
              <TableHead>Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Period / Invoice Date</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead>Ref ID</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow
                key={record.id}
                className={record.is_duplicate ? 'bg-amber-500/5 border-l-2 border-l-amber-500/50' : ''}
              >
                {/* Date + duplicate flag */}
                <TableCell className="text-sm whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {formatDate(record.created_at)}
                    {record.is_duplicate && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Possible duplicate — same amount, type, and period as another record</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>

                {/* Source: Stripe, Auto, Manual, or Legacy (v1_manual) */}
                <TableCell>
                  <div className="flex items-center gap-1">
                    {record.source === 'admin_credit' ? (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-emerald-500/40 text-emerald-400">
                        Credit
                      </Badge>
                    ) : record.source === 'v1_manual' ? (
                      <Badge className="text-[10px] px-1.5 py-0 h-5 bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/20">
                        Legacy
                      </Badge>
                    ) : record.stripe_invoice_id || record.stripe_payment_intent_id ? (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-blue-500/40 text-blue-400">
                        Stripe
                      </Badge>
                    ) : record.notes?.includes('Auto-recharge') || record.notes?.includes('auto-recharge') ? (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-violet-500/40 text-violet-400">
                        Auto
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground">
                        Manual
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Type + recurrence */}
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

                {/* Amount */}
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{formatCurrency(Number(record.amount))}</span>
                    {Number(record.credit_amount_used) > 0 && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                        -{formatCurrency(Number(record.credit_amount_used))} credit
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Period: full range for subscriptions, single date for one-time */}
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {record.recurrence_type !== 'one_time'
                    ? (record.billing_period_start && record.billing_period_end
                        ? `${formatDate(record.billing_period_start)} – ${formatDate(record.billing_period_end)}`
                        : record.billing_period_start ? formatDate(record.billing_period_start) : '—')
                    : (record.billing_period_start ? formatDate(record.billing_period_start) : '—')}
                </TableCell>

                {/* Due date */}
                <TableCell className="text-sm whitespace-nowrap">
                  {formatDate(record.due_date)}
                </TableCell>

                {/* Paid date */}
                <TableCell className="text-sm whitespace-nowrap">
                  {record.paid_at ? (
                    <span className="text-emerald-400">{formatDate(record.paid_at)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Status */}
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

                {/* Wallet deposit status */}
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {record.billing_type === 'ad_spend' && record.status === 'paid' ? (
                      record.has_wallet_deposit ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5" /> In Wallet
                              </span>
                            </TooltipTrigger>
                            <TooltipContent><p>Deposit recorded in wallet</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-amber-400 text-xs">Not in wallet</span>
                      )
                    ) : (
                      <span className="text-muted-foreground text-xs">{'\u2014'}</span>
                    )}
                    {record.source === 'v1_manual' && (
                      <Badge className="text-[10px] px-1.5 py-0 h-5 bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/20">
                        Legacy
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Ref ID */}
                <TableCell className="text-sm">
                  {(() => {
                    const stripeUrl = getStripeUrl(record);
                    const refLabel = getStripeRefLabel(record);
                    const fullId = record.stripe_invoice_id || record.stripe_payment_intent_id;
                    if (stripeUrl && refLabel) {
                      return (
                        <a
                          href={stripeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={fullId || undefined}
                          className="inline-flex items-center gap-1 font-mono text-xs bg-muted px-1.5 py-0.5 rounded hover:bg-muted/70 hover:text-blue-400 transition-colors"
                        >
                          {refLabel}
                          <SquareArrowOutUpRight className="w-2.5 h-2.5 flex-shrink-0" />
                        </a>
                      );
                    }
                    if (record.payment_reference) {
                      return (
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {record.payment_reference.length > 12
                            ? `${record.payment_reference.slice(0, 12)}...`
                            : record.payment_reference}
                        </span>
                      );
                    }
                    return <span className="text-muted-foreground">—</span>;
                  })()}
                </TableCell>

                {/* Actions dropdown */}
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
                        {!isArchiveView && record.payment_link && record.status !== 'paid' && (
                          <DropdownMenuItem asChild>
                            <a href={record.payment_link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Pay Now
                            </a>
                          </DropdownMenuItem>
                        )}
                        {!isArchiveView && (
                          <DropdownMenuItem onClick={() => onEdit?.(record)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {isArchiveView ? (
                          <>
                            <DropdownMenuItem onClick={() => handleRestore(record)}>
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Restore
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteRecord(record)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Permanently
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => setArchiveRecord(record)}
                            className="text-amber-500 focus:text-amber-500"
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
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

      {/* Archive dialog — with optional wallet removal for paid ad_spend */}
      <AlertDialog open={!!archiveRecord} onOpenChange={() => setArchiveRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Billing Record</AlertDialogTitle>
            <AlertDialogDescription>
              This record will be hidden from the main view. You can restore it any time from "Show Archived".
            </AlertDialogDescription>
          </AlertDialogHeader>
          {archiveRecord?.billing_type === 'ad_spend' && archiveRecord.status === 'paid' && archiveRecord.has_wallet_deposit && (
            <div className="px-1 py-2 text-sm text-amber-400 bg-amber-500/10 rounded-lg border border-amber-500/20 mx-1">
              This is a paid ad spend record with a wallet deposit. Do you also want to remove the ${Number(archiveRecord.amount).toLocaleString()} deposit from the wallet?
            </div>
          )}
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {archiveRecord?.billing_type === 'ad_spend' && archiveRecord.status === 'paid' && archiveRecord.has_wallet_deposit ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleArchive(false)}
                  className="sm:ml-auto"
                >
                  Archive, Keep Wallet
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleArchive(true)}
                >
                  Archive &amp; Remove from Wallet
                </Button>
              </>
            ) : (
              <AlertDialogAction onClick={() => handleArchive(false)} className="bg-amber-600 hover:bg-amber-700 text-white">
                Archive
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent delete dialog (only shown from archive view) */}
      <AlertDialog open={!!deleteRecord} onOpenChange={() => setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The record will be removed forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Forever
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
