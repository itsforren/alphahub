import { useState, useEffect } from 'react';
import { MessageCircle, X, Minus, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useClientConversation, useUnreadCount } from '@/hooks/useChat';
import { useClient } from '@/hooks/useClientData';
import { ChatPanel } from './ChatPanel';

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('chat-bubble-open');
    return saved === 'true';
  });
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: client } = useClient();
  
  const { data: conversation } = useClientConversation(client?.id);
  const { data: unreadCount = 0 } = useUnreadCount(role === 'admin');
  
  // Don't show bubble for admins (they use the inbox)
  if (role === 'admin') return null;

  useEffect(() => {
    localStorage.setItem('chat-bubble-open', String(isOpen));
  }, [isOpen]);

  const handleExpand = () => {
    setIsOpen(false);
    navigate('/hub/chat');
  };

  return (
    <>
      {/* Chat window - Intercom style */}
      <AnimatePresence>
        {isOpen && conversation && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 w-[380px] h-[550px] bg-card rounded-2xl shadow-2xl border border-border/30 flex flex-col z-50 overflow-hidden"
            style={{ 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 12px 24px -8px rgba(0, 0, 0, 0.15)'
            }}
          >
            {/* Intercom-style Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Support Team</h3>
                  <p className="text-xs text-white/70">We typically reply within minutes</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleExpand}
                  className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                  title="Expand"
                >
                  <Maximize2 className="w-4 h-4 text-white/80" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                  title="Minimize"
                >
                  <Minus className="w-4 h-4 text-white/80" />
                </button>
              </div>
            </div>
            
            <ChatPanel 
              conversationId={conversation.id} 
              className="flex-1"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating bubble button - Intercom style */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-full shadow-xl flex items-center justify-center z-50 transition-all"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{ 
          boxShadow: '0 8px 32px rgba(var(--primary), 0.4), 0 4px 16px rgba(0, 0, 0, 0.2)'
        }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-7 h-7 text-primary-foreground" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <MessageCircle className="w-7 h-7 text-primary-foreground" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 min-w-[22px] h-[22px] bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center px-1"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
