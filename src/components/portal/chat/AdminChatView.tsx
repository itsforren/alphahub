import { useEffect, useLayoutEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  useConversation,
  useChatMessages,
  useSendMessage,
  useMarkAsRead,
  useChatRealtime,
  ChatMessage as ChatMessageType,
} from '@/hooks/useChat';
import { useSupportTickets, SupportTicket } from '@/hooks/useClientData';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { OpenTicketBanner } from './OpenTicketBanner';
import { TicketTimelineItem } from './TicketTimelineItem';
import { Button } from '@/components/ui/button';

interface AdminChatViewProps {
  conversationId: string;
  onBack?: () => void;
}

type TimelineItem =
  | { type: 'message'; data: ChatMessageType; created_at: string }
  | { type: 'ticket'; data: SupportTicket; created_at: string };

export function AdminChatView({ conversationId, onBack }: AdminChatViewProps) {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const prevConversationId = useRef<string | null>(null);
  const [dismissedTickets, setDismissedTickets] = useState<string[]>([]);

  const { data: conversation, isLoading: conversationLoading } = useConversation(conversationId);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: messagesLoading,
  } = useChatMessages(conversationId);

  const clientId = conversation?.client_id;
  const { data: tickets = [] } = useSupportTickets(clientId);

  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  // Set up realtime subscription
  useChatRealtime(conversationId);

  // Reset on conversation change
  useEffect(() => {
    if (conversationId && conversationId !== prevConversationId.current) {
      prevConversationId.current = conversationId;
      isInitialLoad.current = true;
    }
  }, [conversationId]);

  // Flatten messages from all pages and deduplicate by ID
  const rawMessages = data?.pages.flatMap((page) => page.messages) ?? [];
  const messages = useMemo(() =>
    Array.from(new Map(rawMessages.map(m => [m.id, m])).values()),
    [rawMessages]
  );

  // Combine messages and tickets into a timeline
  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];
    messages.forEach((msg) => {
      items.push({ type: 'message', data: msg, created_at: msg.created_at });
    });
    tickets.forEach((ticket) => {
      items.push({ type: 'ticket', data: ticket, created_at: ticket.created_at });
    });
    return items.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [messages, tickets]);

  // Filter open tickets for the banner
  const openTicketsForBanner = tickets.filter(
    t => (t.status === 'open' || t.status === 'waiting') && !dismissedTickets.includes(t.id)
  );

  // Snap to bottom BEFORE paint so user never sees the top
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && timeline.length > 0) {
      el.scrollTop = el.scrollHeight;
    }
  }, [timeline]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      markAsRead.mutate(conversationId);
    }
  }, [conversationId, messages.length]);

  const handleSend = (message: string, attachment?: { url: string; type: string; name: string }) => {
    sendMessage.mutate({ conversationId, message, attachment });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleDismissTicket = (ticketId: string) => {
    setDismissedTickets(prev => [...prev, ticketId]);
  };

  const isLoading = conversationLoading || messagesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const client = conversation?.clients;

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-card">
      {/* Header - fixed */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}

          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
            {client?.profile_image_url ? (
              <img
                src={client.profile_image_url}
                alt={client.name}
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = '';
                  }
                }}
              />
            ) : null}
            <span
              className="text-sm font-bold text-primary-foreground"
              style={client?.profile_image_url ? { display: 'none' } : undefined}
            >
              {client?.name?.charAt(0).toUpperCase() || 'C'}
            </span>
          </div>

          <div>
            <h3 className="font-semibold text-sm">{client?.name || 'Client'}</h3>
            <p className="text-xs text-muted-foreground">{client?.email}</p>
          </div>
        </div>

        {client && (
          <Link to={`/hub/admin/clients/${client.id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="w-3 h-3" />
              View Profile
            </Button>
          </Link>
        )}
      </div>

      {/* Open Tickets Banner - fixed */}
      <div className="flex-shrink-0">
        <OpenTicketBanner
          tickets={openTicketsForBanner}
          onDismiss={handleDismissTicket}
        />
      </div>

      {/* Messages area - scrollable */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {/* Load more button */}
        {hasNextPage && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-xs"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load older messages'
              )}
            </Button>
          </div>
        )}

        {timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Start the conversation by sending a message</p>
          </div>
        ) : (
          timeline.map((item) => {
            if (item.type === 'message') {
              const messageWithClientInfo = item.data.sender_role === 'client' && client
                ? {
                    ...item.data,
                    sender_name: client.name || item.data.sender_name,
                    sender_avatar_url: client.profile_image_url || item.data.sender_avatar_url,
                  }
                : item.data;

              return (
                <ChatMessage
                  key={`msg-${item.data.id}`}
                  message={messageWithClientInfo}
                  isOwnMessage={item.data.sender_id === user?.id}
                />
              );
            } else {
              return (
                <TicketTimelineItem
                  key={`ticket-${item.data.id}`}
                  ticket={item.data}
                  isOwnTicket={false}
                />
              );
            }
          })
        )}
      </div>

      {/* Input - sticky at bottom */}
      <div className="flex-shrink-0 border-t border-border">
        <ChatInput
          onSend={handleSend}
          disabled={sendMessage.isPending}
          placeholder="Type your reply..."
          clientId={clientId}
        />
      </div>
    </div>
  );
}
