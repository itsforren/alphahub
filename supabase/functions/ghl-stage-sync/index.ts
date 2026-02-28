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
    console.log("GHL Stage Sync request:", JSON.stringify(payload, null, 2));

    const { prospect_id, new_stage_id, old_stage_id, ghl_contact_id } = payload;

    if (!prospect_id) {
      return new Response(
        JSON.stringify({ error: "prospect_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get prospect details if not provided
    let contactId = ghl_contact_id;
    if (!contactId) {
      const { data: prospect } = await supabase
        .from("prospects")
        .select("ghl_contact_id, email")
        .eq("id", prospect_id)
        .single();
      
      contactId = prospect?.ghl_contact_id;
      
      if (!contactId) {
        console.log("No GHL contact ID for prospect, skipping sync");
        return new Response(
          JSON.stringify({ message: "No GHL contact ID, sync skipped" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get stage details
    const { data: newStage } = await supabase
      .from("sales_pipeline_stages")
      .select("stage_name, stage_key, ghl_tag")
      .eq("id", new_stage_id)
      .single();

    let oldStage = null;
    if (old_stage_id) {
      const { data } = await supabase
        .from("sales_pipeline_stages")
        .select("stage_name, stage_key, ghl_tag")
        .eq("id", old_stage_id)
        .single();
      oldStage = data;
    }

    // Get GHL OAuth token
    const { data: tokenData, error: tokenError } = await supabase
      .from("ghl_oauth_tokens")
      .select("access_token, expires_at, refresh_token, company_id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenData) {
      console.log("No GHL OAuth token found, cannot sync tags");
      
      // Log the activity anyway
      await supabase.from("prospect_activities").insert({
        prospect_id,
        activity_type: "stage_change",
        activity_data: {
          old_stage: oldStage?.stage_name,
          new_stage: newStage?.stage_name,
          ghl_sync_status: "skipped_no_token",
        },
      });

      return new Response(
        JSON.stringify({ 
          message: "Stage change logged but GHL sync skipped - no OAuth token",
          new_stage: newStage?.stage_name 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token needs refresh
    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.expires_at);
    
    if (expiresAt < new Date()) {
      console.log("Token expired, attempting refresh...");
      // Token refresh logic would go here - for now, log and continue
      // This would call the GHL OAuth refresh endpoint
    }

    const tagsToAdd: string[] = [];
    const tagsToRemove: string[] = [];

    // Add new stage tag
    if (newStage?.ghl_tag) {
      tagsToAdd.push(newStage.ghl_tag);
    }

    // Remove old stage tag
    if (oldStage?.ghl_tag && oldStage.ghl_tag !== newStage?.ghl_tag) {
      tagsToRemove.push(oldStage.ghl_tag);
    }

    let ghlSyncStatus = "success";
    let ghlSyncError = null;

    // Update GHL contact with tags
    // Note: GHL API requires location access token, not company token
    // This is a simplified version - in production, you'd need to:
    // 1. Get the location ID for this contact
    // 2. Get a location access token
    // 3. Make the API call

    try {
      // For now, we'll prepare the webhook payload for GHL workflow trigger
      // This is more reliable than direct API calls and works with GHL's workflow system
      
      const ghlWebhookUrl = Deno.env.get("GHL_STAGE_WEBHOOK_URL");
      
      if (ghlWebhookUrl) {
        const webhookPayload = {
          contact_id: contactId,
          new_stage: newStage?.stage_key,
          new_stage_name: newStage?.stage_name,
          old_stage: oldStage?.stage_key,
          tags_to_add: tagsToAdd,
          tags_to_remove: tagsToRemove,
          timestamp: new Date().toISOString(),
        };

        const webhookResponse = await fetch(ghlWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        });

        if (!webhookResponse.ok) {
          ghlSyncStatus = "webhook_failed";
          ghlSyncError = `Webhook returned ${webhookResponse.status}`;
          console.error("GHL webhook failed:", ghlSyncError);
        } else {
          console.log("GHL webhook triggered successfully");
        }
      } else {
        ghlSyncStatus = "no_webhook_configured";
        console.log("No GHL_STAGE_WEBHOOK_URL configured");
      }
    } catch (err) {
      ghlSyncStatus = "error";
      ghlSyncError = err instanceof Error ? err.message : "Unknown error";
      console.error("Error calling GHL:", err);
    }

    // Log the stage change activity
    await supabase.from("prospect_activities").insert({
      prospect_id,
      activity_type: "stage_change",
      activity_data: {
        old_stage: oldStage?.stage_name,
        new_stage: newStage?.stage_name,
        old_stage_key: oldStage?.stage_key,
        new_stage_key: newStage?.stage_key,
        ghl_sync_status: ghlSyncStatus,
        ghl_sync_error: ghlSyncError,
        tags_added: tagsToAdd,
        tags_removed: tagsToRemove,
      },
    });

    // Log to GHL API logs for visibility
    await supabase.from("ghl_api_logs").insert({
      request_type: "stage_sync",
      status: ghlSyncStatus,
      error_message: ghlSyncError,
      response_data: {
        prospect_id,
        new_stage: newStage?.stage_name,
        ghl_contact_id: contactId,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: ghlSyncStatus === "success" || ghlSyncStatus === "no_webhook_configured",
        ghl_sync_status: ghlSyncStatus,
        new_stage: newStage?.stage_name,
        message: ghlSyncStatus === "success" 
          ? "Stage synced to GHL" 
          : `Stage change logged, GHL sync: ${ghlSyncStatus}`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("GHL stage sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
