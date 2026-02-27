import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agent_bio_input, first_name, last_name } = await req.json();

    if (!agent_bio_input) {
      return new Response(
        JSON.stringify({ error: "agent_bio_input is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You work as a professional writer in the insurance industry at IUL. 

Based on the following brief description, write a clear and professional first-person biography of about 100 words. 

Important: Do not include the agent's name anywhere in the text. 

Tone: professional, warm, and trustworthy, focused on IUL agents.  

Output: Only the biography text, no introductions, no titles, no agent name. Make sure it is a single line as well.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Brief description: ${agent_bio_input}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedBio = data.choices?.[0]?.message?.content?.trim();

    if (!generatedBio) {
      throw new Error("No bio generated from AI");
    }

    console.log("Generated bio for agent:", first_name, last_name);
    console.log("Bio:", generatedBio);

    return new Response(
      JSON.stringify({ 
        success: true, 
        bio: generatedBio 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error generating agent bio:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate bio";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
