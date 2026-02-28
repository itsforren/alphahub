import { X, ExternalLink, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SupportTicket } from '@/hooks/useClientData';

interface OpenTicketBannerProps {
  tickets: SupportTicket[];
  onViewTicket?: (ticketId: string) => void;
  onDismiss?: (ticketId: string) => void;
}

export function OpenTicketBanner({ tickets, onViewTicket, onDismiss }: OpenTicketBannerProps) {
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'waiting');
  
  if (openTickets.length === 0) return null;

  return (
    <div className="border-b border-border/50 bg-amber-500/5">
      {openTickets.map((ticket) => (
        <div 
          key={ticket.id}
          className="flex items-center gap-3 px-4 py-2.5 border-b border-amber-500/10 last:border-b-0"
        >
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{ticket.subject}</span>
              <Badge 
                variant="outline" 
                className={`text-[10px] ${
                  ticket.status === 'waiting' 
                    ? 'border-blue-500/50 text-blue-500' 
                    : 'border-amber-500/50 text-amber-500'
                }`}
              >
                {ticket.status}
              </Badge>
              <Badge variant="outline" className="text-[10px] capitalize">
                {ticket.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Created {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {onViewTicket && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewTicket(ticket.id)}
                className="h-7 w-7"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDismiss(ticket.id)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
