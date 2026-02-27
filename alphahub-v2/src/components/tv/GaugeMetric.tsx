import React from 'react';
import { motion } from 'framer-motion';

interface GaugeMetricProps {
  label: string;
  value: number;
  target: number;
  format?: 'percent' | 'number';
  size?: 'sm' | 'md' | 'lg';
}

export function GaugeMetric({ label, value, target, format = 'percent', size = 'md' }: GaugeMetricProps) {
  const percentage = Math.min((value / 100) * 100, 100);
  const isGood = value >= target;
  const isClose = value >= target * 0.8;
  
  const dimensions = {
    sm: { size: 80, strokeWidth: 6, fontSize: 'text-lg' },
    md: { size: 120, strokeWidth: 8, fontSize: 'text-2xl' },
    lg: { size: 160, strokeWidth: 10, fontSize: 'text-4xl' },
  };
  
  const { size: svgSize, strokeWidth, fontSize } = dimensions[size];
  const radius = (svgSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // Target line position
  const targetAngle = (target / 100) * 360 - 90;
  const targetX = svgSize / 2 + radius * Math.cos((targetAngle * Math.PI) / 180);
  const targetY = svgSize / 2 + radius * Math.sin((targetAngle * Math.PI) / 180);
  
  const color = isGood ? 'rgb(74, 222, 128)' : isClose ? 'rgb(251, 191, 36)' : 'rgb(248, 113, 113)';
  const glowClass = isGood ? 'neon-text-green' : isClose ? 'neon-text-amber' : 'neon-text-red';
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="transform -rotate-90">
          {/* Background ring */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <motion.circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
          {/* Target indicator */}
          <circle
            cx={targetX}
            cy={targetY}
            r={3}
            fill="white"
            className="transform rotate-90 origin-center"
            style={{ transformOrigin: `${svgSize / 2}px ${svgSize / 2}px` }}
          />
        </svg>
        
        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${fontSize} font-bold ${glowClass}`}>
            {value.toFixed(format === 'percent' ? 0 : 1)}
            {format === 'percent' && '%'}
          </span>
        </div>
      </div>
      
      <div className="mt-2 text-center">
        <div className="text-white/70 text-sm">{label}</div>
        <div className="text-white/40 text-xs">Target: {target}%</div>
      </div>
    </div>
  );
}
