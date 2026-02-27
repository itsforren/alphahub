import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BulletGraphProps {
  value: number;
  label: string;
  min?: number;
  max?: number;
  target?: number;
  greenRange?: [number, number];
  yellowRange?: [number, number];
}

export const BulletGraph = memo(function BulletGraph({
  value,
  label,
  min = -50,
  max = 50,
  target = 0,
  greenRange = [-10, 10],
  yellowRange = [-25, 25],
}: BulletGraphProps) {
  const range = max - min;
  const valuePercent = ((value - min) / range) * 100;
  const targetPercent = ((target - min) / range) * 100;
  const greenStart = ((greenRange[0] - min) / range) * 100;
  const greenWidth = ((greenRange[1] - greenRange[0]) / range) * 100;
  const yellowStart = ((yellowRange[0] - min) / range) * 100;
  const yellowWidth = ((yellowRange[1] - yellowRange[0]) / range) * 100;

  let valueColor = 'hsl(var(--destructive))';
  if (value >= greenRange[0] && value <= greenRange[1]) {
    valueColor = 'hsl(var(--success))';
  } else if (value >= yellowRange[0] && value <= yellowRange[1]) {
    valueColor = 'hsl(var(--warning))';
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-bold" style={{ color: valueColor }}>
          {value > 0 ? '+' : ''}{value.toFixed(1)}%
        </span>
      </div>
      
      <div className="relative h-6 bg-muted/20 rounded-full overflow-hidden">
        {/* Red background (entire bar) */}
        <div className="absolute inset-0 bg-destructive/20" />
        
        {/* Yellow zone */}
        <div 
          className="absolute top-0 bottom-0 bg-warning/30"
          style={{ 
            left: `${yellowStart}%`, 
            width: `${yellowWidth}%` 
          }}
        />
        
        {/* Green zone */}
        <div 
          className="absolute top-0 bottom-0 bg-success/40"
          style={{ 
            left: `${greenStart}%`, 
            width: `${greenWidth}%` 
          }}
        />
        
        {/* Target line */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/60"
          style={{ left: `${targetPercent}%` }}
        />
        
        {/* Value indicator */}
        <motion.div
          className="absolute top-1 bottom-1 w-2 rounded-full"
          style={{ backgroundColor: valueColor }}
          initial={{ left: `${targetPercent}%` }}
          animate={{ left: `calc(${valuePercent}% - 4px)` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}%</span>
        <span className="text-foreground/60">Target: {target}%</span>
        <span>+{max}%</span>
      </div>
    </div>
  );
});
