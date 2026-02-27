import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CampaignStatusBadgeProps {
  status: 'green' | 'yellow' | 'red';
  safeMode?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function CampaignStatusBadge({
  status,
  safeMode = false,
  size = 'md',
  showIcon = true,
}: CampaignStatusBadgeProps) {
  if (safeMode) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "bg-destructive/20 text-destructive border-destructive/30 gap-1",
          size === 'sm' && 'text-xs px-1.5 py-0',
          size === 'lg' && 'text-sm px-3 py-1'
        )}
      >
        {showIcon && <Shield className={cn("h-3 w-3", size === 'lg' && 'h-4 w-4')} />}
        Safe Mode
      </Badge>
    );
  }

  const config = {
    green: {
      bg: 'bg-green-500/20',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-500/30',
      icon: CheckCircle,
      label: 'Green',
    },
    yellow: {
      bg: 'bg-yellow-500/20',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-500/30',
      icon: AlertTriangle,
      label: 'Yellow',
    },
    red: {
      bg: 'bg-red-500/20',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-500/30',
      icon: AlertCircle,
      label: 'Red',
    },
  };

  const { bg, text, border, icon: Icon, label } = config[status];

  return (
    <Badge 
      variant="outline" 
      className={cn(
        bg, text, border, "gap-1",
        size === 'sm' && 'text-xs px-1.5 py-0',
        size === 'lg' && 'text-sm px-3 py-1'
      )}
    >
      {showIcon && <Icon className={cn("h-3 w-3", size === 'lg' && 'h-4 w-4')} />}
      {label}
    </Badge>
  );
}
