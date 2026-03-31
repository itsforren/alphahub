import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Phone, Calendar, Repeat, ListTodo, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDiscoveryCallStats } from '@/hooks/useDiscoveryCallStats';
import { OutcomeBadge } from './OutcomeSelector';
import type { DiscoveryCall } from '@/hooks/useDiscoveryCalls';

interface DiscoveryStatsSectionProps {
  agentId: string;
}

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

export function DiscoveryStatsSection({ agentId }: DiscoveryStatsSectionProps) {
  const { data: stats, isLoading } = useDiscoveryCallStats(agentId);

  if (isLoading || !stats) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Phone className="h-4 w-4" />
        Discovery Call Activity
      </h3>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={Clock}
          label="Speed to Lead"
          value={formatDuration(stats.speedToLeadMinutes)}
          accent="blue"
        />
        <StatCard
          icon={Phone}
          label="Connection Rate"
          value={formatPercent(stats.connectionRate)}
          accent="green"
        />
        <StatCard
          icon={Calendar}
          label="Booking Rate"
          value={formatPercent(stats.bookingRate)}
          accent="purple"
        />
        <StatCard
          icon={Repeat}
          label="Avg Attempts to Book"
          value={stats.avgAttemptsToBook !== null ? stats.avgAttemptsToBook.toFixed(1) : '—'}
          accent="amber"
        />
        <StatCard
          icon={ListTodo}
          label="Queue Depth"
          value={String(stats.queueDepth.reduce((sum, d) => sum + d.count, 0))}
          accent="blue"
        />
        <StatCard
          icon={XCircle}
          label="Lost Rate"
          value={formatPercent(stats.lostRate)}
          accent="red"
        />
      </div>

      {/* Attempt Distribution + Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Attempt Distribution */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pipeline Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.attemptDistribution
              .filter((d) => d.count > 0)
              .sort((a, b) => stageOrderIndex(a.stage) - stageOrderIndex(b.stage))
              .map((d) => (
                <div key={d.stage} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 truncate">
                    {formatStageName(d.stage)}
                  </span>
                  <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', stageBarColor(d.stage))}
                      style={{ width: `${Math.min((d.count / Math.max(...stats.attemptDistribution.map((x) => x.count))) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-foreground w-8 text-right">{d.count}</span>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No calls yet</p>
            ) : (
              stats.recentActivity.map((call: DiscoveryCall) => (
                <div key={call.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground">
                      {new Date(call.call_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="font-medium text-foreground truncate">
                      {call.called_by_name || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {call.answered ? (
                      <OutcomeBadge outcome={call.outcome} />
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-muted/30">
                        No Answer
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent: 'blue' | 'green' | 'purple' | 'amber' | 'pink' | 'red';
}) {
  const colors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    pink: 'text-pink-400',
    red: 'text-red-400',
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className={cn('h-3.5 w-3.5', colors[accent])} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </span>
        </div>
        <div className="text-lg font-black text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}

const STAGE_ORDER = ['new', 'attempt_1', 'attempt_2', 'attempt_3', 'attempt_4', 'booked', 'completed', 'long_term_nurture', 'lost'];

function stageOrderIndex(stage: string): number {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx >= 0 ? idx : 99;
}

function formatStageName(stage: string): string {
  const map: Record<string, string> = {
    new: 'New',
    attempt_1: 'Attempt 1',
    attempt_2: 'Attempt 2',
    attempt_3: 'Attempt 3',
    attempt_4: 'Attempt 4',
    booked: 'Booked',
    completed: 'Completed',
    long_term_nurture: 'Nurture',
    lost: 'Lost',
  };
  return map[stage] || stage;
}

function stageBarColor(stage: string): string {
  const map: Record<string, string> = {
    new: 'bg-blue-500',
    attempt_1: 'bg-amber-500',
    attempt_2: 'bg-orange-500',
    attempt_3: 'bg-red-500',
    attempt_4: 'bg-red-600',
    booked: 'bg-green-500',
    completed: 'bg-green-400',
    long_term_nurture: 'bg-purple-500',
    lost: 'bg-muted-foreground/50',
  };
  return map[stage] || 'bg-primary';
}
