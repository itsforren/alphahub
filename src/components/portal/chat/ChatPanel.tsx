import { useEffect, useLayoutEffect, useRef, useCallback, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useChatMessages,
  useSendMessage,
  useMarkAsRead,
  useChatRealtime,
  ChatMessage as ChatMessageType,
} from '@/hooks/useChat';
import { useClient } from '@/hooks/useClientData';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { BusinessHoursBanner } from './BusinessHoursBanner';
import { Button } from '@/components/ui/button';

interface ChatPanelProps {
  conversationId: string;
  className?: string;
}

export function ChatPanel({ conversationId, className }: ChatPanelProps) {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const prevConversationId = useRef<string | null>(null);

  const { data: client } = useClient();
  const [stellaIsTyping, setStellaIsTyping] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useChatMessages(conversationId);

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
  const messages = data?.pages.flatMap((page) => page.messages) ?? [];

  const sortedMessages = useMemo(() => {
    const unique = Array.from(new Map(messages.map(m => [m.id, m])).values());
    return unique.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [messages]);

  // Snap to bottom BEFORE paint so user never sees the top
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && sortedMessages.length > 0) {
      el.scrollTop = el.scrollHeight;
    }
  }, [sortedMessages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      markAsRead.mutate(conversationId);
    }
  }, [conversationId, messages.length]);

  const handleSend = (message: string, attachment?: { url: string; type: string; name: string }, personaId?: import('@/hooks/useChat').ChatPersonaId) => {
    sendMessage.mutate({ conversationId, message, attachment, personaId });
    setStellaIsTyping(true);
  };

  // Hide typing indicator when Stella (or any admin) responds
  useEffect(() => {
    if (!stellaIsTyping) return;
    const lastMsg = sortedMessages[sortedMessages.length - 1];
    if (lastMsg?.sender_role === 'admin') {
      setStellaIsTyping(false);
    }
  }, [sortedMessages, stellaIsTyping]);

  // Timeout: hide typing indicator after 90 seconds max
  useEffect(() => {
    if (!stellaIsTyping) return;
    const timeout = setTimeout(() => setStellaIsTyping(false), 90000);
    return () => clearTimeout(timeout);
  }, [stellaIsTyping]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full min-h-0 bg-card ${className}`}>
      {/* Fixed header banners */}
      <div className="flex-shrink-0">
        <BusinessHoursBanner />
      </div>

      {/* Messages area - scrollable */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 min-h-0"
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

        {sortedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          sortedMessages.map((msg) => {
            const messageWithClientInfo = msg.sender_role === 'client' && client
              ? {
                  ...msg,
                  sender_name: client.name || msg.sender_name,
                  sender_avatar_url: client.profile_image_url || msg.sender_avatar_url,
                }
              : msg;

            return (
              <ChatMessage
                key={`msg-${msg.id}`}
                message={messageWithClientInfo}
                isOwnMessage={msg.sender_id === user?.id}
              />
            );
          })
        )}

        {/* Stella typing indicator */}
        {stellaIsTyping && (
          <div className="flex gap-3 px-2 py-1.5 -mx-2 rounded-lg animate-in fade-in duration-300">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs font-medium">
              ST
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-sm text-foreground">Stella</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-primary/10 text-primary">
                  Alpha Success Manager
                </span>
              </div>
              <div className="flex gap-1 mt-1.5">
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.2s' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.2s' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.2s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input - sticky at bottom */}
      <div className="flex-shrink-0 border-t border-border">
        <ChatInput
          onSend={handleSend}
          disabled={sendMessage.isPending}
          placeholder="Type your message..."
          clientId={client?.id}
        />
      </div>
    </div>
  );
}
