import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RefreshCw, Circle, TrendingUp, DollarSign, Users, Zap, Map } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SUPABASE_URL        = import.meta.env.VITE_SUPABASE_URL;
const CONSOLIDATED_CID    = '23706217116';
const CAMPAIGN_LABEL      = 'ALPHA AGENT EXCLUSIVE IUL SEARCH CAMPAIGN';
const MIN_WALLET_BALANCE  = 100;

// ── Data hooks ──

function usePoolStatus() {
  return useQuery({
    queryKey: ['consolidated-pool-status'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/lead-router/pool`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    refetchInterval: 60_000, // refresh every minute
  });
}

function useAttributionSummary() {
  return useQuery({
    queryKey: ['consolidated-attribution-summary'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/attribute-consolidated-spend/summary`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    refetchInterval: 5 * 60_000, // refresh every 5 min
  });
}

// Geographic tile-map layout for all 50 states + DC.
// Each entry is [abbr, row, col]. Null cells are empty grid positions.
// Layout follows the common "NPR/NYT-style" US tilemap (12 columns × 8 rows).
const STATE_TILES: Array<[string, number, number]> = [
  ['AK', 7, 0], ['HI', 7, 1],
  ['ME', 0, 11], ['VT', 1, 10], ['NH', 1, 9],
  ['WA', 1, 0], ['MT', 1, 1], ['ND', 1, 2], ['MN', 1, 3], ['WI', 1, 4], ['MI', 1, 5], ['NY', 2, 9], ['MA', 1, 8], ['RI', 2, 11],
  ['OR', 2, 0], ['ID', 2, 1], ['WY', 2, 2], ['SD', 2, 3], ['IA', 2, 4], ['IL', 2, 5], ['IN', 2, 6], ['OH', 2, 7], ['PA', 3, 9], ['NJ', 3, 10], ['CT', 2, 10],
  ['CA', 3, 0], ['NV', 3, 1], ['CO', 3, 2], ['NE', 3, 3], ['MO', 3, 4], ['KY', 3, 5], ['WV', 3, 6], ['VA', 3, 7], ['MD', 4, 9], ['DE', 4, 10], ['DC', 4, 11],
  ['AZ', 4, 1], ['NM', 4, 2], ['KS', 4, 3], ['AR', 4, 4], ['TN', 4, 5], ['NC', 4, 6], ['SC', 4, 7], ['GA', 5, 7],
  ['TX', 5, 2], ['OK', 5, 3], ['LA', 5, 4], ['MS', 5, 5], ['AL', 5, 6], ['FL', 6, 7],
];
const GRID_ROWS = 8;
const GRID_COLS = 12;

function useStateCoverage() {
  return useQuery({
    queryKey: ['consolidated-state-coverage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, states')
        .eq('status', 'active')
        .not('agent_id', 'is', null)
        .not('states', 'is', null);

      if (error) throw error;

      // Build { [stateAbbr]: { count, agents } }
      const coverage: Record<string, { count: number; agents: string[] }> = {};
      for (const client of data || []) {
        const abbrs = (client.states as string)
          .split(',')
          .map((s: string) => s.trim().toUpperCase())
          .filter(Boolean);
        for (const abbr of abbrs) {
          if (!coverage[abbr]) coverage[abbr] = { count: 0, agents: [] };
          coverage[abbr].count++;
          coverage[abbr].agents.push(client.name);
        }
      }
      return { coverage, total_agents: data?.length ?? 0 };
    },
    refetchInterval: 5 * 60_000,
  });
}

function useRecentConsolidatedLeads() {
  return useQuery({
    queryKey: ['consolidated-recent-leads'],
    queryFn: async () => {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());

      // Get today's CONS leads + last 10 individual leads for context
      const [consRes, allRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id, first_name, last_name, state, agent_id, created_at, delivery_status, clients!inner(name)')
          .eq('lead_source', 'CONSOLIDATED_ROUTER')
          .gte('created_at', today + 'T00:00:00Z')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('leads')
          .select('id, first_name, last_name, state, agent_id, lead_source, created_at, delivery_status, clients!inner(name)')
          .order('created_at', { ascending: false })
          .limit(15),
      ]);

      return {
        consolidated: consRes.data || [],
        recent:       allRes.data   || [],
      };
    },
    refetchInterval: 30_000,
  });
}

// ── Sub-components ──

