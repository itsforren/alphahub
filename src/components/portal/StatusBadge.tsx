import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type StatusType = 'active' | 'inactive' | 'paused' | 'onboarding' | 'pending reactivation' | 'live' | 'pending' | 'cancelled' | string;

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md';
  className?: string;
  editable?: boolean;
  onStatusChange?: (newStatus: string) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: {
    label: 'ACTIVE',
    className: 'bg-green-600 text-white border-green-700',
  },
  live: {
    label: 'ACTIVE',
    className: 'bg-green-600 text-white border-green-700',
  },
  inactive: {
    label: 'INACTIVE',
    className: 'bg-amber-500 text-white border-amber-600',
  },
  onboarding: {
    label: 'ONBOARDING',
    className: 'bg-blue-600 text-white border-blue-700',
  },
  paused: {
    label: 'PAUSED',
    className: 'bg-slate-500 text-white border-slate-600',
  },
  'pending reactivation': {
    label: 'PENDING REACTIVATION',
    className: 'bg-slate-400 text-slate-800 border-slate-500',
  },
  pending: {
    label: 'PENDING',
    className: 'bg-amber-500 text-white border-amber-600',
  },
  cancelled: {
    label: 'CANCELLED',
    className: 'bg-red-600 text-white border-red-700',
  },
  // Ticket statuses (keeping for support page)
  open: {
    label: 'OPEN',
    className: 'bg-blue-600 text-white border-blue-700',
  },
  waiting: {
    label: 'WAITING',
    className: 'bg-amber-500 text-white border-amber-600',
  },
  resolved: {
    label: 'RESOLVED',
    className: 'bg-slate-500 text-white border-slate-600',
  },
};

const editableStatuses = ['active', 'inactive', 'paused', 'onboarding', 'pending reactivation', 'cancelled'];

export default function StatusBadge({ status, size = 'md', className, editable = false, onStatusChange }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const config = statusConfig[normalizedStatus] || {
    label: status.toUpperCase(),
    className: 'bg-gray-500 text-white border-gray-600',
  };

  const stop = (e: any) => {
    e.stopPropagation?.();
  };

  const badgeContent = (
    <span
      onPointerDown={editable ? stop : undefined}
      onClick={editable ? stop : undefined}
      className={cn(
        'inline-flex items-center rounded border font-semibold uppercase tracking-wide',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        config.className,
        editable && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
    >
      {config.label}
    </span>
  );

  if (!editable || !onStatusChange) {
    return badgeContent;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {badgeContent}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {editableStatuses.map((statusOption) => {
          const statusConf = statusConfig[statusOption];
          return (
            <DropdownMenuItem
              key={statusOption}
              onClick={(e) => {
                stop(e);
                onStatusChange(statusOption);
              }}
              className={cn('cursor-pointer', normalizedStatus === statusOption && 'bg-accent')}
            >
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold uppercase mr-2',
                  statusConf.className
                )}
              >
                {statusConf.label}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
