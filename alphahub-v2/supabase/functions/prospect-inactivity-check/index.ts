import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// GHL API base URL
const GHL_API_BASE = "https://services.leadconnectorhq.com";

// Hard-coded prospect location ID
const GHL_PROSPECT_LOCATION_ID = "wDoj91sbkfxZnMbow2G5";

interface FieldMapping {
  internal_field_name: string;
  ghl_field_id: string | null;
  ghl_field_key: string | null;
  is_enabled: boolean;
}

type MappingTarget = {
  ghl_field_id: string | null;
  ghl_field_key: string | null;
};

type CustomFieldBuildResult = {
  customFields: { id: string; value: string | null }[];
  skipped: { internal_field_name: string; reason: string }[];
};

type PartialSyncResult = {
  contactUpdateOk: boolean;
  contactUpdateError?: { status: number; body: string };
  tagOk: boolean;
  tagError?: { status: number; body: string; attempts: number };
  skippedCustomFields: { internal_field_name: string; reason: string }[];
};

function safeJsonStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "\"[unstringifiable]\"";
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createSystemAlert(
  supabase: any,
  args: {
    alert_type: string;
    severity: "info" | "warning" | "critical" | string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const { error } = await supabase.from("system_alerts").insert({
      alert_type: args.alert_type,
      severity: args.severity,
      title: args.title,
      message: args.message,
      metadata: args.metadata ?? {},
    });

    if (error) {
      console.error("[System Alerts] Insert failed:", error);
    }
  } catch (err) {
    console.error("[System Alerts] Exception inserting alert:", err);
  }
}

async function getFieldMappingTargets(supabase: any): Promise<Record<string, MappingTarget>> {
  try {
    const { data: mappings, error } = await supabase
      .from("prospect_field_mappings")
      .select("internal_field_name, ghl_field_id, ghl_field_key, is_enabled")
      .eq("location_id", GHL_PROSPECT_LOCATION_ID)
      .eq("is_enabled", true);

    if (error) {
      console.error("[Field Mappings] Error fetching mappings:", error);
      return {};
    }

    const mappingMap: Record<string, MappingTarget> = {};
    for (const m of (mappings || []) as FieldMapping[]) {
      mappingMap[m.internal_field_name] = {
        ghl_field_id: m.ghl_field_id ?? null,
        ghl_field_key: m.ghl_field_key ?? null,
      };
    }

    console.log(`[Field Mappings] Loaded ${Object.keys(mappingMap).length} mapping targets`);
    return mappingMap;
  } catch (err) {
    console.error("[Field Mappings] Exception:", err);
    return {};
  }
}

function buildCustomFields(
  mappingTargets: Record<string, MappingTarget>,
  fieldValues: Record<string, string | null | undefined>
): CustomFieldBuildResult {
  const customFields: { id: string; value: string | null }[] = [];
  const skipped: { internal_field_name: string; reason: string }[] = [];

  for (const [internal_field_name, value] of Object.entries(fieldValues)) {
    const target = mappingTargets[internal_field_name];
    if (!target) continue;

    if (!target.ghl_field_id) {
      skipped.push({
        internal_field_name,
        reason: "Mapped field is missing ghl_field_id (cannot send to GHL API)",
      });
      continue;
    }

    if (value === undefined) continue;

    customFields.push({
      id: target.ghl_field_id,
      value: value || null,
    });
  }

  return { customFields, skipped };
}

/**
 * Get location access token via crm-location-token
 */
