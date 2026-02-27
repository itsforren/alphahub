import { memo, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DigitalCounterProps {
  value: number;
  label: string;
  color?: 'default' | 'success' | 'warning' | 'danger';
  prefix?: string;
}

const Digit = memo(function Digit({ digit, color }: { digit: string; color: string }) {
  return (
    <div className="relative w-8 h-12 overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={digit}
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "text-3xl font-mono font-bold",
            "bg-gradient-to-b from-muted/20 to-muted/10",
            "rounded border border-border/30"
          )}
          style={{ color, textShadow: `0 0 10px ${color}` }}
        >
          {digit}
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

export const DigitalCounter = memo(function DigitalCounter({
  value,
  label,
  color = 'default',
  prefix,
}: DigitalCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      // Animate counting up/down
      const diff = value - prevValue.current;
      const steps = Math.min(Math.abs(diff), 20);
      const stepValue = diff / steps;
      let current = prevValue.current;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        current += stepValue;
        setDisplayValue(Math.round(current));
        
        if (step >= steps) {
          clearInterval(interval);
          setDisplayValue(value);
        }
      }, 50);

      prevValue.current = value;
      return () => clearInterval(interval);
    }
  }, [value]);

  const colorMap = {
    default: 'hsl(var(--foreground))',
    success: 'hsl(var(--success))',
    warning: 'hsl(var(--warning))',
    danger: 'hsl(var(--destructive))',
  };

  const textColor = colorMap[color];
  const digits = displayValue.toString().padStart(3, '0').split('');

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1">
        {prefix && (
          <span className="text-2xl font-bold mr-1" style={{ color: textColor }}>
            {prefix}
          </span>
        )}
        {digits.map((digit, i) => (
          <Digit key={i} digit={digit} color={textColor} />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
});
