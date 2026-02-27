import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HealthScoreIndicatorProps {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getHealthLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Healthy', color: 'text-green-600 dark:text-green-400' };
  if (score >= 60) return { label: 'Drifting', color: 'text-yellow-600 dark:text-yellow-400' };
  if (score >= 30) return { label: 'At Risk', color: 'text-orange-600 dark:text-orange-400' };
  return { label: 'Critical', color: 'text-red-600 dark:text-red-400' };
}

function getScoreColor(score: number): string {
  if (score >= 85) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 30) return 'bg-orange-500';
  return 'bg-red-500';
}

export function HealthScoreIndicator({
  score,
  size = 'md',
  showLabel = false,
}: HealthScoreIndicatorProps) {
  if (score === null) {
    return (
      <span className="text-muted-foreground text-sm">—</span>
    );
  }

  const { label, color } = getHealthLabel(score);
  const barColor = getScoreColor(score);

  const sizeClasses = {
    sm: 'w-10 h-1.5',
    md: 'w-14 h-2',
    lg: 'w-20 h-2.5',
  };

  const textClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base font-medium',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2">
          <div className={cn("bg-muted rounded-full overflow-hidden", sizeClasses[size])}>
            <div 
              className={cn("h-full rounded-full transition-all", barColor)}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className={cn(textClasses[size], color, "font-medium")}>
            {score}
          </span>
          {showLabel && (
            <span className={cn(textClasses[size], "text-muted-foreground")}>
              {label}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Health Score: {score}/100 ({label})</p>
      </TooltipContent>
    </Tooltip>
  );
}
