import { memo, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

type GlassCardVariant = 'default' | 'gold' | 'success' | 'danger' | 'warning' | 'blue';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  variant?: GlassCardVariant;
  pulse?: boolean;
  glow?: boolean;
  className?: string;
}

const variantClasses: Record<GlassCardVariant, string> = {
  default: 'glass-card',
  gold: 'glass-card glass-card-gold',
  success: 'glass-card glass-card-success',
  danger: 'glass-card glass-card-danger',
  warning: 'glass-card glass-card-warning',
  blue: 'glass-card glass-card-blue',
};

export const GlassCard = memo(function GlassCard({
  children,
  variant = 'default',
  pulse = false,
  glow = false,
  className,
  ...motionProps
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        variantClasses[variant],
        pulse && 'glass-card-pulse',
        glow && variant === 'success' && 'shadow-[0_0_30px_rgba(34,197,94,0.2)]',
        glow && variant === 'gold' && 'shadow-[0_0_30px_rgba(234,179,8,0.15)]',
        glow && variant === 'danger' && 'shadow-[0_0_30px_rgba(239,68,68,0.2)]',
        glow && variant === 'blue' && 'shadow-[0_0_30px_rgba(59,130,246,0.2)]',
        className
      )}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
});

export default GlassCard;
