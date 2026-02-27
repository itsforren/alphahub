import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NFIA_API_URL = "https://www.nationalfia.org/api/create-agent";

const VALID_US_STATE_CODES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
]);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

const isLikelyImageContentType = (contentType: string | null) => {
  if (!contentType) return false;
  const ct = contentType.toLowerCase();
  return ct.startsWith("image/");
};

const probeUrl = async (url: string) => {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // Try to avoid downloading large bodies, while still allowing servers that ignore Range.
        "Range": "bytes=0-1023",
        "Accept": "image/*,*/*;q=0.8",
      },
    });

    const contentType = res.headers.get("content-type");
    const contentLength = res.headers.get("content-length");

    // Read a small sample for debugging when content-type looks wrong.
    let sampleText: string | null = null;
    try {
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf).slice(0, 256);
      // Best effort: decode as text; if binary it will be garbage but still useful.
      sampleText = new TextDecoder().decode(bytes);
    } catch {
      // ignore
    }

    return {
      ok: res.ok,
      status: res.status,
      contentType,
      contentLength,
      sampleText,
      ms: Date.now() - startedAt,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      status: 0,
      contentType: null,
      contentLength: null,
      sampleText: message,
      ms: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeStatesLicensed = (value: unknown): string[] => {
  const extractPrimitive = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);

    if (typeof v === "object") {
      const anyV = v as Record<string, unknown>;
      const direct = anyV.value ?? anyV.Value ?? anyV.state ?? anyV.State;
      if (typeof direct === "string" || typeof direct === "number" || typeof direct === "boolean") {
        return String(direct);
      }
      const firstPrimitive = Object.values(anyV).find(
        (x) => typeof x === "string" || typeof x === "number" || typeof x === "boolean",
      );
      if (firstPrimitive !== undefined) return String(firstPrimitive);
    }

    return "";
  };

  if (value === null || value === undefined) return [];

  // If we get a JSON string stored in a text field, try to parse it.
  if (typeof value === "string") {
    const trimmed = value.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        return normalizeStatesLicensed(JSON.parse(trimmed));
      } catch {
        // fall through
      }
    }
  }

  if (Array.isArray(value)) {
    return value.map(extractPrimitive).map((s) => s.trim()).filter(Boolean);
  }

  // Zapier "Line items" objects:
  // { "1": "TX", "2": "FL", ... }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort((a, b) => {
      const an = Number(a[0]);
      const bn = Number(b[0]);
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
      return String(a[0]).localeCompare(String(b[0]));
    });

    return entries
      .map(([, v]) => extractPrimitive(v).trim())
      .filter(Boolean);
  }

  const str = String(value);

  // Handle comma/newline/space-separated strings, incl. Zapier's "1 TX 2 FL" style text.
  return str
    .split(/[\s\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    const {
      fullname,
      scheduleurl,
      email,
      phone,
      bio,
      headshotUrl,
      stateslicensed,
      npn,
      slug,
    } = await req.json();

    const statesLicensedRaw = normalizeStatesLicensed(stateslicensed);
    const statesLicensed = Array.from(
      new Set(
        statesLicensedRaw
          .map((s) => s.toUpperCase())
          .filter((s) => s.length === 2 && VALID_US_STATE_CODES.has(s)),
      ),
    );

    // Validate required fields (NFIA page breaks if these are missing)
    const missing: string[] = [];
    if (!fullname) missing.push("fullname");
    if (!email) missing.push("email");
    if (!phone) missing.push("phone");
    if (!bio) missing.push("bio");
    if (!headshotUrl) missing.push("headshotUrl");
    if (statesLicensed.length === 0) missing.push("stateslicensed");
    if (!scheduleurl) missing.push("scheduleurl");
    if (!npn) missing.push("npn");

    if (missing.length > 0) {
      return new Response(
        JSON.stringify({ error: `Missing required fields: ${missing.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[nfia-create-agent] request_id=${requestId} Creating NFIA page for:`, fullname);

    // Preflight: verify headshot URL is reachable and looks like an image.
    // This isolates third-party NFIA failures (500) from our own input issues.
    const headshotProbe = await probeUrl(String(headshotUrl));
    console.log(`[nfia-create-agent] request_id=${requestId} headshot preflight:`, JSON.stringify(headshotProbe));
    if (!headshotProbe.ok || !isLikelyImageContentType(headshotProbe.contentType)) {
      return new Response(
        JSON.stringify({
          error: "Headshot URL is not reachable as an image (preflight failed)",
          request_id: requestId,
          diagnostics: {
            headshotUrl,
            headshotProbe,
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Prefer provided slug (from automation), but normalize it to NFIA-safe format.
    // Desired format: agent_id-firstname-lastname
    const computedSlug = (slug && String(slug).trim())
      ? slugify(String(slug).trim())
      : slugify(String(fullname));

    // NFIA uses license_states field with format "OH,AK,AL,AR" (no spaces)
    const licenseStatesString = statesLicensed.join(",");

    const payload = {
      fullname,
      scheduleurl,
      email,
      phone,
      bio,
      headshotUrl,
      // The correct field for NFIA is license_states as a comma-separated string
      license_states: licenseStatesString,
      // NFIA uses npn_number for the NPN Number field
      npn_number: npn,
      // NFIA may accept either an object or string depending on their backend.
      // We'll try object format first to preserve existing behavior.
      slug: { current: computedSlug },
    };

    console.log(`[nfia-create-agent] request_id=${requestId} Raw stateslicensed input:`, stateslicensed);
    console.log(`[nfia-create-agent] request_id=${requestId} Normalized statesLicensed array:`, statesLicensed);
    console.log(`[nfia-create-agent] request_id=${requestId} NFIA license_states (final string):`, licenseStatesString);
    console.log(`[nfia-create-agent] request_id=${requestId} NFIA payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(NFIA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log(`[nfia-create-agent] request_id=${requestId} NFIA API response status:`, response.status);
    console.log(`[nfia-create-agent] request_id=${requestId} NFIA API response:`, responseText);

    // If NFIA rejected the object-based slug, retry once with a plain string slug.
    if (!response.ok) {
      console.log(`[nfia-create-agent] request_id=${requestId} NFIA request failed; retrying once with slug as string`);

      const retryPayload = {
        ...payload,
        // override slug format
        slug: computedSlug,
      };

      const retryResponse = await fetch(NFIA_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(retryPayload),
      });

      const retryText = await retryResponse.text();
      console.log(`[nfia-create-agent] request_id=${requestId} NFIA retry response status:`, retryResponse.status);
      console.log(`[nfia-create-agent] request_id=${requestId} NFIA retry response:`, retryText);

      if (!retryResponse.ok) {
        throw new Error(
          `NFIA API error (initial + retry): ${response.status} - ${responseText} | retry ${retryResponse.status} - ${retryText}`,
        );
      }

      // Use retry response
      let retryData: any;
      try {
        retryData = JSON.parse(retryText);
      } catch {
        retryData = { url: retryText };
      }

      // Extract the NFIA page URL from response
      let retryUrl = retryData.url || retryData.agentUrl || retryData.pageUrl;
      const retryReturnedSlug =
        typeof retryData.slug === "string"
          ? retryData.slug
          : retryData.slug?.current;

      if (!retryUrl && retryReturnedSlug) retryUrl = `https://www.nationalfia.org/agent/${retryReturnedSlug}`;
      if (!retryUrl && computedSlug) retryUrl = `https://www.nationalfia.org/agent/${computedSlug}`;
      if (!retryUrl && typeof retryData === "string") retryUrl = retryData;
      if (!retryUrl) throw new Error("Could not extract NFIA page URL from retry response");

      console.log(`[nfia-create-agent] request_id=${requestId} NFIA page created successfully (retry):`, retryUrl);

      return new Response(
        JSON.stringify({
          success: true,
          nfia_url: retryUrl,
          response: retryData,
          request_id: requestId,
          headshot_preflight: headshotProbe,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { url: responseText };
    }

    // Extract the NFIA page URL from response
    let nfiaUrl = responseData.url || responseData.agentUrl || responseData.pageUrl;

    const returnedSlug =
      typeof responseData.slug === "string"
        ? responseData.slug
        : responseData.slug?.current;

    if (!nfiaUrl && returnedSlug) {
      nfiaUrl = `https://www.nationalfia.org/agent/${returnedSlug}`;
    }

    if (!nfiaUrl && computedSlug) {
      nfiaUrl = `https://www.nationalfia.org/agent/${computedSlug}`;
    }

    if (!nfiaUrl && typeof responseData === "string") {
      nfiaUrl = responseData;
    }

    if (!nfiaUrl) {
      console.log("Full response data:", responseData);
      throw new Error("Could not extract NFIA page URL from response");
    }

    console.log("NFIA page created successfully:", nfiaUrl);

    return new Response(
      JSON.stringify({
        success: true,
        nfia_url: nfiaUrl,
        response: responseData,
        request_id: requestId,
        headshot_preflight: headshotProbe,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Error creating NFIA page:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create NFIA page";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
