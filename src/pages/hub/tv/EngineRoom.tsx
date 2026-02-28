import { memo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Wallet, TrendingUp, AlertTriangle, Target, Bot, Zap,
  Radio, Gauge, Activity, RefreshCw,
  CheckCircle2, XCircle, Brain, PauseCircle, TrendingDown
} from 'lucide-react';
import { useEngineRoomData } from '@/hooks/useEngineRoomData';
import { 
  AuroraBackground, GlassCard, AnimatedNumber
} from '@/components/tv';
import { BulletGraph } from '@/components/tv/BulletGraph';
import { StatusDot } from '@/components/tv/StatusDot';
import { CircularProgress } from '@/components/tv/CircularProgress';
import { DigitalCounter } from '@/components/tv/DigitalCounter';
import { SpeedometerGauge } from '@/components/tv/SpeedometerGauge';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

// Live indicator with last update time
const LiveIndicator = memo(function LiveIndicator({ 
  lastUpdated,
  isLoading 
}: { 
  lastUpdated: Date | null;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={{ 
          scale: isLoading ? [1, 1.2, 1] : 1,
          opacity: isLoading ? [1, 0.5, 1] : 1 
        }}
        transition={{ 
          duration: 1, 
          repeat: isLoading ? Infinity : 0 
        }}
        className="flex items-center gap-2"
      >
        <div className={cn(
          "w-2 h-2 rounded-full",
          isLoading ? "bg-warning animate-pulse" : "bg-success"
        )} />
        <span className="text-xs text-muted-foreground">
          {isLoading ? 'Refreshing...' : 'Live'}
        </span>
      </motion.div>
      {lastUpdated && !isLoading && (
        <span className="text-xs text-muted-foreground/60">
          · Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
        </span>
      )}
      <RefreshCw className={cn(
        "w-3 h-3 text-muted-foreground/50",
        isLoading && "animate-spin"
      )} />
    </div>
  );
});

// Keyboard navigation hint
const KeyboardHint = memo(function KeyboardHint() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Press</span>
      {[1, 2, 3, 4, 5, 6, 7].map(n => (
        <span 
          key={n}
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded border text-[10px] font-mono",
            n === 2 ? "border-primary bg-primary/20 text-primary" : "border-border"
          )}
        >
          {n}
        </span>
      ))}
      <span>for screens</span>
    </div>
  );
});

// Alert Badge
const AlertBadge = memo(function AlertBadge({ 
  count, 
  label,
  variant = 'danger'
}: { 
  count: number; 
  label: string;
  variant?: 'danger' | 'warning';
}) {
  if (count === 0) return null;
  
  const bgColor = variant === 'danger' ? 'bg-destructive/20' : 'bg-warning/20';
  const textColor = variant === 'danger' ? 'text-destructive' : 'text-warning';
  const borderColor = variant === 'danger' ? 'border-destructive/40' : 'border-warning/40';
  
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "px-3 py-2 rounded-lg border flex items-center gap-2",
        bgColor, borderColor
      )}
    >
      <AlertTriangle className={cn("w-4 h-4", textColor)} />
      <span className={cn("text-3xl font-bold", textColor)}>{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </motion.div>
  );
});

// Bot Metrics Placeholder
const BotMetricsPlaceholder = memo(function BotMetricsPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <Bot className="w-12 h-12 text-muted-foreground/30 mb-4" />
      <h4 className="text-sm font-medium text-muted-foreground mb-2">Bot Integration Required</h4>
      <p className="text-xs text-muted-foreground/60 max-w-[200px]">
        Connect your chatbot to view engagement, resolution, and conversion metrics
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground/50">
        <span>• Engagement Rate</span>
        <span>• Resolution Rate</span>
        <span>• Handoff Rate</span>
        <span>• Appointment Conv.</span>
      </div>
    </div>
  );
});

