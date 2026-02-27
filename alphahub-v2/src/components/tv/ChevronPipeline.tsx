import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

type StageStatus = 'completed' | 'current' | 'pending';

interface PipelineStage {
  id: string;
  label: string;
  count?: number;
  status: StageStatus;
}

interface ChevronPipelineProps {
  stages: PipelineStage[];
  className?: string;
}

const statusStyles: Record<StageStatus, { bg: string; text: string; border: string }> = {
  completed: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/30',
  },
  current: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  pending: {
    bg: 'bg-white/5',
    text: 'text-muted-foreground',
    border: 'border-white/10',
  },
};

export const ChevronPipeline = memo(function ChevronPipeline({
  stages,
  className,
}: ChevronPipelineProps) {
  return (
    <div className={cn('flex items-stretch gap-1', className)}>
      {stages.map((stage, index) => {
        const style = statusStyles[stage.status];
        const isFirst = index === 0;
        const isLast = index === stages.length - 1;

        return (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'relative flex-1 flex flex-col items-center justify-center py-4 px-3 min-w-0',
              style.bg,
              'border',
              style.border,
              isFirst && 'rounded-l-lg',
              isLast && 'rounded-r-lg',
              !isFirst && 'border-l-0',
              stage.status === 'current' && 'pulse-breathing'
            )}
          >
            {stage.status === 'completed' && (
              <CheckCircle className="w-4 h-4 text-green-400 mb-1" />
            )}
            <span className={cn(
              'text-xs font-medium text-center truncate w-full',
              style.text
            )}>
              {stage.label}
            </span>
            {stage.count !== undefined && (
              <span className={cn(
                'text-lg font-bold mt-1',
                style.text
              )}>
                {stage.count}
              </span>
            )}
            
            {/* Chevron arrow - only show if not last */}
            {!isLast && (
              <div className={cn(
                'absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10',
                'w-3 h-3 rotate-45 border-t border-r',
                style.border,
                style.bg
              )} />
            )}
          </motion.div>
        );
      })}
    </div>
  );
});

export default ChevronPipeline;
