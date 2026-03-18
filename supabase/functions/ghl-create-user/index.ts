import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const COMPANY_ID = "30bFOq4ZtlhKuMOvVPwA";
const DEFAULT_PASSWORD = "Alpha21$";

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
    throw new Error("No GHL OAuth token found for agency. Please reconnect.");
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
      throw new Error(`Failed to refresh token: ${errorText}`);
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

    console.log("Token refreshed successfully, tokenLooksLikeJwt:", newTokens.access_token.includes('.'));
    return newTokens.access_token;
  }

  // Token is still valid - decrypt it
  try {
    const decryptedToken = await decryptToken(tokenData.access_token, encryptionKey);
    console.log("Token decrypted, tokenLooksLikeJwt:", decryptedToken.includes('.'), "tokenLength:", decryptedToken.length);
    return decryptedToken;
  } catch (decryptError) {
    // Fallback: token might be stored unencrypted (legacy)
    console.warn("Decrypt failed, using token as-is (legacy fallback):", decryptError);
    const tokenLooksLikeJwt = tokenData.access_token.includes('.') && tokenData.access_token.split('.').length === 3;
    console.log("Raw token fallback, tokenLooksLikeJwt:", tokenLooksLikeJwt, "tokenLength:", tokenData.access_token.length);
    return tokenData.access_token;
  }
}

// Search for existing user by email
type ExistingGhlUser = {
  id: string;
  locationIds: string[];
};

function isDuplicateEmailError(status: number, body: string): boolean {
  if (status !== 400) return false;
  const b = body.toLowerCase();
  return b.includes("email") && b.includes("already exists");
}

function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function searchUserByEmail(accessToken: string, email: string): Promise<ExistingGhlUser | null> {
  console.log(`Searching for existing user with email: ${email}`);

  const attempts: Array<{ label: string; body: Record<string, unknown> }> = [
    // What the API is clearly validating for in our logs: `emails` must be a string.
    { label: "emails:string", body: { companyId: COMPANY_ID, emails: email } },
    // Fallback in case the API changes/tenant differences.
    { label: "email:string", body: { companyId: COMPANY_ID, email } },
  ];

  for (const attempt of attempts) {
    try {
      const res = await fetch(`${GHL_API_BASE}/users/search/filter-by-email`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28",
        },
        body: JSON.stringify(attempt.body),
      });

      const text = await res.text();
      console.log(`Search user (${attempt.label}) status:`, res.status);
      console.log(`Search user (${attempt.label}) response:`, text);

      if (!res.ok) {
        continue;
      }

      const data = safeJsonParse(text) || {};
      const user = data.users?.[0] ?? data.user ?? null;
      const userId = user?.id ?? null;
      const locationIds = Array.isArray(user?.locationIds) ? user.locationIds : [];

      if (userId) {
        console.log(`Found existing user with ID: ${userId} (locations: ${locationIds.length})`);
        return { id: userId, locationIds };
      }

      // If search endpoint returns success but no user, treat as not found
      return null;
    } catch (error) {
      console.error(`Error searching for user (${attempt.label}):`, error);
      // keep trying other attempt
    }
  }

  console.log("Search failed / no user found; will attempt create.");
  return null;
}

