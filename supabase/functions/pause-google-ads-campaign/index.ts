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
    const error = await response.text();
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
    const { customerId, campaignId } = await req.json();

    if (!customerId || !campaignId) {
      throw new Error('customerId and campaignId are required');
    }

    const cleanCustomerId = String(customerId).trim().replace(/-/g, '');
    const cleanCampaignId = String(campaignId).trim().replace(/-/g, '');
    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID')?.trim().replace(/-/g, '');

    const accessToken = await getAccessToken();

    console.log(`Pausing campaign ${cleanCampaignId} for customer ${cleanCustomerId}`);

    const mutateUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/campaigns:mutate`;

    const response = await fetch(mutateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken!,
        'login-customer-id': mccCustomerId!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operations: [{
          update: {
            resourceName: `customers/${cleanCustomerId}/campaigns/${cleanCampaignId}`,
            status: 'PAUSED',
          },
          updateMask: 'status',
        }],
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      console.error('Pause error:', raw);
      throw new Error(`Failed to pause campaign: ${raw.slice(0, 500)}`);
    }

    const result = await response.json();
    console.log('Campaign paused successfully:', result);

    return new Response(JSON.stringify({ success: true, campaignId: cleanCampaignId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error pausing campaign:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
