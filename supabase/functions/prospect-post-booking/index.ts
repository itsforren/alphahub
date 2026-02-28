import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Webhook #2: Post-Booking Details
 * Fires after booking confirmation when user completes the "more accurate breakdown" form.
 * Sets stage to "Post Booking" but PRESERVES the existing qualified_path
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload = await req.json();
    console.log("[Post-Booking] Received payload:", JSON.stringify(payload, null, 2));

    const {
      prospect_id,
      visitor_id,
      ghl_contact_id,
      email,
      // Post-booking fields
      avg_monthly_issued_paid,
      has_downline,
      downline_count,
      // Optional updated calculator
      calculator_notes,
      // Attribution
      referral_code,
    } = payload;

    // Validate - need either prospect_id, email, or ghl_contact_id
    if (!prospect_id && !email && !ghl_contact_id) {
      return new Response(
        JSON.stringify({ error: "prospect_id, email, or ghl_contact_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find prospect
    let prospect = null;
    
    if (prospect_id) {
      const { data } = await supabase
        .from("prospects")
        .select("id, visitor_id, ghl_contact_id, referral_code, qualified_path, timezone")
        .eq("id", prospect_id)
        .maybeSingle();
      prospect = data;
    }

    if (!prospect && ghl_contact_id) {
      const { data } = await supabase
        .from("prospects")
        .select("id, visitor_id, ghl_contact_id, referral_code, qualified_path, timezone")
        .eq("ghl_contact_id", ghl_contact_id)
        .maybeSingle();
      prospect = data;
    }

    if (!prospect && email) {
      const normalizedEmail = email.toLowerCase().trim();
      const { data } = await supabase
        .from("prospects")
        .select("id, visitor_id, ghl_contact_id, referral_code, qualified_path, timezone")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      prospect = data;
    }

    if (!prospect) {
      console.error("[Post-Booking] Prospect not found");
      return new Response(
        JSON.stringify({ error: "Prospect not found", received: { prospect_id, email, ghl_contact_id } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build update data - DO NOT overwrite qualified_path
    const updateData: Record<string, unknown> = {
      post_booking_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Post-booking specific fields
    if (avg_monthly_issued_paid) {
      updateData.avg_monthly_issued_paid = avg_monthly_issued_paid;
    }
    if (typeof has_downline === "boolean") {
      updateData.has_downline = has_downline;
    }
    if (downline_count !== undefined && downline_count !== null) {
      updateData.downline_count = downline_count;
    }

    // Update calculator notes if provided
    if (calculator_notes) {
      updateData.calculator_notes = calculator_notes;
    }

    // Update visitor_id if better one provided
    if (visitor_id && !visitor_id.startsWith("ghl_") && 
        (!prospect.visitor_id || prospect.visitor_id.startsWith("ghl_"))) {
      updateData.visitor_id = visitor_id;
    }

    // Link ghl_contact_id if not already linked
    if (ghl_contact_id && !prospect.ghl_contact_id) {
      updateData.ghl_contact_id = ghl_contact_id;
    }

    // Update prospect
    const { error: updateError } = await supabase
      .from("prospects")
      .update(updateData)
      .eq("id", prospect.id);

    if (updateError) {
      console.error("[Post-Booking] Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update prospect" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log activity
    await supabase.from("prospect_activities").insert({
      prospect_id: prospect.id,
      activity_type: "post_booking_submitted",
      activity_data: {
        avg_monthly_issued_paid,
        has_downline,
        downline_count,
        stage: "Post Booking",
        visitor_id: visitor_id || prospect.visitor_id,
        ghl_contact_id: ghl_contact_id || prospect.ghl_contact_id,
      },
    });

    // Forward to unified GHL webhook if configured
    const ghlWebhookUrl = Deno.env.get("GHL_PROSPECT_WEBHOOK_URL");
    if (ghlWebhookUrl) {
      try {
        // Get full prospect data for the payload
        const { data: fullProspect } = await supabase
          .from("prospects")
          .select("*")
          .eq("id", prospect.id)
          .single();

        const ghlPayload = {
          // Identifiers for matching
          prospect_id: prospect.id,
          visitor_id: visitor_id || prospect.visitor_id,
          ghl_contact_id: ghl_contact_id || prospect.ghl_contact_id,
          
          // Stage tracking - SEPARATE FIELDS
          // Stage shows funnel progress, qualified_path preserves qualification status
          stage: "Post Booking",
          qualified_path: prospect.qualified_path, // PRESERVE existing qualification
          
          // Contact info (resend for updates)
          first_name: fullProspect?.name?.split(" ")[0] || "",
          last_name: fullProspect?.name?.split(" ").slice(1).join(" ") || "",
          full_name: fullProspect?.name,
          email: fullProspect?.email,
          phone: fullProspect?.phone,
          timezone: fullProspect?.timezone,
          
          // Post-booking details
          avg_monthly_issued_paid,
          has_downline,
          downline_count,
          
          // All previous qualification data
          licensed_status: fullProspect?.licensed_status,
          states_licensed: fullProspect?.additional_info ? JSON.parse(fullProspect.additional_info)?.states_licensed?.join(", ") : null,
          monthly_budget_range: fullProspect?.monthly_budget_range,
          payment_plan_interest: fullProspect?.payment_plan_interest,
          desired_timeline: fullProspect?.desired_timeline,
          current_bottleneck: fullProspect?.current_bottleneck,
          calculator_notes: fullProspect?.calculator_notes || calculator_notes,
          
          // Attribution
          referral_code: referral_code || prospect.referral_code,
          
          timestamp: new Date().toISOString(),
        };

        console.log("[Post-Booking] Forwarding to unified GHL webhook");
        const ghlResponse = await fetch(ghlWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ghlPayload),
        });
        console.log("[Post-Booking] GHL response status:", ghlResponse.status);
      } catch (ghlError) {
        console.error("[Post-Booking] GHL webhook error:", ghlError);
      }
    } else {
      console.log("[Post-Booking] No GHL_PROSPECT_WEBHOOK_URL configured");
    }

    console.log(`[Post-Booking] Updated prospect ${prospect.id} - stage: Post Booking, qualified_path preserved: ${prospect.qualified_path}`);

    return new Response(
      JSON.stringify({
        success: true,
        prospect_id: prospect.id,
        visitor_id: visitor_id || prospect.visitor_id,
        ghl_contact_id: ghl_contact_id || prospect.ghl_contact_id,
        stage: "Post Booking",
        qualified_path: prospect.qualified_path, // Return existing qualification
        message: "Post-booking details saved",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Post-Booking] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
