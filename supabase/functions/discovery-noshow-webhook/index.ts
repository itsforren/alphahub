import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const url = new URL(req.url);
    const callType = url.searchParams.get('type') || 'discovery'; // 'discovery' or 'strategy'

    const body = await req.json();
    console.log(`No-show/cancel webhook (${callType}):`, JSON.stringify(body).substring(0, 500));

    // Normalize GHL payload
    const contactId = body.contactId || body.contact_id
      || body.contact?.id || body.id;
    const appointmentStatus = body.appointmentStatus || body.appointment_status
      || body.status || 'no_show';
    const appointmentId = body.appointmentId || body.appointment_id
      || body.calendarAppointmentId || '';
    const email = body.email || body.contact?.email;

    if (!contactId && !email) {
      return new Response(
        JSON.stringify({ received: true, skipped: true, reason: 'no contactId or email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine event type
    const statusLower = appointmentStatus.toLowerCase();
    const isNoShow = statusLower.includes('no_show') || statusLower.includes('noshow') || statusLower.includes('no-show');
    const isCancelled = statusLower.includes('cancel');
    const eventType = isNoShow ? 'no_show' : isCancelled ? 'cancelled' : 'no_show';

    // Determine new discovery stage based on call type
    let newStage: string;
    if (callType === 'strategy') {
      // Strategy no-show/cancel → needs rebook, high priority
      newStage = 'strategy_no_show';
    } else {
      // Discovery no-show/cancel → back to follow-up queue, continue attempts
      // Use the next attempt stage based on current attempt count
      newStage = 'discovery_complete'; // puts them back in the follow-up queue
    }

    // Find the lead
    let lead: any = null;

    if (contactId) {
      const { data } = await supabase
        .from('leads')
        .select('id, agent_id, first_name, last_name, discovery_stage, call_attempt_count')
        .eq('ghl_contact_id', contactId)
        .limit(1);
      if (data?.length) lead = data[0];
    }

    if (!lead && email) {
      const { data } = await supabase
        .from('leads')
        .select('id, agent_id, first_name, last_name, discovery_stage, call_attempt_count')
        .eq('email', email)
        .limit(1);
      if (data?.length) lead = data[0];
    }

    if (!lead) {
      console.log(`No lead found for contact ${contactId} / ${email}`);
      return new Response(
        JSON.stringify({ received: true, skipped: true, reason: 'lead not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`${eventType} (${callType}) for: ${lead.first_name} ${lead.last_name} (${lead.id})`);

    // For discovery no-shows, put them back at the right attempt stage
    if (callType === 'discovery') {
      const attemptCount = lead.call_attempt_count || 0;
      const nextAttempt = Math.min(attemptCount + 1, 4);
      newStage = nextAttempt > 0 ? `attempt_${nextAttempt}` : 'new';
    }

    // Update lead
    await supabase
      .from('leads')
      .update({ discovery_stage: newStage })
      .eq('id', lead.id);

    // Log the event
    await supabase
      .from('discovery_calls')
      .insert({
        lead_id: lead.id,
        agent_id: lead.agent_id,
        attempt_number: 0,
        answered: false,
        outcome: callType === 'strategy' ? 'no_answer' : 'call_back',
        discovery_data: {
          auto_event: true,
          event_type: eventType,
          call_type: callType,
          appointment_id: appointmentId,
          original_status: appointmentStatus,
        },
        called_by_name: `System (${callType === 'strategy' ? 'Strategy' : 'Discovery'} ${eventType === 'no_show' ? 'No-Show' : 'Cancelled'})`,
      });

    console.log(`Lead ${lead.id} → ${newStage}`);

    return new Response(
      JSON.stringify({ success: true, lead_id: lead.id, new_stage: newStage, event_type: eventType, call_type: callType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('No-show webhook error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
