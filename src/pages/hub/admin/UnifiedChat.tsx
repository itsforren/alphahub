import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Users, Ticket, Lightbulb } from 'lucide-react';
import { useUnreadCount } from '@/hooks/useChat';
import { useTicketMetrics } from '@/hooks/useTicketDashboard';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ChatInboxContent = lazy(() => import('@/pages/portal/admin/ChatInbox'));
const TeamChatContent = lazy(() => import('./TeamChat'));
const TicketDashboardContent = lazy(() => import('./TicketDashboard'));
const FeatureRequestsContent = lazy(() =>
  import('@/components/admin/FeatureRequestsKanban').then((m) => ({ default: m.FeatureRequestsKanban }))
);

const LoadingFallback = () => (
  <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const TABS = [
  { id: 'inbox', label: 'Client Inbox', icon: MessageCircle },
  { id: 'team', label: 'Team Chat', icon: Users },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'features', label: 'Feature Requests', icon: Lightbulb },
] as const;

export default function UnifiedChat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'inbox';
  const { data: unreadCount = 0 } = useUnreadCount(true);
  const { data: ticketMetrics } = useTicketMetrics();

  const openTicketCount = (ticketMetrics?.open || 0) + (ticketMetrics?.in_progress || 0);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const getBadge = (tabId: string) => {
    if (tabId === 'inbox' && unreadCount > 0) {
      return (
        <Badge variant="destructive" className="ml-1 rounded-full h-5 px-1.5 text-xs">
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      );
    }
    if (tabId === 'tickets' && openTicketCount > 0) {
      return (
        <Badge variant="secondary" className="ml-1 rounded-full h-5 px-1.5 text-xs">
          {openTicketCount > 99 ? '99+' : openTicketCount}
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen flex flex-col">
      {/* Tab Bar */}
      <div className="flex items-center border-b border-border/50 bg-card/50 px-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'text-foreground border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground',
            )}
          >
            <tab.icon className={cn('w-4 h-4', tab.id === 'features' && 'text-amber-400')} />
            {tab.label}
            {getBadge(tab.id)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'inbox' ? (
          <Suspense fallback={<LoadingFallback />}>
            <ChatInboxContent />
          </Suspense>
        ) : activeTab === 'team' ? (
          <Suspense fallback={<LoadingFallback />}>
            <TeamChatContent />
          </Suspense>
        ) : activeTab === 'tickets' ? (
          <Suspense fallback={<LoadingFallback />}>
            <TicketDashboardContent />
          </Suspense>
        ) : (
          <Suspense fallback={<LoadingFallback />}>
            <FeatureRequestsContent />
          </Suspense>
        )}
      </div>
    </div>
  );
}
