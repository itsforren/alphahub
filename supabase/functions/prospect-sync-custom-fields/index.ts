import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_PROSPECT_LOCATION_ID = "wDoj91sbkfxZnMbow2G5";

// Get location access token
async function getLocationToken(supabase: any, locationId: string): Promise<string | null> {
  try {
    // First get the company ID from the oauth tokens table
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("ghl_oauth_tokens")
      .select("company_id")
      .limit(1)
      .maybeSingle();
    
    if (tokenError || !tokenRecord?.company_id) {
      console.error("Failed to get company ID from OAuth tokens:", tokenError || "No company_id found");
      return null;
    }
    
    const companyId = tokenRecord.company_id;
    console.log(`Getting location token for company: ${companyId}, location: ${locationId}`);

    // Call backend function via the Supabase client (consistent headers + easier debugging)
    const { data: tokenData, error: invokeError } = await supabase.functions.invoke(
      "crm-location-token",
      {
        body: { companyId, locationId },
      }
    );

    if (invokeError) {
      console.error("crm-location-token invoke error:", invokeError);
      return null;
    }

    // crm-location-token returns { locationAccessToken, expiresIn }
    // but we defensively support alternative shapes too.
    const accessToken =
      tokenData?.locationAccessToken ||
      tokenData?.access_token ||
      tokenData?.accessToken;

    if (!accessToken) {
      console.error("No access token in crm-location-token response:", tokenData);
      return null;
    }
    
    return accessToken;
  } catch (err) {
    console.error("Error getting location token:", err);
    return null;
  }
}

// Text field types that are usable for our mappings
const TEXT_FIELD_TYPES = ["TEXT", "LARGE_TEXT", "TEXTBOX_LIST", "SINGLE_LINE"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { location_id } = await req.json();
    const locationId = location_id || GHL_PROSPECT_LOCATION_ID;

    console.log(`Syncing custom fields for location: ${locationId}`);

    // Get access token
    const accessToken = await getLocationToken(supabase, locationId);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to get GHL access token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch custom fields from GHL
    const fieldsUrl = `${GHL_API_BASE}/locations/${locationId}/customFields`;
    console.log(`Fetching custom fields from: ${fieldsUrl}`);

    const response = await fetch(fieldsUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Version": "2021-07-28",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GHL API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: `GHL API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const customFields = data.customFields || [];

    console.log(`Found ${customFields.length} custom fields in GHL`);

    // Upsert fields into prospect_available_fields
    const fieldsToUpsert = customFields.map((field: any) => ({
      location_id: locationId,
      field_id: field.id,
      field_key: field.fieldKey || field.id,
      field_name: field.name,
      field_type: field.dataType || field.fieldType || null,
    }));

    if (fieldsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("prospect_available_fields")
        .upsert(fieldsToUpsert, { onConflict: "location_id,field_id" });

      if (upsertError) {
        console.error("Error upserting fields:", upsertError);
        throw upsertError;
      }
    }

    // Auto-match fields based on keywords
    const autoMatchKeywords: Record<string, string[]> = {
      first_name: ["first", "first_name", "firstname", "given", "givenname"],
      last_name: ["last", "last_name", "lastname", "surname", "family"],
      email: ["email", "e-mail", "mail"],
      phone: ["phone", "mobile", "cell", "telephone"],
      prospect_id: ["prospect", "prospect_id", "prospectid"],
      visitor_id: ["visitor", "visitor_id", "visitorid"],
      stage: ["stage", "funnel_stage", "funnelstage"],
      qualified_path: ["qualified", "qualified_path", "qualifiedpath", "path"],
      utm_source: ["utm_source", "utmsource", "source"],
      utm_medium: ["utm_medium", "utmmedium", "medium"],
      utm_campaign: ["utm_campaign", "utmcampaign", "campaign"],
      utm_content: ["utm_content", "utmcontent", "content"],
      utm_term: ["utm_term", "utmterm", "term"],
      utm_id: ["utm_id", "utmid"],
      g_clid: ["gclid", "g_clid", "google_click", "googleclick"],
      fb_clid: ["fbclid", "fb_clid", "facebook_click", "facebookclick"],
      tt_clid: ["ttclid", "tt_clid", "tiktok_click", "tiktokclick"],
      referrer_url: ["referrer", "referrer_url", "referrerurl"],
      first_referrer_url: ["first_referrer", "first_referrer_url", "firstreferrer"],
      referring_agent_id: ["referring_agent", "agent_id", "agentid"],
      referral_code: ["referral", "referral_code", "referralcode"],
      licensed_status: ["licensed", "licensed_status", "licensedstatus", "license"],
      states_licensed: ["states", "states_licensed", "stateslicensed"],
      monthly_budget_range: ["budget", "monthly_budget", "monthlybudget"],
      payment_plan_interest: ["payment_plan", "paymentplan", "payment"],
      credit_available: ["credit", "credit_available", "creditavailable"],
      meets_minimum_budget: ["meets minimum", "minimum budget", "min budget", "budget minimum"],
      desired_timeline: ["timeline", "start timeline", "desired timeline", "start date", "start"],
      current_bottleneck: ["bottleneck", "challenge", "constraint", "biggest issue"],
      manual_source: ["self-reported source", "self reported source", "manual source", "source"],
      manual_referrer_agent_name: ["manual referrer", "referrer agent", "referrer name", "agent referred", "referred by"],
    };

    const autoMatches: Array<{
      internal: string;
      ghl_field_id: string;
      ghl_field_key: string;
      ghl_field_name: string;
    }> = [];

    for (const [internalField, keywords] of Object.entries(autoMatchKeywords)) {
      // Find a matching GHL field
      const matchedField = customFields.find((field: any) => {
        const fieldName = (field.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const fieldKey = (field.fieldKey || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        
        return keywords.some(kw => {
          const keyword = kw.toLowerCase().replace(/[^a-z0-9]/g, "");
          return fieldName.includes(keyword) || fieldKey.includes(keyword);
        });
      });

      if (matchedField) {
        autoMatches.push({
          internal: internalField,
          ghl_field_id: matchedField.id,
          ghl_field_key: matchedField.fieldKey || matchedField.id,
          ghl_field_name: matchedField.name,
        });
      }
    }

    console.log(`Auto-matched ${autoMatches.length} fields`);

    // Upsert auto-matched mappings (but don't overwrite manual mappings)
    for (const match of autoMatches) {
      // Check if a manual mapping already exists
      const { data: existingMapping } = await supabase
        .from("prospect_field_mappings")
        .select("id, ghl_field_id")
        .eq("location_id", locationId)
        .eq("internal_field_name", match.internal)
        .single();

      // Only insert/update if no mapping exists
      if (!existingMapping || !existingMapping.ghl_field_id) {
        await supabase
          .from("prospect_field_mappings")
          .upsert({
            location_id: locationId,
            internal_field_name: match.internal,
            ghl_field_id: match.ghl_field_id,
            ghl_field_key: match.ghl_field_key,
            ghl_field_name: match.ghl_field_name,
            is_enabled: true,
          }, { onConflict: "location_id,internal_field_name" });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        fields_count: customFields.length,
        auto_matched_count: autoMatches.length,
        fields: fieldsToUpsert,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error syncing custom fields:", errMsg);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
