import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  isLoading?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  trend,
  trendValue,
  isLoading,
  variant = 'default'
}: MetricCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-4 pb-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32" />
          {subtitle && <Skeleton className="h-3 w-20 mt-1" />}
        </CardContent>
      </Card>
    );
  }

  const variantStyles = {
    default: 'border-border',
    primary: 'border-primary/30 bg-primary/5',
    success: 'border-success/30 bg-success/5',
    warning: 'border-alert/30 bg-alert/5',
  };

  return (
    <Card className={cn("bg-card transition-colors", variantStyles[variant])}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && trendValue && (
              <p className={cn(
                "text-xs font-medium",
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                trend === 'neutral' && 'text-muted-foreground'
              )}>
                {trend === 'up' && '↑'} 
                {trend === 'down' && '↓'} 
                {trendValue}
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn(
              "p-2 rounded-lg",
              variant === 'primary' && 'bg-primary/10 text-primary',
              variant === 'success' && 'bg-success/10 text-success',
              variant === 'warning' && 'bg-alert/10 text-alert',
              variant === 'default' && 'bg-muted text-muted-foreground'
            )}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricCardGroupProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
}

export function MetricCardGroup({ children, columns = 4 }: MetricCardGroupProps) {
  const colClasses = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-5',
  };

  return (
    <div className={cn("grid gap-4", colClasses[columns])}>
      {children}
    </div>
  );
}
