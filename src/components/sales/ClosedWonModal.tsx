import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DollarSign, CreditCard, Loader2, Trophy } from 'lucide-react';

export type BillingFrequency = 'monthly' | 'bi_weekly';
export type DepositType = 'full' | 'partial';

export interface ClosedWonData {
  managementFee: number;
  depositType: DepositType;
  depositAmount: number;
  adSpendBudget: number;
  billingFrequency: BillingFrequency;
}

interface ClosedWonModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: ClosedWonData) => void;
  prospectName: string;
  isLoading?: boolean;
}

export function ClosedWonModal({
  open,
  onClose,
  onConfirm,
  prospectName,
  isLoading = false,
}: ClosedWonModalProps) {
  const [managementFee, setManagementFee] = useState('1497');
  const [depositType, setDepositType] = useState<DepositType>('full');
  const [depositAmount, setDepositAmount] = useState('');
  const [adSpendBudget, setAdSpendBudget] = useState('');
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>('monthly');

  const handleConfirm = () => {
    const fee = parseFloat(managementFee) || 0;
    const deposit = depositType === 'full' ? fee : (parseFloat(depositAmount) || 0);

    onConfirm({
      managementFee: fee,
      depositType,
      depositAmount: deposit,
      adSpendBudget: parseFloat(adSpendBudget) || 0,
      billingFrequency,
    });

    // Reset
    setManagementFee('1497');
    setDepositType('full');
    setDepositAmount('');
    setAdSpendBudget('');
    setBillingFrequency('monthly');
  };

  const isValid =
    managementFee &&
    parseFloat(managementFee) > 0 &&
    (depositType === 'full' || (depositAmount && parseFloat(depositAmount) > 0)) &&
    adSpendBudget &&
    parseFloat(adSpendBudget) > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-success" />
            Closed Won – {prospectName}
          </DialogTitle>
          <DialogDescription>
            Enter the deal details to finalize and move to onboarding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Management Fee */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="w-4 h-4 text-primary" />
              Management Fee (Total)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="1497"
                value={managementFee}
                onChange={(e) => setManagementFee(e.target.value)}
                className="pl-7"
                min="0"
                step="1"
              />
            </div>
          </div>

          {/* Deposit Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Payment Collected</Label>
            <RadioGroup
              value={depositType}
              onValueChange={(v) => setDepositType(v as DepositType)}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="full" />
                <span className="text-sm">Full Amount</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="partial" />
                <span className="text-sm">Partial Deposit</span>
              </label>
            </RadioGroup>
          </div>

          {/* Deposit Amount (only if partial) */}
          {depositType === 'partial' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Deposit Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="297"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="pl-7"
                  min="0"
                  step="1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Remaining ${((parseFloat(managementFee) || 0) - (parseFloat(depositAmount) || 0)).toFixed(0)} will be billed later.
              </p>
            </div>
          )}

          {/* Ad Spend Budget */}
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
          </div>

          {/* Billing Frequency */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Ad Spend Billing Frequency</Label>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Confirm & Schedule Onboarding'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
