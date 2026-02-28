import { useState } from 'react';
import { CheckCircle2, XCircle, Circle, Loader2, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  OnboardingChecklistItem, 
  OnboardingCheckStatus,
  useUpdateChecklistItem 
} from '@/hooks/useOnboardingChecklist';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface OnboardingChecklistItemRowProps {
  item: OnboardingChecklistItem;
  userId?: string;
  onIssueFound: (item: OnboardingChecklistItem) => void;
}

export function OnboardingChecklistItemRow({
  item,
  userId,
  onIssueFound,
}: OnboardingChecklistItemRowProps) {
  const updateItem = useUpdateChecklistItem();
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(item.notes || '');

  const handleStatusChange = async (newStatus: OnboardingCheckStatus) => {
    if (newStatus === 'no' && item.status !== 'no') {
      // Mark as no and trigger issue modal
      await updateItem.mutateAsync({
        itemId: item.id,
        status: 'no',
        checkedBy: userId,
      });
      onIssueFound({ ...item, status: 'no' });
    } else {
      await updateItem.mutateAsync({
        itemId: item.id,
        status: newStatus,
        checkedBy: userId,
      });
    }
  };

  const handleSaveNotes = async () => {
    await updateItem.mutateAsync({
      itemId: item.id,
      status: item.status,
      notes,
      checkedBy: userId,
    });
    setShowNotes(false);
  };

  const getStatusIcon = () => {
    if (item.status === 'yes') {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    }
    if (item.status === 'no') {
      return <XCircle className="w-4 h-4 text-destructive" />;
    }
    return <Circle className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div 
      className={cn(
        "p-3 rounded-md border bg-background transition-colors",
        item.status === 'yes' && "bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900",
        item.status === 'no' && "bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">{getStatusIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm",
            item.status === 'yes' && "text-green-700 dark:text-green-400",
            item.status === 'no' && "text-red-700 dark:text-red-400",
          )}>
            {item.item_label}
          </p>
          {item.notes && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              Note: {item.notes}
            </p>
          )}
          {item.ticket_id && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              Ticket created for this issue
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Popover open={showNotes} onOpenChange={setShowNotes}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0"
                title="Add notes"
              >
                <StickyNote className={cn(
                  "w-4 h-4",
                  item.notes ? "text-yellow-600" : "text-muted-foreground"
                )} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this check..."
                  className="min-h-[80px] text-sm"
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowNotes(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveNotes}
                    disabled={updateItem.isPending}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <RadioGroup
            value={item.status}
            onValueChange={(val) => handleStatusChange(val as OnboardingCheckStatus)}
            className="flex items-center gap-2"
            disabled={updateItem.isPending}
          >
            <div className="flex items-center">
              <RadioGroupItem 
                value="yes" 
                id={`${item.id}-yes`} 
                className="border-green-600 text-green-600"
              />
              <Label 
                htmlFor={`${item.id}-yes`} 
                className="ml-1 text-xs text-green-600 cursor-pointer"
              >
                Yes
              </Label>
            </div>
            <div className="flex items-center">
              <RadioGroupItem 
                value="no" 
                id={`${item.id}-no`}
                className="border-red-600 text-red-600"
              />
              <Label 
                htmlFor={`${item.id}-no`} 
                className="ml-1 text-xs text-red-600 cursor-pointer"
              >
                No
              </Label>
            </div>
          </RadioGroup>
          
          {updateItem.isPending && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}
