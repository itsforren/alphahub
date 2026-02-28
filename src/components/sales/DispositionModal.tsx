import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { NextActionSelector, NextActionType } from './NextActionSelector';
import { CheckCircle2, XCircle, PhoneForwarded, Calendar, AlertCircle, Phone, DollarSign, CreditCard } from 'lucide-react';

export type Disposition = 
  | 'showed_closed_won'
  | 'showed_follow_up'
  | 'showed_closed_lost'
  | 'no_show_rebooked'
  | 'canceled_rebooked'
  | 'disqualified';

interface DispositionConfig {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  suggestedNextAction: NextActionType | null;
}

const DISPOSITION_CONFIG: Record<Disposition, DispositionConfig> = {
  showed_closed_won: {
    label: 'Closed Won',
    description: 'Payment collected, ready to onboard',
    icon: CheckCircle2,
    suggestedNextAction: 'onboarding_schedule',
  },
  showed_follow_up: {
    label: 'Showed - Needs Follow-up',
    description: 'Good call, but needs more time or info',
    icon: PhoneForwarded,
    suggestedNextAction: 'follow_up_call',
  },
  showed_closed_lost: {
    label: 'Showed - Closed Lost',
    description: 'Prospect is not moving forward',
    icon: XCircle,
    suggestedNextAction: null,
  },
  no_show_rebooked: {
    label: 'No-Show - Rebooked',
    description: 'Missed the call but rescheduled',
    icon: Calendar,
    suggestedNextAction: 'follow_up_call',
  },
  canceled_rebooked: {
    label: 'Canceled - Rebooked',
    description: 'Canceled but rescheduled for later',
    icon: Calendar,
    suggestedNextAction: 'follow_up_call',
  },
  disqualified: {
    label: 'Disqualified',
    description: 'Does not meet our criteria',
    icon: AlertCircle,
    suggestedNextAction: null,
  },
};

// Dispositions that represent a completed call
const COMPLETED_CALL_DISPOSITIONS: Disposition[] = [
  'showed_closed_won',
  'showed_follow_up',
  'showed_closed_lost',
];

export type BillingFrequency = 'monthly' | 'bi_weekly';

interface DispositionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    disposition: Disposition;
    nextActionType: NextActionType | null;
    nextActionDueAt: string | null;
    incrementCallCount: boolean;
    cashCollected?: number;
    adSpendBudget?: number;
    billingFrequency?: BillingFrequency;
    createAdSpendInvoice?: boolean;
  }) => void;
  prospectName: string;
  currentCallCount: number;
}