async function getLocationToken(supabase: any): Promise<string | null> {
  try {
    const { data: tokenRecord } = await supabase
      .from("ghl_oauth_tokens")
      .select("company_id")
      .maybeSingle();

    if (!tokenRecord?.company_id) {
      return null;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const response = await fetch(`${supabaseUrl}/functions/v1/crm-location-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        companyId: tokenRecord.company_id,
        locationId: GHL_PROSPECT_LOCATION_ID,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.locationAccessToken || null;
  } catch (error) {
    console.error("[Inactivity Check] Error getting location token:", error);
    return null;
  }
}

/**
 * Update contact in GHL with partial data
 */
async function updateContactWithPartialData(
  contactId: string,
  accessToken: string,
  partialAnswers: Record<string, any>
): Promise<PartialSyncResult> {
  try {
    const updateUrl = `${GHL_API_BASE}/contacts/${contactId}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const mappingTargets = await getFieldMappingTargets(supabase);

    // Only sync partial answers - do NOT set stage or qualified_path
    // GHL workflow owns abandonment decision; we just sync the data + apply tag
    const fieldValues: Record<string, string | null | undefined> = {
      licensed_status: partialAnswers.licensed_status || null,
      states_licensed: Array.isArray(partialAnswers.states_licensed)
        ? partialAnswers.states_licensed.join(", ")
        : partialAnswers.states_licensed || null,
      monthly_budget_range: partialAnswers.monthly_budget_range || null,
      payment_plan_interest: partialAnswers.payment_plan_interest || null,
      desired_timeline: partialAnswers.desired_timeline || null,
      current_bottleneck: partialAnswers.current_bottleneck || null,
      step_reached: partialAnswers.step_reached || null,
    };

    const { customFields, skipped } = buildCustomFields(mappingTargets, fieldValues);

    if (skipped.length > 0) {
      console.warn("[Inactivity Check] Skipped custom fields due to mapping issues:", skipped);
    }

    // Update custom fields
    let contactUpdateOk = true;
    let contactUpdateError: { status: number; body: string } | undefined;
    const updateRes = await fetch(updateUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify({ customFields }),
    });

    if (!updateRes.ok) {
      contactUpdateOk = false;
      const body = await updateRes.text().catch(() => "");
      contactUpdateError = { status: updateRes.status, body };
      console.error("[Inactivity Check] Contact update failed:", updateRes.status, body);
    }

    // Apply form-abandoned tag after successful custom field update
    let tagOk = true;
    let tagError: { status: number; body: string; attempts: number } | undefined;
    if (contactUpdateOk) {
      const tagUrl = `${GHL_API_BASE}/contacts/${contactId}/tags`;
      const tagRes = await fetch(tagUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28",
        },
        body: JSON.stringify({ tags: ["form-abandoned"] }),
      });

      if (!tagRes.ok) {
        tagOk = false;
        const body = await tagRes.text().catch(() => "");
        tagError = { status: tagRes.status, body, attempts: 1 };
        console.error("[Inactivity Check] Tag application failed:", tagRes.status, body);
      } else {
        console.log("[Inactivity Check] Applied form-abandoned tag to contact:", contactId);
      }
    }

    return {
      contactUpdateOk,
      contactUpdateError,
      tagOk,
      tagError,
      skippedCustomFields: skipped,
    };
  } catch (error) {
    console.error("[Inactivity Check] Update error:", error);
    return {
      contactUpdateOk: false,
      contactUpdateError: { status: 0, body: error instanceof Error ? error.message : "Unknown error" },
      tagOk: true,
      tagError: undefined,
      skippedCustomFields: [],
    };
  }
}

