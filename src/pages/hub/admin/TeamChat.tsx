import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Hash, 
  Plus, 
  Send, 
  Users,
  Loader2,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ClickableText } from '@/components/ui/clickable-text';
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
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat) return;

    try {
      if (selectedChat.type === 'dm') {
        await sendDM.mutateAsync({ conversationId: selectedChat.id, message: messageInput });
      } else {
        await sendChannelMessage.mutateAsync({ channelId: selectedChat.id, message: messageInput });
      }
      setMessageInput('');
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
          <ScrollArea className="flex-1 p-4">
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
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Message Input */}
          {selectedChat && (
            <div className="p-4 border-t border-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  disabled={!messageInput.trim() || sendDM.isPending || sendChannelMessage.isPending}
                >
                  {(sendDM.isPending || sendChannelMessage.isPending) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
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
