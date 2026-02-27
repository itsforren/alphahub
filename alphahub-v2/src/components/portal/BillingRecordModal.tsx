import { useState, useEffect } from 'react';
import { format, addDays, addMonths } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BillingRecord, BillingType, BillingStatus, RecurrenceType, CreateBillingRecordInput, UpdateBillingRecordInput } from '@/hooks/useBillingRecords';
import { useAvailableCredits, useApplyCreditToBilling } from '@/hooks/useClientCredits';
import { Megaphone, CreditCard, Loader2, CalendarIcon, RefreshCw, Repeat, Gift, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper function to calculate period end based on recurrence type
function calculatePeriodEnd(startDate: Date, recurrenceType: RecurrenceType): Date {
  switch (recurrenceType) {
    case 'bi_weekly':
      return addDays(startDate, 14);
    case 'monthly':
      return addMonths(startDate, 1);
    default:
      return addDays(startDate, 30); // Default for one-time
  }
}

interface BillingRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  record?: BillingRecord | null;
  onSave: (data: CreateBillingRecordInput | UpdateBillingRecordInput) => Promise<void>;
  isLoading?: boolean;
}

export function BillingRecordModal({
  open,
  onOpenChange,
  clientId,
  record,
  onSave,
  isLoading,
}: BillingRecordModalProps) {
  const [billingType, setBillingType] = useState<BillingType>(record?.billing_type || 'ad_spend');
  const [amount, setAmount] = useState(record?.amount?.toString() || '');
  const [periodStart, setPeriodStart] = useState<Date | undefined>(
    record?.billing_period_start ? new Date(record.billing_period_start) : new Date()
  );
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>(
    record?.billing_period_end ? new Date(record.billing_period_end) : addDays(new Date(), 14)
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    record?.due_date ? new Date(record.due_date) : new Date()
  );
  const [status, setStatus] = useState<BillingStatus>(record?.status || 'pending');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(record?.recurrence_type || 'one_time');
  const [paymentLink, setPaymentLink] = useState(record?.payment_link || '');
  const [paymentReference, setPaymentReference] = useState(record?.payment_reference || '');
  const [selectedCreditIds, setSelectedCreditIds] = useState<string[]>(
    record?.credit_applied_id ? [record.credit_applied_id] : []
  );
  const [notes, setNotes] = useState(record?.notes || '');

  const { data: availableCredits = [] } = useAvailableCredits(clientId);
  const applyCredit = useApplyCreditToBilling();

  const isEditing = !!record;
  
  // Calculate how much of each credit will actually be applied (up to invoice amount)
  const invoiceAmount = parseFloat(amount) || 0;
  
  const creditsToApply = selectedCreditIds.map(id => {
    const credit = availableCredits.find(c => c.id === id);
    return credit ? { id, available: credit.remaining_balance, reason: credit.reason, type: credit.credit_type } : null;
  }).filter(Boolean) as Array<{ id: string; available: number; reason: string; type: string }>;
  
  let remainingInvoice = invoiceAmount;
  const appliedCreditsBreakdown = creditsToApply.map(credit => {
    const amountToApply = Math.min(credit.available, remainingInvoice);
    remainingInvoice -= amountToApply;
    return { ...credit, amountToApply };
  });
  
  const totalCreditsApplied = appliedCreditsBreakdown.reduce((sum, c) => sum + c.amountToApply, 0);
  const remainingAfterCredits = Math.max(0, invoiceAmount - totalCreditsApplied);
  const hasMoreCreditsAvailable = availableCredits.some(c => !selectedCreditIds.includes(c.id));

  // Auto-update period end and due date when period start or recurrence type changes
  useEffect(() => {
    if (periodStart && !isEditing) {
      // Set period end based on recurrence type
      setPeriodEnd(calculatePeriodEnd(periodStart, recurrenceType));
      // Due date should always be the period start date
      setDueDate(periodStart);
    }
  }, [periodStart, recurrenceType, isEditing]);

  // Sync form state whenever record changes (fixes edit button showing wrong data)
  useEffect(() => {
    if (record) {
      setBillingType(record.billing_type);
      setAmount(record.amount?.toString() || '');
      setPeriodStart(record.billing_period_start ? new Date(record.billing_period_start) : undefined);
      setPeriodEnd(record.billing_period_end ? new Date(record.billing_period_end) : undefined);
      setDueDate(record.due_date ? new Date(record.due_date) : undefined);
      setStatus(record.status);
      setRecurrenceType(record.recurrence_type || 'one_time');
      setPaymentLink(record.payment_link || '');
      setPaymentReference(record.payment_reference || '');
      setSelectedCreditIds(record.credit_applied_id ? [record.credit_applied_id] : []);
      setNotes(record.notes || '');
    } else {
      // Reset to defaults for new record
      const today = new Date();
      setBillingType('ad_spend');
      setAmount('');
      setPeriodStart(today);
      setPeriodEnd(addDays(today, 14)); // Default to bi-weekly
      setDueDate(today); // Due date = period start
      setStatus('pending');
      setRecurrenceType('one_time');
      setPaymentLink('');
      setPaymentReference('');
      setSelectedCreditIds([]);
      setNotes('');
    }
  }, [record?.id, open]); // Re-sync when record ID changes or modal opens

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      ...(isEditing ? { id: record.id } : { client_id: clientId }),
      billing_type: billingType,
      amount: parseFloat(amount) || 0,
      billing_period_start: periodStart?.toISOString().split('T')[0],
      billing_period_end: periodEnd?.toISOString().split('T')[0],
      due_date: dueDate?.toISOString().split('T')[0],
      status,
      recurrence_type: recurrenceType,
      payment_link: paymentLink || undefined,
      payment_reference: paymentReference || undefined,
      credit_applied_ids: selectedCreditIds.length > 0 ? selectedCreditIds : undefined,
      // Explicitly clear credit if editing and no credits selected
      credit_applied_id: isEditing && selectedCreditIds.length === 0 ? null : undefined,
      notes: notes || undefined,
    };

    await onSave(data as CreateBillingRecordInput | UpdateBillingRecordInput);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? 'Edit Billing Record' : 'Add Billing Record'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Billing Type Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Billing Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBillingType('ad_spend')}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                  billingType === 'ad_spend'
                    ? 'border-blue-500 bg-gradient-to-br from-blue-500/20 to-blue-600/10 shadow-lg shadow-blue-500/10'
                    : 'border-border hover:border-blue-500/50 bg-background/50'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  billingType === 'ad_spend' ? 'bg-blue-500/20' : 'bg-muted'
                )}>
                  <Megaphone className={cn('w-5 h-5', billingType === 'ad_spend' ? 'text-blue-400' : 'text-muted-foreground')} />
                </div>
                <div className="text-left">
                  <span className={cn('font-semibold block', billingType === 'ad_spend' ? 'text-blue-400' : 'text-muted-foreground')}>
                    Ad Spend
                  </span>
                  <span className="text-xs text-muted-foreground">Advertising budget</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setBillingType('management')}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                  billingType === 'management'
                    ? 'border-purple-500 bg-gradient-to-br from-purple-500/20 to-purple-600/10 shadow-lg shadow-purple-500/10'
                    : 'border-border hover:border-purple-500/50 bg-background/50'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  billingType === 'management' ? 'bg-purple-500/20' : 'bg-muted'
                )}>
                  <CreditCard className={cn('w-5 h-5', billingType === 'management' ? 'text-purple-400' : 'text-muted-foreground')} />
                </div>
                <div className="text-left">
                  <span className={cn('font-semibold block', billingType === 'management' ? 'text-purple-400' : 'text-muted-foreground')}>
                    Management
                  </span>
                  <span className="text-xs text-muted-foreground">Service fee</span>
                </div>
              </button>
            </div>
          </div>

          {/* Recurrence Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Billing Frequency</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'one_time', label: 'One-Time', icon: CreditCard },
                { value: 'bi_weekly', label: 'Bi-Weekly', icon: RefreshCw },
                { value: 'monthly', label: 'Monthly', icon: Repeat },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRecurrenceType(value as RecurrenceType)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                    recurrenceType === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-lg h-12"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Date Pickers Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Period Start */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Period Start</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-11',
                      !periodStart && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodStart ? format(periodStart, 'MMM d, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={periodStart}
                    onSelect={setPeriodStart}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Period End */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Period End</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-11',
                      !periodEnd && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodEnd ? format(periodEnd, 'MMM d, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={periodEnd}
                    onSelect={setPeriodEnd}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Due Date and Status Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-11',
                      !dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as BillingStatus)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      Pending
                    </div>
                  </SelectItem>
                  <SelectItem value="paid">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      Paid
                    </div>
                  </SelectItem>
                  <SelectItem value="overdue">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      Overdue
                    </div>
                  </SelectItem>
                  <SelectItem value="cancelled">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-500" />
                      Cancelled
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Link */}
          <div className="space-y-2">
            <Label htmlFor="paymentLink" className="text-sm font-medium">Payment Link</Label>
            <Input
              id="paymentLink"
              type="url"
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
              placeholder="https://pay.stripe.com/..."
              className="h-11"
            />
          </div>

          {/* Payment Reference - prominent when paid */}
          <div className={cn(
            "space-y-2 p-3 rounded-lg transition-colors",
            status === 'paid' ? "bg-green-500/10 border border-green-500/20" : ""
          )}>
            <Label htmlFor="paymentReference" className="text-sm font-medium flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Payment Reference / ID
              {status === 'paid' && <span className="text-xs text-green-400">(Recommended)</span>}
            </Label>
            <Input
              id="paymentReference"
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g., Stripe ID, Check #, Transaction ID..."
              className="h-11"
            />
          </div>

          {/* Apply Credit Dropdown - show for new records or unpaid existing records */}
          {((!isEditing || (isEditing && (status === 'pending' || status === 'overdue'))) && availableCredits.length > 0) && (
            <div className="space-y-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-400" />
                Apply Credits
                {isEditing && !record?.credit_applied_id && (
                  <span className="text-xs text-amber-400/70">(optional)</span>
                )}
              </Label>
              
              {/* Selected credits display */}
              {selectedCreditIds.length > 0 && (
                <div className="space-y-2">
                  {appliedCreditsBreakdown.map((creditBreakdown) => {
                    const credit = availableCredits.find(c => c.id === creditBreakdown.id);
                    if (!credit) return null;
                    
                    const isPartiallyApplied = creditBreakdown.amountToApply < credit.remaining_balance;
                    
                    return (
                      <div key={creditBreakdown.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded",
                            credit.credit_type === 'referral' 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-purple-500/20 text-purple-400'
                          )}>
                            {credit.credit_type === 'referral' ? 'REF' : 'GEN'}
                          </span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-amber-400">
                              ${creditBreakdown.amountToApply.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              {isPartiallyApplied && (
                                <span className="text-muted-foreground text-[10px] ml-1">
                                  (of ${credit.remaining_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">{credit.reason}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => setSelectedCreditIds(ids => ids.filter(id => id !== creditBreakdown.id))}
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Add credit dropdown */}
              {availableCredits.filter(c => !selectedCreditIds.includes(c.id)).length > 0 && (
                <Select 
                  value="" 
                  onValueChange={(v) => {
                    if (v) setSelectedCreditIds(ids => [...ids, v]);
                  }}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={selectedCreditIds.length > 0 ? "Add another credit..." : "Select a credit to apply..."} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {availableCredits.filter(c => !selectedCreditIds.includes(c.id)).map((credit) => {
                      const displayAmount = credit.remaining_balance || credit.amount;
                      const isPartial = credit.remaining_balance < credit.original_amount;
                      return (
                        <SelectItem key={credit.id} value={credit.id}>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded",
                              credit.credit_type === 'referral' 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'bg-purple-500/20 text-purple-400'
                            )}>
                              {credit.credit_type === 'referral' ? 'REF' : 'GEN'}
                            </span>
                            <span className="font-semibold text-amber-400">
                              ${displayAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              {isPartial && (
                                <span className="text-muted-foreground text-xs ml-1">
                                  (of ${credit.original_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                                </span>
                              )}
                            </span>
                            <span className="text-muted-foreground">-</span>
                            <span className="truncate max-w-[140px]">{credit.reason}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              
              {/* Summary */}
              {selectedCreditIds.length > 0 && (
                <div className="text-xs space-y-1 pt-1 border-t border-amber-500/10">
                  <div className="flex justify-between text-amber-400">
                    <span>Total credits applied:</span>
                    <span className="font-semibold">${totalCreditsApplied.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {remainingAfterCredits > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Remaining to pay:</span>
                      <span>${remainingAfterCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {remainingAfterCredits === 0 && totalCreditsApplied > 0 && (
                    <p className="text-green-400 mt-1">
                      ✓ Invoice fully covered by credits
                    </p>
                  )}
                  {remainingAfterCredits > 0 && hasMoreCreditsAvailable && (
                    <p className="text-amber-400/70 mt-1">
                      More credits available - add another to cover remaining amount
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this billing record..."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="min-w-[100px]">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Add Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