async function fetchUserLocationIds(accessToken: string, userId: string): Promise<string[]> {
  try {
    const url = `${GHL_API_BASE}/users/${userId}?companyId=${encodeURIComponent(COMPANY_ID)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
    });

    const text = await res.text();
    console.log("Get user response status:", res.status);
    console.log("Get user response:", text);

    if (!res.ok) return [];

    const data = safeJsonParse(text) || {};
    const user = data.user ?? data ?? {};
    return Array.isArray(user.locationIds) ? user.locationIds : [];
  } catch (e) {
    console.error("Error fetching user locationIds:", e);
    return [];
  }
}

// Update existing user's location assignment (ADD locationId; do not remove existing access)
async function updateUserLocations(
  accessToken: string,
  userId: string,
  locationId: string,
  firstName: string,
  lastName: string,
  phone: string,
  profilePhotoUrl: string,
  locationIdsHint: string[]
): Promise<{ success: boolean; locationIds?: string[]; error?: string }> {
  console.log(`Updating user ${userId} to add location ${locationId}`);

  try {
    // Prefer fetching the real current locationIds so we never remove access inadvertently.
    const currentLocationIds = await fetchUserLocationIds(accessToken, userId);
    const baseIds = currentLocationIds.length ? currentLocationIds : (locationIdsHint || []);

    const mergedLocationIds = Array.from(new Set([...(baseIds || []), locationId].filter(Boolean)));

    const updatePayload = {
      companyId: COMPANY_ID,
      firstName,
      lastName,
      phone: phone || "",
      profilePhoto: profilePhotoUrl || "",
      locationIds: mergedLocationIds,
      permissions: {
        campaignsEnabled: true,
        campaignsReadOnly: false,
        contactsEnabled: true,
        workflowsEnabled: true,
        workflowsReadOnly: false,
        triggersEnabled: true,
        funnelsEnabled: true,
        websitesEnabled: true,
        opportunitiesEnabled: true,
        dashboardStatsEnabled: true,
        bulkRequestsEnabled: true,
        appointmentsEnabled: true,
        reviewsEnabled: true,
        onlineListingsEnabled: true,
        phoneCallEnabled: true,
        conversationsEnabled: true,
        assignedDataOnly: false,
        adwordsReportingEnabled: false,
        membershipEnabled: true,
        facebookAdsReportingEnabled: false,
        attributionsReportingEnabled: false,
        settingsEnabled: true,
        tagsEnabled: true,
        leadValueEnabled: true,
        marketingEnabled: true,
        agentReportingEnabled: true,
        botService: false,
        socialPlanner: true,
        bloggingEnabled: true,
        invoiceEnabled: true,
        affiliateManagerEnabled: true,
        contentAiEnabled: true,
        refundsEnabled: true,
        recordPaymentEnabled: true,
        cancelSubscriptionEnabled: true,
        paymentsEnabled: true,
        communitiesEnabled: true,
        exportPaymentsEnabled: true,
      },
    };

    console.log("Update payload:", JSON.stringify(updatePayload, null, 2));

    const updateResponse = await fetch(`${GHL_API_BASE}/users/${userId}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify(updatePayload),
    });

    const responseText = await updateResponse.text();
    console.log("Update user response status:", updateResponse.status);
    console.log("Update user response:", responseText);

    if (!updateResponse.ok) {
      return {
        success: false,
        error: `Update failed: ${updateResponse.status} - ${responseText}`,
      };
    }

    console.log(`Successfully updated user ${userId}; locationIds now: ${mergedLocationIds.join(",")}`);
    return { success: true, locationIds: mergedLocationIds };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY");

    if (!encryptionKey) {
      throw new Error("ENCRYPTION_KEY secret is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      first_name,
      last_name,
      email,
      phone,
      location_id,
      profile_photo_url,
      password: chosenPassword,
    } = await req.json();

    if (!first_name || !last_name || !email || !location_id) {
      return new Response(
        JSON.stringify({ error: "first_name, last_name, email, and location_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getAgencyToken(supabase, encryptionKey);
    console.log("Processing GHL user for:", email, "in location:", location_id);

    // 1) Try to find user first
    const existingUser = await searchUserByEmail(accessToken, email);

    // 2) If found, add this locationId to their access
    if (existingUser?.id) {
      console.log(
        `User ${email} exists (ID: ${existingUser.id}). Adding location access for ${location_id}...`
      );

      const updateResult = await updateUserLocations(
        accessToken,
        existingUser.id,
        location_id,
        first_name,
        last_name,
        phone || "",
        profile_photo_url || "",
        existingUser.locationIds
      );

      if (!updateResult.success) {
        throw new Error(
          `Failed to add location for existing user ${existingUser.id}: ${updateResult.error}`
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          user_id: existingUser.id,
          email,
          location_id,
          is_existing_user: true,
          location_ids: updateResult.locationIds,
          message: "Existing user updated with additional subaccount access",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3) Not found: try create
    console.log("Creating new GHL user for:", email);

    const userPayload = {
      firstName: first_name,
      lastName: last_name,
      email: email,
      phone: phone || "",
      password: chosenPassword || DEFAULT_PASSWORD,
      type: "account",
      role: "admin",
      companyId: COMPANY_ID,
      profilePhoto: profile_photo_url || "",
      locationIds: [location_id],
      permissions: {
        campaignsEnabled: true,
        campaignsReadOnly: false,
        contactsEnabled: true,
        workflowsEnabled: true,
        workflowsReadOnly: false,
        triggersEnabled: true,
        funnelsEnabled: true,
        websitesEnabled: true,
        opportunitiesEnabled: true,
        dashboardStatsEnabled: true,
        bulkRequestsEnabled: true,
        appointmentsEnabled: true,
        reviewsEnabled: true,
        onlineListingsEnabled: true,
        phoneCallEnabled: true,
        conversationsEnabled: true,
        assignedDataOnly: false,
        adwordsReportingEnabled: false,
        membershipEnabled: true,
        facebookAdsReportingEnabled: false,
        attributionsReportingEnabled: false,
        settingsEnabled: true,
        tagsEnabled: true,
        leadValueEnabled: true,
        marketingEnabled: true,
        agentReportingEnabled: true,
        botService: false,
        socialPlanner: true,
        bloggingEnabled: true,
        invoiceEnabled: true,
        affiliateManagerEnabled: true,
        contentAiEnabled: true,
        refundsEnabled: true,
        recordPaymentEnabled: true,
        cancelSubscriptionEnabled: true,
        paymentsEnabled: true,
        communitiesEnabled: true,
        exportPaymentsEnabled: true,
      },
    };

    console.log("User payload:", JSON.stringify(userPayload, null, 2));

    const createResponse = await fetch(`${GHL_API_BASE}/users/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify(userPayload),
    });

    const responseText = await createResponse.text();
    console.log("GHL create user response status:", createResponse.status);
    console.log("GHL create user response:", responseText);

    if (!createResponse.ok) {
      // 4) If create failed due to duplicate, do a second lookup and update
      if (isDuplicateEmailError(createResponse.status, responseText)) {
        console.log(
          `Create failed due to duplicate email. Re-trying as UPDATE flow for ${email}...`
        );

        const existingAfterCreate = await searchUserByEmail(accessToken, email);
        if (existingAfterCreate?.id) {
          const updateResult = await updateUserLocations(
            accessToken,
            existingAfterCreate.id,
            location_id,
            first_name,
            last_name,
            phone || "",
            profile_photo_url || "",
            existingAfterCreate.locationIds
          );

          if (!updateResult.success) {
            throw new Error(
              `Duplicate found but update failed for ${existingAfterCreate.id}: ${updateResult.error}`
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              user_id: existingAfterCreate.id,
              email,
              location_id,
              is_existing_user: true,
              location_ids: updateResult.locationIds,
              message: "Existing user updated with additional subaccount access",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      throw new Error(`GHL API error: ${createResponse.status} - ${responseText}`);
    }

    const userData = safeJsonParse(responseText) || {};
    const userId = userData.user?.id || userData.id;

    if (!userId) {
      throw new Error("Could not extract user ID from response");
    }

    console.log("GHL user created successfully:", userId);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email: email,
        location_id: location_id,
        is_existing_user: false,
        response: userData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );


  } catch (error: unknown) {
    console.error("Error creating GHL user:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create GHL user";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
