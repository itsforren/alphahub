import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign, Brain } from 'lucide-react';

interface ManualBudgetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    newBudget: number;
    reasonCategory: string;
    reasonDetail: string;
  }) => void;
  campaignName: string;
  currentBudget: number;
  suggestedBudget?: number;
  isSubmitting?: boolean;
}

const REASON_CATEGORIES = [
  { value: 'wallet_mismatch', label: 'Wallet Calculation Was Incorrect' },
  { value: 'new_deposit', label: 'New Ad Spend Deposit' },
  { value: 'client_request', label: 'Client Requested Change' },
  { value: 'performance_override', label: 'Performance Override (AI Was Wrong)' },
  { value: 'ramp_up', label: 'Ramping Up New Campaign' },
  { value: 'ramp_down', label: 'Ramping Down / Pausing Soon' },
  { value: 'safe_mode_reset', label: 'Resetting from Safe Mode' },
  { value: 'market_timing', label: 'Market/Seasonal Timing' },
  { value: 'other', label: 'Other (Explain Below)' },
];

export function ManualBudgetDialog({
  isOpen,
  onClose,
  onSubmit,
  campaignName,
  currentBudget,
  suggestedBudget,
  isSubmitting = false,
}: ManualBudgetDialogProps) {
  const [newBudget, setNewBudget] = useState<string>(
    suggestedBudget?.toFixed(2) || currentBudget.toFixed(2)
  );
  const [reasonCategory, setReasonCategory] = useState<string>('');
  const [reasonDetail, setReasonDetail] = useState<string>('');

  const handleSubmit = () => {
    const budgetValue = parseFloat(newBudget);
    if (isNaN(budgetValue) || budgetValue < 0) return;
    if (!reasonCategory) return;

    onSubmit({
      newBudget: budgetValue,
      reasonCategory,
      reasonDetail: reasonDetail.trim(),
    });
  };

  const isValid = 
    newBudget && 
    !isNaN(parseFloat(newBudget)) && 
    parseFloat(newBudget) >= 0 &&
    reasonCategory;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Manual Budget Override
          </DialogTitle>
          <DialogDescription>
            Set a custom daily budget for <strong>{campaignName}</strong>. 
            Your reason will be used to train the AI for better future recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current & Suggested Display */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">Current Budget</p>
              <p className="text-lg font-semibold">${currentBudget.toFixed(2)}/day</p>
            </div>
            {suggestedBudget != null && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-muted-foreground">AI Suggested</p>
                <p className="text-lg font-semibold">${suggestedBudget.toFixed(2)}/day</p>
              </div>
            )}
          </div>

          {/* New Budget Input */}
          <div className="space-y-2">
            <Label htmlFor="new-budget">New Daily Budget ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-budget"
                type="number"
                step="0.01"
                min="0"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                className="pl-9"
                placeholder="74.00"
              />
            </div>
          </div>

          {/* Reason Category */}
          <div className="space-y-2">
            <Label htmlFor="reason-category">
              Why are you making this change? <span className="text-destructive">*</span>
            </Label>
            <Select value={reasonCategory} onValueChange={setReasonCategory}>
              <SelectTrigger id="reason-category">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {REASON_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason Detail */}
          <div className="space-y-2">
            <Label htmlFor="reason-detail">
              Additional Details (helps train AI)
            </Label>
            <Textarea
              id="reason-detail"
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              placeholder="e.g., Wallet was showing $0 but client just deposited $2000 this morning..."
              rows={3}
            />
          </div>

          {/* AI Training Note */}
          <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg text-sm">
            <Brain className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              Your feedback helps the AI learn! The more detail you provide about why this 
              manual change was needed, the better future recommendations will be.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? 'Applying...' : 'Apply Budget Change'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