export default function EngineRoom() {
  const navigate = useNavigate();
  const { data, isLoading, dataUpdatedAt } = useEngineRoomData();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Update last updated time when data changes
  useEffect(() => {
    if (dataUpdatedAt) {
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case '1':
          navigate('/hub/admin/analytics');
          break;
        case '2':
          // Already on Engine Room
          break;
        // Keys 3-7 for future screens
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Format chart data
  const chartData = data?.dailySpendData?.map(d => ({
    date: d.date.slice(5), // MM-DD format
    spend: d.spend,
  })) || [];

  return (
    <AuroraBackground>
      <div className="min-h-screen p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">The Engine Room</h1>
              <p className="text-muted-foreground text-sm">Marketing & AI Operations</p>
            </div>
            <LiveIndicator lastUpdated={lastUpdated} isLoading={isLoading} />
          </div>
          <KeyboardHint />
        </motion.div>

        {/* Row 1: Top-line Wallet & Spend Metrics */}
        <div className="grid grid-cols-5 gap-4">
          <GlassCard glow className="col-span-1">
            <div className="p-4 h-full flex flex-col justify-center">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Wallet className="w-4 h-4" />
                Total Wallet Balance
              </div>
              <div className="text-4xl font-bold text-success">
                <AnimatedNumber value={data?.totalWalletBalance || 0} format="currency" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-4 h-full flex flex-col justify-center">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <TrendingUp className="w-4 h-4" />
                Avg Daily Spend
              </div>
              <div className="text-4xl font-bold text-foreground">
                <AnimatedNumber value={data?.avgDailySpend || 0} format="currency" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-4 h-full flex flex-col justify-center">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Activity className="w-4 h-4" />
                Today's Spend
              </div>
              <div className="text-4xl font-bold text-foreground">
                <AnimatedNumber value={data?.todaySpend || 0} format="currency" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-4 h-full flex flex-col justify-center">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Gauge className="w-4 h-4" />
                Daily Budget
              </div>
              <div className="text-4xl font-bold text-foreground">
                <AnimatedNumber value={data?.totalDailyBudget || 0} format="currency" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-4 h-full flex flex-col justify-center">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Target className="w-4 h-4" />
                Leads MTD
              </div>
              <div className="text-4xl font-bold text-foreground">
                <AnimatedNumber value={data?.leadsMTD || 0} format="number" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Row 2: Ad Spend Chart + MTD */}
        <div className="grid grid-cols-5 gap-4">
          <GlassCard className="col-span-4">
            <div className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Ad Spend MTD (Daily)</h3>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Spend']}
                    />
                    <Area
                      type="monotone"
                      dataKey="spend"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#spendGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>

          <GlassCard glow className="col-span-1">
            <div className="p-4 h-full flex flex-col justify-center items-center">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <TrendingUp className="w-4 h-4" />
                Ad Spend MTD
              </div>
              <div className="text-5xl font-bold text-primary">
                <AnimatedNumber value={data?.adSpendMTD || 0} format="currency" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Row 3: Performance Metrics */}
        <div className="grid grid-cols-6 gap-4">
          <GlassCard className="col-span-1">
            <div className="p-4 h-full flex flex-col justify-center">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Target className="w-4 h-4" />
                Avg CPL
              </div>
              <div className="text-4xl font-bold text-foreground">
                <AnimatedNumber value={data?.avgCPL || 0} format="currency" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-4 h-full flex flex-col justify-center">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Activity className="w-4 h-4" />
                Avg CTR
              </div>
              <div className="text-4xl font-bold text-foreground">
                <AnimatedNumber value={data?.avgCTR || 0} format="percent" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-4 h-full flex flex-col justify-center">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Gauge className="w-4 h-4" />
                CVR (Conv/Click)
              </div>
              <div className="text-4xl font-bold text-foreground">
                <AnimatedNumber value={data?.lpConversionRate || 0} format="percent" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-4 h-full flex flex-col justify-center">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Radio className="w-4 h-4" />
                Lead Delivery Rate
              </div>
              <div className={cn(
                "text-4xl font-bold",
                (data?.leadDeliveryRate || 0) >= 90 ? "text-success" : "text-destructive"
              )}>
                <AnimatedNumber value={data?.leadDeliveryRate || 0} format="percent" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-4 h-full flex flex-col justify-center">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <CheckCircle2 className="w-4 h-4" />
                Unique Lead Rate
              </div>
              <div className="text-4xl font-bold text-success">
                <AnimatedNumber value={data?.uniqueLeadRate || 0} format="percent" />
              </div>
              <div className="text-xs text-muted-foreground/60">Placeholder</div>
            </div>
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-4 h-full flex items-center justify-center">
              <StatusDot
                status={data?.routerHealthStatus || 'green'}
                label="Lead Router"
                message={data?.routerHealthMessage}
                size="md"
              />
            </div>
          </GlassCard>
        </div>

        {/* Row 4: Alerts & Pace */}
        <div className="grid grid-cols-4 gap-4">
          <GlassCard 
            variant={(data?.noDataCampaigns || 0) > 0 ? 'danger' : undefined}
            className="col-span-1"
          >
            <div className="p-4">
              <AlertBadge 
                count={data?.noDataCampaigns || 0} 
                label="No Data Campaigns"
              />
              {(data?.noDataCampaigns || 0) === 0 && (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm">All campaigns reporting</span>
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard 
            variant={(data?.safeModeCount || 0) > 0 ? 'danger' : undefined}
            glow={(data?.safeModeCount || 0) > 0}
            className="col-span-1"
          >
            <div className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <AlertTriangle className="w-4 h-4" />
                Safe Mode Count
              </div>
              <div className={cn(
                "text-4xl font-bold",
                (data?.safeModeCount || 0) > 0 ? "text-destructive" : "text-success"
              )}>
                <AnimatedNumber value={data?.safeModeCount || 0} format="number" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="col-span-2">
            <div className="p-4">
              <BulletGraph
                value={data?.paceDriftPct || 0}
                label="Pace Drift"
                min={-50}
                max={50}
                target={0}
                greenRange={[-5, 5]}
                yellowRange={[-15, 15]}
              />
            </div>
          </GlassCard>
        </div>

        {/* AI Autopilot Section Header */}
        <div className="border-t border-border/50 pt-6">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">AI Autopilot</h2>
          </div>
        </div>

        {/* Row 5: AI Metrics */}
        <div className="grid grid-cols-6 gap-4">
          <GlassCard glow className="col-span-1">
            <div className="p-6 flex justify-center items-center h-full">
              <CircularProgress
                value={data?.suggestionAcceptanceRate || 0}
                label="Acceptance Rate"
                size="lg"
                greenThreshold={70}
                redThreshold={40}
              />
            </div>
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-6 flex justify-center items-center h-full">
              <SpeedometerGauge
                value={data?.avgConfidenceScore || 0}
                label="Avg Confidence"
                min={0}
                max={100}
                size="md"
              />
            </div>
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-4 h-full flex flex-col justify-center">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <PauseCircle className="w-4 h-4" />
                Ads Paused
              </div>
              <div className="text-4xl font-bold text-destructive">
                <AnimatedNumber value={data?.killCount || 0} format="number" />
              </div>
              <div className="text-xs text-muted-foreground/60">by AI this month</div>
            </div>
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-4 h-full flex flex-col justify-center">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <TrendingUp className="w-4 h-4" />
                Budget Increases
              </div>
              <div className="text-4xl font-bold text-success">
                <AnimatedNumber value={data?.scaleCount || 0} format="number" />
              </div>
              <div className="text-xs text-muted-foreground/60">by AI this month</div>
            </div>
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-4 h-full flex flex-col justify-center">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <XCircle className="w-4 h-4" />
                False Positive Rate
              </div>
              <div className={cn(
                "text-4xl font-bold",
                (data?.falsePositiveRate || 0) > 20 ? "text-warning" : "text-foreground"
              )}>
                <AnimatedNumber value={data?.falsePositiveRate || 0} format="percent" />
              </div>
              <div className="text-xs text-muted-foreground">
                {data?.totalProposals || 0} total proposals
              </div>
            </div>
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Zap className="w-4 h-4" />
                Optimization Freq
              </div>
              <div className="text-2xl font-bold text-foreground">
                <AnimatedNumber value={data?.optimizationFrequency || 0} format="number" />
                <span className="text-sm font-normal ml-1">/week</span>
              </div>
              <div className="text-xs text-muted-foreground">per campaign</div>
            </div>
          </GlassCard>
        </div>

        {/* Row 6: Bot Metrics (Placeholder) */}
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="col-span-1">
            <BotMetricsPlaceholder />
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-4">AI Performance Summary</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Acceptance Rate</span>
                  <span className={cn(
                    "text-sm font-bold",
                    (data?.suggestionAcceptanceRate || 0) >= 70 ? "text-success" : "text-warning"
                  )}>
                    {(data?.suggestionAcceptanceRate || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Budget Actions</span>
                  <span className="text-sm font-bold text-foreground">
                    {(data?.killCount || 0) + (data?.scaleCount || 0)} total
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Avg Weekly Optimizations</span>
                  <span className="text-sm font-bold text-foreground">
                    {(data?.optimizationFrequency || 0).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </AuroraBackground>
  );
}
