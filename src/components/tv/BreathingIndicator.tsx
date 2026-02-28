import { memo } from 'react';
import { cn } from '@/lib/utils';

type IndicatorStatus = 'active' | 'inactive' | 'warning' | 'danger';

interface BreathingIndicatorProps {
  label: string;
  status: IndicatorStatus;
  value?: string;
  className?: string;
}

const statusConfig: Record<IndicatorStatus, { color: string; bg: string; text: string }> = {
  active: {
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    text: 'ON',
  },
  inactive: {
    color: 'text-muted-foreground',
    bg: 'bg-muted/20',
    text: 'OFF',
  },
  warning: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    text: 'WARNING',
  },
  danger: {
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    text: 'ALERT',
  },
};

export const BreathingIndicator = memo(function BreathingIndicator({
  label,
  status,
  value,
  className,
}: BreathingIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className={cn(
      'glass-card flex items-center gap-3 px-4 py-3',
      status !== 'inactive' && 'pulse-breathing',
      config.bg,
      className
    )}>
      <div className={cn(
        'w-3 h-3 rounded-full',
        config.color,
        status === 'active' && 'bg-green-400',
        status === 'inactive' && 'bg-muted-foreground',
        status === 'warning' && 'bg-amber-400',
        status === 'danger' && 'bg-red-400'
      )} />
      <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        {label}:
      </span>
      <span className={cn('text-sm font-bold uppercase', config.color)}>
        {value || config.text}
      </span>
    </div>
  );
});

export default BreathingIndicator;
