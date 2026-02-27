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
    const { clientId, adminContext } = await req.json();

    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Fetch client first to get agent_id
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (clientError || !client) throw new Error("Client not found");

    // Step 2: Fetch all data in parallel using client.agent_id for leads
    const [
      disputeRes,
      chatConvoRes,
      leadsRes,
      adSpendRes,
      billingRes,
      checklistRes,
      agreementRes,
    ] = await Promise.all([
      supabase.from("disputes").select("*").eq("client_id", clientId)
        .in("status", ["needs_response", "under_review", "warning_needs_response", "warning_under_review"])
        .order("created_at", { ascending: false }).limit(1),
      supabase.from("chat_conversations").select("id").eq("client_id", clientId).single(),
      // FIXED: Filter leads by the client's agent_id, not all delivered leads
      supabase.from("leads")
        .select("id, first_name, last_name, email, phone, lead_date, status, delivery_status, delivered_at, booked_call_at, created_at, agent_id")
        .eq("agent_id", client.agent_id || "NONE")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("ad_spend_daily").select("spend_date, cost, clicks, impressions, conversions, cpc, ctr")
        .eq("client_id", clientId).order("spend_date", { ascending: false }).limit(90),
      supabase.from("billing_records").select("id, amount, billing_type, status, created_at, paid_at, due_date, notes, recurrence_type")
        .eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("onboarding_checklist").select("item_label, category, status, completed_at, updated_at")
        .eq("client_id", clientId).order("display_order"),
      // FIXED: Fetch full agreement audit data for timestamps
      supabase.from("agreements").select("*")
        .eq("client_id", clientId).eq("status", "signed").order("signed_at", { ascending: false }).limit(1),
    ]);

    // Fetch chat messages if conversation exists
    let chatMessages: any[] = [];
    if (chatConvoRes.data?.id) {
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("message, sender_name, sender_role, created_at")
        .eq("conversation_id", chatConvoRes.data.id)
        .order("created_at", { ascending: true })
        .limit(500);
      chatMessages = msgs || [];
    }

    const dispute = (disputeRes.data || [])[0] || null;
    const agreement = (agreementRes.data || [])[0] || null;
    const allLeads = leadsRes.data || [];
    const deliveredLeads = allLeads.filter((l: any) => l.delivery_status === "delivered");
    const adSpend = adSpendRes.data || [];
    const billing = billingRes.data || [];
    const checklist = checklistRes.data || [];

    // Calculate totals
    const totalAdSpend = adSpend.reduce((sum: number, d: any) => sum + (d.cost || 0), 0);
    const totalClicks = adSpend.reduce((sum: number, d: any) => sum + (d.clicks || 0), 0);
    const totalImpressions = adSpend.reduce((sum: number, d: any) => sum + (d.impressions || 0), 0);
    const totalLeadsDelivered = deliveredLeads.length;

    // Build agreement audit summary for AI
    const rawKeyTerms = agreement?.key_terms_checkboxes;
    const keyTermsCheckboxes: any[] = Array.isArray(rawKeyTerms) ? rawKeyTerms : (rawKeyTerms && typeof rawKeyTerms === 'object' ? Object.values(rawKeyTerms) : []);
    const rawInitials = agreement?.initials_sections_completed;
    const initialsSections: any[] = Array.isArray(rawInitials) ? rawInitials : (rawInitials && typeof rawInitials === 'object' ? Object.values(rawInitials) : []);
    const rawAudit = agreement?.audit_events;
    const auditEvents: any[] = Array.isArray(rawAudit) ? rawAudit : (rawAudit && typeof rawAudit === 'object' ? Object.values(rawAudit) : []);
    const rawFocus = agreement?.focus_events;
    const focusEvents: any[] = Array.isArray(rawFocus) ? rawFocus : (rawFocus && typeof rawFocus === 'object' ? Object.values(rawFocus) : []);

    const agreementAuditSummary = agreement ? `
AGREEMENT AUDIT DATA:
Document ID (SHA-256 hash): ${agreement.contract_content_hash || "N/A"}
Signed At: ${agreement.signed_at || "N/A"}
OTP Verified At: ${agreement.otp_verified_at || "N/A"}
OTP Verified: ${agreement.otp_verified ? "Yes" : "No"}
Scrolled To Bottom At: ${agreement.scrolled_to_bottom_at || "N/A"}
Page Load At: ${agreement.page_load_at || "N/A"}
Time On Page (seconds): ${agreement.time_on_page_seconds || "N/A"}
Electronic Intent Accepted At: ${agreement.electronic_intent_accepted_at || "N/A"}
Signer Full Name: ${agreement.signer_full_name || "N/A"}
Signer Email: ${agreement.signer_email || "N/A"}
Signer Phone: ${agreement.signer_phone || "N/A"}
IP Address: ${agreement.ip_address || "N/A"}
Platform/OS: ${agreement.platform_os || "N/A"}
Signature Method: ${agreement.signature_drawn_url ? "Handwritten electronic signature" : agreement.signature_typed ? "Typed signature" : "N/A"}
PDF Hash: ${agreement.pdf_hash || "N/A"}
Total Audit Events: ${auditEvents.length}
Total Focus Events: ${focusEvents.length}

KEY TERMS ACKNOWLEDGED (${keyTermsCheckboxes.length} total):
${keyTermsCheckboxes.map((kt: any, i: number) => `${i + 1}. "${kt.label || kt.term || `Key Term #${i+1}`}" — acknowledged at ${kt.accepted_at || kt.timestamp || "N/A"}`).join("\n")}

INITIALS ON CRITICAL CLAUSES (${initialsSections.length} total):
${initialsSections.map((is: any, i: number) => `${i + 1}. "${is.label || is.section || `Section ${i+1}`}" — initialed "${is.initials || "N/A"}" at ${is.initialed_at || is.timestamp || "N/A"}`).join("\n")}

FOCUS EVENTS DURING SIGNING: ${focusEvents.length === 0 ? "ZERO tab-focus events — client never left the agreement page during the entire signing session." : `${focusEvents.length} focus events recorded.`}
` : "No agreement audit data available.";

    // Build activity log
    const activityLog = buildActivityLog(chatMessages, allLeads, billing, checklist, adSpend, agreement, client);

    // Build AI prompt sections
    const chatTranscript = chatMessages.map((m: any) =>
      `[${new Date(m.created_at).toLocaleString()}] ${m.sender_name} (${m.sender_role}): ${m.message}`
    ).join("\n");

    const agreementExcerpt = agreement?.contract_content
      ? agreement.contract_content.substring(0, 8000)
      : "No agreement content available.";

    const leadsSummary = deliveredLeads.slice(0, 50).map((l: any) =>
      `${l.first_name || ""} ${l.last_name || ""} | ${l.lead_date || l.created_at} | Status: ${l.status || "new"} | Delivery: ${l.delivery_status || "unknown"} | Booked: ${l.booked_call_at || "N/A"}`
    ).join("\n");

    const adSpendSummary = adSpend.slice(0, 30).map((d: any) =>
      `${d.spend_date} | Spend: $${(d.cost || 0).toFixed(2)} | Clicks: ${d.clicks || 0} | Impressions: ${d.impressions || 0}`
    ).join("\n");

    const billingSummary = billing.map((b: any) =>
      `${new Date(b.created_at).toLocaleDateString()} | $${b.amount} | Type: ${b.billing_type} | Status: ${b.status} | Paid: ${b.paid_at ? new Date(b.paid_at).toLocaleDateString() : "Unpaid"}`
    ).join("\n");

    const checklistSummary = checklist.filter((c: any) => c.status === "yes").map((c: any) =>
      `${c.completed_at || c.updated_at} | ✓ ${c.item_label}`
    ).join("\n");

    const systemPrompt = `You are an expert dispute response writer for a digital marketing agency called ALPHA AGENT MARKETING LLC. You write dispute responses that WIN chargebacks. Your responses are submitted directly into bank dispute forms that render PLAIN TEXT ONLY.

CRITICAL FORMATTING RULES:
- NEVER use markdown formatting. No bold markers (**), no hashtags (#), no asterisks (*), no underscores for emphasis, no bullet characters.
- Use CAPS for emphasis when needed (e.g., "NON-REFUNDABLE", "SERVICE DELIVERED").
- Use plain numbered lists (1. 2. 3.) not bullet points.
- Use labeled sub-sections on their own line followed by a colon (e.g., "SERVICE PURCHASED:", "AUTHORIZATION EVIDENCE:", "CLIENT COMPLIANCE:").
- Write in plain text paragraphs. Dispute forms render plain text — markdown characters will appear as literal characters and look unprofessional.
- Write LONG, DETAILED responses for each section. Each section should be the full word count specified. Do NOT abbreviate or summarize. Use ALL the data provided.

You will receive the admin's description of what happened, the signed service agreement with FULL AUDIT DATA including timestamps for every acknowledgment, chat communications, lead delivery records, ad spend data, billing records, and onboarding activity.

IMPORTANT: The agreement audit data contains EXACT TIMESTAMPS for OTP verification, each Key Term acknowledgment, each initials section, scroll confirmation, and signature. USE THESE EXACT TIMESTAMPS in your response. Do not say "N/A" if timestamps are provided.

Write EXACTLY these 5 sections. Output each section name on its own line (e.g., "PRODUCT_DESCRIPTION") followed by the content. Do not add any other section headers or decorations around the section names.

PRODUCT_DESCRIPTION
Write 200-300 words in three clear paragraphs. Use ALL the agreement audit timestamps provided:

SERVICE PURCHASED: Start with what the service is. State this is a business-to-business commercial transaction between Alpha Agent Marketing LLC and the client (a licensed insurance agent if applicable). The client entered this agreement solely for commercial/business purposes as stated in Recital A of the Agreement. Describe the service: monthly campaign management for insurance lead generation including advertising campaign management, landing page deployment, CRM setup, and operational support. State the fee structure (management fee amount plus separate ad spend funding).

AUTHORIZATION EVIDENCE: Detail the signing flow with SPECIFIC TIMESTAMPS from the agreement audit data provided. Include ALL of these with their exact timestamps: Agreement Document ID (the SHA-256 hash), execution date/time (signed_at), OTP phone identity verification time (otp_verified_at), number of Key Terms acknowledged via clickwrap with examples and their timestamps, number of critical clauses separately initialed (including "No Refunds / Ad Spend Non-Refundable" and "Chargebacks Prohibited + $250 Fee" with their exact timestamps), read confirmation (scrolled_to_bottom_at), and signature method. Mention the tamper-evident audit certificate with SHA-256 content hash and the exact number of logged audit events.

SERVICE DELIVERY CONFIRMED: State that the client actively used the service after purchase. List specific evidence of engagement from the chat messages and lead data: received deployed landing page, engaged with incoming leads, asked campaign optimization questions, discussed lead quality adjustments, reported progress. The service relationship was active and ongoing prior to the dispute filing.

CANCELLATION_DISCLOSURE
Write 150-250 words structured as:

DISCLOSURE EVIDENCE: List the specific Key Terms the client acknowledged related to cancellation WITH THEIR EXACT TIMESTAMPS from the audit data. Include Key Term #7 "Cancellation Requires 21-Day Notice + Form" and Key Term #8 "Mandatory Zoom Resolution First" (which requires a Zoom resolution conference before initiating any claim, payment dispute, or chargeback). Reference Section 11.2 requirements: (a) 21 days written notice via email to support@alphaagent.io or Alpha Hub chat before the next billing date, AND (b) completion of the required cancellation form. Reference Section 15.1: before initiating any payment dispute or chargeback, the client must first request an informal resolution conference via Zoom.

CLIENT COMPLIANCE: State explicitly that the client did NONE of the required steps. They did not provide 21 days written notice. They did not complete the cancellation form. They did not request or attend a Zoom resolution conference. They filed chargebacks without following any of the contractually required steps. Their cancellation is procedurally invalid under the signed Agreement.

REFUND_REFUSAL
Write 200-300 words structured as:

Open with "We respectfully deny the requested refund." State the charges are expressly non-refundable under the signed Agreement and that Alpha Agent performed the contracted management services in full.

SERVICE DELIVERY: List specific evidence that service was delivered: campaign built and deployed, landing page live, CRM configured, leads delivered to account (state the exact number of leads delivered), ongoing campaign management and support provided. Reference specific engagement from chat messages showing the client actively used the service.

If the admin's context mentions a specific issue the client is disputing (like a lead pause, platform issue, etc.), address it directly with a dedicated paragraph. Reference Section 3.5 of the Agreement which states the Company is not liable for third-party platform actions including policy changes, suspensions, tracking changes, or performance fluctuation. Note that the client acknowledged Key Term #1 "No Guarantees / Services Are Management" confirming they understood lead delivery volume is not guaranteed.

FEE STRUCTURE: Under Section 9.1, the monthly Management Fee is earned upon allocation of service capacity and is not contingent on a guaranteed number of leads or outcomes (Section 3.1). Under Sections 9.3 and 9.8, Ad Spend is non-refundable immediately upon payment to Alpha Agent LLC, regardless of performance, lead volume, platform actions, or whether any portion is later deployed to third parties.

Close with: "The client received exactly what the Agreement provides: campaign management services."

REFUND_DISCLOSURE
Write 100-150 words. Keep this TIGHT and evidence-focused. Just the disclosure chain with EXACT TIMESTAMPS from the audit data, no re-quoting what the agreement sections say.

List the disclosure chain:
1. Key Term #2: "Ad Spend + Operations Fee Non-Refundable Upon Payment" with exact timestamp
2. Key Term #3: "No Refunds (All Fees)" with exact timestamp
3. Key Term #4: "Chargebacks Prohibited / Material Breach" with exact timestamp
4. Separate initials on "No Refunds / Ad Spend Non-Refundable" with exact timestamp
5. Separate initials on "Chargebacks Prohibited + $250 Fee" with exact timestamp

End with one sentence: "These disclosures are reinforced in the operative terms of the attached Agreement at Sections 9.1, 9.3, 9.7, and 9.8. The client read the full agreement (read confirmed at [scrolled_to_bottom_at timestamp]), initialed the critical clauses, and signed. There was no ambiguity about the refund policy."

ADDITIONAL_INFO
Write 200-300 words as a closing argument structured as:

Open with: "This dispute should be decided in Alpha Agent's favor."

1. TRANSACTION TYPE: State this is a business-to-business commercial transaction. The client is a licensed insurance agent who entered this Agreement solely for commercial/business purposes (Recital A).

2. AUTHORIZATION: Summarize the layered authorization with timestamps: OTP phone identity verification, clickwrap acknowledgment of Key Terms, separate initials on critical clauses, explicit read confirmation, and handwritten electronic signature. Mention the tamper-evident audit certificate with the exact number of logged events and SHA-256 content hash. If focus_events data shows zero tab-focus events, mention the client never left the agreement page during the entire signing session.

3. ACTIVE SERVICE USE: List specific evidence of the client actively engaging with the service. Use separate lines for each point, not a run-on sentence:
- Received and used deployed landing page
- Engaged with incoming leads delivered to account
- Asked campaign optimization questions
- Discussed lead quality adjustments with the team
- Reported progress

4. CLIENT ADMISSIONS: If the admin's context mentions any client admissions (emails, messages where client admits charges were authorized or disputes were filed as a "protective measure"), reference them here. If none mentioned, skip this sub-section entirely.

5. Close with: "This dispute has no factual or contractual basis for reversal."`;

    const userPrompt = `## Admin's Account of What Happened
${adminContext || "No additional context provided by admin."}

## Dispute Details
Amount: $${dispute ? (dispute.amount / 100).toFixed(2) : "Unknown"}
Reason: ${dispute?.reason || "Unknown"}
Evidence Due: ${dispute?.evidence_due_by || "Unknown"}

## Client Details
Name: ${client.name}
Email: ${client.email}
Phone: ${client.phone || "N/A"}
Address: ${[client.address_street, client.address_city, client.address_state, client.address_zip, client.address_country].filter(Boolean).join(", ") || "N/A"}
Start Date: ${client.start_date || client.created_at}
Status: ${client.status}
Agent ID: ${client.agent_id || "N/A"}

## Service Agreement (Signed ${agreement?.signed_at ? new Date(agreement.signed_at).toLocaleString() : "N/A"})
${agreementAuditSummary}

## Agreement Contract Text (first 8000 chars)
${agreementExcerpt}

## Chat Communications (${chatMessages.length} messages)
${chatTranscript || "No chat messages found."}

## Leads Delivered to This Agent (${totalLeadsDelivered} delivered out of ${allLeads.length} total)
${leadsSummary || "No leads found for this agent."}

## Ad Spend Proof (Total: $${totalAdSpend.toFixed(2)}, ${totalClicks} clicks, ${totalImpressions} impressions)
${adSpendSummary || "No ad spend data."}

## Billing Records
${billingSummary || "No billing records."}

## Onboarding Activity (Completed Items)
${checklistSummary || "No onboarding data."}`;

    console.log("Generating dispute evidence for client:", client.name);
    console.log("Agent ID:", client.agent_id);
    console.log("Leads for this agent:", allLeads.length, "delivered:", totalLeadsDelivered);
    console.log("Agreement audit events:", auditEvents.length);
    console.log("Key terms acknowledged:", keyTermsCheckboxes.length);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const narrative = aiData.choices?.[0]?.message?.content || "";

    console.log("AI narrative length:", narrative.length);
    console.log("AI narrative first 1000 chars:", narrative.substring(0, 1000));

    // Parse sections — use multiline flag and match between section headers
    const sectionNames = ["PRODUCT_DESCRIPTION", "CANCELLATION_DISCLOSURE", "REFUND_REFUSAL", "REFUND_DISCLOSURE", "ADDITIONAL_INFO"];
    
    const parseSection = (name: string): string => {
      // Build a pattern that matches from the section header to the next section header or end
      const nextSections = sectionNames.filter(s => s !== name).join("|");
      const patterns = [
        // Plain section header on its own line: SECTION_NAME\n or SECTION_NAME:\n
        new RegExp(`^${name}[:\\s]*\\n([\\s\\S]*?)(?=^(?:${nextSections})[:\\s]*$|$(?!\\n))`, "m"),
        // With markdown bold: **SECTION_NAME**
        new RegExp(`\\*\\*${name}\\*\\*[:\\s]*\\n?([\\s\\S]*?)(?=\\*\\*(?:${nextSections})\\*\\*|$)`, "i"),
        // With ## header
        new RegExp(`##\\s*${name}[:\\s]*\\n([\\s\\S]*?)(?=##\\s*(?:${nextSections})|$)`, "i"),
      ];
      for (const regex of patterns) {
        const match = narrative.match(regex);
        if (match && match[1]?.trim().length > 20) {
          return match[1].trim();
        }
      }
      console.log(`Section "${name}" not parsed. Narrative starts with: ${narrative.substring(0, 200)}`);
      return "";
    };

    const result = {
      success: true,
      client: {
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: [client.address_street, client.address_city, client.address_state, client.address_zip, client.address_country].filter(Boolean).join(", "),
        startDate: client.start_date || client.created_at,
      },
      dispute: dispute ? {
        amount: (dispute.amount / 100).toFixed(2),
        reason: dispute.reason,
        evidenceDueBy: dispute.evidence_due_by,
        status: dispute.status,
      } : null,
      narrative: {
        productDescription: parseSection("PRODUCT_DESCRIPTION"),
        cancellationDisclosure: parseSection("CANCELLATION_DISCLOSURE"),
        refundRefusal: parseSection("REFUND_REFUSAL"),
        refundDisclosure: parseSection("REFUND_DISCLOSURE"),
        additionalInfo: parseSection("ADDITIONAL_INFO"),
        fullNarrative: narrative,
      },
      activityLog: activityLog,
      chatMessages: chatMessages.map((m: any) => ({
        date: m.created_at,
        sender: m.sender_name,
        role: m.sender_role,
        message: m.message,
      })),
      leads: deliveredLeads.map((l: any) => ({
        name: `${l.first_name || ""} ${l.last_name || ""}`.trim(),
        email: l.email,
        phone: l.phone,
        date: l.lead_date || l.created_at,
        status: l.status,
        deliveryStatus: l.delivery_status,
        deliveredAt: l.delivered_at,
        bookedCallAt: l.booked_call_at,
      })),
      adSpendTotals: { totalSpend: totalAdSpend, totalClicks, totalImpressions },
      billing: billing.map((b: any) => ({
        date: b.created_at,
        amount: b.amount,
        type: b.billing_type,
        status: b.status,
        paidAt: b.paid_at,
      })),
      agreement: agreement ? {
        signedAt: agreement.signed_at,
        pdfUrl: agreement.pdf_url,
        signerName: agreement.signer_full_name,
      } : null,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error generating dispute evidence:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Build a chronological activity log of everything the client did
function buildActivityLog(
  chatMessages: any[],
  leads: any[],
  billing: any[],
  checklist: any[],
  adSpend: any[],
  agreement: any,
  client: any
): string {
  const events: { date: string; action: string }[] = [];

  // Agreement signing
  if (agreement?.signed_at) {
    events.push({ date: agreement.signed_at, action: `Signed Digital Marketing Management Agreement (Document ID: ${agreement.contract_content_hash || "N/A"})` });
  }
  if (agreement?.otp_verified_at) {
    events.push({ date: agreement.otp_verified_at, action: "Completed OTP phone identity verification during agreement signing" });
  }
  if (agreement?.electronic_intent_accepted_at) {
    events.push({ date: agreement.electronic_intent_accepted_at, action: "Accepted Electronic Signature Intent" });
  }
  if (agreement?.scrolled_to_bottom_at) {
    events.push({ date: agreement.scrolled_to_bottom_at, action: "Scrolled to bottom of agreement and confirmed reading the full document" });
  }

  // Key terms acknowledgments
  const rawKT = agreement?.key_terms_checkboxes;
  const keyTerms: any[] = Array.isArray(rawKT) ? rawKT : (rawKT && typeof rawKT === 'object' ? Object.values(rawKT) : []);
  for (const kt of keyTerms) {
    const ts = kt.accepted_at || kt.timestamp;
    if (ts) {
      events.push({ date: ts, action: `Acknowledged Key Term: "${kt.label || kt.term || "Unknown"}"` });
    }
  }

  // Initials
  const rawIS = agreement?.initials_sections_completed;
  const initials: any[] = Array.isArray(rawIS) ? rawIS : (rawIS && typeof rawIS === 'object' ? Object.values(rawIS) : []);
  for (const ini of initials) {
    const ts = ini.initialed_at || ini.timestamp;
    if (ts) {
      events.push({ date: ts, action: `Initialed critical clause: "${ini.label || ini.section || "Unknown"}" with initials "${ini.initials || "N/A"}"` });
    }
  }

  // Client account creation
  if (client.created_at) {
    events.push({ date: client.created_at, action: "Client account created in Alpha Hub" });
  }
  if (client.contract_signed_at) {
    events.push({ date: client.contract_signed_at, action: "Contract marked as signed in Alpha Hub" });
  }

  // Onboarding checklist completions
  for (const item of checklist) {
    if (item.status === "yes" && (item.completed_at || item.updated_at)) {
      events.push({ date: item.completed_at || item.updated_at, action: `Onboarding completed: ${item.item_label}` });
    }
  }

  // Chat messages from the client
  for (const msg of chatMessages) {
    if (msg.sender_role === "client") {
      events.push({ date: msg.created_at, action: `Client sent message: "${msg.message.substring(0, 120)}${msg.message.length > 120 ? "..." : ""}"` });
    } else {
      events.push({ date: msg.created_at, action: `Admin (${msg.sender_name}) sent message: "${msg.message.substring(0, 120)}${msg.message.length > 120 ? "..." : ""}"` });
    }
  }

  // Lead deliveries
  for (const lead of leads) {
    if (lead.delivered_at) {
      events.push({ date: lead.delivered_at, action: `Lead delivered: ${lead.first_name || ""} ${lead.last_name || ""} (${lead.email || "no email"})` });
    }
    if (lead.booked_call_at) {
      events.push({ date: lead.booked_call_at, action: `Lead booked a call: ${lead.first_name || ""} ${lead.last_name || ""}` });
    }
  }

  // Billing events
  for (const b of billing) {
    events.push({ date: b.created_at, action: `Billing record created: $${b.amount} (${b.billing_type}) — Status: ${b.status}` });
    if (b.paid_at) {
      events.push({ date: b.paid_at, action: `Payment received: $${b.amount} (${b.billing_type})` });
    }
  }

  // Sort chronologically
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Format as plain text
  return events.map(e => {
    const d = new Date(e.date);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()} — ${e.action}`;
  }).join("\n");
}
