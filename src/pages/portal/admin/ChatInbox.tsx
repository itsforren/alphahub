import { useState } from 'react';
import { Loader2, MessageCircle, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAllConversations, useConversationsRealtime, useUnreadCount } from '@/hooks/useChat';
import { AdminChatView } from '@/components/portal/chat/AdminChatView';
import { NewChatDialog } from '@/components/portal/chat/NewChatDialog';
import ClientAvatar from '@/components/portal/ClientAvatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function ChatInbox() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: conversations, isLoading } = useAllConversations();
  const { data: totalUnread = 0 } = useUnreadCount(true);

  // Set up realtime subscription for all conversations
  useConversationsRealtime();

  const filteredConversations = conversations?.filter((conv) => {
    const client = conv.clients;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      client?.name?.toLowerCase().includes(query) ||
      client?.email?.toLowerCase().includes(query)
    );
  });

  // Sort by unread first, then by last message time
  const sortedConversations = filteredConversations?.sort((a, b) => {
    // Unread first
    if (a.unread_count_admin > 0 && b.unread_count_admin === 0) return -1;
    if (a.unread_count_admin === 0 && b.unread_count_admin > 0) return 1;

    // Then by last message time
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTime - aTime;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Conversation List */}
      <div className={cn(
        "w-full lg:w-80 xl:w-96 border-r border-border/50 flex flex-col bg-card/50",
        selectedConversationId && "hidden lg:flex"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Inbox</h1>
              {totalUnread > 0 && (
                <Badge variant="destructive" className="rounded-full">
                  {totalUnread}
                </Badge>
              )}
            </div>
            <NewChatDialog onSelectConversation={setSelectedConversationId} />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {sortedConversations?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            sortedConversations?.map((conv) => {
              const client = conv.clients;
              const hasUnread = conv.unread_count_admin > 0;
              const isSelected = selectedConversationId === conv.id;

              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors text-left border-b border-border/30",
                    isSelected && "bg-primary/5 border-l-2 border-l-primary",
                    hasUnread && "bg-primary/5"
                  )}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <ClientAvatar
                      name={client?.name || 'Client'}
                      src={client?.profile_image_url}
                      cacheKey={(client as any)?.headshot_updated_at || (client as any)?.updated_at}
                      size="lg"
                      className="ring-0"
                    />
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                        {conv.unread_count_admin > 9 ? '9+' : conv.unread_count_admin}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "font-medium text-sm truncate",
                        hasUnread && "font-semibold"
                      )}>
                        {client?.name || 'Unknown Client'}
                      </span>
                      {conv.last_message_at && (
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      "text-xs truncate",
                      hasUnread ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {conv.last_message_preview || 'No messages yet'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat View - Full height */}
      <div className={cn(
        "flex-1 flex flex-col min-h-0 overflow-hidden",
        !selectedConversationId && "hidden lg:flex"
      )}>
        {selectedConversationId ? (
          <AdminChatView
            conversationId={selectedConversationId}
            onBack={() => setSelectedConversationId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted/20">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose a client from the list to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
