import { memo, ReactNode } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { GlassCard } from './GlassCard';

interface ChartData {
  [key: string]: string | number;
}

interface GlassChartProps {
  data: ChartData[];
  type: 'area' | 'bar' | 'line' | 'pie';
  dataKey: string;
  xAxisKey?: string;
  title?: string;
  subtitle?: string;
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  height?: number;
  className?: string;
  showGrid?: boolean;
  neonGlow?: boolean;
  formatValue?: (value: number) => string;
  formatXAxis?: (value: string) => string;
  pieInnerRadius?: number;
  pieOuterRadius?: number;
  pieColors?: string[];
}

const defaultColors = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
];

const GlassTooltip = ({ 
  active, 
  payload, 
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string }>;
  label?: string;
  formatValue?: (value: number) => string;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass-chart-tooltip">
      {label && (
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color || '#fff' }}>
          {formatValue ? formatValue(entry.value) : entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export const GlassChart = memo(function GlassChart({
  data,
  type,
  dataKey,
  xAxisKey = 'name',
  title,
  subtitle,
  color = '#3b82f6',
  gradientFrom,
  gradientTo,
  height = 200,
  className,
  showGrid = false,
  neonGlow = false,
  formatValue,
  formatXAxis,
  pieInnerRadius = 0,
  pieOuterRadius = 80,
  pieColors = defaultColors,
}: GlassChartProps) {
  const gradientId = `gradient-${dataKey}-${Math.random().toString(36).slice(2)}`;
  const fromColor = gradientFrom || color;
  const toColor = gradientTo || 'transparent';

  const renderChart = () => {
    switch (type) {
      case 'area':
        return (
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fromColor} stopOpacity={0.5} />
                <stop offset="100%" stopColor={toColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(255,255,255,0.05)" 
                vertical={false}
              />
            )}
            <XAxis 
              dataKey={xAxisKey} 
              stroke="rgba(255,255,255,0.3)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatXAxis}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatValue?.(v) || v.toLocaleString()}
            />
            <Tooltip content={<GlassTooltip formatValue={formatValue} />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              className={neonGlow ? 'neon-path' : ''}
            />
          </AreaChart>
        );

      case 'line':
        return (
          <LineChart data={data}>
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(255,255,255,0.05)" 
                vertical={false}
              />
            )}
            <XAxis 
              dataKey={xAxisKey} 
              stroke="rgba(255,255,255,0.3)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatXAxis}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatValue?.(v) || v.toLocaleString()}
            />
            <Tooltip content={<GlassTooltip formatValue={formatValue} />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={false}
              className={neonGlow ? 'neon-path' : ''}
              style={neonGlow ? { filter: `drop-shadow(0 0 8px ${color})` } : {}}
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fromColor} stopOpacity={0.9} />
                <stop offset="100%" stopColor={toColor} stopOpacity={0.3} />
              </linearGradient>
            </defs>
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(255,255,255,0.05)" 
                vertical={false}
              />
            )}
            <XAxis 
              dataKey={xAxisKey} 
              stroke="rgba(255,255,255,0.3)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatXAxis}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatValue?.(v) || v.toLocaleString()}
            />
            <Tooltip content={<GlassTooltip formatValue={formatValue} />} />
            <Bar
              dataKey={dataKey}
              fill={`url(#${gradientId})`}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={xAxisKey}
              cx="50%"
              cy="50%"
              innerRadius={pieInnerRadius}
              outerRadius={pieOuterRadius}
              paddingAngle={2}
            >
              {data.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={pieColors[index % pieColors.length]}
                  style={{ filter: neonGlow ? `drop-shadow(0 0 6px ${pieColors[index % pieColors.length]})` : undefined }}
                />
              ))}
            </Pie>
            <Tooltip content={<GlassTooltip formatValue={formatValue} />} />
          </PieChart>
        );
    }
  };

  return (
    <GlassCard className={cn('p-6', className)}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <div className="glass-chart" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
});

export default GlassChart;
