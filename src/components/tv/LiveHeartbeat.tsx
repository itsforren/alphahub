import { useEffect, useState, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';

interface LiveHeartbeatProps {
  lastRefreshTime: Date;
  onRefresh?: () => void;
  className?: string;
}

export const LiveHeartbeat = memo(function LiveHeartbeat({ 
  lastRefreshTime, 
  onRefresh,
  className 
}: LiveHeartbeatProps) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const updateSeconds = () => {
      const diff = Math.floor((Date.now() - lastRefreshTime.getTime()) / 1000);
      setSecondsAgo(diff);
    };

    updateSeconds();
    const interval = setInterval(updateSeconds, 1000);

    return () => clearInterval(interval);
  }, [lastRefreshTime]);

  const formatSeconds = (s: number) => {
    if (s >= 60) {
      const mins = Math.floor(s / 60);
      return `${mins}m ${s % 60}s`;
    }
    return `${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className={cn(
      "flex items-center gap-3 text-sm",
      className
    )}>
      <div className="live-dot" />
      <span className="text-muted-foreground font-medium tracking-wide uppercase">
        Live Data
      </span>
      <span className="text-muted-foreground/70">•</span>
      <span className="text-muted-foreground tabular-nums">
        Refreshed: {formatSeconds(secondsAgo)} ago
      </span>
    </div>
  );
});

export default LiveHeartbeat;
