import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBillingIntegrity, BillingIntegrityRow } from '@/hooks/useBillingDashboard';
import { useComputedWalletBalance } from '@/hooks/useComputedWalletBalance';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, subDays, startOfWeek } from 'date-fns';
import {
  ClipboardCheck,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CircleCheck,
  AlertTriangle,
  CircleX,
  Filter,
  Loader2,
  ShieldCheck,
  BarChart3,
  CreditCard,
  Wallet,
  ArrowDownToLine,
  RefreshCw,
} from 'lucide-react';

type FilterMode = 'all' | 'problems' | 'warnings' | 'clean';
type SortField = 'clientName' | 'mtdAdSpend' | 'totalDeposits' | 'walletBalance' | 'unbackedTotal' | 'status';
type SortDir = 'asc' | 'desc';

function statusIcon(status: BillingIntegrityRow['status']) {
  switch (status) {
    case 'clean': return <CircleCheck className="w-4 h-4 text-green-400" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    case 'problem': return <CircleX className="w-4 h-4 text-red-400" />;
  }
}

function statusLabel(status: BillingIntegrityRow['status']) {
  switch (status) {
    case 'clean': return 'Clean';
    case 'warning': return 'Warning';
    case 'problem': return 'Problem';
  }
}

function statusBadgeClass(status: BillingIntegrityRow['status']) {
  switch (status) {
    case 'clean': return 'bg-green-500/10 text-green-400 border-green-500/30';
    case 'warning': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    case 'problem': return 'bg-red-500/10 text-red-400 border-red-500/30';
  }
}

function fmt(n: number) {
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
}

function fmtShort(d: string) {
  try { return format(new Date(d), 'MMM d'); } catch { return d; }
}

