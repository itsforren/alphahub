import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, Users, Target, TrendingUp, Megaphone, 
  RefreshCw, BarChart3
} from 'lucide-react';
import { useInternalSalesData } from '@/hooks/useInternalSalesData';
import { AuroraBackground, GlassCard, AnimatedNumber } from '@/components/tv';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

// Live indicator
const LiveIndicator = memo(function LiveIndicator({ 
  lastUpdated,
  isLoading 
}: { 
  lastUpdated: Date | null;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
        </span>
        <span className="text-emerald-400 font-semibold tracking-wide">LIVE</span>
      </div>
      {lastUpdated && !isLoading && (
        <span className="text-sm text-muted-foreground">
          Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
        </span>
      )}
      {isLoading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
    </div>
  );
});

// Glowing Icon
const GlowingIcon = memo(function GlowingIcon({ 
  icon: Icon, 
  color = '#22c55e',
  size = 'lg'
}: { 
  icon: typeof DollarSign; 
  color?: string;
  size?: 'md' | 'lg' | 'xl';
}) {
  const sizeClasses = {
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  };
  
  return (
    <motion.div
      animate={{ 
        scale: [1, 1.05, 1],
        opacity: [0.9, 1, 0.9]
      }}
      transition={{ duration: 3, repeat: Infinity }}
      className={cn(sizeClasses[size], "relative")}
    >
      <Icon 
        className={cn(sizeClasses[size])} 
        style={{ 
          color,
          filter: `drop-shadow(0 0 20px ${color}) drop-shadow(0 0 40px ${color}50)`
        }} 
      />
    </motion.div>
  );
});

// Hero Metric Card - Massive numbers
const HeroMetric = memo(function HeroMetric({ 
  icon: Icon,
  iconColor,
  value, 
  label,
  suffix = '',
  format = 'number',
  subValue,
  subLabel
}: { 
  icon: typeof DollarSign;
  iconColor: string;
  value: number; 
  label: string;
  suffix?: string;
  format?: 'number' | 'currency';
  subValue?: number | string;
  subLabel?: string;
}) {
  return (
    <GlassCard glow className="h-full">
      <div className="p-6 h-full flex flex-col items-center justify-center gap-4">
        <GlowingIcon icon={Icon} color={iconColor} />
        <div className="text-center">
          <div 
            className="text-7xl font-black tabular-nums tracking-tight"
            style={{ 
              color: iconColor,
              textShadow: `0 0 40px ${iconColor}60`
            }}
          >
            {format === 'currency' ? '$' : ''}
            <AnimatedNumber value={value} format="number" />
            {suffix}
          </div>
          <div className="text-lg text-muted-foreground mt-2 uppercase tracking-widest font-medium">
            {label}
          </div>
          {subValue !== undefined && (
            <div className="text-sm text-muted-foreground/70 mt-1">
              {subLabel}: {typeof subValue === 'number' ? subValue.toLocaleString() : subValue}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
});

// Gauge Component
const GaugeMetric = memo(function GaugeMetric({ 
  value, 
  label, 
  color = '#22c55e'
}: { 
  value: number; 
  label: string;
  color?: string;
}) {
  const percentage = Math.min(100, Math.max(0, value));
  const rotation = (percentage / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-40 h-20 overflow-hidden">
        <div className="absolute inset-0 border-[10px] border-muted/30 rounded-t-full" />
        <motion.div 
          className="absolute bottom-0 left-1/2 w-1.5 h-16 origin-bottom rounded-full"
          style={{ backgroundColor: color }}
          initial={{ rotate: -90 }}
          animate={{ rotate: rotation }}
          transition={{ type: 'spring', stiffness: 60 }}
        />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-foreground" />
      </div>
      <div className="text-center">
        <div 
          className="text-5xl font-bold"
          style={{ color, textShadow: `0 0 20px ${color}60` }}
        >
          {value.toFixed(0)}%
        </div>
        <div className="text-sm text-muted-foreground uppercase tracking-wide mt-1">{label}</div>
      </div>
    </div>
  );
});

export default function InternalSales() {
  const { data, isLoading, dataUpdatedAt } = useInternalSalesData();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (dataUpdatedAt) {
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt]);

  // Attribution data
  const attributionData = data?.attributionBreakdown?.length ? data.attributionBreakdown.map(a => ({
    name: a.source,
    value: a.count,
    color: a.color,
  })) : [
    { name: 'Google Ads', value: data?.totalPaidLeads || 0, color: '#4285f4' },
    { name: 'Facebook', value: Math.round((data?.totalPaidLeads || 0) * 0.3), color: '#1877f2' },
    { name: 'Referral', value: data?.newClientsWon || 0, color: '#22c55e' },
  ];

  return (
    <AuroraBackground>
      <div className="h-screen p-6 flex flex-col gap-6 overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between shrink-0"
        >
          <div className="flex items-center gap-4">
            <Megaphone className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Internal Sales</h1>
              <p className="text-muted-foreground text-sm">Agent Acquisition Pipeline</p>
            </div>
            <LiveIndicator lastUpdated={lastUpdated} isLoading={isLoading} />
          </div>
        </motion.div>

        {/* Hero Row - 3 Massive Cards (33% height) */}
        <div className="grid grid-cols-3 gap-6 h-[33%]">
          <HeroMetric
            icon={Users}
            iconColor="#22c55e"
            value={data?.newClientsWon || 0}
            label="New Agents Sold"
            subLabel="MTD"
          />
          <HeroMetric
            icon={DollarSign}
            iconColor="#eab308"
            value={data?.managementFeeRevenueMTD || 0}
            label="Cash Collected"
            format="currency"
          />
          <HeroMetric
            icon={Target}
            iconColor="#f97316"
            value={data?.salesCAC || 0}
            label="Sales CAC"
            format="currency"
          />
        </div>

        {/* Middle Row - Funnel Gauges (30% height) */}
        <div className="grid grid-cols-4 gap-6 h-[30%]">
          <GlassCard className="col-span-1">
            <div className="p-6 h-full flex flex-col items-center justify-center">
              <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Leads (Paid)
              </div>
              <div className="text-6xl font-bold text-primary">
                <AnimatedNumber value={data?.totalPaidLeads || 0} format="number" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-4 h-full flex items-center justify-center">
              <GaugeMetric
                value={data?.salesShowRate || 0}
                label="Show Rate"
                color={(data?.salesShowRate ?? 0) >= 70 ? '#22c55e' : (data?.salesShowRate ?? 0) >= 40 ? '#eab308' : '#ef4444'}
              />
            </div>
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-4 h-full flex items-center justify-center">
              <GaugeMetric
                value={data?.salesCloseRate || 0}
                label="Close Rate"
                color={(data?.salesCloseRate ?? 0) >= 30 ? '#22c55e' : (data?.salesCloseRate ?? 0) >= 15 ? '#eab308' : '#ef4444'}
              />
            </div>
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-6 h-full flex flex-col items-center justify-center">
              <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Speed to Lead
              </div>
              <div className={cn(
                "text-6xl font-bold",
                (data?.speedToLead ?? 0) <= 5 ? "text-success" : (data?.speedToLead ?? 0) <= 15 ? "text-warning" : "text-destructive"
              )}>
                {Math.round(data?.speedToLead || 0)}
                <span className="text-2xl text-muted-foreground ml-1">min</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Bottom Row - Attribution Chart (Remaining height) */}
        <GlassCard className="flex-1 p-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Lead Attribution</h3>
          </div>
          <div className="h-[calc(100%-40px)]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attributionData} layout="vertical" margin={{ left: 80, right: 40 }}>
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={14}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {attributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </AuroraBackground>
  );
}
