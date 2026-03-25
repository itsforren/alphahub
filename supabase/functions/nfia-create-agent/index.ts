import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_US_STATE_CODES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
]);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

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

  if (typeof value === "string") {
    const trimmed = value.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try { return normalizeStatesLicensed(JSON.parse(trimmed)); } catch { /* fall through */ }
    }
  }

  if (Array.isArray(value)) {
    return value.map(extractPrimitive).map((s) => s.trim()).filter(Boolean);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort((a, b) => {
      const an = Number(a[0]);
      const bn = Number(b[0]);
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
      return String(a[0]).localeCompare(String(b[0]));
    });
    return entries.map(([, v]) => extractPrimitive(v).trim()).filter(Boolean);
  }

  return String(value).split(/[\s\n,]+/).map((s) => s.trim()).filter(Boolean);
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

    // Validate required fields
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

    const computedSlug = (slug && String(slug).trim())
      ? slugify(String(slug).trim())
      : slugify(String(fullname));

    const licenseStatesString = statesLicensed.join(", ");
    const firstName = String(fullname).split(/\s+/)[0] || fullname;

    // Upsert directly into nfia_agents table (rebuild-nfia reads from here)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const agentRow = {
      fullname: String(fullname),
      slug: computedSlug,
      consultation_name: firstName,
      email: String(email),
      phone: String(phone),
      npn: String(npn),
      license: `NAFIV${String(npn).slice(-2) || "00"}`,
      license_states: licenseStatesString,
      states_count: statesLicensed.length,
      years_experience: "1+",
      bio: String(bio),
      headshot_url: String(headshotUrl),
      scheduleurl: String(scheduleurl),
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Check if agent with this slug already exists
    const { data: existing } = await supabase
      .from("nfia_agents")
      .select("id")
      .eq("slug", computedSlug)
      .maybeSingle();

    let data;
    let error;

    if (existing) {
      // Update existing record
      const result = await supabase
        .from("nfia_agents")
        .update(agentRow)
        .eq("id", existing.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Insert new record
      const result = await supabase
        .from("nfia_agents")
        .insert(agentRow)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error(`[nfia-create-agent] request_id=${requestId} Supabase error:`, error);
      throw new Error(`Failed to upsert nfia_agents: ${error.message}`);
    }

    const nfiaUrl = `https://www.nationalfia.org/agent/${computedSlug}`;
    console.log(`[nfia-create-agent] request_id=${requestId} NFIA agent created:`, nfiaUrl);

    return new Response(
      JSON.stringify({
        success: true,
        nfia_url: nfiaUrl,
        agent_id: data.id,
        slug: computedSlug,
        request_id: requestId,
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
