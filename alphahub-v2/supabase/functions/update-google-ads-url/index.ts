import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_ADS_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_ADS_REFRESH_TOKEN');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken!,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${await response.text()}`);
  }

  return (await response.json()).access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerId, campaignId, newFinalUrl } = await req.json();

    if (!customerId || !campaignId || !newFinalUrl) {
      return new Response(
        JSON.stringify({ error: 'customerId, campaignId, and newFinalUrl are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanCustomerId = customerId.replace(/-/g, '');
    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN')!;
    const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID')!;
    const accessToken = await getAccessToken();

    const searchUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/googleAds:searchStream`;
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'login-customer-id': mccCustomerId,
      'Content-Type': 'application/json',
    };

    // Find all ads in campaign with full RSA details
    const adQuery = `
      SELECT 
        ad_group_ad.ad.id, 
        ad_group_ad.ad.final_urls, 
        ad_group_ad.ad.responsive_search_ad.headlines, 
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.status,
        ad_group.id,
        ad_group.name
      FROM ad_group_ad
      WHERE campaign.id = ${campaignId}
    `;

    const adResponse = await fetch(searchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: adQuery }),
    });

    if (!adResponse.ok) {
      throw new Error(`Failed to find ads: ${await adResponse.text()}`);
    }

    const adData = await adResponse.json();
    const ads: any[] = [];

    if (adData && Array.isArray(adData)) {
      for (const batch of adData) {
        if (batch.results) {
          for (const result of batch.results) {
            ads.push({
              adId: result.adGroupAd.ad.id,
              adGroupId: result.adGroup.id,
              adGroupName: result.adGroup.name,
              currentUrls: result.adGroupAd.ad.finalUrls || [],
              headlines: result.adGroupAd.ad.responsiveSearchAd?.headlines || [],
              descriptions: result.adGroupAd.ad.responsiveSearchAd?.descriptions || [],
              status: result.adGroupAd.status,
            });
          }
        }
      }
    }

    if (ads.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No ads found in campaign' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${ads.length} ads to update`);

    const mutateUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/adGroupAds:mutate`;
    const results = [];

    for (const ad of ads) {
      console.log(`Replacing ad ${ad.adId} in ad group ${ad.adGroupId}`);
      console.log(`Old URL: ${ad.currentUrls.join(', ')}`);
      console.log(`New URL: ${newFinalUrl}`);

      // Step 1: Remove old ad
      const adResourceName = `customers/${cleanCustomerId}/adGroupAds/${ad.adGroupId}~${ad.adId}`;

      const removeResponse = await fetch(mutateUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          operations: [{
            remove: adResourceName,
          }],
        }),
      });

      const removeResult = await removeResponse.text();
      console.log(`Remove ad ${ad.adId}:`, removeResponse.status, removeResult);

      if (!removeResponse.ok) {
        results.push({ adId: ad.adId, step: 'remove', success: false, error: removeResult });
        continue;
      }

      // Step 2: Create new ad with updated URL
      const createResponse = await fetch(mutateUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          operations: [{
            create: {
              adGroup: `customers/${cleanCustomerId}/adGroups/${ad.adGroupId}`,
              status: ad.status,
              ad: {
                finalUrls: [newFinalUrl],
                responsiveSearchAd: {
                  headlines: ad.headlines,
                  descriptions: ad.descriptions,
                },
              },
            },
          }],
        }),
      });

      const createResult = await createResponse.text();
      console.log(`Create new ad:`, createResponse.status, createResult);

      results.push({
        adId: ad.adId,
        oldUrls: ad.currentUrls,
        newUrl: newFinalUrl,
        removeSuccess: true,
        createSuccess: createResponse.ok,
        createResponse: createResponse.ok ? JSON.parse(createResult) : createResult,
      });
    }

    return new Response(
      JSON.stringify({ success: true, adsProcessed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating Google Ads URL:', error);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
