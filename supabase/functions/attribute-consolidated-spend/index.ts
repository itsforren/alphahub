import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Constants ──
const CONSOLIDATED_CAMPAIGN_ID = '23706217116';
const CUSTOMER_ID               = '6551751244';
const GOOGLE_ADS_API_VERSION    = 'v22';
const CAMPAIGN_LABEL            = 'ALPHA AGENT EXCLUSIVE IUL SEARCH CAMPAIGN';
const DEFAULT_MONTHLY_BUDGET    = 1000;
const DEFAULT_BASE_PCT          = 40; // 40% base, 60% lead-weighted
const MIN_WALLET_BALANCE        = 100;

function getMccId(): string {
  return (Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID') ?? '').trim().replace(/-/g, '');
}

// ── Helpers ──

function getTodayET(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}

function getETDayBoundsUTC(etDate: string): { start: string; end: string } {
  const isDST = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', timeZoneName: 'short',
  }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value === 'EDT';
  const offset = isDST ? '-04:00' : '-05:00';
  return {
    start: new Date(`${etDate}T00:00:00${offset}`).toISOString(),
    end:   new Date(`${etDate}T23:59:59.999${offset}`).toISOString(),
  };
}

function isTestLead(lead: { first_name?: string | null; last_name?: string | null }): boolean {
  return `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.toLowerCase().includes('test');
}

// ── Google Ads OAuth ──
async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     Deno.env.get('GOOGLE_ADS_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_ADS_CLIENT_SECRET')!,
      refresh_token: Deno.env.get('GOOGLE_ADS_REFRESH_TOKEN')!,
      grant_type:    'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`OAuth failed: ${await res.text()}`);
  return (await res.json()).access_token;
}

// ── Fetch consolidated campaign spend from Google Ads ──
async function getCampaignSpend(etDate: string): Promise<{
  spend: number; clicks: number; impressions: number; ctr: number; avgCpc: number;
}> {
  const token = await getAccessToken();
  const query = `
    SELECT metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.ctr, metrics.average_cpc
    FROM campaign
    WHERE campaign.id = ${CONSOLIDATED_CAMPAIGN_ID} AND segments.date = '${etDate}'
  `;
  const res = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${CUSTOMER_ID}/googleAds:search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'developer-token': Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN')!,
        'login-customer-id': getMccId(),
      },
      body: JSON.stringify({ query }),
    }
  );
  if (!res.ok) throw new Error(`Google Ads API error: ${await res.text()}`);
  const data = await res.json();
  const result = data.results?.[0];
  if (!result) return { spend: 0, clicks: 0, impressions: 0, ctr: 0, avgCpc: 0 };
  const m = result.metrics;
  return {
    spend:       Number(m.costMicros || 0) / 1_000_000,
    clicks:      Number(m.clicks || 0),
    impressions: Number(m.impressions || 0),
    ctr:         Number(m.ctr || 0) * 100,
    avgCpc:      Number(m.averageCpc || 0) / 1_000_000,
  };
}

// ── Fetch leads per agent for a given day ──
async function getLeadsPerAgent(supabase: any, etDate: string): Promise<
  Array<{ agent_id: string; client_id: string; client_name: string; count: number }>
> {
  const { start, end } = getETDayBoundsUTC(etDate);
  const { data: leads, error } = await supabase
    .from('leads')
    .select('agent_id, first_name, last_name')
    .eq('lead_source', 'CONSOLIDATED_ROUTER')
    .gte('created_at', start)
    .lte('created_at', end);
  if (error) throw new Error(`Leads query failed: ${error.message}`);
  if (!leads || leads.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const lead of leads) {
    if (isTestLead(lead)) continue;
    counts[lead.agent_id] = (counts[lead.agent_id] || 0) + 1;
  }
  const agentIds = Object.keys(counts);

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name, agent_id')
    .in('agent_id', agentIds);
  if (clientsError) throw new Error(`Clients query failed: ${clientsError.message}`);

  const clientMap: Record<string, { id: string; name: string }> = {};
  for (const c of clients || []) clientMap[c.agent_id] = { id: c.id, name: c.name };

  return agentIds
    .filter(aid => clientMap[aid])
    .map(aid => ({
      agent_id: aid, client_id: clientMap[aid].id,
      client_name: clientMap[aid].name, count: counts[aid],
    }));
}

// ── Fetch ALL eligible pool agents (mirrors router eligibility) ──
async function getEligiblePoolAgents(supabase: any): Promise<
  Array<{ client_id: string; client_name: string; agent_id: string; monthly_ad_spend_cap: number }>
> {
  // 1. Active clients with required fields
  const { data: allClients } = await supabase
    .from('clients')
    .select('id, name, agent_id, states, scheduler_link, consolidated_router_enabled')
    .eq('status', 'active')
    .not('agent_id', 'is', null)
    .not('scheduler_link', 'is', null);

  if (!allClients || allClients.length === 0) return [];

  // Filter: enabled, has states
  const clients = allClients.filter((c: any) => {
    if (c.consolidated_router_enabled === false) return false;
    const sc = c.states ? c.states.split(',').filter((s: string) => s.trim()).length : 0;
    return sc > 0;
  });

  if (clients.length === 0) return [];
  const clientIds = clients.map((c: any) => c.id);

  // 2. Parallel fetch: perf fee, wallet caps, deposits, spend
  const [perfResult, walletResult, depositResult, spendResult] = await Promise.all([
    supabase.from('onboarding_settings').select('setting_value').eq('setting_key', 'performance_percentage').maybeSingle(),
    supabase.from('client_wallets').select('client_id, monthly_ad_spend_cap').in('client_id', clientIds),
    supabase.from('wallet_transactions').select('client_id, amount, created_at').in('client_id', clientIds).in('transaction_type', ['deposit', 'adjustment']),
    supabase.from('ad_spend_daily').select('client_id, cost, spend_date').in('client_id', clientIds),
  ]);

  const perfPct = perfResult.data?.setting_value != null ? Number(perfResult.data.setting_value) : 10;
  const feeMultiplier = 1 + perfPct / 100;

  // Wallet caps
  const walletCaps: Record<string, number | null> = {};
  (walletResult.data || []).forEach((w: any) => { walletCaps[w.client_id] = w.monthly_ad_spend_cap; });

  // Deposits + first deposit dates
  const depositTotals: Record<string, number> = {};
  const firstDepositDates: Record<string, string> = {};
  (depositResult.data || []).forEach((d: any) => {
    depositTotals[d.client_id] = (depositTotals[d.client_id] || 0) + (d.amount || 0);
    const dateStr = d.created_at.split('T')[0];
    if (!firstDepositDates[d.client_id] || dateStr < firstDepositDates[d.client_id]) {
      firstDepositDates[d.client_id] = dateStr;
    }
  });

  // Ad spend (gated by first deposit date — matches router exactly)
  const spendTotals: Record<string, number> = {};
  (spendResult.data || []).forEach((s: any) => {
    const startDate = firstDepositDates[s.client_id];
    if (!startDate || s.spend_date >= startDate) {
      spendTotals[s.client_id] = (spendTotals[s.client_id] || 0) + (s.cost || 0);
    }
  });

  // Wallet balances
  const walletBalances: Record<string, number> = {};
  clientIds.forEach((id: string) => {
    walletBalances[id] = (depositTotals[id] || 0) - (spendTotals[id] || 0) * feeMultiplier;
  });

  // Filter: wallet > $100
  return clients
    .filter((c: any) => (walletBalances[c.id] || 0) > MIN_WALLET_BALANCE)
    .map((c: any) => ({
      client_id: c.id,
      client_name: c.name,
      agent_id: c.agent_id,
      monthly_ad_spend_cap: walletCaps[c.id] ?? DEFAULT_MONTHLY_BUDGET,
    }));
}

// ── Read base percentage from settings ──
async function getBasePct(supabase: any): Promise<number> {
  const { data } = await supabase
    .from('onboarding_settings')
    .select('setting_value')
    .eq('setting_key', 'consolidated_base_pct')
    .maybeSingle();
  return data?.setting_value != null ? Number(data.setting_value) / 100 : DEFAULT_BASE_PCT / 100;
}

// ── Read owner-exempt agent ID ──
async function getExemptAgentId(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from('onboarding_settings')
    .select('setting_value')
    .eq('setting_key', 'consolidated_owner_exempt_agent_id')
    .maybeSingle();
  return data?.setting_value || null;
}

// ── Core attribution job — Hybrid 40/60 ──
async function runAttribution(supabase: any, targetDate?: string) {
  const etDate = targetDate || getTodayET();
  console.log(`[Attribution] Running Hybrid attribution for ${etDate}`);

  // 1. Get Google Ads spend
  const campaignMetrics = await getCampaignSpend(etDate);
  console.log(`[Attribution] Campaign spend: $${campaignMetrics.spend.toFixed(2)}, clicks: ${campaignMetrics.clicks}`);

  if (campaignMetrics.spend === 0) {
    return { ok: true, skipped: true, reason: 'No campaign spend recorded yet', date: etDate, spend: 0 };
  }

  // 2. Get all eligible pool agents
  const poolAgents = await getEligiblePoolAgents(supabase);
  if (poolAgents.length === 0) {
    return { ok: true, skipped: true, reason: 'No eligible pool agents', date: etDate };
  }

  // 3. Get leads per agent + base percentage + exempt agent
  const [leadsPerAgent, basePct, exemptAgentId] = await Promise.all([
    getLeadsPerAgent(supabase, etDate),
    getBasePct(supabase),
    getExemptAgentId(supabase),
  ]);
  const totalLeads = leadsPerAgent.reduce((sum, a) => sum + a.count, 0);
  const leadPct = 1 - basePct;

  // Build lead count lookup
  const leadCountByAgentId: Record<string, number> = {};
  for (const a of leadsPerAgent) leadCountByAgentId[a.agent_id] = a.count;

  // 4. Compute pool budget EXCLUDING exempt agent (their share redistributes)
  const payingAgents = poolAgents.filter(a => a.agent_id !== exemptAgentId);
  const poolBudget = payingAgents.reduce((sum, a) => sum + (a.monthly_ad_spend_cap || DEFAULT_MONTHLY_BUDGET), 0);

  // Exempt agent's leads don't count in the lead-pool denominator
  const exemptLeads = exemptAgentId ? (leadCountByAgentId[exemptAgentId] || 0) : 0;
  const payingLeads = totalLeads - exemptLeads;

  const exemptName = exemptAgentId ? poolAgents.find(a => a.agent_id === exemptAgentId)?.client_name || '' : '';
  console.log(`[Attribution] Hybrid ${Math.round(basePct*100)}/${Math.round(leadPct*100)}: pool=${poolAgents.length} agents (${exemptName ? exemptName + ' exempt' : 'no exempt'}), $${poolBudget}/mo paying budget, ${totalLeads} leads (${payingLeads} paying)`);

  const basePool = campaignMetrics.spend * basePct;
  const leadPool = campaignMetrics.spend * leadPct;

  // 5. Build upsert rows for ALL pool agents
  const upsertRows = poolAgents.map(agent => {
    const isExempt = agent.agent_id === exemptAgentId;
    const budget = agent.monthly_ad_spend_cap || DEFAULT_MONTHLY_BUDGET;
    const leadCount = leadCountByAgentId[agent.agent_id] || 0;

    if (isExempt) {
      // Exempt agent: $0 charge, but still gets a row with their lead count
      return {
        client_id: agent.client_id, campaign_id: CONSOLIDATED_CAMPAIGN_ID,
        spend_date: etDate, cost: 0, conversions: leadCount,
        clicks: 0, impressions: 0, ctr: 0, cpc: 0,
        campaign_enabled: true, budget_daily: null, budget_utilization: null, overdelivery: false,
      };
    }

    // Base portion: proportional to budget (using paying-agents-only pool)
    const baseCharge = basePool * (budget / poolBudget);
    // Lead portion: proportional to lead count (using paying-leads-only denominator)
    const leadCharge = (payingLeads > 0 && leadCount > 0)
      ? leadPool * (leadCount / payingLeads)
      : 0;
    const attributedCost = baseCharge + leadCharge;
    const costFraction = campaignMetrics.spend > 0 ? attributedCost / campaignMetrics.spend : 0;

    return {
      client_id:        agent.client_id,
      campaign_id:      CONSOLIDATED_CAMPAIGN_ID,
      spend_date:       etDate,
      cost:             Math.round(attributedCost * 100) / 100,
      conversions:      leadCount,
      clicks:           Math.round(campaignMetrics.clicks * costFraction),
      impressions:      Math.round(campaignMetrics.impressions * costFraction),
      ctr:              campaignMetrics.ctr,
      cpc:              Math.round(attributedCost / Math.max(Math.round(campaignMetrics.clicks * costFraction), 1) * 100) / 100,
      campaign_enabled: true,
      budget_daily:     null,
      budget_utilization: null,
      overdelivery:     false,
    };
  });

  // 6. Upsert
  const { error: upsertError } = await supabase
    .from('ad_spend_daily')
    .upsert(upsertRows, {
      onConflict: 'client_id,campaign_id,spend_date',
      ignoreDuplicates: false,
    });
  if (upsertError) throw new Error(`Upsert failed: ${upsertError.message}`);

  // 7. Summary
  const totalAttributed = upsertRows.reduce((sum, r) => sum + r.cost, 0);
  const leadRecipients = poolAgents.filter(a => (leadCountByAgentId[a.agent_id] || 0) > 0);

  console.log(`[Attribution] Done: $${totalAttributed.toFixed(2)} across ${poolAgents.length} agents (${leadRecipients.length} got leads, ${exemptName || 'none'} exempt)`);

  return {
    ok: true,
    date: etDate,
    campaign_label: CAMPAIGN_LABEL,
    model: `hybrid_${Math.round(basePct*100)}_${Math.round(leadPct*100)}`,
    total_spend: campaignMetrics.spend,
    total_leads: totalLeads,
    pool_size: poolAgents.length,
    lead_recipients: leadRecipients.length,
    agents_attributed: poolAgents.length,
    exempt_agent: exemptName || null,
    cpl_before_fee: totalLeads > 0 ? Math.round(campaignMetrics.spend / totalLeads * 100) / 100 : 0,
    cpl_with_fee: totalLeads > 0 ? Math.round(campaignMetrics.spend / totalLeads * 1.10 * 100) / 100 : 0,
    breakdown: poolAgents.map(a => {
      const isExempt = a.agent_id === exemptAgentId;
      const lc = leadCountByAgentId[a.agent_id] || 0;
      const budget = a.monthly_ad_spend_cap || DEFAULT_MONTHLY_BUDGET;
      if (isExempt) {
        return { agent: a.client_name, agent_id: a.agent_id, leads: lc, budget_share: 0, charged: 0, charged_with_fee: 0, exempt: true };
      }
      const baseCharge = basePool * (budget / poolBudget);
      const leadCharge = (payingLeads > 0 && lc > 0) ? leadPool * (lc / payingLeads) : 0;
      const charged = baseCharge + leadCharge;
      return {
        agent: a.client_name,
        agent_id: a.agent_id,
        leads: lc,
        budget_share: Math.round(budget / poolBudget * 1000) / 10,
        charged: Math.round(charged * 100) / 100,
        charged_with_fee: Math.round(charged * 1.10 * 100) / 100,
        exempt: false,
      };
    }).sort((a: any, b: any) => b.leads - a.leads || b.charged - a.charged),
  };
}

// ── Summary (read-only, for dashboard) ──
async function getSummary(supabase: any): Promise<any> {
  const etDate = getTodayET();

  const [leadsPerAgent, campaignMetrics, poolAgents, basePct, exemptAgentId] = await Promise.all([
    getLeadsPerAgent(supabase, etDate).catch(() => []),
    getCampaignSpend(etDate).catch(() => ({ spend: 0, clicks: 0, impressions: 0, ctr: 0, avgCpc: 0 })),
    getEligiblePoolAgents(supabase).catch(() => []),
    getBasePct(supabase).catch(() => DEFAULT_BASE_PCT / 100),
    getExemptAgentId(supabase).catch(() => null),
  ]);

  const totalLeads = leadsPerAgent.reduce((sum, a) => sum + a.count, 0);
  const leadPct = 1 - basePct;

  const payingAgents = poolAgents.filter(a => a.agent_id !== exemptAgentId);
  const poolBudget = payingAgents.reduce((sum, a) => sum + (a.monthly_ad_spend_cap || DEFAULT_MONTHLY_BUDGET), 0);

  const leadCountByAgentId: Record<string, number> = {};
  for (const a of leadsPerAgent) leadCountByAgentId[a.agent_id] = a.count;

  const exemptLeads = exemptAgentId ? (leadCountByAgentId[exemptAgentId] || 0) : 0;
  const payingLeads = totalLeads - exemptLeads;

  const basePool = campaignMetrics.spend * basePct;
  const leadPool = campaignMetrics.spend * leadPct;

  const breakdown = poolAgents.map(a => {
    const isExempt = a.agent_id === exemptAgentId;
    const lc = leadCountByAgentId[a.agent_id] || 0;
    const budget = a.monthly_ad_spend_cap || DEFAULT_MONTHLY_BUDGET;
    if (isExempt) {
      return { agent_id: a.agent_id, agent: a.client_name, leads: lc, budget_share: 0, charged_before_fee: 0, charged_with_fee: 0, exempt: true };
    }
    const baseCharge = poolBudget > 0 ? basePool * (budget / poolBudget) : 0;
    const leadCharge = (payingLeads > 0 && lc > 0) ? leadPool * (lc / payingLeads) : 0;
    const charged = baseCharge + leadCharge;
    return {
      agent_id: a.agent_id, agent: a.client_name, leads: lc,
      budget_share: poolBudget > 0 ? Math.round(budget / poolBudget * 1000) / 10 : 0,
      charged_before_fee: Math.round(charged * 100) / 100,
      charged_with_fee: Math.round(charged * 1.10 * 100) / 100,
      exempt: false,
    };
  }).sort((a: any, b: any) => b.leads - a.leads || b.charged_before_fee - a.charged_before_fee);

  const exemptName = exemptAgentId ? poolAgents.find(a => a.agent_id === exemptAgentId)?.client_name || null : null;

  return {
    date: etDate,
    campaign_label: CAMPAIGN_LABEL,
    campaign_id: CONSOLIDATED_CAMPAIGN_ID,
    model: `hybrid_${Math.round(basePct*100)}_${Math.round(leadPct*100)}`,
    total_spend: Math.round(campaignMetrics.spend * 100) / 100,
    total_leads: totalLeads,
    pool_size: poolAgents.length,
    lead_recipients: leadsPerAgent.length,
    exempt_agent: exemptName,
    cpl_before_fee: totalLeads > 0 ? Math.round(campaignMetrics.spend / totalLeads * 100) / 100 : 0,
    cpl_with_fee: totalLeads > 0 ? Math.round(campaignMetrics.spend / totalLeads * 1.10 * 100) / 100 : 0,
    clicks: campaignMetrics.clicks,
    impressions: campaignMetrics.impressions,
    ctr: Math.round(campaignMetrics.ctr * 100) / 100,
    breakdown,
  };
}

// ── Handler ──
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  try {
    if (path === 'summary' && req.method === 'GET') {
      return json(await getSummary(supabase));
    }
    if (path === 'run' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      return json(await runAttribution(supabase, body.date || undefined));
    }
    return json({ error: 'Use GET /summary or POST /run' }, 404);
  } catch (e) {
    console.error('[Attribution] Error:', e);
    return json({ error: String(e) }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
