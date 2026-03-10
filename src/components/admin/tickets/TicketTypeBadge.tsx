import { Bug, Sparkles, ArrowUpCircle, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TicketTypeBadgeProps {
  type: string;
  className?: string;
}

const TYPE_CONFIG: Record<string, { label: string; className: string; icon?: React.ReactNode }> = {
  client_support: {
    label: 'Client Support',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  internal: {
    label: 'Internal',
    className: 'bg-muted text-muted-foreground border-border',
  },
  bug_report: {
    label: 'Bug Report',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: <Bug className="w-3 h-3" />,
  },
  feature_request: {
    label: 'Feature Request',
    className: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    icon: <Sparkles className="w-3 h-3" />,
  },
  update: {
    label: 'Update',
    className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    icon: <ArrowUpCircle className="w-3 h-3" />,
  },
  system_change: {
    label: 'System Change',
    className: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    icon: <Settings className="w-3 h-3" />,
  },
};

export function TicketTypeBadge({ type, className }: TicketTypeBadgeProps) {
  const config = TYPE_CONFIG[type] ?? {
    label: type,
    className: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <Badge
      variant="outline"
      className={cn('gap-1', config.className, className)}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}
