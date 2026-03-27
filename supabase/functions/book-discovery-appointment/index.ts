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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const {
      lead_id,
      agent_id,
      calendar_id,
      calendar_type,  // 'discovery' or 'strategy'
      selected_slot,  // ISO datetime string
      notes,
      reschedule,  // true if this is a reschedule — cancel existing appointment first
    } = await req.json();

    if (!lead_id || !agent_id || !calendar_id || !selected_slot) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch lead + client
    const [leadResult, clientResult] = await Promise.all([
      supabase.from('leads').select('id, ghl_contact_id, first_name, last_name, email, phone').eq('id', lead_id).single(),
      supabase.from('clients').select('id, subaccount_id').eq('agent_id', agent_id).single(),
    ]);

    if (!leadResult.data) throw new Error('Lead not found');
    if (!clientResult.data?.subaccount_id) throw new Error('Client subaccount not found');

    const lead = leadResult.data;
    const client = clientResult.data;

    // Get location token
    const { data: tokenData } = await supabase
      .from('ghl_oauth_tokens')
      .select('company_id')
      .limit(1)
      .single();

    if (!tokenData?.company_id) throw new Error('No GHL OAuth token');

    const locationToken = await getLocationToken(
      supabaseUrl, tokenData.company_id, client.subaccount_id, serviceKey
    );

    // Use the stored ghl_contact_id — this was set by inject-lead-to-ghl
    // when the lead was delivered to the agent's sub-account
    if (!lead.ghl_contact_id) {
      throw new Error('Lead has not been delivered to the CRM yet — cannot book appointment');
    }

    const contactId = lead.ghl_contact_id;
    console.log(`Booking for contact ${contactId} in location ${client.subaccount_id}`);

    // If reschedule, cancel the most recent appointment for this contact first
    if (reschedule) {
      try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const apptSearchRes = await fetch(
          `https://services.leadconnectorhq.com/contacts/${contactId}/appointments?startDate=${thirtyDaysAgo.toISOString()}&endDate=${new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()}`,
          {
            headers: {
              'Authorization': `Bearer ${locationToken}`,
              'Accept': 'application/json',
              'Version': '2021-04-15',
            },
          }
        );
        const apptSearchData = await apptSearchRes.json();
        const appointments = Array.isArray(apptSearchData.events || apptSearchData.appointments || apptSearchData)
          ? (apptSearchData.events || apptSearchData.appointments || apptSearchData)
          : [];

        if (appointments.length > 0) {
          // Find the most recent future appointment and cancel it
          const sorted = appointments
            .filter((a: any) => new Date(a.startTime || a.start_time || 0).getTime() > now.getTime() - 24 * 60 * 60 * 1000)
            .sort((a: any, b: any) => new Date(b.startTime || b.start_time || 0).getTime() - new Date(a.startTime || a.start_time || 0).getTime());

          if (sorted.length > 0) {
            const oldApptId = sorted[0].id;
            console.log(`Cancelling previous appointment: ${oldApptId}`);
            await fetch(
              `https://services.leadconnectorhq.com/calendars/events/appointments/${oldApptId}`,
              {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${locationToken}`,
                  'Content-Type': 'application/json',
                  'Version': '2021-04-15',
                },
                body: JSON.stringify({ appointmentStatus: 'cancelled' }),
              }
            );
            console.log(`Previous appointment ${oldApptId} cancelled`);
          }
        }
      } catch (e) {
        console.error('Failed to cancel previous appointment (non-fatal):', e);
        // Non-fatal — still proceed with new booking
      }
    }

    // Calculate end time — 10 min for callbacks, 30 min for everything else
    const durationMin = calendar_type === 'callback' ? 10 : 30;
    const startTime = new Date(selected_slot);
    const endTime = new Date(startTime.getTime() + durationMin * 60 * 1000);

    // Title based on calendar type
    const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(' ');
    const titleMap: Record<string, string> = {
      strategy: `Strategy Call - ${leadName}`,
      discovery: `Discovery Call - ${leadName}`,
      callback: `Callback ${leadName}`,
    };

    // Create appointment via GHL API
    const appointmentPayload: Record<string, any> = {
      calendarId: calendar_id,
      locationId: client.subaccount_id,
      contactId: contactId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      title: titleMap[calendar_type] || `Call - ${leadName}`,
      appointmentStatus: 'confirmed',
    };

    if (notes) {
      appointmentPayload.notes = notes;
    }

    console.log('Creating appointment:', JSON.stringify(appointmentPayload));

    const apptRes = await fetch('https://services.leadconnectorhq.com/calendars/events/appointments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${locationToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-04-15',
      },
      body: JSON.stringify(appointmentPayload),
    });

    const apptText = await apptRes.text();
    let apptData: any;
    try { apptData = JSON.parse(apptText); } catch { apptData = { raw: apptText }; }

    if (!apptRes.ok) {
      console.error('GHL appointment creation failed:', apptText);
      throw new Error(`Appointment creation failed: ${apptData.message || apptData.error || apptText}`);
    }

    const eventId = apptData.id || apptData.event?.id || apptData.appointment?.id || null;
    console.log('Appointment created:', eventId);

    // Update lead in Supabase
    const leadUpdate: Record<string, any> = {};
    if (calendar_type === 'strategy') {
      leadUpdate.discovery_stage = 'strategy_booked';
      leadUpdate.strategy_booked_at = new Date().toISOString();
      leadUpdate.strategy_calendar_event_id = eventId;
    } else if (calendar_type === 'callback') {
      leadUpdate.discovery_stage = 'callback_scheduled';
      // Don't overwrite intro fields — this is a callback, not an intro
    } else {
      leadUpdate.discovery_stage = 'intro_scheduled';
      leadUpdate.intro_scheduled_at = new Date().toISOString();
      leadUpdate.intro_calendar_event_id = eventId;
    }

    await supabase.from('leads').update(leadUpdate).eq('id', lead_id);

    // Add booking tag to GHL contact
    const bookingTag = calendar_type === 'strategy' ? 'strategy-booked' : 'intro-scheduled';
    const contactRes = await fetch(`https://services.leadconnectorhq.com/contacts/${lead.ghl_contact_id}`, {
      headers: {
        'Authorization': `Bearer ${locationToken}`,
        'Accept': 'application/json',
        'Version': '2021-07-28',
      },
    });
    const contactData = await contactRes.json();
    const currentTags: string[] = contactData.contact?.tags || [];
    const newTags = [...new Set([...currentTags, bookingTag])];

    await fetch(`https://services.leadconnectorhq.com/contacts/${lead.ghl_contact_id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${locationToken}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
      body: JSON.stringify({ tags: newTags }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        event_id: eventId,
        calendar_type,
        booked_at: selected_slot,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('book-discovery-appointment error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
