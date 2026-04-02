import { createClient } from "npm:@supabase/supabase-js@2.87.1";
import { getAgencyAccessToken } from '../_shared/ghl-oauth.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};



// GHL Phone System API
// The UI uses backend.leadconnectorhq.com with /phone-system/numbers/location/{locationId}/available
const GHL_API_BASES = [
  "https://backend.leadconnectorhq.com",
  "https://services.leadconnectorhq.com",
  // Some tenants route phone-system via msgsndr services host
  "https://services.msgsndr.com",
  "https://rest.gohighlevel.com/v2",
];

// Purchase endpoints (tried after search finds a number)
const GHL_PHONE_PURCHASE_PATHS = [
  "/phone-system/number/purchase",
  "/phone-system/numbers/purchase",
];

type SearchAttemptLog = {
  base: string;
  path: string;
  url: string;
  status: number;
  responseSnippet: string;
};

function safeSnippet(text: string, max = 500) {
  return (text || "").slice(0, max);
}

function extractNumbersFromSearchResponse(searchData: any): any[] {
  // Observed/possible shapes across gateways/versions
  // - { numbers: [...] }
  // - { data: [...] }
  // - { data: { numbers: [...] } }
  // - { results: [...] }
  const candidates = [
    searchData?.numbers,
    searchData?.data,
    searchData?.data?.numbers,
    searchData?.results,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

/**
 * Extract area code from a phone number
 * Handles formats like: +19725551234, 19725551234, 9725551234, (972) 555-1234
 */
function extractAreaCode(phone: string): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If starts with 1 (US country code), skip it
  const withoutCountry = digits.startsWith('1') && digits.length > 10 
    ? digits.slice(1) 
    : digits;
  
  // Area code is the first 3 digits
  if (withoutCountry.length >= 10) {
    return withoutCountry.slice(0, 3);
  }
  
  return null;
}

/**
 * Get nearby area codes for fallback
 * This is a simplified mapping - in production you'd want a more comprehensive list
 */
function getNearbyAreaCodes(areaCode: string): string[] {
  // Major metro area code clusters
  const areaCodeClusters: Record<string, string[]> = {
    // Dallas-Fort Worth
    '214': ['972', '469', '817', '682'],
    '972': ['214', '469', '817', '682'],
    '469': ['214', '972', '817', '682'],
    '817': ['682', '214', '972', '469'],
    '682': ['817', '214', '972', '469'],
    // Houston
    '713': ['281', '832', '346'],
    '281': ['713', '832', '346'],
    '832': ['713', '281', '346'],
    '346': ['713', '281', '832'],
    // Austin
    '512': ['737'],
    '737': ['512'],
    // San Antonio
    '210': ['726'],
    '726': ['210'],
    // Phoenix
    '602': ['480', '623', '520'],
    '480': ['602', '623', '520'],
    '623': ['602', '480', '520'],
    // Los Angeles
    '213': ['310', '323', '424', '818', '626'],
    '310': ['213', '323', '424', '818', '626'],
    '323': ['213', '310', '424', '818', '626'],
    // New York
    '212': ['646', '917', '718', '347', '929'],
    '646': ['212', '917', '718', '347', '929'],
    '917': ['212', '646', '718', '347', '929'],
    // Chicago
    '312': ['773', '872', '708', '847'],
    '773': ['312', '872', '708', '847'],
    // Miami
    '305': ['786', '954', '754'],
    '786': ['305', '954', '754'],
    // Atlanta
    '404': ['678', '770', '470'],
    '678': ['404', '770', '470'],
    '770': ['404', '678', '470'],
  };
  
  return areaCodeClusters[areaCode] || [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { locationId, clientPhone, preferredAreaCode, accessToken } = await req.json();

    // Prefer passed-in OAuth access token; fall back to V2 agency OAuth token
    let rawToken = (typeof accessToken === 'string' && accessToken.trim())
      ? accessToken
      : null;

    if (!rawToken) {
      console.log("[ghl-provision-phone] No accessToken passed, fetching V2 OAuth agency token...");
      rawToken = await getAgencyAccessToken(supabase, 'ghl-provision-phone');
    }

    // Clean up the token if it has Bearer prefix
    const token = rawToken.replace(/^Bearer\s+/i, '').trim();

    if (!locationId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing locationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!clientPhone && !preferredAreaCode) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing clientPhone or preferredAreaCode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine area code to search
    const primaryAreaCode = preferredAreaCode || extractAreaCode(clientPhone);
    if (!primaryAreaCode) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not extract area code from phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Searching for phone number in area code ${primaryAreaCode} for location ${locationId}`);

    // Build list of area codes to try (primary + fallbacks)
    const areaCodesTry = [primaryAreaCode, ...getNearbyAreaCodes(primaryAreaCode)];
    
    let purchasedNumber: string | null = null;
    let searchError: string | null = null;
    let triedAreaCodes: string[] = [];
    let fatalTwilioMissing = false;

    const searchAttempts: SearchAttemptLog[] = [];

    for (const areaCode of areaCodesTry) {
      triedAreaCodes.push(areaCode);
      console.log(`Trying area code: ${areaCode}`);

      try {
        // Step 1: Search for available numbers via GHL Phone System API
        // The UI uses: GET /phone-system/numbers/location/{locationId}/available?countryCode=US&firstPart={areaCode}&...
        let availableNumbers: any[] = [];
        let baseForPurchase: string | null = null;
        let lastNonOk: SearchAttemptLog | null = null;

        for (const base of GHL_API_BASES) {
          // Build the correct search URL matching the UI behavior
          const searchUrl = new URL(`${base}/phone-system/numbers/location/${locationId}/available`);
          searchUrl.searchParams.set("countryCode", "US");
          searchUrl.searchParams.set("firstPart", areaCode);
          searchUrl.searchParams.set("smsEnabled", "true");
          searchUrl.searchParams.set("voiceEnabled", "true");
          searchUrl.searchParams.set("mmsEnabled", "true");
          searchUrl.searchParams.set("numberTypes", "local");

          const url = searchUrl.toString();
          console.log(`Searching: ${url}`);

          let res: Response;
          let text = '';
          try {
            res = await fetch(url, {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Version": "2021-07-28",
                "Accept": "application/json",
              },
            });
            text = await res.text();
            console.log(`Search response status: ${res.status}`);
            console.log(`Search response: ${text.substring(0, 500)}`);
          } catch (fetchErr: any) {
            const msg = fetchErr?.message || String(fetchErr);
            const attempt: SearchAttemptLog = {
              base,
              path: `/phone-system/numbers/location/${locationId}/available`,
              url,
              status: 0,
              responseSnippet: safeSnippet(`fetch_error: ${msg}`),
            };
            searchAttempts.push(attempt);
            lastNonOk = attempt;
            continue;
          }

          const attempt: SearchAttemptLog = {
            base,
            path: `/phone-system/numbers/location/${locationId}/available`,
            url,
            status: res.status,
            responseSnippet: safeSnippet(text),
          };
          searchAttempts.push(attempt);

          if (!res.ok) {
            lastNonOk = attempt;

            // Special-case: this is the *real* blocker for provisioning.
            // If the location has no Twilio account configured, we must stop and surface it
            // (otherwise a later 404 from a different host masks the root cause).
            if (res.status === 422 && text.includes('does not have twilio account')) {
              searchError = `Location does not have a Twilio account configured. Master Twilio injection is required before provisioning. Response: ${safeSnippet(text)}`;
              fatalTwilioMissing = true;
              break;
            }
            continue;
          }

          let searchData: any = null;
          try {
            searchData = JSON.parse(text);
          } catch {
            lastNonOk = {
              ...attempt,
              responseSnippet: `Non-JSON response: ${safeSnippet(text)}`,
            };
            continue;
          }

          availableNumbers = extractNumbersFromSearchResponse(searchData);
          if (availableNumbers.length > 0) {
            baseForPurchase = base;
            break;
          }
        }

        if (fatalTwilioMissing) {
          console.log(`[ghl-provision-phone] Fatal: ${searchError}`);
          break;
        }

        if (!availableNumbers || availableNumbers.length === 0) {
          // If all endpoints 404/failed, surface the *real* reason rather than "No numbers available".
          const last = (lastNonOk ?? null) as SearchAttemptLog | null;
          if (last) {
            searchError = `Phone search failed (${last.status}) at ${last.url}: ${last.responseSnippet}`;
          }
          console.log(`No numbers returned for area code ${areaCode}`);
          continue;
        }

        // Get the first available number
        const selectedNumber = availableNumbers[0];
        const numberToPurchase = selectedNumber.phoneNumber || selectedNumber.number || selectedNumber;
        
        console.log(`Found available number: ${numberToPurchase}`);

        // Step 2: Purchase the number (use the same base that worked for search, with fallback)
        const basesToTryForPurchase = [
          ...(baseForPurchase ? [baseForPurchase] : []),
          ...GHL_API_BASES.filter((b) => b !== baseForPurchase),
        ];

        let purchased = false;
        for (const base of basesToTryForPurchase) {
          for (const path of GHL_PHONE_PURCHASE_PATHS) {
            const purchaseUrl = `${base}${path}`;
            console.log(`Purchasing via: ${purchaseUrl}`);

            const purchaseResponse = await fetch(purchaseUrl, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Version": "2021-07-28",
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
              body: JSON.stringify({
                locationId: locationId,
                phoneNumber: numberToPurchase,
                type: "local",
              }),
            });

            const purchaseText = await purchaseResponse.text();
            console.log(`Purchase response status: ${purchaseResponse.status}`);
            console.log(`Purchase response: ${purchaseText}`);

            if (purchaseResponse.ok) {
              purchasedNumber = numberToPurchase;
              console.log(`Successfully purchased number: ${purchasedNumber}`);
              purchased = true;
              break;
            }

            // capture the best error to return if we exhaust all options
            searchError = `Purchase failed (${purchaseResponse.status}) at ${purchaseUrl}: ${safeSnippet(purchaseText)}`;
          }
          if (purchased) break;
        }

        if (purchased) break;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`Error with area code ${areaCode}:`, errorMessage);
        searchError = errorMessage;
      }

      if (fatalTwilioMissing) break;
    }

    if (purchasedNumber) {
      return new Response(
        JSON.stringify({
          success: true,
          phoneNumber: purchasedNumber,
          areaCode: primaryAreaCode,
          triedAreaCodes: triedAreaCodes,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            searchError ||
            `No phone numbers available in area codes: ${triedAreaCodes.join(", ")}`,
          triedAreaCodes: triedAreaCodes,
          debug: {
            // Provide lightweight diagnostics to Step 12 without dumping huge logs.
            searchAttempts: searchAttempts.slice(-6),
          },
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in ghl-provision-phone:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
