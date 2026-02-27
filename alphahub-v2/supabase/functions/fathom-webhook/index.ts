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

    const payload = await req.json();
    console.log("Received Fathom webhook:", JSON.stringify(payload, null, 2));

    // Fathom webhook payload structure - extract participant email
    // Fathom sends participant emails in various formats depending on integration
    const participantEmails = payload.participant_emails || 
      payload.participants?.map((p: { email?: string }) => p.email).filter(Boolean) ||
      (payload.attendee_email ? [payload.attendee_email] : []) ||
      (payload.email ? [payload.email] : []);

    const callId = payload.call_id || payload.id || payload.fathom_call_id;
    const summary = payload.summary || payload.call_summary || payload.ai_summary;
    const actionItems = payload.action_items || payload.tasks || [];
    const keyTopics = payload.key_topics || payload.topics || [];
    const sentiment = payload.sentiment || payload.overall_sentiment;
    const recordingUrl = payload.recording_url || payload.video_url || payload.recording_link;
    const duration = payload.duration_seconds || payload.duration || payload.call_duration;
    const callDate = payload.call_date || payload.started_at || payload.date || new Date().toISOString();

    if (!summary && !callId) {
      console.log("No summary or call ID in payload");
      return new Response(
        JSON.stringify({ message: "No actionable data in webhook" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate by fathom_call_id
    if (callId) {
      const { data: existing } = await supabase
        .from("call_logs")
        .select("id")
        .eq("fathom_call_id", callId)
        .single();

      if (existing) {
        console.log(`Duplicate call log for fathom_call_id: ${callId}`);
        return new Response(
          JSON.stringify({ message: "Call already logged", call_log_id: existing.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Find prospect by any participant email
    let prospect: { id: string; pipeline_stage_id: string | null; call_count: number } | null = null;
    for (const email of participantEmails) {
      const normalizedEmail = email.toLowerCase().trim();
      const { data } = await supabase
        .from("prospects")
        .select("id, pipeline_stage_id, call_count")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        prospect = {
          id: data.id,
          pipeline_stage_id: data.pipeline_stage_id,
          call_count: data.call_count ?? 0,
        };
        console.log(`Found prospect ${data.id} for email ${normalizedEmail}`);
        break;
      }
    }

    if (!prospect) {
      console.log("No prospect found for any participant emails:", participantEmails);
      return new Response(
        JSON.stringify({ 
          message: "No matching prospect found",
          searched_emails: participantEmails
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert call log
    const { data: callLog, error: insertError } = await supabase
      .from("call_logs")
      .insert({
        prospect_id: prospect.id,
        call_date: callDate,
        duration_seconds: duration,
        summary: summary,
        action_items: Array.isArray(actionItems) ? actionItems : [],
        key_topics: Array.isArray(keyTopics) ? keyTopics : [],
        sentiment: sentiment && ["positive", "neutral", "negative"].includes(sentiment.toLowerCase()) 
          ? sentiment.toLowerCase() 
          : null,
        recording_url: recordingUrl,
        fathom_call_id: callId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting call log:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to insert call log" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment call_count and update last_contacted_at
    await supabase
      .from("prospects")
      .update({ 
        last_contacted_at: callDate,
        call_count: prospect.call_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq("id", prospect.id);

    // Get "call_completed" stage and update if still on call_scheduled
    const { data: callCompletedStage } = await supabase
      .from("sales_pipeline_stages")
      .select("id")
      .eq("stage_key", "call_completed")
      .single();

    const { data: callScheduledStage } = await supabase
      .from("sales_pipeline_stages")
      .select("id")
      .eq("stage_key", "call_scheduled")
      .single();

    // Auto-advance from call_scheduled to call_completed
    if (callCompletedStage && callScheduledStage && 
        prospect.pipeline_stage_id === callScheduledStage.id) {
      await supabase
        .from("prospects")
        .update({ pipeline_stage_id: callCompletedStage.id })
        .eq("id", prospect.id);
    }

    // Log activity
    await supabase.from("prospect_activities").insert({
      prospect_id: prospect.id,
      activity_type: "call_logged",
      activity_data: {
        call_log_id: callLog.id,
        duration_seconds: duration,
        sentiment: sentiment,
        has_summary: !!summary,
        source: "fathom_webhook",
      },
    });

    console.log(`Successfully logged call for prospect ${prospect.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        call_log_id: callLog.id,
        prospect_id: prospect.id,
        message: "Call summary recorded successfully"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Fathom webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
