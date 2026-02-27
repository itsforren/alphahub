import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LiquidFillGaugeProps {
  value: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  greenThreshold?: number;
  redThreshold?: number;
}

export const LiquidFillGauge = memo(function LiquidFillGauge({
  value,
  label,
  size = 'md',
  greenThreshold = 90,
  redThreshold = 70,
}: LiquidFillGaugeProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  
  let color = 'hsl(var(--warning))';
  let bgColor = 'hsl(var(--warning) / 0.2)';
  if (value >= greenThreshold) {
    color = 'hsl(var(--success))';
    bgColor = 'hsl(var(--success) / 0.2)';
  } else if (value < redThreshold) {
    color = 'hsl(var(--destructive))';
    bgColor = 'hsl(var(--destructive) / 0.2)';
  }

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        className={cn(
          "relative rounded-full overflow-hidden border-2",
          sizeClasses[size]
        )}
        style={{ 
          borderColor: color,
          backgroundColor: bgColor,
        }}
      >
        {/* Liquid fill */}
        <motion.div
          className="absolute bottom-0 left-0 right-0"
          style={{ backgroundColor: color }}
          initial={{ height: '0%' }}
          animate={{ height: `${clampedValue}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        
        {/* Wave effect */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 opacity-60"
          style={{ 
            backgroundColor: color,
            height: '20%',
            borderRadius: '40% 40% 0 0',
          }}
          animate={{ 
            y: [0, -5, 0],
            scaleX: [1, 1.1, 1],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        
        {/* Value text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold text-foreground", textSizes[size])}>
            {Math.round(clampedValue)}%
          </span>
        </div>
      </div>
      
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
});
