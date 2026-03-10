import {
  ArrowRightLeft,
  UserCheck,
  Flag,
  Tag,
  Paperclip,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ActivityEntry {
  id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  metadata: any;
  created_at: string;
  user?: { name: string; avatar_url: string | null };
}

interface ActivityTimelineProps {
  activities: ActivityEntry[];
  className?: string;
}

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; format: (old_val: string | null, new_val: string | null) => string }> = {
  status_change: {
    icon: <ArrowRightLeft className="w-4 h-4" />,
    format: (old_val, new_val) => `changed status from ${old_val ?? 'none'} to ${new_val ?? 'none'}`,
  },
  reassigned: {
    icon: <UserCheck className="w-4 h-4" />,
    format: (_old_val, new_val) => (new_val ? `assigned to ${new_val}` : 'unassigned'),
  },
  priority_change: {
    icon: <Flag className="w-4 h-4" />,
    format: (old_val, new_val) => `changed priority from ${old_val ?? 'none'} to ${new_val ?? 'none'}`,
  },
  label_added: {
    icon: <Tag className="w-4 h-4" />,
    format: (_old_val, new_val) => `added label ${new_val ?? ''}`,
  },
  label_removed: {
    icon: <Tag className="w-4 h-4" />,
    format: (old_val) => `removed label ${old_val ?? ''}`,
  },
  attachment_added: {
    icon: <Paperclip className="w-4 h-4" />,
    format: () => 'added attachment',
  },
};

export function ActivityTimeline({ activities, className }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        No activity yet.
      </p>
    );
  }

  return (
    <div className={cn('space-y-0', className)}>
      {activities.map((entry, i) => {
        const config = ACTION_CONFIG[entry.action];
        const icon = config?.icon ?? <Activity className="w-4 h-4" />;
        const description = config
          ? config.format(entry.old_value, entry.new_value)
          : entry.action;
        const isLast = i === activities.length - 1;

        return (
          <div key={entry.id} className="relative flex gap-3 pb-6">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[15px] top-8 h-[calc(100%-20px)] w-px bg-border" />
            )}

            {/* Icon circle */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
              {icon}
            </div>

            {/* Content */}
            <div className="flex-1 pt-0.5">
              <p className="text-sm">
                {entry.user && (
                  <span className="inline-flex items-center gap-1 mr-1">
                    <Avatar className="inline-flex h-4 w-4">
                      <AvatarImage src={entry.user.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[8px]">
                        {entry.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{entry.user.name}</span>
                  </span>
                )}
                <span className="text-muted-foreground">{description}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
