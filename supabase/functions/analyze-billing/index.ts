import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Types ──

interface AIFinding {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  description: string;
  affected_records: string[];
  amount?: number;
  suggested_action: string;
  action_description: string;
}

interface AIAnalysisResult {
  status: "clean" | "issues_found" | "critical_issues" | "error";
  summary: string;
  findings: AIFinding[];
  v1_manual_summary?: string;
  recommendations?: string[];
}

// ── Stripe helpers (mirrors audit-client-billing pattern) ──

async function fetchStripeCharges(
  stripeKey: string,
  customerId: string,
  since: number,
): Promise<
  Array<{
    id: string;
    amount: number;
    status: string;
    created: string;
    refunded: boolean;
    amount_refunded: number;
  }>
> {
  const results: Array<{
    id: string;
    amount: number;
    status: string;
    created: string;
    refunded: boolean;
    amount_refunded: number;
  }> = [];

  let hasMore = true;
  let startingAfter: string | null = null;
  let pages = 0;

  while (hasMore && pages < 3) {
    const url = new URL("https://api.stripe.com/v1/payment_intents");
    url.searchParams.set("customer", customerId);
    url.searchParams.set("limit", "100");
    url.searchParams.set("created[gte]", String(since));
    url.searchParams.set("expand[]", "data.latest_charge");
    if (startingAfter) url.searchParams.set("starting_after", startingAfter);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });

    if (!res.ok) {
      console.error(
        `Stripe PI fetch error for ${customerId}: ${await res.text()}`,
      );
      break;
    }

    const data = await res.json();
    hasMore = data.has_more || false;

    for (const pi of data.data || []) {
      const charge = pi.latest_charge;
      results.push({
        id: pi.id,
        amount: (pi.amount || 0) / 100,
        status: pi.status,
        created: new Date(pi.created * 1000).toISOString(),
        refunded: charge?.refunded === true,
        amount_refunded: (charge?.amount_refunded || 0) / 100,
      });
      if (hasMore) startingAfter = pi.id;
    }
    pages++;
  }

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId } = await req.json();

    if (!clientId) {
      return jsonResponse({ error: "clientId is required" }, 400);
    }

    const LLM_API_KEY = Deno.env.get("LLM_API_KEY");
    if (!LLM_API_KEY) {
      return jsonResponse(
        { error: "LLM_API_KEY is not configured. AI analysis unavailable." },
        500,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Step 1: Fetch client details ──
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, status, email")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      return jsonResponse({ error: "Client not found" }, 404);
    }

    // ── Step 2: Fetch all data in parallel ──
    const [
      billingRes,
      walletTxRes,
      auditBooksRes,
      walletRes,
      v1ManualRes,
      verificationsRes,
    ] = await Promise.all([
      // Billing records (ad_spend only, last 100)
      supabase
        .from("billing_records")
        .select(
          "id, amount, status, paid_at, created_at, stripe_payment_intent_id, source, billing_type, charge_attempts, last_charge_error",
        )
        .eq("client_id", clientId)
        .eq("billing_type", "ad_spend")
        .order("created_at", { ascending: false })
        .limit(100),

      // Wallet transactions (last 100)
      supabase
        .from("wallet_transactions")
        .select(
          "id, amount, transaction_type, description, billing_record_id, created_at",
        )
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(100),

      // audit_books RPC
      supabase.rpc("audit_books", { p_client_id: clientId }),

      // Client wallet (for stripe_customer_id)
      supabase
        .from("client_wallets")
        .select("stripe_customer_id, billing_mode")
        .eq("client_id", clientId)
        .single(),

      // v1_manual records count
      supabase
        .from("billing_records")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("source", "v1_manual"),

      // Existing verifications
      supabase
        .from("billing_verifications")
        .select("id, status, verification_method, verified_at, ai_analysis")
        .eq("client_id", clientId),
    ]);

    const billingRecords = billingRes.data || [];
    const walletTransactions = walletTxRes.data || [];
    const auditBooks =
      typeof auditBooksRes.data === "string"
        ? JSON.parse(auditBooksRes.data)
        : auditBooksRes.data;
    const wallet = walletRes.data;
    const v1ManualCount = v1ManualRes.count ?? 0;
    const verifications = verificationsRes.data || [];

    // ── Step 3: Fetch live Stripe charges (90 days) ──
    let stripeCharges: Array<{
      id: string;
      amount: number;
      status: string;
      created: string;
      refunded: boolean;
      amount_refunded: number;
    }> = [];
    let stripeAvailable = false;

    const stripeKey = Deno.env.get("STRIPE_AD_SPEND_SECRET_KEY") || "";
    const stripeCustomerId = wallet?.stripe_customer_id;

    if (stripeKey && stripeCustomerId) {
      try {
        const since90d = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
        stripeCharges = await fetchStripeCharges(
          stripeKey,
          stripeCustomerId,
          since90d,
        );
        stripeAvailable = true;
      } catch (err) {
        console.error("Stripe fetch failed, proceeding without:", err);
      }
    }

    // ── Step 4: Build Claude prompt ──
    const billingRecordsSummary = billingRecords
      .map(
        (r) =>
          `ID:${r.id} | $${r.amount} | status:${r.status} | paid:${r.paid_at || "unpaid"} | PI:${r.stripe_payment_intent_id || "none"} | source:${r.source || "unknown"} | created:${r.created_at}`,
      )
      .join("\n");

    const walletTxSummary = walletTransactions
      .map(
        (tx) =>
          `ID:${tx.id} | $${tx.amount} | type:${tx.transaction_type} | br:${tx.billing_record_id || "none"} | created:${tx.created_at} | desc:${tx.description || ""}`,
      )
      .join("\n");

    const stripeChargeSummary = stripeAvailable
      ? stripeCharges
          .map(
            (c) =>
              `PI:${c.id} | $${c.amount} | status:${c.status} | refunded:${c.refunded} | refund_amount:$${c.amount_refunded} | created:${c.created}`,
          )
          .join("\n")
      : "Stripe data unavailable (no Stripe customer linked or API error)";

    const auditBooksSummary = auditBooks
      ? `Status: ${auditBooks.status}\nSummary: ${auditBooks.summary}\nBalance: $${auditBooks.balance}\nDiscrepancies: ${JSON.stringify(auditBooks.discrepancies || [])}`
      : "audit_books RPC failed";

    const systemPrompt = `You are a billing integrity analyst for Alpha Agent Marketing's AlphaHub platform. Your job is to analyze a client's billing records, Stripe payment data, and wallet transactions to identify discrepancies.

ANALYSIS INSTRUCTIONS:
1. Cross-reference AlphaHub billing records against live Stripe payment intents
2. Check that every paid billing record has a corresponding Stripe PI that succeeded
3. Check that every successful Stripe charge has a corresponding billing record
4. Check that every paid billing record has a corresponding wallet deposit
5. Identify phantom payments (records marked paid without Stripe evidence)
6. Identify missing deposits (Stripe charges without wallet deposits)
7. Identify amount mismatches between billing records and Stripe charges
8. Identify duplicate charges (same amount on same day)
9. Check for refund discrepancies (Stripe refunds not reflected in wallet)
10. Note any legacy v1_manual records that lack Stripe verification

SEVERITY LEVELS:
- "critical": Direct money issues -- phantom payments, missing deposits, amount mismatches
- "warning": Data integrity issues -- missing PI links, stale records, unverified legacy records
- "info": Informational -- minor inconsistencies, suggestions for cleanup

SUGGESTED ACTIONS (one per finding):
- "flag_for_review": Needs admin investigation
- "mark_verified": Data checks out, can be verified
- "create_adjustment": Wallet adjustment needed to correct balance
- "investigate_stripe": Check Stripe dashboard for more details
- "contact_client": May need client communication

You MUST respond with ONLY valid JSON (no markdown, no explanation outside the JSON). Use this exact structure:
{
  "status": "clean" | "issues_found" | "critical_issues",
  "summary": "One paragraph summary of findings",
  "findings": [
    {
      "id": "finding-1",
      "severity": "critical" | "warning" | "info",
      "category": "phantom_payment" | "missing_deposit" | "amount_mismatch" | "duplicate_charge" | "refund_discrepancy" | "stale_record" | "legacy_unverified",
      "description": "Human-readable description of the issue",
      "affected_records": ["record_id_1"],
      "amount": 150.00,
      "suggested_action": "flag_for_review" | "mark_verified" | "create_adjustment" | "investigate_stripe" | "contact_client",
      "action_description": "What the admin should do"
    }
  ],
  "v1_manual_summary": "Summary of legacy record status (if applicable)",
  "recommendations": ["Overall recommendation 1"]
}

If everything is clean, return status "clean" with an empty findings array.
If there are any issues, return "issues_found". If there are critical money issues, return "critical_issues".`;

    const userPrompt = `Analyze billing integrity for client: ${client.name} (ID: ${clientId}, Status: ${client.status})

## AlphaHub Billing Records (ad_spend, last 100)
${billingRecordsSummary || "No billing records found."}

## Wallet Transactions (last 100)
${walletTxSummary || "No wallet transactions found."}

## Live Stripe Charges (last 90 days)
${stripeChargeSummary}

## audit_books() Assessment
${auditBooksSummary}

## Additional Context
- Billing mode: ${wallet?.billing_mode || "unknown"}
- v1_manual (legacy) records: ${v1ManualCount}
- Existing verifications: ${verifications.length} (${verifications.filter((v) => v.status === "verified").length} verified, ${verifications.filter((v) => v.verification_method === "ai").length} AI-analyzed)
- Stripe customer ID: ${stripeCustomerId || "not linked"}
${!stripeAvailable ? "- WARNING: Stripe cross-reference was unavailable. Analysis limited to AlphaHub data only." : ""}`;

    console.log(
      `[analyze-billing] Analyzing client ${client.name} (${clientId})`,
    );
    console.log(
      `[analyze-billing] Data: ${billingRecords.length} billing records, ${walletTransactions.length} wallet tx, ${stripeCharges.length} Stripe charges`,
    );

    // ── Step 5: Call Claude ──
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
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
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return jsonResponse(
          { error: "Rate limit exceeded. Please try again in a moment." },
          429,
        );
      }
      const errText = await aiResponse.text();
      console.error("[analyze-billing] Anthropic API error:", aiResponse.status, errText);
      return jsonResponse(
        { error: `AI analysis failed (${aiResponse.status})` },
        502,
      );
    }

    const aiData = await aiResponse.json();
    const rawText = aiData.content?.[0]?.text || "";

    // ── Step 6: Parse response ──
    let analysis: AIAnalysisResult;

    try {
      // Try to extract JSON from the response (Claude may wrap in ```json blocks)
      let jsonStr = rawText;
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      const parsed = JSON.parse(jsonStr.trim());
      analysis = {
        status: parsed.status || "error",
        summary: parsed.summary || "",
        findings: Array.isArray(parsed.findings) ? parsed.findings : [],
        v1_manual_summary: parsed.v1_manual_summary || undefined,
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations
          : undefined,
      };
    } catch {
      // JSON parsing failed -- return degraded response with raw text
      console.warn("[analyze-billing] JSON parse failed, returning degraded response");
      analysis = {
        status: "error",
        summary: rawText.slice(0, 500),
        findings: [],
        recommendations: [
          "AI returned non-structured response. Raw text included in summary.",
        ],
      };
    }

    console.log(
      `[analyze-billing] Result: ${analysis.status}, ${analysis.findings.length} findings`,
    );

    // ── Step 7: Persist results in billing_verifications ──
    // Upsert: client-level AI analysis (billing_record_id IS NULL, verification_method = 'ai')
    const { data: existingAi } = await supabase
      .from("billing_verifications")
      .select("id")
      .eq("client_id", clientId)
      .eq("verification_method", "ai")
      .is("billing_record_id", null)
      .limit(1)
      .maybeSingle();

    if (existingAi) {
      await supabase
        .from("billing_verifications")
        .update({
          ai_analysis: analysis as unknown as Record<string, unknown>,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: "quarantined",
        })
        .eq("id", existingAi.id);
    } else {
      await supabase.from("billing_verifications").insert({
        client_id: clientId,
        billing_record_id: null,
        verification_method: "ai",
        ai_analysis: analysis as unknown as Record<string, unknown>,
        verified_at: new Date().toISOString(),
        status: "quarantined",
      });
    }

    return jsonResponse(analysis);
  } catch (error: unknown) {
    console.error("[analyze-billing] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: msg }, 500);
  }
});
