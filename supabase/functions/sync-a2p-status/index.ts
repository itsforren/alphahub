import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { clientId } = await req.json();

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "clientId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client data
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, subaccount_id")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      throw new Error(`Client not found: ${clientError?.message}`);
    }

    if (!client.subaccount_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No subaccount_id - client not connected to GHL" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Syncing A2P status for ${client.name} (${client.subaccount_id})`);

    // Get location token from GHL
    const tokenResponse = await fetch(`${supabaseUrl}/functions/v1/crm-location-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ 
        companyId: Deno.env.get("GHL_COMPANY_ID"),
        locationId: client.subaccount_id 
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error("Failed to get location token:", err);
      throw new Error("Failed to get GHL location token");
    }

    const { accessToken } = await tokenResponse.json();

    // Fetch A2P registration status from GHL
    // Note: GHL's A2P endpoint path may vary - adjust if needed
    const a2pResponse = await fetch(
      `https://services.leadconnectorhq.com/locations/${client.subaccount_id}/settings/a2p`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Version": "2021-07-28",
          "Accept": "application/json",
        },
      }
    );

    let a2pData: any = null;
    let brandStatus: string | null = null;
    let campaignStatus: string | null = null;
    let brandId: string | null = null;
    let campaignId: string | null = null;

    if (a2pResponse.ok) {
      a2pData = await a2pResponse.json();
      console.log("A2P data from GHL:", JSON.stringify(a2pData));

      // Extract status from response - GHL structure varies
      // Try to find brand and campaign registration status
      brandStatus = a2pData?.brand?.status || a2pData?.brandStatus || null;
      campaignStatus = a2pData?.campaign?.status || a2pData?.campaignStatus || null;
      brandId = a2pData?.brand?.id || a2pData?.brandId || null;
      campaignId = a2pData?.campaign?.id || a2pData?.campaignId || null;

      // Normalize status values
      if (brandStatus) {
        brandStatus = brandStatus.toLowerCase();
        // Map GHL statuses to our normalized values
        if (["approved", "verified", "active"].includes(brandStatus)) {
          brandStatus = "approved";
        } else if (["pending", "in_review", "submitted"].includes(brandStatus)) {
          brandStatus = "pending";
        } else if (["rejected", "failed", "denied"].includes(brandStatus)) {
          brandStatus = "rejected";
        }
      }

      if (campaignStatus) {
        campaignStatus = campaignStatus.toLowerCase();
        if (["approved", "verified", "active"].includes(campaignStatus)) {
          campaignStatus = "approved";
        } else if (["pending", "in_review", "submitted"].includes(campaignStatus)) {
          campaignStatus = "pending";
        } else if (["rejected", "failed", "denied"].includes(campaignStatus)) {
          campaignStatus = "rejected";
        }
      }
    } else {
      console.log("A2P endpoint returned:", a2pResponse.status);
      // If endpoint doesn't exist or returns error, try alternative location settings endpoint
      const settingsResponse = await fetch(
        `https://services.leadconnectorhq.com/locations/${client.subaccount_id}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Version": "2021-07-28",
            "Accept": "application/json",
          },
        }
      );

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        console.log("Location settings data:", JSON.stringify(settingsData?.location?.settings?.a2p || {}));
        
        // Try to extract A2P info from location settings
        const a2pSettings = settingsData?.location?.settings?.a2p || settingsData?.settings?.a2p || {};
        brandStatus = a2pSettings?.brandStatus || null;
        campaignStatus = a2pSettings?.campaignStatus || null;
        brandId = a2pSettings?.brandId || null;
        campaignId = a2pSettings?.campaignId || null;
      }
    }

    // Update client with A2P status
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        a2p_brand_status: brandStatus,
        a2p_campaign_status: campaignStatus,
        a2p_brand_id: brandId,
        a2p_campaign_id: campaignId,
        a2p_last_synced_at: new Date().toISOString(),
      })
      .eq("id", clientId);

    if (updateError) {
      console.error("Failed to update client A2P status:", updateError);
      throw new Error(`Failed to update client: ${updateError.message}`);
    }

    console.log(`A2P status synced for ${client.name}: brand=${brandStatus}, campaign=${campaignStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        brandStatus,
        campaignStatus,
        brandId,
        campaignId,
        syncedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error syncing A2P status:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
