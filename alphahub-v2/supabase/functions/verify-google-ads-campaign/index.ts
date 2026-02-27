import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const error = await response.text();
    console.error('OAuth token error:', error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, googleCampaignId } = await req.json();

    console.log('=== VERIFY GOOGLE ADS CAMPAIGN ===');
    console.log(`Client ID: ${clientId}`);
    console.log(`Google Campaign ID: ${googleCampaignId}`);

    if (!clientId) {
      throw new Error('clientId is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If no campaign ID, mark everything as not created
    if (!googleCampaignId) {
      await supabase
        .from('clients')
        .update({
          gads_campaign_created: false,
          gads_adgroup_created: false,
          gads_ad_created: false,
        })
        .eq('id', clientId);

      return new Response(JSON.stringify({
        success: true,
        campaignExists: false,
        adGroupExists: false,
        adExists: false,
        message: 'No campaign ID configured',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse campaign ID (format: customerId:campaignId)
    let customerId: string;
    let campaignId: string;

    if (googleCampaignId.includes(':')) {
      const [customerPart, campaignPart] = googleCampaignId.split(':');
      customerId = customerPart.replace(/\D/g, '');
      campaignId = campaignPart.replace(/\D/g, '');
    } else {
      // Assume it's just the campaign ID with default customer
      const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
      customerId = mccCustomerId?.replace(/-/g, '') || '';
      campaignId = googleCampaignId.replace(/\D/g, '');
    }

    if (!customerId || !campaignId) {
      throw new Error('Invalid campaign ID format');
    }

    console.log(`Customer ID: ${customerId}, Campaign ID: ${campaignId}`);

    const accessToken = await getAccessToken();
    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID')?.replace(/-/g, '');
    
    const searchUrl = `https://googleads.googleapis.com/v22/customers/${customerId}/googleAds:searchStream`;

    // Check if campaign exists
    let campaignExists = false;
    let campaignName = '';
    
    const campaignQuery = `
      SELECT campaign.id, campaign.name, campaign.status
      FROM campaign
      WHERE campaign.id = ${campaignId}
    `;

    try {
      const campaignResponse = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken!,
          'login-customer-id': mccCustomerId!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: campaignQuery }),
      });

      if (campaignResponse.ok) {
        const campaignData = await campaignResponse.json();
        if (campaignData && Array.isArray(campaignData)) {
          for (const batch of campaignData) {
            if (batch.results && batch.results.length > 0) {
              campaignExists = true;
              campaignName = batch.results[0].campaign?.name || '';
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error('Error checking campaign:', e);
    }

    console.log(`Campaign exists: ${campaignExists}, Name: ${campaignName}`);

    // Check if ad groups exist
    let adGroupExists = false;
    let adGroupCount = 0;

    if (campaignExists) {
      const adGroupQuery = `
        SELECT ad_group.id, ad_group.name
        FROM ad_group
        WHERE campaign.id = ${campaignId}
      `;

      try {
        const adGroupResponse = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': developerToken!,
            'login-customer-id': mccCustomerId!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: adGroupQuery }),
        });

        if (adGroupResponse.ok) {
          const adGroupData = await adGroupResponse.json();
          if (adGroupData && Array.isArray(adGroupData)) {
            for (const batch of adGroupData) {
              if (batch.results && batch.results.length > 0) {
                adGroupExists = true;
                adGroupCount = batch.results.length;
                break;
              }
            }
          }
        }
      } catch (e) {
        console.error('Error checking ad groups:', e);
      }
    }

    console.log(`Ad groups exist: ${adGroupExists}, Count: ${adGroupCount}`);

    // Check if ads exist
    let adExists = false;
    let adCount = 0;

    if (adGroupExists) {
      const adQuery = `
        SELECT ad_group_ad.ad.id, ad_group_ad.ad.final_urls
        FROM ad_group_ad
        WHERE campaign.id = ${campaignId}
      `;

      try {
        const adResponse = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': developerToken!,
            'login-customer-id': mccCustomerId!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: adQuery }),
        });

        if (adResponse.ok) {
          const adData = await adResponse.json();
          if (adData && Array.isArray(adData)) {
            for (const batch of adData) {
              if (batch.results && batch.results.length > 0) {
                adExists = true;
                adCount = batch.results.length;
                break;
              }
            }
          }
        }
      } catch (e) {
        console.error('Error checking ads:', e);
      }
    }

    console.log(`Ads exist: ${adExists}, Count: ${adCount}`);

    // Update client record with verification results
    await supabase
      .from('clients')
      .update({
        gads_campaign_created: campaignExists,
        gads_adgroup_created: adGroupExists,
        gads_ad_created: adExists,
        gads_creation_error: campaignExists ? null : 'Campaign not found in Google Ads',
      })
      .eq('id', clientId);

    const result = {
      success: true,
      campaignExists,
      campaignName,
      adGroupExists,
      adGroupCount,
      adExists,
      adCount,
    };

    console.log('Verification complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in verify-google-ads-campaign:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
