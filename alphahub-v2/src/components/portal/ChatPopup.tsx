import { useState, useEffect } from 'react';
import { X, MessageCircle, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatPanel } from './chat/ChatPanel';
import { useClientConversation } from '@/hooks/useChat';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatPopupProps {
  clientId: string;
  clientName?: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function ChatPopup({ clientId, clientName, isOpen, onClose, className }: ChatPopupProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const { data: conversation } = useClientConversation(clientId);

  // Reset minimized state when opened
  useEffect(() => {
    if (isOpen) {
      setIsMinimized(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed bottom-4 right-4 z-50",
            "w-[400px] max-w-[calc(100vw-2rem)]",
            isMinimized ? "h-auto" : "h-[600px] max-h-[calc(100vh-2rem)]",
            "bg-card rounded-2xl border border-border",
            "shadow-2xl shadow-black/20",
            "overflow-hidden",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Chat with {clientName || 'Client'}</h3>
                <p className="text-xs text-muted-foreground">Send a message</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && conversation?.id && (
            <div className="h-[calc(100%-65px)]">
              <ChatPanel conversationId={conversation.id} className="h-full" />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Chat Bubble Button for header
interface ChatBubbleButtonProps {
  onClick: () => void;
  unreadCount?: number;
  className?: string;
}

export function ChatBubbleButton({ onClick, unreadCount, className }: ChatBubbleButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("relative h-9 w-9", className)}
      onClick={onClick}
    >
      <MessageCircle className="w-5 h-5" />
      {unreadCount !== undefined && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  );
}
