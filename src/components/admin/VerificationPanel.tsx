import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useComputedWalletBalance } from '@/hooks/useComputedWalletBalance';
import { useAuditBooks } from '@/hooks/useBillingVerification';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, subDays, startOfWeek } from 'date-fns';
import {
  ExternalLink,
  CircleCheck,
  AlertTriangle,
  CircleX,
  Loader2,
  ShieldCheck,
  BarChart3,
  CreditCard,
  Wallet,
  ArrowDownToLine,
  RefreshCw,
  Link2,
} from 'lucide-react';

// ── Shared formatting helpers ──

export function fmt(n: number) {
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Short ID for cross-referencing (first 4 chars of UUID) */
export function sid(id: string | null | undefined) {
  if (!id) return '';
  return id.slice(0, 4);
}

/** Short PI for display (last 6 chars) */
export function shortPi(pi: string | null | undefined) {
  if (!pi) return '';
  return '...' + pi.slice(-6);
}

export function fmtDate(d: string) {
  try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
}

export function fmtShort(d: string) {
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
    staleTime: 0,
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
    staleTime: 0,
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
    staleTime: 0,
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
        stripeCharges: Array<{ id: string; amount: number; status: string; created: string; customer: string; refunded?: boolean; amount_refunded?: number }>;
        customerIds: string[];
        discoveredCustomers?: Array<{ id: string; email: string | null; name: string | null; created: string }>;
      };
    },
    enabled: !!clientId,
    staleTime: 0,
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

// ── Audit Summary Section (calls audit_books RPC) ──

