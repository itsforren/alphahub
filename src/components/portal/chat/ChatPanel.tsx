import { useEffect, useRef, useCallback, useMemo } from 'react';
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const prevConversationId = useRef<string | null>(null);
  
  const { data: client } = useClient();
  
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

  // Auto-scroll when conversation changes
  useEffect(() => {
    if (conversationId && conversationId !== prevConversationId.current) {
      prevConversationId.current = conversationId;
      isInitialLoad.current = true;
    }
  }, [conversationId]);
  
  // Flatten messages from all pages
  const messages = data?.pages.flatMap((page) => page.messages) ?? [];

  // Sort messages by created_at
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [messages]);

  // Scroll to bottom on initial load and new messages
  useEffect(() => {
    if (sortedMessages.length > 0 && isInitialLoad.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
      isInitialLoad.current = false;
    }
  }, [sortedMessages.length]);

  // Scroll to bottom when sending a message
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Mark messages as read when viewing
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      markAsRead.mutate(conversationId);
    }
  }, [conversationId, messages.length]);

  const handleSend = (message: string, attachment?: { url: string; type: string; name: string }) => {
    sendMessage.mutate(
      { conversationId, message, attachment },
      {
        onSuccess: () => {
          setTimeout(scrollToBottom, 100);
        },
      }
    );
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    // Load more when scrolled near top
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
            // For client messages, use client info to override stored data
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
        
        <div ref={bottomRef} />
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
