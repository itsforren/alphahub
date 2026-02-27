import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationResult {
  step: string;
  success: boolean;
  details: string;
  url?: string;
}

async function checkPageLive(url: string): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return { ok: response.ok, status: response.status };
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, status: 0, error };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const { client_id, run_lead_test = true } = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: "client_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .single();

    if (clientError || !client) {
      throw new Error(`Client not found: ${clientError?.message}`);
    }

    console.log("Verifying onboarding for:", client.name);
    const results: VerificationResult[] = [];

    // Check all pages
    const pageChecks = [
      { key: "scheduler_link", step: "scheduler_page", label: "Scheduler page" },
      { key: "lander_link", step: "lander_page", label: "Lander page" },
      { key: "tfwp_profile_link", step: "profile_page", label: "Profile page" },
      { key: "thankyou_link", step: "thankyou_page", label: "Thank You page" },
      { key: "nfia_link", step: "nfia_page", label: "NFIA page" },
    ];

    for (const check of pageChecks) {
      const url = client[check.key];
      if (url) {
        const result = await checkPageLive(url);
        results.push({
          step: check.step,
          success: result.ok,
          details: result.ok ? `${check.label} is live` : result.error || `HTTP ${result.status}`,
          url
        });
      }
    }

    // Check GHL subaccount
    results.push({
      step: "ghl_subaccount",
      success: !!client.subaccount_id,
      details: client.subaccount_id ? `Subaccount ID: ${client.subaccount_id}` : "No subaccount ID found"
    });

    // Check Google Ads
    results.push({
      step: "google_ads",
      success: !!client.google_campaign_id,
      details: client.google_campaign_id ? `Campaign ID: ${client.google_campaign_id}` : "No campaign ID found"
    });

    // AI Lead Test
    if (run_lead_test && client.lander_link && LOVABLE_API_KEY) {
      console.log("Running AI-powered lead flow test...");
      
      try {
        const testLeadResponse = await fetch(`${supabaseUrl}/functions/v1/send-test-lead`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({ agentId: client.agent_id, clientId: client.id })
        });

        const testLeadResult = await testLeadResponse.json();
        
        if (testLeadResponse.ok && testLeadResult.success) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const { data: leads } = await supabase
            .from("leads")
            .select("id, status, ghl_contact_id")
            .eq("client_id", client.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (leads && leads.length > 0) {
            results.push({ step: "lead_flow_alpha_hub", success: true, details: `Test lead in Alpha Hub (ID: ${leads[0].id})` });
            results.push({ step: "lead_flow_ghl", success: !!leads[0].ghl_contact_id, details: leads[0].ghl_contact_id ? "Delivered to GHL" : "Pending GHL delivery" });
          } else {
            results.push({ step: "lead_flow_alpha_hub", success: false, details: "Test lead not found" });
          }
        }
      } catch (testError: unknown) {
        const msg = testError instanceof Error ? testError.message : "Unknown error";
        results.push({ step: "lead_flow_test", success: false, details: `Test failed: ${msg}` });
      }
    }

    const totalChecks = results.length;
    const passedChecks = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ success: passedChecks === totalChecks, total_checks: totalChecks, passed_checks: passedChecks, results, client_name: client.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error verifying onboarding:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to verify onboarding";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
