import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

interface TrendArrowProps {
  current: number;
  previous: number;
  format?: 'percent' | 'number' | 'currency';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TrendArrow({ 
  current, 
  previous, 
  format = 'percent',
  showLabel = true,
  size = 'md' 
}: TrendArrowProps) {
  const diff = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const isPositive = diff > 0;
  const isNeutral = Math.abs(diff) < 1;
  
  const sizeClasses = {
    sm: { icon: 'w-3 h-3', text: 'text-xs' },
    md: { icon: 'w-4 h-4', text: 'text-sm' },
    lg: { icon: 'w-5 h-5', text: 'text-base' },
  };
  
  const { icon: iconClass, text: textClass } = sizeClasses[size];
  
  const formatValue = () => {
    const absVal = Math.abs(diff);
    if (format === 'percent') return `${absVal.toFixed(1)}%`;
    if (format === 'currency') return `$${absVal.toFixed(0)}`;
    return absVal.toFixed(1);
  };
  
  if (isNeutral) {
    return (
      <div className="flex items-center gap-1 text-white/40">
        <Minus className={iconClass} />
        {showLabel && <span className={textClass}>vs 30d</span>}
      </div>
    );
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-1 ${
        isPositive ? 'text-emerald-400' : 'text-red-400'
      }`}
    >
      {isPositive ? (
        <TrendingUp className={iconClass} />
      ) : (
        <TrendingDown className={iconClass} />
      )}
      {showLabel && (
        <span className={textClass}>
          {isPositive ? '+' : '-'}{formatValue()}
        </span>
      )}
    </motion.div>
  );
}
