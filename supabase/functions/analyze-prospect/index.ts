import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProspectData {
  name?: string;
  email?: string;
  phone?: string;
  pipelineStage?: string;
  disposition?: string;
  qualStatus?: string;
  intent?: string;
  callCount?: number;
  appointmentStatus?: string;
  noShows?: number;
  reschedules?: number;
  dealValue?: number;
  probability?: number;
  paymentStatus?: string;
  leadSource?: string;
  salesNotes?: string;
}

interface CallSummary {
  title?: string;
  date: string;
  duration?: number;
  summary?: string;
  actionItems?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LLM_API_KEY = Deno.env.get("LLM_API_KEY");
    if (!LLM_API_KEY) {
      throw new Error("LLM_API_KEY is not configured");
    }

    const { prospect, callSummaries } = await req.json() as {
      prospect: ProspectData;
      callSummaries: CallSummary[];
    };

    console.log("Analyzing prospect:", prospect.name, "with", callSummaries.length, "call summaries");

    // Build context about the prospect
    const prospectContext = `
## Prospect Profile
- **Name**: ${prospect.name || 'Unknown'}
- **Email**: ${prospect.email || 'N/A'}
- **Phone**: ${prospect.phone || 'N/A'}
- **Pipeline Stage**: ${prospect.pipelineStage || 'Unknown'}
- **Disposition**: ${prospect.disposition || 'None'}
- **Qualification Status**: ${prospect.qualStatus || 'Unreviewed'}
- **Intent Level**: ${prospect.intent || 'Unsure'}
- **Call Count**: ${prospect.callCount || 0}
- **Appointment Status**: ${prospect.appointmentStatus || 'None'}
- **No-Shows**: ${prospect.noShows || 0}
- **Reschedules**: ${prospect.reschedules || 0}
- **Deal Value**: $${prospect.dealValue || 0}
- **Probability**: ${prospect.probability || 0}%
- **Payment Status**: ${prospect.paymentStatus || 'Not Paid'}
- **Lead Source**: ${prospect.leadSource || 'Unknown'}
${prospect.salesNotes ? `- **Sales Notes**: ${prospect.salesNotes}` : ''}
`;

    // Build call summaries context
    let callContext = "";
    if (callSummaries.length > 0) {
      callContext = "\n## Recent Call Summaries\n";
      for (const call of callSummaries) {
        callContext += `
### ${call.title || 'Call'} (${call.date})
${call.duration ? `Duration: ${Math.round(call.duration / 60)} minutes` : ''}
${call.summary || 'No summary available'}
${call.actionItems && call.actionItems.length > 0 ? `\n**Action Items:**\n${call.actionItems.map(a => `- ${a}`).join('\n')}` : ''}
---
`;
      }
    }

    const systemPrompt = `You are an expert sales analyst for an insurance agency. Your job is to analyze prospects and provide actionable insights based on their profile data and call recordings.

You should:
1. Assess where the prospect is in their buying journey
2. Identify key signals (positive and negative) from the call summaries
3. Suggest specific next steps for the sales rep
4. Flag any concerns or objections that need addressing
5. Rate the prospect's likelihood to close (Hot/Warm/Cold)

Be concise but insightful. Focus on actionable intelligence.`;

    const userPrompt = `Analyze this prospect and provide a sales intelligence synopsis:

${prospectContext}
${callContext}

Provide your analysis in this format:
**Lead Temperature**: [Hot/Warm/Cold]

**Synopsis**: [2-3 sentence summary of where this prospect stands]

**Key Signals**:
- [Positive and negative signals from calls/data]

**Recommended Next Steps**:
1. [Specific action]
2. [Specific action]

**Concerns to Address**:
- [Any objections or red flags]`;

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.content?.[0]?.text || "Unable to generate analysis.";

    console.log("Analysis generated successfully");

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error analyzing prospect:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
