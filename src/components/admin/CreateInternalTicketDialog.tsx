import { useState } from 'react';
import { Plus, Loader2, ClipboardList, FileText } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateTicket } from '@/hooks/useClientData';
import { useSupportAgents } from '@/hooks/useSupportAgents';
import { ClientSelector } from '@/components/admin/tickets/ClientSelector';
import { TagInput } from '@/components/admin/tickets/TagInput';
import { DueDatePicker } from '@/components/admin/tickets/DueDatePicker';
import { TicketImageUpload } from '@/components/admin/tickets/TicketImageUpload';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const CATEGORIES = [
  { value: 'tech', label: 'Technical Issue' },
  { value: 'billing', label: 'Billing' },
  { value: 'leads', label: 'Lead Issue' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const TICKET_TYPES = [
  { value: 'internal', label: 'Internal' },
  { value: 'client_support', label: 'Client Support' },
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'update', label: 'Update' },
  { value: 'system_change', label: 'System Change' },
];

interface TicketTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  ticket_type: string;
  labels: string[];
}

export function CreateInternalTicketDialog() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('tech');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [ticketType, setTicketType] = useState('internal');
  const [clientId, setClientId] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [labels, setLabels] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const createTicket = useCreateTicket();
  const { data: agents } = useSupportAgents();

  const { data: templates = [] } = useQuery<TicketTemplate[]>({
    queryKey: ['ticket-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_templates')
        .select('id, name, subject, message, category, priority, ticket_type, labels')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as TicketTemplate[];
    },
  });

  const applyTemplate = (templateId: string) => {
    const t = templates.find((tp) => tp.id === templateId);
    if (!t) return;
    setSubject(t.subject);
    setMessage(t.message);
    setCategory(t.category);
    setPriority(t.priority as any);
    setTicketType(t.ticket_type);
    setLabels(t.labels || []);
  };

  const resetForm = () => {
    setSubject('');
    setMessage('');
    setCategory('tech');
    setPriority('normal');
    setTicketType('internal');
    setClientId(null);
    setAssignedTo(null);
    setDueDate(undefined);
    setLabels([]);
    setImageFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const ticket = await createTicket.mutateAsync({
        client_id: clientId,
        subject,
        message,
        category,
        ticket_type: ticketType,
        priority,
        labels: labels.length > 0 ? labels : undefined,
        due_date: dueDate ? dueDate.toISOString() : undefined,
        assigned_to: assignedTo,
      });

      // Upload images if any
      if (imageFiles.length > 0 && ticket?.id) {
        for (const file of imageFiles) {
          const path = `${ticket.id}/${crypto.randomUUID()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('ticket-attachments')
            .upload(path, file);
          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }
          const { data: urlData } = supabase.storage
            .from('ticket-attachments')
            .getPublicUrl(path);

          const { data: userData } = await supabase.auth.getUser();
          await supabase.from('ticket_attachments').insert({
            ticket_id: ticket.id,
            file_url: urlData.publicUrl,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: userData.user?.id || null,
          });
        }
      }

      toast.success('Ticket created');
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create ticket');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          New Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Create Ticket
          </DialogTitle>
          <DialogDescription>
            Create a ticket for tracking tasks, bugs, features, or client issues.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template selector */}
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Template
              </Label>
              <Select onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Start from a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder="Brief description of the issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          {/* Type + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={ticketType} onValueChange={setTicketType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority + Assignee */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((pri) => (
                    <SelectItem key={pri.value} value={pri.value}>
                      {pri.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select
                value={assignedTo || 'unassigned'}
                onValueChange={(v) => setAssignedTo(v === 'unassigned' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {agents?.filter(a => a.user_id).map((agent) => (
                    <SelectItem key={agent.user_id} value={agent.user_id!}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Client + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client (optional)</Label>
              <ClientSelector value={clientId} onChange={setClientId} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <DueDatePicker date={dueDate} onChange={setDueDate} />
            </div>
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label>Labels</Label>
            <TagInput tags={labels} onChange={setLabels} placeholder="Add labels..." />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Details *</Label>
            <Textarea
              id="message"
              placeholder="Describe the issue in detail..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            <TicketImageUpload files={imageFiles} onFilesChange={setImageFiles} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Ticket'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
