import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_COMPANY_ID = '30bFOq4ZtlhKuMOvVPwA';

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
    const { lead_id, agent_id, calendar_id, calendar_type, selected_slot, reschedule, notes } = await req.json();

    if (!lead_id || !calendar_id || !selected_slot) {
      return new Response(JSON.stringify({ success: false, error: 'lead_id, calendar_id, and selected_slot required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[BookAppt] lead=${lead_id}, calendar=${calendar_id}, type=${calendar_type}, slot=${selected_slot}`);

    // Get the lead + agent details
    const { data: lead } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email, phone, ghl_contact_id, agent_id')
      .eq('id', lead_id)
      .single();

    if (!lead) {
      return new Response(JSON.stringify({ success: false, error: 'Lead not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const effectiveAgentId = agent_id || lead.agent_id;

    // Get agent's subaccount
    const { data: client } = await supabase
      .from('clients')
      .select('id, subaccount_id, ghl_user_id, name')
      .eq('agent_id', effectiveAgentId)
      .single();

    if (!client?.subaccount_id) {
      return new Response(JSON.stringify({ success: false, error: 'Agent has no subaccount' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get location token
    const token = await getLocationToken(supabaseUrl, client.subaccount_id, supabaseKey);

    // If no GHL contact ID on the lead, try to find or create one
    let contactId = lead.ghl_contact_id;
    if (!contactId && lead.email) {
      // Search by email
      const searchRes = await fetch(`https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${client.subaccount_id}&email=${encodeURIComponent(lead.email)}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Version': '2021-07-28', 'Accept': 'application/json' },
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const contact = searchData.contact;
        if (contact?.id) {
          contactId = contact.id;
          await supabase.from('leads').update({ ghl_contact_id: contactId }).eq('id', lead_id);
        }
      }
    }

    if (!contactId) {
      return new Response(JSON.stringify({ success: false, error: 'No GHL contact found for this lead. Deliver lead to CRM first.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Book the appointment
    const appointmentPayload: any = {
      calendarId: calendar_id,
      locationId: client.subaccount_id,
      contactId: contactId,
      startTime: selected_slot,
      title: `${calendar_type === 'callback' ? 'Callback' : calendar_type === 'strategy' ? 'Strategy Call' : 'Discovery Call'} — ${lead.first_name} ${lead.last_name}`,
      appointmentStatus: 'confirmed',
    };

    if (notes) {
      appointmentPayload.notes = notes;
    }

    // If assigned user, add it
    if (client.ghl_user_id) {
      appointmentPayload.assignedUserId = client.ghl_user_id;
    }

    console.log(`[BookAppt] Creating appointment for contact ${contactId} on calendar ${calendar_id}`);

    const apptRes = await fetch('https://services.leadconnectorhq.com/calendars/events/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Version': '2021-04-15',
        'Accept': 'application/json',
      },
      body: JSON.stringify(appointmentPayload),
    });

    const apptText = await apptRes.text();
    let apptData: any = null;
    try { apptData = JSON.parse(apptText); } catch { /* */ }

    if (!apptRes.ok) {
      console.error(`[BookAppt] Failed (${apptRes.status}):`, apptText.slice(0, 500));
      return new Response(JSON.stringify({
        success: false,
        error: `GHL appointment creation failed (${apptRes.status})`,
        detail: apptText.slice(0, 500),
      }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const appointmentId = apptData?.id || apptData?.appointment?.id || apptData?._id;
    console.log(`[BookAppt] Appointment created: ${appointmentId}`);

    // Update lead with booking info
    const updateFields: any = {};
    if (calendar_type === 'callback') {
      updateFields.discovery_stage = 'callback_scheduled';
    } else if (calendar_type === 'strategy') {
      updateFields.discovery_stage = 'strategy_booked';
      updateFields.strategy_booked_at = new Date().toISOString();
    } else if (calendar_type === 'discovery') {
      updateFields.discovery_stage = 'intro_scheduled';
      updateFields.intro_scheduled_at = new Date().toISOString();
    }
    updateFields.booked_call_at = new Date().toISOString();

    if (Object.keys(updateFields).length > 0) {
      await supabase.from('leads').update(updateFields).eq('id', lead_id);
    }

    return new Response(JSON.stringify({
      success: true,
      appointment_id: appointmentId,
      calendar_type,
      contact_id: contactId,
      slot: selected_slot,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[BookAppt] Error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
