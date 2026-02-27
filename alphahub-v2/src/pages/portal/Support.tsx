import { useState } from 'react';
import { format } from 'date-fns';
import { MessageSquare, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClient, useSupportTickets, useCreateTicket } from '@/hooks/useClientData';
import { useClientAgreement } from '@/hooks/useAgreement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ClickableText } from '@/components/ui/clickable-text';
import { AgreementSignedWidget } from '@/components/portal/AgreementSignedWidget';
import { toast } from 'sonner';
import StatusBadge from '@/components/portal/StatusBadge';

export default function PortalSupport() {
  const { user } = useAuth();
  const { data: client, isLoading: clientLoading } = useClient();
  const { data: tickets, isLoading: ticketsLoading } = useSupportTickets(client?.id);
  const { data: clientAgreement } = useClientAgreement(client?.id);
  const createTicket = useCreateTicket();
  
  // Check if agreement is signed
  const hasSignedAgreement = !!(client?.contract_signed_at || clientAgreement?.status === 'signed');

  const [showForm, setShowForm] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    category: 'other'
  });

  const handleCreateTicket = async () => {
    if (!client || !newTicket.subject || !newTicket.message) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await createTicket.mutateAsync({
        client_id: client.id,
        subject: newTicket.subject,
        message: newTicket.message,
        category: newTicket.category
      });
      toast.success('Ticket created successfully');
      setNewTicket({ subject: '', message: '', category: 'general' });
      setShowForm(false);
    } catch (error) {
      toast.error('Failed to create ticket');
    }
  };

  if (clientLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 lg:p-8">
        <div className="frosted-card p-12 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">No Client Account Found</h2>
          <p className="text-muted-foreground">
            Your account is not linked to a client record.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support</h1>
          <p className="text-muted-foreground">Get help with your account</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Ticket
        </Button>
      </div>

      {/* Signed Agreement Widget */}
      {hasSignedAgreement && client?.contract_signed_at && (
        <AgreementSignedWidget 
          clientId={client.id}
          signedAt={client.contract_signed_at} 
          pdfUrl={clientAgreement?.pdf_url}
        />
      )}

      {/* New Ticket Form */}
      {showForm && (
        <div className="frosted-card p-6 space-y-4">
          <h3 className="text-lg font-semibold">Create New Ticket</h3>
          <Input
            placeholder="Subject"
            value={newTicket.subject}
            onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
          />
          <Select
            value={newTicket.category}
            onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="tech">Technical</SelectItem>
              <SelectItem value="leads">Lead Quality</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Describe your issue..."
            value={newTicket.message}
            onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
            rows={4}
          />
          <div className="flex gap-2">
            <Button onClick={handleCreateTicket} disabled={createTicket.isPending}>
              {createTicket.isPending ? 'Creating...' : 'Submit Ticket'}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Tickets List */}
      <div className="space-y-4">
        {ticketsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : tickets && tickets.length > 0 ? (
          tickets.map((ticket) => (
            <div key={ticket.id} className="frosted-card-hover p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${
                    ticket.status === 'open' ? 'bg-primary/20 text-primary' :
                    ticket.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-success/20 text-success'
                  }`}>
                    {ticket.status === 'open' ? <AlertCircle className="w-4 h-4" /> :
                     ticket.status === 'waiting' ? <Clock className="w-4 h-4" /> :
                     <CheckCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{ticket.subject}</h4>
                    <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      <ClickableText text={ticket.message} />
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="capitalize">{ticket.category}</span>
                      <span>•</span>
                      <span>{format(new Date(ticket.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
                <StatusBadge 
                  status={ticket.status} 
                  size="sm" 
                />
              </div>
            </div>
          ))
        ) : (
          <div className="frosted-card p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Support Tickets</h3>
            <p className="text-muted-foreground">
              You haven't created any support tickets yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
