import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`Looking up GHL contact for email: ${normalizedEmail}`);

    // Get sales_subaccount_id from settings
    const { data: setting, error: settingError } = await supabase
      .from("onboarding_settings")
      .select("setting_value")
      .eq("setting_key", "sales_subaccount_id")
      .single();

    if (settingError || !setting) {
      console.error("Sales subaccount ID not configured:", settingError);
      return new Response(
        JSON.stringify({ error: "Sales subaccount not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const locationId = setting.setting_value;

    // Get company_id from oauth tokens
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("ghl_oauth_tokens")
      .select("company_id")
      .maybeSingle();

    if (tokenError || !tokenRecord?.company_id) {
      console.error("No GHL OAuth configured:", tokenError);
      return new Response(
        JSON.stringify({ error: "GHL OAuth not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const companyId = tokenRecord.company_id;

    // Get location access token via crm-location-token
    const locationTokenResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/crm-location-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ companyId, locationId }),
      }
    );

    if (!locationTokenResponse.ok) {
      const errorText = await locationTokenResponse.text();
      console.error("Failed to get location token:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get GHL access token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { locationAccessToken } = await locationTokenResponse.json();

    // Search for contact by email in GHL
    const searchUrl = `https://services.leadconnectorhq.com/contacts/search`;
    const searchResponse = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${locationAccessToken}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify({
        locationId,
        query: normalizedEmail,
        limit: 1,
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("GHL contact search failed:", errorText);
      
      // Log the API call
      await supabase.from("ghl_api_logs").insert({
        request_type: "contact_search",
        location_id: locationId,
        status: "error",
        error_message: errorText,
      });

      return new Response(
        JSON.stringify({ error: "Failed to search GHL contacts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchData = await searchResponse.json();
    console.log("GHL search response:", JSON.stringify(searchData, null, 2));

    // Log successful API call
    await supabase.from("ghl_api_logs").insert({
      request_type: "contact_search",
      location_id: locationId,
      status: "success",
      response_data: { contacts_found: searchData.contacts?.length || 0 },
    });

    // Check if contact exists
    const existingContact = searchData.contacts?.find(
      (c: any) => c.email?.toLowerCase() === normalizedEmail
    );

    if (existingContact) {
      console.log(`Found existing GHL contact: ${existingContact.id}`);
      return new Response(
        JSON.stringify({ 
          ghl_contact_id: existingContact.id,
          found: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Contact not found - return null (we won't create one, GHL will create when they book)
    console.log(`No GHL contact found for ${normalizedEmail}`);
    return new Response(
      JSON.stringify({ 
        ghl_contact_id: null,
        found: false,
        message: "Contact will be created when prospect books a call"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Lookup GHL contact error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
