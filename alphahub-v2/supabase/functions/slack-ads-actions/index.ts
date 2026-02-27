import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return toHex(sig);
}

async function verifySlackRequest(req: Request, rawBody: string): Promise<void> {
  const signingSecret = Deno.env.get("SLACK_ADS_MANAGER_SIGNING_SECRET");
  if (!signingSecret) {
    throw new Error("SLACK_ADS_MANAGER_SIGNING_SECRET is not configured");
  }

  const slackSignature = req.headers.get("x-slack-signature");
  if (!slackSignature) {
    throw new Error("Missing x-slack-signature header");
  }

  const slackTimestamp = req.headers.get("x-slack-request-timestamp");
  if (!slackTimestamp) {
    throw new Error("Missing x-slack-request-timestamp header");
  }

  // Prevent replay attacks
  const nowSeconds = Math.floor(Date.now() / 1000);
  const ts = Number(slackTimestamp);
  if (!Number.isFinite(ts)) {
    throw new Error("Invalid x-slack-request-timestamp header");
  }
  if (Math.abs(nowSeconds - ts) > 60 * 5) {
    throw new Error("Slack request timestamp is too old");
  }

  const baseString = `v0:${slackTimestamp}:${rawBody}`;
  const computed = await hmacSha256Hex(signingSecret, baseString);
  const expected = `v0=${computed}`;

  if (expected !== slackSignature) {
    throw new Error("Slack signature verification failed");
  }
}

async function respondToSlack(responseUrl: string, body: unknown): Promise<void> {
  const res = await fetch(responseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`Failed to respond to Slack response_url [${res.status}]: ${raw.slice(0, 500)}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/x-www-form-urlencoded")) {
      return new Response(
        JSON.stringify({ success: false, error: "Expected x-www-form-urlencoded body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawBody = await req.text();
    await verifySlackRequest(req, rawBody);

    const params = new URLSearchParams(rawBody);
    const payloadStr = params.get("payload");
    if (!payloadStr) {
      throw new Error("Missing payload in Slack request body");
    }

    const payload = JSON.parse(payloadStr);
    const responseUrl: string | undefined = payload?.response_url;

    const action = payload?.actions?.[0];
    const actionId: string | undefined = action?.action_id;

    if (payload?.type !== "block_actions") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (actionId !== "approve_proposal") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const proposalId: string | undefined = action?.value;
    if (!proposalId) {
      throw new Error("Missing proposalId in Slack action value");
    }

    const slackUserId: string | undefined = payload?.user?.id;
    const slackUserName: string | undefined = payload?.user?.username;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Respond within Slack's timeout window: send an immediate ephemeral ack,
    // then execute and send a follow-up ephemeral message.
    if (responseUrl) {
      try {
        await respondToSlack(responseUrl, {
          response_type: "ephemeral",
          text: `✅ Approving proposal… (by ${slackUserName ? `@${slackUserName}` : "Slack user"})`,
        });

        const { data, error } = await supabase.functions.invoke("execute-proposal", {
          body: {
            proposalId,
            action: "approve",
            userId: null,
            userNote: `Approved from Slack by ${slackUserName || slackUserId || "unknown"}`,
          },
        });

        if (error) {
          throw new Error(`execute-proposal invoke failed: ${error.message}`);
        }

        const newBudget = data?.newBudget ?? data?.budgetUsed;
        const clientName = data?.clientName;

        await respondToSlack(responseUrl, {
          response_type: "ephemeral",
          text: `✅ Approved${clientName ? ` for *${clientName}*` : ""}. ${newBudget ? `New budget: $${Number(newBudget).toFixed(2)}/day.` : ""}`,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        console.error("Slack approve failed:", e);
        await respondToSlack(responseUrl, {
          response_type: "ephemeral",
          text: `❌ Approval failed: ${msg}`,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in slack-ads-actions:", error);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
