import { memo, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ScrollingTickerProps {
  children: ReactNode;
  speed?: 'slow' | 'normal' | 'fast';
  className?: string;
  pauseOnHover?: boolean;
}

const speedMap = {
  slow: '60s',
  normal: '30s',
  fast: '15s',
};

export const ScrollingTicker = memo(function ScrollingTicker({
  children,
  speed = 'normal',
  className,
  pauseOnHover = true,
}: ScrollingTickerProps) {
  return (
    <div className={cn(
      'ticker-container glass-card py-3',
      className
    )}>
      <div 
        className="ticker-content"
        style={{ 
          animationDuration: speedMap[speed],
          animationPlayState: pauseOnHover ? 'running' : undefined,
        }}
      >
        {children}
        {/* Duplicate for seamless loop */}
        {children}
      </div>
    </div>
  );
});

interface TickerItemProps {
  children: ReactNode;
  className?: string;
}

export const TickerItem = memo(function TickerItem({
  children,
  className,
}: TickerItemProps) {
  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-6 text-sm',
      className
    )}>
      {children}
      <span className="text-muted-foreground/30 ml-4">•</span>
    </div>
  );
});

export default ScrollingTicker;