// ── Per-client detail data hook ──
function useClientAuditDetail(clientId: string | null, startDate: string, endDate: string) {
  const adSpend = useQuery({
    queryKey: ['audit-ad-spend', clientId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_spend_daily')
        .select('spend_date, cost, campaign_id')
        .eq('client_id', clientId!)
        .gte('spend_date', startDate)
        .lte('spend_date', endDate)
        .order('spend_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const billingRecords = useQuery({
    queryKey: ['audit-billing-records', clientId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_records')
        .select('id, amount, status, paid_at, created_at, stripe_payment_intent_id, stripe_account, notes, charge_attempts, last_charge_error')
        .eq('client_id', clientId!)
        .eq('billing_type', 'ad_spend')
        .gte('created_at', startDate + 'T00:00:00Z')
        .lte('created_at', endDate + 'T23:59:59Z')
        .order('paid_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const walletTransactions = useQuery({
    queryKey: ['audit-wallet-tx', clientId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('id, amount, transaction_type, description, billing_record_id, created_at')
        .eq('client_id', clientId!)
        .in('transaction_type', ['deposit', 'adjustment'])
        .gte('created_at', startDate + 'T00:00:00Z')
        .lte('created_at', endDate + 'T23:59:59Z')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const stripeCharges = useQuery({
    queryKey: ['audit-stripe-charges', clientId, startDate],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('audit-client-billing', {
        body: { clientId, sinceDate: startDate },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as {
        stripeCharges: Array<{ id: string; amount: number; status: string; created: string; customer: string }>;
        customerIds: string[];
        discoveredCustomers?: Array<{ id: string; email: string | null; name: string | null; created: string }>;
      };
    },
    enabled: !!clientId,
  });

  // Google Ads customer ID for linking to ads dashboard
  const googleCustomerId = useQuery({
    queryKey: ['audit-google-customer-id', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('google_customer_id')
        .eq('client_id', clientId!)
        .limit(1)
        .maybeSingle();
      return data?.google_customer_id || null;
    },
    enabled: !!clientId,
  });

  return { adSpend, billingRecords, walletTransactions, stripeCharges, googleCustomerId: googleCustomerId.data };
}

// ── Weekly aggregation for ad spend ──
function aggregateWeekly(rows: Array<{ spend_date: string; cost: number }>) {
  const weeks = new Map<string, { weekStart: string; total: number; days: number }>();
  for (const row of rows) {
    const ws = format(startOfWeek(new Date(row.spend_date + 'T12:00:00'), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const entry = weeks.get(ws) || { weekStart: ws, total: 0, days: 0 };
    entry.total += Number(row.cost || 0);
    entry.days++;
    weeks.set(ws, entry);
  }
  return [...weeks.values()].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

// ── Main component ──
export function BillingIntegrityAudit() {
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = useBillingIntegrity();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [auditClientId, setAuditClientId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'clientName' ? 'asc' : 'desc');
    }
  };

  const filtered = rows
    .filter(r => {
      if (search && !r.clientName.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'problems') return r.status === 'problem';
      if (filter === 'warnings') return r.status === 'warning';
      if (filter === 'clean') return r.status === 'clean';
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'status') {
        const order = { problem: 0, warning: 1, clean: 2 };
        return (order[a.status] - order[b.status]) * dir;
      }
      if (sortField === 'clientName') return a.clientName.localeCompare(b.clientName) * dir;
      return ((a[sortField] as number) - (b[sortField] as number)) * dir;
    });

  const problemCount = rows.filter(r => r.status === 'problem').length;
  const warningCount = rows.filter(r => r.status === 'warning').length;
  const cleanCount = rows.filter(r => r.status === 'clean').length;

  const SortHeader = ({ field, label, align = 'left' }: { field: SortField; label: string; align?: string }) => (
    <th
      className={cn(
        'px-4 py-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none',
        align === 'right' && 'text-right'
      )}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortField === field && (
          sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </span>
    </th>
  );

  if (isLoading) {
    return (
      <Card className="frosted-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <Skeleton className="h-6 w-56" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </Card>
    );
  }

  return (
    <Card className="frosted-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-foreground">Billing Integrity Audit</h3>
            <span className="text-xs text-muted-foreground">{rows.length} clients</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search client..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 w-48 text-sm"
              />
            </div>
            <div className="flex items-center rounded-lg border border-border/50 overflow-hidden">
              {([
                ['all', `All (${rows.length})`],
                ['problems', `${problemCount}`],
                ['warnings', `${warningCount}`],
                ['clean', `${cleanCount}`],
              ] as [FilterMode, string][]).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setFilter(mode)}
                  className={cn(
                    'px-2.5 py-1.5 text-xs font-medium transition-colors flex items-center gap-1',
                    filter === mode
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {mode === 'problems' && <CircleX className="w-3 h-3 text-red-400" />}
                  {mode === 'warnings' && <AlertTriangle className="w-3 h-3 text-yellow-400" />}
                  {mode === 'clean' && <CircleCheck className="w-3 h-3 text-green-400" />}
                  {mode === 'all' && <Filter className="w-3 h-3" />}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <SortHeader field="status" label="Status" />
              <SortHeader field="clientName" label="Client" />
              <SortHeader field="mtdAdSpend" label="MTD Ad Spend" align="right" />
              <SortHeader field="totalDeposits" label="Total Deposits" align="right" />
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">Stripe-Backed</th>
              <SortHeader field="unbackedTotal" label="Unbacked" align="right" />
              <SortHeader field="walletBalance" label="Balance" align="right" />
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">Audit</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  {search ? 'No clients match your search' : 'No clients with wallets found'}
                </td>
              </tr>
            ) : (
              filtered.map(row => (
                <Row
                  key={row.clientId}
                  row={row}
                  isAuditing={auditClientId === row.clientId}
                  onCheck={() => setAuditClientId(auditClientId === row.clientId ? null : row.clientId)}
                  onNavigate={() => navigate(`/hub/admin/clients/${row.clientId}?tab=billing`)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="px-4 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {problemCount > 0 && <span className="text-red-400 font-medium">{problemCount} problem(s)</span>}
          {problemCount > 0 && warningCount > 0 && ' · '}
          {warningCount > 0 && <span className="text-yellow-400 font-medium">{warningCount} warning(s)</span>}
          {(problemCount > 0 || warningCount > 0) && ' · '}
          <span className="text-green-400">{cleanCount} clean</span>
        </span>
        <span>
          Total MTD Ad Spend: <strong className="text-foreground">{fmt(rows.reduce((s, r) => s + r.mtdAdSpend, 0))}</strong>
          {' · '}
          Total Deposits: <strong className="text-foreground">{fmt(rows.reduce((s, r) => s + r.totalDeposits, 0))}</strong>
        </span>
      </div>
    </Card>
  );
}

// ── Table row with "Check" button that expands into full audit detail ──
function Row({
  row,
  isAuditing,
  onCheck,
  onNavigate,
}: {
  row: BillingIntegrityRow;
  isAuditing: boolean;
  onCheck: () => void;
  onNavigate: () => void;
}) {
  return (
    <>
      <tr
        className={cn(
          'border-b border-border/30 transition-colors',
          row.status === 'problem' && 'bg-red-500/5 hover:bg-red-500/10',
          row.status === 'warning' && 'bg-yellow-500/5 hover:bg-yellow-500/10',
          row.status === 'clean' && 'hover:bg-muted/50',
          isAuditing && 'bg-blue-500/5',
        )}
      >
        <td className="px-4 py-3">
          <Badge variant="outline" className={cn('text-xs gap-1', statusBadgeClass(row.status))}>
            {statusIcon(row.status)}
            {statusLabel(row.status)}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <button onClick={onNavigate} className="font-medium text-foreground hover:text-primary transition-colors text-left">
            {row.clientName}
          </button>
        </td>
        <td className="px-4 py-3 text-right tabular-nums">{fmt(row.mtdAdSpend)}</td>
        <td className="px-4 py-3 text-right tabular-nums">{fmt(row.totalDeposits)}</td>
        <td className="px-4 py-3 text-right tabular-nums">
          <span className="text-green-400">{fmt(row.stripeBackedTotal)}</span>
          <span className="text-muted-foreground ml-1">({row.stripeBackedCount})</span>
        </td>
        <td className="px-4 py-3 text-right tabular-nums">
          {row.unbackedTotal > 0 ? (
            <>
              <span className="text-red-400 font-medium">{fmt(row.unbackedTotal)}</span>
              <span className="text-muted-foreground ml-1">({row.unbackedCount})</span>
            </>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </td>
        <td className={cn('px-4 py-3 text-right tabular-nums font-medium', row.walletBalance < 0 ? 'text-red-400' : 'text-foreground')}>
          {row.walletBalance < 0 && '-'}{fmt(row.walletBalance)}
        </td>
        <td className="px-4 py-3 text-center">
          <Button
            variant={isAuditing ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={onCheck}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {isAuditing ? 'Close' : 'Check'}
          </Button>
        </td>
      </tr>
      {isAuditing && (
        <tr>
          <td colSpan={8} className="p-0">
            <AuditDetail clientId={row.clientId} clientName={row.clientName} />
          </td>
        </tr>
      )}
    </>
  );
}

// ── Full audit detail panel (3-column layout) ──
function AuditDetail({ clientId, clientName }: { clientId: string; clientName: string }) {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 60), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const { adSpend, billingRecords, walletTransactions, stripeCharges, googleCustomerId } = useClientAuditDetail(clientId, startDate, endDate);
  const walletBalance = useComputedWalletBalance(clientId);

  const adSpendData = adSpend.data || [];
  const allBillingData = billingRecords.data || [];
  const billingData = allBillingData.filter(r => r.status !== 'cancelled');
  const cancelledBillingIds = new Set(allBillingData.filter(r => r.status === 'cancelled').map(r => r.id));
  const walletData = walletTransactions.data || [];
  const stripeData = stripeCharges.data;

  // Filter Stripe charges to the date range
  const filteredStripeCharges = (stripeData?.stripeCharges || []).filter(c => {
    const d = c.created.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const weeklySpend = aggregateWeekly(adSpendData);
  const totalAdSpend = adSpendData.reduce((s, r) => s + Number(r.cost || 0), 0);

  const stripePiIds = new Set(filteredStripeCharges.map(c => c.id));
  const billingPiIds = new Set(billingData.filter(r => r.stripe_payment_intent_id).map(r => r.stripe_payment_intent_id!));
  const stripeOnly = filteredStripeCharges.filter(c => !billingPiIds.has(c.id));
  const alphaOnlyPi = billingData.filter(r => r.stripe_payment_intent_id && !stripePiIds.has(r.stripe_payment_intent_id));

  // Wallet totals
  const depositTotal = walletData.filter(tx => tx.transaction_type === 'deposit').reduce((s, tx) => s + Number(tx.amount || 0), 0);
  const adjustmentTotal = walletData.filter(tx => tx.transaction_type === 'adjustment').reduce((s, tx) => s + Number(tx.amount || 0), 0);
  const netWalletCredits = depositTotal + adjustmentTotal;

  const isAnyLoading = adSpend.isLoading || billingRecords.isLoading || walletTransactions.isLoading || stripeCharges.isLoading;

  // Refresh all audit data
  const handleRefresh = () => {
    adSpend.refetch();
    billingRecords.refetch();
    walletTransactions.refetch();
    stripeCharges.refetch();
  };

  // Google Ads link helper
  const gadsUrl = googleCustomerId
    ? `https://ads.google.com/aw/campaigns?ocid=${googleCustomerId}`
    : null;

  // Link a discovered Stripe customer
  const handleLinkCustomer = async (custId: string) => {
    setLinkingId(custId);
    try {
      const { data, error } = await supabase.functions.invoke('audit-client-billing', {
        body: { clientId, linkCustomerId: custId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      // Refetch to reflect the link
      queryClient.invalidateQueries({ queryKey: ['audit-stripe-charges', clientId] });
    } catch (err: any) {
      console.error('Link failed:', err);
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <div className="border-t border-blue-500/20 bg-blue-500/5 p-4">
      {/* Header + Date Range */}
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-foreground">Detailed Audit: {clientName}</span>
          {stripeData?.customerIds && stripeData.customerIds.length > 0 && (
            <span className="text-xs text-muted-foreground ml-2">
              Stripe: {stripeData.customerIds.map(id => (
                <a key={id} href={`https://dashboard.stripe.com/customers/${id}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline mr-1">{id}</a>
              ))}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-7 w-36 text-xs" />
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-7 w-36 text-xs" />
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleRefresh} disabled={isAnyLoading}>
            <RefreshCw className={cn('w-3 h-3', isAnyLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Discovered unlinked Stripe customers — require confirmation to link */}
      {stripeData?.discoveredCustomers && stripeData.discoveredCustomers.length > 0 && (
        <div className="mb-3 space-y-1">
          {stripeData.discoveredCustomers.map(cust => (
            <div key={cust.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="text-xs text-violet-300">
                  Found unlinked Stripe customer: <a href={`https://dashboard.stripe.com/customers/${cust.id}`} target="_blank" rel="noopener noreferrer" className="text-violet-200 hover:underline font-medium">{cust.id}</a>
                  {cust.email && <span className="text-muted-foreground"> · {cust.email}</span>}
                  {cust.name && <span className="text-muted-foreground"> · {cust.name}</span>}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] gap-1 border-violet-500/40 text-violet-300 hover:bg-violet-500/20"
                disabled={linkingId === cust.id}
                onClick={() => handleLinkCustomer(cust.id)}
              >
                {linkingId === cust.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CircleCheck className="w-3 h-3" />}
                Link to {clientName}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Reconciliation alerts */}
      {(stripeOnly.length > 0 || alphaOnlyPi.length > 0) && (
        <div className="mb-3 space-y-1">
          {stripeOnly.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
              <span className="text-xs text-yellow-300">
                {stripeOnly.length} Stripe charge(s) totaling {fmt(stripeOnly.reduce((s, c) => s + c.amount, 0))} NOT tracked in Alpha Hub
              </span>
            </div>
          )}
          {alphaOnlyPi.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <CircleX className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-xs text-red-300">
                {alphaOnlyPi.length} Alpha billing record(s) reference Stripe PIs that don't exist in Stripe
              </span>
            </div>
          )}
        </div>
      )}

      {/* 4-column layout — equal height */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto items-stretch">

        {/* Column 1: Google Ad Spend */}
        <div className="rounded-lg border border-border/50 overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-muted/40 border-b border-border/50 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              Google Ad Spend
              {gadsUrl && (
                <a href={gadsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </span>
            <span className="text-xs font-bold text-foreground tabular-nums">{fmt(totalAdSpend)}</span>
          </div>
          <div className="flex-1">
            {adSpend.isLoading ? (
              <div className="p-4 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : weeklySpend.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground text-center">No ad spend data</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/20">
                    <th className="px-3 py-1.5 text-left text-muted-foreground font-medium">Week of</th>
                    <th className="px-3 py-1.5 text-right text-muted-foreground font-medium">Days</th>
                    <th className="px-3 py-1.5 text-right text-muted-foreground font-medium">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklySpend.map(w => (
                    <tr key={w.weekStart} className="border-b border-border/20 hover:bg-muted/30">
                      <td className="px-3 py-1.5 text-foreground">{fmtShort(w.weekStart)}</td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground tabular-nums">{w.days}</td>
                      <td className="px-3 py-1.5 text-right text-foreground font-medium tabular-nums">{fmt(w.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Column 2: Alpha Hub Charges (billing records + wallet deposits) */}
        <div className="rounded-lg border border-border/50 overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-muted/40 border-b border-border/50 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-violet-400" />
              Alpha Hub Charges
            </span>
            <span className="text-xs font-bold text-foreground tabular-nums">
              {fmt(billingData.reduce((s, r) => s + Number(r.amount || 0), 0))}
              <span className="text-muted-foreground font-normal ml-1">({billingData.length})</span>
            </span>
          </div>
          <div className="flex-1">
            {billingRecords.isLoading ? (
              <div className="p-4 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : billingData.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground text-center">No billing records</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/20">
                    <th className="px-3 py-1.5 text-left text-muted-foreground font-medium">Date</th>
                    <th className="px-3 py-1.5 text-right text-muted-foreground font-medium">Amount</th>
                    <th className="px-3 py-1.5 text-center text-muted-foreground font-medium">Status</th>
                    <th className="px-3 py-1.5 text-center text-muted-foreground font-medium">Stripe PI</th>
                  </tr>
                </thead>
                <tbody>
                  {billingData.map(rec => {
                    const hasPI = !!rec.stripe_payment_intent_id;
                    const piInStripe = hasPI && stripePiIds.has(rec.stripe_payment_intent_id!);
                    const isFlagged = rec.notes?.includes('FLAGGED');
                    return (
                      <tr
                        key={rec.id}
                        className={cn(
                          'border-b border-border/20 hover:bg-muted/30',
                          isFlagged && 'bg-red-500/5',
                          !hasPI && rec.status === 'paid' && 'bg-yellow-500/5',
                        )}
                      >
                        <td className="px-3 py-1.5 text-foreground">{fmtDate(rec.paid_at || rec.created_at)}</td>
                        <td className="px-3 py-1.5 text-right text-foreground font-medium tabular-nums">{fmt(Number(rec.amount))}</td>
                        <td className="px-3 py-1.5 text-center">
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] px-1.5',
                              rec.status === 'paid' ? 'bg-green-500/10 text-green-400 border-green-500/30'
                              : rec.status === 'overdue' ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                            )}
                          >
                            {rec.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {hasPI ? (
                            <a href={`https://dashboard.stripe.com/payments/${rec.stripe_payment_intent_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:opacity-80" title={rec.stripe_payment_intent_id!}>
                              {piInStripe ? (
                                <CircleCheck className="w-3.5 h-3.5 text-green-400" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                              )}
                              <ExternalLink className="w-2.5 h-2.5 text-muted-foreground" />
                            </a>
                          ) : (
                            <CircleX className="w-3.5 h-3.5 text-red-400 inline" title="No Stripe payment intent" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

          </div>
        </div>

        {/* Column 3: Stripe Ad Spend Account */}
        <div className="rounded-lg border border-border/50 overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-muted/40 border-b border-border/50 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              Stripe Ad Spend Account
            </span>
            <span className="text-xs font-bold text-foreground tabular-nums">
              {fmt(filteredStripeCharges.filter(c => c.status === 'succeeded').reduce((s, c) => s + c.amount, 0))}
              <span className="text-muted-foreground font-normal ml-1">({filteredStripeCharges.filter(c => c.status === 'succeeded').length})</span>
            </span>
          </div>
          <div className="flex-1">
            {stripeCharges.isLoading ? (
              <div className="p-4 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Fetching from Stripe...</span>
              </div>
            ) : stripeCharges.isError ? (
              <div className="p-4 text-xs text-red-400 text-center">
                Failed to fetch Stripe data: {stripeCharges.error?.message}
              </div>
            ) : filteredStripeCharges.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground text-center">
                {stripeData?.customerIds.length === 0 ? 'No Stripe customer linked' : 'No charges in date range'}
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/20">
                    <th className="px-3 py-1.5 text-left text-muted-foreground font-medium">Date</th>
                    <th className="px-3 py-1.5 text-right text-muted-foreground font-medium">Amount</th>
                    <th className="px-3 py-1.5 text-center text-muted-foreground font-medium">Status</th>
                    <th className="px-3 py-1.5 text-center text-muted-foreground font-medium">In Alpha</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStripeCharges.map(charge => {
                    const inAlpha = billingPiIds.has(charge.id);
                    const isFailed = charge.status !== 'succeeded';
                    return (
                      <tr
                        key={charge.id}
                        className={cn(
                          'border-b border-border/20 hover:bg-muted/30',
                          isFailed ? 'bg-red-500/5 opacity-70' : !inAlpha && 'bg-yellow-500/5'
                        )}
                      >
                        <td className="px-3 py-1.5">
                          <a href={`https://dashboard.stripe.com/payments/${charge.id}`} target="_blank" rel="noopener noreferrer" className={cn('hover:underline inline-flex items-center gap-1', isFailed ? 'text-red-400 hover:text-red-300' : 'text-foreground hover:text-blue-400')}>
                            {fmtDate(charge.created)}
                            <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                          </a>
                        </td>
                        <td className={cn('px-3 py-1.5 text-right font-medium tabular-nums', isFailed ? 'text-red-400 line-through' : 'text-foreground')}>{fmt(charge.amount)}</td>
                        <td className="px-3 py-1.5 text-center">
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] px-1.5',
                              charge.status === 'succeeded' ? 'bg-green-500/10 text-green-400 border-green-500/30'
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                            )}
                          >
                            {charge.status === 'succeeded' ? 'paid' : 'failed'}
                          </Badge>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {inAlpha ? (
                            <CircleCheck className="w-3.5 h-3.5 text-green-400 inline" title="Tracked in Alpha" />
                          ) : (
                            <CircleX className="w-3.5 h-3.5 text-yellow-400 inline" title="NOT tracked in Alpha" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Column 4: Wallet Credits */}
        <div className="rounded-lg border border-border/50 overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-muted/40 border-b border-border/50 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ArrowDownToLine className="w-3.5 h-3.5 text-cyan-400" />
                Wallet Credits
              </span>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {fmt(netWalletCredits)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">Current Balance</span>
              <span className={cn(
                'text-[10px] font-semibold tabular-nums',
                walletBalance.isLoading ? 'text-muted-foreground' :
                walletBalance.remainingBalance < 0 ? 'text-red-400' :
                walletBalance.remainingBalance < 150 ? 'text-yellow-400' : 'text-green-400'
              )}>
                {walletBalance.isLoading ? '...' : fmt(walletBalance.remainingBalance)}
              </span>
            </div>
          </div>
          <div className="flex-1">
            {walletTransactions.isLoading ? (
              <div className="p-4 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : walletData.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground text-center">No wallet credits</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/20">
                    <th className="px-3 py-1.5 text-left text-muted-foreground font-medium">Date</th>
                    <th className="px-3 py-1.5 text-right text-muted-foreground font-medium">Amount</th>
                    <th className="px-3 py-1.5 text-center text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {walletData.map(tx => {
                    const isAdjustment = tx.transaction_type === 'adjustment';
                    const isReversed = !isAdjustment && tx.billing_record_id && cancelledBillingIds.has(tx.billing_record_id);
                    const hasBillingRecord = !isAdjustment && !!tx.billing_record_id && !isReversed;
                    const isUnbacked = !isAdjustment && !tx.billing_record_id;
                    return (
                      <tr
                        key={tx.id}
                        className={cn(
                          'border-b border-border/20 hover:bg-muted/30',
                          isReversed && 'bg-red-500/5 line-through opacity-60',
                          isAdjustment && 'bg-blue-500/5',
                          isUnbacked && 'bg-yellow-500/5',
                        )}
                      >
                        <td className="px-3 py-1.5 text-foreground">{fmtDate(tx.created_at)}</td>
                        <td className={cn('px-3 py-1.5 text-right font-medium tabular-nums',
                          isAdjustment ? 'text-blue-400' : isReversed ? 'text-red-400' : 'text-foreground'
                        )}>
                          {isAdjustment && (Number(tx.amount) < 0 ? '-' : '+')}{fmt(Number(tx.amount))}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {isReversed ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 bg-red-500/10 text-red-400 border-red-500/30">reversed</Badge>
                          ) : isAdjustment ? (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[80px] inline-block" title={tx.description || ''}>
                              {tx.description?.replace('Reversed: phantom billing record ', 'Rev: ').replace('Reversed: ', 'Rev: ') || 'adjustment'}
                            </span>
                          ) : hasBillingRecord ? (
                            <CircleCheck className="w-3.5 h-3.5 text-green-400 inline" title="Backed by billing record" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 inline" title="No billing record — unbacked" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
