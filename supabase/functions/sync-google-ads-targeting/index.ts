import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Ads geo target constant IDs to US state abbreviations
const GEO_CONSTANT_TO_STATE: Record<string, string> = {
  '21132': 'AK', '21133': 'AL', '21135': 'AR', '21136': 'AZ', '21137': 'CA',
  '21138': 'CO', '21139': 'CT', '21140': 'DC', '21141': 'DE', '21142': 'FL',
  '21143': 'GA', '21144': 'HI', '21145': 'IA', '21146': 'ID', '21147': 'IL',
  '21148': 'IN', '21149': 'KS', '21150': 'KY', '21151': 'LA', '21152': 'MA',
  '21153': 'MD', '21154': 'ME', '21155': 'MI', '21156': 'MN', '21157': 'MO',
  '21158': 'MS', '21159': 'MT', '21160': 'NC', '21161': 'ND', '21162': 'NE',
  '21163': 'NH', '21164': 'NJ', '21165': 'NM', '21166': 'NV', '21167': 'NY',
  '21168': 'OH', '21169': 'OK', '21170': 'OR', '21171': 'PA', '21172': 'RI',
  '21173': 'SC', '21174': 'SD', '21175': 'TN', '21176': 'TX', '21177': 'UT',
  '21178': 'VA', '21179': 'VT', '21180': 'WA', '21182': 'WI', '21183': 'WV',
  '21184': 'WY', '2630': 'PR',
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

async function getCurrentLocationCriteria(
  accessToken: string,
  customerId: string,
  campaignId: string
): Promise<string[]> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
  const cleanCustomerId = customerId.trim().replace(/-/g, '');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

  const query = `
    SELECT
      campaign_criterion.resource_name,
      campaign_criterion.location.geo_target_constant
    FROM campaign_criterion
    WHERE campaign.id = ${campaignId}
      AND campaign_criterion.type = 'LOCATION'
      AND campaign_criterion.negative = false
  `;

  const apiUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/googleAds:searchStream`;

  console.log(`Fetching location criteria for customer ${cleanCustomerId}, campaign ${campaignId}`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken!,
      'login-customer-id': cleanMccId!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const raw = await response.text();
    console.error('Error fetching current locations:', raw);
    throw new Error(`Failed to fetch current locations: ${raw.slice(0, 500)}`);
  }

  const data = await response.json();
  const states: string[] = [];

  console.log('Raw response data:', JSON.stringify(data));

  if (data && Array.isArray(data)) {
    for (const batch of data) {
      if (batch.results) {
        for (const row of batch.results) {
          const geoConstant = row.campaignCriterion?.location?.geoTargetConstant;
          if (geoConstant) {
            const match = geoConstant.match(/geoTargetConstants\/(\d+)/);
            if (match) {
              const geoId = match[1];
              const stateAbbrev = GEO_CONSTANT_TO_STATE[geoId];
              if (stateAbbrev) {
                states.push(stateAbbrev);
                console.log(`Found state: ${stateAbbrev} (geo ID: ${geoId})`);
              } else {
                console.log(`Unknown geo ID: ${geoId}`);
              }
            }
          }
        }
      }
    }
  }

  return states.sort();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId } = await req.json();

    if (!clientId) {
      throw new Error('clientId is required');
    }

    console.log(`Syncing Google Ads targeting for client ${clientId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get client's Google Campaign ID
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, google_campaign_id, states')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error(`Client not found: ${clientError?.message}`);
    }

    if (!client.google_campaign_id) {
      throw new Error('Client does not have a Google Campaign ID configured');
    }

    // Parse google_campaign_id
    const rawCampaignField = String(client.google_campaign_id).trim();
    let customerId: string;
    let campaignId: string;

    if (rawCampaignField.includes(':')) {
      const [customerPart, campaignPart] = rawCampaignField.split(':');
      customerId = customerPart.replace(/\D/g, '');
      campaignId = campaignPart.replace(/\D/g, '');
    } else {
      throw new Error('google_campaign_id must be in format customerId:campaignId');
    }

    console.log(`Parsed => customerId=${customerId}, campaignId=${campaignId}`);

    // Get access token
    const accessToken = await getAccessToken();

    // Get current location targeting from Google Ads
    const googleAdsStates = await getCurrentLocationCriteria(accessToken, customerId, campaignId);
    console.log(`Google Ads targeting states: ${googleAdsStates.join(', ')}`);

    // Update client's states field in database to match Google Ads
    const statesString = googleAdsStates.join(', ');
    const { error: updateError } = await supabase
      .from('clients')
      .update({ states: statesString })
      .eq('id', clientId);

    if (updateError) {
      console.error('Error updating client states:', updateError);
      throw new Error(`Failed to update client states: ${updateError.message}`);
    }

    const result = {
      success: true,
      clientId,
      previousStates: client.states,
      syncedStates: googleAdsStates,
      statesString,
    };

    console.log('Sync completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in sync-google-ads-targeting:', error);
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
