import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// GHL API base URL
const GHL_API_BASE = "https://services.leadconnectorhq.com";

// Hard-coded prospect location ID
const GHL_PROSPECT_LOCATION_ID = "wDoj91sbkfxZnMbow2G5";

interface FieldMapping {
  internal_field_name: string;
  ghl_field_id: string | null;
  ghl_field_key: string | null;
  is_enabled: boolean;
}

type MappingTarget = {
  ghl_field_id: string | null;
  ghl_field_key: string | null;
};

type CustomFieldBuildResult = {
  customFields: { id: string; value: string | null }[];
  skipped: { internal_field_name: string; reason: string }[];
};

// GHL Dropdown Value Mappings - transform form values to exact GHL dropdown options
const BOTTLENECK_MAP: Record<string, string> = {
  "Not enough leads (volume)": "Not enough leads",
  "Lead quality is low": "Lead quality is low",
  "Inconsistent lead flow": "Inconsistent flow",
  "Slow speed-to-lead / follow-up": "Slow speed-to-lead",
  "Low contact rate (they don't answer)": "Low contact rate",
  "Low appointment show rate": "Low show rate",
  "Closing/conversion is the bottleneck": "Low close rate",
  "CRM / tracking is messy": "CRM messy",
  "Other": "Other",
};

const TIMELINE_MAP: Record<string, string> = {
  "Immediately": "Immediately",
  "Within 7 days": "Within 7 days",
  "Within 30 days": "Within 30 days",
  "30–60 days": "30–60 days",
  "Later/unsure": "Later/unsure",
};

function mapBottleneck(value: string | null | undefined): string | null {
  if (!value) return null;
  return BOTTLENECK_MAP[value] || "Other";
}

function mapTimeline(value: string | null | undefined): string | null {
  if (!value) return null;
  return TIMELINE_MAP[value] || value;
}

async function getFieldMappingTargets(supabase: any): Promise<Record<string, MappingTarget>> {
  try {
    const { data: mappings, error } = await supabase
      .from("prospect_field_mappings")
      .select("internal_field_name, ghl_field_id, ghl_field_key, is_enabled")
      .eq("location_id", GHL_PROSPECT_LOCATION_ID)
      .eq("is_enabled", true);

    if (error) {
      console.error("[Field Mappings] Error fetching mappings:", error);
      return {};
    }

    const mappingMap: Record<string, MappingTarget> = {};
    for (const m of (mappings || []) as FieldMapping[]) {
      mappingMap[m.internal_field_name] = {
        ghl_field_id: m.ghl_field_id ?? null,
        ghl_field_key: m.ghl_field_key ?? null,
      };
    }

    console.log(`[Field Mappings] Loaded ${Object.keys(mappingMap).length} mapping targets`);
    return mappingMap;
  } catch (err) {
    console.error("[Field Mappings] Exception:", err);
    return {};
  }
}

function buildCustomFields(
  mappingTargets: Record<string, MappingTarget>,
  fieldValues: Record<string, string | null | undefined>
): CustomFieldBuildResult {
  const customFields: { id: string; value: string | null }[] = [];
  const skipped: { internal_field_name: string; reason: string }[] = [];

  for (const [internal_field_name, value] of Object.entries(fieldValues)) {
    const target = mappingTargets[internal_field_name];
    if (!target) {
      skipped.push({
        internal_field_name,
        reason: "No mapping found for internal_field_name",
      });
      continue;
    }

    if (!target.ghl_field_id) {
      skipped.push({
        internal_field_name,
        reason: "Mapped field is missing ghl_field_id (cannot send to GHL API)",
      });
      continue;
    }

    if (value === undefined) continue;

    customFields.push({
      id: target.ghl_field_id,
      value: value || null,
    });
  }

  return { customFields, skipped };
}

/**
 * Get location access token via crm-location-token
 */
