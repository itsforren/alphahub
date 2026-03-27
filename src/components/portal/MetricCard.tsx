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
      'rounded-xl border border-border/50 bg-card p-4',
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{displayLabel}</p>
          <p className="text-xl font-bold text-foreground">{formatValue(value)}</p>
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
      {trend && (
        <div className={cn(
          'mt-2 text-xs font-medium',
          trend === 'up' && 'text-green-600',
          trend === 'down' && 'text-red-600',
          trend === 'neutral' && 'text-muted-foreground'
        )}>
          {trend === 'up' && '↑ Trending up'}
          {trend === 'down' && '↓ Trending down'}
          {trend === 'neutral' && '→ Stable'}
        </div>
      )}
    </div>
  );
}

export default MetricCard;
