import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReqBody = {
  proposalId?: string;
};

async function postToSlack(webhookUrl: string, payload: unknown): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // Incoming webhooks often return plain text "ok" on success.
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`ads-manager-slack-test: Slack webhook failed [${res.status}]: ${raw.slice(0, 500)}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webhookUrl = Deno.env.get("SLACK_ADS_MANAGER_WEBHOOK_URL");
    if (!webhookUrl) {
      throw new Error("SLACK_ADS_MANAGER_WEBHOOK_URL is not configured");
    }

    const { proposalId }: ReqBody = await req.json().catch(() => ({}));
    if (!proposalId) {
      return new Response(JSON.stringify({ success: false, error: "Missing proposalId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL is not configured");
    }
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select("id,status,current_daily_budget,proposed_daily_budget,client_id,clients(name)")
      .eq("id", proposalId)
      .maybeSingle();

    if (proposalError) {
      throw new Error(`ads-manager-slack-test: Failed to load proposal: ${proposalError.message}`);
    }
    if (!proposal) {
      return new Response(JSON.stringify({ success: false, error: "Proposal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientName = (proposal as any)?.clients?.name as string | undefined;
    const currentBudget = proposal.current_daily_budget ?? null;
    const proposedBudget = proposal.proposed_daily_budget ?? null;
    const status = proposal.status;

    const appUrl = "https://alpha-agent-flow.lovable.app";
    const commandCenterUrl = `${appUrl}/hub/admin/command`;

    await postToSlack(webhookUrl, {
      text: "🧪 Ads Manager Approval Test",
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "🧪 Ads Manager Approval Test" },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              `*Client:* ${clientName ?? "Unknown"}\n` +
              `*Proposal:* \`${proposalId}\`\n` +
              `*Status:* ${status}\n` +
              `*Current:* ${currentBudget == null ? "—" : `$${Number(currentBudget).toFixed(2)}/day`}\n` +
              `*Proposed:* ${proposedBudget == null ? "—" : `$${Number(proposedBudget).toFixed(2)}/day`}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Approve (Slack)" },
              style: "primary",
              action_id: "approve_proposal",
              value: proposalId,
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Open Command Center" },
              url: commandCenterUrl,
            },
          ],
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text:
                "Click *Approve (Slack)* to run the live approval. Deny/override should be handled inside the Command Center to keep the explanation flow.",
            },
          ],
        },
      ],
    });

    return new Response(JSON.stringify({ success: true, proposalId, posted: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in ads-manager-slack-test:", error);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
