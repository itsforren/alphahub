import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// US state abbreviations to Google Ads geo target constant IDs (correct mapping)
const STATE_TO_GEO_CONSTANT: Record<string, string> = {
  'AK': '21132', 'AL': '21133', 'AR': '21135', 'AZ': '21136', 'CA': '21137',
  'CO': '21138', 'CT': '21139', 'DC': '21140', 'DE': '21141', 'FL': '21142',
  'GA': '21143', 'HI': '21144', 'IA': '21145', 'ID': '21146', 'IL': '21147',
  'IN': '21148', 'KS': '21149', 'KY': '21150', 'LA': '21151', 'MA': '21152',
  'MD': '21153', 'ME': '21154', 'MI': '21155', 'MN': '21156', 'MO': '21157',
  'MS': '21158', 'MT': '21159', 'NC': '21160', 'ND': '21161', 'NE': '21162',
  'NH': '21163', 'NJ': '21164', 'NM': '21165', 'NV': '21166', 'NY': '21167',
  'OH': '21168', 'OK': '21169', 'OR': '21170', 'PA': '21171', 'RI': '21172',
  'SC': '21173', 'SD': '21174', 'TN': '21175', 'TX': '21176', 'UT': '21177',
  'VA': '21178', 'VT': '21179', 'WA': '21180', 'WI': '21182', 'WV': '21183',
  'WY': '21184', 'PR': '2630',
};

// Google Ads geo target constant IDs to US state abbreviations (reverse mapping)
const GEO_CONSTANT_TO_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_TO_GEO_CONSTANT).map(([k, v]) => [v, k])
);

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
): Promise<Map<string, string>> {
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
  const locationMap = new Map<string, string>(); // geoConstantId -> resourceName

  if (data && Array.isArray(data)) {
    for (const batch of data) {
      if (batch.results) {
        for (const row of batch.results) {
          const geoConstant = row.campaignCriterion?.location?.geoTargetConstant;
          const resourceName = row.campaignCriterion?.resourceName;
          if (geoConstant && resourceName) {
            const match = geoConstant.match(/geoTargetConstants\/(\d+)/);
            if (match) {
              locationMap.set(match[1], resourceName);
            }
          }
        }
      }
    }
  }

  return locationMap;
}

async function updateLocationTargeting(
  accessToken: string,
  customerId: string,
  campaignId: string,
  currentLocations: Map<string, string>,
  targetStates: string[]
): Promise<{ added: string[]; removed: string[] }> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
  const cleanCustomerId = customerId.trim().replace(/-/g, '');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

  // Convert target states to geo constant IDs
  const targetGeoIds = new Set<string>();
  for (const state of targetStates) {
    const geoId = STATE_TO_GEO_CONSTANT[state.toUpperCase()];
    if (geoId) {
      targetGeoIds.add(geoId);
    }
  }

  // Determine what to add and remove
  const currentGeoIds = new Set(currentLocations.keys());
  const toAdd: string[] = [];
  const toRemove: string[] = [];

  // Find states to add
  for (const geoId of targetGeoIds) {
    if (!currentGeoIds.has(geoId)) {
      toAdd.push(geoId);
    }
  }

  // Find states to remove
  for (const geoId of currentGeoIds) {
    if (!targetGeoIds.has(geoId)) {
      toRemove.push(geoId);
    }
  }

  console.log(`States to add: ${toAdd.map(id => GEO_CONSTANT_TO_STATE[id]).join(', ')}`);
  console.log(`States to remove: ${toRemove.map(id => GEO_CONSTANT_TO_STATE[id]).join(', ')}`);

  if (toAdd.length === 0 && toRemove.length === 0) {
    console.log('No changes needed');
    return { added: [], removed: [] };
  }

  // Build mutation operations
  const operations: any[] = [];

  // Add new location criteria
  for (const geoId of toAdd) {
    operations.push({
      create: {
        campaign: `customers/${cleanCustomerId}/campaigns/${campaignId}`,
        location: {
          geoTargetConstant: `geoTargetConstants/${geoId}`,
        },
      },
    });
  }

  // Remove existing location criteria
  for (const geoId of toRemove) {
    const resourceName = currentLocations.get(geoId);
    if (resourceName) {
      operations.push({
        remove: resourceName,
      });
    }
  }

  // Execute the mutation
  const mutateUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/campaignCriteria:mutate`;

  const response = await fetch(mutateUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken!,
      'login-customer-id': cleanMccId!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ operations }),
  });

  if (!response.ok) {
    const raw = await response.text();
    console.error('Error updating location targeting:', raw);
    throw new Error(`Failed to update location targeting: ${raw.slice(0, 500)}`);
  }

  const result = await response.json();
  console.log('Mutation result:', JSON.stringify(result));

  return {
    added: toAdd.map(id => GEO_CONSTANT_TO_STATE[id]),
    removed: toRemove.map(id => GEO_CONSTANT_TO_STATE[id]),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, states } = await req.json();

    if (!clientId) {
      throw new Error('clientId is required');
    }

    if (!states || !Array.isArray(states)) {
      throw new Error('states array is required');
    }

    console.log(`Updating Google Ads targeting for client ${clientId} to states: ${states.join(', ')}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get client's Google Campaign ID
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, google_campaign_id')
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

    // Get current location targeting
    const currentLocations = await getCurrentLocationCriteria(accessToken, customerId, campaignId);
    console.log(`Current locations: ${Array.from(currentLocations.keys()).map(id => GEO_CONSTANT_TO_STATE[id]).join(', ')}`);

    // Update location targeting
    const { added, removed } = await updateLocationTargeting(
      accessToken,
      customerId,
      campaignId,
      currentLocations,
      states
    );

    // Update client's states field in database
    const { error: updateError } = await supabase
      .from('clients')
      .update({ states: states.join(', ') })
      .eq('id', clientId);

    if (updateError) {
      console.error('Error updating client states:', updateError);
    }

    const result = {
      success: true,
      clientId,
      added,
      removed,
      currentStates: states,
    };

    console.log('Update completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in update-google-ads-targeting:', error);
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
