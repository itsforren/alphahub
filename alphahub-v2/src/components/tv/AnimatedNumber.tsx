import { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  format?: 'currency' | 'percent' | 'number' | 'compact';
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
  decimals?: number;
}

export const AnimatedNumber = memo(function AnimatedNumber({
  value,
  format = 'number',
  prefix = '',
  suffix = '',
  className,
  duration = 800,
  decimals,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = prevValue.current;
    const endValue = value;
    const startTime = performance.now();
    const durationMs = duration;

    const easeOut = (t: number): number => {
      return 1 - Math.pow(1 - t, 3);
    };

    const animateValue = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = easeOut(progress);
      
      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateValue);
      }
    };

    animationRef.current = requestAnimationFrame(animateValue);
    prevValue.current = value;

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  const formatValue = (v: number): string => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: decimals ?? 0,
          maximumFractionDigits: decimals ?? 0,
        }).format(v);
      case 'percent':
        return `${v.toFixed(decimals ?? 1)}%`;
      case 'compact':
        if (v >= 1000000) {
          return `${(v / 1000000).toFixed(decimals ?? 1)}M`;
        } else if (v >= 1000) {
          return `${(v / 1000).toFixed(decimals ?? 1)}K`;
        }
        return v.toFixed(decimals ?? 0);
      case 'number':
      default:
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: decimals ?? 0,
          maximumFractionDigits: decimals ?? 0,
        }).format(v);
    }
  };

  return (
    <motion.span
      key={value}
      initial={{ opacity: 0.7 }}
      animate={{ opacity: 1 }}
      className={cn('tabular-nums', className)}
    >
      {prefix}{formatValue(displayValue)}{suffix}
    </motion.span>
  );
});

export default AnimatedNumber;
