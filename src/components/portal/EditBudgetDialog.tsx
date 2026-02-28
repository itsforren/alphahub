import { useState } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditBudgetDialogProps {
  clientId: string;
  currentBudget: number | null | undefined;
  googleCampaignId: string | null | undefined;
  onSuccess: () => void;
}

export function EditBudgetDialog({ 
  clientId, 
  currentBudget, 
  googleCampaignId,
  onSuccess 
}: EditBudgetDialogProps) {
  const [open, setOpen] = useState(false);
  const [budget, setBudget] = useState(currentBudget?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const newBudget = parseFloat(budget);
    
    if (isNaN(newBudget) || newBudget <= 0) {
      toast.error('Please enter a valid budget amount');
      return;
    }

    setIsSaving(true);

    try {
      if (googleCampaignId) {
        // Update Google Ads budget
        const { data, error } = await supabase.functions.invoke('update-google-ads-budget', {
          body: { clientId, newDailyBudget: newBudget },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to update budget');

        toast.success(`Daily budget updated to $${newBudget} in Google Ads`);
      } else {
        // Just update local database
        const { error } = await supabase
          .from('clients')
          .update({ target_daily_spend: newBudget })
          .eq('id', clientId);

        if (error) throw error;
        toast.success(`Daily budget updated to $${newBudget}`);
      }

      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update budget');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Daily Budget</DialogTitle>
          <DialogDescription>
            {googleCampaignId 
              ? 'This will update the daily budget in Google Ads and sync locally.'
              : 'Set the daily ad spend budget for this client.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="budget">Daily Budget ($)</Label>
            <Input
              id="budget"
              type="number"
              min="1"
              step="1"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="75"
            />
          </div>
          {googleCampaignId && (
            <p className="text-xs text-muted-foreground">
              Connected to Google Ads campaign: {googleCampaignId}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {googleCampaignId ? 'Update Google Ads' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
