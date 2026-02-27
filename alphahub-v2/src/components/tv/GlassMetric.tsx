import { memo, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from './GlassCard';
import { AnimatedNumber } from './AnimatedNumber';

type MetricVariant = 'default' | 'gold' | 'success' | 'danger' | 'warning';

interface GlassMetricProps {
  title: string;
  value: number;
  subtitle?: string;
  icon?: LucideIcon;
  format?: 'currency' | 'percent' | 'number' | 'compact';
  variant?: MetricVariant;
  prefix?: string;
  suffix?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  pulse?: boolean;
  glow?: boolean;
}

const iconColors: Record<MetricVariant, string> = {
  default: 'text-primary',
  gold: 'text-yellow-400',
  success: 'text-green-400',
  danger: 'text-red-400',
  warning: 'text-amber-400',
};

const iconBgColors: Record<MetricVariant, string> = {
  default: 'bg-primary/20',
  gold: 'bg-yellow-500/20',
  success: 'bg-green-500/20',
  danger: 'bg-red-500/20',
  warning: 'bg-amber-500/20',
};

export const GlassMetric = memo(function GlassMetric({
  title,
  value,
  subtitle,
  icon: Icon,
  format = 'number',
  variant = 'default',
  prefix,
  suffix,
  trend,
  className,
  pulse = false,
  glow = false,
}: GlassMetricProps) {
  return (
    <GlassCard 
      variant={variant} 
      pulse={pulse} 
      glow={glow}
      className={cn('p-6', className)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider truncate">
            {title}
          </p>
          <div className="mt-2">
            <AnimatedNumber
              value={value}
              format={format}
              prefix={prefix}
              suffix={suffix}
              className={cn(
                'text-4xl font-bold neon-text',
                variant === 'gold' && 'neon-text-gold',
                variant === 'success' && 'neon-text-green',
                variant === 'danger' && 'neon-text-red',
                variant === 'warning' && 'neon-text-amber'
              )}
            />
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-sm font-medium',
              trend.isPositive ? 'text-green-400' : 'text-red-400'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value).toFixed(1)}%</span>
              <span className="text-muted-foreground/70 font-normal">vs prior</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('p-3 rounded-xl', iconBgColors[variant])}>
            <Icon className={cn('w-6 h-6', iconColors[variant])} />
          </div>
        )}
      </div>
    </GlassCard>
  );
});

export default GlassMetric;
