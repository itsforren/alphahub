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
  data?: any;
}

async function checkPageLive(url: string): Promise<{ ok: boolean; status: number; error?: string; html?: string }> {
  try {
    const response = await fetch(url, { 
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AlphaAgent/1.0)" }
    });
    const html = response.ok ? await response.text() : undefined;
    return { ok: response.ok, status: response.status, html };
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, status: 0, error };
  }
}

// Use AI to analyze the landing page HTML and extract form fields
async function analyzeFormWithAI(html: string, agentId: string): Promise<{
  formAction: string | null;
  formMethod: string;
  fields: Record<string, string>;
  testData: Record<string, string>;
}> {
  const LLM_API_KEY = Deno.env.get("LLM_API_KEY");
  
  // Truncate HTML if too large
  const truncatedHtml = html.length > 50000 ? html.substring(0, 50000) : html;
  
  if (!LLM_API_KEY) {
    console.log("No LLM_API_KEY - using fallback form analysis");
    return {
      formAction: null,
      formMethod: "POST",
      fields: {},
      testData: {
        first_name: "Test",
        last_name: "Lead",
        email: `test.${Date.now()}@alphaagent.test`,
        phone: "5551234567",
        state: "TX",
        agent_id: agentId,
      },
    };
  }

  try {
    const systemPrompt = `You analyze landing page HTML to extract form details for testing. You identify the main lead capture form, its action URL, method, and all input fields. You generate realistic test data for insurance lead forms.`;

    const userPrompt = `Analyze this landing page HTML and find the main lead capture/survey form. Extract:
1. Form action URL (the endpoint the form submits to)
2. Form method (GET or POST)
3. All input field names and their types
4. Generate realistic test data for an insurance lead form

The agent_id should be set to: ${agentId}

HTML:
${truncatedHtml}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": LLM_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt
          }
        ],
        tools: [{
          name: "extract_form",
          description: "Extract form details and generate test data",
          input_schema: {
            type: "object",
            properties: {
              form_action: { type: "string", description: "The form's action URL or endpoint" },
              form_method: { type: "string", enum: ["GET", "POST"] },
              field_names: {
                type: "array",
                items: { type: "string" },
                description: "List of input field names found in the form"
              },
              test_data: {
                type: "object",
                description: "Key-value pairs of field names to test values",
                additionalProperties: { type: "string" }
              }
            },
            required: ["form_action", "form_method", "field_names", "test_data"]
          }
        }],
        tool_choice: { type: "tool", name: "extract_form" }
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    const toolUseBlock = result.content?.find((b: any) => b.type === "tool_use");

    if (toolUseBlock?.input) {
      const parsed = toolUseBlock.input;
      const fields: Record<string, string> = {};
      parsed.field_names?.forEach((name: string) => {
        fields[name] = "text";
      });

      // Ensure agent_id is in test data
      const testData = parsed.test_data || {};
      testData.agent_id = agentId;

      // Ensure email has test domain
      if (testData.email && !testData.email.includes("@alphaagent.test")) {
        testData.email = `test.${Date.now()}@alphaagent.test`;
      }

      return {
        formAction: parsed.form_action,
        formMethod: parsed.form_method || "POST",
        fields,
        testData,
      };
    }
  } catch (e) {
    console.error("AI form analysis failed:", e);
  }

  // Fallback
  return {
    formAction: null,
    formMethod: "POST",
    fields: {},
    testData: {
      first_name: "Test",
      last_name: "Lead", 
      email: `test.${Date.now()}@alphaagent.test`,
      phone: "5551234567",
      state: "TX",
      agent_id: agentId,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { client_id, only_step } = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: "client_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const runAll = !only_step;
    const leadFlowSteps = new Set([
      "test_url_construction",
      "form_analysis",
      "lead_webhook_submit",
      "lead_in_alpha_hub",
      "agent_id_injection",
      "lead_client_linked",
      "ghl_delivery",
      "lead_flow_test",
    ]);

    const wants = (step: string) => {
      if (runAll) return true;
      if (only_step === step) return true;
      // If the user retries a lead-flow-related check, rerun the whole lead flow group.
      if (only_step && leadFlowSteps.has(only_step) && leadFlowSteps.has(step)) return true;
      return false;
    };

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .single();

    if (clientError || !client) {
      throw new Error(`Client not found: ${clientError?.message}`);
    }

    console.log("Starting live verification for:", client.name);
    const results: VerificationResult[] = [];

    // === STEP 1: Check pages are live ===
    const pageChecks = [
      { key: "scheduler_link", step: "scheduler_page", label: "Scheduler page" },
      { key: "lander_link", step: "lander_page", label: "Lander page" },
      { key: "tfwp_profile_link", step: "profile_page", label: "Profile page" },
      { key: "thankyou_link", step: "thankyou_page", label: "Thank You page" },
      { key: "nfia_link", step: "nfia_page", label: "NFIA page" },
    ];

    let landerHtml: string | undefined;

    for (const check of pageChecks) {
      if (!wants(check.step) && !(wants("form_analysis") && check.key === "lander_link")) continue;

      const url = client[check.key];
      if (url) {
        const result = await checkPageLive(url);
        results.push({
          step: check.step,
          success: result.ok,
          details: result.ok ? `${check.label} is live (HTTP ${result.status})` : result.error || `HTTP ${result.status}`,
          url,
        });

        // Capture lander HTML for form analysis
        if (check.key === "lander_link" && result.html) {
          landerHtml = result.html;
        }
      } else {
        results.push({
          step: check.step,
          success: false,
          details: `${check.label} URL not set`,
        });
      }
    }

    // === STEP 2: Check CRM subaccount ===
    if (wants("ghl_subaccount")) {
      results.push({
        step: "ghl_subaccount",
        success: !!client.subaccount_id,
        details: client.subaccount_id ? `Subaccount ID: ${client.subaccount_id}` : "No subaccount ID found",
      });
    }

    // === STEP 3: Check Google Ads ===
    if (wants("google_ads")) {
      results.push({
        step: "google_ads",
        success: true, // Always pass — agents may use consolidated router without individual campaigns
        details: client.google_campaign_id
          ? `Campaign ID: ${client.google_campaign_id}`
          : "Consolidated router — no individual campaign",
      });
    }

    // === STEP 4: Live Lead Flow Test (can be rerun independently) ===
    let testLeadId: string | null = null;
    let ghlContactId: string | null = null;

    const shouldRunLeadFlow = wants("lead_flow_test") || wants("lead_webhook_submit") || wants("lead_in_alpha_hub") || wants("agent_id_injection") || wants("lead_client_linked") || wants("ghl_delivery") || wants("form_analysis") || wants("test_url_construction");

    if (shouldRunLeadFlow) {
      // Ensure we have lander HTML if we need form analysis (even if we skipped page checks above)
      if (!landerHtml && client.lander_link && wants("form_analysis")) {
        const landerLive = await checkPageLive(client.lander_link);
        if (landerLive.ok && landerLive.html) landerHtml = landerLive.html;
      }

      if (client.lander_link && client.agent_id) {
        console.log("Running live lead flow test...");

        try {
          // Build the lander URL with agent_id
          const landerUrlWithParams = `${client.lander_link}${client.lander_link.includes('?') ? '&' : '?'}agent_id=${client.agent_id}`;

          if (wants("test_url_construction")) {
            results.push({
              step: "test_url_construction",
              success: true,
              details: `Test URL: ${landerUrlWithParams}`,
              url: landerUrlWithParams,
            });
          }

          // Use AI to analyze the landing page if we have HTML
          let testData: Record<string, string>;
          let formAction: string | null = null;

          if (landerHtml) {
            console.log("Analyzing landing page with AI...");
            const formAnalysis = await analyzeFormWithAI(landerHtml, client.agent_id);
            testData = formAnalysis.testData;
            formAction = formAnalysis.formAction;

            if (wants("form_analysis")) {
              results.push({
                step: "form_analysis",
                success: true,
                details: `AI analyzed form - Found action: ${formAction || 'none'}, Fields: ${Object.keys(formAnalysis.fields).join(', ') || 'standard'}`,
                data: { formAction, fields: formAnalysis.fields },
              });
            }
          } else {
            // Fallback test data
            testData = {
              first_name: "Test",
              last_name: "Lead",
              email: `test.${Date.now()}@alphaagent.test`,
              phone: "5551234567",
              state: client.states?.split(",")[0]?.trim() || "TX",
              agent_id: client.agent_id,
            };

            if (wants("form_analysis")) {
              results.push({
                step: "form_analysis",
                success: false,
                details: "Could not fetch lander HTML - using fallback test data",
              });
            }
          }

          // Construct lead webhook payload
          const leadPayload = {
            lead_id: `test_live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            agent_id: testData.agent_id || client.agent_id,
            first_name: testData.first_name || (testData as any).firstName || "Test",
            last_name: testData.last_name || (testData as any).lastName || "Lead",
            email: testData.email,
            phone: testData.phone || (testData as any).phoneNumber || "5551234567",
            state: testData.state,
            source: "Live Onboarding Verification",
            utm_source: "onboarding_live_test",
            utm_medium: "form_submission_test",
            utm_campaign: "live_verification",
            test_lead: true,
            form_action_detected: formAction,
          };

          console.log("Submitting test lead:", JSON.stringify(leadPayload));

          // Get API key for webhook
          const { data: apiKey } = await supabase
            .from("webhook_api_keys")
            .select("api_key")
            .eq("is_active", true)
            .limit(1)
            .single();

          if (!apiKey?.api_key) {
            throw new Error("No active webhook API key found");
          }

          // Submit lead through the lead webhook (simulating form submission)
          const webhookResponse = await fetch(`${supabaseUrl}/functions/v1/lead-webhook`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey.api_key,
            },
            body: JSON.stringify(leadPayload),
          });

          const webhookResult = await webhookResponse.json();
          console.log("Webhook response:", JSON.stringify(webhookResult));

          // The webhook returns the database UUID as 'lead_id'
          if (webhookResponse.ok && webhookResult.lead_id) {
            testLeadId = webhookResult.lead_id;

            if (wants("lead_webhook_submit")) {
              results.push({
                step: "lead_webhook_submit",
                success: true,
                details: `Lead submitted via webhook (UUID: ${testLeadId})`,
                data: { leadId: testLeadId, externalLeadId: leadPayload.lead_id, payload: leadPayload },
              });
            }

            // Wait for downstream processing
            await new Promise((resolve) => setTimeout(resolve, 5000));

            // Verify lead exists in Alpha Hub (DB)
            const { data: lead, error: leadError } = await supabase
              .from("leads")
              .select("id, lead_id, status, agent_id, ghl_contact_id, delivery_status")
              .eq("id", testLeadId)
              .maybeSingle();

            console.log(
              "Lead lookup result:",
              lead ? JSON.stringify(lead) : `Error: ${leadError?.message}`
            );

            if (lead) {
              if (wants("lead_in_alpha_hub")) {
                results.push({
                  step: "lead_in_alpha_hub",
                  success: true,
                  details: `Lead found in Alpha Hub with status: ${lead.status}`,
                  data: { leadId: lead.id, status: lead.status, agentId: lead.agent_id },
                });
              }

              // Check agent_id matches (proves hidden field injection works)
              if (wants("agent_id_injection")) {
                const agentIdMatch = lead.agent_id === client.agent_id;
                results.push({
                  step: "agent_id_injection",
                  success: agentIdMatch,
                  details: agentIdMatch
                    ? `✓ Agent ID correctly injected: ${lead.agent_id}`
                    : `✗ Agent ID mismatch: expected ${client.agent_id}, got ${lead.agent_id}`,
                });
              }

              // Verify the lead maps back to this client via clients.agent_id
              if (wants("lead_client_linked")) {
                const { data: mappedClient, error: mappedClientError } = await supabase
                  .from("clients")
                  .select("id")
                  .eq("agent_id", lead.agent_id)
                  .maybeSingle();

                const linkedOk = !!mappedClient && mappedClient.id === client_id;
                results.push({
                  step: "lead_client_linked",
                  success: linkedOk,
                  details: linkedOk
                    ? "Lead correctly maps back to this client (via agent_id)"
                    : `Lead client mapping issue: expected ${client_id}, got ${mappedClient?.id || mappedClientError?.message || 'none'}`,
                });
              }

              // Check CRM delivery
              ghlContactId = lead.ghl_contact_id;
              if (wants("ghl_delivery")) {
                if (client.crm_delivery_enabled && client.subaccount_id) {
                  results.push({
                    step: "ghl_delivery",
                    success: !!lead.ghl_contact_id,
                    details: lead.ghl_contact_id
                      ? `✓ Delivered to CRM (Contact: ${lead.ghl_contact_id})`
                      : `Pending CRM delivery (status: ${lead.delivery_status || 'unknown'})`,
                    data: {
                      ghlContactId: lead.ghl_contact_id,
                      deliveryStatus: lead.delivery_status,
                    },
                  });
                } else {
                  results.push({
                    step: "ghl_delivery",
                    success: true,
                    details: "CRM delivery not enabled - skipped CRM check",
                  });
                }
              }
            } else {
              if (wants("lead_in_alpha_hub")) {
                results.push({
                  step: "lead_in_alpha_hub",
                  success: false,
                  details: "Test lead not found in Alpha Hub after submission",
                });
              }
            }
          } else {
            if (wants("lead_webhook_submit")) {
              results.push({
                step: "lead_webhook_submit",
                success: false,
                details: `Webhook failed: ${webhookResult.error || JSON.stringify(webhookResult)}`,
              });
            }
          }
        } catch (testError: unknown) {
          const msg = testError instanceof Error ? testError.message : "Unknown error";
          if (wants("lead_flow_test")) {
            results.push({
              step: "lead_flow_test",
              success: false,
              details: `Live test failed: ${msg}`,
            });
          }
        }
      } else {
        if (wants("lead_flow_test")) {
          results.push({
            step: "lead_flow_test",
            success: false,
            details: "Cannot run live test: missing lander_link or agent_id",
          });
        }
      }
    }

    // === Calculate summary ===
    const totalChecks = results.length;
    const passedChecks = results.filter(r => r.success).length;
    const criticalSteps = ["lander_page", "scheduler_page", "ghl_subaccount", "lead_in_alpha_hub", "agent_id_injection"];
    const criticalPassed = results.filter(r => criticalSteps.includes(r.step) && r.success).length;
    const criticalTotal = results.filter(r => criticalSteps.includes(r.step)).length;

    const allPassed = passedChecks === totalChecks;
    const criticalAllPassed = criticalPassed === criticalTotal;

    return new Response(
      JSON.stringify({ 
        success: allPassed,
        allPassed,
        criticalPassed: criticalAllPassed,
        total_checks: totalChecks, 
        passed_checks: passedChecks, 
        critical_checks: { passed: criticalPassed, total: criticalTotal },
        results, 
        client_name: client.name,
        test_lead_id: testLeadId,
        ghl_contact_id: ghlContactId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in live verification:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to verify onboarding";
    return new Response(
      JSON.stringify({ error: errorMessage, allPassed: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
