import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Hash,
  Plus,
  Send,
  Users,
  Loader2,
  Search,
  FileText,
  Download,
  ImageOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ClickableText } from '@/components/ui/clickable-text';
import { ChatInput } from '@/components/portal/chat/ChatInput';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import {
  useAdminUsers,
  useAdminDMConversations,
  useGetOrCreateDMConversation,
  useAdminDMMessages,
  useSendAdminDM,
  useAdminChannels,
  useCreateChannel,
  useAdminChannelMessages,
  useSendChannelMessage,
  useAdminDMRealtime,
  useAdminChannelRealtime,
  type AdminProfile,
  type AdminDMConversation,
  type AdminChannel,
} from '@/hooks/useAdminChat';
import { CreateChannelDialog } from '@/components/admin-chat/CreateChannelDialog';

type ChatType = 'dm' | 'channel';
type SelectedChat = { type: ChatType; id: string } | null;

export default function TeamChat() {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<SelectedChat>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: adminUsers = [], isLoading: loadingUsers } = useAdminUsers();
  const { data: dmConversations = [] } = useAdminDMConversations();
  const { data: channels = [] } = useAdminChannels();
  const getOrCreateDM = useGetOrCreateDMConversation();
  const createChannel = useCreateChannel();

  const { data: dmMessages = [] } = useAdminDMMessages(
    selectedChat?.type === 'dm' ? selectedChat.id : undefined
  );
  const { data: channelMessages = [] } = useAdminChannelMessages(
    selectedChat?.type === 'channel' ? selectedChat.id : undefined
  );
  const sendDM = useSendAdminDM();
  const sendChannelMessage = useSendChannelMessage();

  // Set up realtime subscriptions
  useAdminDMRealtime(selectedChat?.type === 'dm' ? selectedChat.id : undefined);
  useAdminChannelRealtime(selectedChat?.type === 'channel' ? selectedChat.id : undefined);

  const messages = selectedChat?.type === 'dm' ? dmMessages : channelMessages;

  // Snap to bottom BEFORE paint so user never sees the top
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && messages.length > 0) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Filter admins not in existing conversations for new DM
  const otherAdmins = adminUsers.filter(a => a.id !== user?.id);
  const filteredAdmins = searchQuery 
    ? otherAdmins.filter(a => 
        a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : otherAdmins;

  const handleStartDM = async (adminId: string) => {
    try {
      const conversationId = await getOrCreateDM.mutateAsync(adminId);
      setSelectedChat({ type: 'dm', id: conversationId });
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to start DM:', error);
    }
  };

  const handleSelectDM = (conversation: AdminDMConversation) => {
    setSelectedChat({ type: 'dm', id: conversation.id });
  };

  const handleSelectChannel = (channel: AdminChannel) => {
    setSelectedChat({ type: 'channel', id: channel.id });
  };

  const handleSendMessage = async (message: string, attachment?: { url: string; type: string; name: string }) => {
    if (!message.trim() && !attachment) return;
    if (!selectedChat) return;

    try {
      if (selectedChat.type === 'dm') {
        await sendDM.mutateAsync({ conversationId: selectedChat.id, message, attachment });
      } else {
        await sendChannelMessage.mutateAsync({ channelId: selectedChat.id, message, attachment });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleCreateChannel = async (name: string, description: string, memberIds: string[]) => {
    try {
      const channelId = await createChannel.mutateAsync({ name, description, memberIds });
      setSelectedChat({ type: 'channel', id: channelId });
      setShowCreateChannel(false);
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  const getSelectedTitle = () => {
    if (!selectedChat) return 'Select a conversation';
    if (selectedChat.type === 'dm') {
      const conv = dmConversations.find(c => c.id === selectedChat.id);
      return conv?.other_participant?.name || conv?.other_participant?.email || 'Direct Message';
    }
    const channel = channels.find(c => c.id === selectedChat.id);
    return `# ${channel?.name || 'Channel'}`;
  };

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    if (email) return email[0].toUpperCase();
    return '?';
  };

  return (
    <div className="p-6 h-[calc(100vh-4rem)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full bg-card rounded-xl border border-border overflow-hidden flex"
      >
        {/* Sidebar */}
        <div className="w-72 border-r border-border flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Team Chat
            </h2>
          </div>

          {/* Search / New DM */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search or start new DM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchQuery && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground px-2">Start conversation with:</p>
                {filteredAdmins.map(admin => (
                  <button
                    key={admin.id}
                    onClick={() => handleStartDM(admin.id)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={admin.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(admin.name, admin.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-sm font-medium truncate">{admin.name || admin.email}</p>
                      {admin.name && (
                        <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                      )}
                    </div>
                  </button>
                ))}
                {filteredAdmins.length === 0 && (
                  <p className="text-sm text-muted-foreground px-2">No admins found</p>
                )}
              </div>
            )}
          </div>

          <ScrollArea className="flex-1">
            {/* Channels Section */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Channels
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowCreateChannel(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {channels.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => handleSelectChannel(channel)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                      selectedChat?.type === 'channel' && selectedChat.id === channel.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <Hash className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate text-sm">{channel.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {channel.member_count}
                    </span>
                  </button>
                ))}
                {channels.length === 0 && (
                  <p className="text-sm text-muted-foreground px-3 py-2">No channels yet</p>
                )}
              </div>
            </div>

            {/* Direct Messages Section */}
            <div className="p-3 pt-0">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Direct Messages
              </h3>
              <div className="space-y-1">
                {dmConversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectDM(conv)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                      selectedChat?.type === 'dm' && selectedChat.id === conv.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={conv.other_participant?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(conv.other_participant?.name, conv.other_participant?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conv.other_participant?.name || conv.other_participant?.email}
                      </p>
                      {conv.last_message_preview && (
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.last_message_preview}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
                {dmConversations.length === 0 && (
                  <p className="text-sm text-muted-foreground px-3 py-2">
                    No conversations yet
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">{getSelectedTitle()}</h3>
            {selectedChat?.type === 'channel' && (
              <Button variant="ghost" size="sm">
                <Users className="w-4 h-4 mr-2" />
                Members
              </Button>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 min-h-0">
            {!selectedChat ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation or start a new one</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  const sender = 'sender' in msg ? msg.sender : undefined;
                  const hasAttachment = 'attachment_url' in msg && msg.attachment_url;
                  const isImage = 'attachment_type' in msg && msg.attachment_type === 'image';

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3",
                        isOwn && "flex-row-reverse"
                      )}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={sender?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(sender?.name, sender?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn("max-w-[70%]", isOwn && "text-right")}>
                        <div className="flex items-center gap-2 mb-1">
                          {!isOwn && (
                            <span className="text-sm font-medium">
                              {sender?.name || sender?.email}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), 'h:mm a')}
                          </span>
                        </div>
                        {msg.message && !msg.message.startsWith('Sent ') && (
                          <div
                            className={cn(
                              "rounded-lg px-4 py-2 inline-block text-left",
                              isOwn
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}
                          >
                            <ClickableText text={msg.message} className="text-sm" />
                          </div>
                        )}
                        {hasAttachment && (
                          <div className={cn("mt-1", isOwn && "flex justify-end")}>
                            {isImage ? (
                              <a
                                href={(msg as any).attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={(msg as any).attachment_url}
                                  alt={(msg as any).attachment_name || 'Image'}
                                  className="max-w-[320px] max-h-[240px] object-cover rounded-lg border border-border/50 hover:border-border transition-colors"
                                />
                              </a>
                            ) : (
                              <a
                                href={(msg as any).attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted transition-colors max-w-[280px]"
                              >
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <FileText className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {(msg as any).attachment_name || 'File'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">Click to download</p>
                                </div>
                                <Download className="w-4 h-4 text-muted-foreground" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Message Input */}
          {selectedChat && (
            <div className="flex-shrink-0 border-t border-border">
              <ChatInput
                onSend={handleSendMessage}
                disabled={sendDM.isPending || sendChannelMessage.isPending}
                placeholder="Type a message..."
              />
            </div>
          )}
        </div>
      </motion.div>

      <CreateChannelDialog
        open={showCreateChannel}
        onOpenChange={setShowCreateChannel}
        onSubmit={handleCreateChannel}
        adminUsers={otherAdmins}
        isLoading={createChannel.isPending}
      />
    </div>
  );
}