export function DispositionModal({ open, onClose, onSave, prospectName, currentCallCount }: DispositionModalProps) {
  const [disposition, setDisposition] = useState<Disposition | null>(null);
  const [nextActionType, setNextActionType] = useState<NextActionType | null>(null);
  const [nextActionDueAt, setNextActionDueAt] = useState('');
  const [shouldIncrementCall, setShouldIncrementCall] = useState(false);
  const [cashCollected, setCashCollected] = useState('');
  
  // New billing fields for Closed Won
  const [adSpendBudget, setAdSpendBudget] = useState('');
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>('monthly');
  const [createAdSpendInvoice, setCreateAdSpendInvoice] = useState(true);

  const handleDispositionChange = (value: Disposition) => {
    setDisposition(value);
    const config = DISPOSITION_CONFIG[value];
    
    // Auto-check "completed call" for Showed dispositions
    const isCompletedCall = COMPLETED_CALL_DISPOSITIONS.includes(value);
    setShouldIncrementCall(isCompletedCall);
    
    if (config.suggestedNextAction) {
      setNextActionType(config.suggestedNextAction);
      // Set default due time to 1 hour from now
      const defaultDue = new Date(Date.now() + 60 * 60 * 1000);
      setNextActionDueAt(defaultDue.toISOString().slice(0, 16));
    } else {
      setNextActionType(null);
      setNextActionDueAt('');
    }
  };

  const handleSave = () => {
    if (!disposition) return;
    
    const data: Parameters<typeof onSave>[0] = {
      disposition,
      nextActionType,
      nextActionDueAt: nextActionDueAt ? new Date(nextActionDueAt).toISOString() : null,
      incrementCallCount: shouldIncrementCall,
    };
    
    // Add Closed Won specific data
    if (disposition === 'showed_closed_won') {
      if (cashCollected) data.cashCollected = parseFloat(cashCollected);
      if (adSpendBudget) data.adSpendBudget = parseFloat(adSpendBudget);
      data.billingFrequency = billingFrequency;
      data.createAdSpendInvoice = createAdSpendInvoice;
    }
    
    onSave(data);
    
    // Reset state
    setDisposition(null);
    setNextActionType(null);
    setNextActionDueAt('');
    setShouldIncrementCall(false);
    setCashCollected('');
    setAdSpendBudget('');
    setBillingFrequency('monthly');
    setCreateAdSpendInvoice(true);
    onClose();
  };

  const requiresNextAction = disposition && 
    !['showed_closed_lost', 'disqualified'].includes(disposition);

  const requiresCashCollected = disposition === 'showed_closed_won';
  
  const canSave = disposition && 
    (!requiresNextAction || (nextActionType && nextActionDueAt)) &&
    (!requiresCashCollected || (cashCollected && parseFloat(cashCollected) > 0));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Call Outcome for {prospectName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Call count display */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              Current call count: <span className="font-semibold">{currentCallCount}</span> completed {currentCallCount === 1 ? 'call' : 'calls'}
            </span>
          </div>

          <div className="space-y-3">
            <Label>What happened on the call?</Label>
            <RadioGroup
              value={disposition || ''}
              onValueChange={(v) => handleDispositionChange(v as Disposition)}
              className="space-y-2"
            >
              {Object.entries(DISPOSITION_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <label
                    key={key}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <RadioGroupItem value={key} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{config.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {config.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Closed Won specific fields */}
          {disposition === 'showed_closed_won' && (
            <div className="space-y-4 p-4 rounded-lg border border-primary/50 bg-primary/5">
              {/* Deposit Amount */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Deposit Collected
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={cashCollected}
                    onChange={(e) => setCashCollected(e.target.value)}
                    className="pl-7"
                    min="0"
                    step="0.01"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Enter the deposit collected at close</p>
              </div>

              {/* Monthly Ad Spend Budget */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Monthly Ad Spend Budget
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="1500"
                    value={adSpendBudget}
                    onChange={(e) => setAdSpendBudget(e.target.value)}
                    className="pl-7"
                    min="0"
                    step="1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Desired monthly ad spend (e.g., $1,500)</p>
              </div>

              {/* Billing Frequency */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Billing Frequency</Label>
                <RadioGroup
                  value={billingFrequency}
                  onValueChange={(v) => setBillingFrequency(v as BillingFrequency)}
                  className="flex gap-4"
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="monthly" />
                    <span className="text-sm">Monthly</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="bi_weekly" />
                    <span className="text-sm">Bi-weekly</span>
                  </label>
                </RadioGroup>
              </div>

              {/* Create Ad Spend Invoice */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50">
                <Checkbox
                  id="create-ad-spend-invoice"
                  checked={createAdSpendInvoice}
                  onCheckedChange={(checked) => setCreateAdSpendInvoice(checked === true)}
                />
                <label htmlFor="create-ad-spend-invoice" className="text-sm cursor-pointer">
                  Create ad spend invoice as due
                </label>
              </div>
            </div>
          )}

          {/* Call count confirmation checkbox */}
          {disposition && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Checkbox
                id="increment-call"
                checked={shouldIncrementCall}
                onCheckedChange={(checked) => setShouldIncrementCall(checked === true)}
              />
              <label htmlFor="increment-call" className="text-sm cursor-pointer">
                This was a completed call <span className="text-muted-foreground">(count will become {currentCallCount + 1})</span>
              </label>
            </div>
          )}

          {requiresNextAction && (
            <div className="pt-4 border-t border-border">
              <NextActionSelector
                actionType={nextActionType}
                dueAt={nextActionDueAt}
                onActionTypeChange={setNextActionType}
                onDueAtChange={setNextActionDueAt}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            Save Outcome
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}