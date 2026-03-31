import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildSystemPrompt } from "./prompt.ts";
import { TOOL_DEFINITIONS, executeToolCall } from "./tools.ts";

// ── Config ────────────────────────────────────────────────────────────

const STELLA_SENDER_ID = "a1b2c3d4-e5f6-4a7b-8c9d-000000000001";
const STELLA_SENDER_NAME = "Stella";
const STELLA_SENDER_ROLE = "admin";
const STELLA_AVATAR_URL = "https://qcunascacayiiuufjtaq.supabase.co/storage/v1/object/public/chat-attachments/stella-avatar.jpeg";

const CLAUDE_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 500;
const MAX_TOOL_ROUNDS = 3;
const MAX_HISTORY_MESSAGES = 12;

// Testing: only respond to these client IDs
const ALLOWED_CLIENT_IDS = [
  "9d03c1f4-8f20-48fd-b358-64b9752a7861", // James Warren
  "d4b62e8b-805c-47ce-81a5-0c1b85965f67", // Sierra Smith (testing)
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Main Handler ──────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const conversation_id = body.conversation_id;

    if (!conversation_id) {
      return new Response(
        JSON.stringify({ error: "conversation_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Derive client_id from conversation
    let client_id = body.client_id;
    if (!client_id) {
      const { data: convo } = await supabase
        .from("chat_conversations")
        .select("client_id")
        .eq("id", conversation_id)
        .single();
      client_id = convo?.client_id;
    }

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: "could not determine client_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Gate: only allowed clients
    if (!ALLOWED_CLIENT_IDS.includes(client_id)) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "client not in test group" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      console.error("ANTHROPIC_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Guard: Only respond if latest message is from client ────────
    const { data: latestMsg } = await supabase
      .from("chat_messages")
      .select("sender_role, sender_name")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!latestMsg || latestMsg.sender_role !== "client") {
      return new Response(
        JSON.stringify({ skipped: true, reason: "latest message not from client" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Sierra cooldown: if a human admin responded in last 10 min, back off ──
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentAdmin } = await supabase
      .from("chat_messages")
      .select("sender_name, created_at")
      .eq("conversation_id", conversation_id)
      .eq("sender_role", "admin")
      .neq("sender_name", "Stella")
      .gte("created_at", tenMinAgo)
      .order("created_at", { ascending: false })
      .limit(1);

    if (recentAdmin && recentAdmin.length > 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "human admin active in last 10 min, backing off" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Load client data ────────────────────────────────────────────
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select(
        "id, name, email, phone, status, states, package_type, agent_id, ads_live, success_manager_name, google_campaign_id, activated_at, contract_signed_at, commission_contract_percent",
      )
      .eq("id", client_id)
      .single();

    if (clientErr || !client) {
      console.error("Failed to load client:", clientErr);
      return new Response(
        JSON.stringify({ error: "client not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Load performance percentage ─────────────────────────────────
    const { data: perfSetting } = await supabase
      .from("onboarding_settings")
      .select("setting_value")
      .eq("setting_key", "performance_percentage")
      .single();

    const performancePct = perfSetting?.setting_value
      ? Number(perfSetting.setting_value)
      : 0;

    // ── Load wallet tracking start date ─────────────────────────────
    const { data: wallet } = await supabase
      .from("client_wallets")
      .select("tracking_start_date")
      .eq("client_id", client_id)
      .single();

    // ── Load conversation history ───────────────────────────────────
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("sender_role, sender_name, message, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(MAX_HISTORY_MESSAGES);

    const chatHistory = messages || [];

    // ── Calculate response delay ────────────────────────────────────
    const lastStellaMsg = [...chatHistory]
      .reverse()
      .find((m) => m.sender_name === STELLA_SENDER_NAME);

    const isActiveConvo =
      lastStellaMsg &&
      Date.now() - new Date(lastStellaMsg.created_at).getTime() < 5 * 60 * 1000;

    // Reading delay scales with message complexity
    const lastClientMsg = [...chatHistory].reverse().find(m => m.sender_role === "client");
    const msgLength = lastClientMsg?.message?.length || 20;
    const isShortSimple = msgLength < 40; // "hey" / "whats my balance" / "i need a hand"

    let readingDelayMs: number;
    if (isActiveConvo && isShortSimple) {
      readingDelayMs = Math.floor(Math.random() * 1000) + 1000;  // 1-2s
    } else if (isActiveConvo) {
      readingDelayMs = Math.floor(Math.random() * 2000) + 2000;  // 2-4s
    } else if (isShortSimple) {
      readingDelayMs = Math.floor(Math.random() * 4000) + 5000;  // 5-9s
    } else {
      readingDelayMs = Math.floor(Math.random() * 5000) + 8000;  // 8-13s
    }

    // Mark client messages as read (shows read receipts)
    try {
      await supabase.rpc("mark_messages_read", {
        p_conversation_id: conversation_id,
        p_user_role: "admin",
      });
    } catch { /* non-critical */ }

    await sleep(readingDelayMs);

    // ── Re-check: make sure client didn't send more messages during delay
    const { data: postDelayLatest } = await supabase
      .from("chat_messages")
      .select("sender_role, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // If latest message is now from admin, check context
    if (postDelayLatest && postDelayLatest.sender_role === "admin") {
      // Check if there are any UNHANDLED client messages after the last Stella message
      const { data: recentMsgs } = await supabase
        .from("chat_messages")
        .select("sender_role, sender_name, created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: false })
        .limit(5);

      const lastStellaIdx = (recentMsgs || []).findIndex(m => m.sender_name === "Stella");
      const clientMsgsAfterStella = lastStellaIdx === -1
        ? (recentMsgs || []).filter(m => m.sender_role === "client").length
        : (recentMsgs || []).slice(0, lastStellaIdx).filter(m => m.sender_role === "client").length;

      if (clientMsgsAfterStella === 0) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "no unhandled client messages" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      // There are client messages Stella hasn't addressed yet - continue
    }

    // If more client messages came in during delay, reload history
    let finalHistory = chatHistory;
    if (
      postDelayLatest &&
      new Date(postDelayLatest.created_at) > new Date(chatHistory[chatHistory.length - 1]?.created_at || 0)
    ) {
      const { data: freshMessages } = await supabase
        .from("chat_messages")
        .select("sender_role, sender_name, message, created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: true })
        .limit(MAX_HISTORY_MESSAGES);
      finalHistory = freshMessages || chatHistory;
    }

    // ── Build Claude messages ───────────────────────────────────────
    const claudeMessages = buildClaudeMessages(finalHistory);

    // ── Build system prompt ─────────────────────────────────────────
    const firstName = client.name?.split(" ")[0] || "there";
    const systemPrompt = buildSystemPrompt(
      {
        name: client.name,
        firstName,
        status: client.status,
        states: client.states || "",
        packageType: client.package_type || "full_management",
        activatedAt: client.activated_at,
        contractSignedAt: client.contract_signed_at,
        adsLive: client.ads_live || false,
        successManagerName: client.success_manager_name || "Sierra",
        agentId: client.agent_id,
        campaignId: client.google_campaign_id,
      },
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    );

    // ── Inject latest client message into system prompt for maximum attention ──
    const latestClientMessage = [...finalHistory]
      .reverse()
      .find((m) => m.sender_role === "client");

    const augmentedPrompt = systemPrompt + `\n\n== RIGHT NOW ==\n\nThe agent just sent this message. You MUST respond to THIS specific message:\n"${latestClientMessage?.message || ""}"`;

    // ── Tool context ────────────────────────────────────────────────
    const toolCtx = {
      supabase,
      clientId: client_id,
      agentId: client.agent_id,
      conversationId: conversation_id,
      performancePct,
      trackingStartDate: wallet?.tracking_start_date || null,
    };

    // ── Call Claude API with tool loop ───────────────────────────────
    let currentMessages = [...claudeMessages];
    let finalText = "";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await callClaude(
        anthropicKey,
        augmentedPrompt,
        currentMessages,
      );

      if (!response.ok) {
        const errBody = await response.text();
        console.error("Claude API error:", errBody);
        // Send a fallback message instead of going silent
        await supabase.from("chat_messages").insert({
          conversation_id,
          sender_id: STELLA_SENDER_ID,
          sender_name: STELLA_SENDER_NAME,
          sender_role: STELLA_SENDER_ROLE,
          sender_avatar_url: STELLA_AVATAR_URL,
          message: "Hey give me one sec, let me check on that and get back to you",
        });
        return new Response(
          JSON.stringify({ error: "AI service error", fallback_sent: true }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const result = await response.json();

      // Check for tool use
      const toolUseBlocks = (result.content || []).filter(
        (b: { type: string }) => b.type === "tool_use",
      );
      const textBlocks = (result.content || []).filter(
        (b: { type: string }) => b.type === "text",
      );

      if (toolUseBlocks.length > 0) {
        // Execute tools and continue the loop
        const toolResults = [];
        for (const toolBlock of toolUseBlocks) {
          const toolResult = await executeToolCall(
            toolBlock.name,
            toolBlock.input,
            toolCtx,
          );
          toolResults.push({
            type: "tool_result" as const,
            tool_use_id: toolBlock.id,
            content: toolResult,
          });
        }

        // Add assistant response and tool results to messages
        currentMessages.push({ role: "assistant", content: result.content });
        currentMessages.push({ role: "user", content: toolResults });
      } else {
        // No tool use - we have the final text
        finalText = textBlocks.map((b: { text: string }) => b.text).join("");
        break;
      }

      // If this was the last round, extract any text we got
      if (round === MAX_TOOL_ROUNDS - 1) {
        finalText = textBlocks.map((b: { text: string }) => b.text).join("") ||
          "Let me check with Sierra on that and get back to you";
      }
    }

    // ── Post-process response ───────────────────────────────────────
    finalText = cleanResponse(finalText);

    // Quality check: if response is a generic closer, the model drifted. Retry once.
    const isGenericCloser = /^(anything else|was there anything|is there anything|let me know if).{0,30}(help|need|assist)/i.test(finalText.trim())
      || /message didn't come through|didn't come through|didn't send right/i.test(finalText.trim());
    if (isGenericCloser && currentMessages.length > 0) {
      // Add explicit instruction and retry
      currentMessages.push({ role: "assistant", content: finalText });
      currentMessages.push({ role: "user", content: "[SYSTEM: Your previous response was a generic closer. The agent asked a specific question. Re-read their latest message and give a real, helpful answer. Use your tools if needed.]" });
      const retryResponse = await callClaude(anthropicKey, systemPrompt, currentMessages);
      if (retryResponse.ok) {
        const retryResult = await retryResponse.json();
        const retryText = (retryResult.content || [])
          .filter((b: { type: string }) => b.type === "text")
          .map((b: { text: string }) => b.text)
          .join("");
        if (retryText && retryText.trim() !== "[NO_RESPONSE]") {
          finalText = cleanResponse(retryText);
        }
      }
    }

    // Check for no-response signal
    if (finalText.trim() === "[NO_RESPONSE]" || finalText.trim() === "") {
      return new Response(
        JSON.stringify({ skipped: true, reason: "no response needed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Split into multiple messages and insert with typing animation ──
    const messageParts = finalText
      .split("[NEXT]")
      .map((m) => m.trim())
      .filter(Boolean);

    for (let i = 0; i < messageParts.length; i++) {
      // Set typing indicator ON in database (triggers realtime to frontend)
      await supabase.from("chat_typing").upsert({
        conversation_id,
        is_typing: true,
        sender_name: STELLA_SENDER_NAME,
        sender_avatar_url: STELLA_AVATAR_URL,
        updated_at: new Date().toISOString(),
      });

      // Wait based on message length - simulates human typing speed
      // ~15 chars/sec, clamped between 2s and 8s, plus jitter
      const charCount = messageParts[i].length;
      const baseTypingMs = (charCount / 15) * 1000;
      const typingMs = Math.min(8000, Math.max(2000, baseTypingMs));
      await sleep(typingMs + Math.floor(Math.random() * 1000));

      // Turn off typing indicator right before sending
      await supabase.from("chat_typing").upsert({
        conversation_id,
        is_typing: false,
        updated_at: new Date().toISOString(),
      });

      // Insert the actual message
      await supabase.from("chat_messages").insert({
        conversation_id,
        sender_id: STELLA_SENDER_ID,
        sender_name: STELLA_SENDER_NAME,
        sender_role: STELLA_SENDER_ROLE,
        sender_avatar_url: STELLA_AVATAR_URL,
        message: messageParts[i],
      });

      // Small gap before next typing cycle
      if (i < messageParts.length - 1) {
        await sleep(500);
      }
    }

    // If Stella mentioned @sierra, notify Sierra via chat-notification
    const mentionedSierra = messageParts.some(m => m.toLowerCase().includes("@sierra"));
    if (mentionedSierra) {
      try {
        // Get client name for the notification
        const clientName = client?.name || "An agent";
        await supabase.functions.invoke("chat-notification", {
          body: {
            message: {
              conversation_id,
              sender_name: "Stella",
              sender_role: "admin",
              message: `@sierra - ${clientName} needs your help in chat. Stella is requesting you jump in.`,
            },
            type: "INSERT",
            urgent: true,
          },
        });
      } catch { /* notification is best-effort */ }
    }

    return new Response(
      JSON.stringify({
        success: true,
        messages_sent: messageParts.length,
        reading_delay_ms: readingDelayMs,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Stella chat error:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "internal error", detail: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ── Helpers ───────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanResponse(text: string): string {
  return text
    .replace(/\u2014/g, " - ")  // em dash
    .replace(/\u2013/g, "-")     // en dash
    .replace(/—/g, " - ")
    .replace(/–/g, "-")
    .replace(/\*\*/g, "")        // bold markdown
    .replace(/\*/g, "")          // italic markdown
    .replace(/^#{1,6}\s/gm, "")  // heading markdown
    .replace(/^[-*]\s/gm, "")    // bullet points
    .replace(/^\d+\.\s/gm, "")   // numbered lists
    .replace(/https?:\/\/[^\s]*taxfreewealthplan\.com\/discover[^\s]*/gi, "[landing page managed by marketing team]")  // block lander URLs
    .replace(/https?:\/\/[^\s]*taxfreewealthplan\.com\/thank-you[^\s]*/gi, "[page managed by marketing team]");  // block thank you URLs
}

interface ClaudeMessage {
  role: "user" | "assistant";
  // deno-lint-ignore no-explicit-any
  content: any;
}

function buildClaudeMessages(
  history: Array<{
    sender_role: string;
    sender_name: string;
    message: string;
    created_at: string;
  }>,
): ClaudeMessage[] {
  const claudeMessages: ClaudeMessage[] = [];

  for (const msg of history) {
    if (msg.sender_name === STELLA_SENDER_NAME) {
      // Previous Stella response
      claudeMessages.push({ role: "assistant", content: msg.message });
    } else if (msg.sender_role === "client") {
      // Agent message
      claudeMessages.push({ role: "user", content: msg.message });
    } else {
      // Sierra or another admin
      claudeMessages.push({
        role: "user",
        content: `[${msg.sender_name} from the team said]: ${msg.message}`,
      });
    }
  }

  // Claude API requires alternating roles - merge consecutive same-role messages
  const merged: ClaudeMessage[] = [];
  for (const msg of claudeMessages) {
    if (
      merged.length > 0 &&
      merged[merged.length - 1].role === msg.role &&
      typeof merged[merged.length - 1].content === "string" &&
      typeof msg.content === "string"
    ) {
      merged[merged.length - 1].content += "\n" + msg.content;
    } else {
      merged.push({ ...msg });
    }
  }

  // Ensure conversation starts with user message
  if (merged.length > 0 && merged[0].role === "assistant") {
    merged.shift();
  }

  // Ensure conversation starts with user message
  if (merged.length === 0) {
    return merged;
  }

  // Ensure conversation ends with user message (required for Claude)
  if (merged[merged.length - 1].role !== "user") {
    merged.push({ role: "user", content: "(the agent is waiting for your response)" });
  }

  // Mark the latest user message so Claude focuses on it
  const lastUserIdx = merged.length - 1;
  if (merged[lastUserIdx].role === "user" && typeof merged[lastUserIdx].content === "string") {
    merged[lastUserIdx].content = "[RESPOND TO THIS MESSAGE - this is what the agent just said]: " + merged[lastUserIdx].content;
  }

  return merged;
}

async function callClaude(
  apiKey: string,
  systemPrompt: string,
  messages: ClaudeMessage[],
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s max per API call

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
        system: systemPrompt,
        tools: TOOL_DEFINITIONS,
        messages,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}
