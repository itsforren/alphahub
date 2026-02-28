import { createClient } from "npm:@supabase/supabase-js@2.87.1";

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

async function getOnboardingSettings(supabase: any): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('onboarding_settings')
    .select('setting_key, setting_value');

  if (error) {
    console.error('Error fetching onboarding settings:', error);
    throw new Error('Failed to fetch onboarding settings');
  }

  const settings: Record<string, string> = {};
  data?.forEach((row: { setting_key: string; setting_value: string }) => {
    settings[row.setting_key] = row.setting_value;
  });

  return settings;
}

async function getAdGroupsForCampaign(
  accessToken: string,
  customerId: string,
  campaignId: string
): Promise<any[]> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
  const cleanCustomerId = customerId.trim().replace(/-/g, '');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

  const query = `
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status
    FROM ad_group
    WHERE campaign.id = ${campaignId}
      AND ad_group.status != 'REMOVED'
  `;

  const searchUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/googleAds:searchStream`;

  const response = await fetch(searchUrl, {
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
    const error = await response.text();
    console.error('Error fetching ad groups:', error);
    throw new Error(`Failed to fetch ad groups: ${error.slice(0, 500)}`);
  }

  const data = await response.json();
  const adGroups: any[] = [];

  if (data && Array.isArray(data)) {
    for (const batch of data) {
      if (batch.results) {
        adGroups.push(...batch.results.map((r: any) => r.adGroup));
      }
    }
  }

  return adGroups;
}

async function getKeywordsForAdGroup(
  accessToken: string,
  customerId: string,
  adGroupId: string
): Promise<any[]> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
  const cleanCustomerId = customerId.trim().replace(/-/g, '');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

  const query = `
    SELECT
      ad_group_criterion.criterion_id,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status,
      ad_group_criterion.cpc_bid_micros,
      ad_group_criterion.negative
    FROM ad_group_criterion
    WHERE ad_group.id = ${adGroupId}
      AND ad_group_criterion.type = 'KEYWORD'
  `;

  const searchUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/googleAds:searchStream`;

  const response = await fetch(searchUrl, {
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
    const error = await response.text();
    console.error('Error fetching keywords:', error);
    return [];
  }

  const data = await response.json();
  const keywords: any[] = [];

  if (data && Array.isArray(data)) {
    for (const batch of data) {
      if (batch.results) {
        keywords.push(...batch.results.map((r: any) => r.adGroupCriterion));
      }
    }
  }

  return keywords;
}

