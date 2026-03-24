import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientConversation } from '@/hooks/useChat';
import { useClient } from '@/hooks/useClientData';
import { ChatHeader } from '@/components/portal/chat/ChatHeader';
import { ChatPanel } from '@/components/portal/chat/ChatPanel';

export default function PortalChat() {
  const { role } = useAuth();
  const { data: client, isLoading: clientLoading } = useClient();
  const { data: conversation, isLoading: conversationLoading } = useClientConversation(client?.id);

  const isLoading = clientLoading || conversationLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Client Profile</h2>
          <p className="text-muted-foreground">Please contact support to set up your account.</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen flex flex-col overflow-hidden">
      <div className="flex-shrink-0">
        <ChatHeader
          title="Chat with Your Success Manager"
          subtitle="We're here to help you succeed"
        />
      </div>
      <ChatPanel conversationId={conversation.id} className="flex-1 min-h-0" />
    </div>
  );
}
