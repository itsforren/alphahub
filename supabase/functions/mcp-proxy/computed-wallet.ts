/**
 * Computed wallet balance helper — matches frontend useComputedWalletBalance
 * Calculates balance from transactions instead of stored value
 * Applies performance percentage adjustment to match what agents see in dashboard
 */

/** Fetch the performance percentage from onboarding_settings (dynamic, matches frontend usePerformancePercentage) */
export async function getPerformancePercentage(sb: any): Promise<number> {
  const { data, error } = await sb
    .from('onboarding_settings')
    .select('setting_value')
    .eq('setting_key', 'performance_percentage')
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch performance_percentage:', error);
    return 0;
  }

  const raw = data?.setting_value;
  const parsed = raw != null ? Number(raw) : NaN;
  if (Number.isFinite(parsed)) return parsed;
  if (raw != null) console.warn('Invalid performance_percentage setting_value:', raw);
  return 0;
}

/** Apply performance percentage to a value: value * (1 + pct/100) */
export function applyPerformancePercentage(value: number, percentage: number): number {
  return value * (1 + percentage / 100);
}

export interface ComputedWallet {
  totalDeposits: number;
  rawSpend: number;          // Actual Google Ads spend
  adjustedSpend: number;     // Spend with performance fee applied
  remainingBalance: number;  // Deposits minus adjustedSpend (what agents see)
  rawBalance: number;        // Deposits minus rawSpend (ledger truth)
  trackingStartDate: string | null;
  performancePercentage: number;
}

export async function getComputedWalletBalance(sb: any, clientId: string, perfPct?: number): Promise<ComputedWallet> {
  // Fetch perf pct if not provided
  const pct = perfPct ?? await getPerformancePercentage(sb);

  const { data: wallet } = await sb
    .from('client_wallets')
    .select('tracking_start_date')
    .eq('client_id', clientId)
    .maybeSingle();

  const trackingStartDate = wallet?.tracking_start_date ?? null;

  const { data: deposits } = await sb
    .from('wallet_transactions')
    .select('amount')
    .eq('client_id', clientId)
    .in('transaction_type', ['deposit', 'adjustment']);

  const totalDeposits = deposits?.reduce((sum: number, tx: any) => sum + Number(tx.amount), 0) ?? 0;

  let rawSpend = 0;
  if (trackingStartDate) {
    const { data: spend } = await sb
      .from('ad_spend_daily')
      .select('cost')
      .eq('client_id', clientId)
      .gte('spend_date', trackingStartDate);

    rawSpend = spend?.reduce((sum: number, day: any) => sum + Number(day.cost || 0), 0) ?? 0;
  }

  const adjustedSpend = applyPerformancePercentage(rawSpend, pct);

  // Canonical balance from compute_wallet_balance() RPC — single source of truth
  const { data: rpcBalance, error: rpcError } = await sb.rpc('compute_wallet_balance', {
    p_client_id: clientId,
  });
  if (rpcError) {
    console.error('compute_wallet_balance RPC failed:', rpcError);
  }
  // Use RPC result for canonical balance; fall back to inline calc if RPC fails
  const remainingBalance = rpcError ? (totalDeposits - adjustedSpend) : Number(rpcBalance);
  const rawBalance = totalDeposits - rawSpend;

  return { totalDeposits, rawSpend, adjustedSpend, remainingBalance, rawBalance, trackingStartDate, performancePercentage: pct };
}

/** Yesterday's total ad spend for a client */
export async function getYesterdaySpend(sb: any, clientId: string): Promise<number> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const { data } = await sb
    .from('ad_spend_daily')
    .select('cost')
    .eq('client_id', clientId)
    .eq('spend_date', yesterdayStr);

  return data?.reduce((sum: number, r: any) => sum + Number(r.cost || 0), 0) ?? 0;
}

/** Today's total ad spend for a client */
export async function getTodaySpend(sb: any, clientId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  const { data } = await sb
    .from('ad_spend_daily')
    .select('cost')
    .eq('client_id', clientId)
    .eq('spend_date', today);

  return data?.reduce((sum: number, r: any) => sum + Number(r.cost || 0), 0) ?? 0;
}

