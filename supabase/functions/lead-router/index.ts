import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_MONTHLY_BUDGET = 1000; // fallback when monthly_ad_spend_cap is null
const AVG_CPL = 45;
const FLEX = 1.5;

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
    // =============================================
    // GET /route?state=XX — Preview (no increment)
    // =============================================
    if (path === 'route' && req.method === 'GET') {
      const state = url.searchParams.get('state');
      if (!state) {
        return json({ error: 'state parameter required' }, 400);
      }

      const result = await routeAgent(supabase, state);
      return json(result);
    }

    // =============================================
    // POST /submit — Commit lead + deliver to GHL
    // =============================================
    if (path === 'submit' && req.method === 'POST') {
      const body = await req.json();
      const { agent_id, state, firstName, lastName, email, phone,
              age, employment, contribution, investments, interests, gclid, order_id } = body;

      if (!agent_id || !state || !email) {
        return json({ error: 'agent_id, state, and email required' }, 400);
      }

      // 1. Get the agent/client details
      const { data: client } = await supabase
        .from('clients')
        .select('id, name, agent_id, subaccount_id, scheduler_link')
        .eq('agent_id', agent_id)
        .single();

      if (!client) {
        return json({ error: 'Agent not found' }, 404);
      }

      // 2. Create lead in Supabase (use client-provided order_id as lead_id for matching)
      const leadId = order_id || crypto.randomUUID();
      const { error: leadError } = await supabase
        .from('leads')
        .insert({
          lead_id: leadId,
          agent_id: agent_id,
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone,
          state: state,
          lead_source: 'CONSOLIDATED_ROUTER',
          lead_date: new Date().toISOString(),
          status: 'new',
          delivery_status: 'pending',
          gclid: gclid || null,
          lead_data: {
            source: 'consolidated_campaign',
            router_version: 'v1',
            survey: { age, employment, contribution, investments, interests },
          },
        });

      if (leadError) {
        console.error('Failed to create lead:', leadError);
        return json({ error: 'Failed to create lead', detail: leadError.message }, 500);
      }

      // 3. Get the lead's Supabase ID for delivery
      const { data: createdLead } = await supabase
        .from('leads')
        .select('id')
        .eq('lead_id', leadId)
        .single();

      // 4. Deliver to agent's GHL sub-account via inject-lead-to-ghl
      if (createdLead?.id) {
        try {
          const injectUrl = `${supabaseUrl}/functions/v1/inject-lead-to-ghl`;
          const injectRes = await fetch(injectUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ leadId: createdLead.id }),
          });

          const injectResult = await injectRes.json();
          console.log('GHL inject result:', JSON.stringify(injectResult));

          await supabase
            .from('leads')
            .update({ delivery_status: injectRes.ok ? 'delivered' : 'failed' })
            .eq('id', createdLead.id);
        } catch (e) {
          console.error('GHL inject failed:', e);
        }
      }

      // 5. Record the routing for fill score tracking
      await supabase
        .from('lead_router_log')
        .insert({
          agent_id: agent_id,
          state: state,
          lead_id: createdLead?.id || leadId,
          email: email,
          routed_at: new Date().toISOString(),
        })
        .then(() => {})
        .catch(() => {}); // Ignore if table doesn't exist yet

      // 6. Queue Enhanced Conversion — processed by pg_cron 5+ minutes later.
      // This delay is required: Google Ads needs time to process the click before
      // we can enhance the conversion with hashed PII identifiers.
      const leadUUID = order_id || createdLead?.id || leadId;
      await supabase
        .from('ec_enhancement_queue')
        .insert({
          order_id:             leadUUID,
          email:                email,
          phone:                phone || null,
          first_name:           firstName || null,
          last_name:            lastName || null,
          gclid:                gclid || null,
          conversion_date_time: new Date().toISOString(),
          process_after:        new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        })
        .then(() => {})
        .catch(e => console.error('EC queue insert failed (non-blocking):', e));

      console.log(`[SUBMIT] ${state} → ${client.name} (${agent_id}) — ${firstName} ${lastName} <${email}> order_id=${leadUUID}`);

      return json({
        ok: true,
        agent_name: client.name,
        agent_id: agent_id,
        order_id: leadUUID,
      });
    }

    return json({ error: 'Not found. Use /route?state=XX or POST /submit' }, 404);

  } catch (e) {
    console.error('Lead router error:', e);
    return json({ error: 'Internal error', detail: String(e) }, 500);
  }
});