async function getLocationToken(supabase: any): Promise<string | null> {
  try {
    const { data: tokenRecord } = await supabase
      .from("ghl_oauth_tokens")
      .select("company_id")
      .maybeSingle();

    if (!tokenRecord?.company_id) {
      console.error("[GHL API] No company_id found in oauth tokens");
      return null;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const response = await fetch(`${supabaseUrl}/functions/v1/crm-location-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        companyId: tokenRecord.company_id,
        locationId: GHL_PROSPECT_LOCATION_ID,
      }),
    });

    if (!response.ok) {
      console.error("[GHL API] Failed to get location token:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.locationAccessToken || null;
  } catch (error) {
    console.error("[GHL API] Error getting location token:", error);
    return null;
  }
}

/**
 * Update contact in GHL via API
 */
async function updateContact(
  contactId: string,
  accessToken: string,
  updateData: {
    customFields?: { id: string; value: string | null }[];
    tags?: string[];
  }
): Promise<boolean> {
  try {
    const updateUrl = `${GHL_API_BASE}/contacts/${contactId}`;

    const response = await fetch(updateUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify({ customFields: updateData.customFields || [] }),
    });

    if (!response.ok) {
      console.error("[GHL API] Update contact failed:", await response.text());
      return false;
    }

    // Add tags if specified
    if (updateData.tags && updateData.tags.length > 0) {
      await addTagsToContact(contactId, accessToken, updateData.tags);
    }

    return true;
  } catch (error) {
    console.error("[GHL API] Update contact error:", error);
    return false;
  }
}

/**
 * Add tags to contact in GHL
 */
async function addTagsToContact(contactId: string, accessToken: string, tags: string[]): Promise<boolean> {
  try {
    const tagUrl = `${GHL_API_BASE}/contacts/${contactId}/tags`;
    const response = await fetch(tagUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify({ tags }),
    });

    if (!response.ok) {
      console.error("[GHL API] Add tags failed:", await response.text());
      return false;
    }

    console.log("[GHL API] Tags added:", tags);
    return true;
  } catch (error) {
    console.error("[GHL API] Add tags error:", error);
    return false;
  }
}

/**
 * Webhook #1: Qualification Submit
 * Fires when user completes the qualification questions (qualified or disqualified).
 * NOW: Updates contact via GHL API directly instead of webhook
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
    console.log("[Qualification Submit] Received payload:", JSON.stringify(payload, null, 2));

    const {
      prospect_id,
      visitor_id,
      first_name,
      last_name,
      email,
      phone,
      licensed_status,
      states_licensed,
      monthly_budget_range,
      payment_plan_interest,
      payment_plan_credit_available,
      qualified_path,
      desired_timeline,
      current_bottleneck,
      calculator_notes,
      calculator_changed,
      calculator_inputs,
      referral_code,
      first_touch,
      last_touch,
      source_page,
      referrer_url,
      first_referrer_url,
      manual_source,
      manual_referrer_agent_name,
    } = payload;

    // Validate required fields
    const hasEmail = email && email.trim().length > 0;
    const hasProspectId = prospect_id && prospect_id.trim().length > 0;
    
    if (!hasEmail && !hasProspectId) {
      console.log("[Qualification Submit] Skipping - no email or prospect_id provided");
      return new Response(
        JSON.stringify({ 
          success: false, 
          skipped: true,
          message: "No identifier provided - contact info not yet captured",
          route_to: "/apply" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email?.toLowerCase().trim();

    // Find existing prospect
    let prospect: any = null;
    if (prospect_id) {
      const { data } = await supabase
        .from("prospects")
        .select("id, visitor_id, referral_code, qualified_path, additional_info, timezone, ghl_contact_id, ghl_location_id, partial_answers")
        .eq("id", prospect_id)
        .maybeSingle();
      prospect = data;
    }

    if (!prospect && normalizedEmail) {
      const { data } = await supabase
        .from("prospects")
        .select("id, visitor_id, referral_code, qualified_path, additional_info, timezone, ghl_contact_id, ghl_location_id, partial_answers")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      prospect = data;
    }

    // If no prospect exists, create one
    if (!prospect) {
      const fullName = [first_name, last_name].filter(Boolean).join(" ").trim() || 
                       normalizedEmail?.split("@")[0] || "Unknown";

      const newProspectId = crypto.randomUUID();
      const { error: insertError } = await supabase
        .from("prospects")
        .insert({
          id: newProspectId,
          email: normalizedEmail,
          name: fullName,
          phone: phone || null,
          visitor_id: visitor_id || `web_${Date.now()}`,
          referral_code: referral_code || null,
          source_page: source_page || "/",
          status: "applied",
          contact_capture_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
          ghl_location_id: GHL_PROSPECT_LOCATION_ID,
        });

      if (insertError) {
        console.error("[Qualification Submit] Create prospect error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create prospect" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      prospect = { id: newProspectId, visitor_id, referral_code: referral_code || null };
    }

    // Determine the correct qualified_path based on inputs
    let finalQualifiedPath = qualified_path;
    if (!finalQualifiedPath) {
      if (licensed_status === "Not licensed" || licensed_status === "Unknown") {
        finalQualifiedPath = "Disqualified (license)";
      } else if (monthly_budget_range === "<$1,499") {
        finalQualifiedPath = "Disqualified (budget)";
      } else if (monthly_budget_range === "$1,500–$2,399") {
        if (payment_plan_interest === "No" || payment_plan_interest === "Not Sure") {
          finalQualifiedPath = "Disqualified (budget)";
        } else {
          finalQualifiedPath = "Qualified (payment plan)";
        }
      } else {
        finalQualifiedPath = "Qualified (standard)";
      }
    }

    const isQualified = finalQualifiedPath.startsWith("Qualified");
    const prospectStatus = isQualified ? "applied" : "disqualified";
    
    // Build update data
    const updateData: Record<string, unknown> = {
      licensed_status,
      monthly_budget_range,
      desired_timeline,
      current_bottleneck,
      qualified_path: finalQualifiedPath,
      qualification_submit_at: new Date().toISOString(),
      form_completed_at: new Date().toISOString(),
      status: prospectStatus,
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      manual_source: manual_source || null,
      manual_referrer_agent_name: manual_referrer_agent_name || null,
      referrer_url: referrer_url || null,
      first_referrer_url: first_referrer_url || null,
    };

    // Merge states with existing partial answers
    const existingPartialAnswers = prospect.partial_answers || {};
    if (states_licensed && Array.isArray(states_licensed) && states_licensed.length > 0) {
      updateData.additional_info = JSON.stringify({
        ...(prospect.additional_info ? JSON.parse(prospect.additional_info as string) : {}),
        states_licensed,
        calculator_inputs: calculator_changed ? calculator_inputs : undefined,
      });
    }

    if (payment_plan_interest) {
      updateData.payment_plan_interest = payment_plan_interest;
    }
    if (payment_plan_credit_available) {
      updateData.payment_plan_credit_available = payment_plan_credit_available;
    }
    if (calculator_notes) {
      updateData.calculator_notes = calculator_notes;
    }
    if (visitor_id && !visitor_id.startsWith("ghl_")) {
      updateData.visitor_id = visitor_id;
    }

    if (isQualified) {
      updateData.next_action_type = "call_to_qualify";
      updateData.next_action_due_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    } else {
      updateData.next_action_type = "nurture_email";
      updateData.next_action_due_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      updateData.disqual_reason = finalQualifiedPath.includes("license") ? "Not licensed" : "Budget below minimum";
    }

    if (referral_code && !prospect.referral_code) {
      updateData.referral_code = referral_code;
    }

    // Update prospect in Supabase
    const { error: updateError } = await supabase
      .from("prospects")
      .update(updateData)
      .eq("id", prospect.id);

    if (updateError) {
      console.error("[Qualification Submit] Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update prospect" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log activity
    await supabase.from("prospect_activities").insert({
      prospect_id: prospect.id,
      activity_type: isQualified ? "qualified" : "disqualified",
      activity_data: {
        qualified_path: finalQualifiedPath,
        licensed_status,
        monthly_budget_range,
        desired_timeline,
        current_bottleneck,
        payment_plan_interest,
        payment_plan_credit_available,
        states_licensed,
        stage: "Qualification Submit",
        visitor_id: visitor_id || prospect.visitor_id,
      },
    });

    // === GHL API Integration ===
    // Update contact via API instead of webhook
    let ghlUpdated = false;
    let ghl_sync_error: string | null = null;
    let ghl_skipped_custom_fields: { internal_field_name: string; reason: string }[] = [];
    
    if (prospect.ghl_contact_id) {
      const accessToken = await getLocationToken(supabase);
      
      if (accessToken) {
        // Build survey answer fields only (no stage, qualified_path, or meetsMinimumBudget)
        const mappingTargets = await getFieldMappingTargets(supabase);

        const fieldValues: Record<string, string | null | undefined> = {
          licensed_status: licensed_status || null,
          // Multi-select: send as comma-separated string
          states_licensed: Array.isArray(states_licensed) ? states_licensed.join(", ") : (states_licensed as any) || null,
          monthly_budget_range: monthly_budget_range || null,
          payment_plan_interest: payment_plan_interest || null,
          credit_available: payment_plan_credit_available || null,
          // Apply GHL dropdown value mapping
          desired_timeline: mapTimeline(desired_timeline),
          current_bottleneck: mapBottleneck(current_bottleneck),
          calculator_notes: calculator_notes || null,
          referrer_url: referrer_url || null,
          first_referrer_url: first_referrer_url || null,
          manual_source: manual_source || null,
          manual_referrer_agent_name: manual_referrer_agent_name || null,
          prospect_id: prospect.id,
          visitor_id: (visitor_id || prospect.visitor_id) ?? null,
          referral_code: (referral_code || prospect.referral_code) ?? null,
        };

        const { customFields, skipped } = buildCustomFields(mappingTargets, fieldValues);
        ghl_skipped_custom_fields = skipped;

        if (skipped.length > 0) {
          console.warn("[Qualification Submit] Skipped custom fields due to mapping issues:", skipped);
        }

        console.log(
          `[Qualification Submit] Updating GHL contact ${prospect.ghl_contact_id} via API with ${customFields.length} customFields + form-complete tag`
        );

        ghlUpdated = await updateContact(prospect.ghl_contact_id, accessToken, {
          customFields,
          tags: ["form-complete"],
        });

        if (ghlUpdated) {
          console.log("[Qualification Submit] GHL contact updated successfully");
        } else {
          ghl_sync_error = "Failed to update contact customFields in GHL (see function logs for GHL response)";
        }
      } else {
        console.warn("[Qualification Submit] Could not get GHL access token");
        ghl_sync_error = "Could not get GHL access token";
      }
    } else {
      console.log("[Qualification Submit] No GHL contact ID - skipping API update");
      ghl_sync_error = "No GHL contact ID found on prospect";
    }

    // Determine routing instruction
    let routeTo = "/book-call";
    if (finalQualifiedPath === "Disqualified (license)") {
      routeTo = "/not-qualified-license";
    } else if (finalQualifiedPath === "Disqualified (budget)") {
      routeTo = "/not-qualified-budget";
    }

    return new Response(
      JSON.stringify({
        success: true,
        prospect_id: prospect.id,
        visitor_id: visitor_id || prospect.visitor_id,
        ghl_updated: ghlUpdated,
        ghl_sync_success: ghlUpdated,
        ghl_sync_error,
        ghl_skipped_custom_fields,
        stage: "Qualification Submit",
        qualified_path: finalQualifiedPath,
        is_qualified: isQualified,
        route_to: routeTo,
        message: `Prospect ${isQualified ? "qualified" : "disqualified"}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Qualification Submit] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
