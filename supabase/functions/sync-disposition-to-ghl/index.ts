import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map dispositions to GHL tags
const DISPOSITION_TAGS: Record<string, string> = {
  showed_closed_won: "closed-won",
  showed_follow_up: "follow-up",
  showed_closed_lost: "closed-lost",
  no_show_rebooked: "noshow",
  canceled_rebooked: "canceled",
  disqualified: "disqualified",
};

async function getLocationToken(supabase: any, locationId: string): Promise<string | null> {
  // Get the company-level token
  const { data: tokenData } = await supabase
    .from("ghl_oauth_tokens")
    .select("access_token, refresh_token, expires_at, company_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!tokenData) {
    console.log("No GHL OAuth token found");
    return null;
  }

  // Check if token needs refresh
  const expiresAt = new Date(tokenData.expires_at);
  if (expiresAt <= new Date()) {
    console.log("Token expired, attempting refresh...");
    const refreshed = await refreshToken(supabase, tokenData.refresh_token);
    if (!refreshed) return null;
    return refreshed.access_token;
  }

  // Get location-specific access token
  const response = await fetch(
    `https://services.leadconnectorhq.com/oauth/locationToken`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${tokenData.access_token}`,
        Version: "2021-07-28",
      },
      body: new URLSearchParams({
        companyId: tokenData.company_id || "",
        locationId: locationId,
      }),
    }
  );

  if (!response.ok) {
    console.error("Failed to get location token:", await response.text());
    return tokenData.access_token; // Fallback to company token
  }

  const data = await response.json();
  return data.access_token || tokenData.access_token;
}

async function refreshToken(supabase: any, refreshToken: string): Promise<any> {
  const clientId = Deno.env.get("GHL_CLIENT_ID");
  const clientSecret = Deno.env.get("GHL_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    console.error("Missing GHL OAuth credentials");
    return null;
  }

  const response = await fetch("https://services.leadconnectorhq.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    console.error("Failed to refresh token:", await response.text());
    return null;
  }

  const data = await response.json();
  
  await supabase
    .from("ghl_oauth_tokens")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("refresh_token", refreshToken);

  return data;
}

async function addTagToContact(contactId: string, accessToken: string, tag: string): Promise<boolean> {
  const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      Version: "2021-07-28",
    },
    body: JSON.stringify({ tags: [tag] }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to add tag to contact:", error);
    return false;
  }

  console.log(`Successfully added tag "${tag}" to contact ${contactId}`);
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { prospect_id, disposition, ghl_contact_id } = await req.json();
    console.log("Syncing disposition to GHL:", { prospect_id, disposition, ghl_contact_id });

    if (!disposition) {
      return new Response(
        JSON.stringify({ error: "Disposition is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tag = DISPOSITION_TAGS[disposition];
    if (!tag) {
      console.log(`No tag mapping for disposition: ${disposition}`);
      return new Response(
        JSON.stringify({ message: "No tag mapping for this disposition", disposition }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get prospect with partner's subaccount_id if not provided directly
    let contactId = ghl_contact_id;
    let locationId: string | null = null;

    if (!contactId || !locationId) {
      const { data: prospect } = await supabase
        .from("prospects")
        .select(`
          ghl_contact_id,
          partner:partners!prospects_partner_id_fkey (
            subaccount_id
          )
        `)
        .eq("id", prospect_id)
        .single();

      if (prospect) {
        contactId = contactId || prospect.ghl_contact_id;
        // Partner is returned as an array from the join, get first element
        const partnerArray = prospect.partner as unknown as Array<{ subaccount_id: string }> | null;
        locationId = partnerArray?.[0]?.subaccount_id || null;
      }
    }

    if (!contactId) {
      console.log("No GHL contact ID found for prospect");
      return new Response(
        JSON.stringify({ message: "No GHL contact ID linked to this prospect" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!locationId) {
      console.log("No location ID found, cannot sync to GHL");
      return new Response(
        JSON.stringify({ message: "No GHL location linked to partner" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get access token
    const accessToken = await getLocationToken(supabase, locationId);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Failed to get GHL access token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add tag to contact
    const success = await addTagToContact(contactId, accessToken, tag);

    // Log activity
    await supabase.from("prospect_activities").insert({
      prospect_id,
      activity_type: "ghl_tag_synced",
      activity_data: {
        disposition,
        tag,
        ghl_contact_id: contactId,
        success,
      },
    });

    return new Response(
      JSON.stringify({ 
        success, 
        tag,
        contact_id: contactId,
        message: success ? `Tag "${tag}" added to GHL contact` : "Failed to add tag"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error syncing disposition to GHL:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
