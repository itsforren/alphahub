import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarPacingProps {
  percentage: number;
  label?: string;
  yellowThreshold?: number;
  redThreshold?: number;
}

export function ProgressBarPacing({ 
  percentage, 
  label = 'Pacing',
  yellowThreshold = 80,
  redThreshold = 50 
}: ProgressBarPacingProps) {
  const cappedPercentage = Math.min(percentage, 100);
  
  const getBarClass = () => {
    if (percentage >= yellowThreshold) return 'pacing-bar pacing-bar-green';
    if (percentage >= redThreshold) return 'pacing-bar pacing-bar-yellow';
    return 'pacing-bar pacing-bar-red';
  };
  
  const getTextColor = () => {
    if (percentage >= yellowThreshold) return 'text-emerald-400';
    if (percentage >= redThreshold) return 'text-amber-400';
    return 'text-red-400';
  };
  
  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/50 text-sm">{label}</span>
          <span className={`text-sm font-semibold ${getTextColor()}`}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${cappedPercentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${getBarClass()}`}
        />
      </div>
    </div>
  );
}
