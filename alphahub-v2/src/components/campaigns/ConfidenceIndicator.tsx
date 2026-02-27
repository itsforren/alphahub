import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ConfidenceIndicatorProps {
  confidence: number | null;
  similarCasesCount?: number | null;
  similarCasesSummary?: string | null;
}

function getConfidenceLevel(confidence: number): { 
  label: string; 
  color: string;
  bgColor: string;
  icon: typeof TrendingUp;
} {
  if (confidence >= 0.75) {
    return { 
      label: 'High', 
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/20 border-green-500/30',
      icon: TrendingUp,
    };
  }
  if (confidence >= 0.5) {
    return { 
      label: 'Med', 
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-500/20 border-yellow-500/30',
      icon: Minus,
    };
  }
  return { 
    label: 'Low', 
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/20 border-red-500/30',
    icon: TrendingDown,
  };
}

export function ConfidenceIndicator({
  confidence,
  similarCasesCount,
  similarCasesSummary,
}: ConfidenceIndicatorProps) {
  if (confidence === null) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const { label, color, bgColor, icon: Icon } = getConfidenceLevel(confidence);
  const percentValue = Math.round(confidence * 100);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={cn("gap-1 text-xs", bgColor, color)}>
            <Icon className="h-3 w-3" />
            {label}
          </Badge>
          {similarCasesCount !== null && similarCasesCount > 0 && (
            <span className="text-xs text-muted-foreground">
              ({similarCasesCount})
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-1">
          <p className="font-medium">Confidence: {percentValue}%</p>
          {similarCasesCount !== null && (
            <p className="text-xs text-muted-foreground">
              Based on {similarCasesCount} similar past decisions
            </p>
          )}
          {similarCasesSummary && (
            <p className="text-xs">{similarCasesSummary}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
