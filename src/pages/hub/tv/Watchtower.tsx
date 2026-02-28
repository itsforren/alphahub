import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, AlertTriangle, Clock, Users, MessageSquare, Ticket, 
  DollarSign, CreditCard, ShieldAlert, TrendingUp, TrendingDown,
  RefreshCw, Banknote, Gavel
} from 'lucide-react';
import { useWatchtowerData } from '@/hooks/useWatchtowerData';
import { AuroraBackground, GlassCard, AnimatedNumber } from '@/components/tv';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// Color constants
const COLORS = {
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  danger: 'hsl(var(--destructive))',
  muted: 'hsl(var(--muted-foreground))',
};

// Live indicator
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
        transition={{ duration: 1, repeat: isLoading ? Infinity : 0 }}
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
      <RefreshCw className={cn("w-3 h-3 text-muted-foreground/50", isLoading && "animate-spin")} />
    </div>
  );
});

// NPS Gauge Component - LARGER
const NPSGauge = memo(function NPSGauge({ 
  score, 
  trend 
}: { 
  score: number | null; 
  trend: number | null;
}) {
  const percentage = score !== null ? ((score + 100) / 200) * 100 : 50;
  const rotation = (percentage / 100) * 180 - 90;
  
  const getColor = () => {
    if (score === null) return COLORS.muted;
    if (score >= 50) return COLORS.success;
    if (score >= 0) return COLORS.warning;
    return COLORS.danger;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-40 h-20 overflow-hidden">
        <div className="absolute inset-0 border-[8px] border-muted/30 rounded-t-full" />
        <motion.div 
          className="absolute bottom-0 left-1/2 w-1.5 h-16 origin-bottom rounded-full"
          style={{ backgroundColor: getColor() }}
          initial={{ rotate: -90 }}
          animate={{ rotate: rotation }}
          transition={{ type: 'spring', stiffness: 60 }}
        />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-foreground" />
      </div>
      <div className="text-center">
        <div className="text-5xl font-bold" style={{ color: getColor() }}>
          {score !== null ? score : '—'}
        </div>
        <div className="text-sm text-muted-foreground mt-1">NPS Score</div>
        {trend !== null && (
          <div className={cn(
            "flex items-center justify-center gap-1 text-sm mt-1",
            trend >= 0 ? "text-success" : "text-destructive"
          )}>
            {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {trend >= 0 ? '+' : ''}{trend}
          </div>
        )}
      </div>
    </div>
  );
});

// Client Status - Beautiful Horizontal Display
const ClientStatusDisplay = memo(function ClientStatusDisplay({ 
  counts 
}: { 
  counts: { live: number; onboarding: number; paused: number; atRisk: number; churned: number };
}) {
  const statuses = [
    { key: 'live', label: 'Live', count: counts.live, color: 'text-success', bg: 'bg-success/20', border: 'border-success/40' },
    { key: 'onboarding', label: 'Onboarding', count: counts.onboarding, color: 'text-primary', bg: 'bg-primary/20', border: 'border-primary/40' },
    { key: 'paused', label: 'Paused', count: counts.paused, color: 'text-warning', bg: 'bg-warning/20', border: 'border-warning/40' },
    { key: 'atRisk', label: 'At Risk', count: counts.atRisk, color: 'text-destructive', bg: 'bg-destructive/20', border: 'border-destructive/40' },
  ];

  const total = statuses.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="flex flex-col h-full justify-center gap-4 px-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="w-5 h-5" />
        <span>Client Status</span>
        <span className="text-foreground font-semibold">({total} total)</span>
      </div>
      <div className="flex gap-3">
        {statuses.map((status) => (
          <motion.div
            key={status.key}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "flex-1 rounded-xl border-2 p-4 text-center",
              status.bg,
              status.border
            )}
          >
            <div className={cn("text-4xl font-bold", status.color)}>
              <AnimatedNumber value={status.count} format="number" />
            </div>
            <div className="text-xs text-muted-foreground mt-1">{status.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

// Traffic Light SLA - LARGER
const TrafficLight = memo(function TrafficLight({ 
  value, 
  label 
}: { 
  value: number; 
  label: string;
}) {
  const getColor = () => {
    if (value >= 90) return 'success';
    if (value >= 70) return 'warning';
    return 'danger';
  };
  const color = getColor();

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-col gap-2 p-3 bg-muted/20 rounded-xl">
        {['success', 'warning', 'danger'].map(c => (
          <motion.div
            key={c}
            className={cn(
              "w-8 h-8 rounded-full transition-all"
            )}
            animate={c === color ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              backgroundColor: c === color 
                ? (c === 'danger' ? COLORS.danger : c === 'warning' ? COLORS.warning : COLORS.success)
                : 'hsl(var(--muted) / 0.3)',
              boxShadow: c === color 
                ? `0 0 30px ${c === 'danger' ? COLORS.danger : c === 'warning' ? COLORS.warning : COLORS.success}`
                : 'none'
            }}
          />
        ))}
      </div>
      <div className="text-center">
        <div className="text-4xl font-bold">{value}%</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
});

// Large Metric Scorecard
const LargeScorecard = memo(function LargeScorecard({ 
  icon: Icon, 
  label, 
  value, 
  suffix = '', 
  format = 'number',
  variant = 'default',
  pulse = false
}: { 
  icon: typeof Clock;
  label: string;
  value: number;
  suffix?: string;
  format?: 'number' | 'currency' | 'time';
  variant?: 'default' | 'danger' | 'warning' | 'success';
  pulse?: boolean;
}) {
  const textColor = {
    default: 'text-foreground',
    danger: 'text-destructive',
    warning: 'text-warning',
    success: 'text-success',
  }[variant];

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <Icon className={cn("w-8 h-8 mb-2", variant === 'default' ? 'text-muted-foreground' : textColor)} />
      <motion.div
        animate={pulse ? { scale: [1, 1.08, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        className={cn("text-5xl font-bold", textColor)}
      >
        {format === 'currency' ? (
          <AnimatedNumber value={value} format="currency" />
        ) : format === 'time' ? (
          <>{value}{suffix}</>
        ) : (
          <AnimatedNumber value={value} format="number" />
        )}
        {format === 'number' && suffix}
      </motion.div>
      <div className="text-sm text-muted-foreground text-center mt-2">{label}</div>
    </div>
  );
});

export default function Watchtower() {
  const { data, isLoading, dataUpdatedAt } = useWatchtowerData();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (dataUpdatedAt) {
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt]);

  return (
    <AuroraBackground>
      <div className="h-screen p-6 flex flex-col gap-5 overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between shrink-0"
        >
          <div className="flex items-center gap-4">
            <Eye className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">The Watchtower</h1>
              <p className="text-muted-foreground text-sm">Ops & Problems Dashboard</p>
            </div>
            <LiveIndicator lastUpdated={lastUpdated} isLoading={isLoading} />
          </div>
        </motion.div>

        {/* Row 1: Status Overview (30%) */}
        <div className="grid grid-cols-4 gap-5 h-[30%]">
          <GlassCard className="col-span-1">
            <div className="p-4 h-full flex items-center justify-center">
              <NPSGauge score={data?.npsScore ?? null} trend={data?.npsTrend ?? null} />
            </div>
          </GlassCard>
          
          <GlassCard className="col-span-2">
            <ClientStatusDisplay counts={data?.clientStatusCounts || { live: 0, onboarding: 0, paused: 0, atRisk: 0, churned: 0 }} />
          </GlassCard>

          <GlassCard className="col-span-1">
            <div className="p-4 h-full flex items-center justify-center">
              <TrafficLight value={data?.slaCompliancePercent || 0} label="SLA Compliance" />
            </div>
          </GlassCard>
        </div>

        {/* Row 2: Support Metrics (35%) */}
        <div className="grid grid-cols-5 gap-5 h-[35%]">
          <GlassCard className="col-span-1">
            <LargeScorecard 
              icon={Clock} 
              label="Avg Onboarding" 
              value={data?.avgOnboardingDays || 0} 
              suffix=" days"
              format="time"
            />
          </GlassCard>

          <GlassCard className="col-span-1">
            <LargeScorecard 
              icon={MessageSquare} 
              label="Chat Response" 
              value={data?.avgChatResponseMinutes || 0} 
              suffix=" min"
              format="time"
              variant={data?.avgChatResponseMinutes && data.avgChatResponseMinutes > 60 ? 'danger' : 'default'}
            />
          </GlassCard>

          <GlassCard className="col-span-1">
            <LargeScorecard 
              icon={Ticket} 
              label="Ticket Resolution" 
              value={data?.avgTicketResolutionHours || 0} 
              suffix=" hrs"
              format="time"
              variant={data?.avgTicketResolutionHours && data.avgTicketResolutionHours > 24 ? 'danger' : 'default'}
            />
          </GlassCard>

          <GlassCard className="col-span-1">
            <LargeScorecard 
              icon={Ticket} 
              label="Open Tickets" 
              value={data?.openTicketCount || 0}
            />
          </GlassCard>

          <GlassCard 
            variant={(data?.oldestOpenTicketHours || 0) > 24 ? 'danger' : undefined}
            glow={(data?.oldestOpenTicketHours || 0) > 24}
            className="col-span-1"
          >
            <LargeScorecard 
              icon={AlertTriangle} 
              label="Oldest Ticket" 
              value={data?.oldestOpenTicketHours || 0} 
              suffix=" hrs"
              format="time"
              variant={(data?.oldestOpenTicketHours || 0) > 24 ? 'danger' : 'default'}
              pulse={(data?.oldestOpenTicketHours || 0) > 24}
            />
          </GlassCard>
        </div>

        {/* Row 3: Financial Alerts (35%) */}
        <div className="grid grid-cols-5 gap-5 flex-1">
          <GlassCard 
            variant={(data?.disputeCount || 0) > 0 ? 'danger' : undefined}
            glow={(data?.disputeCount || 0) > 0}
            className="col-span-1"
          >
            <LargeScorecard 
              icon={Gavel} 
              label="Active Disputes" 
              value={data?.disputeCount || 0}
              variant={(data?.disputeCount || 0) > 0 ? 'danger' : 'default'}
              pulse={(data?.disputeCount || 0) > 0}
            />
          </GlassCard>

          <GlassCard 
            variant={(data?.overdueCount || 0) > 0 ? 'danger' : undefined}
            glow={(data?.overdueCount || 0) > 0}
            className="col-span-1"
          >
            <div className="p-4 h-full flex flex-col items-center justify-center">
              <DollarSign className={cn(
                "w-8 h-8 mb-2",
                (data?.overdueCount || 0) > 0 ? "text-destructive" : "text-muted-foreground"
              )} />
              <div className={cn(
                "text-5xl font-bold",
                (data?.overdueCount || 0) > 0 ? "text-destructive" : "text-foreground"
              )}>
                {data?.overdueCount || 0}
              </div>
              <div className="text-sm text-muted-foreground mt-2">Overdue Invoices</div>
              <div className="text-lg font-medium text-destructive">
                <AnimatedNumber value={data?.overdueAmount || 0} format="currency" />
              </div>
            </div>
          </GlassCard>

          <GlassCard 
            variant={(data?.failedPaymentsAmount || 0) > 0 ? 'danger' : undefined}
            className="col-span-1"
          >
            <LargeScorecard 
              icon={CreditCard} 
              label="Failed Payments (7d)" 
              value={data?.failedPaymentsAmount || 0}
              format="currency"
              variant={(data?.failedPaymentsAmount || 0) > 0 ? 'danger' : 'default'}
            />
          </GlassCard>

          <GlassCard className="col-span-1">
            <LargeScorecard 
              icon={Banknote} 
              label="In Collections" 
              value={data?.collectionsCount || 0}
            />
          </GlassCard>

          <GlassCard 
            variant={(data?.safeModeCount || 0) > 0 ? 'warning' : undefined}
            className="col-span-1"
          >
            <LargeScorecard 
              icon={ShieldAlert} 
              label="Safe Mode" 
              value={data?.safeModeCount || 0}
              variant={(data?.safeModeCount || 0) > 0 ? 'warning' : 'default'}
            />
          </GlassCard>
        </div>
      </div>
    </AuroraBackground>
  );
}
