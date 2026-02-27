import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SpeedometerGaugeProps {
  value: number;
  label: string;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const SpeedometerGauge = memo(function SpeedometerGauge({
  value,
  label,
  min = 0,
  max = 100,
  size = 'md',
}: SpeedometerGaugeProps) {
  const clampedValue = Math.min(max, Math.max(min, value));
  const percentage = ((clampedValue - min) / (max - min)) * 100;
  const rotation = (percentage / 100) * 180 - 90;

  // Color based on value
  let color = 'hsl(var(--warning))';
  if (percentage >= 70) {
    color = 'hsl(var(--success))';
  } else if (percentage < 40) {
    color = 'hsl(var(--destructive))';
  }

  const sizeConfig = {
    sm: { width: 120, height: 70, needleLength: 42, fontSize: 'text-xl' },
    md: { width: 160, height: 90, needleLength: 56, fontSize: 'text-2xl' },
    lg: { width: 200, height: 110, needleLength: 72, fontSize: 'text-3xl' },
  };

  const config = sizeConfig[size];

  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        className="relative overflow-hidden"
        style={{ width: config.width, height: config.height }}
      >
        {/* Background arc segments */}
        <svg
          className="absolute inset-0"
          width={config.width}
          height={config.height * 2}
          viewBox={`0 0 ${config.width} ${config.height * 2}`}
        >
          {/* Red zone (0-40%) */}
          <path
            d={describeArc(config.width / 2, config.height, config.needleLength + 10, -90, -90 + 72)}
            fill="none"
            stroke="hsl(var(--destructive) / 0.3)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Yellow zone (40-70%) */}
          <path
            d={describeArc(config.width / 2, config.height, config.needleLength + 10, -90 + 72, -90 + 126)}
            fill="none"
            stroke="hsl(var(--warning) / 0.3)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Green zone (70-100%) */}
          <path
            d={describeArc(config.width / 2, config.height, config.needleLength + 10, -90 + 126, 90)}
            fill="none"
            stroke="hsl(var(--success) / 0.3)"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </svg>

        {/* Needle */}
        <motion.div
          className="absolute"
          style={{
            left: config.width / 2,
            top: config.height,
            width: 3,
            height: config.needleLength,
            backgroundColor: color,
            transformOrigin: 'bottom center',
            borderRadius: '2px 2px 0 0',
            boxShadow: `0 0 10px ${color}`,
          }}
          initial={{ rotate: -90 }}
          animate={{ rotate: rotation }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
        />

        {/* Center dot */}
        <div
          className="absolute rounded-full bg-foreground"
          style={{
            left: config.width / 2 - 5,
            top: config.height - 5,
            width: 10,
            height: 10,
          }}
        />

        {/* Min/Max labels */}
        <span className="absolute left-1 bottom-0 text-xs text-muted-foreground">
          {min}
        </span>
        <span className="absolute right-1 bottom-0 text-xs text-muted-foreground">
          {max}
        </span>
      </div>

      <div className="text-center">
        <div className={cn("font-bold", config.fontSize)} style={{ color }}>
          {Math.round(clampedValue)}%
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
});

// Helper function to create SVG arc path
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}
