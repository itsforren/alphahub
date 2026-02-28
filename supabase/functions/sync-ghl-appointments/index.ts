import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncResult {
  synced: number;
  updated: number;
  skipped: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Starting GHL appointments sync...");

    // Get sales_subaccount_id from settings
    const { data: setting, error: settingError } = await supabase
      .from("onboarding_settings")
      .select("setting_value")
      .eq("setting_key", "sales_subaccount_id")
      .single();

    if (settingError || !setting) {
      console.error("Sales subaccount ID not configured:", settingError);
      return new Response(
        JSON.stringify({ error: "Sales subaccount not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const locationId = setting.setting_value;
    console.log(`Using location ID: ${locationId}`);

    // Get company_id from oauth tokens
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("ghl_oauth_tokens")
      .select("company_id")
      .maybeSingle();

    if (tokenError || !tokenRecord?.company_id) {
      console.error("No GHL OAuth configured:", tokenError);
      return new Response(
        JSON.stringify({ error: "GHL OAuth not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const companyId = tokenRecord.company_id;

    // Get location access token
    const locationTokenResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/crm-location-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ companyId, locationId }),
      }
    );

    if (!locationTokenResponse.ok) {
      const errorText = await locationTokenResponse.text();
      console.error("Failed to get location token:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get GHL access token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { locationAccessToken } = await locationTokenResponse.json();

    // Fetch appointments from last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14); // Also get upcoming 2 weeks

    const appointmentsUrl = `https://services.leadconnectorhq.com/calendars/events?locationId=${locationId}&startTime=${startDate.toISOString()}&endTime=${endDate.toISOString()}`;
    
    console.log(`Fetching appointments from: ${appointmentsUrl}`);

    const appointmentsResponse = await fetch(appointmentsUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${locationAccessToken}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
    });

    if (!appointmentsResponse.ok) {
      const errorText = await appointmentsResponse.text();
      console.error("Failed to fetch appointments:", errorText);
      
      await supabase.from("ghl_api_logs").insert({
        request_type: "appointments_sync",
        location_id: locationId,
        status: "error",
        error_message: errorText,
      });

      return new Response(
        JSON.stringify({ error: "Failed to fetch appointments from GHL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appointmentsData = await appointmentsResponse.json();
    let appointments = appointmentsData.events || appointmentsData.appointments || [];
    
    console.log(`Found ${appointments.length} total appointments`);

    // Filter by sales calendar IDs if configured
    const { data: calendarSetting } = await supabase
      .from("onboarding_settings")
      .select("setting_value")
      .eq("setting_key", "sales_calendar_ids")
      .maybeSingle();

    let allowedCalendarIds: string[] | null = null;
    if (calendarSetting?.setting_value) {
      try {
        const parsed = JSON.parse(calendarSetting.setting_value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          allowedCalendarIds = parsed;
          console.log(`Filtering to sales calendars: ${allowedCalendarIds.join(', ')}`);
        }
      } catch (e) {
        console.error("Failed to parse sales_calendar_ids:", e);
      }
    }

    // Filter appointments to only sales calendars if configured
    if (allowedCalendarIds && allowedCalendarIds.length > 0) {
      appointments = appointments.filter((a: any) => 
        allowedCalendarIds!.includes(a.calendarId)
      );
      console.log(`Filtered to ${appointments.length} sales appointments`);
    }

    // Get all pipeline stages for mapping
    const { data: stages } = await supabase
      .from("sales_pipeline_stages")
      .select("id, stage_key");

    const stageMap: Record<string, string> = {};
    stages?.forEach((s) => {
      stageMap[s.stage_key] = s.id;
    });

    const result: SyncResult = {
      synced: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Process each appointment
    for (const appointment of appointments) {
      try {
        const contactEmail = appointment.contact?.email?.toLowerCase()?.trim() || 
                            appointment.email?.toLowerCase()?.trim();
        const ghlAppointmentId = appointment.id;
        const ghlContactId = appointment.contact?.id || appointment.contactId;
        const appointmentStatus = (appointment.appointmentStatus || appointment.status || "confirmed").toLowerCase();
        const startTime = appointment.startTime;
        const endTime = appointment.endTime;
        const calendarId = appointment.calendarId;

        if (!contactEmail) {
          console.log(`Skipping appointment ${ghlAppointmentId} - no email`);
          result.skipped++;
          continue;
        }

        // Find prospect by email or ghl_contact_id
        let prospect = null;
        
        if (ghlContactId) {
          const { data } = await supabase
            .from("prospects")
            .select("id, pipeline_stage_id, appointment_status, ghl_appointment_id, appt_count_no_shows, appt_count_reschedules")
            .eq("ghl_contact_id", ghlContactId)
            .maybeSingle();
          prospect = data;
        }

        if (!prospect) {
          const { data } = await supabase
            .from("prospects")
            .select("id, pipeline_stage_id, appointment_status, ghl_appointment_id, appt_count_no_shows, appt_count_reschedules")
            .eq("email", contactEmail)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          prospect = data;
        }

        if (!prospect) {
          console.log(`No prospect found for email: ${contactEmail}`);
          result.skipped++;
          continue;
        }

        // Map GHL status to our appointment_status and pipeline stage
        let newStatus: string;
        let newStageKey: string | null = null;
        let nextActionType: string | null = null;
        let nextActionDueAt: string | null = null;
        let incrementNoShows = false;
        let incrementReschedules = false;

        switch (appointmentStatus) {
          case "confirmed":
          case "booked": {
            newStatus = "confirmed";
            newStageKey = "call_scheduled";

            // All leads still need the qualification call.
            nextActionType = "call_to_qualify";
            nextActionDueAt = startTime
              ? new Date(startTime).toISOString()
              : new Date(Date.now() + 5 * 60 * 1000).toISOString();
            break;
          }
          case "cancelled":
          case "canceled":
            newStatus = "cancelled";
            newStageKey = "call_scheduled"; // Stay here for recovery
            nextActionType = "reschedule_call";
            nextActionDueAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
            break;
          case "noshow":
          case "no_show":
          case "no-show":
            newStatus = "no_show";
            newStageKey = "call_scheduled"; // Stay here for recovery
            nextActionType = "call_now";
            nextActionDueAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
            incrementNoShows = true;
            break;
          case "showed":
          case "completed":
            newStatus = "completed";
            newStageKey = "call_completed";
            // No automatic next action - needs disposition
            break;
          case "rescheduled":
            newStatus = "rescheduled";
            newStageKey = "call_scheduled";
            nextActionType = "call_to_qualify";
            nextActionDueAt = startTime
              ? new Date(startTime).toISOString()
              : new Date(Date.now() + 5 * 60 * 1000).toISOString();
            incrementReschedules = true;
            break;
          default:
            newStatus = appointmentStatus;
        }

        // Build update data
        const updateData: Record<string, unknown> = {
          appointment_status: newStatus,
          ghl_appointment_id: ghlAppointmentId,
          updated_at: new Date().toISOString(),
        };

        // Update ghl_contact_id if we have it and prospect doesn't
        if (ghlContactId) {
          updateData.ghl_contact_id = ghlContactId;
        }

        // Update pipeline stage if applicable
        if (newStageKey && stageMap[newStageKey]) {
          updateData.pipeline_stage_id = stageMap[newStageKey];
        }

        // Update appointment times
        if (startTime) {
          updateData.appt_start_at = startTime;
          updateData.calendar_booked_at = startTime;
        }
        if (endTime) {
          updateData.appt_end_at = endTime;
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

        // Only update if something changed
        const hasChanges = 
          prospect.appointment_status !== newStatus ||
          prospect.ghl_appointment_id !== ghlAppointmentId ||
          (newStageKey && stageMap[newStageKey] && prospect.pipeline_stage_id !== stageMap[newStageKey]);

        if (hasChanges) {
          await supabase
            .from("prospects")
            .update(updateData)
            .eq("id", prospect.id);

          console.log(`Updated prospect ${prospect.id} - status: ${newStatus}, stage: ${newStageKey || "unchanged"}, next_action: ${nextActionType || "none"}`);
          result.updated++;
        } else {
          result.skipped++;
        }

        result.synced++;

      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`Error processing appointment:`, err);
        result.errors.push(msg);
      }
    }

    // Log the sync
    await supabase.from("ghl_api_logs").insert({
      request_type: "appointments_sync",
      location_id: locationId,
      status: "success",
      response_data: result,
    });

    console.log(`Sync complete:`, result);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        message: `Synced ${result.synced} appointments, updated ${result.updated} prospects`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Sync GHL appointments error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
