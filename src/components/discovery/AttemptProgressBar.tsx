import { cn } from '@/lib/utils';

interface AttemptProgressBarProps {
  attempts: number;
  maxAttempts?: number;
}

export function AttemptProgressBar({ attempts, maxAttempts = 5 }: AttemptProgressBarProps) {
  const atMax = attempts >= maxAttempts;

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1">
        {Array.from({ length: maxAttempts }, (_, i) => (
          <div
            key={i}
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              i < attempts
                ? atMax ? 'bg-red-400' : 'bg-green-400'
                : 'bg-muted-foreground/20'
            )}
          />
        ))}
      </div>
      <span className={cn(
        'text-[10px]',
        atMax ? 'text-red-400/60' : 'text-muted-foreground'
      )}>
        {attempts}/{maxAttempts} attempts
      </span>
      {atMax && (
        <span className="text-[10px] text-red-400/60">Move to nurture?</span>
      )}
    </div>
  );
}