function AuditSummary({ clientId }: { clientId: string }) {
  const { data: audit, isLoading, isError, error } = useAuditBooks(clientId);

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
        <div className="flex items-center gap-2 text-sm text-red-400">
          <CircleX className="w-4 h-4" />
          Audit check failed: {(error as Error)?.message || 'Unknown error'}
        </div>
      </div>
    );
  }

  if (!audit) return null;

  const statusColors = {
    clean: 'bg-green-500/10 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    problem: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  const statusIcons = {
    clean: <CircleCheck className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    problem: <CircleX className="w-4 h-4" />,
  };

  return (
    <div className="space-y-3">
      {/* Status badge + summary */}
      <div className="flex items-start gap-3">
        <Badge
          variant="outline"
          className={cn('text-sm gap-1.5 px-3 py-1 font-semibold capitalize', statusColors[audit.status])}
        >
          {statusIcons[audit.status]}
          {audit.status}
        </Badge>
        <div className="flex-1">
          <p className="text-sm text-foreground">{audit.summary}</p>
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            <span>Balance: <strong className="text-foreground">{fmt(audit.balance)}</strong></span>
            <span>Checked: {fmtDate(audit.checked_at)}</span>
            {audit.quarantined_count > 0 && (
              <span className="text-yellow-400">{audit.quarantined_count} quarantined</span>
            )}
          </div>
        </div>
      </div>

      {/* Discrepancies list */}
      {audit.discrepancies.length > 0 && (
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <div className="px-3 py-2 bg-muted/40 border-b border-border/50">
            <span className="text-xs font-semibold text-foreground">
              Issues ({audit.discrepancies.length})
            </span>
          </div>
          <div className="divide-y divide-border/30">
            {audit.discrepancies.map((d, i) => (
              <div key={i} className="px-3 py-2 flex items-center gap-3 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <div className="flex-1">
                  <span className="text-foreground">{d.issue}</span>
                  <div className="text-muted-foreground mt-0.5">
                    {d.amount !== 0 && <span className="font-medium tabular-nums">{fmt(d.amount)}</span>}
                    {d.billing_record_id && <span className="ml-2 text-violet-400 font-mono">BR #{sid(d.billing_record_id)}</span>}
                    {d.wallet_transaction_id && <span className="ml-2 text-cyan-400 font-mono">TX #{sid(d.wallet_transaction_id)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main VerificationPanel (content of the Sheet slide-over) ──

interface VerificationPanelProps {
  clientId: string;
  clientName: string;
}

export function VerificationPanel({ clientId, clientName }: VerificationPanelProps) {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 60), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkingPi, setLinkingPi] = useState<string | null>(null);
  // Cross-column highlight: stores a billing record ID -- highlights matching rows everywhere
  const [highlightBrId, setHighlightBrId] = useState<string | null>(null);
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
  const stripeOnly = filteredStripeCharges.filter(c => c.status === 'succeeded' && !c.refunded && !billingPiIds.has(c.id));
  const alphaOnlyPi = billingData.filter(r => r.stripe_payment_intent_id && !stripePiIds.has(r.stripe_payment_intent_id));

  // Cross-reference maps: PI -> billing record ID, billing record ID -> PI
  const piBrMap = new Map<string, string>(); // stripe PI -> billing record ID
  const brPiMap = new Map<string, string>(); // billing record ID -> stripe PI
  billingData.forEach(r => {
    if (r.stripe_payment_intent_id) {
      piBrMap.set(r.stripe_payment_intent_id, r.id);
      brPiMap.set(r.id, r.stripe_payment_intent_id);
    }
  });
  // wallet billing_record_id -> billing record set
  const walletBrIds = new Set(walletData.filter(tx => tx.billing_record_id).map(tx => tx.billing_record_id!));

  // Wallet totals
  const depositTotal = walletData.filter(tx => tx.transaction_type === 'deposit').reduce((s, tx) => s + Number(tx.amount || 0), 0);
  const adjustmentTotal = walletData.filter(tx => tx.transaction_type === 'adjustment').reduce((s, tx) => s + Number(tx.amount || 0), 0);
  const netWalletCredits = depositTotal + adjustmentTotal;

  const isAnyLoading = adSpend.isFetching || billingRecords.isFetching || walletTransactions.isFetching || stripeCharges.isFetching;

  // Refresh all audit data -- force network fetch
  const handleRefresh = async () => {
    await Promise.all([
      adSpend.refetch({ cancelRefetch: true }),
      billingRecords.refetch({ cancelRefetch: true }),
      walletTransactions.refetch({ cancelRefetch: true }),
      stripeCharges.refetch({ cancelRefetch: true }),
    ]);
  };

  // Google Ads link helper
  const gadsUrl = googleCustomerId
    ? `https://ads.google.com/aw/campaigns?ocid=${googleCustomerId}`
    : null;

  // Stripe charges not yet linked to any billing record (available for linking)
  const unlinkableStripeCharges = filteredStripeCharges.filter(c => c.status === 'succeeded' && !c.refunded && !billingPiIds.has(c.id));

  // Link a billing record to a Stripe payment intent
  const handleLinkPI = async (billingRecordId: string, stripePI: string) => {
    setLinkingPi(billingRecordId);
    try {
      const { error } = await supabase
        .from('billing_records')
        .update({ stripe_payment_intent_id: stripePI })
        .eq('id', billingRecordId);
      if (error) throw error;
      billingRecords.refetch();
      stripeCharges.refetch();
    } catch (err: any) {
      console.error('Link PI failed:', err);
    } finally {
      setLinkingPi(null);
    }
  };

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
    <div className="space-y-4">
      {/* Audit Summary (audit_books RPC) -- instant pass/fail */}
      <AuditSummary clientId={clientId} />

      <div className="border-t border-border/30" />

      {/* Header + Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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

      {/* Discovered unlinked Stripe customers -- require confirmation to link */}
      {stripeData?.discoveredCustomers && stripeData.discoveredCustomers.length > 0 && (
        <div className="space-y-1">
          {stripeData.discoveredCustomers.map(cust => (
            <div key={cust.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="text-xs text-violet-300">
                  Found unlinked Stripe customer: <a href={`https://dashboard.stripe.com/customers/${cust.id}`} target="_blank" rel="noopener noreferrer" className="text-violet-200 hover:underline font-medium">{cust.id}</a>
                  {cust.email && <span className="text-muted-foreground"> &middot; {cust.email}</span>}
                  {cust.name && <span className="text-muted-foreground"> &middot; {cust.name}</span>}
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
        <div className="space-y-1">
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

      {/* Summary bar: Wallet balance + Google Ad Spend */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
          <div className="text-[10px] text-muted-foreground">Balance (after perf fee)</div>
          <div className={cn('text-sm font-bold tabular-nums',
            walletBalance.isLoading ? 'text-muted-foreground' :
            walletBalance.remainingBalance < 0 ? 'text-red-400' :
            walletBalance.remainingBalance < 150 ? 'text-yellow-400' : 'text-green-400'
          )}>
            {walletBalance.isLoading ? '...' : fmt(walletBalance.remainingBalance)}
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
          <div className="text-[10px] text-muted-foreground">Balance (before perf fee)</div>
          <div className={cn('text-sm font-bold tabular-nums',
            walletBalance.isLoading ? 'text-muted-foreground' :
            (walletBalance.totalDeposits - walletBalance.trackedSpend) < 0 ? 'text-red-400' : 'text-foreground'
          )}>
            {walletBalance.isLoading ? '...' : fmt(walletBalance.totalDeposits - walletBalance.trackedSpend)}
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
          <div className="text-[10px] text-muted-foreground">Total Deposits</div>
          <div className="text-sm font-bold tabular-nums text-foreground">{fmt(netWalletCredits)}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
          <div className="text-[10px] text-muted-foreground">
            Google Ad Spend
            {gadsUrl && (
              <a href={gadsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-1" onClick={e => e.stopPropagation()}>
                <ExternalLink className="w-2.5 h-2.5 inline" />
              </a>
            )}
          </div>
          <div className="text-sm font-bold tabular-nums text-foreground">{adSpend.isLoading ? '...' : fmt(totalAdSpend)}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
          <div className="text-[10px] text-muted-foreground">Perf Fee</div>
          <div className="text-sm font-bold tabular-nums text-foreground">
            {walletBalance.isLoading ? '...' : `${walletBalance.performancePercentage}%`}
          </div>
        </div>
      </div>

      {/* 3-column reconciliation grid -- fixed row height */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Column 1: Alpha Hub Charges */}
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <div className="px-3 py-2 bg-muted/40 border-b border-border/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-violet-400" />
              Alpha Hub Charges
            </span>
            <span className="text-xs font-bold text-foreground tabular-nums">
              {fmt(billingData.reduce((s, r) => s + Number(r.amount || 0), 0))}
              <span className="text-muted-foreground font-normal ml-1">({billingData.length})</span>
            </span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {billingRecords.isLoading ? (
              <div className="p-4 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : billingData.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground text-center">No billing records</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border/30 bg-muted/60 backdrop-blur">
                    <th className="px-2 py-1.5 text-left text-muted-foreground font-medium">Date</th>
                    <th className="px-2 py-1.5 text-right text-muted-foreground font-medium">Amount</th>
                    <th className="px-2 py-1.5 text-center text-muted-foreground font-medium">PI</th>
                    <th className="px-2 py-1.5 text-center text-muted-foreground font-medium">W</th>
                  </tr>
                </thead>
                <tbody>
                  {billingData.map(rec => {
                    const hasPI = !!rec.stripe_payment_intent_id;
                    const piInStripe = hasPI && stripePiIds.has(rec.stripe_payment_intent_id!);
                    const hasWalletDeposit = walletBrIds.has(rec.id);
                    const isHighlighted = highlightBrId === rec.id;
                    return (
                      <tr
                        key={rec.id}
                        className={cn(
                          'h-10 border-b border-border/20 cursor-pointer transition-all duration-150',
                          isHighlighted ? 'bg-blue-500/20 ring-2 ring-inset ring-blue-400/50' : 'hover:bg-muted/30',
                          !isHighlighted && !hasPI && rec.status === 'paid' && 'bg-yellow-500/5',
                        )}
                        onClick={() => setHighlightBrId(isHighlighted ? null : rec.id)}
                      >
                        <td className="px-2 py-1">
                          <div className="text-foreground text-xs leading-tight">{fmtDate(rec.paid_at || rec.created_at)}</div>
                          <div className="text-[9px] text-violet-400 font-mono leading-tight">#{sid(rec.id)}</div>
                        </td>
                        <td className="px-2 py-1 text-right">
                          <div className="text-foreground font-medium tabular-nums">{fmt(Number(rec.amount))}</div>
                          <Badge variant="outline" className={cn('text-[9px] px-1',
                            rec.status === 'paid' ? 'bg-green-500/10 text-green-400 border-green-500/30'
                            : rec.status === 'overdue' ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                          )}>{rec.status}</Badge>
                        </td>
                        <td className="px-2 py-1 text-center">
                          {hasPI ? (
                            <a href={`https://dashboard.stripe.com/payments/${rec.stripe_payment_intent_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex flex-col items-center gap-0.5 hover:opacity-80" title={rec.stripe_payment_intent_id!} onClick={e => e.stopPropagation()}>
                              {piInStripe ? <CircleCheck className="w-3 h-3 text-green-400" /> : <AlertTriangle className="w-3 h-3 text-yellow-400" />}
                              <span className="text-[9px] text-emerald-400 font-mono">{shortPi(rec.stripe_payment_intent_id)}</span>
                            </a>
                          ) : linkingPi === rec.id ? (
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground inline" />
                          ) : (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="inline-flex items-center gap-0.5 text-red-400 hover:text-blue-400 transition-colors" title="Link to a Stripe charge" onClick={e => e.stopPropagation()}>
                                  <Link2 className="w-3 h-3" />
                                  <span className="text-[9px]">link</span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-0" align="start">
                                <div className="px-3 py-2 border-b border-border/50 bg-muted/40">
                                  <span className="text-xs font-semibold">Link to Stripe Charge</span>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  {unlinkableStripeCharges.length === 0 ? (
                                    <div className="px-3 py-2 text-xs text-muted-foreground">No unlinked charges</div>
                                  ) : unlinkableStripeCharges.map(charge => (
                                    <button key={charge.id} className="w-full px-3 py-2 text-left text-xs hover:bg-muted/50 flex items-center justify-between gap-2 border-b border-border/20 last:border-0" onClick={() => handleLinkPI(rec.id, charge.id)}>
                                      <span>{fmtDate(charge.created)}</span>
                                      <span className="font-medium tabular-nums">{fmt(charge.amount)}</span>
                                      <span className="text-emerald-400 font-mono text-[9px]">{shortPi(charge.id)}</span>
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </td>
                        <td className="px-2 py-1 text-center">
                          {hasWalletDeposit ? <CircleCheck className="w-3 h-3 text-green-400 inline" /> : <CircleX className="w-3 h-3 text-red-400 inline" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Column 2: Stripe Ad Spend */}
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <div className="px-3 py-2 bg-muted/40 border-b border-border/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              Stripe Ad Spend
            </span>
            <span className="text-xs font-bold text-foreground tabular-nums">
              {fmt(filteredStripeCharges.filter(c => c.status === 'succeeded' && !c.refunded).reduce((s, c) => s + c.amount, 0))}
              <span className="text-muted-foreground font-normal ml-1">({filteredStripeCharges.filter(c => c.status === 'succeeded' && !c.refunded).length})</span>
            </span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {stripeCharges.isLoading ? (
              <div className="p-4 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Fetching from Stripe...</span>
              </div>
            ) : stripeCharges.isError ? (
              <div className="p-4 text-xs text-red-400 text-center">{stripeCharges.error?.message}</div>
            ) : filteredStripeCharges.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground text-center">
                {stripeData?.customerIds.length === 0 ? 'No Stripe customer linked' : 'No charges'}
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border/30 bg-muted/60 backdrop-blur">
                    <th className="px-2 py-1.5 text-left text-muted-foreground font-medium">Date</th>
                    <th className="px-2 py-1.5 text-right text-muted-foreground font-medium">Amount</th>
                    <th className="px-2 py-1.5 text-center text-muted-foreground font-medium">Alpha</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStripeCharges.map(charge => {
                    const inAlpha = billingPiIds.has(charge.id);
                    const linkedBrId = piBrMap.get(charge.id);
                    const isRefunded = !!charge.refunded;
                    const isFailed = charge.status !== 'succeeded';
                    const isExcluded = isFailed || isRefunded;
                    const isHighlighted = linkedBrId != null && highlightBrId === linkedBrId;
                    const unlinkableBillingRecords = billingData.filter(r => !r.stripe_payment_intent_id && r.status === 'paid');
                    return (
                      <tr
                        key={charge.id}
                        className={cn(
                          'h-10 border-b border-border/20 cursor-pointer transition-all duration-150',
                          isHighlighted ? 'bg-blue-500/20 ring-2 ring-inset ring-blue-400/50' :
                          isFailed ? 'bg-red-500/5 opacity-60' :
                          isRefunded ? 'bg-orange-500/5 opacity-60' :
                          !inAlpha ? 'bg-yellow-500/5 hover:bg-muted/30' : 'hover:bg-muted/30'
                        )}
                        onClick={() => linkedBrId ? setHighlightBrId(highlightBrId === linkedBrId ? null : linkedBrId) : undefined}
                      >
                        <td className="px-2 py-1">
                          <div>
                            <a href={`https://dashboard.stripe.com/payments/${charge.id}`} target="_blank" rel="noopener noreferrer" className={cn('hover:underline inline-flex items-center gap-1 text-xs leading-tight', isExcluded ? 'text-muted-foreground' : 'text-foreground hover:text-blue-400')} onClick={e => e.stopPropagation()}>
                              {fmtDate(charge.created)}
                              <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                            </a>
                          </div>
                          <div className="text-[9px] text-emerald-400 font-mono leading-tight">{shortPi(charge.id)}</div>
                        </td>
                        <td className="px-2 py-1 text-right">
                          <div className={cn('font-medium tabular-nums', isFailed ? 'text-red-400 line-through' : isRefunded ? 'text-orange-400 line-through' : 'text-foreground')}>{fmt(charge.amount)}</div>
                          <Badge variant="outline" className={cn('text-[9px] px-1',
                            isRefunded ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                            charge.status === 'succeeded' ? 'bg-green-500/10 text-green-400 border-green-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                          )}>{isRefunded ? 'refunded' : charge.status === 'succeeded' ? 'paid' : 'failed'}</Badge>
                        </td>
                        <td className="px-2 py-1 text-center">
                          {inAlpha ? (
                            <span className="inline-flex flex-col items-center">
                              <CircleCheck className="w-3 h-3 text-green-400" />
                              {linkedBrId && <span className="text-[9px] text-violet-400 font-mono">#{sid(linkedBrId)}</span>}
                            </span>
                          ) : isExcluded ? (
                            <span className="text-[9px] text-muted-foreground">-</span>
                          ) : unlinkableBillingRecords.length > 0 ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="inline-flex items-center gap-0.5 text-yellow-400 hover:text-blue-400 transition-colors" onClick={e => e.stopPropagation()}>
                                  <Link2 className="w-3 h-3" />
                                  <span className="text-[9px]">link</span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-0" align="end">
                                <div className="px-3 py-2 border-b border-border/50 bg-muted/40">
                                  <span className="text-xs font-semibold">Link to Alpha Hub Record</span>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  {unlinkableBillingRecords.map(rec => (
                                    <button key={rec.id} className="w-full px-3 py-2 text-left text-xs hover:bg-muted/50 flex items-center justify-between gap-2 border-b border-border/20 last:border-0" onClick={() => handleLinkPI(rec.id, charge.id)}>
                                      <span className="text-violet-400 font-mono">#{sid(rec.id)}</span>
                                      <span>{fmtDate(rec.paid_at || rec.created_at)}</span>
                                      <span className="font-medium tabular-nums">{fmt(Number(rec.amount))}</span>
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <CircleX className="w-3 h-3 text-yellow-400 inline" />
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

        {/* Column 3: Wallet Credits */}
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <div className="px-3 py-2 bg-muted/40 border-b border-border/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ArrowDownToLine className="w-3.5 h-3.5 text-cyan-400" />
              Wallet Credits
            </span>
            <span className="text-xs font-bold text-foreground tabular-nums">
              {fmt(netWalletCredits)}
            </span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {walletTransactions.isLoading ? (
              <div className="p-4 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : walletData.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground text-center">No wallet credits</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border/30 bg-muted/60 backdrop-blur">
                    <th className="px-2 py-1.5 text-left text-muted-foreground font-medium">Date</th>
                    <th className="px-2 py-1.5 text-right text-muted-foreground font-medium">Amount</th>
                    <th className="px-2 py-1.5 text-center text-muted-foreground font-medium">Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {walletData.map(tx => {
                    const isAdjustment = tx.transaction_type === 'adjustment';
                    const isReversed = !isAdjustment && tx.billing_record_id && cancelledBillingIds.has(tx.billing_record_id);
                    const hasBillingRecord = !isAdjustment && !!tx.billing_record_id && !isReversed;
                    const isUnbacked = !isAdjustment && !tx.billing_record_id;
                    const linkedPi = tx.billing_record_id ? brPiMap.get(tx.billing_record_id) : null;
                    const isHighlighted = tx.billing_record_id != null && highlightBrId === tx.billing_record_id;
                    return (
                      <tr
                        key={tx.id}
                        className={cn(
                          'h-10 border-b border-border/20 cursor-pointer transition-all duration-150',
                          isHighlighted ? 'bg-blue-500/20 ring-2 ring-inset ring-blue-400/50' :
                          isReversed ? 'bg-red-500/5 line-through opacity-60' :
                          isAdjustment ? 'bg-blue-500/5 hover:bg-muted/30' :
                          isUnbacked ? 'bg-yellow-500/5 hover:bg-muted/30' : 'hover:bg-muted/30',
                        )}
                        onClick={() => tx.billing_record_id ? setHighlightBrId(highlightBrId === tx.billing_record_id ? null : tx.billing_record_id) : undefined}
                      >
                        <td className="px-2 py-1 text-foreground text-xs">{fmtDate(tx.created_at)}</td>
                        <td className={cn('px-2 py-1 text-right font-medium tabular-nums',
                          isAdjustment ? 'text-blue-400' : isReversed ? 'text-red-400' : 'text-foreground'
                        )}>
                          {isAdjustment && (Number(tx.amount) < 0 ? '-' : '+')}{fmt(Number(tx.amount))}
                        </td>
                        <td className="px-2 py-1 text-center">
                          {isReversed ? (
                            <Badge variant="outline" className="text-[9px] px-1 bg-red-500/10 text-red-400 border-red-500/30">reversed</Badge>
                          ) : isAdjustment ? (
                            <span className="text-[9px] text-muted-foreground">adj</span>
                          ) : hasBillingRecord ? (
                            <span className="inline-flex flex-col items-center">
                              <span className="text-[9px] text-violet-400 font-mono">#{sid(tx.billing_record_id)}</span>
                              {linkedPi && <span className="text-[9px] text-emerald-400 font-mono">{shortPi(linkedPi)}</span>}
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-1 bg-yellow-500/10 text-yellow-400 border-yellow-500/30">unbacked</Badge>
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

      {/* Google Ad Spend -- compact at bottom */}
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <div className="px-3 py-2 bg-muted/40 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            Google Ad Spend (Weekly)
            {gadsUrl && (
              <a href={gadsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </span>
          <span className="text-xs font-bold text-foreground tabular-nums">{adSpend.isLoading ? '...' : fmt(totalAdSpend)}</span>
        </div>
        {!adSpend.isLoading && weeklySpend.length > 0 && (
          <div className="flex gap-3 px-3 py-2 overflow-x-auto">
            {weeklySpend.map(w => (
              <div key={w.weekStart} className="text-xs shrink-0">
                <span className="text-muted-foreground">{fmtShort(w.weekStart)}</span>
                <span className="text-foreground font-medium tabular-nums ml-1.5">{fmt(w.total)}</span>
                <span className="text-muted-foreground ml-1">({w.days}d)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TODO: Plan 02 - Verification stamp form, v1_manual records */}
      {/* TODO: Plan 03 - AI analysis section */}
    </div>
  );
}
