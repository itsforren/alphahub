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

/**
 * Fetch field mappings from database
 */
async function getFieldMappings(supabase: any): Promise<Record<string, string>> {
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

    const mappingMap: Record<string, string> = {};
    for (const m of (mappings || []) as FieldMapping[]) {
      if (m.ghl_field_key) {
        mappingMap[m.internal_field_name] = m.ghl_field_key;
      }
    }

    console.log(`[Field Mappings] Loaded ${Object.keys(mappingMap).length} mappings`);
    return mappingMap;
  } catch (err) {
    console.error("[Field Mappings] Exception:", err);
    return {};
  }
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

/**
 * Build custom field object using dynamic mappings
 */
function buildCustomFields(
  mappingTargets: Record<string, MappingTarget>,
  fieldValues: Record<string, string | null | undefined>
): CustomFieldBuildResult {
  const customFields: { id: string; value: string | null }[] = [];
  const skipped: { internal_field_name: string; reason: string }[] = [];

  for (const [internal_field_name, value] of Object.entries(fieldValues)) {
    // Only send fields explicitly present in mapping table.
    const target = mappingTargets[internal_field_name];
    if (!target) continue;

    if (!target.ghl_field_id) {
      skipped.push({
        internal_field_name,
        reason: "Mapped field is missing ghl_field_id (cannot send to GHL API)",
      });
      continue;
    }

    // Omit undefined entirely, but allow explicit null.
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
    // Get company ID from oauth tokens
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
      const errorText = await response.text();
      console.error("[GHL API] Failed to get location token:", errorText);
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
 * Search for existing contact by email in GHL using GET endpoint
 */
async function searchContactByEmail(email: string, accessToken: string): Promise<string | null> {
  try {
    // Use GET endpoint with query parameter instead of POST
    const searchUrl = `${GHL_API_BASE}/contacts/?locationId=${GHL_PROSPECT_LOCATION_ID}&query=${encodeURIComponent(email)}&limit=1`;
    console.log(`[GHL API] Searching for contact: ${searchUrl}`);
    
    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Version": "2021-07-28",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[GHL API] Search failed:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    if (data.contacts && data.contacts.length > 0) {
      console.log(`[GHL API] Found existing contact: ${data.contacts[0].id}`);
      return data.contacts[0].id;
    }
    console.log("[GHL API] No existing contact found");
    return null;
  } catch (error) {
    console.error("[GHL API] Search error:", error);
    return null;
  }
}

/**
 * Create contact in GHL
 */
async function createContact(
  accessToken: string,
  contactData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    timezone?: string;
    tags?: string[];
  }
): Promise<string | null> {
  try {
    const createUrl = `${GHL_API_BASE}/contacts/`;
    
    const payload = {
      locationId: GHL_PROSPECT_LOCATION_ID,
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      email: contactData.email,
      phone: contactData.phone,
      timezone: contactData.timezone,
      tags: contactData.tags || [],
    };

    console.log("[GHL API] Creating contact with payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error("[GHL API] Create contact failed:", response.status, responseText);
      return null;
    }

    const data = JSON.parse(responseText);
    console.log("[GHL API] Contact created successfully:", data.contact?.id);
    return data.contact?.id || null;
  } catch (error) {
    console.error("[GHL API] Create contact error:", error);
    return null;
  }
}

type UpdateContactResult = {
  success: boolean;
  contactNotFound?: boolean;
  error?: string;
};

/**
 * Update contact in GHL
 * Returns structured result to detect stale contact IDs
 */
