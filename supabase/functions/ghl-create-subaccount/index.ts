import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// V1 API endpoint for location creation
const GHL_API_BASE = "https://rest.gohighlevel.com/v1";

function normalizeBearerToken(raw: string) {
  // Users often paste the token with a leading "Bearer ".
  // If we include Bearer twice, GHL will treat it as an invalid JWT.
  return raw.replace(/^Bearer\s+/i, "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawKey = Deno.env.get("GHL_AGENCY_API_KEY");
    if (!rawKey) {
      throw new Error("GHL_AGENCY_API_KEY not configured");
    }

    const companyId = Deno.env.get("GHL_COMPANY_ID");
    if (!companyId) {
      throw new Error("GHL_COMPANY_ID not configured");
    }

    const token = normalizeBearerToken(rawKey);

    // Lightweight diagnostics (don't log secrets)
    const tokenLooksLikeJwt = token.split(".").length === 3;
    console.log("GHL token diagnostics:", {
      hadBearerPrefix: /^Bearer\s+/i.test(rawKey),
      tokenLooksLikeJwt,
      tokenLength: token.length,
    });

    const {
      first_name,
      last_name,
      email,
      phone,
      address_street,
      address_city,
      address_state,
      address_zip,
      profile_url,
      timezone = "America/New_York",
    } = await req.json();

    if (!first_name || !last_name || !email) {
      return new Response(
        JSON.stringify({ error: "first_name, last_name, and email are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const businessName = `${first_name} ${last_name} | AGENT`;
    console.log("Creating GHL subaccount for:", businessName);

    // V1 API payload format - NO snapshot since SaaS product will handle it
    const locationPayload = {
      businessName: businessName,
      address: address_street || "",
      city: address_city || "",
      country: "US",
      state: address_state || "",
      postalCode: address_zip || "",
      website: profile_url || "",
      timezone: timezone,
      firstName: first_name,
      lastName: last_name,
      email: email,
      phone: phone || "",
      settings: {
        allowDuplicateContact: false,
        allowDuplicateOpportunity: false,
        allowFacebookNameMerge: false,
        disableContactTimezone: false,
      },
      // Snapshot removed - SaaS product will install it automatically
    };

    console.log("Location payload:", JSON.stringify(locationPayload, null, 2));

    // Step 1: Create the location/subaccount
    const createResponse = await fetch(`${GHL_API_BASE}/locations/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(locationPayload),
    });

    const responseText = await createResponse.text();
    console.log("GHL create location response status:", createResponse.status);
    console.log("GHL create location response:", responseText);

    if (!createResponse.ok) {
      throw new Error(
        `GHL API error: ${createResponse.status} - ${responseText}`
      );
    }

    const locationData = JSON.parse(responseText);
    const locationId = locationData.location?.id || locationData.id;

    if (!locationId) {
      throw new Error("Could not extract location ID from response");
    }

    console.log("GHL subaccount created successfully:", locationId);

    // SaaS activation is now handled in Step 10 of run-full-onboarding
    // This function only creates the subaccount - no legacy SaaS code here

    return new Response(
      JSON.stringify({
        success: true,
        location_id: locationId,
        business_name: businessName,
        response: locationData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error creating GHL subaccount:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create GHL subaccount";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
