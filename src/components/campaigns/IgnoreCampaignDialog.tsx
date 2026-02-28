import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Ban, Calendar, AlertTriangle } from 'lucide-react';

const IGNORE_REASONS = [
  { value: 'billing_transfer', label: 'Billing Transfer', description: 'Client is being moved to new billing setup' },
  { value: 'seasonal_pause', label: 'Seasonal Pause', description: 'Client requested temporary pause' },
  { value: 'under_investigation', label: 'Under Investigation', description: 'Issue being investigated, no action needed now' },
  { value: 'client_request', label: 'Client Request', description: 'Client specifically requested this budget' },
  { value: 'new_client', label: 'New Client Ramp-up', description: 'New client still ramping up campaigns' },
  { value: 'other', label: 'Other', description: 'Other business reason' },
];

interface IgnoreCampaignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { reason: string; notes: string; ignoreUntil?: string }) => void;
  campaignName: string;
  isSubmitting?: boolean;
}

export function IgnoreCampaignDialog({
  isOpen,
  onClose,
  onSubmit,
  campaignName,
  isSubmitting = false,
}: IgnoreCampaignDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [ignoreUntil, setIgnoreUntil] = useState('');

  const handleSubmit = () => {
    if (!reason) return;
    onSubmit({
      reason,
      notes,
      ignoreUntil: ignoreUntil || undefined,
    });
  };

  const handleClose = () => {
    setReason('');
    setNotes('');
    setIgnoreUntil('');
    onClose();
  };

  const isValid = reason.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-orange-500" />
            Ignore Campaign
          </DialogTitle>
          <DialogDescription>
            Mark <span className="font-medium">{campaignName}</span> as ignored. 
            It won't appear in attention-needed views until you unignore it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason Category */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {IGNORE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex flex-col items-start">
                      <span>{r.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {reason && (
              <p className="text-xs text-muted-foreground">
                {IGNORE_REASONS.find(r => r.value === reason)?.description}
              </p>
            )}
          </div>

          {/* Ignore Until Date (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="ignoreUntil" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Ignore Until (Optional)
            </Label>
            <Input
              id="ignoreUntil"
              type="date"
              value={ignoreUntil}
              onChange={(e) => setIgnoreUntil(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to ignore indefinitely. Campaign will automatically unignore after this date.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context..."
              rows={3}
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Ignored campaigns won't trigger alerts or show in attention-needed views. 
              Make sure to unignore when the issue is resolved.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || isSubmitting}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? 'Ignoring...' : 'Ignore Campaign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
