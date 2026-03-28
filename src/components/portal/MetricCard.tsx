import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label?: string;
  title?: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  format?: 'number' | 'currency' | 'percent';
  className?: string;
}

export function MetricCard({ label, title, value, icon: Icon, trend, format, className }: MetricCardProps) {
  const displayLabel = label || title || '';

  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(val);
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'number':
      default:
        return val.toLocaleString();
    }
  };

  return (
    <div className={cn(
      'glass-panel-premium p-5 group transition-all duration-300 hover:border-white/[0.1] cursor-default',
      className
    )}>
      {/* Subtle corner glow */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-primary/[0.03] rounded-full blur-3xl -translate-x-10 -translate-y-10 group-hover:bg-primary/[0.08] transition-colors duration-700" />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">{displayLabel}</p>
          <p className="text-2xl font-semibold text-luxury tracking-tight">{formatValue(value)}</p>
        </div>
        {Icon && (
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] group-hover:border-primary/25 group-hover:bg-primary/[0.06] group-hover:shadow-[0_0_20px_rgba(34,197,94,0.08)] transition-all duration-500">
            <Icon className="w-4 h-4 text-white/30 group-hover:text-primary/80 transition-colors duration-500" />
          </div>
        )}
      </div>
      {trend && (
        <div className={cn(
          'mt-3 text-xs font-medium flex items-center gap-1.5',
          trend === 'up' && 'text-emerald-400',
          trend === 'down' && 'text-red-400',
          trend === 'neutral' && 'text-white/35'
        )}>
          {trend === 'up' && (
            <>
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              Trending up
            </>
          )}
          {trend === 'down' && (
            <>
              <span className="w-1 h-1 rounded-full bg-red-400" />
              Trending down
            </>
          )}
          {trend === 'neutral' && (
            <>
              <span className="w-1 h-1 rounded-full bg-white/35" />
              Stable
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default MetricCard;