async function addKeywordsToAdGroup(
  accessToken: string,
  customerId: string,
  adGroupId: string,
  keywords: any[]
): Promise<number> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
  const cleanCustomerId = customerId.trim().replace(/-/g, '');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

  if (keywords.length === 0) {
    return 0;
  }

  const operations = keywords.map(keyword => ({
    create: {
      adGroup: `customers/${cleanCustomerId}/adGroups/${adGroupId}`,
      status: keyword.status || 'ENABLED',
      keyword: {
        text: keyword.keyword?.text,
        matchType: keyword.keyword?.matchType,
      },
      negative: keyword.negative || false,
      ...(keyword.cpcBidMicros ? { cpcBidMicros: keyword.cpcBidMicros } : {}),
    },
  }));

  const mutateUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/adGroupCriteria:mutate`;

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
    const error = await response.text();
    console.error('Error adding keywords:', error);
    throw new Error(`Failed to add keywords: ${error.slice(0, 500)}`);
  }

  const data = await response.json();
  return data.results?.length || 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, targetCampaignId, customerId } = await req.json();

    console.log('=== ADD KEYWORDS TO CAMPAIGN ===');
    console.log(`Client ID: ${clientId}`);
    console.log(`Target Campaign ID: ${targetCampaignId}`);
    console.log(`Custom Customer ID: ${customerId}`);

    if (!targetCampaignId) {
      throw new Error('targetCampaignId is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get settings for source campaign
    const settings = await getOnboardingSettings(supabase);
    const templateCampaignId = settings['template_campaign_id'];
    const defaultCustomerId = settings['default_customer_id'];

    if (!templateCampaignId) {
      throw new Error('Template campaign ID not configured in settings');
    }

    // Parse template campaign ID (format: customerId:campaignId or just campaignId)
    let sourceCampaignId: string;
    let sourceCustomerId: string;

    if (templateCampaignId.includes(':')) {
      const [customerPart, campaignPart] = templateCampaignId.split(':');
      sourceCustomerId = customerPart.replace(/\D/g, '');
      sourceCampaignId = campaignPart.replace(/\D/g, '');
    } else {
      // Template campaign is likely in the default customer account
      sourceCustomerId = defaultCustomerId?.replace(/\D/g, '') || Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID')?.replace(/\D/g, '') || '';
      sourceCampaignId = templateCampaignId.replace(/\D/g, '');
    }

    // Parse target campaign ID - may also be in customerId:campaignId format
    let cleanTargetCampaignId: string;
    let targetCustomerId: string;

    const rawTargetId = String(targetCampaignId);
    if (rawTargetId.includes(':')) {
      const [customerPart, campaignPart] = rawTargetId.split(':');
      targetCustomerId = customerPart.replace(/\D/g, '');
      cleanTargetCampaignId = campaignPart.replace(/\D/g, '');
    } else {
      // Use provided customerId, or default customer ID
      targetCustomerId = customerId?.replace(/\D/g, '') || defaultCustomerId?.replace(/\D/g, '') || sourceCustomerId;
      cleanTargetCampaignId = rawTargetId.replace(/\D/g, '');
    }

    if (!sourceCustomerId) {
      throw new Error('Source customer ID not found');
    }

    if (!targetCustomerId) {
      throw new Error('Target customer ID not found');
    }

    console.log(`Source Campaign ID: ${sourceCampaignId}`);
    console.log(`Source Customer ID: ${sourceCustomerId}`);
    console.log(`Target Campaign ID: ${cleanTargetCampaignId}`);
    console.log(`Target Customer ID: ${targetCustomerId}`);

    // Get access token
    const accessToken = await getAccessToken();

    // Get ad groups from template campaign (using SOURCE customer ID)
    const templateAdGroups = await getAdGroupsForCampaign(accessToken, sourceCustomerId, sourceCampaignId);
    console.log(`Found ${templateAdGroups.length} ad groups in template campaign`);

    // Get ad groups from target campaign (using TARGET customer ID)
    const targetAdGroups = await getAdGroupsForCampaign(accessToken, targetCustomerId, cleanTargetCampaignId);
    console.log(`Found ${targetAdGroups.length} ad groups in target campaign`);

    if (templateAdGroups.length === 0 || targetAdGroups.length === 0) {
      throw new Error('No ad groups found in template or target campaign');
    }

    // Map template ad groups to target ad groups by name
    const adGroupMap: Record<string, string> = {};
    for (const templateAg of templateAdGroups) {
      const matchingTarget = targetAdGroups.find(t => t.name === templateAg.name);
      if (matchingTarget) {
        adGroupMap[templateAg.id] = matchingTarget.id;
      }
    }

    console.log(`Mapped ${Object.keys(adGroupMap).length} ad groups by name`);

    // If no name matches, fallback to first-to-first mapping
    if (Object.keys(adGroupMap).length === 0 && templateAdGroups.length > 0 && targetAdGroups.length > 0) {
      console.log('No name matches, using position-based mapping');
      for (let i = 0; i < Math.min(templateAdGroups.length, targetAdGroups.length); i++) {
        adGroupMap[templateAdGroups[i].id] = targetAdGroups[i].id;
      }
    }

    // Copy keywords for each mapped ad group
    let totalKeywordsAdded = 0;
    const results: any[] = [];

    for (const [templateAgId, targetAgId] of Object.entries(adGroupMap)) {
      // Check if target already has keywords
      const existingKeywords = await getKeywordsForAdGroup(accessToken, targetCustomerId, targetAgId);
      if (existingKeywords.length > 0) {
        console.log(`Ad group ${targetAgId} already has ${existingKeywords.length} keywords, skipping`);
        results.push({
          templateAdGroupId: templateAgId,
          targetAdGroupId: targetAgId,
          skipped: true,
          existingCount: existingKeywords.length,
        });
        continue;
      }

      // Get keywords from template (using SOURCE customer ID)
      const templateKeywords = await getKeywordsForAdGroup(accessToken, sourceCustomerId, templateAgId);
      console.log(`Template ad group ${templateAgId} has ${templateKeywords.length} keywords`);

      if (templateKeywords.length === 0) {
        results.push({
          templateAdGroupId: templateAgId,
          targetAdGroupId: targetAgId,
          added: 0,
        });
        continue;
      }

      // Add keywords to target (using TARGET customer ID)
      const addedCount = await addKeywordsToAdGroup(accessToken, targetCustomerId, targetAgId, templateKeywords);
      totalKeywordsAdded += addedCount;

      results.push({
        templateAdGroupId: templateAgId,
        targetAdGroupId: targetAgId,
        added: addedCount,
      });

      console.log(`Added ${addedCount} keywords to ad group ${targetAgId}`);
    }

    console.log(`=== COMPLETE: Added ${totalKeywordsAdded} total keywords ===`);

    return new Response(
      JSON.stringify({
        success: true,
        totalKeywordsAdded,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
