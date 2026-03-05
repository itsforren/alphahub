import { createClient } from "npm:@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// US state abbreviations to Google Ads geo target constant IDs
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseStates(states: string | string[]): string[] {
  if (Array.isArray(states)) {
    return states.map(s => s.trim().toUpperCase());
  }
  return states.split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
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

async function createDedicatedBudget(
  accessToken: string,
  customerId: string,
  budgetName: string,
  dailyBudgetMicros: number
): Promise<string> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
  const cleanCustomerId = customerId.trim().replace(/-/g, '');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

  console.log(`Creating dedicated budget: ${budgetName} with ${dailyBudgetMicros} micros/day`);

  const budgetOperation = {
    operations: [
      {
        create: {
          name: budgetName,
          amountMicros: dailyBudgetMicros.toString(),
          deliveryMethod: 'STANDARD',
          explicitlyShared: false, // Dedicated to this campaign only
        },
      },
    ],
  };

  const createBudgetUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/campaignBudgets:mutate`;

  const response = await fetch(createBudgetUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken!,
      'login-customer-id': cleanMccId!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(budgetOperation),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Error creating dedicated budget:', error);
    throw new Error(`Failed to create dedicated budget: ${error.slice(0, 500)}`);
  }

  const data = await response.json();
  const budgetResourceName = data.results?.[0]?.resourceName;

  if (!budgetResourceName) {
    throw new Error('Failed to get budget resource name from response');
  }

  console.log(`Created dedicated budget: ${budgetResourceName}`);
  return budgetResourceName;
}

async function copyCampaign(
  accessToken: string,
  customerId: string,
  sourceCampaignId: string,
  newCampaignName: string,
  agentId: string,
  dailyBudgetMicros: number
): Promise<string> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
  const cleanCustomerId = customerId.trim().replace(/-/g, '');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

  console.log(`Copying campaign ${sourceCampaignId} to new campaign: ${newCampaignName}`);

  // First, get the source campaign details
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.campaign_budget,
      campaign.network_settings.target_google_search,
      campaign.network_settings.target_search_network,
      campaign.network_settings.target_content_network,
      campaign.bidding_strategy_type
    FROM campaign
    WHERE campaign.id = ${sourceCampaignId}
  `;

  const searchUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/googleAds:searchStream`;

  const searchResponse = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken!,
      'login-customer-id': cleanMccId!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!searchResponse.ok) {
    const error = await searchResponse.text();
    console.error('Error fetching source campaign:', error);
    throw new Error(`Failed to fetch source campaign: ${error.slice(0, 500)}`);
  }

  const searchData = await searchResponse.json();
  console.log('Source campaign data:', JSON.stringify(searchData, null, 2));

  let sourceCampaign: any = null;
  if (searchData && Array.isArray(searchData)) {
    for (const batch of searchData) {
      if (batch.results && batch.results.length > 0) {
        sourceCampaign = batch.results[0].campaign;
        break;
      }
    }
  }

  if (!sourceCampaign) {
    throw new Error(`Source campaign ${sourceCampaignId} not found`);
  }

  // Create a dedicated budget for this new campaign (not shared with template)
  const budgetName = `${newCampaignName} - Budget`;
  const newBudgetResourceName = await createDedicatedBudget(
    accessToken,
    cleanCustomerId,
    budgetName,
    dailyBudgetMicros
  );

  // Create a new campaign based on the source campaign with the new dedicated budget
  const createCampaignUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/campaigns:mutate`;

  const campaignOperation = {
    operations: [
      {
        create: {
          name: newCampaignName,
          advertisingChannelType: sourceCampaign.advertisingChannelType,
          status: 'PAUSED', // Always create as paused
          campaignBudget: newBudgetResourceName, // Use new dedicated budget
          networkSettings: {
            targetGoogleSearch: sourceCampaign.networkSettings?.targetGoogleSearch ?? true,
            targetSearchNetwork: sourceCampaign.networkSettings?.targetSearchNetwork ?? true,
            targetContentNetwork: sourceCampaign.networkSettings?.targetContentNetwork ?? false,
          },
          // Bidding strategy - Maximize Conversions (same as template)
          maximizeConversions: {},
          // EU political advertising declaration (required by Google Ads API)
          containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
          // Final URL suffix for tracking - Google Ads appends this to all final URLs
          finalUrlSuffix: `agent_id=${agentId || 'unknown'}`,
        },
      },
    ],
  };

  console.log('Creating campaign with operation:', JSON.stringify(campaignOperation, null, 2));

  const createResponse = await fetch(createCampaignUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken!,
      'login-customer-id': cleanMccId!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(campaignOperation),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    console.error('Error creating campaign:', error);
    throw new Error(`Failed to create campaign: ${error.slice(0, 500)}`);
  }

  const createData = await createResponse.json();
  console.log('Campaign created:', JSON.stringify(createData, null, 2));

  // Extract the new campaign ID from the resource name
  const newCampaignResourceName = createData.results?.[0]?.resourceName;
  if (!newCampaignResourceName) {
    throw new Error('Failed to get new campaign resource name');
  }

  // Extract campaign ID from resource name (format: customers/123/campaigns/456)
  const campaignIdMatch = newCampaignResourceName.match(/campaigns\/(\d+)/);
  if (!campaignIdMatch) {
    throw new Error('Failed to parse new campaign ID');
  }

  return campaignIdMatch[1];
}

