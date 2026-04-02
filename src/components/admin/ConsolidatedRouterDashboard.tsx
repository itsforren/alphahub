import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, Circle, TrendingUp, DollarSign, Users, Zap } from 'lucide-react';
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

const ALL_STATES = [
  'AK','AL','AR','AZ','CA','CO','CT','DC','DE','FL',
  'GA','HI','IA','ID','IL','IN','KS','KY','LA','MA',
  'MD','ME','MI','MN','MO','MS','MT','NC','ND','NE',
  'NH','NJ','NM','NV','NY','OH','OK','OR','PA','RI',
  'SC','SD','TN','TX','UT','VA','VT','WA','WI','WV','WY',
];

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

const isTestLead = (l: { first_name?: string | null; last_name?: string | null }) =>
  `${l.first_name ?? ''} ${l.last_name ?? ''}`.toLowerCase().includes('test');

function useRecentConsolidatedLeads() {
  return useQuery({
    queryKey: ['consolidated-recent-leads'],
    queryFn: async () => {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

      // leads has no FK to clients — query leads first, then resolve agent names separately
      const [consRes, allRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id, first_name, last_name, state, agent_id, created_at, delivery_status')
          .eq('lead_source', 'CONSOLIDATED_ROUTER')
          .gte('created_at', today + 'T00:00:00Z')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('leads')
          .select('id, first_name, last_name, state, agent_id, lead_source, created_at, delivery_status')
          .order('created_at', { ascending: false })
          .limit(15),
      ]);

      // Collect all unique agent_ids, then resolve to client names in one query
      const allLeads = [...(consRes.data || []), ...(allRes.data || [])];
      const agentIds = [...new Set(allLeads.map(l => l.agent_id).filter(Boolean))];

      let agentNames: Record<string, string> = {};
      if (agentIds.length > 0) {
        const { data: clients } = await supabase
          .from('clients')
          .select('agent_id, name')
          .in('agent_id', agentIds);
        for (const c of clients || []) {
          agentNames[c.agent_id] = c.name;
        }
      }

      const enrich = (leads: any[]) =>
        leads
          .map(l => ({ ...l, agent_name: agentNames[l.agent_id] || null, isTest: isTestLead(l) }));

      return {
        consolidated: enrich(consRes.data || []),
        recent:       enrich(allRes.data   || []),
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

function StateCoverageChart({ coverage }: { coverage: Record<string, { count: number; agents: string[] }> }) {
  const maxCount = Math.max(1, ...ALL_STATES.map(s => coverage[s]?.count ?? 0));
  const covered  = ALL_STATES.filter(s => (coverage[s]?.count ?? 0) > 0).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span><span className="text-foreground font-semibold">{covered}</span> / {ALL_STATES.length} states covered</span>
        <span>·</span>
        <span><span className="text-red-400 font-semibold">{ALL_STATES.length - covered}</span> uncovered</span>
        <span className="ml-auto text-muted-foreground/60">bar = agents covering state (max {maxCount})</span>
      </div>
      <div className="grid grid-cols-3 gap-x-6 gap-y-0.5">
        {ALL_STATES.map(abbr => {
          const count = coverage[abbr]?.count ?? 0;
          const pct   = (count / maxCount) * 100;
          return (
            <div key={abbr} className="flex items-center gap-1.5 py-[3px]">
              <span className={`w-6 text-[10px] font-mono font-semibold shrink-0 ${count === 0 ? 'text-muted-foreground/40' : 'text-foreground'}`}>
                {abbr}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-border/40 overflow-hidden">
                {count > 0 && (
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
              <span className={`w-3 text-[10px] text-right shrink-0 ${count === 0 ? 'text-muted-foreground/30' : 'text-muted-foreground'}`}>
                {count || ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Toggle mutation ──

function useToggleAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clientId,
      enabled,
      note,
    }: { clientId: string; enabled: boolean; note?: string }) => {
      const { error } = await supabase
        .from('clients')
        .update({
          consolidated_router_enabled: enabled,
          consolidated_router_note: enabled ? null : (note || null),
        })
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consolidated-pool-status'] });
    },
  });
}

// ── Main Component ──

export function ConsolidatedRouterDashboard() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  // Toggle state — holds the agent being (dis)abled while we show the note dialog
  const [disableDialog, setDisableDialog] = useState<{
    clientId: string; name: string; note: string;
  } | null>(null);

  const toggleAgent = useToggleAgent();

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

  // Called when admin flips an eligible/capped agent OFF — opens note dialog
  const handleDisableClick = (agent: any) => {
    setDisableDialog({ clientId: agent.client_id, name: agent.name, note: '' });
  };

  // Called when admin confirms disable (with optional note)
  const handleConfirmDisable = async () => {
    if (!disableDialog) return;
    try {
      await toggleAgent.mutateAsync({
        clientId: disableDialog.clientId,
        enabled: false,
        note: disableDialog.note.trim() || undefined,
      });
      toast.success(`${disableDialog.name} removed from consolidated pool`);
      setDisableDialog(null);
    } catch (e) {
      toast.error(`Failed to update: ${String(e)}`);
    }
  };

  // Called when admin flips a manually-disabled agent back ON — immediate
  const handleReEnable = async (agent: any) => {
    try {
      await toggleAgent.mutateAsync({ clientId: agent.client_id, enabled: true });
      toast.success(`${agent.name} re-added to consolidated pool`);
    } catch (e) {
      toast.error(`Failed to update: ${String(e)}`);
    }
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
                  <TableHead className="text-xs text-center w-16">Active</TableHead>
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
                    <TableCell className="py-2 text-center">
                      <Switch
                        checked={true}
                        onCheckedChange={() => handleDisableClick(agent)}
                        disabled={toggleAgent.isPending}
                        className="data-[state=checked]:bg-emerald-500"
                      />
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
                    <TableCell className="py-2 text-center">
                      <Switch
                        checked={true}
                        onCheckedChange={() => handleDisableClick(agent)}
                        disabled={toggleAgent.isPending}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {/* Excluded divider */}
                {(pool?.excluded || []).length > 0 && (
                  <TableRow className="border-border/30 bg-muted/20">
                    <TableCell colSpan={8} className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Excluded
                    </TableCell>
                  </TableRow>
                )}
                {/* Excluded agents */}
                {(pool?.excluded || []).map((agent: any) => {
                  const isManualDisable = agent.consolidated_enabled === false;
                  return (
                    <TableRow key={agent.agent_id} className="border-border/30 opacity-40 hover:opacity-60">
                      <TableCell className="py-2">
                        <div>
                          <span className="text-sm">{agent.name}</span>
                          {isManualDisable && agent.consolidated_note && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 italic">{agent.consolidated_note}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <WalletBadge balance={agent.wallet_balance} />
                      </TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground" colSpan={4}>
                        ✗ {agent.exclude_reason}
                      </TableCell>
                      <TableCell />
                      <TableCell className="py-2 text-center">
                        {isManualDisable ? (
                          <Switch
                            checked={false}
                            onCheckedChange={() => handleReEnable(agent)}
                            disabled={toggleAgent.isPending}
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* State Coverage */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">State Coverage</CardTitle>
            {!coverageLoading && coverageData && (
              <span className="text-xs text-muted-foreground">{coverageData.total_agents} active agents</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {coverageLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : coverageData ? (
            <StateCoverageChart coverage={coverageData.coverage} />
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">No coverage data</p>
          )}
        </CardContent>
      </Card>

      {/* Disable agent dialog */}
      <Dialog open={!!disableDialog} onOpenChange={(open) => { if (!open) setDisableDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove from Consolidated Pool</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{disableDialog?.name}</span> will stop receiving consolidated leads immediately.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Reason (optional)
              </label>
              <Input
                placeholder="e.g. Management payment failed"
                value={disableDialog?.note || ''}
                onChange={(e) => setDisableDialog(prev => prev ? { ...prev, note: e.target.value } : null)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmDisable(); }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDisableDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDisable}
              disabled={toggleAgent.isPending}
            >
              {toggleAgent.isPending ? 'Saving...' : 'Remove from Pool'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  {(leadsData?.recent || []).slice(0, 15).map((lead: any) => {
                    const isCons = lead.lead_source === 'CONSOLIDATED_ROUTER';
                    return (
                      <TableRow key={lead.id} className={`border-border/30 ${lead.isTest ? 'opacity-60' : ''}`}>
                        <TableCell className="py-1.5 text-xs text-muted-foreground">
                          {format(new Date(lead.created_at), 'h:mma')}
                        </TableCell>
                        <TableCell className="py-1.5 text-xs">
                          <span className="flex items-center gap-1.5">
                            {lead.first_name} {lead.last_name}
                            {lead.isTest && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 text-amber-400 border-amber-400/30">TEST</Badge>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5 text-xs font-mono">{lead.state}</TableCell>
                        <TableCell className="py-1.5 text-xs truncate max-w-[120px]">
                          {lead.agent_name || '—'}
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
              <div className="text-right">
                {summary?.model && (
                  <span className="text-xs text-primary font-medium block">{summary.model.replace('_', '/').replace('hybrid/', 'Hybrid ')}</span>
                )}
                {summary && (
                  <span className="text-xs text-muted-foreground">
                    ${(summary.total_spend ?? 0).toFixed(2)} across {summary.pool_size ?? 0} agents
                    {summary.exempt_agent && <span className="text-primary/70"> ({summary.exempt_agent} exempt)</span>}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {summaryLoading ? (
              <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
            ) : (summary?.breakdown?.length ?? 0) > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs">Agent</TableHead>
                    <TableHead className="text-xs text-center">Share</TableHead>
                    <TableHead className="text-xs text-center">Leads</TableHead>
                    <TableHead className="text-xs text-right">Raw Cost</TableHead>
                    <TableHead className="text-xs text-right">w/ Fee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(summary.breakdown || []).map((row: any) => (
                    <TableRow key={row.agent_id || row.agent} className={`border-border/30 ${row.exempt ? 'opacity-50' : ''}`}>
                      <TableCell className="py-1.5 text-xs font-medium">
                        {row.agent}
                        {row.exempt && <span className="ml-1.5 text-[10px] text-primary/70 font-semibold">OWNER</span>}
                      </TableCell>
                      <TableCell className="py-1.5 text-xs text-center text-muted-foreground">
                        {row.exempt ? '—' : `${(row.budget_share ?? 0).toFixed(1)}%`}
                      </TableCell>
                      <TableCell className="py-1.5 text-xs text-center">
                        {row.leads > 0 ? <span className="text-emerald-400 font-medium">{row.leads}</span> : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell className="py-1.5 text-xs text-right font-mono">
                        {row.exempt ? '$0' : `$${(row.charged_before_fee ?? 0).toFixed(2)}`}
                      </TableCell>
                      <TableCell className="py-1.5 text-xs text-right font-mono text-primary">
                        {row.exempt ? '$0' : `$${(row.charged_with_fee ?? 0).toFixed(2)}`}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t border-border/50 bg-muted/20">
                    <TableCell className="py-2 text-xs font-semibold">Total</TableCell>
                    <TableCell className="py-2 text-xs text-center font-semibold">100%</TableCell>
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
                  ? 'Spend recorded — attribution will distribute on next run'
                  : 'No spend data yet for today'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
