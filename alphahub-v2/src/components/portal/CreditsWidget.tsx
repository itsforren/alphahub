import { useState } from 'react';
import { format } from 'date-fns';
import { Gift, Plus, Trash2, Check, Calendar, Loader2, ChevronDown, ChevronUp, Users, CreditCard, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useClientCredits, useAvailableCredits, useCreateCredit, useDeleteCredit, ClientCredit, CreditType } from '@/hooks/useClientCredits';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CreditsWidgetProps {
  clientId: string;
  isAdmin?: boolean;
}

export function CreditsWidget({ clientId, isAdmin = true }: CreditsWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showUsedCredits, setShowUsedCredits] = useState(false);
  const [creditToDelete, setCreditToDelete] = useState<ClientCredit | null>(null);
  const [newAmount, setNewAmount] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newCreditType, setNewCreditType] = useState<CreditType>('referral');
  const [newExpiresAt, setNewExpiresAt] = useState<Date | undefined>();

  const { data: allCredits = [], isLoading } = useClientCredits(clientId);
  const { data: availableCredits = [] } = useAvailableCredits(clientId);
  const createCredit = useCreateCredit();
  const deleteCredit = useDeleteCredit();

  const totalAvailable = availableCredits.reduce((sum, c) => sum + (c.remaining_balance || c.amount), 0);

  // Separate credits into active and used
  const activeCredits = allCredits.filter(c => c.remaining_balance > 0);
  const usedCredits = allCredits.filter(c => c.remaining_balance === 0);

  const handleAddCredit = async () => {
    if (!newAmount || !newReason) {
      toast.error('Please enter amount and reason');
      return;
    }

    try {
      await createCredit.mutateAsync({
        client_id: clientId,
        amount: parseFloat(newAmount),
        reason: newReason,
        credit_type: newCreditType,
        expires_at: newExpiresAt?.toISOString().split('T')[0],
      });
      toast.success('Credit added successfully');
      setIsAddModalOpen(false);
      setNewAmount('');
      setNewReason('');
      setNewCreditType('referral');
      setNewExpiresAt(undefined);
    } catch (error) {
      toast.error('Failed to add credit');
    }
  };

  const handleDeleteCredit = async () => {
    if (!creditToDelete) return;

    try {
      await deleteCredit.mutateAsync({ id: creditToDelete.id, clientId });
      toast.success('Credit deleted');
      setCreditToDelete(null);
    } catch (error) {
      toast.error('Failed to delete credit');
    }
  };

  const getCreditStatus = (credit: ClientCredit): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    if (credit.remaining_balance === 0) {
      return { label: 'Fully Used', variant: 'secondary' };
    }
    if (credit.remaining_balance < credit.original_amount) {
      return { label: 'Partial', variant: 'outline' };
    }
    if (credit.expires_at && new Date(credit.expires_at) < new Date()) {
      return { label: 'Expired', variant: 'destructive' };
    }
    return { label: 'Available', variant: 'default' };
  };

  const renderCreditItem = (credit: ClientCredit) => {
    const status = getCreditStatus(credit);
    const isPartiallyUsed = credit.remaining_balance > 0 && credit.remaining_balance < credit.original_amount;
    const isUsed = credit.remaining_balance === 0;
    const usedAmount = credit.original_amount - credit.remaining_balance;
    
    return (
      <div
        key={credit.id}
        className={cn(
          'flex items-center justify-between p-3 rounded-lg border transition-colors',
          status.label === 'Available'
            ? 'bg-amber-500/5 border-amber-500/20'
            : status.label === 'Partial'
            ? 'bg-amber-500/5 border-amber-500/30'
            : 'bg-muted/30 border-border/50'
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Credit Type Badge */}
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] px-1.5 py-0 h-5",
                credit.credit_type === 'referral' 
                  ? 'border-blue-500/30 text-blue-400' 
                  : 'border-purple-500/30 text-purple-400'
              )}
            >
              {credit.credit_type === 'referral' ? (
                <><Users className="w-2.5 h-2.5 mr-1" /> Referral</>
              ) : (
                <><CreditCard className="w-2.5 h-2.5 mr-1" /> General</>
              )}
            </Badge>
            
            {/* Amount Display */}
            {isPartiallyUsed ? (
              <div className="flex items-center gap-1">
                <span className="text-amber-400 font-semibold">
                  ${credit.remaining_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-muted-foreground text-xs">
                  / ${credit.original_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ) : (
              <span className={cn(
                'font-semibold',
                status.label === 'Available' || status.label === 'Partial' 
                  ? 'text-amber-400' 
                  : 'text-muted-foreground'
              )}>
                ${credit.original_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            )}
            
            {/* Status Badge */}
            <Badge variant={status.variant} className="text-xs">
              {status.label === 'Fully Used' && <Check className="w-3 h-3 mr-1" />}
              {status.label}
            </Badge>
          </div>
          
          {/* Reason / Statement */}
          <p className="text-sm text-muted-foreground mt-1">
            {credit.reason}
          </p>
          
          {/* Meta Info */}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span>Added {format(new Date(credit.created_at), 'MMM d, yyyy')}</span>
            {credit.expires_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Expires {format(new Date(credit.expires_at), 'MMM d, yyyy')}
              </span>
            )}
            {isPartiallyUsed && (
              <span className="text-amber-400">
                Used: ${usedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            )}
            {isUsed && credit.applied_at && (
              <span className="text-green-400">
                Applied {format(new Date(credit.applied_at), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>
        
        {/* Delete Button - Only visible for admin */}
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCreditToDelete(credit)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="frosted-card p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="frosted-card overflow-hidden">
          {/* Header */}
          <CollapsibleTrigger asChild>
            <div className="p-4 bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-transparent cursor-pointer hover:from-amber-500/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Credits</h3>
                    <p className="text-xs text-muted-foreground">
                      {activeCredits.length} active{usedCredits.length > 0 && ` · ${usedCredits.length} used`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-2xl font-bold text-amber-400">
                      ${totalAvailable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="p-4 space-y-4">
              {/* Add Credit Button - Only for admin */}
              {isAdmin && (
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  variant="outline"
                  className="w-full border-dashed border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/5"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Credit
                </Button>
              )}

              {/* Active Credits */}
              {activeCredits.length === 0 && usedCredits.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No credits yet. Add a credit to get started.
                </div>
              ) : (
                <>
                  {/* Active Credits List */}
                  {activeCredits.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                        Active Credits
                      </div>
                      {activeCredits.map(renderCreditItem)}
                    </div>
                  )}

                  {/* Used Credits Toggle & List */}
                  {usedCredits.length > 0 && (
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowUsedCredits(!showUsedCredits)}
                        className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 hover:text-foreground transition-colors w-full"
                      >
                        {showUsedCredits ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        <span>Credit History ({usedCredits.length} used)</span>
                        {showUsedCredits ? (
                          <ChevronUp className="w-3.5 h-3.5 ml-auto" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                        )}
                      </button>
                      
                      {showUsedCredits && (
                        <div className="space-y-2 pl-2 border-l-2 border-border/50">
                          {usedCredits.map(renderCreditItem)}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Add Credit Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              Add Credit
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Credit Type Selector */}
            <div className="space-y-2">
              <Label>Credit Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewCreditType('referral')}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border-2 transition-all',
                    newCreditType === 'referral'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-border hover:border-blue-500/50'
                  )}
                >
                  <Users className={cn('w-4 h-4', newCreditType === 'referral' ? 'text-blue-400' : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-medium', newCreditType === 'referral' ? 'text-blue-400' : 'text-muted-foreground')}>
                    Referral
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewCreditType('general')}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border-2 transition-all',
                    newCreditType === 'general'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-border hover:border-purple-500/50'
                  )}
                >
                  <CreditCard className={cn('w-4 h-4', newCreditType === 'general' ? 'text-purple-400' : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-medium', newCreditType === 'general' ? 'text-purple-400' : 'text-muted-foreground')}>
                    General
                  </span>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Credit Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Reason / Statement Description */}
            <div className="space-y-2">
              <Label htmlFor="reason">Statement Description</Label>
              <Textarea
                id="reason"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder={newCreditType === 'referral' 
                  ? "e.g., Referral: John Smith - New Agent Signup" 
                  : "e.g., Service credit - Account adjustment"
                }
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This will appear on billing statements and credit history
              </p>
            </div>

            {/* Expiration Date */}
            <div className="space-y-2">
              <Label>Expiration Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !newExpiresAt && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {newExpiresAt ? format(newExpiresAt, 'MMM d, yyyy') : 'No expiration'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={newExpiresAt}
                    onSelect={setNewExpiresAt}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCredit}
              disabled={createCredit.isPending}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {createCredit.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Credit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!creditToDelete} onOpenChange={(open) => !open && setCreditToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Credit
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {creditToDelete && (
                <>
                  <p>Are you sure you want to delete this credit?</p>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Original Amount:</span>
                      <span className="font-medium">${creditToDelete.original_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {creditToDelete.remaining_balance < creditToDelete.original_amount && (
                      <>
                        <div className="flex justify-between text-amber-500">
                          <span>Amount Used:</span>
                          <span className="font-medium">
                            ${(creditToDelete.original_amount - creditToDelete.remaining_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="pt-2 mt-2 border-t border-border text-amber-500">
                          <AlertTriangle className="w-4 h-4 inline mr-1" />
                          This credit has been partially/fully applied to billing records. Deleting it will remove the credit record but won't affect past billing.
                        </div>
                      </>
                    )}
                    <div className="text-muted-foreground mt-2">{creditToDelete.reason}</div>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCredit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Credit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
