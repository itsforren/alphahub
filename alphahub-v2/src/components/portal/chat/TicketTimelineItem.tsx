import { format, isToday, isYesterday, isSameYear } from 'date-fns';
import { Ticket, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { SupportTicket } from '@/hooks/useClientData';
import { cn } from '@/lib/utils';

// Helper function for smart date formatting
const formatTicketDate = (date: Date) => {
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return `Yesterday at ${format(date, 'h:mm a')}`;
  if (isSameYear(date, new Date())) return format(date, 'MMM d') + ' at ' + format(date, 'h:mm a');
  return format(date, 'MMM d, yyyy') + ' at ' + format(date, 'h:mm a');
};

interface TicketTimelineItemProps {
  ticket: SupportTicket;
  isOwnTicket?: boolean;
}

export function TicketTimelineItem({ ticket, isOwnTicket = false }: TicketTimelineItemProps) {
  const statusConfig = {
    open: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    waiting: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    resolved: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  };

  const config = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.open;
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        'flex gap-3 group',
        isOwnTicket ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
        config.bg
      )}>
        <Ticket className={cn('w-4 h-4', config.color)} />
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex flex-col max-w-[70%]',
          isOwnTicket ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2 mb-1',
            isOwnTicket ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span className="text-xs font-medium text-foreground">
            Support Ticket
          </span>
          <Badge variant="outline" className={cn('text-[10px]', config.border, config.color)}>
            {ticket.status}
          </Badge>
        </div>

        {/* Ticket card */}
        <div
          className={cn(
            'px-4 py-3 rounded-2xl border',
            config.bg,
            config.border,
            isOwnTicket ? 'rounded-tr-md' : 'rounded-tl-md'
          )}
        >
          <div className="flex items-start gap-2 mb-2">
            <StatusIcon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.color)} />
            <div>
              <p className="text-sm font-medium">{ticket.subject}</p>
              <Badge variant="secondary" className="text-[10px] mt-1 capitalize">
                {ticket.category}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{ticket.message}</p>
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground mt-1">
          {formatTicketDate(new Date(ticket.created_at))}
        </span>
      </div>
    </div>
  );
}
