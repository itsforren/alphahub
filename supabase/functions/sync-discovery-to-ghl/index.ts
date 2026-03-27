import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

// ── Get location access token via existing crm-location-token function ──────

async function getLocationToken(
  supabaseUrl: string,
  companyId: string,
  locationId: string,
  serviceKey: string
): Promise<string> {
  const response = await fetch(`${supabaseUrl}/functions/v1/crm-location-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ companyId, locationId }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get location token: ${error}`);
  }

  const data = await response.json();
  return data.locationAccessToken;
}

// ── GHL API helper ──────────────────────────────────────────────────────────

async function ghlFetch(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${GHL_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Version': GHL_VERSION,
      'Accept': 'application/json',
      ...(options.headers || {}),
    },
  });
  return res.json();
}

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { lead_id, discovery_call_id } = await req.json();
    if (!lead_id || !discovery_call_id) {
      return new Response(
        JSON.stringify({ error: 'Missing lead_id or discovery_call_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, agent_id, ghl_contact_id, first_name, last_name, email, phone')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadError?.message || 'no data'}`);
    }

    if (!lead.ghl_contact_id) {
      throw new Error('Lead has no GHL contact ID — cannot sync');
    }

    // 2. Fetch client by agent_id
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, subaccount_id')
      .eq('agent_id', lead.agent_id)
      .single();

    if (clientError || !client?.subaccount_id) {
      throw new Error(`Client or subaccount not found for agent ${lead.agent_id}`);
    }

    // 3. Fetch discovery call
    const { data: call, error: callError } = await supabase
      .from('discovery_calls')
      .select('*')
      .eq('id', discovery_call_id)
      .single();

    if (callError || !call) {
      throw new Error(`Discovery call not found: ${callError?.message || 'no data'}`);
    }

    // 4. Get location token
    const { data: tokenData } = await supabase
      .from('ghl_oauth_tokens')
      .select('company_id')
      .limit(1)
      .single();

    const companyId = tokenData?.company_id;
    if (!companyId) {
      throw new Error('No GHL OAuth token found');
    }

    const locationToken = await getLocationToken(
      supabaseUrl,
      companyId,
      client.subaccount_id,
      serviceKey
    );

    console.log(`Syncing discovery call ${discovery_call_id} to GHL contact ${lead.ghl_contact_id}`);

    // 5. Discovery data goes to Notes only — no custom field writes
    const disc = call.discovery_data || {};

    // 6. Add tags based on outcome (TAGS ONLY — no pipeline moves, no custom fields)
    // GHL workflows trigger off these tags for routing
    const tagsToAdd: string[] = [];

    // Only add tags for unanswered attempts + bad numbers
    // Answered calls with actions (callback, discovery, strategy) are handled by GHL automations
    const NO_TAG_OUTCOMES = ['scheduled', 'strategy_booked', 'cant_book_now', 'call_back', 'intro_scheduled', 'bad_timing'];
    const shouldTag = !call.outcome || !NO_TAG_OUTCOMES.includes(call.outcome);

    if (shouldTag && call.outcome) {
      const tagMap: Record<string, string> = {
        not_a_fit: 'not-a-fit',
        voicemail: 'voicemail',
        no_answer: 'no-answer',
        long_term_nurture: 'long-term-nurture',
        bad_number: 'bad-number',
      };
      const tag = tagMap[call.outcome];
      if (tag) tagsToAdd.push(tag);
    }

    if (call.outcome === 'bad_number' && call.bad_number_reason) {
      tagsToAdd.push(`bad-number-${call.bad_number_reason.replace(/_/g, '-')}`);
    }

    // c-X attempt tags ONLY for unanswered attempts (no answer, voicemail, bad number)
    const UNANSWERED_OUTCOMES = ['no_answer', 'voicemail', 'bad_number'];
    if (call.attempt_number && call.outcome && UNANSWERED_OUTCOMES.includes(call.outcome)) {
      tagsToAdd.push(`c-${call.attempt_number}`);
    }

    if (tagsToAdd.length > 0) {
      // Fetch current tags and merge
      const contactData = await ghlFetch(`/contacts/${lead.ghl_contact_id}`, locationToken);
      const currentTags: string[] = contactData.contact?.tags || [];
      const newTags = [...new Set([...currentTags, ...tagsToAdd])];

      await ghlFetch(`/contacts/${lead.ghl_contact_id}`, locationToken, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      });
      console.log('Tags added:', tagsToAdd.join(', '));
    }

    // 8. Write formatted discovery summary to contact notes
    if (call.answered && disc && Object.keys(disc).length > 0) {
      const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ');
      const lines: string[] = [];
      lines.push(`══ IUL DISCOVERY CALL ══`);
      lines.push(`Date: ${new Date(call.call_date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`);
      if (call.called_by_name) lines.push(`Called by: ${call.called_by_name}`);
      lines.push(`Attempt: ${call.attempt_number}`);
      lines.push('');

      if (disc.interests?.length) lines.push(`Interest: ${disc.interests.join(', ')}`);
      if (disc.occupation) lines.push(`Occupation: ${disc.occupation}`);
      if (disc.spouse) lines.push(`Spouse: ${disc.spouse}`);
      if (disc.kids) lines.push(`Kids: ${disc.kid_details || disc.kids}`);
      if (disc.contribution) lines.push(`Monthly Contribution: ${disc.contribution}`);
      if (disc.retire_age) lines.push(`Target Retirement Age: ${disc.retire_age}`);

      if (disc.accounts?.length) {
        const accts = disc.accounts.filter((a: any) => a.type || a.balance);
        if (accts.length) lines.push(`Retirement Accounts: ${accts.map((a: any) => [a.type, a.balance].filter(Boolean).join(': ')).join(' | ')}`);
      }

      if (disc.health_conditions?.length) {
        const conds = disc.health_conditions.filter(Boolean);
        if (conds.length) lines.push(`Health Conditions: ${conds.join(', ')}`);
      }
      if (disc.tobacco) {
        let tobaccoLine = `Tobacco: ${disc.tobacco}`;
        if (disc.tobacco_type) tobaccoLine += ` (${disc.tobacco_type})`;
        if (disc.tobacco_frequency) tobaccoLine += ` — ${disc.tobacco_frequency}`;
        lines.push(tobaccoLine);
      }
      if (disc.felony) lines.push(`Felony: ${disc.felony}`);
      if (disc.qualifies) lines.push(`Qualifies: ${disc.qualifies}`);

      lines.push('');
      if (call.outcome) lines.push(`Outcome: ${call.outcome.replace(/_/g, ' ')}`);
      if (call.temperature) {
        const tempNum = parseInt(call.temperature, 10);
        const tempLabel = isNaN(tempNum) ? call.temperature : `${tempNum}/10${tempNum >= 8 ? ' 🔥' : tempNum >= 5 ? '' : ' ❄️'}`;
        lines.push(`Temperature: ${tempLabel}`);
      }
      if (disc.notes) lines.push(`Notes: ${disc.notes}`);
      if (disc.callback_date) lines.push(`Callback scheduled: ${new Date(disc.callback_date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`);

      const noteBody = lines.join('\n');

      try {
        await ghlFetch(`/contacts/${lead.ghl_contact_id}/notes`, locationToken, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: noteBody }),
        });
        console.log('Discovery note added to contact');
      } catch (e) {
        console.error('Failed to add note:', e);
        // Non-fatal — don't fail the whole sync
      }
    }

    // 9. Update discovery_calls.ghl_synced_at
    await supabase
      .from('discovery_calls')
      .update({
        ghl_synced_at: new Date().toISOString(),
        ghl_sync_error: null,
      })
      .eq('id', discovery_call_id);

    console.log(`Discovery call ${discovery_call_id} synced to GHL successfully`);

    return new Response(
      JSON.stringify({ success: true, tags: tagsToAdd }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('sync-discovery-to-ghl error:', error.message);

    // Try to record the error
    try {
      const { discovery_call_id } = await req.clone().json();
      if (discovery_call_id) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, serviceKey);
        await supabase
          .from('discovery_calls')
          .update({ ghl_sync_error: error.message })
          .eq('id', discovery_call_id);
      }
    } catch {
      // ignore recording error
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