// =============================================
// ROUTER LOGIC
// =============================================
async function routeAgent(supabase: any, state: string) {
  const start = performance.now();

  // 1. Get all active clients with states and scheduler links
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, agent_id, states, scheduler_link, profile_image_url')
    .eq('status', 'active')
    .not('agent_id', 'is', null)
    .not('scheduler_link', 'is', null);

  if (!clients || clients.length === 0) {
    return { error: 'No active agents found' };
  }

  const clientIds = clients.map((c: any) => c.id);
  const MIN_WALLET_BALANCE = 100;

  // Fetch everything needed for balance computation in parallel
  const [perfResult, walletResult, depositResult, spendResult] = await Promise.all([
    // Performance fee percentage (e.g. 10 → multiply spend by 1.10)
    supabase
      .from('onboarding_settings')
      .select('setting_value')
      .eq('setting_key', 'performance_percentage')
      .maybeSingle(),
    // Wallet settings: monthly cap for fill-score calculation
    supabase
      .from('client_wallets')
      .select('client_id, monthly_ad_spend_cap')
      .in('client_id', clientIds),
    // All deposits + adjustments with created_at (needed to derive first_deposit_date)
    supabase
      .from('wallet_transactions')
      .select('client_id, amount, created_at')
      .in('client_id', clientIds)
      .in('transaction_type', ['deposit', 'adjustment']),
    // All ad spend rows — filtered per-client by first_deposit_date below
    supabase
      .from('ad_spend_daily')
      .select('client_id, cost, spend_date')
      .in('client_id', clientIds),
  ]);

  // Performance fee multiplier (default 10% if setting missing)
  const perfPct = perfResult.data?.setting_value != null
    ? Number(perfResult.data.setting_value)
    : 10;
  const feeMultiplier = 1 + perfPct / 100;

  // Build per-client wallet settings map
  const walletSettings: Record<string, { monthly_ad_spend_cap: number | null }> = {};
  (walletResult.data || []).forEach((w: any) => {
    walletSettings[w.client_id] = { monthly_ad_spend_cap: w.monthly_ad_spend_cap };
  });

  // Sum deposits per client; track first deposit date (canonical balance start)
  const depositTotals: Record<string, number> = {};
  const firstDepositDates: Record<string, string> = {};
  (depositResult.data || []).forEach((d: any) => {
    depositTotals[d.client_id] = (depositTotals[d.client_id] || 0) + (d.amount || 0);
    // Keep the earliest deposit/adjustment date as the tracking start
    const dateStr = d.created_at.split('T')[0];
    if (!firstDepositDates[d.client_id] || dateStr < firstDepositDates[d.client_id]) {
      firstDepositDates[d.client_id] = dateStr;
    }
  });

  // Sum ad spend per client — only from first_deposit_date onwards.
  // This matches the compute_wallet_balance() RPC used by the frontend.
  const spendTotals: Record<string, number> = {};
  (spendResult.data || []).forEach((s: any) => {
    const startDate = firstDepositDates[s.client_id];
    if (!startDate || s.spend_date >= startDate) {
      spendTotals[s.client_id] = (spendTotals[s.client_id] || 0) + (s.cost || 0);
    }
  });

  // Compute wallet balance: deposits − (spend × feeMultiplier)
  const walletBalances: Record<string, number> = {};
  clientIds.forEach((id: string) => {
    const dep   = depositTotals[id] || 0;
    const spend = spendTotals[id]   || 0;
    walletBalances[id] = dep - (spend * feeMultiplier);
  });

  // Filter: only agents with wallet balance > $100
  const routableClients = clients.filter((c: any) =>
    (walletBalances[c.id] || 0) > MIN_WALLET_BALANCE
  );

  console.log(`[ROUTER] ${clients.length} active clients → ${routableClients.length} with wallet > $${MIN_WALLET_BALANCE}`);
  clients
    .filter((c: any) => (walletBalances[c.id] || 0) <= MIN_WALLET_BALANCE)
    .forEach((c: any) =>
      console.log(`[ROUTER] EXCLUDED: ${c.name} — wallet: $${(walletBalances[c.id] || 0).toFixed(2)}`)
    );

  // 2. Filter to agents covering this state
  const stateUpper = state.toUpperCase();
  const covering = routableClients.filter((c: any) => {
    if (!c.states) return false;
    const agentStates = c.states.split(',').map((s: string) => s.trim().toUpperCase());
    return agentStates.includes(stateUpper);
  });

  if (covering.length === 0) {
    return { error: 'No agents cover state: ' + state, total_covering: 0 };
  }

  // 3. Get today's consolidated lead counts per agent (for fill score)
  const today = new Date().toISOString().split('T')[0];
  const agentIds = covering.map((c: any) => c.agent_id);

  const { data: todayLeads } = await supabase
    .from('leads')
    .select('agent_id')
    .in('agent_id', agentIds)
    .gte('created_at', today + 'T00:00:00Z')
    .eq('lead_source', 'CONSOLIDATED_ROUTER');

  const leadCounts: Record<string, number> = {};
  if (todayLeads) {
    todayLeads.forEach((l: any) => {
      leadCounts[l.agent_id] = (leadCounts[l.agent_id] || 0) + 1;
    });
  }

  // 4. Calculate fill scores and filter capped agents
  const eligible: any[] = [];
  const capped: any[] = [];

  covering.forEach((c: any) => {
    // Use actual monthly cap; fall back to default if not set
    const budget     = walletSettings[c.id]?.monthly_ad_spend_cap || DEFAULT_MONTHLY_BUDGET;
    const dailyTarget = budget / 30 / AVG_CPL;
    const dailyMax   = Math.ceil(dailyTarget * FLEX);
    const leadsToday = leadCounts[c.agent_id] || 0;
    const fillPct    = dailyMax > 0 ? Math.round(leadsToday / dailyMax * 100 * 10) / 10 : 0;

    const walletBalance = Math.round((walletBalances[c.id] || 0) * 100) / 100;
    const agentInfo = {
      name:           c.name,
      agent_id:       c.agent_id,
      scheduler_url:  c.scheduler_link,
      headshot:       c.profile_image_url || '',
      leads_today:    leadsToday,
      daily_max:      dailyMax,
      daily_target:   Math.round(dailyTarget * 100) / 100,
      monthly_budget: budget,
      fill_pct:       fillPct,
      wallet_balance: walletBalance,
      states_count:   c.states ? c.states.split(',').length : 0,
      _score:         0,
    };

    if (leadsToday >= dailyMax) {
      capped.push(agentInfo);
    } else {
      agentInfo._score = (leadsToday / dailyMax) + (Math.random() * 0.0001);
      eligible.push(agentInfo);
    }
  });

  if (eligible.length === 0) {
    return { error: 'All agents at daily cap for state: ' + state, total_covering: covering.length, eligible: [], capped };
  }

  // 5. Sort by score (lowest fill = highest priority)
  eligible.sort((a: any, b: any) => a._score - b._score);
  const selected = eligible[0];

  const elapsed = Math.round((performance.now() - start) * 100) / 100;

  return {
    state,
    selected,
    eligible,
    capped,
    total_covering: covering.length,
    elapsed_ms: elapsed,
  };
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
