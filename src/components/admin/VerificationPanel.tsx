import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useComputedWalletBalance } from '@/hooks/useComputedWalletBalance';
import { useAuditBooks, useClientVerifications, useVerifyClient, useVerifyRecord, useAnalyzeBilling, useClientAIAnalysis } from '@/hooks/useBillingVerification';
import type { AIAnalysisResult, AIFinding } from '@/hooks/useBillingVerification';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
  FileCheck2,
  ChevronDown,
  ChevronRight,
  Brain,
  Info,
  Flag,
  Notebook,
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
        .select('id, amount, status, paid_at, created_at, stripe_payment_intent_id, stripe_account, notes, charge_attempts, last_charge_error, source')
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

// ── Cross-reference chain view ──

interface ChainRecord {
  id: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  stripe_payment_intent_id: string | null;
  source: string | null;
}

interface CrossReferenceChainProps {
  billingData: ChainRecord[];
  walletBrIds: Set<string>;
  stripePiIds: Set<string>;
  filteredStripeCharges: Array<{ id: string; amount: number; status: string; created: string }>;
  clientId: string;
}

function CrossReferenceChain({
  billingData,
  walletBrIds,
  stripePiIds,
  filteredStripeCharges,
  clientId,
}: CrossReferenceChainProps) {
  const [signOffId, setSignOffId] = useState<string | null>(null);
  const [signOffNotes, setSignOffNotes] = useState('');
  const verifyRecord = useVerifyRecord();

  // Get per-record verifications for this client
  const { data: verifications = [] } = useClientVerifications(clientId);
  const verifiedRecordIds = new Set(
    verifications
      .filter(v => v.billing_record_id && v.status === 'verified')
      .map(v => v.billing_record_id!)
  );

  // Classify each record
  const chainRows = billingData.map(rec => {
    const hasPI = !!rec.stripe_payment_intent_id;
    const piInStripe = hasPI && stripePiIds.has(rec.stripe_payment_intent_id!);
    const hasWalletDeposit = walletBrIds.has(rec.id);
    const isV1Manual = rec.source === 'v1_manual' || (!hasPI && rec.source !== 'auto_recharge' && rec.source !== 'stripe');
    const isPhantom = rec.status === 'paid' && !hasPI;
    const isVerified = verifiedRecordIds.has(rec.id);

    const issues: string[] = [];
    if (isPhantom && !isV1Manual) issues.push('Paid without Stripe PI');
    if (hasPI && !piInStripe) issues.push('Stripe PI not found');
    if (rec.status === 'paid' && !hasWalletDeposit) issues.push('No wallet deposit');
    if (isV1Manual && !isVerified) issues.push('Legacy record unsigned');

    return { ...rec, hasPI, piInStripe, hasWalletDeposit, isV1Manual, isPhantom, isVerified, issues };
  });

  // Sort: problems first, then v1_manual unsigned, then clean
  const sorted = [...chainRows].sort((a, b) => {
    if (a.issues.length !== b.issues.length) return b.issues.length - a.issues.length;
    if (a.isV1Manual !== b.isV1Manual) return a.isV1Manual ? -1 : 1;
    return 0;
  });

  const issueCount = chainRows.filter(r => r.issues.length > 0).length;
  const phantomCount = chainRows.filter(r => r.isPhantom && !r.isV1Manual).length;
  const v1ManualRecords = chainRows.filter(r => r.isV1Manual);
  const v1VerifiedCount = v1ManualRecords.filter(r => r.isVerified).length;
  const v1Total = v1ManualRecords.length;

  const sourceBadge = (source: string | null) => {
    if (source === 'v1_manual') return <Badge variant="outline" className="text-[9px] px-1 bg-amber-500/10 text-amber-400 border-amber-500/30">Legacy</Badge>;
    if (source === 'auto_recharge') return <Badge variant="outline" className="text-[9px] px-1 bg-blue-500/10 text-blue-400 border-blue-500/30">Recharge</Badge>;
    if (source === 'stripe') return <Badge variant="outline" className="text-[9px] px-1 bg-green-500/10 text-green-400 border-green-500/30">Stripe</Badge>;
    return <Badge variant="outline" className="text-[9px] px-1 bg-muted/30 text-muted-foreground border-border/50">Unknown</Badge>;
  };

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      {/* Header with issue summary */}
      <div className="px-3 py-2 bg-muted/40 border-b border-border/50 flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-blue-400" />
          Cross-Reference Chain
          <span className="text-muted-foreground font-normal">({billingData.length} records)</span>
        </span>
        <div className="flex items-center gap-3 text-xs">
          {issueCount > 0 ? (
            <span className="text-red-400 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {issueCount} issue{issueCount !== 1 ? 's' : ''}
              {phantomCount > 0 && (
                <span className="text-red-300 ml-1">({phantomCount} phantom)</span>
              )}
            </span>
          ) : (
            <span className="text-green-400 font-medium flex items-center gap-1">
              <CircleCheck className="w-3 h-3" />
              All chains intact
            </span>
          )}
          {v1Total > 0 && (
            <span className={cn('font-medium', v1VerifiedCount === v1Total ? 'text-green-400' : 'text-amber-400')}>
              Legacy: {v1VerifiedCount}/{v1Total} verified
            </span>
          )}
        </div>
      </div>

      {/* v1_manual progress bar */}
      {v1Total > 0 && (
        <div className="px-3 py-2 bg-muted/20 border-b border-border/30">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Legacy record sign-off progress</span>
            <span className={cn('font-medium', v1VerifiedCount === v1Total ? 'text-green-400' : 'text-amber-400')}>
              {v1VerifiedCount} of {v1Total}
            </span>
          </div>
          <Progress value={v1Total > 0 ? (v1VerifiedCount / v1Total) * 100 : 0} className="h-1.5" />
        </div>
      )}

      {/* Chain table */}
      <div className="max-h-[350px] overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground text-center">No billing records in range</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border/30 bg-muted/60 backdrop-blur">
                <th className="px-2 py-1.5 text-left text-muted-foreground font-medium">Date</th>
                <th className="px-2 py-1.5 text-right text-muted-foreground font-medium">Amount</th>
                <th className="px-2 py-1.5 text-center text-muted-foreground font-medium">Status</th>
                <th className="px-2 py-1.5 text-center text-muted-foreground font-medium">Source</th>
                <th className="px-2 py-1.5 text-center text-muted-foreground font-medium">Stripe PI</th>
                <th className="px-2 py-1.5 text-center text-muted-foreground font-medium">Wallet</th>
                <th className="px-2 py-1.5 text-left text-muted-foreground font-medium">Issues</th>
                <th className="px-2 py-1.5 text-center text-muted-foreground font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(rec => {
                const isSigningOff = signOffId === rec.id;
                return (
                  <tr
                    key={rec.id}
                    className={cn(
                      'border-b border-border/20 transition-colors',
                      rec.isPhantom && !rec.isV1Manual && 'bg-red-500/10',
                      rec.isV1Manual && !rec.isVerified && 'bg-amber-500/5',
                      rec.issues.length === 0 && 'hover:bg-muted/30',
                    )}
                  >
                    <td className="px-2 py-1.5">
                      <div className="text-foreground">{fmtDate(rec.paid_at || rec.created_at)}</div>
                      <div className="text-[9px] text-violet-400 font-mono">#{sid(rec.id)}</div>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <span className="text-foreground font-medium tabular-nums">{fmt(Number(rec.amount))}</span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Badge variant="outline" className={cn('text-[9px] px-1',
                        rec.status === 'paid' ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : rec.status === 'overdue' ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                      )}>{rec.status}</Badge>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {sourceBadge(rec.source)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {rec.hasPI ? (
                        <a
                          href={`https://dashboard.stripe.com/payments/${rec.stripe_payment_intent_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex flex-col items-center gap-0.5 hover:opacity-80"
                          title={rec.stripe_payment_intent_id!}
                        >
                          {rec.piInStripe ? (
                            <CircleCheck className="w-3 h-3 text-green-400" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-yellow-400" />
                          )}
                          <span className="text-[9px] text-emerald-400 font-mono inline-flex items-center gap-0.5">
                            {shortPi(rec.stripe_payment_intent_id)}
                            <ExternalLink className="w-2 h-2 opacity-60" />
                          </span>
                        </a>
                      ) : (
                        <span className="text-red-400 text-[9px] font-medium">Missing</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {rec.hasWalletDeposit ? (
                        <CircleCheck className="w-3 h-3 text-green-400 inline" />
                      ) : (
                        <CircleX className="w-3 h-3 text-red-400 inline" />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {rec.issues.length > 0 ? (
                        <span className="text-red-400 text-[10px]">
                          {rec.issues.join('; ')}
                        </span>
                      ) : (
                        <span className="text-green-400 text-[10px]">OK</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {rec.isV1Manual && !rec.isVerified ? (
                        isSigningOff ? (
                          <div className="flex flex-col gap-1 min-w-[120px]">
                            <Textarea
                              placeholder="Notes (optional)..."
                              value={signOffNotes}
                              onChange={e => setSignOffNotes(e.target.value)}
                              className="h-12 text-[10px] resize-none"
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-5 text-[9px] px-1.5 flex-1"
                                onClick={() => { setSignOffId(null); setSignOffNotes(''); }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                className="h-5 text-[9px] px-1.5 flex-1 bg-green-600 hover:bg-green-700 text-white"
                                disabled={verifyRecord.isPending}
                                onClick={() => {
                                  verifyRecord.mutate(
                                    { clientId, billingRecordId: rec.id, notes: signOffNotes || undefined },
                                    { onSuccess: () => { setSignOffId(null); setSignOffNotes(''); } }
                                  );
                                }}
                              >
                                {verifyRecord.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2 gap-1 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                            onClick={() => { setSignOffId(rec.id); setSignOffNotes(''); }}
                          >
                            <FileCheck2 className="w-3 h-3" />
                            Sign Off
                          </Button>
                        )
                      ) : rec.isV1Manual && rec.isVerified ? (
                        <Badge variant="outline" className="text-[9px] px-1 bg-green-500/10 text-green-400 border-green-500/30">
                          <CircleCheck className="w-2.5 h-2.5 mr-0.5" />
                          Verified
                        </Badge>
                      ) : rec.issues.length === 0 ? (
                        <CircleCheck className="w-3 h-3 text-green-400 inline" />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Verification Stamp Form ──

interface VerificationStampFormProps {
  clientId: string;
  v1Total: number;
  v1VerifiedCount: number;
}

function VerificationStampForm({ clientId, v1Total, v1VerifiedCount }: VerificationStampFormProps) {
  const [scope, setScope] = useState<'all_records' | 'new_only' | 'records_through_date'>('all_records');
  const [scopeDate, setScopeDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);

  const verifyClient = useVerifyClient();
  const { data: verifications = [] } = useClientVerifications(clientId);

  // Client-level verifications (not per-record)
  const clientVerifications = verifications.filter(v => !v.billing_record_id);
  const allLegacySigned = v1Total === 0 || v1VerifiedCount === v1Total;

  const handleVerify = () => {
    verifyClient.mutate(
      {
        clientId,
        scope,
        scopeDate: scope === 'records_through_date' ? scopeDate : null,
        notes: notes || undefined,
        legacyVerifiedCount: v1VerifiedCount,
      },
      {
        onSuccess: () => {
          setNotes('');
        },
      }
    );
  };

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/50 flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
          Verify Client
        </span>
        {!allLegacySigned && (
          <span className="text-[10px] text-amber-400">
            Sign off all {v1Total - v1VerifiedCount} remaining legacy record{v1Total - v1VerifiedCount !== 1 ? 's' : ''} first
          </span>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* v1_manual progress */}
        {v1Total > 0 && (
          <div className="flex items-center gap-2 text-xs">
            {allLegacySigned ? (
              <span className="text-green-400 flex items-center gap-1">
                <CircleCheck className="w-3 h-3" />
                All {v1Total} legacy records verified
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {v1VerifiedCount} of {v1Total} legacy records verified
              </span>
            )}
          </div>
        )}

        {/* Scope selector */}
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground font-medium">Verification scope</span>
          <RadioGroup
            value={scope}
            onValueChange={(v) => setScope(v as typeof scope)}
            className="space-y-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all_records" id="scope-all" />
              <Label htmlFor="scope-all" className="text-xs text-foreground cursor-pointer">All records</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new_only" id="scope-new" disabled={!allLegacySigned} />
              <Label htmlFor="scope-new" className={cn('text-xs cursor-pointer', allLegacySigned ? 'text-foreground' : 'text-muted-foreground')}>New records only</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="records_through_date" id="scope-date" />
              <Label htmlFor="scope-date" className="text-xs text-foreground cursor-pointer">Records through date</Label>
              {scope === 'records_through_date' && (
                <Input
                  type="date"
                  value={scopeDate}
                  onChange={e => setScopeDate(e.target.value)}
                  className="h-6 w-32 text-[10px] ml-2"
                />
              )}
            </div>
          </RadioGroup>
        </div>

        {/* Notes */}
        <Textarea
          placeholder="Verification notes..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="h-16 text-xs resize-none"
        />

        {/* Submit */}
        <Button
          className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
          size="sm"
          disabled={!allLegacySigned || verifyClient.isPending}
          onClick={handleVerify}
        >
          {verifyClient.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
          Mark as Verified
        </Button>

        {/* Verification history */}
        {clientVerifications.length > 0 && (
          <div className="border-t border-border/30 pt-2">
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setHistoryOpen(!historyOpen)}
            >
              {historyOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Verification History ({clientVerifications.length})
            </button>
            {historyOpen && (
              <div className="mt-2 space-y-2">
                {clientVerifications.map(v => {
                  const analysis = v.ai_analysis as Record<string, unknown> | null;
                  const vScope = (analysis?.scope as string) ?? 'unknown';
                  return (
                    <div key={v.id} className="rounded bg-muted/30 px-2 py-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground font-medium">
                          {v.verified_at ? fmtDate(v.verified_at) : 'Unknown date'}
                        </span>
                        <Badge variant="outline" className={cn('text-[9px] px-1',
                          vScope === 'all_records' ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                        )}>
                          {vScope === 'all_records' ? 'All' : vScope === 'new_only' ? 'New only' : vScope === 'records_through_date' ? 'Through date' : vScope}
                        </Badge>
                      </div>
                      {v.resolution_notes && (
                        <p className="text-muted-foreground mt-0.5">{v.resolution_notes}</p>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {v.verification_method === 'human' ? 'Manual' : v.verification_method === 'ai' ? 'AI' : 'Automated'} verification
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── AI Analysis Section ──

function AIAnalysisSection({ clientId }: { clientId: string }) {
  const analyzeMutation = useAnalyzeBilling();
  const { data: cached, isLoading: cacheLoading } = useClientAIAnalysis(clientId);
  const [confirmAction, setConfirmAction] = useState<{ findingId: string; action: string } | null>(null);

  const handleAnalyze = () => {
    analyzeMutation.mutate(clientId);
  };

  const analysis: AIAnalysisResult | null = analyzeMutation.data ?? cached?.result ?? null;
  const analyzedAt = cached?.analyzedAt ?? null;
  const isAnalyzing = analyzeMutation.isPending;

  const statusColors: Record<string, string> = {
    clean: 'bg-green-500/10 text-green-400 border-green-500/30',
    issues_found: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    critical_issues: 'bg-red-500/10 text-red-400 border-red-500/30',
    error: 'bg-muted/30 text-muted-foreground border-border/50',
  };

  const statusLabels: Record<string, string> = {
    clean: 'Clean',
    issues_found: 'Issues Found',
    critical_issues: 'Critical Issues',
    error: 'Error',
  };

  const severityIcon = (severity: AIFinding['severity']) => {
    switch (severity) {
      case 'critical': return <CircleX className="w-4 h-4 text-red-400 shrink-0" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />;
      case 'info': return <Info className="w-4 h-4 text-blue-400 shrink-0" />;
    }
  };

  const actionButton = (finding: AIFinding) => {
    const isConfirming = confirmAction?.findingId === finding.id;

    if (isConfirming) {
      return (
        <span className="inline-flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Sure?</span>
          <button
            className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
            onClick={() => setConfirmAction(null)}
          >
            Yes
          </button>
          <button
            className="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground hover:bg-muted/50"
            onClick={() => setConfirmAction(null)}
          >
            Cancel
          </button>
        </span>
      );
    }

    switch (finding.suggested_action) {
      case 'flag_for_review':
        return (
          <button
            className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
            onClick={() => setConfirmAction({ findingId: finding.id, action: 'flag_for_review' })}
          >
            <Flag className="w-3 h-3" /> Flag
          </button>
        );
      case 'mark_verified':
        return (
          <button
            className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
            onClick={() => setConfirmAction({ findingId: finding.id, action: 'mark_verified' })}
          >
            <CircleCheck className="w-3 h-3" /> Verify
          </button>
        );
      case 'create_adjustment':
        return (
          <button
            className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
            onClick={() => setConfirmAction({ findingId: finding.id, action: 'create_adjustment' })}
          >
            <Wallet className="w-3 h-3" /> Adjust
          </button>
        );
      case 'investigate_stripe':
        return (
          <a
            href={`https://dashboard.stripe.com/search#query=${finding.affected_records[0] || ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> Stripe
          </a>
        );
      case 'contact_client':
        return (
          <button
            className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-muted/30 text-muted-foreground border border-border/50 hover:bg-muted/50 transition-colors"
            onClick={() => setConfirmAction({ findingId: finding.id, action: 'contact_client' })}
          >
            <Notebook className="w-3 h-3" /> Note
          </button>
        );
      default:
        return null;
    }
  };

  const categoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      phantom_payment: 'Phantom Payment',
      missing_deposit: 'Missing Deposit',
      amount_mismatch: 'Amount Mismatch',
      duplicate_charge: 'Duplicate Charge',
      refund_discrepancy: 'Refund Discrepancy',
      stale_record: 'Stale Record',
      legacy_unverified: 'Legacy Unverified',
    };
    return labels[cat] || cat;
  };

  return (
    <div className="space-y-3">
      {/* Header with Analyze / Re-analyze button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-foreground">AI Analysis</span>
          {analyzedAt && !isAnalyzing && (
            <span className="text-[10px] text-muted-foreground">
              Last analyzed: {(() => { try { return format(new Date(analyzedAt), 'MMM d, h:mm a'); } catch { return analyzedAt; } })()}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Brain className="w-3.5 h-3.5" />
          )}
          {isAnalyzing ? 'Analyzing...' : analysis ? 'Re-analyze' : 'Analyze with AI'}
        </Button>
      </div>

      {/* Loading state */}
      {cacheLoading && !analysis && (
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-full" />
        </div>
      )}

      {/* Error state */}
      {analyzeMutation.isError && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <span className="text-xs text-red-400">
            Analysis failed: {(analyzeMutation.error as Error)?.message || 'Unknown error'}
          </span>
        </div>
      )}

      {/* Results display */}
      {analysis && !isAnalyzing && (
        <div className="space-y-3">
          {/* Status badge */}
          <div className="flex items-start gap-3">
            <Badge
              variant="outline"
              className={cn('text-sm gap-1.5 px-3 py-1 font-semibold', statusColors[analysis.status] || statusColors.error)}
            >
              {analysis.status === 'clean' && <CircleCheck className="w-4 h-4" />}
              {analysis.status === 'issues_found' && <AlertTriangle className="w-4 h-4" />}
              {analysis.status === 'critical_issues' && <CircleX className="w-4 h-4" />}
              {analysis.status === 'error' && <Info className="w-4 h-4" />}
              {statusLabels[analysis.status] || 'Unknown'}
            </Badge>
          </div>

          {/* Summary */}
          {analysis.summary && (
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
          )}

          {/* Findings */}
          {analysis.findings.length > 0 && (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 border-b border-border/50">
                <span className="text-xs font-semibold text-foreground">
                  Findings ({analysis.findings.length})
                </span>
              </div>
              <div className="divide-y divide-border/30">
                {analysis.findings.map((finding) => (
                  <div key={finding.id} className="px-3 py-2.5 flex items-start gap-3">
                    {severityIcon(finding.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-foreground">{finding.description}</span>
                        <Badge variant="outline" className="text-[9px] px-1 bg-muted/30 text-muted-foreground border-border/50">
                          {categoryLabel(finding.category)}
                        </Badge>
                        {finding.amount != null && finding.amount > 0 && (
                          <span className="text-[10px] font-medium tabular-nums text-foreground">{fmt(finding.amount)}</span>
                        )}
                      </div>
                      {finding.action_description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{finding.action_description}</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {actionButton(finding)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* v1_manual summary */}
          {analysis.v1_manual_summary && (
            <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400">Legacy Records</span>
              </div>
              <p className="text-xs text-amber-300/80">{analysis.v1_manual_summary}</p>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="px-3 py-2 rounded-lg bg-muted/20 border border-border/30">
              <span className="text-xs font-semibold text-foreground">Recommendations</span>
              <ul className="mt-1 space-y-0.5">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-muted-foreground/50 mt-0.5">--</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
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

  // v1_manual legacy record stats for verification stamp gate
  const { data: clientVerifications = [] } = useClientVerifications(clientId);
  const verifiedRecordIds = new Set(
    clientVerifications
      .filter(v => v.billing_record_id && v.status === 'verified')
      .map(v => v.billing_record_id!)
  );
  const v1ManualRecords = billingData.filter(r =>
    (r as any).source === 'v1_manual' ||
    (!r.stripe_payment_intent_id && (r as any).source !== 'auto_recharge' && (r as any).source !== 'stripe')
  );
  const v1Total = v1ManualRecords.length;
  const v1VerifiedCount = v1ManualRecords.filter(r => verifiedRecordIds.has(r.id)).length;

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

      {/* Cross-reference chain view -- billing record -> Stripe PI -> wallet deposit */}
      <CrossReferenceChain
        billingData={billingData}
        walletBrIds={walletBrIds}
        stripePiIds={stripePiIds}
        filteredStripeCharges={filteredStripeCharges}
        clientId={clientId}
      />

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

      {/* Verification stamp form */}
      <VerificationStampForm
        clientId={clientId}
        v1Total={v1Total}
        v1VerifiedCount={v1VerifiedCount}
      />

      {/* AI Analysis Section -- intelligence layer */}
      <div className="border-t border-border/30" />
      <AIAnalysisSection clientId={clientId} />
    </div>
  );
}
