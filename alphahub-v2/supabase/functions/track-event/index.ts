import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackingPayload {
  visitor_id: string;
  session_id: string;
  event_type: "page_view" | "form_start" | "form_submit" | "button_click" | "email_click" | "scroll" | "session_start";
  page_url?: string;
  element_id?: string;
  element_text?: string;
  event_data?: Record<string, any>;
  
  // Session data (only sent with session_start)
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  referrer_url?: string;
  referral_code?: string;
  landing_page?: string;
  device_type?: string;
  user_agent?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: TrackingPayload = await req.json();
    
    console.log("Tracking event received:", {
      visitor_id: payload.visitor_id,
      session_id: payload.session_id,
      event_type: payload.event_type,
    });

    // Validate required fields
    if (!payload.visitor_id || !payload.session_id || !payload.event_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: visitor_id, session_id, event_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If this is a session_start event, create or update the session
    if (payload.event_type === "session_start") {
      // Check if session exists
      const { data: existingSession } = await supabase
        .from("visitor_sessions")
        .select("id")
        .eq("session_id", payload.session_id)
        .single();

      if (existingSession) {
        // Update last_seen
        await supabase
          .from("visitor_sessions")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("session_id", payload.session_id);
      } else {
        // Create new session
        const sessionData = {
          visitor_id: payload.visitor_id,
          session_id: payload.session_id,
          utm_source: payload.utm_source || null,
          utm_medium: payload.utm_medium || null,
          utm_campaign: payload.utm_campaign || null,
          utm_content: payload.utm_content || null,
          utm_term: payload.utm_term || null,
          gclid: payload.gclid || null,
          fbclid: payload.fbclid || null,
          referrer_url: payload.referrer_url || null,
          referral_code: payload.referral_code || null,
          landing_page: payload.landing_page || null,
          device_type: payload.device_type || null,
          user_agent: payload.user_agent || null,
        };

        const { error: sessionError } = await supabase
          .from("visitor_sessions")
          .insert(sessionData);

        if (sessionError) {
          console.error("Error creating session:", sessionError);
          // Continue anyway - session might already exist from a race condition
        }
      }
    }

    // Record the event
    const eventData = {
      visitor_id: payload.visitor_id,
      session_id: payload.session_id,
      event_type: payload.event_type,
      page_url: payload.page_url || null,
      element_id: payload.element_id || null,
      element_text: payload.element_text || null,
      event_data: payload.event_data || {},
    };

    const { error: eventError } = await supabase
      .from("visitor_events")
      .insert(eventData);

    if (eventError) {
      console.error("Error recording event:", eventError);
      return new Response(
        JSON.stringify({ error: "Failed to record event" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update session last_seen
    await supabase
      .from("visitor_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("session_id", payload.session_id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Track event error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
