import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from './AnimatedNumber';

interface FunnelStep {
  label: string;
  value: number;
  color?: string;
}

interface FunnelWaterfallProps {
  steps: FunnelStep[];
  className?: string;
  showPercentages?: boolean;
}

const defaultColors = [
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#22c55e', // green
  '#eab308', // yellow
];

export const FunnelWaterfall = memo(function FunnelWaterfall({
  steps,
  className,
  showPercentages = true,
}: FunnelWaterfallProps) {
  const maxValue = Math.max(...steps.map(s => s.value), 1);

  return (
    <div className={cn('space-y-4', className)}>
      {steps.map((step, index) => {
        const widthPercent = (step.value / maxValue) * 100;
        const prevValue = index > 0 ? steps[index - 1].value : step.value;
        const conversionRate = prevValue > 0 ? (step.value / prevValue) * 100 : 0;
        const color = step.color || defaultColors[index % defaultColors.length];

        return (
          <div key={step.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground font-medium">
                {step.label}
              </span>
              <div className="flex items-center gap-3">
                <AnimatedNumber
                  value={step.value}
                  className="text-lg font-bold"
                />
                {showPercentages && index > 0 && (
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    conversionRate >= 50 
                      ? 'bg-green-500/20 text-green-400' 
                      : conversionRate >= 25 
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                  )}>
                    {conversionRate.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            <div className="h-10 rounded-lg bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPercent}%` }}
                transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                className="h-full rounded-lg"
                style={{
                  background: `linear-gradient(90deg, ${color}dd, ${color}88)`,
                  boxShadow: `0 0 20px ${color}40`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default FunnelWaterfall;
