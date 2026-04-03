import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_COMPANY_ID = '30bFOq4ZtlhKuMOvVPwA';

// Map discovery outcomes to GHL tags
const OUTCOME_TAGS: Record<string, string[]> = {
  'strategy_booked':   ['Strategy Booked', 'Discovery Complete'],
  'intro_scheduled':   ['Intro Scheduled', 'Discovery Complete'],
  'call_back':         ['Callback Requested'],
  'cant_book_now':     ['Interested - Cant Book'],
  'not_a_fit':         ['Not A Fit'],
  'long_term_nurture': ['Long Term Nurture'],
  'bad_number':        ['Bad Number'],
  'voicemail':         ['Voicemail'],
  'no_answer':         ['No Answer'],
  'bad_timing':        ['Bad Timing'],
};

async function getLocationToken(supabaseUrl: string, locationId: string, serviceKey: string): Promise<string> {
  const res = await fetch(`${supabaseUrl}/functions/v1/crm-location-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
    body: JSON.stringify({ companyId: GHL_COMPANY_ID, locationId }),
  });
  if (!res.ok) throw new Error(`Location token failed: ${await res.text()}`);
  return (await res.json()).locationAccessToken;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { lead_id, discovery_call_id } = await req.json();

    if (!lead_id) {
      return new Response(JSON.stringify({ success: false, error: 'lead_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the lead
    const { data: lead } = await supabase
      .from('leads')
      .select('id, agent_id, ghl_contact_id, email, phone, first_name, last_name')
      .eq('id', lead_id)
      .single();

    if (!lead) {
      return new Response(JSON.stringify({ success: false, error: 'Lead not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the discovery call record
    let call: any = null;
    if (discovery_call_id) {
      const { data } = await supabase
        .from('discovery_calls')
        .select('*')
        .eq('id', discovery_call_id)
        .single();
      call = data;
    }

    // Get agent's subaccount
    const { data: client } = await supabase
      .from('clients')
      .select('subaccount_id, ghl_user_id')
      .eq('agent_id', lead.agent_id)
      .single();

    if (!client?.subaccount_id) {
      return new Response(JSON.stringify({ success: false, error: 'Agent has no subaccount' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!lead.ghl_contact_id) {
      return new Response(JSON.stringify({ success: false, error: 'Lead has no GHL contact ID' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = await getLocationToken(supabaseUrl, client.subaccount_id, supabaseKey);

    // Build tags from outcome
    const tags: string[] = [];
    if (call?.outcome && OUTCOME_TAGS[call.outcome]) {
      tags.push(...OUTCOME_TAGS[call.outcome]);
    }
    if (call?.temperature) {
      tags.push(`Temp: ${call.temperature}`);
    }
    tags.push(`Attempt ${call?.attempt_number || 1}`);

    // Build custom fields from discovery data
    const customFields: any[] = [];
    const dd = call?.discovery_data || {};

    if (dd.occupation) customFields.push({ key: 'contact.occupation', value: dd.occupation });
    if (dd.spouse) customFields.push({ key: 'contact.spouse', value: dd.spouse });
    if (dd.kids) customFields.push({ key: 'contact.kids', value: dd.kids });
    if (dd.contribution) customFields.push({ key: 'contact.monthly_contribution', value: dd.contribution });
    if (dd.retire_age) customFields.push({ key: 'contact.retirement_age', value: dd.retire_age });
    if (dd.qualifies) customFields.push({ key: 'contact.qualifies', value: dd.qualifies });
    if (dd.notes) customFields.push({ key: 'contact.discovery_notes', value: dd.notes });

    // Update GHL contact with tags + custom fields
    const updatePayload: any = { tags };
    if (customFields.length > 0) {
      updatePayload.customFields = customFields;
    }
    if (call?.notes) {
      updatePayload.notes = call.notes;
    }

    console.log(`[SyncDiscovery] Updating contact ${lead.ghl_contact_id} with ${tags.length} tags, ${customFields.length} custom fields`);

    const updateRes = await fetch(`https://services.leadconnectorhq.com/contacts/${lead.ghl_contact_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28',
        'Accept': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error(`[SyncDiscovery] GHL update failed (${updateRes.status}):`, errText.slice(0, 500));

      // Mark sync error on discovery call
      if (discovery_call_id) {
        await supabase.from('discovery_calls').update({
          ghl_sync_error: `HTTP ${updateRes.status}: ${errText.slice(0, 200)}`,
        }).eq('id', discovery_call_id);
      }

      return new Response(JSON.stringify({ success: false, error: `GHL update failed (${updateRes.status})` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark sync success
    if (discovery_call_id) {
      await supabase.from('discovery_calls').update({
        ghl_synced_at: new Date().toISOString(),
        ghl_sync_error: null,
      }).eq('id', discovery_call_id);
    }

    console.log(`[SyncDiscovery] Success: contact ${lead.ghl_contact_id} updated`);

    return new Response(JSON.stringify({
      success: true,
      contact_id: lead.ghl_contact_id,
      tags_applied: tags,
      custom_fields_set: customFields.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[SyncDiscovery] Error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
