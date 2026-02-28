import { useState } from 'react';
import { addHours } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { 
  OnboardingChecklistItem,
  useLinkTicketToChecklist 
} from '@/hooks/useOnboardingChecklist';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, TicketPlus } from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: OnboardingChecklistItem | null;
  clientId: string;
  clientName: string;
}

export function OnboardingIssueModal({
  isOpen,
  onClose,
  item,
  clientId,
  clientName,
}: OnboardingIssueModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const linkTicket = useLinkTicketToChecklist();
  const [details, setDetails] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTicket = async () => {
    if (!item) return;
    
    setIsCreating(true);
    try {
      // Create support ticket with 24-hour due date
      const dueDate = addHours(new Date(), 24);
      
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
          client_id: clientId,
          subject: `[Onboarding QA] ${item.item_label}`,
          message: details || `Issue found during onboarding QA check: "${item.item_label}"`,
          category: 'onboarding',
          status: 'open',
          due_date: dueDate.toISOString(),
          onboarding_checklist_id: item.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Link ticket to checklist item
      await linkTicket.mutateAsync({
        itemId: item.id,
        ticketId: ticket.id,
        clientId,
      });
      
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      
      toast.success('Ticket created', {
        description: 'Support ticket created with 24-hour SLA',
      });
      
      setDetails('');
      onClose();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSkip = () => {
    setDetails('');
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Issue Found
          </DialogTitle>
          <DialogDescription>
            Create a support ticket to track this onboarding issue?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">Check that failed:</p>
            <p className="text-sm text-muted-foreground mt-1">{item.item_label}</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="details">Additional Details (Optional)</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe what's wrong and any relevant details..."
              className="min-h-[100px]"
            />
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TicketPlus className="w-4 h-4" />
            <span>Ticket will be due in 24 hours</span>
          </div>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSkip} disabled={isCreating}>
            Skip for Now
          </Button>
          <Button onClick={handleCreateTicket} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Ticket'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
