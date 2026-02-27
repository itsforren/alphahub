import { useState } from 'react';
import { Ticket, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateTicket } from '@/hooks/useClientData';
import { toast } from 'sonner';

interface CreateTicketFromChatProps {
  clientId: string;
  onCreated?: () => void;
}

const CATEGORIES = [
  { value: 'billing', label: 'Billing' },
  { value: 'tech', label: 'Technical Issue' },
  { value: 'leads', label: 'Leads & Performance' },
  { value: 'other', label: 'Other' },
];

export function CreateTicketFromChat({ clientId, onCreated }: CreateTicketFromChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('other');
  
  const createTicket = useCreateTicket();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await createTicket.mutateAsync({
        client_id: clientId,
        subject,
        message,
        category,
      });
      toast.success('Ticket created successfully');
      setSubject('');
      setMessage('');
      setCategory('other');
      setIsOpen(false);
      onCreated?.();
    } catch (error: any) {
      console.error('Failed to create ticket:', error);
      toast.error(error?.message || 'Failed to create ticket');
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8"
        title="Create Support Ticket"
      >
        <Ticket className="w-4 h-4" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl p-4 z-50"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">Create Support Ticket</h4>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="text-sm"
              />
              
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Textarea
                placeholder="Describe your issue..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="text-sm"
              />
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createTicket.isPending}
                  className="flex-1"
                >
                  {createTicket.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
