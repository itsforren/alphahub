import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAgencyAccessToken } from '../_shared/ghl-oauth.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// V2 API endpoint for location creation
const GHL_API_BASE = "https://services.leadconnectorhq.com";
const COMPANY_ID = "30bFOq4ZtlhKuMOvVPwA";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get V2 OAuth token (auto-refreshes if expired, with DB-level locking)
    const accessToken = await getAgencyAccessToken(supabase, 'ghl-create-subaccount');

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
      snapshot_id,
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

    // V2 API payload — GHL rejects firstName/lastName on POST, set them via PUT after creation
    const locationPayload: Record<string, unknown> = {
      companyId: COMPANY_ID,
      name: businessName,
      email: email,
      phone: phone || "",
      address: address_street || "",
      city: address_city || "",
      country: "US",
      state: address_state || "",
      postalCode: address_zip || "",
      website: profile_url || "",
      timezone: timezone,
      settings: {
        allowDuplicateContact: false,
        allowDuplicateOpportunity: false,
        allowFacebookNameMerge: false,
        disableContactTimezone: false,
      },
    };

    // Include snapshot if provided — GHL applies it during location creation
    if (snapshot_id) {
      locationPayload.snapshotId = snapshot_id;
      console.log("Including snapshot in location creation:", snapshot_id);
    }

    console.log("Location payload:", JSON.stringify(locationPayload, null, 2));

    // Create the location/subaccount via V2 API
    const createResponse = await fetch(`${GHL_API_BASE}/locations/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
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

    // Update location with firstName, lastName — POST /locations rejects these fields
    let locationUpdateResult: Record<string, unknown> = { attempted: false };
    try {
      const updatePayload: Record<string, unknown> = {
        companyId: COMPANY_ID,
        firstName: first_name,
        lastName: last_name,
        email: email,
        phone: phone || "",
      };

      console.log("Updating location settings with agent identity:", JSON.stringify(updatePayload));

      const updateResponse = await fetch(`${GHL_API_BASE}/locations/${locationId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify(updatePayload),
      });

      const updateText = await updateResponse.text();
      console.log("GHL update location response:", updateResponse.status, updateText.substring(0, 500));

      locationUpdateResult = {
        attempted: true,
        ok: updateResponse.ok,
        status: updateResponse.status,
        responseSnippet: updateText.substring(0, 500),
      };

      if (!updateResponse.ok) {
        console.warn(`Failed to update location settings (${updateResponse.status}), subaccount still created`);
      }
    } catch (updateErr) {
      const errMsg = updateErr instanceof Error ? updateErr.message : String(updateErr);
      console.warn("Failed to update location settings after creation:", errMsg);
      locationUpdateResult = { attempted: true, ok: false, error: errMsg };
    }

    return new Response(
      JSON.stringify({
        success: true,
        location_id: locationId,
        business_name: businessName,
        locationUpdateResult,
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