/** MTD metrics including spend, leads, submitted apps, issued premium, Alpha ROI */
export async function getMTDMetrics(sb: any, clientId: string): Promise<{
  mtdSpend: number;
  mtdLeads: number;
  totalSubmitted: number;
  totalIssuedPaid: number;
  alphaROI: number;
}> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const startStr = startOfMonth.toISOString().split('T')[0];
  const startISO = startOfMonth.toISOString();

  const [spendRes, clientRes, submittedRes, issuedRes] = await Promise.all([
    sb.from('ad_spend_daily').select('cost').eq('client_id', clientId).gte('spend_date', startStr),
    sb.from('clients').select('mtd_leads').eq('id', clientId).maybeSingle(),
    sb.from('leads').select('id').eq('agent_id', clientId).eq('status', 'application').gte('created_at', startISO),
    sb.from('leads').select('target_premium').eq('agent_id', clientId).in('status', ['issued', 'paid']).gte('created_at', startISO),
  ]);

  const mtdSpend = spendRes.data?.reduce((sum: number, day: any) => sum + Number(day.cost || 0), 0) ?? 0;
  const mtdLeads = clientRes.data?.mtd_leads ?? 0;
  const totalSubmitted = submittedRes.data?.length ?? 0;
  const totalIssuedPaid = issuedRes.data?.reduce((sum: number, lead: any) => sum + Number(lead.target_premium || 0), 0) ?? 0;
  const alphaROI = mtdSpend > 0 ? (totalIssuedPaid / mtdSpend) : 0;

  return { mtdSpend, mtdLeads, totalSubmitted, totalIssuedPaid, alphaROI };
}

export interface BulkBalance {
  totalDeposits: number;
  rawSpend: number;
  adjustedSpend: number;
  remainingBalance: number; // adjusted (what agents see)
  rawBalance: number;       // raw ledger
}

/**
 * Bulk-compute wallet balances for ALL clients in 3 queries + 1 settings query.
 * NOTE: Uses inline computation for performance (N RPC calls would be too expensive).
 * For single-client canonical balance, use getComputedWalletBalance() which calls the RPC.
 * If the formula diverges, this function must be updated to match compute_wallet_balance().
 *
 * Applies performance percentage so balances match the frontend dashboard.
 * Returns a Map<clientId, BulkBalance>
 */
export async function getAllComputedBalances(sb: any, perfPct?: number): Promise<{ balances: Map<string, BulkBalance>; performancePercentage: number }> {
  const [walletsRes, depositsRes, spendRes, pct] = await Promise.all([
    sb.from('client_wallets').select('client_id, tracking_start_date'),
    sb.from('wallet_transactions').select('client_id, amount').in('transaction_type', ['deposit', 'adjustment']),
    sb.from('ad_spend_daily').select('client_id, cost, spend_date'),
    perfPct != null ? Promise.resolve(perfPct) : getPerformancePercentage(sb),
  ]);

  const wallets = walletsRes.data ?? [];
  const deposits = depositsRes.data ?? [];
  const spendRows = spendRes.data ?? [];

  // Build tracking start date map
  const trackingMap: Record<string, string | null> = {};
  wallets.forEach((w: any) => { trackingMap[w.client_id] = w.tracking_start_date ?? null; });

  // Sum deposits per client
  const depositMap: Record<string, number> = {};
  deposits.forEach((d: any) => {
    depositMap[d.client_id] = (depositMap[d.client_id] || 0) + Number(d.amount);
  });

  // Sum spend per client (only since tracking start)
  const spendMap: Record<string, number> = {};
  spendRows.forEach((s: any) => {
    const start = trackingMap[s.client_id];
    if (start && s.spend_date >= start) {
      spendMap[s.client_id] = (spendMap[s.client_id] || 0) + Number(s.cost || 0);
    }
  });

  // Build result map for all known client IDs
  const allClientIds = new Set([...Object.keys(trackingMap), ...Object.keys(depositMap)]);
  const result = new Map<string, BulkBalance>();

  for (const cid of allClientIds) {
    const totalDeposits = depositMap[cid] ?? 0;
    const rawSpend = spendMap[cid] ?? 0;
    const adjustedSpend = applyPerformancePercentage(rawSpend, pct);
    result.set(cid, {
      totalDeposits,
      rawSpend,
      adjustedSpend,
      remainingBalance: totalDeposits - adjustedSpend,
      rawBalance: totalDeposits - rawSpend,
    });
  }

  return { balances: result, performancePercentage: pct };
}