async function updateCampaignBudget(
  accessToken: string,
  customerId: string,
  campaignId: string,
  dailyBudgetMicros: number
): Promise<void> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
  const cleanCustomerId = customerId.trim().replace(/-/g, '');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

  console.log(`Updating campaign ${campaignId} budget to ${dailyBudgetMicros} micros`);

  // First, get the campaign's budget resource name
  const query = `
    SELECT campaign.campaign_budget
    FROM campaign
    WHERE campaign.id = ${campaignId}
  `;

  const searchUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/googleAds:searchStream`;

  const searchResponse = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken!,
      'login-customer-id': cleanMccId!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!searchResponse.ok) {
    const error = await searchResponse.text();
    console.error('Error fetching campaign budget:', error);
    throw new Error(`Failed to fetch campaign budget: ${error.slice(0, 500)}`);
  }

  const searchData = await searchResponse.json();
  let budgetResourceName: string | null = null;

  if (searchData && Array.isArray(searchData)) {
    for (const batch of searchData) {
      if (batch.results && batch.results.length > 0) {
        budgetResourceName = batch.results[0].campaign?.campaignBudget;
        break;
      }
    }
  }

  if (!budgetResourceName) {
    console.log('No existing budget found, creating new budget');
    // Create a new budget
    const createBudgetUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/campaignBudgets:mutate`;
    
    const budgetOperation = {
      operations: [
        {
          create: {
            name: `Budget for campaign ${campaignId}`,
            amountMicros: dailyBudgetMicros.toString(),
            deliveryMethod: 'STANDARD',
          },
        },
      ],
    };

    const createBudgetResponse = await fetch(createBudgetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken!,
        'login-customer-id': cleanMccId!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(budgetOperation),
    });

    if (!createBudgetResponse.ok) {
      const error = await createBudgetResponse.text();
      console.error('Error creating budget:', error);
      throw new Error(`Failed to create budget: ${error.slice(0, 500)}`);
    }

    const budgetData = await createBudgetResponse.json();
    budgetResourceName = budgetData.results?.[0]?.resourceName;
  } else {
    // Update existing budget
    const updateBudgetUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/campaignBudgets:mutate`;
    
    const budgetOperation = {
      operations: [
        {
          update: {
            resourceName: budgetResourceName,
            amountMicros: dailyBudgetMicros.toString(),
          },
          updateMask: 'amountMicros',
        },
      ],
    };

    const updateBudgetResponse = await fetch(updateBudgetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken!,
        'login-customer-id': cleanMccId!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(budgetOperation),
    });

    if (!updateBudgetResponse.ok) {
      const error = await updateBudgetResponse.text();
      console.error('Error updating budget:', error);
      throw new Error(`Failed to update budget: ${error.slice(0, 500)}`);
    }
  }

  console.log('Budget updated successfully');
}

async function setLocationTargeting(
  accessToken: string,
  customerId: string,
  campaignId: string,
  states: string[]
): Promise<void> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
  const cleanCustomerId = customerId.trim().replace(/-/g, '');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

  console.log(`Setting location targeting for campaign ${campaignId} to states: ${states.join(', ')}`);

  // Build location criteria operations
  const operations: any[] = [];

  for (const state of states) {
    const geoId = STATE_TO_GEO_CONSTANT[state.toUpperCase()];
    if (geoId) {
      operations.push({
        create: {
          campaign: `customers/${cleanCustomerId}/campaigns/${campaignId}`,
          location: {
            geoTargetConstant: `geoTargetConstants/${geoId}`,
          },
        },
      });
    } else {
      console.warn(`Unknown state: ${state}`);
    }
  }

  if (operations.length === 0) {
    console.log('No valid states to target');
    return;
  }

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
    const error = await response.text();
    console.error('Error setting location targeting:', error);
    throw new Error(`Failed to set location targeting: ${error.slice(0, 500)}`);
  }

  console.log('Location targeting set successfully');
}

async function deleteExistingAdGroups(
  accessToken: string,
  customerId: string,
  campaignId: string
): Promise<void> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
  const cleanCustomerId = customerId.trim().replace(/-/g, '');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

  console.log(`Deleting existing ad groups from campaign ${campaignId}`);

  // Get existing ad groups
  const query = `
    SELECT ad_group.id, ad_group.name
    FROM ad_group
    WHERE campaign.id = ${campaignId}
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
    console.log('No existing ad groups found or error fetching them');
    return;
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

  if (adGroups.length === 0) {
    console.log('No existing ad groups to delete');
    return;
  }

  console.log(`Found ${adGroups.length} existing ad groups to delete`);

  // Delete each ad group
  const deleteUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/adGroups:mutate`;
  
  const operations = adGroups.map(ag => ({
    remove: `customers/${cleanCustomerId}/adGroups/${ag.id}`,
  }));

  const deleteResponse = await fetch(deleteUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken!,
      'login-customer-id': cleanMccId!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ operations }),
  });

  if (!deleteResponse.ok) {
    const error = await deleteResponse.text();
    console.error('Error deleting ad groups:', error);
    // Continue anyway - maybe they were already deleted
  } else {
    console.log(`Deleted ${adGroups.length} existing ad groups`);
  }
}

async function copyKeywords(
  accessToken: string,
  customerId: string,
  sourceAdGroupId: string,
  newAdGroupId: string
): Promise<number> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
  const cleanCustomerId = customerId.trim().replace(/-/g, '');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

  console.log(`Copying keywords from ad group ${sourceAdGroupId} to ${newAdGroupId}`);

  // Query keywords from source ad group
  const keywordQuery = `
    SELECT
      ad_group_criterion.criterion_id,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status,
      ad_group_criterion.cpc_bid_micros,
      ad_group_criterion.negative
    FROM ad_group_criterion
    WHERE ad_group.id = ${sourceAdGroupId}
      AND ad_group_criterion.type = 'KEYWORD'
  `;

  const searchUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/googleAds:searchStream`;

  const keywordResponse = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken!,
      'login-customer-id': cleanMccId!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: keywordQuery }),
  });

  if (!keywordResponse.ok) {
    const error = await keywordResponse.text();
    console.error(`Error fetching keywords for ad group ${sourceAdGroupId}:`, error);
    return 0;
  }

  const keywordData = await keywordResponse.json();
  const sourceKeywords: any[] = [];

  if (keywordData && Array.isArray(keywordData)) {
    for (const batch of keywordData) {
      if (batch.results) {
        sourceKeywords.push(...batch.results.map((r: any) => r.adGroupCriterion));
      }
    }
  }

  console.log(`Found ${sourceKeywords.length} keywords to copy`);

  if (sourceKeywords.length === 0) {
    return 0;
  }

  // Create keywords in new ad group - batch them for efficiency
  const operations = sourceKeywords.map(keyword => ({
    create: {
      adGroup: `customers/${cleanCustomerId}/adGroups/${newAdGroupId}`,
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

  const createResponse = await fetch(mutateUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken!,
      'login-customer-id': cleanMccId!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ operations }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    console.error(`Error creating keywords in ad group ${newAdGroupId}:`, error);
    return 0;
  }

  const createData = await createResponse.json();
  const createdCount = createData.results?.length || 0;
  console.log(`Created ${createdCount} keywords in ad group ${newAdGroupId}`);
  return createdCount;
}

async function copyAdGroupsAndAds(
  accessToken: string,
  customerId: string,
  sourceCampaignId: string,
  newCampaignId: string,
  landingPageUrl: string
): Promise<{ adGroupCreated: boolean; adCreated: boolean; keywordsCreated: boolean }> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
  const cleanCustomerId = customerId.trim().replace(/-/g, '');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

  console.log(`Copying ad groups from campaign ${sourceCampaignId} to ${newCampaignId}`);

  // First, delete any existing ad groups in the target campaign to avoid duplicates
  await deleteExistingAdGroups(accessToken, cleanCustomerId, newCampaignId);

  // Get ad groups from source campaign
  const adGroupQuery = `
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group.type,
      ad_group.cpc_bid_micros
    FROM ad_group
    WHERE campaign.id = ${sourceCampaignId}
  `;

  const searchUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/googleAds:searchStream`;

  const adGroupResponse = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken!,
      'login-customer-id': cleanMccId!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: adGroupQuery }),
  });

  if (!adGroupResponse.ok) {
    const error = await adGroupResponse.text();
    console.error('Error fetching ad groups:', error);
    throw new Error(`Failed to fetch ad groups: ${error.slice(0, 500)}`);
  }

  const adGroupData = await adGroupResponse.json();
  const sourceAdGroups: any[] = [];

  if (adGroupData && Array.isArray(adGroupData)) {
    for (const batch of adGroupData) {
      if (batch.results) {
        sourceAdGroups.push(...batch.results.map((r: any) => r.adGroup));
      }
    }
  }

  console.log(`Found ${sourceAdGroups.length} ad groups to copy`);

  if (sourceAdGroups.length === 0) {
    console.log('No source ad groups found');
    return { adGroupCreated: false, adCreated: false, keywordsCreated: false };
  }

  // Map of source ad group ID -> new ad group ID
  const adGroupIdMap: Record<string, string> = {};
  let adGroupCreatedCount = 0;

  // Create ad groups in new campaign
  for (const sourceAdGroup of sourceAdGroups) {
    const createAdGroupUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/adGroups:mutate`;

    const adGroupOperation = {
      operations: [
        {
          create: {
            name: sourceAdGroup.name,
            campaign: `customers/${cleanCustomerId}/campaigns/${newCampaignId}`,
            status: sourceAdGroup.status,
            type: sourceAdGroup.type,
            cpcBidMicros: sourceAdGroup.cpcBidMicros,
          },
        },
      ],
    };

    const createResponse = await fetch(createAdGroupUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken!,
        'login-customer-id': cleanMccId!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adGroupOperation),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error(`Error creating ad group ${sourceAdGroup.name}:`, error);
      continue; // Skip this ad group but continue with others
    }

    const createData = await createResponse.json();
    const newAdGroupResourceName = createData.results?.[0]?.resourceName;
    const newAdGroupIdMatch = newAdGroupResourceName?.match(/adGroups\/(\d+)/);

    if (newAdGroupIdMatch) {
      adGroupIdMap[sourceAdGroup.id] = newAdGroupIdMatch[1];
      adGroupCreatedCount++;
      console.log(`Created ad group ${sourceAdGroup.name} with ID ${newAdGroupIdMatch[1]}`);
    }
  }

  const adGroupCreated = adGroupCreatedCount > 0;
  console.log(`Ad groups created: ${adGroupCreatedCount}/${sourceAdGroups.length}`);

  if (!adGroupCreated) {
    console.log('No ad groups were created');
    return { adGroupCreated: false, adCreated: false, keywordsCreated: false };
  }

  // Copy keywords for each ad group
  let totalKeywordsCreated = 0;
  for (const [sourceAdGroupId, newAdGroupId] of Object.entries(adGroupIdMap)) {
    const keywordCount = await copyKeywords(accessToken, cleanCustomerId, sourceAdGroupId, newAdGroupId);
    totalKeywordsCreated += keywordCount;
  }
  const keywordsCreated = totalKeywordsCreated > 0;
  console.log(`Total keywords created: ${totalKeywordsCreated}`);

  // Now copy ads from each source ad group to the new ad group
  let adCreatedCount = 0;

  for (const [sourceAdGroupId, newAdGroupId] of Object.entries(adGroupIdMap)) {
    const adsQuery = `
      SELECT
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.ad.final_urls,
        ad_group_ad.status
      FROM ad_group_ad
      WHERE ad_group.id = ${sourceAdGroupId}
        AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
    `;

    const adsResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken!,
        'login-customer-id': cleanMccId!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: adsQuery }),
    });

    if (!adsResponse.ok) {
      console.error(`Error fetching ads for ad group ${sourceAdGroupId}`);
      continue;
    }

    const adsData = await adsResponse.json();
    const sourceAds: any[] = [];

    if (adsData && Array.isArray(adsData)) {
      for (const batch of adsData) {
        if (batch.results) {
          sourceAds.push(...batch.results.map((r: any) => r.adGroupAd));
        }
      }
    }

    // Create ads in new ad group with updated landing page
    // Tracking params are handled at campaign level via finalUrlSuffix
    for (const sourceAd of sourceAds) {
      const createAdUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/adGroupAds:mutate`;

      const adOperation = {
        operations: [
          {
            create: {
              adGroup: `customers/${cleanCustomerId}/adGroups/${newAdGroupId}`,
              status: sourceAd.status,
              ad: {
                finalUrls: [landingPageUrl],
                responsiveSearchAd: {
                  headlines: sourceAd.ad?.responsiveSearchAd?.headlines || [],
                  descriptions: sourceAd.ad?.responsiveSearchAd?.descriptions || [],
                },
              },
            },
          },
        ],
      };

      const createAdResponse = await fetch(createAdUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken!,
          'login-customer-id': cleanMccId!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adOperation),
      });

      if (!createAdResponse.ok) {
        const error = await createAdResponse.text();
        console.error(`Error creating ad in ad group ${newAdGroupId}:`, error);
      } else {
        adCreatedCount++;
        console.log(`Created ad in ad group ${newAdGroupId}`);
      }
    }
  }

  const adCreated = adCreatedCount > 0;
  console.log(`Ads created: ${adCreatedCount}`);

  return { adGroupCreated, adCreated, keywordsCreated };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, states, budget, agentId, agentName, landingPage, retryStep, templateType } = await req.json();

    // Calculate daily budget from monthly budget
    const dailyBudget = budget ? Math.round(budget / 30) : 0;

    console.log('=== CREATE GOOGLE ADS CAMPAIGN ===');
    console.log(`Client ID: ${clientId}`);
    console.log(`Agent Name: ${agentName}`);
    console.log(`Agent ID: ${agentId}`);
    console.log(`States: ${states}`);
    console.log(`Monthly Budget: ${budget}`);
    console.log(`Daily Budget (calculated): ${dailyBudget}`);
    console.log(`Landing Page (passed): ${landingPage}`);
    console.log(`Retry Step: ${retryStep || 'full'}`);

    if (!clientId) {
      throw new Error('clientId is required');
    }

    if (!agentName) {
      throw new Error('agentName is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Record attempt timestamp
    await supabase
      .from('clients')
      .update({ 
        gads_last_attempt_at: new Date().toISOString(),
        gads_creation_error: null, // Clear previous error
      })
      .eq('id', clientId);

    // Fetch client data to get the landing page URL and existing campaign ID
    const { data: clientData, error: clientFetchError } = await supabase
      .from('clients')
      .select('lander_link, agent_id, google_campaign_id')
      .eq('id', clientId)
      .single();

    if (clientFetchError) {
      console.warn('Could not fetch client data:', clientFetchError);
    }

    // Fetch onboarding settings
    const settings = await getOnboardingSettings(supabase);

    // Select template based on templateType param (defaults to primary)
    const templateKey = templateType === 'secondary' ? 'template_campaign_id_secondary' : 'template_campaign_id';
    const templateCampaignId = settings[templateKey] || settings['template_campaign_id'];
    console.log(`Using template: ${templateKey} = ${templateCampaignId}`);
    const landingPageBaseUrl = settings['landing_page_base_url'];
    const defaultCustomerId = settings['default_customer_id'];

    if (!templateCampaignId) {
      throw new Error('Template campaign ID not configured. Please set it in onboarding settings.');
    }

    // Parse template campaign ID (format: customerId:campaignId)
    let customerId: string;
    let sourceCampaignId: string;

    if (templateCampaignId.includes(':')) {
      const [customerPart, campaignPart] = templateCampaignId.split(':');
      customerId = customerPart.replace(/\D/g, '');
      sourceCampaignId = campaignPart.replace(/\D/g, '');
    } else {
      customerId = defaultCustomerId || Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID') || '';
      sourceCampaignId = templateCampaignId.replace(/\D/g, '');
    }

    if (!customerId) {
      throw new Error('Customer ID not found. Please configure default_customer_id in settings.');
    }

    console.log(`Using Customer ID: ${customerId}, Source Campaign ID: ${sourceCampaignId}`);

    // Get access token
    const accessToken = await getAccessToken();

    const internalAgentId = clientData?.agent_id || agentId || '';
    
    // Check if we have an existing campaign to rebuild
    let existingCampaignId: string | null = null;
    if (clientData?.google_campaign_id) {
      const parts = clientData.google_campaign_id.split(':');
      existingCampaignId = parts.length > 1 ? parts[1] : parts[0];
      console.log(`Found existing campaign ID: ${existingCampaignId}`);
    }

    // Determine the campaign ID to use
    let newCampaignId: string;

    // When templateType is explicitly set, the user is building a NEW campaign
    // (e.g., a second campaign for dual-campaign support) — skip reuse logic
    const forceNewCampaign = !!templateType;

    // If we have an existing campaign, reuse it (don't create a duplicate)
    // BUT if templateType is set, always create a new one
    if (!forceNewCampaign && existingCampaignId && (retryStep === 'adgroup' || retryStep === 'ad')) {
      console.log(`Using existing campaign ${existingCampaignId} for ${retryStep} rebuild`);
      newCampaignId = existingCampaignId;

      // Mark campaign as already created
      await supabase
        .from('clients')
        .update({ gads_campaign_created: true })
        .eq('id', clientId);
    } else if (!forceNewCampaign && existingCampaignId) {
      // Campaign already exists — reuse it for any rebuild (full or initial re-run)
      console.log(`Campaign already exists (${existingCampaignId}), reusing — will rebuild ad groups/ads only`);
      newCampaignId = existingCampaignId;

      // Mark campaign as already created
      await supabase
        .from('clients')
        .update({ gads_campaign_created: true })
        .eq('id', clientId);
    } else {
      // Create new campaign with unique suffix to avoid DUPLICATE_CAMPAIGN_NAME error
      const agentSuffix = internalAgentId ? internalAgentId.slice(0, 8) : String(Date.now());
      const templateSuffix = templateType === 'secondary' ? ' REVAMP' : '';
      // If this is a second campaign (forceNewCampaign), add "C2" to guarantee uniqueness
      const campaignNumber = forceNewCampaign && existingCampaignId ? ' C2' : '';
      const newCampaignName = `IUL | TFWP OG | SEARCH${templateSuffix}${campaignNumber} | ${agentName} (${agentSuffix})`;
      const dailyBudgetMicros = dailyBudget && dailyBudget > 0 
        ? Math.round(dailyBudget * 1000000) 
        : 50000000;

      console.log(`Creating campaign with unique name: ${newCampaignName}`);

      try {
        newCampaignId = await copyCampaign(
          accessToken,
          customerId,
          sourceCampaignId,
          newCampaignName,
          internalAgentId,
          dailyBudgetMicros
        );

        console.log(`Created new campaign with ID: ${newCampaignId}`);

        // Mark campaign as created
        await supabase
          .from('clients')
          .update({ gads_campaign_created: true })
          .eq('id', clientId);
          
        // Set location targeting for new campaign
        const parsedStates = states ? parseStates(states) : [];
        if (parsedStates.length > 0) {
          await setLocationTargeting(accessToken, customerId, newCampaignId, parsedStates);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Campaign creation failed:', errorMessage);
        
        await supabase
          .from('clients')
          .update({ 
            gads_campaign_created: false,
            gads_creation_error: `Campaign creation failed: ${errorMessage.slice(0, 500)}`,
          })
          .eq('id', clientId);
        
        throw error;
      }
    }

    // Determine landing page URL priority:
    // 1. Use landingPage parameter passed directly (from webhook)
    // 2. Use client's lander_link from database
    // 3. Fall back to constructing from template base URL + agent name slug + agent ID
    let landingPageUrl: string;

    if (landingPage) {
      // Use the landing page passed directly from webhook
      landingPageUrl = landingPage;
      console.log(`Using landingPage from request: ${landingPageUrl}`);
    } else if (clientData?.lander_link) {
      // Use the pre-configured landing page URL from client record
      landingPageUrl = clientData.lander_link;
      console.log(`Using lander_link from client DB: ${landingPageUrl}`);
    } else if (landingPageBaseUrl) {
      // Fall back to template-based URL construction WITH agent ID
      const agentNameSlug = slugify(agentName);
      // Include agent ID as query param for proper tracking
      landingPageUrl = `${landingPageBaseUrl}${agentNameSlug}?id=${internalAgentId}`;
      console.log(`Constructed landing page URL with agent ID: ${landingPageUrl}`);
    } else {
      throw new Error('No landing page URL available. Set lander_link on client or landing_page_base_url in settings.');
    }

    // Step 2 & 3: Copy ad groups and ads
    let adGroupCreated = false;
    let adCreated = false;
    
    try {
      const result = await copyAdGroupsAndAds(
        accessToken,
        customerId,
        sourceCampaignId,
        newCampaignId,
        landingPageUrl
      );
      
      adGroupCreated = result.adGroupCreated;
      adCreated = result.adCreated;

      // Update status based on actual results
      await supabase
        .from('clients')
        .update({ 
          gads_adgroup_created: adGroupCreated,
          gads_ad_created: adCreated,
          gads_creation_error: (!adGroupCreated || !adCreated) 
            ? `Partial creation: adGroup=${adGroupCreated}, ad=${adCreated}`
            : null,
        })
        .eq('id', clientId);
        
      if (adGroupCreated && adCreated) {
        console.log('Ad groups and ads created successfully');
      } else {
        console.warn(`Partial success: adGroup=${adGroupCreated}, ad=${adCreated}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Ad group/ad creation failed:', errorMessage);
      
      await supabase
        .from('clients')
        .update({ 
          gads_adgroup_created: false,
          gads_ad_created: false,
          gads_creation_error: `Ad group/ad creation failed: ${errorMessage.slice(0, 500)}`,
        })
        .eq('id', clientId);
      
      // Don't throw - campaign was created successfully, just log the error
      console.warn('Continuing despite ad group/ad error - campaign was created');
    }

    // Save campaign ID to client record
    const campaignIdToSave = `${customerId}:${newCampaignId}`;
    const finalParsedStates = states ? parseStates(states) : [];

    // Check if client already has a primary campaign
    const { data: existingCampaigns } = await supabase
      .from('campaigns')
      .select('id')
      .eq('client_id', clientId);

    const isFirstCampaign = !existingCampaigns || existingCampaigns.length === 0;
    const campaignLabel = isFirstCampaign
      ? 'Campaign 1'
      : templateType === 'secondary'
        ? 'Campaign 2 — Revamp'
        : 'Campaign 2';

    // Insert into campaigns table
    const { error: campaignInsertError } = await supabase
      .from('campaigns')
      .upsert({
        client_id: clientId,
        google_customer_id: customerId,
        google_campaign_id: newCampaignId,
        is_primary: isFirstCampaign,
        label: campaignLabel,
        states: finalParsedStates.join(', '),
        current_daily_budget: dailyBudget || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'google_customer_id,google_campaign_id',
      });

    if (campaignInsertError) {
      console.error('Error inserting into campaigns table:', campaignInsertError);
    } else {
      console.log(`Inserted campaign record: ${campaignLabel} (${campaignIdToSave})`);
    }

    // Only update clients.google_campaign_id if this is the first campaign
    if (isFirstCampaign) {
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          google_campaign_id: campaignIdToSave,
          states: finalParsedStates.join(', '),
          gads_creation_error: null,
        })
        .eq('id', clientId);

      if (updateError) {
        console.error('Error updating client with campaign ID:', updateError);
      } else {
        console.log(`Saved campaign ID ${campaignIdToSave} to client ${clientId}`);
      }
    } else {
      // Just clear the error for secondary campaigns
      await supabase
        .from('clients')
        .update({ gads_creation_error: null })
        .eq('id', clientId);
    }

    // Mark onboarding task as complete
    const { error: taskError } = await supabase
      .from('onboarding_tasks')
      .update({ 
        completed: true, 
        completed_at: new Date().toISOString() 
      })
      .eq('client_id', clientId)
      .eq('task_name', 'google_ads_campaign_created');

    if (taskError) {
      console.error('Error updating onboarding task:', taskError);
    }

    const uniqueSuffix = internalAgentId ? ` (${internalAgentId.slice(0, 8)})` : '';
    const campaignName = `IUL | TFWP OG | SEARCH | ${agentName}${uniqueSuffix}`;
    const result = {
      success: true,
      campaignId: campaignIdToSave,
      campaignName: campaignName,
      landingPage: landingPageUrl,
      trackingSuffix: `agent_id=${internalAgentId}`,
      states: finalParsedStates,
      status: 'PAUSED',
    };

    console.log('Campaign creation completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in create-google-ads-campaign:', error);
    
    // Try to update the client with the error
    try {
      const { clientId } = await req.clone().json();
      if (clientId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('clients')
          .update({ 
            gads_creation_error: errorMessage.slice(0, 500),
          })
          .eq('id', clientId);
      }
    } catch (e) {
      console.error('Could not save error to client:', e);
    }
    
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
