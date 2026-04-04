import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_MONTHLY_BUDGET = 1000; // fallback when monthly_ad_spend_cap is null
const DEFAULT_CPL = 45; // fallback when no 7-day data exists
const CONSOLIDATED_CAMPAIGN_ID = '23706217116';
const FLEX = 1.5;

/** Returns true if the lead looks like a test — name contains "test" (case-insensitive) */
function isTestLead(lead: { first_name?: string | null; last_name?: string | null }): boolean {
  return `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.toLowerCase().includes('test');
}

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DC','DE','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validate and sanitize submit body. Returns error string or null if valid. */
function validateSubmitBody(body: Record<string, unknown>): string | null {
  const { email, state, firstName, lastName, phone } = body as Record<string, string>;

  if (!EMAIL_RE.test((email || '').trim())) return 'Invalid email format';
  if (!US_STATES.has((state || '').toUpperCase())) return 'Invalid US state code';
  if (firstName && firstName.length > 100) return 'firstName too long';
  if (lastName  && lastName.length  > 100) return 'lastName too long';
  if (phone && !/^[\d\s\-\+\(\)\.]{7,20}$/.test(phone)) return 'Invalid phone format';

  return null;
}

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
    // GET /route?state=XX&force_agent=AGENT_ID — Admin override for testing
    // =============================================
    if (path === 'route' && req.method === 'GET') {
      const state = url.searchParams.get('state');
      if (!state || !US_STATES.has(state.toUpperCase())) {
        return json({ error: 'Valid US state code required' }, 400);
      }

      // Admin override: force a specific agent (for onboarding E2E testing)
      const forceAgentId = url.searchParams.get('force_agent');
      if (forceAgentId) {
        const { data: forcedClient } = await supabase
          .from('clients')
          .select('id, name, agent_id, scheduler_link, profile_image_url, npn, states')
          .eq('agent_id', forceAgentId)
          .single();

        if (!forcedClient) {
          return json({ error: `force_agent not found: ${forceAgentId}` }, 404);
        }

        console.log(`[ROUTER] force_agent override: ${forcedClient.name} (${forceAgentId})`);
        return json({
          state: state.toUpperCase(),
          selected: {
            agent_id:      forcedClient.agent_id,
            name:          forcedClient.name,
            scheduler_url: forcedClient.scheduler_link,
            headshot:      forcedClient.profile_image_url,
            npn:           forcedClient.npn || null,
            states_count:  forcedClient.states ? forcedClient.states.split(',').length : 0,
          },
          forced: true,
        });
      }

      const result = await routeAgent(supabase, state);

      // Strip internal financial/operational fields — callers only need agent identity
      const sanitize = (agent: any) => agent ? {
        agent_id:      agent.agent_id,
        name:          agent.name,
        scheduler_url: agent.scheduler_url,
        headshot:      agent.headshot,
        npn:           agent.npn || null,
        states_count:  agent.states_count || 0,
      } : null;

      return json({
        state:    result.state,
        selected: sanitize(result.selected),
        error:    result.error,
      });
    }

    // =============================================
    // POST /submit — Commit lead + deliver to GHL
    // =============================================
    if (path === 'submit' && req.method === 'POST') {
      const body = await req.json();
      const { agent_id, state, firstName, lastName, email, phone,
              age, employment, contribution, investments, interests, gclid, order_id, src, keyword,
              utm, landing_page, campaignid, adgroupid, creative, matchtype } = body;

      if (!agent_id || !state || !email) {
        return json({ error: 'agent_id, state, and email required' }, 400);
      }

      const validationError = validateSubmitBody(body);
      if (validationError) {
        return json({ error: validationError }, 400);
      }

      // Normalize: survey arrays (interests, investments) → comma-separated strings
      const toText = (v: unknown): string | null => {
        if (!v) return null;
        if (Array.isArray(v)) return (v as string[]).join(', ');
        return String(v);
      };

      const surveyAge         = toText(age);
      const surveyEmployment  = toText(employment);
      const surveyInterest    = toText(interests);    // form field "interests" → DB column "interest"
      const surveySavings     = toText(contribution); // form field "contribution" → DB column "savings"
      const surveyInvestments = toText(investments);

      // 1. Get the agent/client details
      const { data: client } = await supabase
        .from('clients')
        .select('id, name, agent_id, subaccount_id, scheduler_link')
        .eq('agent_id', agent_id)
        .single();

      if (!client) {
        return json({ error: 'Agent not found' }, 404);
      }

      // 2. Duplicate check — same email within last 10 minutes = skip
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id, lead_id, agent_id')
        .eq('email', email.trim().toLowerCase())
        .gte('created_at', tenMinAgo)
        .limit(1)
        .maybeSingle();

      if (existingLead) {
        console.log(`[SUBMIT] Duplicate blocked: ${email} already submitted ${existingLead.lead_id} within 10 min`);
        return json({
          ok: true,
          duplicate: true,
          agent_name: client.name,
          agent_id: agent_id,
          order_id: existingLead.lead_id,
        });
      }

      // 3. Create lead in Supabase (use client-provided order_id as lead_id for matching)
      const leadId = order_id || crypto.randomUUID();
      const { error: leadError } = await supabase
        .from('leads')
        .insert({
          lead_id:     leadId,
          agent_id:    agent_id,
          first_name:  firstName,
          last_name:   lastName,
          email:       email,
          phone:       phone,
          state:       state,
          // Survey qualification fields — top-level so inject-lead-to-ghl can read them
          age:         surveyAge,
          employment:  surveyEmployment,
          interest:    surveyInterest,
          savings:     surveySavings,
          investments: surveyInvestments,
          lead_source:     'CONSOLIDATED_ROUTER',
          lead_date:       new Date().toISOString(),
          status:          'new',
          delivery_status: 'pending',
          gclid: gclid || null,
          lead_data: {
            source:        src || 'consolidated_campaign',
            campaign_type: src || 'direct',
            keyword:       keyword || null,
            landing_page:  landing_page || null,
            campaignid:    campaignid || null,
            adgroupid:     adgroupid || null,
            creative:      creative || null,
            matchtype:     matchtype || null,
            utm_source:    utm?.utm_source || null,
            utm_medium:    utm?.utm_medium || null,
            utm_campaign:  utm?.utm_campaign || null,
            utm_content:   utm?.utm_content || null,
            utm_term:      utm?.utm_term || null,
            router_version: 'v2',
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

      console.log(`[SUBMIT] ${state} → ${client.name} (${agent_id}) order_id=${leadUUID}`);

      return json({
        ok: true,
        agent_name: client.name,
        agent_id: agent_id,
        order_id: leadUUID,
      });
    }

    // =============================================
    // POST /demand-gen — Google Ads Demand Gen lead form webhook
    // =============================================
    if (path === 'demand-gen' && req.method === 'POST') {
      const body = await req.json();
      const { lead_id: googleLeadId, user_column_data, gcl_id, google_key, is_test, form_id, campaign_id, adgroup_id, creative_id } = body;

      // 1. Verify webhook key
      const expectedKey = Deno.env.get('GOOGLE_LEAD_FORM_KEY');
      if (expectedKey && google_key !== expectedKey) {
        return json({ error: 'Invalid google_key' }, 403);
      }

      // 2. Parse user_column_data
      const fields: Record<string, string> = {};
      if (Array.isArray(user_column_data)) {
        for (const col of user_column_data) {
          fields[col.column_id] = col.string_value || '';
        }
      }

      const firstName = fields.FIRST_NAME || '';
      const lastName  = fields.LAST_NAME || '';
      const email     = fields.EMAIL || '';
      const phone     = fields.PHONE_NUMBER || '';
      const rawState  = fields.CUSTOM_QUESTION_0 || fields.REGION || fields.STATE || ''; // State from custom question, region, or state field

      if (!email) {
        return json({ error: 'Email required' }, 400);
      }

      // 3. Normalize state (full name → 2-letter code)
      const STATE_NAMES: Record<string, string> = {
        'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA',
        'colorado':'CO','connecticut':'CT','delaware':'DE','district of columbia':'DC',
        'florida':'FL','georgia':'GA','hawaii':'HI','idaho':'ID','illinois':'IL',
        'indiana':'IN','iowa':'IA','kansas':'KS','kentucky':'KY','louisiana':'LA',
        'maine':'ME','maryland':'MD','massachusetts':'MA','michigan':'MI','minnesota':'MN',
        'mississippi':'MS','missouri':'MO','montana':'MT','nebraska':'NE','nevada':'NV',
        'new hampshire':'NH','new jersey':'NJ','new mexico':'NM','new york':'NY',
        'north carolina':'NC','north dakota':'ND','ohio':'OH','oklahoma':'OK','oregon':'OR',
        'pennsylvania':'PA','rhode island':'RI','south carolina':'SC','south dakota':'SD',
        'tennessee':'TN','texas':'TX','utah':'UT','vermont':'VT','virginia':'VA',
        'washington':'WA','west virginia':'WV','wisconsin':'WI','wyoming':'WY',
      };
      const cleaned = rawState.trim();
      const state = cleaned.length === 2 ? cleaned.toUpperCase() : (STATE_NAMES[cleaned.toLowerCase()] || cleaned.toUpperCase());

      if (!US_STATES.has(state)) {
        // Save lead as unroutable but still return 200 to Google
        await supabase.from('leads').insert({
          lead_id: `DG-${googleLeadId}`, agent_id: null, first_name: firstName, last_name: lastName,
          email, phone, state: rawState, gclid: gcl_id || null,
          lead_source: is_test ? 'DEMAND_GEN_TEST' : 'DEMAND_GEN',
          lead_date: new Date().toISOString(), status: 'new', delivery_status: 'unroutable',
          lead_data: { form_id, campaign_id, adgroup_id, creative_id, raw_state: rawState, error: 'Invalid state' },
          webhook_payload: body,
        }).then(() => {}).catch(e => console.error('DG unroutable save failed:', e));
        console.log(`[DEMAND-GEN] Unroutable: invalid state "${rawState}"`);
        return json({ ok: true, warning: 'Lead saved but state not routable' });
      }

      // 4. Idempotency check
      const dgLeadId = `DG-${googleLeadId}`;
      const { data: existing } = await supabase.from('leads').select('id').eq('lead_id', dgLeadId).maybeSingle();
      if (existing) {
        console.log(`[DEMAND-GEN] Duplicate: ${dgLeadId} already exists`);
        return json({ ok: true, duplicate: true });
      }

      // 5. Route via existing algorithm
      const routeResult = await routeAgent(supabase, state);
      const agent = routeResult.selected;

      if (!agent) {
        // No eligible agent — save as unroutable
        await supabase.from('leads').insert({
          lead_id: dgLeadId, agent_id: null, first_name: firstName, last_name: lastName,
          email, phone, state, gclid: gcl_id || null,
          lead_source: is_test ? 'DEMAND_GEN_TEST' : 'DEMAND_GEN',
          lead_date: new Date().toISOString(), status: 'new', delivery_status: 'unroutable',
          lead_data: { form_id, campaign_id, adgroup_id, creative_id, route_error: routeResult.error },
          webhook_payload: body,
        }).then(() => {}).catch(e => console.error('DG unroutable save failed:', e));
        console.log(`[DEMAND-GEN] No eligible agent for state ${state}: ${routeResult.error}`);
        return json({ ok: true, warning: 'No eligible agent', state });
      }

      // 6. Create lead
      const { error: leadError } = await supabase.from('leads').insert({
        lead_id:         dgLeadId,
        agent_id:        agent.agent_id,
        first_name:      firstName,
        last_name:       lastName,
        email:           email,
        phone:           phone,
        state:           state,
        gclid:           gcl_id || null,
        lead_source:     is_test ? 'DEMAND_GEN_TEST' : 'DEMAND_GEN',
        lead_date:       new Date().toISOString(),
        status:          'new',
        delivery_status: 'pending',
        lead_data:       { form_id, campaign_id, adgroup_id, creative_id, source: 'demand_gen' },
        webhook_payload: body,
      });

      if (leadError) {
        console.error('[DEMAND-GEN] Lead insert failed:', leadError);
        return json({ error: 'Failed to save lead' }, 500);
      }

      console.log(`[DEMAND-GEN] ${state} → ${agent.name} (${agent.agent_id}) lead_id=${dgLeadId}`);

      // 7. Background: GHL delivery + routing log (don't block the 200 response)
      const { data: createdLead } = await supabase.from('leads').select('id').eq('lead_id', dgLeadId).single();

      if (createdLead?.id && !is_test) {
        fetch(`${supabaseUrl}/functions/v1/inject-lead-to-ghl`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
          body: JSON.stringify({ leadId: createdLead.id }),
        }).then(res => {
          supabase.from('leads').update({ delivery_status: res.ok ? 'delivered' : 'failed' }).eq('id', createdLead.id);
        }).catch(e => console.error('[DEMAND-GEN] GHL inject error:', e));
      }

      // Routing log
      supabase.from('lead_router_log').insert({
        agent_id: agent.agent_id, state, lead_id: createdLead?.id || dgLeadId,
        email, routed_at: new Date().toISOString(),
      }).then(() => {}).catch(() => {});

      return json({ ok: true, agent_name: agent.name, agent_id: agent.agent_id, lead_id: dgLeadId });
    }

    // =============================================
    // GET /pool — Admin dashboard: full pool status
    // =============================================
    if (path === 'pool' && req.method === 'GET') {
      const result = await getPoolStatus(supabase);
      return json(result);
    }

    return json({ error: 'Not found. Use /route?state=XX, POST /submit, or GET /pool' }, 404);

  } catch (e) {
    console.error('Lead router error:', e);
    return json({ error: 'Internal error', detail: String(e) }, 500);
  }
});

// =============================================
// ROLLING CPL — 7-day average from actual campaign data
// =============================================
async function getRollingCPL(supabase: any): Promise<number> {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('ad_spend_daily')
    .select('cost, conversions')
    .eq('campaign_id', CONSOLIDATED_CAMPAIGN_ID)
    .gte('spend_date', sevenDaysAgo)
    .lte('spend_date', today);

  if (error || !data || data.length === 0) {
    console.log(`[ROUTER] getRollingCPL: no data, using DEFAULT_CPL=$${DEFAULT_CPL}`);
    return DEFAULT_CPL;
  }

  const totalSpend = data.reduce((sum: number, r: any) => sum + Number(r.cost || 0), 0);
  const totalLeads = data.reduce((sum: number, r: any) => sum + Number(r.conversions || 0), 0);

  if (totalSpend === 0 || totalLeads === 0) {
    console.log(`[ROUTER] getRollingCPL: spend=${totalSpend} leads=${totalLeads}, using DEFAULT_CPL`);
    return DEFAULT_CPL;
  }

  const cpl = totalSpend / totalLeads;
  console.log(`[ROUTER] getRollingCPL: 7d spend=$${totalSpend.toFixed(2)}, leads=${totalLeads}, CPL=$${cpl.toFixed(2)}`);
  return cpl;
}

// =============================================
// ROUTER LOGIC
// =============================================
async function routeAgent(supabase: any, state: string) {
  const start = performance.now();

  // 1. Get all active clients with states and scheduler links
  const { data: allClients } = await supabase
    .from('clients')
    .select('id, name, agent_id, states, scheduler_link, profile_image_url, consolidated_router_enabled, npn')
    .eq('status', 'active')
    .not('agent_id', 'is', null)
    .not('scheduler_link', 'is', null);

  if (!allClients || allClients.length === 0) {
    return { error: 'No active agents found' };
  }

  // Filter out agents manually excluded from the consolidated pool
  const clients = allClients.filter((c: any) => c.consolidated_router_enabled !== false);

  if (clients.length === 0) {
    return { error: 'No active agents eligible for consolidated routing' };
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
  // Also estimate today's projected cost (ad_spend_daily only written at midnight)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
  const totalPoolBudget = clientIds.reduce((sum, id) => sum + (walletSettings[id]?.monthly_ad_spend_cap || DEFAULT_MONTHLY_BUDGET), 0);
  // Rough estimate: each agent's daily share ≈ (their budget / total budget) × average daily pool spend
  // Average daily pool spend ≈ total monthly budgets / 30
  const estimatedDailyPoolSpend = totalPoolBudget / 30;

  const walletBalances: Record<string, number> = {};
  clientIds.forEach((id: string) => {
    const dep   = depositTotals[id] || 0;
    const spend = spendTotals[id]   || 0;
    // Check if today's ad_spend_daily row exists — if not, add projected cost
    const hasTodaySpend = (spendResult.data || []).some((s: any) => s.client_id === id && s.spend_date === today);
    const budget = walletSettings[id]?.monthly_ad_spend_cap || DEFAULT_MONTHLY_BUDGET;
    const projectedToday = hasTodaySpend ? 0 : (budget / totalPoolBudget) * estimatedDailyPoolSpend;
    walletBalances[id] = dep - ((spend + projectedToday) * feeMultiplier);
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

  // 3. Get today's + 5-day rolling lead counts per agent (for fill score + pacing)
  const today = new Date().toISOString().split('T')[0];
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const agentIds = covering.map((c: any) => c.agent_id);

  const { data: recentLeads } = await supabase
    .from('leads')
    .select('agent_id, first_name, last_name, created_at')
    .in('agent_id', agentIds)
    .gte('created_at', fiveDaysAgo + 'T00:00:00Z')
    .in('lead_source', ['CONSOLIDATED_ROUTER', 'DEMAND_GEN']);

  const leadCounts: Record<string, number> = {};      // today only
  const leadCounts5d: Record<string, number> = {};    // rolling 5 days
  if (recentLeads) {
    recentLeads
      .filter((l: any) => !isTestLead(l))
      .forEach((l: any) => {
        leadCounts5d[l.agent_id] = (leadCounts5d[l.agent_id] || 0) + 1;
        if (l.created_at >= today + 'T00:00:00Z') {
          leadCounts[l.agent_id] = (leadCounts[l.agent_id] || 0) + 1;
        }
      });
  }

  // 4. Calculate fill scores and filter capped agents
  const PACING_WINDOW = 5; // days
  const rollingCPL = await getRollingCPL(supabase);
  const eligible: any[] = [];
  const capped: any[] = [];

  covering.forEach((c: any) => {
    // Use actual monthly cap; fall back to default if not set
    const budget      = walletSettings[c.id]?.monthly_ad_spend_cap || DEFAULT_MONTHLY_BUDGET;
    const dailyTarget = budget / 30 / rollingCPL;
    const dailyMax    = Math.ceil(dailyTarget * FLEX);
    const leadsToday  = leadCounts[c.agent_id] || 0;
    const fillPct     = dailyMax > 0 ? Math.round(leadsToday / dailyMax * 100 * 10) / 10 : 0;

    // 5-day rolling pacing: how many leads should they get in a 5-day window?
    const leads5d       = leadCounts5d[c.agent_id] || 0;
    const windowTarget  = Math.ceil(budget / 30 * PACING_WINDOW / rollingCPL * FLEX);
    const windowPct     = windowTarget > 0 ? Math.round(leads5d / windowTarget * 100 * 10) / 10 : 0;
    const pacingCapped  = leads5d >= windowTarget;

    const walletBalance = Math.round((walletBalances[c.id] || 0) * 100) / 100;
    const agentInfo = {
      name:           c.name,
      agent_id:       c.agent_id,
      scheduler_url:  c.scheduler_link,
      headshot:       c.profile_image_url || '',
      npn:            c.npn || null,
      states_count:   c.states ? c.states.split(',').length : 0,
      leads_today:    leadsToday,
      leads_5d:       leads5d,
      daily_max:      dailyMax,
      daily_target:   Math.round(dailyTarget * 100) / 100,
      window_target:  windowTarget,
      window_pct:     windowPct,
      monthly_budget: budget,
      fill_pct:       fillPct,
      wallet_balance: walletBalance,
      states_count:   c.states ? c.states.split(',').length : 0,
      _score:         0,
    };

    if (leadsToday >= dailyMax || pacingCapped) {
      capped.push({ ...agentInfo, cap_reason: pacingCapped && leadsToday < dailyMax ? '5d pacing' : 'daily' });
    } else {
      // Score combines daily fill + 5-day pacing (agents closer to 5d limit get deprioritized)
      agentInfo._score = (leadsToday / dailyMax) * 0.6 + (leads5d / Math.max(windowTarget, 1)) * 0.4 + (Math.random() * 0.0001);
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

// =============================================
// POOL STATUS — Admin dashboard view
// Returns ALL active agents categorized by pool status (no state filter)
// =============================================
async function getPoolStatus(supabase: any) {
  const start = performance.now();

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, agent_id, states, scheduler_link, profile_image_url, consolidated_router_enabled, consolidated_router_note')
    .eq('status', 'active')
    .not('agent_id', 'is', null);

  if (!clients || clients.length === 0) {
    return { eligible: [], capped: [], excluded: [], total_active: 0 };
  }

  const clientIds = clients.map((c: any) => c.id);

  const [perfResult, walletResult, depositResult, spendResult] = await Promise.all([
    supabase.from('onboarding_settings').select('setting_value').eq('setting_key', 'performance_percentage').maybeSingle(),
    supabase.from('client_wallets').select('client_id, monthly_ad_spend_cap').in('client_id', clientIds),
    supabase.from('wallet_transactions').select('client_id, amount, created_at').in('client_id', clientIds).in('transaction_type', ['deposit', 'adjustment']),
    supabase.from('ad_spend_daily').select('client_id, cost, spend_date').in('client_id', clientIds),
  ]);

  const perfPct       = perfResult.data?.setting_value != null ? Number(perfResult.data.setting_value) : 10;
  const feeMultiplier = 1 + perfPct / 100;

  const walletSettings: Record<string, { monthly_ad_spend_cap: number | null }> = {};
  (walletResult.data || []).forEach((w: any) => {
    walletSettings[w.client_id] = { monthly_ad_spend_cap: w.monthly_ad_spend_cap };
  });

  const depositTotals: Record<string, number> = {};
  const firstDepositDates: Record<string, string> = {};
  (depositResult.data || []).forEach((d: any) => {
    depositTotals[d.client_id] = (depositTotals[d.client_id] || 0) + (d.amount || 0);
    const dateStr = d.created_at.split('T')[0];
    if (!firstDepositDates[d.client_id] || dateStr < firstDepositDates[d.client_id]) {
      firstDepositDates[d.client_id] = dateStr;
    }
  });

  const spendTotals: Record<string, number> = {};
  (spendResult.data || []).forEach((s: any) => {
    const startDate = firstDepositDates[s.client_id];
    if (!startDate || s.spend_date >= startDate) {
      spendTotals[s.client_id] = (spendTotals[s.client_id] || 0) + (s.cost || 0);
    }
  });

  const walletBalances: Record<string, number> = {};
  clientIds.forEach((id: string) => {
    walletBalances[id] = (depositTotals[id] || 0) - (spendTotals[id] || 0) * feeMultiplier;
  });

  // Today's + 5-day rolling leads per agent (for fill scores + pacing) — test leads excluded
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const agentIds = clients.filter((c: any) => c.agent_id).map((c: any) => c.agent_id);
  const { data: recentLeads } = await supabase
    .from('leads')
    .select('agent_id, first_name, last_name, created_at')
    .in('agent_id', agentIds)
    .gte('created_at', fiveDaysAgo + 'T00:00:00Z')
    .in('lead_source', ['CONSOLIDATED_ROUTER', 'DEMAND_GEN']);

  const leadCounts: Record<string, number> = {};
  const leadCounts5d: Record<string, number> = {};
  (recentLeads || [])
    .filter((l: any) => !isTestLead(l))
    .forEach((l: any) => {
      leadCounts5d[l.agent_id] = (leadCounts5d[l.agent_id] || 0) + 1;
      if (l.created_at >= today + 'T00:00:00Z') {
        leadCounts[l.agent_id] = (leadCounts[l.agent_id] || 0) + 1;
      }
    });

  const PACING_WINDOW = 5;
  const rollingCPL = await getRollingCPL(supabase);
  const eligible: any[] = [];
  const capped: any[]   = [];
  const excluded: any[] = [];

  clients.forEach((c: any) => {
    const balance      = Math.round((walletBalances[c.id] || 0) * 100) / 100;
    const budget       = walletSettings[c.id]?.monthly_ad_spend_cap || DEFAULT_MONTHLY_BUDGET;
    const dailyTarget  = budget / 30 / rollingCPL;
    const dailyMax     = Math.ceil(dailyTarget * FLEX);
    const leadsToday   = leadCounts[c.agent_id] || 0;
    const leads5d      = leadCounts5d[c.agent_id] || 0;
    const windowTarget = Math.ceil(budget / 30 * PACING_WINDOW / rollingCPL * FLEX);
    const fillPct      = dailyMax > 0 ? Math.round(leadsToday / dailyMax * 100 * 10) / 10 : 0;
    const windowPct    = windowTarget > 0 ? Math.round(leads5d / windowTarget * 100 * 10) / 10 : 0;
    const pacingCapped = leads5d >= windowTarget;
    const statesCount  = c.states ? c.states.split(',').length : 0;

    const base = {
      client_id:      c.id,
      name:           c.name,
      agent_id:       c.agent_id,
      wallet_balance: balance,
      fill_pct:       fillPct,
      leads_today:    leadsToday,
      leads_5d:       leads5d,
      daily_max:      dailyMax,
      window_target:  windowTarget,
      window_pct:     windowPct,
      monthly_budget: budget,
      states_count:   statesCount,
      headshot:       c.profile_image_url || '',
      consolidated_enabled: c.consolidated_router_enabled !== false,
      consolidated_note:    c.consolidated_router_note || null,
    };

    // Exclude: manually disabled by admin
    if (c.consolidated_router_enabled === false) {
      excluded.push({ ...base, exclude_reason: c.consolidated_router_note || 'Manually disabled' });
      return;
    }
    // Exclude: low wallet
    if (balance <= 100) {
      excluded.push({ ...base, exclude_reason: `wallet < $100` });
      return;
    }
    // Exclude: no states
    if (!c.states || statesCount === 0) {
      excluded.push({ ...base, exclude_reason: 'no states configured' });
      return;
    }
    // Exclude: no scheduler
    if (!c.scheduler_link) {
      excluded.push({ ...base, exclude_reason: 'no scheduler link' });
      return;
    }
    // Capped: daily or 5-day pacing
    if (leadsToday >= dailyMax || pacingCapped) {
      capped.push({ ...base, status: 'capped', cap_reason: pacingCapped && leadsToday < dailyMax ? '5d pacing' : 'daily' });
      return;
    }
    // Eligible
    eligible.push({ ...base, status: 'eligible' });
  });

  // Sort eligible by fill_pct ascending (lowest fill = next in line)
  eligible.sort((a, b) => a.fill_pct - b.fill_pct);

  return {
    eligible,
    capped,
    excluded,
    total_active:   clients.length,
    total_eligible: eligible.length,
    total_capped:   capped.length,
    total_excluded: excluded.length,
    elapsed_ms:     Math.round((performance.now() - start) * 100) / 100,
  };
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
