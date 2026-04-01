import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Constants ──
const CONSOLIDATED_CAMPAIGN_ID = '23706217116'; // Google Ads campaign ID
const CUSTOMER_ID               = '6551751244'; // Google Ads customer account
const GOOGLE_ADS_API_VERSION    = 'v22';
const CAMPAIGN_LABEL            = 'ALPHA AGENT EXCLUSIVE IUL SEARCH CAMPAIGN';

// Manager account ID is read from env — same secret used by sync-google-ads.
// Avoids hardcoding an ID that must match the OAuth credentials exactly.
function getMccId(): string {
  return (Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID') ?? '').trim().replace(/-/g, '');
}

// ── Helpers ──

/** Returns today's date as YYYY-MM-DD in Eastern Time */
function getTodayET(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
  }).format(new Date());
}

/** Returns UTC ISO bounds for a full ET calendar day */
function getETDayBoundsUTC(etDate: string): { start: string; end: string } {
  const isDST = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value === 'EDT';
  const offset = isDST ? '-04:00' : '-05:00';
  return {
    start: new Date(`${etDate}T00:00:00${offset}`).toISOString(),
    end:   new Date(`${etDate}T23:59:59.999${offset}`).toISOString(),
  };
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
    SELECT
      metrics.cost_micros,
      metrics.clicks,
      metrics.impressions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE campaign.id = ${CONSOLIDATED_CAMPAIGN_ID}
      AND segments.date = '${etDate}'
  `;

  const res = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${CUSTOMER_ID}/googleAds:search`,
    {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'Authorization':   `Bearer ${token}`,
        'developer-token': Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN')!,
        'login-customer-id': getMccId(),
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Ads API error: ${err}`);
  }

  const data = await res.json();
  const result = data.results?.[0];

  if (!result) {
    return { spend: 0, clicks: 0, impressions: 0, ctr: 0, avgCpc: 0 };
  }

  const m = result.metrics;
  return {
    spend:       (Number(m.costMicros || 0)) / 1_000_000,
    clicks:      Number(m.clicks || 0),
    impressions: Number(m.impressions || 0),
    ctr:         Number(m.ctr || 0) * 100,             // as percentage
    avgCpc:      (Number(m.averageCpc || 0)) / 1_000_000,
  };
}

// ── Fetch CONSOLIDATED_ROUTER leads per agent for a given day ──
// leads.agent_id (text) maps to clients.agent_id — no FK exists, so two queries.
async function getLeadsPerAgent(supabase: any, etDate: string): Promise<
  Array<{ agent_id: string; client_id: string; client_name: string; count: number }>
> {
  const { start, end } = getETDayBoundsUTC(etDate);

  // 1. Count leads per agent_id
  const { data: leads, error } = await supabase
    .from('leads')
    .select('agent_id')
    .eq('lead_source', 'CONSOLIDATED_ROUTER')
    .gte('created_at', start)
    .lte('created_at', end);

  if (error) throw new Error(`Leads query failed: ${error.message}`);
  if (!leads || leads.length === 0) return [];

  // Group by agent_id
  const counts: Record<string, number> = {};
  for (const lead of leads) {
    counts[lead.agent_id] = (counts[lead.agent_id] || 0) + 1;
  }

  const agentIds = Object.keys(counts);

  // 2. Resolve agent_id → client record
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name, agent_id')
    .in('agent_id', agentIds);

  if (clientsError) throw new Error(`Clients query failed: ${clientsError.message}`);

  // Build result — skip any agent_id that doesn't resolve to a client row
  const clientMap: Record<string, { id: string; name: string }> = {};
  for (const c of clients || []) {
    clientMap[c.agent_id] = { id: c.id, name: c.name };
  }

  return agentIds
    .filter(aid => clientMap[aid])
    .map(aid => ({
      agent_id:    aid,
      client_id:   clientMap[aid].id,
      client_name: clientMap[aid].name,
      count:       counts[aid],
    }));
}

// ── Core attribution job ──
async function runAttribution(supabase: any, targetDate?: string) {
  const etDate = targetDate || getTodayET();

  console.log(`[Attribution] Running for ${etDate}`);

  // 1. Get Google Ads spend
  const campaignMetrics = await getCampaignSpend(etDate);
  console.log(`[Attribution] Campaign spend: $${campaignMetrics.spend.toFixed(2)}, clicks: ${campaignMetrics.clicks}`);

  // 2. Get leads per agent
  const leadsPerAgent = await getLeadsPerAgent(supabase, etDate);
  const totalLeads = leadsPerAgent.reduce((sum, a) => sum + a.count, 0);

  console.log(`[Attribution] Total leads: ${totalLeads}, agents: ${leadsPerAgent.length}`);

  if (totalLeads === 0) {
    return {
      ok: true, skipped: true, reason: 'No consolidated leads today',
      date: etDate, spend: campaignMetrics.spend, total_leads: 0,
    };
  }

  if (campaignMetrics.spend === 0) {
    return {
      ok: true, skipped: true, reason: 'No campaign spend recorded yet',
      date: etDate, spend: 0, total_leads: totalLeads,
    };
  }

  // 3. Calculate pre-fee CPL
  // Store pre-fee amount in ad_spend_daily — the wallet formula applies
  // the 10% performance fee automatically. Storing fee-inclusive amounts
  // would cause double-charging.
  const cpl = campaignMetrics.spend / totalLeads;

  // 4. Build upsert rows — one per agent
  // IMPORTANT: campaign_id = CONSOLIDATED_CAMPAIGN_ID is the isolation key.
  // These rows never conflict with any existing per-agent campaign rows
  // because individual agents' campaigns have different campaign IDs.
  const upsertRows = leadsPerAgent.map(agent => {
    const attributedCost = cpl * agent.count;
    return {
      client_id:        agent.client_id,
      campaign_id:      CONSOLIDATED_CAMPAIGN_ID,  // Isolated from all individual campaigns
      spend_date:       etDate,
      cost:             Math.round(attributedCost * 100) / 100,
      conversions:      agent.count,                // Leads received = conversions
      clicks:           Math.round((campaignMetrics.clicks / totalLeads) * agent.count),
      impressions:      Math.round((campaignMetrics.impressions / totalLeads) * agent.count),
      ctr:              campaignMetrics.ctr,
      cpc:              Math.round(attributedCost / Math.max(agent.count, 1) * 100) / 100,
      campaign_enabled: true,
      budget_daily:     null,
      budget_utilization: null,
      overdelivery:     false,
    };
  });

  // 5. Upsert — ONLY affects rows where campaign_id = CONSOLIDATED_CAMPAIGN_ID.
  // Uses the unique constraint (client_id, campaign_id, spend_date) to update
  // existing rows without touching any other data.
  const { error: upsertError } = await supabase
    .from('ad_spend_daily')
    .upsert(upsertRows, {
      onConflict: 'client_id,campaign_id,spend_date',
      ignoreDuplicates: false,
    });

  if (upsertError) throw new Error(`Upsert failed: ${upsertError.message}`);

  // 6. Log summary
  const totalAttributed = upsertRows.reduce((sum, r) => sum + r.cost, 0);
  console.log(`[Attribution] Done: $${totalAttributed.toFixed(2)} attributed across ${leadsPerAgent.length} agents (CPL: $${cpl.toFixed(2)})`);

  return {
    ok:               true,
    date:             etDate,
    campaign_label:   CAMPAIGN_LABEL,
    total_spend:      campaignMetrics.spend,
    total_leads:      totalLeads,
    cpl_before_fee:   Math.round(cpl * 100) / 100,
    cpl_with_fee:     Math.round(cpl * 1.10 * 100) / 100,
    agents_attributed: leadsPerAgent.length,
    breakdown: leadsPerAgent.map(a => ({
      agent:   a.client_name,
      leads:   a.count,
      charged: Math.round(a.count * cpl * 100) / 100,
    })),
  };
}

// ── Summary (read-only, for dashboard) ──
async function getSummary(supabase: any): Promise<any> {
  const etDate = getTodayET();
  const { start, end } = getETDayBoundsUTC(etDate);

  // Get today's leads per agent in parallel with campaign spend
  const [leadsPerAgent, campaignMetrics] = await Promise.all([
    getLeadsPerAgent(supabase, etDate).catch(() => []),
    getCampaignSpend(etDate).catch(() => ({ spend: 0, clicks: 0, impressions: 0, ctr: 0, avgCpc: 0 })),
  ]);

  const totalLeads = leadsPerAgent.reduce((sum, a) => sum + a.count, 0);
  const cpl = totalLeads > 0 && campaignMetrics.spend > 0
    ? campaignMetrics.spend / totalLeads
    : 0;

  return {
    date:            etDate,
    campaign_label:  CAMPAIGN_LABEL,
    campaign_id:     CONSOLIDATED_CAMPAIGN_ID,
    total_spend:     Math.round(campaignMetrics.spend * 100) / 100,
    total_leads:     totalLeads,
    cpl_before_fee:  Math.round(cpl * 100) / 100,
    cpl_with_fee:    Math.round(cpl * 1.10 * 100) / 100,
    clicks:          campaignMetrics.clicks,
    impressions:     campaignMetrics.impressions,
    ctr:             Math.round(campaignMetrics.ctr * 100) / 100,
    breakdown:       leadsPerAgent.map(a => ({
      agent_id:    a.agent_id,
      agent:       a.client_name,
      leads:       a.count,
      charged_before_fee: Math.round(a.count * cpl * 100) / 100,
      charged_with_fee:   Math.round(a.count * cpl * 1.10 * 100) / 100,
    })),
  };
}

// ── Handler ──
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase   = createClient(supabaseUrl, supabaseKey);

  const url  = new URL(req.url);
  const path = url.pathname.split('/').pop();

  try {
    // GET /summary — real-time metrics for the admin dashboard (read-only)
    if (path === 'summary' && req.method === 'GET') {
      const data = await getSummary(supabase);
      return json(data);
    }

    // POST /run — run attribution job (called by pg_cron or admin button)
    if (path === 'run' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const targetDate = body.date || undefined; // Optional: override date (for backfill)
      const result = await runAttribution(supabase, targetDate);
      return json(result);
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
