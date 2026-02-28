import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UnlinkedClient {
  id: string;
  name: string;
  email: string;
}

interface AddClientUserDialogProps {
  onSuccess: () => void;
}

export default function AddClientUserDialog({ onSuccess }: AddClientUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [unlinkedClients, setUnlinkedClients] = useState<UnlinkedClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchUnlinkedClients();
    }
  }, [open]);

  const fetchUnlinkedClients = async () => {
    setIsFetching(true);
    try {
      // Fetch clients without user_id OR with user_id that has no corresponding profile
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, email, user_id')
        .order('name');

      if (error) throw error;

      // Filter to only those without valid user accounts
      // A client is "unlinked" if user_id is null OR if user_id exists but no profile exists for it
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id');

      const profileIds = new Set(profiles?.map(p => p.id) || []);
      
      const unlinked = clients?.filter(c => 
        !c.user_id || !profileIds.has(c.user_id)
      ).map(c => ({
        id: c.id,
        name: c.name || 'Unknown',
        email: c.email || '',
      })) || [];

      setUnlinkedClients(unlinked);
    } catch (err) {
      console.error('Error fetching unlinked clients:', err);
      toast({
        title: 'Error',
        description: 'Failed to load clients.',
        variant: 'destructive',
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      toast({
        title: 'Select a client',
        description: 'Please select a client to create an account for.',
        variant: 'destructive',
      });
      return;
    }

    const client = unlinkedClients.find(c => c.id === selectedClientId);
    if (!client) return;

    if (!client.email) {
      toast({
        title: 'Missing email',
        description: 'This client does not have an email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-user-account', {
        body: {
          email: client.email.toLowerCase().trim(),
          name: client.name,
          role: 'client',
          userType: 'client',
          clientId: client.id,
        },
      });

      if (error || !data?.success) {
        toast({
          title: 'Failed to create account',
          description: data?.error || error?.message || 'Please try again.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Client account created',
        description: `${client.name} can now log in. A password reset email has been sent.`,
      });

      setSelectedClientId('');
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedClient = unlinkedClients.find(c => c.id === selectedClientId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="w-4 h-4" />
          Create Client Account
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Client Account</DialogTitle>
        </DialogHeader>

        {isFetching ? (
          <div className="py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Loading clients...</p>
          </div>
        ) : unlinkedClients.length === 0 ? (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              All clients already have user accounts. Create a new client profile first if you need to add someone new.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Select Client</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  {unlinkedClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({client.email || 'No email'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {unlinkedClients.length} client(s) without user accounts
              </p>
            </div>

            {selectedClient && (
              <div className="bg-secondary/30 border border-border rounded-lg p-4 space-y-2">
                <p className="font-medium">{selectedClient.name}</p>
                <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
                <p className="text-xs text-muted-foreground">
                  An account will be created with this email. The client will receive a password setup email.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !selectedClientId} 
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
