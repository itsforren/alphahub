import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, MessageSquare, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ClickableText } from '@/components/ui/clickable-text';
import { cn } from '@/lib/utils';
import { useSupportTickets, useCreateTicket, useUpdateTicketStatus } from '@/hooks/useClientData';
import { Skeleton } from '@/components/ui/skeleton';

interface SupportTicketPanelProps {
  clientId: string;
  isAdmin?: boolean;
}

const STATUS_CONFIG = {
  open: { label: 'Open', icon: AlertCircle, className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  in_progress: { label: 'In Progress', icon: Clock, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  resolved: { label: 'Resolved', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  closed: { label: 'Closed', icon: CheckCircle2, className: 'bg-muted text-muted-foreground border-border' },
};

const CATEGORIES = [
  { value: 'billing', label: 'Billing' },
  { value: 'tech', label: 'Technical Issue' },
  { value: 'leads', label: 'Leads & Performance' },
  { value: 'other', label: 'Other' },
];

export function SupportTicketPanel({ clientId, isAdmin = false }: SupportTicketPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');

  const { data: tickets, isLoading } = useSupportTickets(clientId);
  const createTicket = useCreateTicket();
  const updateStatus = useUpdateTicketStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || !category) return;

    try {
      await createTicket.mutateAsync({
        client_id: clientId,
        subject,
        message,
        category,
      });

      setSubject('');
      setMessage('');
      setCategory('');
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    await updateStatus.mutateAsync({ id: ticketId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Support Tickets</h3>
          <p className="text-sm text-muted-foreground">
            {tickets?.length || 0} ticket{tickets?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          New Ticket
        </Button>
      </div>

      {/* New Ticket Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="rounded-xl border border-border bg-card p-4 space-y-4"
          >
            <h4 className="font-medium text-foreground">Create Support Ticket</h4>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Subject</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  required
                />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Category</label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail..."
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending ? 'Creating...' : 'Create Ticket'}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Tickets List */}
      <div className="space-y-3">
        {tickets && tickets.length > 0 ? (
          tickets.map((ticket, index) => {
            const statusConfig = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.open;
            const StatusIcon = statusConfig.icon;
            
            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl border border-border bg-card p-4 hover:border-border/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <h4 className="font-medium text-foreground truncate">{ticket.subject}</h4>
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      <ClickableText text={ticket.message} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">{ticket.category}</span>
                      <span>•</span>
                      <span>{format(new Date(ticket.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isAdmin ? (
                      <Select 
                        value={ticket.status} 
                        onValueChange={(value) => handleStatusChange(ticket.id, value)}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={cn("gap-1", statusConfig.className)}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-12 rounded-xl border border-dashed border-border">
            <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No support tickets yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Click "New Ticket" to get help from our team
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
