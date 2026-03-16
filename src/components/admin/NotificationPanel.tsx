import { useNotifications, useAcknowledgeNotification, useAcknowledgeAll } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Check, CheckCheck, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const severityStyles: Record<string, { dot: string; bg: string; border: string }> = {
  critical: { dot: 'bg-red-500', bg: 'bg-red-500/5', border: 'border-red-500/20' },
  warning: { dot: 'bg-yellow-500', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20' },
  info: { dot: 'bg-blue-500', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
};

interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { user } = useAuth();
  const { data: notifications, isLoading } = useNotifications();
  const acknowledgeMutation = useAcknowledgeNotification();
  const acknowledgeAllMutation = useAcknowledgeAll();

  const handleAcknowledge = (alertId: string) => {
    if (!user) return;
    acknowledgeMutation.mutate({ alertId, userId: user.id });
  };

  const handleAcknowledgeAll = () => {
    if (!user) return;
    acknowledgeAllMutation.mutate({ userId: user.id });
  };

  const getStyles = (severity: string) => {
    return severityStyles[severity] || severityStyles.info;
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-lg shadow-lg z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Notifications</h3>
        {notifications && notifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleAcknowledgeAll}
            disabled={acknowledgeAllMutation.isPending}
          >
            {acknowledgeAllMutation.isPending ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <CheckCheck className="w-3 h-3 mr-1" />
            )}
            Mark all read
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Check className="w-8 h-8 mb-2 text-green-500" />
            <p className="text-sm">No unread notifications</p>
          </div>
        ) : (
          <div className="py-1">
            {notifications.map((notification) => {
              const styles = getStyles(notification.severity);
              return (
                <button
                  key={notification.id}
                  onClick={() => handleAcknowledge(notification.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 ${styles.bg}`}
                  title="Click to acknowledge"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${styles.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
