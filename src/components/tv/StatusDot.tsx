import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface StatusDotProps {
  status: 'green' | 'yellow' | 'red';
  label: string;
  message?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusDot = memo(function StatusDot({
  status,
  label,
  message,
  size = 'md',
}: StatusDotProps) {
  const statusConfig = {
    green: {
      color: 'hsl(var(--success))',
      bgColor: 'hsl(var(--success) / 0.2)',
      icon: CheckCircle2,
      text: 'OK',
    },
    yellow: {
      color: 'hsl(var(--warning))',
      bgColor: 'hsl(var(--warning) / 0.2)',
      icon: AlertTriangle,
      text: 'Warning',
    },
    red: {
      color: 'hsl(var(--destructive))',
      bgColor: 'hsl(var(--destructive) / 0.2)',
      icon: XCircle,
      text: 'Error',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="relative">
          {/* Pulsing ring for non-green status */}
          {status !== 'green' && (
            <motion.div
              className={cn("absolute inset-0 rounded-full", sizeClasses[size])}
              style={{ backgroundColor: config.color }}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
          
          {/* Main dot */}
          <motion.div
            className={cn("rounded-full relative z-10", sizeClasses[size])}
            style={{ backgroundColor: config.color }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          />
        </div>
        
        <Icon className={cn(iconSizes[size])} style={{ color: config.color }} />
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{label}</span>
            <span 
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: config.bgColor,
                color: config.color,
              }}
            >
              {config.text}
            </span>
          </div>
          {message && (
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});