async function updateContact(
  contactId: string,
  accessToken: string,
  updateData: {
    customFields?: { id: string; value: string | null }[];
    tags?: string[];
  }
): Promise<UpdateContactResult> {
  try {
    const updateUrl = `${GHL_API_BASE}/contacts/${contactId}`;
    
    const payload = {
      customFields: updateData.customFields || [],
    };

    console.log("[GHL API] Updating contact with payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(updateUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[GHL API] Update contact failed:", response.status, errorText);
      
      // Detect stale contact ID (contact was deleted from GHL)
      const isContactNotFound = response.status === 400 && 
        errorText.toLowerCase().includes("contact not found");
      
      return {
        success: false,
        contactNotFound: isContactNotFound,
        error: errorText,
      };
    }

    console.log("[GHL API] Contact updated successfully");

    // Add tags if specified
    if (updateData.tags && updateData.tags.length > 0) {
      await addTagsToContact(contactId, accessToken, updateData.tags);
    }

    return { success: true };
  } catch (error) {
    console.error("[GHL API] Update contact error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
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
 * Webhook #0: Contact Capture
 * Fires immediately after Page 1 (contact info) to capture leads even if they abandon later.
 * NOW: Creates contact via GHL API directly with dynamic field mappings
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
    console.log("[Contact Capture] Received payload:", JSON.stringify(payload, null, 2));

    const {
      first_name,
      last_name,
      email,
      phone,
      timezone,
      visitor_id,
      referral_code,
      source_page,
      first_touch,
      last_touch,
      calculator_changed,
      calculator_inputs,
      referrer_url,
      first_referrer_url,
    } = payload;

    // Validate required fields
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const fullName = [first_name, last_name].filter(Boolean).join(" ").trim() || normalizedEmail.split("@")[0];

    // Fetch field mappings for dynamic custom field creation
    const mappingTargets = await getFieldMappingTargets(supabase);
    console.log("[Contact Capture] Field mappings loaded:", Object.keys(mappingTargets).length);

    // Check if prospect already exists by email
    const { data: existingProspect } = await supabase
      .from("prospects")
      .select("id, visitor_id, qualified_path, referral_code, timezone, ghl_contact_id, ghl_location_id")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let prospectId: string;
    let isNew = false;
    let ghlContactId: string | null = existingProspect?.ghl_contact_id || null;

    if (existingProspect) {
      prospectId = existingProspect.id;
      
      const updateData: Record<string, unknown> = {
        name: fullName,
        phone: phone || null,
        contact_capture_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      };

      if (timezone && !existingProspect.timezone) {
        updateData.timezone = timezone;
      }

      if (visitor_id && !visitor_id.startsWith("ghl_") && 
          (!existingProspect.visitor_id || existingProspect.visitor_id.startsWith("ghl_"))) {
        updateData.visitor_id = visitor_id;
      }

      if (!existingProspect.qualified_path) {
        updateData.qualified_path = "Contact Captured";
      }

      if (referral_code && !existingProspect.referral_code) {
        updateData.referral_code = referral_code;
      }

      const { error: updateError } = await supabase
        .from("prospects")
        .update(updateData)
        .eq("id", prospectId);

      if (updateError) {
        console.error("[Contact Capture] Update error:", updateError);
      }

      console.log(`[Contact Capture] Updated existing prospect ${prospectId}`);
    } else {
      // Create new prospect
      prospectId = crypto.randomUUID();
      isNew = true;

      const insertData: Record<string, unknown> = {
        id: prospectId,
        email: normalizedEmail,
        name: fullName,
        phone: phone || null,
        timezone: timezone || null,
        visitor_id: visitor_id || `web_${Date.now()}`,
        referral_code: referral_code || null,
        source_page: source_page || "/",
        status: "contact_captured",
        qualified_path: "Contact Captured",
        contact_capture_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        referrer_url: referrer_url || null,
        first_referrer_url: first_referrer_url || null,
        next_action_type: "call_to_qualify",
        next_action_due_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        partial_answers: {},
        ghl_location_id: GHL_PROSPECT_LOCATION_ID,
      };

      if (calculator_changed && calculator_inputs) {
        insertData.additional_info = JSON.stringify({
          calculator_inputs,
          captured_at: "contact_capture",
        });
      }

      const { error: insertError } = await supabase
        .from("prospects")
        .insert(insertData);

      if (insertError) {
        console.error("[Contact Capture] Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create prospect", details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[Contact Capture] Created new prospect ${prospectId}`);

      // Create attribution record
      if (first_touch || last_touch) {
        const attributionData: Record<string, unknown> = {
          prospect_id: prospectId,
          visitor_id: visitor_id || insertData.visitor_id,
          referral_code: referral_code || null,
          referrer_url: referrer_url || null,
          first_referrer_url: first_referrer_url || null,
        };

        if (first_touch) {
          attributionData.first_touch_source = first_touch.source || null;
          attributionData.first_touch_medium = first_touch.medium || null;
          attributionData.first_touch_campaign = first_touch.campaign || null;
          attributionData.first_touch_content = first_touch.content || null;
          attributionData.first_touch_term = first_touch.term || null;
          attributionData.first_touch_utm_id = first_touch.utm_id || null;
          attributionData.first_touch_gclid = first_touch.gclid || null;
          attributionData.first_touch_fbclid = first_touch.fbclid || null;
          attributionData.first_touch_ttclid = first_touch.ttclid || null;
          attributionData.first_touch_referrer = first_touch.referrer || null;
          attributionData.first_touch_landing_page = first_touch.landing_page || null;
          attributionData.first_touch_at = first_touch.timestamp ? new Date(first_touch.timestamp).toISOString() : null;
        }

        if (last_touch) {
          attributionData.last_touch_source = last_touch.source || null;
          attributionData.last_touch_medium = last_touch.medium || null;
          attributionData.last_touch_campaign = last_touch.campaign || null;
          attributionData.last_touch_content = last_touch.content || null;
          attributionData.last_touch_term = last_touch.term || null;
          attributionData.last_touch_utm_id = last_touch.utm_id || null;
          attributionData.last_touch_gclid = last_touch.gclid || null;
          attributionData.last_touch_fbclid = last_touch.fbclid || null;
          attributionData.last_touch_ttclid = last_touch.ttclid || null;
          attributionData.last_touch_referrer = last_touch.referrer || null;
          attributionData.last_touch_landing_page = last_touch.landing_page || null;
          attributionData.last_touch_at = last_touch.timestamp ? new Date(last_touch.timestamp).toISOString() : null;
        }

        await supabase.from("prospect_attribution").insert(attributionData);
      }

      // Log activity
      await supabase.from("prospect_activities").insert({
        prospect_id: prospectId,
        activity_type: "contact_captured",
        activity_data: {
          source: "homepage_application",
          stage: "Contact Capture",
          visitor_id,
          referral_code,
          timezone,
        },
      });
    }

    // === GHL API Integration ===
    // Create or update contact in GHL via API with dynamic field mappings
    const accessToken = await getLocationToken(supabase);

    let ghl_sync_success = false;
    let ghl_sync_error: string | null = null;
    let ghl_skipped_custom_fields: { internal_field_name: string; reason: string }[] = [];
    
    if (accessToken) {
      const effectiveReferralCode = referral_code || existingProspect?.referral_code || null;
      
      // Build internal field values (UTM/attribution only - no stage/qualified_path)
      const fieldValues: Record<string, string | null | undefined> = {
        prospect_id: prospectId,
        visitor_id: visitor_id || null,
        utm_source: first_touch?.source || null,
        utm_medium: first_touch?.medium || null,
        utm_campaign: first_touch?.campaign || null,
        utm_content: first_touch?.content || null,
        utm_term: first_touch?.term || null,
        utm_id: first_touch?.utm_id || null,
        g_clid: first_touch?.gclid || null,
        fb_clid: first_touch?.fbclid || null,
        tt_clid: first_touch?.ttclid || null,
        referrer_url: referrer_url || null,
        first_referrer_url: first_referrer_url || null,
        referring_agent_id: effectiveReferralCode,
        referral_code: effectiveReferralCode,
      };

      // Build custom fields using dynamic mappings
      const { customFields, skipped } = buildCustomFields(mappingTargets, fieldValues);
      ghl_skipped_custom_fields = skipped;
      console.log(
        "[Contact Capture] Built customFields (id/value pairs):",
        JSON.stringify(customFields, null, 2)
      );
      if (skipped.length > 0) {
        console.warn("[Contact Capture] Skipped custom fields due to mapping issues:", skipped);
      }

      if (!ghlContactId) {
        // Search for existing contact first
        ghlContactId = await searchContactByEmail(normalizedEmail, accessToken);
      }

      if (ghlContactId) {
        // Update existing contact
        console.log(`[Contact Capture] Updating existing GHL contact: ${ghlContactId}`);
        const updateResult = await updateContact(ghlContactId, accessToken, {
          customFields,
          tags: ["qual-pending"],
        });
        
        if (updateResult.contactNotFound) {
          // Stale contact ID - contact was deleted from GHL
          console.warn(`[Contact Capture] Stale GHL contact ID ${ghlContactId} (contact deleted), clearing and creating new`);
          
          // Clear the stale contact ID from the database
          await supabase
            .from("prospects")
            .update({ ghl_contact_id: null })
            .eq("id", prospectId);
          
          ghlContactId = null;
          // Fall through to create new contact below
        } else if (!updateResult.success) {
          ghl_sync_success = false;
          ghl_sync_error = `Failed to update existing contact: ${updateResult.error || "see function logs"}`;
        } else {
          ghl_sync_success = true;
        }
      }
      
      // Create new contact if we don't have one (or if old one was stale)
      if (!ghlContactId) {
        console.log("[Contact Capture] Creating new GHL contact via API");
        ghlContactId = await createContact(accessToken, {
          firstName: first_name || "",
          lastName: last_name || "",
          email: normalizedEmail,
          phone: phone || "",
          timezone,
          tags: ["qual-pending"],
        });

        if (!ghlContactId) {
          ghl_sync_success = false;
          ghl_sync_error = "Failed to create contact (see function logs for GHL response)";
        } else {
          // After creating, apply custom fields in a separate request so one bad field doesn't block contact creation.
          if (customFields.length > 0) {
            const updateResult = await updateContact(ghlContactId, accessToken, {
              customFields,
            });
            ghl_sync_success = updateResult.success;
            if (!updateResult.success) {
              ghl_sync_error = `Contact created, but customFields update failed: ${updateResult.error || "see function logs"}`;
            }
          } else {
            ghl_sync_success = true;
          }
        }
      }

      // Store GHL contact ID in prospects table
      if (ghlContactId) {
        await supabase
          .from("prospects")
          .update({
            ghl_contact_id: ghlContactId,
            ghl_location_id: GHL_PROSPECT_LOCATION_ID,
          })
          .eq("id", prospectId);

        console.log(`[Contact Capture] Stored GHL contact ID: ${ghlContactId}`);
      } else {
        console.warn("[Contact Capture] Failed to create/find GHL contact");
      }
    } else {
      console.warn("[Contact Capture] Could not get GHL access token - skipping API integration");
    }

    return new Response(
      JSON.stringify({
        success: true,
        prospect_id: prospectId,
        visitor_id: visitor_id || existingProspect?.visitor_id,
        ghl_contact_id: ghlContactId,
        is_new: isNew,
        stage: "Contact Capture",
        qualified_path: "Contact Captured",
        message: isNew ? "Prospect created" : "Prospect updated",
        mappings_used: Object.keys(mappingTargets).length,
        ghl_sync_success,
        ghl_sync_error,
        ghl_skipped_custom_fields,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Contact Capture] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
