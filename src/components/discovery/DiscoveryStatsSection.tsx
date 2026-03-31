import { Badge } from '@/components/ui/badge';
import { Clock, Phone, Calendar, Repeat, Layers, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDiscoveryCallStats } from '@/hooks/useDiscoveryCallStats';
import { OutcomeBadge } from './OutcomeSelector';
import type { DiscoveryCall } from '@/hooks/useDiscoveryCalls';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface DiscoveryStatsSectionProps {
  agentId: string;
}

// ── Formatters ──────────────────────────────────────────────────────────────

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

// ── Stage config ─────────────────────────────────────────────────────────────

const STAGE_ORDER = [
  'new', 'attempt_1', 'attempt_2', 'attempt_3', 'attempt_4',
  'callback_scheduled', 'intro_scheduled', 'discovery_complete',
  'strategy_booked', 'booked', 'completed',
  'long_term_nurture', 'no_show', 'strategy_no_show', 'lost',
];

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  attempt_1: 'Attempt 1',
  attempt_2: 'Attempt 2',
  attempt_3: 'Attempt 3',
  attempt_4: 'Attempt 4',
  callback_scheduled: 'Callback',
  intro_scheduled: 'Intro Booked',
  discovery_complete: 'Needs Booking',
  strategy_booked: 'Strategy Booked',
  booked: 'Booked',
  completed: 'Completed',
  long_term_nurture: 'Nurture',
  no_show: 'No-Show',
  strategy_no_show: 'Zoom No-Show',
  lost: 'Lost',
};

const STAGE_COLORS: Record<string, string> = {
  new: '#3b82f6',
  attempt_1: '#f59e0b',
  attempt_2: '#f97316',
  attempt_3: '#ef4444',
  attempt_4: '#dc2626',
  callback_scheduled: '#eab308',
  intro_scheduled: '#22c55e',
  discovery_complete: '#f59e0b',
  strategy_booked: '#16a34a',
  booked: '#4ade80',
  completed: '#86efac',
  long_term_nurture: '#a855f7',
  no_show: '#f87171',
  strategy_no_show: '#fca5a5',
  lost: '#6b7280',
};

function stageOrderIndex(stage: string): number {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx >= 0 ? idx : 99;
}

// ── Main component ────────────────────────────────────────────────────────────

export function DiscoveryStatsSection({ agentId }: DiscoveryStatsSectionProps) {
  const { data: stats, isLoading } = useDiscoveryCallStats(agentId);

  if (isLoading || !stats) return null;

  const totalQueue = stats.queueDepth.reduce((sum, d) => sum + d.count, 0);

  const pieData = stats.attemptDistribution
    .filter((d) => d.count > 0)
    .sort((a, b) => stageOrderIndex(a.stage) - stageOrderIndex(b.stage))
    .map((d) => ({
      name: STAGE_LABELS[d.stage] || d.stage,
      value: d.count,
      color: STAGE_COLORS[d.stage] || '#6b7280',
    }));

  const totalLeads = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative rounded-2xl border border-white/[0.05] bg-white/[0.01] backdrop-blur-xl overflow-hidden">
      {/* Top shine */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.10] to-transparent" />

      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Phone className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Dial Performance</h3>
            <p className="text-[11px] text-muted-foreground">Discovery call activity & pipeline</p>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <KpiCard icon={Clock}    label="Speed to Lead"  value={formatDuration(stats.speedToLeadMinutes)} color="text-blue-400" />
          <KpiCard icon={Phone}    label="Connection"     value={formatPercent(stats.connectionRate)}      color="text-green-400" />
          <KpiCard icon={Calendar} label="Booking Rate"   value={formatPercent(stats.bookingRate)}         color="text-purple-400" />
          <KpiCard icon={Repeat}   label="Avg Attempts"   value={stats.avgAttemptsToBook !== null ? stats.avgAttemptsToBook.toFixed(1) : '—'} color="text-amber-400" />
          <KpiCard icon={Layers}   label="In Queue"       value={String(totalQueue)}                       color="text-cyan-400" />
          <KpiCard icon={XCircle}  label="Lost Rate"      value={formatPercent(stats.lostRate)}            color="text-red-400" />
        </div>

        {/* Pipeline + Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Donut chart */}
          <div className="relative rounded-xl border border-white/[0.05] bg-white/[0.01] backdrop-blur-sm p-4">
            <p className="text-xs font-semibold text-foreground mb-3">Pipeline Distribution</p>
            <div className="flex items-center gap-4">
              {/* Donut */}
              <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={54}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} opacity={0.9} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
                      formatter={(value: number, name: string) => [`${value} leads`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-black text-foreground">{totalLeads}</span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wide">leads</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-1.5 min-w-0">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                      <span className="text-[11px] text-muted-foreground truncate">{entry.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-foreground flex-shrink-0">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="relative rounded-xl border border-white/[0.05] bg-white/[0.01] backdrop-blur-sm p-4">
            <p className="text-xs font-semibold text-foreground mb-3">Recent Activity</p>
            {stats.recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No calls yet</p>
            ) : (
              <div className="space-y-0">
                {stats.recentActivity.slice(0, 8).map((call: DiscoveryCall) => (
                  <div key={call.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-muted-foreground/60 flex-shrink-0 tabular-nums">
                        {new Date(call.call_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-xs font-medium text-foreground/80 truncate">
                        {call.called_by_name || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      {call.answered ? (
                        <OutcomeBadge outcome={call.outcome} />
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-white/[0.03] border-white/[0.08] text-white/40">
                          No Answer
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── KPI Card — matches MetricCard (glass-panel-premium style) ────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="glass-panel-premium p-4 group transition-all duration-300 hover:border-white/[0.1] cursor-default" style={{ background: 'rgba(255,255,255,0.008)' }}>
      {/* Corner glow */}
      <div className="absolute top-0 left-0 w-24 h-24 bg-primary/[0.03] rounded-full blur-3xl -translate-x-8 -translate-y-8 group-hover:bg-primary/[0.06] transition-colors duration-700" />
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">{label}</p>
          <p className="text-xl font-semibold text-luxury tracking-tight">{value}</p>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] group-hover:border-primary/20 transition-colors duration-300">
          <Icon className={cn('w-3.5 h-3.5', color)} />
        </div>
      </div>
    </div>
  );
}
