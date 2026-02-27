import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Collection IDs for Tax Free Wealth Plan site
const COLLECTION_IDS = {
  schedulers: "687565796f669f888c649d2c",
  landers: "687574b9d408f8f4b80263aa",
  profiles: "6866a523d492c9734446c4af",
  thankyou: "68dc40c4975ce7211a8534d5"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WEBFLOW_API_TOKEN = Deno.env.get("WEBFLOW_API_TOKEN");

    if (!WEBFLOW_API_TOKEN) {
      throw new Error("WEBFLOW_API_TOKEN is not configured");
    }

    const { page_type, item_id, field_updates, publish = true } = await req.json();

    if (!page_type || !item_id || !field_updates) {
      return new Response(
        JSON.stringify({ error: "page_type, item_id, and field_updates are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const collectionId = COLLECTION_IDS[page_type as keyof typeof COLLECTION_IDS];
    if (!collectionId) {
      return new Response(
        JSON.stringify({ error: `Invalid page_type: ${page_type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Updating ${page_type} item: ${item_id}`);
    console.log("Field updates:", JSON.stringify(field_updates, null, 2));

    // Update the CMS item
    const updateResponse = await fetch(
      `https://api.webflow.com/v2/collections/${collectionId}/items/${item_id}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${WEBFLOW_API_TOKEN}`,
          "Content-Type": "application/json",
          "accept": "application/json"
        },
        body: JSON.stringify({ fieldData: field_updates })
      }
    );

    const updateResponseText = await updateResponse.text();
    console.log("Webflow update response status:", updateResponse.status);
    console.log("Webflow update response:", updateResponseText);

    if (!updateResponse.ok) {
      throw new Error(`Webflow API error: ${updateResponse.status} - ${updateResponseText}`);
    }

    const updateData = JSON.parse(updateResponseText);

    // Publish the item if requested
    if (publish) {
      console.log("Publishing updated item:", item_id);
      
      const publishResponse = await fetch(
        `https://api.webflow.com/v2/collections/${collectionId}/items/publish`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${WEBFLOW_API_TOKEN}`,
            "Content-Type": "application/json",
            "accept": "application/json"
          },
          body: JSON.stringify({ itemIds: [item_id] })
        }
      );

      const publishResponseText = await publishResponse.text();
      console.log("Webflow publish response:", publishResponse.status, publishResponseText);

      if (!publishResponse.ok) {
        console.warn("Failed to publish updated item:", publishResponseText);
      }
    }

    console.log(`${page_type} item updated successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        item_id,
        updated_fields: Object.keys(field_updates)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error updating Webflow page:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update Webflow page";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
