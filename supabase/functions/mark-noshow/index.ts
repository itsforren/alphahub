import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getLocationToken(
  supabaseUrl: string, companyId: string, locationId: string, serviceKey: string
): Promise<string> {
  const res = await fetch(`${supabaseUrl}/functions/v1/crm-location-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
    body: JSON.stringify({ companyId, locationId }),
  });
  if (!res.ok) throw new Error(`Token error: ${await res.text()}`);
  const data = await res.json();
  return data.locationAccessToken;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { lead_id, noshow_type } = await req.json();
    // noshow_type: 'strategy' or 'discovery'

    if (!lead_id) {
      return new Response(
        JSON.stringify({ error: 'Missing lead_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const type = noshow_type || 'strategy';

    // 1. Get lead + client info
    const { data: lead } = await supabase
      .from('leads')
      .select('id, agent_id, ghl_contact_id, first_name, last_name')
      .eq('id', lead_id)
      .single();

    if (!lead?.ghl_contact_id) throw new Error('Lead not found or no GHL contact');

    const { data: client } = await supabase
      .from('clients')
      .select('subaccount_id')
      .eq('agent_id', lead.agent_id)
      .single();

    if (!client?.subaccount_id) throw new Error('Client subaccount not found');

    // 2. Get location token
    const { data: tokenData } = await supabase
      .from('ghl_oauth_tokens')
      .select('company_id')
      .limit(1)
      .single();

    if (!tokenData?.company_id) throw new Error('No GHL OAuth token');

    const locationToken = await getLocationToken(
      supabaseUrl, tokenData.company_id, client.subaccount_id, serviceKey
    );

    // 3. Fetch the contact's most recent appointment
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const apptRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/${lead.ghl_contact_id}/appointments?` +
      `startDate=${thirtyDaysAgo.toISOString()}&endDate=${now.toISOString()}`,
      {
        headers: {
          'Authorization': `Bearer ${locationToken}`,
          'Accept': 'application/json',
          'Version': '2021-04-15',
        },
      }
    );

    const apptData = await apptRes.json();
    const appointments = apptData.events || apptData.appointments || apptData || [];

    console.log(`Found ${Array.isArray(appointments) ? appointments.length : 0} appointments for contact ${lead.ghl_contact_id}`);

    // Find the most recent appointment (sort by start time desc)
    let mostRecent: any = null;
    if (Array.isArray(appointments) && appointments.length > 0) {
      mostRecent = appointments.sort((a: any, b: any) => {
        const aTime = new Date(a.startTime || a.start_time || 0).getTime();
        const bTime = new Date(b.startTime || b.start_time || 0).getTime();
        return bTime - aTime;
      })[0];
    }

    if (!mostRecent) {
      // No appointment found — still update the lead stage in Supabase
      console.log('No appointments found, updating lead stage only');

      const newStage = type === 'strategy' ? 'strategy_no_show' : 'discovery_complete';
      await supabase
        .from('leads')
        .update({ discovery_stage: newStage })
        .eq('id', lead_id);

      return new Response(
        JSON.stringify({ success: true, lead_id, new_stage: newStage, appointment_updated: false, reason: 'no appointments found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appointmentId = mostRecent.id;
    console.log(`Marking appointment ${appointmentId} as no_show`);

    // 4. Update the GHL appointment status to no_show
    const updateRes = await fetch(
      `https://services.leadconnectorhq.com/calendars/events/appointments/${appointmentId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${locationToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Version': '2021-04-15',
        },
        body: JSON.stringify({ appointmentStatus: 'no_show' }),
      }
    );

    const updateData = await updateRes.json();
    console.log(`Appointment update result: ${updateData.appointmentStatus || updateData.status || 'unknown'}`);

    // 5. The GHL no-show workflow will fire from this status change,
    //    which hits our discovery-noshow-webhook and updates Supabase.
    //    But let's also update immediately so the UI reflects it.
    const newStage = type === 'strategy' ? 'strategy_no_show' : 'discovery_complete';
    await supabase
      .from('leads')
      .update({ discovery_stage: newStage })
      .eq('id', lead_id);

    // 6. Tag the GHL contact with the no-show tag
    const noshowTag = type === 'strategy' ? 'strategy-no-show' : 'discovery-no-show';
    try {
      // Fetch current tags
      const contactRes = await fetch(
        `https://services.leadconnectorhq.com/contacts/${lead.ghl_contact_id}`,
        {
          headers: {
            'Authorization': `Bearer ${locationToken}`,
            'Accept': 'application/json',
            'Version': '2021-04-15',
          },
        }
      );
      const contactData = await contactRes.json();
      const currentTags: string[] = contactData.contact?.tags || [];
      const newTags = [...new Set([...currentTags, noshowTag])];

      await fetch(
        `https://services.leadconnectorhq.com/contacts/${lead.ghl_contact_id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${locationToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Version': '2021-04-15',
          },
          body: JSON.stringify({ tags: newTags }),
        }
      );
      console.log(`Tagged contact with ${noshowTag}`);
    } catch (tagErr) {
      console.error('Failed to tag no-show:', tagErr.message);
      // Non-fatal — don't fail the whole operation
    }

    const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(' ');

    return new Response(
      JSON.stringify({
        success: true,
        lead_id,
        lead_name: leadName,
        appointment_id: appointmentId,
        new_stage: newStage,
        appointment_updated: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('mark-noshow error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