/**
 * Cron job: Check for abandoned applications (inactive > 2 minutes)
 * Synces partial answers to GHL after inactivity.
 * GHL workflow owns abandonment decision + tagging.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("[Inactivity Check] Running abandoned application check...");

    // Find prospects that:
    // 1. Have activity > 2 minutes ago
    // 2. Form not completed
    // 3. Have a GHL contact ID
    // 4. Have meaningful partial answers (started the form)
    // 5. Haven't advanced to qualification submit yet
    // 6. Haven't already been partially synced
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const { data: abandonedProspects, error } = await supabase
      .from("prospects")
      .select("id, ghl_contact_id, partial_answers, qualified_path, status, name, email, qualification_submit_at, partial_sync_sent_at")
      .lt("last_activity_at", twoMinutesAgo)
      .is("form_completed_at", null)
      .eq("status", "contact_captured")
      .or("qualified_path.eq.Contact Captured,qualified_path.is.null")
      .is("qualification_submit_at", null)
      .is("partial_sync_sent_at", null)
      .not("partial_answers", "is", null)
      .limit(50);

    if (error) {
      console.error("[Inactivity Check] Query error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!abandonedProspects || abandonedProspects.length === 0) {
      console.log("[Inactivity Check] No abandoned applications found");
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

     console.log(`[Inactivity Check] Found ${abandonedProspects.length} inactive prospects needing partial sync`);

    // Get access token once for all updates
    const accessToken = await getLocationToken(supabase);
    
    if (!accessToken) {
      console.error("[Inactivity Check] Could not get GHL access token");
      return new Response(
        JSON.stringify({ success: false, error: "Could not get GHL access token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    let failed = 0;

    for (const prospect of abandonedProspects) {
      try {
        if (!prospect.ghl_contact_id) {
          await createSystemAlert(supabase, {
            alert_type: "abandonment_missing_ghl_contact_id",
            severity: "critical",
            title: "Abandonment could not tag (missing GHL contact id)",
            message: "Prospect matched abandonment criteria but has no GHL contact id; cannot apply form-abandoned tag.",
            metadata: {
              prospect_id: prospect.id,
              email: prospect.email,
              status: prospect.status,
              qualified_path: prospect.qualified_path,
              last_activity_at_threshold: twoMinutesAgo,
            },
          });
          failed++;
          console.error(
            `[Inactivity Check] Prospect ${prospect.id} matched abandonment criteria but has null ghl_contact_id`
          );
          continue;
        }

        // Skip if partial answers are empty/non-object (defensive)
        const partial = (prospect.partial_answers && typeof prospect.partial_answers === "object")
          ? prospect.partial_answers
          : {};
        if (Object.keys(partial).length === 0) {
          console.log(`[Inactivity Check] Prospect ${prospect.id} has no meaningful partial_answers; skipping`);
          continue;
        }

        // Transactional-ish claim + re-check advanced state: only one run will claim, and only if still not advanced.
        const claimAt = new Date().toISOString();
        const { data: claimedRow, error: claimError } = await supabase
          .from("prospects")
          .update({ partial_sync_sent_at: claimAt, updated_at: claimAt })
          .eq("id", prospect.id)
          .is("partial_sync_sent_at", null)
          .is("qualification_submit_at", null)
          .eq("status", "contact_captured")
          .or("qualified_path.eq.Contact Captured,qualified_path.is.null")
          .select("id, ghl_contact_id, partial_answers")
          .maybeSingle();

        if (claimError) {
          console.error(`[Inactivity Check] Claim update failed for ${prospect.id}:`, claimError);
          failed++;
          continue;
        }
        if (!claimedRow) {
          console.log(`[Inactivity Check] Prospect ${prospect.id} is no longer eligible (advanced or already synced); skipping`);
          continue;
        }

        const claimedPartial = (claimedRow.partial_answers && typeof claimedRow.partial_answers === "object")
          ? claimedRow.partial_answers
          : {};
        if (Object.keys(claimedPartial).length === 0) {
          // Un-claim so we can sync later if they answer something meaningful.
          await supabase
            .from("prospects")
            .update({ partial_sync_sent_at: null })
            .eq("id", claimedRow.id);
          console.log(`[Inactivity Check] Claimed prospect ${prospect.id} but partial_answers empty; unclaimed and skipped`);
          continue;
        }

        // Update GHL with partial custom fields only (no tagging)
        const syncResult = await updateContactWithPartialData(
          claimedRow.ghl_contact_id,
          accessToken,
          claimedPartial
        );

        // Backend-only alert if we skipped any mapped fields
        if (syncResult.skippedCustomFields.length > 0) {
          await createSystemAlert(supabase, {
            alert_type: "ghl_abandoned_custom_field_skipped",
            severity: "warning",
            title: "Abandonment sync skipped some custom fields",
            message: `Skipped ${syncResult.skippedCustomFields.length} custom fields while syncing abandoned application.`,
            metadata: {
              prospect_id: prospect.id,
              ghl_contact_id: prospect.ghl_contact_id,
              skipped: syncResult.skippedCustomFields,
              partial_answers: prospect.partial_answers ?? {},
            },
          });
        }

        if (!syncResult.contactUpdateOk) {
          // Un-claim so the next run can retry.
          await supabase
            .from("prospects")
            .update({ partial_sync_sent_at: null })
            .eq("id", prospect.id);

          await createSystemAlert(supabase, {
            alert_type: "ghl_partial_sync_failed",
            severity: "warning",
            title: "Partial sync failed to update contact custom fields",
            message: `GHL contact update failed while syncing partial answers after inactivity.`,
            metadata: {
              prospect_id: prospect.id,
              ghl_contact_id: prospect.ghl_contact_id,
              http_status: syncResult.contactUpdateError?.status ?? 0,
              response_body: syncResult.contactUpdateError?.body ?? "",
              last_activity_at_threshold: twoMinutesAgo,
              partial_answers: claimedPartial,
            },
          });

          failed++;
          continue;
        }

        // Log one-time partial sync activity (GHL workflow owns abandonment)
        await supabase.from("prospect_activities").insert({
          prospect_id: prospect.id,
          activity_type: "partial_sync_sent",
          activity_data: {
            processed_at: new Date().toISOString(),
            step_reached: claimedPartial?.step_reached || "unknown",
            keys_synced: Object.keys(claimedPartial),
          },
        });

        processed++;
        console.log(`[Inactivity Check] Partial sync complete for prospect: ${prospect.id}`);
      } catch (err) {
        console.error(`[Inactivity Check] Error processing ${prospect.id}:`, err);
        // Best-effort: un-claim to allow retry
        await supabase
          .from("prospects")
          .update({ partial_sync_sent_at: null })
          .eq("id", prospect.id);
        failed++;
      }
    }

    console.log(`[Inactivity Check] Complete. Processed: ${processed}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        total: abandonedProspects.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Inactivity Check] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
