import { useState } from 'react';
import { Search, MessageSquarePlus, Loader2 } from 'lucide-react';
import { useClients } from '@/hooks/useClientData';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import ClientAvatar from '@/components/portal/ClientAvatar';

interface NewChatDialogProps {
  onSelectConversation: (conversationId: string) => void;
}

export function NewChatDialog({ onSelectConversation }: NewChatDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState<string | null>(null);
  
  const { data: clients, isLoading } = useClients();

  const filteredClients = clients?.filter((client) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      client.name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query)
    );
  });

  const handleSelectClient = async (clientId: string) => {
    setCreating(clientId);
    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('client_id', clientId)
        .maybeSingle();

      if (existing) {
        onSelectConversation(existing.id);
        setOpen(false);
        setSearch('');
        return;
      }

      // Create new conversation
      const { data: newConvo, error } = await supabase
        .from('chat_conversations')
        .insert({ client_id: clientId })
        .select('id')
        .single();

      if (error) throw error;
      
      onSelectConversation(newConvo.id);
      setOpen(false);
      setSearch('');
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setCreating(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <MessageSquarePlus className="w-4 h-4" />
          New Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Chat</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredClients?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No clients found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredClients?.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleSelectClient(client.id)}
                    disabled={creating === client.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                  >
                    <ClientAvatar
                      name={client.name || 'Client'}
                      src={client.profile_image_url}
                      cacheKey={(client as any)?.headshot_updated_at || (client as any)?.updated_at}
                      size="md"
                      className="ring-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                    </div>
                    {creating === client.id && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
