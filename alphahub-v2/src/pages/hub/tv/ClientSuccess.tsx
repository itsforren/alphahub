import { memo } from 'react';
import { Users, Target, Trophy, DollarSign, TrendingUp, Zap, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import { useClientSuccessData, AgentRank } from '@/hooks/useClientSuccessData';
import { GlassCard } from '@/components/tv/GlassCard';
import { AnimatedNumber } from '@/components/tv/AnimatedNumber';
import { GlassTable } from '@/components/tv/GlassTable';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Consistent color palette for visual harmony
const COLORS = {
  leads: '#60a5fa',      // Blue-400
  booked: '#a78bfa',     // Purple-400
  submitted: '#fbbf24',  // Amber-400
  approved: '#4ade80',   // Green-400
  issued: '#22d3ee',     // Cyan-400
};

// Live indicator component
const LiveIndicator = memo(({ lastUpdated, isRefetching }: { lastUpdated: Date | null; isRefetching: boolean }) => (
  <div className="flex items-center gap-3 text-sm">
    <div className="relative flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
      </span>
      <span className="text-emerald-400 font-semibold tracking-wide">LIVE</span>
    </div>
    <span className="text-muted-foreground/80">
      {isRefetching ? (
        <span className="flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Refreshing...
        </span>
      ) : lastUpdated ? (
        format(lastUpdated, 'h:mm a')
      ) : null}
    </span>
  </div>
));
LiveIndicator.displayName = 'LiveIndicator';

// Hero metric card with massive numbers
const HeroMetric = memo(({ 
  icon: Icon, 
  value, 
  label, 
  rate, 
  color,
  isCurrency = false,
}: { 
  icon: React.ElementType;
  value: number; 
  label: string;
  rate?: number;
  color: string;
  isCurrency?: boolean;
}) => {
  return (
    <GlassCard className="p-4 flex flex-col items-center justify-center relative overflow-hidden">
      <Icon className="h-8 w-8 mb-2" style={{ color }} />
      <span 
        className="text-6xl xl:text-7xl font-black tabular-nums tracking-tight"
        style={{ color, textShadow: `0 0 30px ${color}60` }}
      >
        {isCurrency ? '$' : ''}
        <AnimatedNumber value={isCurrency && value >= 1000 ? Math.round(value / 1000) : value} format="number" />
        {isCurrency && value >= 1000 ? 'k' : ''}
      </span>
      <span className="text-sm text-muted-foreground mt-2 uppercase tracking-widest font-medium">{label}</span>
      {rate !== undefined && rate > 0 && (
        <span className="text-base font-semibold mt-1" style={{ color: color + 'cc' }}>
          {rate.toFixed(1)}%
        </span>
      )}
    </GlassCard>
  );
});
HeroMetric.displayName = 'HeroMetric';

// Cost metric card - larger numbers
const CostCard = memo(({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) => (
  <GlassCard className={cn(
    "p-3 flex flex-col items-center justify-center",
    highlight && "bg-emerald-500/10 border-emerald-500/40"
  )}>
    <span className={cn(
      "text-3xl xl:text-4xl font-bold tabular-nums",
      highlight ? "text-emerald-400" : "text-foreground"
    )}>
      ${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)}
    </span>
    <span className="text-xs text-muted-foreground mt-1.5 uppercase tracking-wider font-medium">{label}</span>
  </GlassCard>
));
CostCard.displayName = 'CostCard';

// Mini leaderboard columns
const miniLeaderboardColumns = (isCurrency = false) => [
  { key: 'rank' as const, header: '#', className: 'w-6 px-1', render: (agent: AgentRank) => (
    <span className={cn(
      "text-sm font-bold",
      agent.rank === 1 && "text-yellow-400",
      agent.rank === 2 && "text-gray-300",
      agent.rank === 3 && "text-amber-600"
    )}>
      {agent.rank}
    </span>
  )},
  { key: 'name' as const, header: 'Agent', className: 'px-1', render: (agent: AgentRank) => (
    <span className="truncate max-w-[60px] block text-sm font-medium">{agent.name}</span>
  )},
  { key: 'value' as const, header: '', align: 'right' as const, className: 'px-1', render: (agent: AgentRank) => (
    <span className="font-mono text-base font-bold text-primary">
      {isCurrency ? `$${(agent.value / 1000).toFixed(0)}k` : agent.value.toLocaleString()}
    </span>
  )},
];

// Custom chart tooltip
const ChartTooltip = memo(({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  
  return (
    <div className="bg-background/95 backdrop-blur-md border border-border/50 rounded-lg p-3 shadow-2xl">
      <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm py-0.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-bold" style={{ color: entry.color }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
});
ChartTooltip.displayName = 'ChartTooltip';

function ClientSuccess() {
  const { data, isLoading, isRefetching } = useClientSuccessData();
  
  if (isLoading) {
    return (
      <div className="p-6 space-y-4 h-screen bg-gradient-to-br from-background via-background to-background/95">
        <div className="grid grid-cols-4 gap-4" style={{ height: '28%' }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[42%] rounded-2xl" />
        <div className="grid grid-cols-7 gap-3" style={{ height: '24%' }}>
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!data) return null;
  
  // Format chart data
  const chartData = data.dailyMetrics.map(d => ({
    date: format(parseISO(d.date), 'M/d'),
    Leads: d.leads,
    Booked: d.booked,
    Submitted: d.submitted,
    Approved: d.approved,
    Issued: d.issued,
  }));
  
  const lineConfig = [
    { dataKey: 'Leads', color: COLORS.leads, name: 'Leads' },
    { dataKey: 'Booked', color: COLORS.booked, name: 'Booked' },
    { dataKey: 'Submitted', color: COLORS.submitted, name: 'Submitted' },
    { dataKey: 'Approved', color: COLORS.approved, name: 'Approved' },
    { dataKey: 'Issued', color: COLORS.issued, name: 'Issued' },
  ];
  
  return (
    <div className="p-6 h-screen flex flex-col gap-5 overflow-hidden bg-gradient-to-br from-background via-background to-background/95">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-bold tracking-tight">Client Success</h1>
          <span className="text-sm text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">30 Day Rolling</span>
        </div>
        <LiveIndicator lastUpdated={data.lastUpdated} isRefetching={isRefetching} />
      </div>
      
      {/* Row 1: Hero Metrics - 4 massive cards */}
      <div className="grid grid-cols-4 gap-5 flex-shrink-0" style={{ height: '26%' }}>
        <HeroMetric 
          icon={Users} 
          value={data.totalLeads} 
          label="Leads" 
          color={COLORS.leads}
        />
        <HeroMetric 
          icon={Target} 
          value={data.totalBookedCalls} 
          label="Booked Calls" 
          rate={data.bookedRate}
          color={COLORS.booked}
        />
        <HeroMetric 
          icon={Send} 
          value={data.totalSubmittedApps} 
          label="Submitted" 
          rate={data.submissionRate}
          color={COLORS.submitted}
        />
        <HeroMetric 
          icon={CheckCircle2} 
          value={data.totalIssuedPaid} 
          label="Issued Paid" 
          rate={data.issuedPaidRate}
          color={COLORS.issued}
        />
      </div>
      
      {/* Row 2: Multi-line Trend Chart */}
      <GlassCard className="flex-1 p-5 min-h-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            30-Day Funnel Performance
          </h3>
          <div className="flex items-center gap-4">
            {lineConfig.map(line => (
              <div key={line.dataKey} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: line.color }} />
                <span className="text-xs text-muted-foreground">{line.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="h-[calc(100%-32px)]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                {lineConfig.map(line => (
                  <filter key={`glow-${line.dataKey}`} id={`glow-${line.dataKey}`}>
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.2} />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                width={35}
              />
              <Tooltip content={<ChartTooltip />} />
              {lineConfig.map(line => (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  filter={`url(#glow-${line.dataKey})`}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
      
      {/* Row 3: Cost Metrics + Mini Leaderboards */}
      <div className="grid grid-cols-7 gap-4 flex-shrink-0" style={{ height: '22%' }}>
        {/* Cost Metrics - 3 columns */}
        <CostCard label="Cost / Booked" value={data.cpbc} />
        <CostCard label="Cost / Submitted" value={data.cpsa} />
        <CostCard label="Cost / Issued" value={data.cpIssuedPaid} />
        
        {/* Leaderboards - 4 columns */}
        <GlassCard className="p-3 flex flex-col overflow-hidden">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 flex-shrink-0 uppercase tracking-wide">
            <Users className="h-3.5 w-3.5" style={{ color: COLORS.leads }} />
            Top Leads
          </h3>
          <div className="overflow-hidden flex-1">
            {data.topAgentsByLeadVolume.length > 0 ? (
              <GlassTable
                data={data.topAgentsByLeadVolume}
                columns={miniLeaderboardColumns()}
                keyExtractor={(agent) => agent.id}
                compact
              />
            ) : (
              <div className="text-xs text-muted-foreground/60 text-center py-4">No data</div>
            )}
          </div>
        </GlassCard>
        
        <GlassCard className="p-3 flex flex-col overflow-hidden">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 flex-shrink-0 uppercase tracking-wide">
            <Target className="h-3.5 w-3.5" style={{ color: COLORS.booked }} />
            Top Booked
          </h3>
          <div className="overflow-hidden flex-1">
            {data.topAgentsByBookedCalls.length > 0 ? (
              <GlassTable
                data={data.topAgentsByBookedCalls}
                columns={miniLeaderboardColumns()}
                keyExtractor={(agent) => agent.id}
                compact
              />
            ) : (
              <div className="text-xs text-muted-foreground/60 text-center py-4">No data</div>
            )}
          </div>
        </GlassCard>
        
        <GlassCard className="p-3 flex flex-col overflow-hidden">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 flex-shrink-0 uppercase tracking-wide">
            <DollarSign className="h-3.5 w-3.5" style={{ color: COLORS.approved }} />
            Top Premium
          </h3>
          <div className="overflow-hidden flex-1">
            {data.topAgentsByIssuedPremium.length > 0 ? (
              <GlassTable
                data={data.topAgentsByIssuedPremium}
                columns={miniLeaderboardColumns(true)}
                keyExtractor={(agent) => agent.id}
                compact
              />
            ) : (
              <div className="text-xs text-muted-foreground/60 text-center py-4">No data</div>
            )}
          </div>
        </GlassCard>
        
        <GlassCard className="p-3 flex flex-col overflow-hidden">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 flex-shrink-0 uppercase tracking-wide">
            <Trophy className="h-3.5 w-3.5 text-yellow-400" />
            Referrers
          </h3>
          <div className="overflow-hidden flex-1">
            {data.topReferringAgents.length > 0 ? (
              <GlassTable
                data={data.topReferringAgents}
                columns={miniLeaderboardColumns()}
                keyExtractor={(agent) => agent.id}
                compact
              />
            ) : (
              <div className="text-xs text-muted-foreground/60 text-center py-4">No data</div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export default memo(ClientSuccess);
