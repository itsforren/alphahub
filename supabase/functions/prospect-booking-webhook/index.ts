import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse partner from URL query parameter
    const url = new URL(req.url);
    const partnerSlug = url.searchParams.get("partner");
    let partnerId: string | null = null;
    let partnerName: string | null = null;

    if (partnerSlug) {
      const { data: partner } = await supabase
        .from("partners")
        .select("id, name")
        .eq("slug", partnerSlug)
        .eq("is_active", true)
        .maybeSingle();
      
      if (partner) {
        partnerId = partner.id;
        partnerName = partner.name;
        console.log(`Partner identified: ${partnerName} (${partnerId})`);
      } else {
        console.warn(`Partner slug "${partnerSlug}" not found or inactive`);
      }
    }

    const payload = await req.json();
    console.log("Received GHL appointment webhook:", JSON.stringify(payload, null, 2));

    // Extract email from various possible GHL payload structures
    const email = (
      payload.email || 
      payload.contact?.email || 
      payload.contact_email ||
      payload.appointment?.contact?.email ||
      ""
    ).toLowerCase().trim();

    if (!email) {
      console.error("No email found in booking payload");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract contact details for potential prospect creation
    const firstName = payload.first_name || payload.firstName || payload.contact?.firstName || payload.contact?.first_name || "";
    const lastName = payload.last_name || payload.lastName || payload.contact?.lastName || payload.contact?.last_name || "";
    const phone = payload.phone || payload.contact?.phone || "";
    const company = payload.company || payload.contact?.company || "";

    // Extract appointment details
    const appointmentTime = payload.startTime || payload.appointment_time || payload.appointment?.startTime;
    const appointmentEndTime = payload.endTime || payload.appointment?.endTime;
    const calendarId = payload.calendarId || payload.calendar_id || payload.calendar?.id;
    const calendarName = payload.calendarName || payload.calendar_name || payload.calendar?.name;
    const ghlContactId = payload.contactId || payload.contact_id || payload.contact?.id;
    const ghlAppointmentId = payload.id || payload.appointmentId || payload.appointment_id || payload.appointment?.id;
    
    // Extract status - GHL sends different fields for status
    const appointmentStatus = (
      payload.appointmentStatus || 
      payload.status || 
      payload.appointment?.appointmentStatus ||
      payload.appointment?.status ||
      "confirmed"
    ).toLowerCase();

    // ============================================
    // IDENTITY RESOLUTION: Link GHL booking to website visitor
    // ============================================
    
    // Step 1: Try to get visitor_id from GHL custom fields (passed from calendar URL)
    const visitorIdFromGHL = 
      payload.visitor_id || 
      payload.contact?.visitor_id || 
      payload.customFields?.visitor_id ||
      payload.contact?.customField?.visitor_id ||
      payload.custom_values?.visitor_id ||
      // Check for nested custom fields in various GHL formats
      (payload.contact?.customField && Object.values(payload.contact.customField).find((v: any) => 
        typeof v === 'string' && v.startsWith('v_')
      ));
    
    console.log(`[Identity Resolution] visitor_id from GHL: ${visitorIdFromGHL || 'not found'}`);

    // Step 2: Look up existing visitor session by email (for manual bookings)
    let existingSession = null;
    const { data: sessionData } = await supabase
      .from('visitor_sessions')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (sessionData) {
      existingSession = sessionData;
      console.log(`[Identity Resolution] Found existing session for ${email}: visitor_id=${existingSession.visitor_id}`);
    }

    // Step 3: Check if a prospect already exists with a real (non-synthetic) visitor_id
    const { data: existingProspectData } = await supabase
      .from('prospects')
      .select('id, visitor_id, email')
      .eq('email', email)
      .not('visitor_id', 'ilike', 'ghl_%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (existingProspectData) {
      console.log(`[Identity Resolution] Found existing prospect with real visitor_id: ${existingProspectData.visitor_id}`);
    }

    // Step 4: Determine the best visitor_id to use (priority order)
    const visitorId = 
      visitorIdFromGHL ||                      // 1. Passed from GHL calendar (best - direct link)
      existingProspectData?.visitor_id ||      // 2. Existing prospect with real ID
      existingSession?.visitor_id ||           // 3. Matched session by email
      `ghl_${ghlContactId || Date.now()}`;     // 4. Fallback synthetic ID
    
    console.log(`[Identity Resolution] Final visitor_id: ${visitorId} (source: ${
      visitorIdFromGHL ? 'ghl_custom_field' : 
      existingProspectData?.visitor_id ? 'existing_prospect' : 
      existingSession?.visitor_id ? 'email_session_match' : 
      'synthetic'
    })`);

    console.log(`Processing appointment for ${email}, status: ${appointmentStatus}, partner: ${partnerName || 'direct'}`);

    // Find the prospect by email or ghl_contact_id
    let prospect = null;
    
    if (ghlContactId) {
      const { data } = await supabase
        .from("prospects")
        .select("id, pipeline_stage_id, ghl_contact_id, appointment_status, ghl_appointment_id, partner_id, appt_count_reschedules, appt_count_no_shows, visitor_id")
        .eq("ghl_contact_id", ghlContactId)
        .maybeSingle();
      prospect = data;
    }

    if (!prospect) {
      const { data, error: prospectError } = await supabase
        .from("prospects")
        .select("id, pipeline_stage_id, ghl_contact_id, appointment_status, ghl_appointment_id, partner_id, appt_count_reschedules, appt_count_no_shows, visitor_id")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (prospectError) {
        console.error("Error finding prospect:", prospectError);
      }
      prospect = data;
    }

    // If no prospect exists and this is a booking, create one
    if (!prospect && (appointmentStatus === "confirmed" || appointmentStatus === "booked")) {
      console.log(`Creating new prospect for ${email} from ${partnerName || 'direct'} funnel`);
      
      // Get the "Call Scheduled" stage - prospects created via booking should go directly here
      const { data: callScheduledStage } = await supabase
        .from("sales_pipeline_stages")
        .select("id")
        .eq("stage_key", "call_scheduled")
        .maybeSingle();
      
      // Build the name from first + last name, or fall back to email prefix
      const prospectName = [firstName, lastName].filter(Boolean).join(" ").trim() || email.split("@")[0];
      
      const qualifyDueAt = appointmentTime
        ? new Date(appointmentTime).toISOString()
        : new Date(Date.now() + 5 * 60 * 1000).toISOString();

      const insertPayload = {
        email,
        name: prospectName,
        phone: phone || null,
        ghl_contact_id: ghlContactId,
        pipeline_stage_id: callScheduledStage?.id,
        partner_id: partnerId,
        source_page: "ghl_webhook",
        visitor_id: visitorId,
        forecast_probability: 20,
        // New enhanced fields
        intent: partnerId ? "join_partner" : "unsure",
        qual_status: "unreviewed",
        call_type: partnerId ? "partner_alignment" : "system_setup",
        owner_role: "setter",
        // All leads still require the qualification call, even after booking.
        next_action_type: "call_to_qualify",
        next_action_due_at: qualifyDueAt,
        // Appointment details
        appt_start_at: appointmentTime,
        appt_end_at: appointmentEndTime,
        appt_calendar_id: calendarId,
      };
      
      console.log("Inserting prospect with payload:", JSON.stringify(insertPayload, null, 2));
      
      const { data: newProspect, error: createError } = await supabase
        .from("prospects")
        .insert(insertPayload)
        .select("id, pipeline_stage_id, ghl_contact_id, appointment_status, ghl_appointment_id, partner_id, appt_count_reschedules, appt_count_no_shows, visitor_id")
        .single();

      if (createError) {
        console.error("Error creating prospect:", JSON.stringify(createError, null, 2));
        return new Response(
          JSON.stringify({ error: "Failed to create prospect", details: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      prospect = newProspect;

      // Log creation activity
      await supabase.from("prospect_activities").insert({
        prospect_id: prospect.id,
        activity_type: "prospect_created",
        activity_data: {
          source: partnerName ? `${partnerName} Funnel` : "GHL Booking",
          partner_id: partnerId,
          partner_name: partnerName,
          ghl_contact_id: ghlContactId,
          via: "ghl_webhook",
          identity_resolution: {
            visitor_id_source: visitorIdFromGHL ? 'ghl_custom_field' : 
              existingProspectData?.visitor_id ? 'existing_prospect' : 
              existingSession?.visitor_id ? 'email_session_match' : 'synthetic',
            matched_session: !!existingSession,
          },
        },
      });

      // Create attribution record with REAL data from session if available
      const attributionData: Record<string, unknown> = {
        prospect_id: prospect.id,
        visitor_id: visitorId,
        // Use session attribution if available, otherwise use defaults
        first_touch_source: existingSession?.utm_source || partnerName || "ghl",
        first_touch_medium: existingSession?.utm_medium || "booking",
        first_touch_campaign: existingSession?.utm_campaign || null,
        first_touch_content: existingSession?.utm_content || null,
        first_touch_term: existingSession?.utm_term || null,
        first_touch_gclid: existingSession?.gclid || null,
        first_touch_fbclid: existingSession?.fbclid || null,
        first_touch_referrer: existingSession?.referrer_url || null,
        first_touch_landing_page: existingSession?.landing_page || null,
        first_touch_at: existingSession?.first_seen_at || new Date().toISOString(),
        // Last touch is the booking
        last_touch_source: partnerName || "ghl",
        last_touch_medium: "booking",
        last_touch_at: new Date().toISOString(),
      };

      // If we have session data, calculate time to conversion
      if (existingSession?.first_seen_at) {
        const firstTouchTime = new Date(existingSession.first_seen_at).getTime();
        const nowTime = Date.now();
        attributionData.time_to_conversion_hours = Math.round((nowTime - firstTouchTime) / (1000 * 60 * 60) * 10) / 10;
      }

      console.log("[Attribution] Creating attribution record:", JSON.stringify(attributionData, null, 2));
      await supabase.from("prospect_attribution").insert(attributionData);

      // Mark the session as converted (locks the identity)
      if (existingSession) {
        await supabase
          .from('visitor_sessions')
          .update({ 
            email: email,
            converted_at: new Date().toISOString() 
          })
          .eq('id', existingSession.id);
        console.log(`[Identity Resolution] Marked session ${existingSession.id} as converted`);
      }
    }

    if (!prospect) {
      console.log(`No prospect found for email: ${email}`);
      return new Response(
        JSON.stringify({ message: "Prospect not found, but webhook received" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If we have a better visitor_id now, update the prospect
    if (prospect.visitor_id?.startsWith('ghl_') && !visitorId.startsWith('ghl_')) {
      console.log(`[Identity Resolution] Upgrading prospect visitor_id from ${prospect.visitor_id} to ${visitorId}`);
      await supabase
        .from('prospects')
        .update({ visitor_id: visitorId })
        .eq('id', prospect.id);

      // Also update attribution record
      await supabase
        .from('prospect_attribution')
        .update({ 
          visitor_id: visitorId,
          // Add session attribution if available
          ...(existingSession && {
            first_touch_source: existingSession.utm_source,
            first_touch_medium: existingSession.utm_medium,
            first_touch_campaign: existingSession.utm_campaign,
            first_touch_content: existingSession.utm_content,
            first_touch_term: existingSession.utm_term,
            first_touch_gclid: existingSession.gclid,
            first_touch_fbclid: existingSession.fbclid,
            first_touch_referrer: existingSession.referrer_url,
            first_touch_landing_page: existingSession.landing_page,
            first_touch_at: existingSession.first_seen_at,
          }),
        })
        .eq('prospect_id', prospect.id);
    }

    // Dedupe: check if we've already processed this exact appointment event
    if (prospect.ghl_appointment_id === ghlAppointmentId && 
        prospect.appointment_status === appointmentStatus) {
      console.log(`Already processed appointment ${ghlAppointmentId} with status ${appointmentStatus}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Appointment already processed",
          deduplicated: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all pipeline stages
    const { data: stages } = await supabase
      .from("sales_pipeline_stages")
      .select("id, stage_key");

    const stageMap: Record<string, string> = {};
    stages?.forEach((s) => {
      stageMap[s.stage_key] = s.id;
    });

    // Map GHL status to our appointment_status and pipeline stage
    let newAppointmentStatus: string;
    let newStageKey: string | null = null;
    let activityType: string;
    let activityData: Record<string, unknown>;
    let nextActionType: string | null = null;
    let nextActionDueAt: string | null = null;
    let incrementNoShows = false;
    let incrementReschedules = false;

    switch (appointmentStatus) {
      case "confirmed":
      case "booked": {
        newAppointmentStatus = "confirmed";
        newStageKey = "call_scheduled";
        activityType = "booking_created";

        // Keep the qualification call as the next action.
        nextActionType = "call_to_qualify";
        nextActionDueAt = appointmentTime
          ? new Date(appointmentTime).toISOString()
          : new Date(Date.now() + 5 * 60 * 1000).toISOString();

        activityData = {
          appointment_time: appointmentTime,
          calendar_name: calendarName,
          source: "ghl_webhook",
          partner_id: partnerId,
          partner_name: partnerName,
          ghl_contact_id: ghlContactId,
          ghl_appointment_id: ghlAppointmentId,
        };
        break;
      }

      case "cancelled":
      case "canceled":
        newAppointmentStatus = "cancelled";
        // Stay in Call Scheduled - need recovery
        newStageKey = "call_scheduled";
        activityType = "booking_cancelled";
        // Next action: call now to reschedule
        nextActionType = "reschedule_call";
        nextActionDueAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min
        activityData = {
          appointment_time: appointmentTime,
          cancelled_at: new Date().toISOString(),
          source: "ghl_webhook",
          ghl_appointment_id: ghlAppointmentId,
        };
        break;

      case "noshow":
      case "no_show":
      case "no-show":
        newAppointmentStatus = "no_show";
        // Stay in Call Scheduled - no-show recovery
        newStageKey = "call_scheduled";
        activityType = "booking_noshow";
        // CRITICAL: Automatic next action for no-show recovery
        nextActionType = "call_now";
        nextActionDueAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
        incrementNoShows = true;
        activityData = {
          appointment_time: appointmentTime,
          marked_noshow_at: new Date().toISOString(),
          source: "ghl_webhook",
          ghl_appointment_id: ghlAppointmentId,
          no_show_count: (prospect.appt_count_no_shows || 0) + 1,
        };
        break;

      case "showed":
      case "completed":
        newAppointmentStatus = "completed";
        newStageKey = "call_completed";
        activityType = "booking_completed";
        // No next action set - requires disposition modal
        activityData = {
          appointment_time: appointmentTime,
          completed_at: new Date().toISOString(),
          source: "ghl_webhook",
          ghl_appointment_id: ghlAppointmentId,
        };
        break;

      case "rescheduled":
        newAppointmentStatus = "rescheduled";
        newStageKey = "call_scheduled";
        activityType = "booking_rescheduled";
        // Keep qualification call as next action
        nextActionType = "call_to_qualify";
        nextActionDueAt = appointmentTime
          ? new Date(appointmentTime).toISOString()
          : new Date(Date.now() + 5 * 60 * 1000).toISOString();
        incrementReschedules = true;
        activityData = {
          new_appointment_time: appointmentTime,
          rescheduled_at: new Date().toISOString(),
          source: "ghl_webhook",
          ghl_appointment_id: ghlAppointmentId,
          reschedule_count: (prospect.appt_count_reschedules || 0) + 1,
        };
        break;

      default:
        newAppointmentStatus = appointmentStatus;
        activityType = "booking_updated";
        activityData = {
          status: appointmentStatus,
          appointment_time: appointmentTime,
          source: "ghl_webhook",
          ghl_appointment_id: ghlAppointmentId,
        };
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      appointment_status: newAppointmentStatus,
      ghl_appointment_id: ghlAppointmentId,
      updated_at: new Date().toISOString(),
    };

    // NOTE: We do NOT overwrite qualified_path here - it preserves the qualification status
    // (e.g., "Qualified (standard)" or "Qualified (payment plan)")
    // The "stage" field in GHL should track funnel progress, not qualified_path

    // Update pipeline stage if applicable
    if (newStageKey && stageMap[newStageKey]) {
      updateData.pipeline_stage_id = stageMap[newStageKey];
    }

    // Update appointment times
    if (appointmentTime) {
      updateData.appt_start_at = appointmentTime;
      updateData.calendar_booked_at = appointmentTime;
    }
    if (appointmentEndTime) {
      updateData.appt_end_at = appointmentEndTime;
    }
    if (calendarId) {
      updateData.appt_calendar_id = calendarId;
    }

    // Update next action
    if (nextActionType) {
      updateData.next_action_type = nextActionType;
      updateData.next_action_due_at = nextActionDueAt;
    }

    // Increment counters
    if (incrementNoShows) {
      updateData.appt_count_no_shows = (prospect.appt_count_no_shows || 0) + 1;
    }
    if (incrementReschedules) {
      updateData.appt_count_reschedules = (prospect.appt_count_reschedules || 0) + 1;
    }

    // Store GHL contact ID if we got one and don't have it
    if (ghlContactId && !prospect.ghl_contact_id) {
      updateData.ghl_contact_id = ghlContactId;
    }

    // Update partner_id if this is from a partner funnel and prospect doesn't have one set
    if (partnerId && !prospect.partner_id) {
      updateData.partner_id = partnerId;
    }

    // Update the prospect
    const { error: updateError } = await supabase
      .from("prospects")
      .update(updateData)
      .eq("id", prospect.id);

    if (updateError) {
      console.error("Error updating prospect:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update prospect" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the activity
    await supabase.from("prospect_activities").insert({
      prospect_id: prospect.id,
      activity_type: activityType,
      activity_data: activityData,
    });

    console.log(`Successfully processed ${activityType} for prospect ${prospect.id} (partner: ${partnerName || 'direct'})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        prospect_id: prospect.id,
        status: newAppointmentStatus,
        stage: newStageKey,
        partner: partnerName,
        next_action: nextActionType,
        identity_resolution: {
          visitor_id: visitorId,
          source: visitorIdFromGHL ? 'ghl_custom_field' : 
            existingProspectData?.visitor_id ? 'existing_prospect' : 
            existingSession?.visitor_id ? 'email_session_match' : 'synthetic',
        },
        message: `Appointment ${appointmentStatus} processed successfully`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Prospect booking webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});