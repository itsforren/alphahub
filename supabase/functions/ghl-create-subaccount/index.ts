import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// V2 API endpoint for location creation
const GHL_API_BASE = "https://services.leadconnectorhq.com";
const COMPANY_ID = "30bFOq4ZtlhKuMOvVPwA";

// AES-GCM decryption
async function decryptToken(encryptedData: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));

  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

// AES-GCM encryption
async function encryptToken(token: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(token)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

async function getAgencyToken(supabase: any, encryptionKey: string): Promise<string> {
  const { data: tokenData, error } = await supabase
    .from("ghl_oauth_tokens")
    .select("id, access_token, refresh_token, expires_at")
    .eq("company_id", COMPANY_ID)
    .single();

  if (error || !tokenData) {
    throw new Error("No GHL OAuth token found for agency. Please reconnect via Settings > CRM.");
  }

  const expiresAt = new Date(tokenData.expires_at);
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  // Check if token is expired or about to expire
  if (expiresAt <= fiveMinutesFromNow) {
    console.log("Token expired or expiring soon, refreshing...");

    const GHL_CLIENT_ID = Deno.env.get("GHL_CLIENT_ID");
    const GHL_CLIENT_SECRET = Deno.env.get("GHL_CLIENT_SECRET");

    // Decrypt the refresh token
    const decryptedRefreshToken = await decryptToken(tokenData.refresh_token, encryptionKey);

    const refreshResponse = await fetch(`${GHL_API_BASE}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GHL_CLIENT_ID!,
        client_secret: GHL_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: decryptedRefreshToken,
      }),
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      throw new Error(`Failed to refresh GHL OAuth token: ${errorText}`);
    }

    const newTokens = await refreshResponse.json();

    // Encrypt new tokens before storing
    const encryptedAccessToken = await encryptToken(newTokens.access_token, encryptionKey);
    const encryptedRefreshToken = await encryptToken(newTokens.refresh_token, encryptionKey);

    await supabase
      .from("ghl_oauth_tokens")
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", tokenData.id);

    console.log("Token refreshed successfully");
    return newTokens.access_token;
  }

  // Token is still valid - decrypt it
  try {
    const decryptedToken = await decryptToken(tokenData.access_token, encryptionKey);
    console.log("Token decrypted, length:", decryptedToken.length);
    return decryptedToken;
  } catch (decryptError) {
    // Fallback: token might be stored unencrypted (legacy)
    console.warn("Decrypt failed, using token as-is (legacy fallback)");
    return tokenData.access_token;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY") || supabaseKey;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get V2 OAuth token (auto-refreshes if expired)
    const accessToken = await getAgencyToken(supabase, encryptionKey);

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