function StatCard({
  label, value, sub, icon: Icon, color = 'text-primary',
}: { label: string; value: string; sub?: string; icon: any; color?: string }) {
  return (
    <Card className="bg-card/60 backdrop-blur-sm border-border/50">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-primary/10`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FillBar({ pct }: { pct: number }) {
  const filled = Math.min(Math.round(pct / 20), 5); // 0-5 blocks
  return (
    <div className="flex gap-0.5 items-center">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`h-2 w-4 rounded-sm ${i < filled ? 'bg-primary' : 'bg-border'}`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{pct.toFixed(0)}%</span>
    </div>
  );
}

function WalletBadge({ balance }: { balance: number }) {
  const color = balance > 500 ? 'text-emerald-400' : balance > 200 ? 'text-yellow-400' : 'text-red-400';
  return <span className={`font-mono text-sm font-medium ${color}`}>${balance.toFixed(0)}</span>;
}

function coverageColor(count: number): string {
  if (count === 0) return 'bg-muted/30 text-muted-foreground/40 border-border/20';
  if (count === 1) return 'bg-blue-950/60 text-blue-300 border-blue-800/40';
  if (count === 2) return 'bg-blue-800/70 text-blue-200 border-blue-600/50';
  if (count === 3) return 'bg-blue-600/80 text-white border-blue-400/60';
  return 'bg-primary/90 text-white border-primary/70'; // 4+
}

function StateCoverageMap({ coverage }: { coverage: Record<string, { count: number; agents: string[] }> }) {
  // Build lookup: "row-col" → tile abbr
  const grid: Array<Array<string | null>> = Array.from({ length: GRID_ROWS }, () =>
    Array(GRID_COLS).fill(null)
  );
  for (const [abbr, row, col] of STATE_TILES) {
    grid[row][col] = abbr;
  }

  const covered   = STATE_TILES.filter(([abbr]) => (coverage[abbr]?.count ?? 0) > 0).length;
  const uncovered = STATE_TILES.filter(([abbr]) => (coverage[abbr]?.count ?? 0) === 0).length;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span><span className="text-foreground font-semibold">{covered}</span> states covered</span>
          <span>·</span>
          <span><span className="text-red-400 font-semibold">{uncovered}</span> uncovered</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-muted/30 border border-border/20 inline-block" /> 0</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-950/60 border border-blue-800/40 inline-block" /> 1</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-800/70 border border-blue-600/50 inline-block" /> 2</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-600/80 border border-blue-400/60 inline-block" /> 3</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary/90 border border-primary/70 inline-block" /> 4+</span>
          </div>
        </div>

        {/* Grid */}
        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
        >
          {grid.flatMap((row, r) =>
            row.map((abbr, c) => {
              if (!abbr) {
                return <div key={`${r}-${c}`} />;
              }
              const info   = coverage[abbr];
              const count  = info?.count ?? 0;
              const agents = info?.agents ?? [];
              return (
                <Tooltip key={abbr}>
                  <TooltipTrigger asChild>
                    <div
                      className={`
                        rounded-sm border text-[9px] font-bold
                        flex items-center justify-center
                        aspect-square cursor-default select-none
                        transition-opacity hover:opacity-90
                        ${coverageColor(count)}
                      `}
                    >
                      {abbr}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="font-semibold">{abbr} — {count === 0 ? 'No coverage' : `${count} agent${count > 1 ? 's' : ''}`}</p>
                    {agents.length > 0 && (
                      <ul className="mt-1 text-xs space-y-0.5 text-muted-foreground">
                        {agents.map(a => <li key={a}>• {a}</li>)}
                      </ul>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ── Main Component ──

export function ConsolidatedRouterDashboard() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: pool,         isLoading: poolLoading }     = usePoolStatus();
  const { data: summary,      isLoading: summaryLoading }  = useAttributionSummary();
  const { data: leadsData,    isLoading: leadsLoading }    = useRecentConsolidatedLeads();
  const { data: coverageData, isLoading: coverageLoading } = useStateCoverage();

  const handleRunAttribution = useCallback(async () => {
    setRunning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/attribute-consolidated-spend/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({}),
      });
      const result = await res.json();
      if (result.ok) {
        toast.success(
          result.skipped
            ? `Attribution skipped: ${result.reason}`
            : `Attributed $${result.total_spend?.toFixed(2)} across ${result.agents_attributed} agents (CPL: $${result.cpl_with_fee?.toFixed(2)} w/fee)`
        );
        queryClient.invalidateQueries({ queryKey: ['consolidated-attribution-summary'] });
        queryClient.invalidateQueries({ queryKey: ['consolidated-pool-status'] });
      } else {
        toast.error(`Attribution failed: ${result.error}`);
      }
    } catch (e) {
      toast.error(`Error: ${String(e)}`);
    } finally {
      setRunning(false);
    }
  }, [queryClient]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['consolidated-pool-status'] });
    queryClient.invalidateQueries({ queryKey: ['consolidated-attribution-summary'] });
    queryClient.invalidateQueries({ queryKey: ['consolidated-recent-leads'] });
    queryClient.invalidateQueries({ queryKey: ['consolidated-state-coverage'] });
  };

  const isLoading = poolLoading || summaryLoading || leadsLoading || coverageLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Circle className="w-3 h-3 text-emerald-400 fill-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-foreground uppercase tracking-wider">
              {CAMPAIGN_LABEL}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleRunAttribution} disabled={running}>
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            {running ? 'Running...' : 'Run Attribution Now'}
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      {summaryLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Leads Routed Today"
            value={String(summary?.total_leads ?? 0)}
            sub="CONSOLIDATED_ROUTER"
            icon={Users}
          />
          <StatCard
            label="Campaign Spend"
            value={`$${(summary?.total_spend ?? 0).toFixed(2)}`}
            sub="Today (Google Ads)"
            icon={DollarSign}
            color="text-blue-400"
          />
          <StatCard
            label="Cost Per Lead"
            value={summary?.total_leads > 0 ? `$${(summary?.cpl_before_fee ?? 0).toFixed(2)}` : '—'}
            sub="Pre-fee"
            icon={TrendingUp}
            color="text-yellow-400"
          />
          <StatCard
            label="Agent CPL (w/ fee)"
            value={summary?.total_leads > 0 ? `$${(summary?.cpl_with_fee ?? 0).toFixed(2)}` : '—'}
            sub="+10% performance fee"
            icon={TrendingUp}
            color="text-emerald-400"
          />
        </div>
      )}

      {/* Agent Pool */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">
              Agent Pool
            </CardTitle>
            {!poolLoading && pool && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-emerald-400 font-medium">{pool.total_eligible} eligible</span>
                <span>·</span>
                <span className="text-yellow-400 font-medium">{pool.total_capped} capped</span>
                <span>·</span>
                <span className="text-red-400 font-medium">{pool.total_excluded} excluded</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {poolLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs w-[200px]">Agent</TableHead>
                  <TableHead className="text-xs">Wallet</TableHead>
                  <TableHead className="text-xs">Fill</TableHead>
                  <TableHead className="text-xs text-center">Leads</TableHead>
                  <TableHead className="text-xs text-center">Daily Max</TableHead>
                  <TableHead className="text-xs text-center">States</TableHead>
                  <TableHead className="text-xs text-center">Budget/mo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Eligible agents */}
                {(pool?.eligible || []).map((agent: any) => (
                  <TableRow key={agent.agent_id} className="border-border/30">
                    <TableCell className="py-2">
                      <span className="text-sm font-medium">{agent.name}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <WalletBadge balance={agent.wallet_balance} />
                    </TableCell>
                    <TableCell className="py-2">
                      <FillBar pct={agent.fill_pct} />
                    </TableCell>
                    <TableCell className="py-2 text-center text-sm">{agent.leads_today}</TableCell>
                    <TableCell className="py-2 text-center text-sm">{agent.daily_max}</TableCell>
                    <TableCell className="py-2 text-center text-sm">{agent.states_count}</TableCell>
                    <TableCell className="py-2 text-center text-sm">
                      ${(agent.monthly_budget || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Capped agents */}
                {(pool?.capped || []).map((agent: any) => (
                  <TableRow key={agent.agent_id} className="border-border/30 opacity-60">
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{agent.name}</span>
                        <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-400/30 py-0">FULL</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-2"><WalletBadge balance={agent.wallet_balance} /></TableCell>
                    <TableCell className="py-2"><FillBar pct={100} /></TableCell>
                    <TableCell className="py-2 text-center text-sm">{agent.leads_today}</TableCell>
                    <TableCell className="py-2 text-center text-sm">{agent.daily_max}</TableCell>
                    <TableCell className="py-2 text-center text-sm">{agent.states_count}</TableCell>
                    <TableCell className="py-2 text-center text-sm">
                      ${(agent.monthly_budget || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Excluded divider */}
                {(pool?.excluded || []).length > 0 && (
                  <TableRow className="border-border/30 bg-muted/20">
                    <TableCell colSpan={7} className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Excluded
                    </TableCell>
                  </TableRow>
                )}
                {/* Excluded agents */}
                {(pool?.excluded || []).map((agent: any) => (
                  <TableRow key={agent.agent_id} className="border-border/30 opacity-40">
                    <TableCell className="py-2">
                      <span className="text-sm">{agent.name}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <WalletBadge balance={agent.wallet_balance} />
                    </TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground" colSpan={4}>
                      ✗ {agent.exclude_reason}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* State Coverage Map */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                State Coverage
              </CardTitle>
            </div>
            {!coverageLoading && coverageData && (
              <span className="text-xs text-muted-foreground">
                {coverageData.total_agents} active agents
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {coverageLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : coverageData ? (
            <StateCoverageMap coverage={coverageData.coverage} />
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">No coverage data</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Leads + Cost Attribution side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Leads */}
        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">Recent Leads</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {leadsLoading ? (
              <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">St</TableHead>
                    <TableHead className="text-xs">Agent</TableHead>
                    <TableHead className="text-xs text-center">Src</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(leadsData?.recent || []).slice(0, 12).map((lead: any) => {
                    const isCons = lead.lead_source === 'CONSOLIDATED_ROUTER';
                    return (
                      <TableRow key={lead.id} className="border-border/30">
                        <TableCell className="py-1.5 text-xs text-muted-foreground">
                          {format(new Date(lead.created_at), 'h:mma')}
                        </TableCell>
                        <TableCell className="py-1.5 text-xs">
                          {lead.first_name} {lead.last_name}
                        </TableCell>
                        <TableCell className="py-1.5 text-xs font-mono">{lead.state}</TableCell>
                        <TableCell className="py-1.5 text-xs truncate max-w-[120px]">
                          {lead.clients?.name || '—'}
                        </TableCell>
                        <TableCell className="py-1.5 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[9px] py-0 px-1 ${isCons ? 'text-primary border-primary/30' : 'text-muted-foreground border-border/50'}`}
                          >
                            {isCons ? 'CONS' : 'IND'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!leadsData?.recent || leadsData.recent.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                        No leads yet today
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Cost Attribution */}
        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Cost Attribution</CardTitle>
              {summary && summary.total_leads > 0 && (
                <span className="text-xs text-muted-foreground">
                  ${(summary.total_spend ?? 0).toFixed(2)} ÷ {summary.total_leads} leads
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {summaryLoading ? (
              <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
            ) : summary?.total_leads > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs">Agent</TableHead>
                    <TableHead className="text-xs text-center">Leads</TableHead>
                    <TableHead className="text-xs text-right">Raw Cost</TableHead>
                    <TableHead className="text-xs text-right">w/ Fee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(summary.breakdown || [])
                    .sort((a: any, b: any) => b.leads - a.leads)
                    .map((row: any) => (
                      <TableRow key={row.agent_id || row.agent} className="border-border/30">
                        <TableCell className="py-1.5 text-xs font-medium">{row.agent}</TableCell>
                        <TableCell className="py-1.5 text-xs text-center">{row.leads}</TableCell>
                        <TableCell className="py-1.5 text-xs text-right font-mono">
                          ${(row.charged_before_fee ?? 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="py-1.5 text-xs text-right font-mono text-primary">
                          ${(row.charged_with_fee ?? 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  {/* Totals row */}
                  <TableRow className="border-t border-border/50 bg-muted/20">
                    <TableCell className="py-2 text-xs font-semibold">Total</TableCell>
                    <TableCell className="py-2 text-xs text-center font-semibold">{summary.total_leads}</TableCell>
                    <TableCell className="py-2 text-xs text-right font-mono font-semibold">
                      ${(summary.total_spend ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="py-2 text-xs text-right font-mono font-semibold text-primary">
                      ${((summary.total_spend ?? 0) * 1.10).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                {summary?.total_spend > 0
                  ? 'No leads yet — attribution will run when leads arrive'
                  : 'No spend data yet for today'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
