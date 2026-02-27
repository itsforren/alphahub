import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function pickFirstString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Validate API key
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing API key", code: "AUTH_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: keyData, error: keyError } = await supabase
      .from("webhook_api_keys")
      .select("id, name, is_active, request_count")
      .eq("api_key", apiKey)
      .single();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: "Invalid API key", code: "AUTH_INVALID" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!keyData.is_active) {
      return new Response(
        JSON.stringify({ error: "API key is inactive", code: "AUTH_INACTIVE" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("webhook_api_keys")
      .update({
        last_used_at: new Date().toISOString(),
        request_count: (keyData.request_count || 0) + 1,
      })
      .eq("id", keyData.id);

    const payload = await req.json().catch(() => ({}));
    const customData = payload.customData || payload.custom_data || {};

    // Prefer explicit contact id
    const ghlContactId = pickFirstString(
      customData.ghl_contact_id,
      customData.contact_id,
      customData.contactId,
      payload.ghl_contact_id,
      payload.contact_id,
      payload.contactId,
      payload.contact?.id,
      payload.contact?.ID
    );

    const email = pickFirstString(
      customData.email,
      customData.Email,
      payload.email,
      payload.Email,
      payload.contact?.email
    );

    if (!ghlContactId && !email) {
      return new Response(
        JSON.stringify({ error: "Missing identifier (ghl_contact_id or email)", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find prospect
    let prospect: any = null;
    if (ghlContactId) {
      const { data } = await supabase
        .from("prospects")
        .select("id, status, qualified_path, qualification_submit_at, form_completed_at")
        .eq("ghl_contact_id", ghlContactId)
        .order("created_at", { ascending: false })
        .maybeSingle();
      prospect = data;
    }

    if (!prospect && email) {
      const { data } = await supabase
        .from("prospects")
        .select("id, status, qualified_path, qualification_submit_at, form_completed_at")
        .ilike("email", email)
        .order("created_at", { ascending: false })
        .maybeSingle();
      prospect = data;
    }

    if (!prospect) {
      // Backend-only alert
      await supabase.from("system_alerts").insert({
        alert_type: "ghl_abandoned_webhook_no_match",
        severity: "warning",
        title: "Abandoned webhook could not match a prospect",
        message: "Received abandoned webhook from GHL but could not match to a prospect row.",
        metadata: { ghl_contact_id: ghlContactId, email, payload },
      });

      return new Response(
        JSON.stringify({ success: false, code: "NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Safety: don't override completed submissions
    if (prospect.qualification_submit_at || prospect.form_completed_at) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Prospect already advanced; skipped abandoned update",
          prospect_id: prospect.id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("prospects")
      .update({
        status: "abandoned",
        qualified_path: "Abandoned",
        updated_at: now,
      })
      .eq("id", prospect.id)
      .is("qualification_submit_at", null)
      .is("form_completed_at", null)
      .select("id")
      .maybeSingle();

    if (updateError || !updated) {
      await supabase.from("system_alerts").insert({
        alert_type: "ghl_abandoned_webhook_db_error",
        severity: "critical",
        title: "Abandoned webhook failed to update prospect",
        message: "Database update failed while marking prospect as abandoned.",
        metadata: { prospect_id: prospect.id, error: updateError?.message || "unknown", payload },
      });

      return new Response(
        JSON.stringify({ error: "Failed to mark abandoned", code: "DB_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log activity
    await supabase.from("prospect_activities").insert({
      prospect_id: prospect.id,
      activity_type: "abandoned_marked_by_ghl",
      activity_data: {
        processed_at: now,
        ghl_contact_id: ghlContactId,
        email,
      },
    });

    return new Response(
      JSON.stringify({ success: true, prospect_id: prospect.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
