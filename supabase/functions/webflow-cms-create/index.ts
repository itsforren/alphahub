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

// Fixed values
const TRACKING_CODE = "AW-742357357";
const SURVEY_ID = "DUKD1xm6P91jbmQHBu29";
const JOB_TITLE = "TFWP Senior Specialist";

interface SchedulerPageData {
  name: string;
  slug: string;
  embed_id?: string;
  agent_image_url: string;
  tracking_code: string;
  bio_summary: string;
}

interface LanderPageData {
  name: string;
  slug: string;
  survey_id: string;
  schedule_redirect_url: string;
}

interface ProfilePageData {
  name: string;
  slug: string;
  profile_picture_url: string;
  bio: string;
  bio_summary: string;
  job_title: string;
  email: string;
  phone: string;
  agent_vsl_link: string;
}

interface ThankYouPageData {
  name: string;
  slug: string;
  nfia_page_url: string;
  sms_message_link: string;
  headshot_url: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WEBFLOW_API_TOKEN = Deno.env.get("WEBFLOW_API_TOKEN");
    const WEBFLOW_SITE_ID = Deno.env.get("WEBFLOW_SITE_ID");

    if (!WEBFLOW_API_TOKEN) {
      throw new Error("WEBFLOW_API_TOKEN is not configured");
    }

    const { page_type, data, publish = true } = await req.json();

    if (!page_type || !data) {
      return new Response(
        JSON.stringify({ error: "page_type and data are required" }),
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

    console.log(`Creating ${page_type} page with slug: ${data.slug}`);

    // Build field data based on page type
    let fieldData: Record<string, any> = {
      name: data.name,
      slug: data.slug,
      _archived: false,
      _draft: false
    };

    switch (page_type) {
      case "schedulers":
        fieldData = {
          ...fieldData,
          "embed-id": data.embed_id || "",
          "agent-image": data.agent_image_url || "",
          "tracking-code": TRACKING_CODE,
          "bio-summary": data.bio_summary || ""
        };
        break;

      case "landers":
        fieldData = {
          ...fieldData,
          "survey-id": SURVEY_ID,
          "schedule-redirect-url": data.schedule_redirect_url || ""
        };
        break;

      case "profiles":
        fieldData = {
          ...fieldData,
          "profile-picture": data.profile_picture_url || "",
          "bio": data.bio || "",
          "bio-summary": data.bio_summary || "",
          "job-title": JOB_TITLE,
          "email": data.email || "",
          "phone-number": data.phone || "",
          "twitter-link": data.agent_vsl_link || ""
        };
        break;

      case "thankyou":
        fieldData = {
          ...fieldData,
          "national-fia-page": data.nfia_page_url || "",
          "sms-message-link": data.sms_message_link || "",
          "headshot": data.headshot_url || ""
        };
        break;
    }

    console.log("Webflow field data:", JSON.stringify(fieldData, null, 2));

    // Check if item with this slug already exists
    let existingItemId: string | null = null;
    const lookupUrl = `https://api.webflow.com/v2/collections/${collectionId}/items?slug=${encodeURIComponent(data.slug)}`;
    console.log("Looking up existing item by slug:", data.slug);

    const lookupResponse = await fetch(lookupUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${WEBFLOW_API_TOKEN}`,
        "accept": "application/json"
      }
    });

    if (lookupResponse.ok) {
      const lookupData = await lookupResponse.json();
      if (lookupData.items && lookupData.items.length > 0) {
        existingItemId = lookupData.items[0].id;
        console.log("Found existing item:", existingItemId);
      }
    } else {
      console.warn("Slug lookup failed, will attempt create:", lookupResponse.status);
    }

    let itemId: string;
    let wasUpdated = false;

    if (existingItemId) {
      // UPDATE existing item
      console.log("Updating existing item:", existingItemId);
      const updateResponse = await fetch(
        `https://api.webflow.com/v2/collections/${collectionId}/items/${existingItemId}`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${WEBFLOW_API_TOKEN}`,
            "Content-Type": "application/json",
            "accept": "application/json"
          },
          body: JSON.stringify({ fieldData })
        }
      );

      const updateResponseText = await updateResponse.text();
      console.log("Webflow update response:", updateResponse.status, updateResponseText);

      if (!updateResponse.ok) {
        throw new Error(`Webflow API update error: ${updateResponse.status} - ${updateResponseText}`);
      }

      itemId = existingItemId;
      wasUpdated = true;
    } else {
      // CREATE new item
      const createResponse = await fetch(
        `https://api.webflow.com/v2/collections/${collectionId}/items`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${WEBFLOW_API_TOKEN}`,
            "Content-Type": "application/json",
            "accept": "application/json"
          },
          body: JSON.stringify({ fieldData })
        }
      );

      const createResponseText = await createResponse.text();
      console.log("Webflow create response status:", createResponse.status);
      console.log("Webflow create response:", createResponseText);

      if (!createResponse.ok) {
        throw new Error(`Webflow API error: ${createResponse.status} - ${createResponseText}`);
      }

      const createData = JSON.parse(createResponseText);
      itemId = createData.id;
    }

    // Publish the item if requested
    if (publish && itemId) {
      console.log("Publishing item:", itemId);
      
      const publishResponse = await fetch(
        `https://api.webflow.com/v2/collections/${collectionId}/items/publish`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${WEBFLOW_API_TOKEN}`,
            "Content-Type": "application/json",
            "accept": "application/json"
          },
          body: JSON.stringify({ itemIds: [itemId] })
        }
      );

      const publishResponseText = await publishResponse.text();
      console.log("Webflow publish response:", publishResponse.status, publishResponseText);

      if (!publishResponse.ok) {
        console.warn("Failed to publish item, but item was created:", publishResponseText);
      }
    }

    // Construct the live URL based on page type
    const siteBaseUrl = "https://www.taxfreewealthplan.com";
    let liveUrl: string;
    
    switch (page_type) {
      case "schedulers":
        liveUrl = `${siteBaseUrl}/schedule/${data.slug}`;
        break;
      case "landers":
        liveUrl = `${siteBaseUrl}/discover/${data.slug}`;
        break;
      case "profiles":
        liveUrl = `${siteBaseUrl}/team/${data.slug}`;
        break;
      case "thankyou":
        liveUrl = `${siteBaseUrl}/thank-you/${data.slug}`;
        break;
      default:
        liveUrl = `${siteBaseUrl}/${data.slug}`;
    }

    console.log(`${page_type} page created successfully:`, liveUrl);

    return new Response(
      JSON.stringify({ 
        success: true,
        item_id: itemId,
        slug: data.slug,
        live_url: liveUrl,
        page_type,
        updated: wasUpdated
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error creating Webflow page:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create Webflow page";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
