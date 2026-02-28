import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CircularProgressProps {
  value: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  greenThreshold?: number;
  redThreshold?: number;
  showLabel?: boolean;
}

export const CircularProgress = memo(function CircularProgress({
  value,
  label,
  size = 'md',
  greenThreshold = 70,
  redThreshold = 30,
  showLabel = true,
}: CircularProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  
  let color = 'hsl(var(--warning))';
  if (value >= greenThreshold) {
    color = 'hsl(var(--success))';
  } else if (value < redThreshold) {
    color = 'hsl(var(--destructive))';
  }

  const sizeConfig = {
    sm: { size: 80, stroke: 6, textSize: 'text-lg' },
    md: { size: 120, stroke: 8, textSize: 'text-2xl' },
    lg: { size: 160, stroke: 10, textSize: 'text-4xl' },
  };

  const config = sizeConfig[size];
  const radius = (config.size - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        className="relative"
        style={{ width: config.size, height: config.size }}
      >
        {/* Background circle */}
        <svg
          className="absolute inset-0 transform -rotate-90"
          width={config.size}
          height={config.size}
        >
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted) / 0.3)"
            strokeWidth={config.stroke}
          />
        </svg>
        
        {/* Progress circle */}
        <svg
          className="absolute inset-0 transform -rotate-90"
          width={config.size}
          height={config.size}
        >
          <motion.circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 6px ${color})`,
            }}
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold text-foreground", config.textSize)}>
            {Math.round(clampedValue)}%
          </span>
        </div>
      </div>
      
      {showLabel && (
        <span className="text-xs text-muted-foreground text-center">{label}</span>
      )}
    </div>
  );
});
