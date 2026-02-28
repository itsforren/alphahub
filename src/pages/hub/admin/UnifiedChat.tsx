import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Users, Ticket } from 'lucide-react';
import { useUnreadCount } from '@/hooks/useChat';
import { useTicketMetrics } from '@/hooks/useTicketDashboard';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const ChatInboxContent = lazy(() => import('@/pages/portal/admin/ChatInbox'));
const TeamChatContent = lazy(() => import('./TeamChat'));
const TicketDashboardContent = lazy(() => import('./TicketDashboard'));

const LoadingFallback = () => (
  <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

export default function UnifiedChat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'inbox';
  const { data: unreadCount = 0 } = useUnreadCount(true);
  const { data: ticketMetrics } = useTicketMetrics();
  
  const openTicketCount = (ticketMetrics?.open || 0) + (ticketMetrics?.in_progress || 0);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen flex flex-col">
      {/* Tabs Header */}
      <div className="p-4 border-b border-border/50 bg-card/50">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="inbox" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              Client Inbox
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 rounded-full h-5 px-1.5 text-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="w-4 h-4" />
              Team Chat
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-2">
              <Ticket className="w-4 h-4" />
              Tickets
              {openTicketCount > 0 && (
                <Badge variant="secondary" className="ml-1 rounded-full h-5 px-1.5 text-xs">
                  {openTicketCount > 99 ? '99+' : openTicketCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content - Full Height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'inbox' ? (
          <Suspense fallback={<LoadingFallback />}>
            <ChatInboxContent />
          </Suspense>
        ) : activeTab === 'team' ? (
          <Suspense fallback={<LoadingFallback />}>
            <TeamChatContent />
          </Suspense>
        ) : (
          <Suspense fallback={<LoadingFallback />}>
            <TicketDashboardContent />
          </Suspense>
        )}
      </div>
    </div>
  );
}
