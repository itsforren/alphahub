import React from 'react';
import { motion } from 'framer-motion';
import { Wifi } from 'lucide-react';

interface SignalStrengthProps {
  percentage: number;
  label?: string;
  threshold?: number;
}

export function SignalStrength({ percentage, label = 'Signal Strength', threshold = 90 }: SignalStrengthProps) {
  const bars = 5;
  const activeBars = Math.ceil((percentage / 100) * bars);
  const isHealthy = percentage >= threshold;
  const isWarning = percentage >= threshold * 0.8 && percentage < threshold;
  
  const getBarClass = (index: number) => {
    if (index >= activeBars) return 'bg-white/10';
    if (!isHealthy && !isWarning) return 'signal-bar signal-bar-danger';
    if (isWarning) return 'signal-bar signal-bar-warning';
    return 'signal-bar signal-bar-active';
  };
  
  const getIconColor = () => {
    if (!isHealthy && !isWarning) return 'text-red-400';
    if (isWarning) return 'text-amber-400';
    return 'text-emerald-400';
  };
  
  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 text-white/70 mb-4">
        <Wifi className={`w-6 h-6 ${getIconColor()}`} />
        <span>{label}</span>
      </div>
      
      <div className="flex items-end gap-2 mb-4 h-16">
        {Array.from({ length: bars }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${20 + i * 15}%` }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className={`w-4 rounded-t ${getBarClass(i)}`}
          />
        ))}
      </div>
      
      <div className="flex items-center justify-between">
        <span className={`text-3xl font-bold neon-text ${
          isHealthy ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-red-400'
        }`}>
          {percentage.toFixed(0)}%
        </span>
        {!isHealthy && (
          <span className="px-2 py-1 rounded bg-red-500/20 border border-red-500/50 text-red-400 text-xs animate-pulse">
            BELOW {threshold}%
          </span>
        )}
      </div>
    </div>
  );
}
