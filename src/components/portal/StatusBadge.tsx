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

const statusConfig: Record<string, { label: string; dotColor: string; bgColor: string; textColor: string; borderColor: string }> = {
  active: {
    label: 'ACTIVE',
    dotColor: 'bg-emerald-400',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
  },
  live: {
    label: 'ACTIVE',
    dotColor: 'bg-emerald-400',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
  },
  inactive: {
    label: 'INACTIVE',
    dotColor: 'bg-amber-400',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/20',
  },
  onboarding: {
    label: 'ONBOARDING',
    dotColor: 'bg-blue-400',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/20',
  },
  paused: {
    label: 'PAUSED',
    dotColor: 'bg-white/30',
    bgColor: 'bg-white/[0.04]',
    textColor: 'text-white/50',
    borderColor: 'border-white/[0.08]',
  },
  'pending reactivation': {
    label: 'PENDING',
    dotColor: 'bg-white/25',
    bgColor: 'bg-white/[0.03]',
    textColor: 'text-white/40',
    borderColor: 'border-white/[0.06]',
  },
  pending: {
    label: 'PENDING',
    dotColor: 'bg-amber-400',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/20',
  },
  cancelled: {
    label: 'CANCELLED',
    dotColor: 'bg-red-400',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/20',
  },
  open: {
    label: 'OPEN',
    dotColor: 'bg-blue-400',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/20',
  },
  waiting: {
    label: 'WAITING',
    dotColor: 'bg-amber-400',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/20',
  },
  resolved: {
    label: 'RESOLVED',
    dotColor: 'bg-white/30',
    bgColor: 'bg-white/[0.04]',
    textColor: 'text-white/50',
    borderColor: 'border-white/[0.08]',
  },
};

const editableStatuses = ['active', 'inactive', 'paused', 'onboarding', 'pending reactivation', 'cancelled'];

export default function StatusBadge({ status, size = 'md', className, editable = false, onStatusChange }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const config = statusConfig[normalizedStatus] || {
    label: status.toUpperCase(),
    dotColor: 'bg-white/30',
    bgColor: 'bg-white/[0.04]',
    textColor: 'text-white/50',
    borderColor: 'border-white/[0.08]',
  };

  const stop = (e: any) => {
    e.stopPropagation?.();
  };

  const badgeContent = (
    <span
      onPointerDown={editable ? stop : undefined}
      onClick={editable ? stop : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wider',
        size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]',
        config.bgColor,
        config.textColor,
        config.borderColor,
        editable && 'cursor-pointer hover:brightness-125 transition-all',
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
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
              className={cn('cursor-pointer', normalizedStatus === statusOption && 'bg-white/[0.06]')}
            >
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-semibold uppercase tracking-wider mr-2',
                  statusConf.bgColor,
                  statusConf.textColor,
                  statusConf.borderColor
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', statusConf.dotColor)} />
                {statusConf.label}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
