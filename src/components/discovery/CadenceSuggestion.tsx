import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface CadenceSuggestionProps {
  attemptCount: number;
  lastAttemptAt: string | null;
}

function getHoursSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return (Date.now() - new Date(dateStr).getTime()) / 3_600_000;
}

export function CadenceSuggestion({ attemptCount, lastAttemptAt }: CadenceSuggestionProps) {
  const hoursSince = getHoursSince(lastAttemptAt);

  let text: string;
  let isDue = false;

  if (attemptCount === 0) {
    text = 'Call now \u2014 speed to lead!';
    isDue = true;
  } else if (attemptCount === 1) {
    if (hoursSince !== null && hoursSince >= 2) {
      text = 'Due now \u2014 follow up';
      isDue = true;
    } else {
      text = 'Try again in 2-4 hours';
    }
  } else if (attemptCount === 2) {
    if (hoursSince !== null && hoursSince >= 24) {
      text = 'Due now \u2014 try this morning';
      isDue = true;
    } else {
      text = 'Try tomorrow morning';
    }
  } else if (attemptCount === 3) {
    if (hoursSince !== null && hoursSince >= 48) {
      text = 'Due now \u2014 afternoon attempt';
      isDue = true;
    } else {
      text = 'Try in 2 days, afternoon';
    }
  } else {
    if (hoursSince !== null && hoursSince >= 48) {
      text = 'Overdue \u2014 final attempt';
      isDue = true;
    } else {
      text = 'Final attempt \u2014 try different time of day';
    }
  }

  return (
    <div className={cn(
      'flex items-center gap-1 text-[10px]',
      isDue ? 'text-amber-400' : 'text-muted-foreground/50'
    )}>
      <Clock className="h-2.5 w-2.5 flex-shrink-0" />
      <span>{text}</span>
    </div>
  );
}
