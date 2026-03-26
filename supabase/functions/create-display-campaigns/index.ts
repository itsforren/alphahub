/**
 * create-display-campaigns: Creates Display Remarketing + Display In-Market campaigns
 * for an agent during onboarding (or manually via CampaignPanel).
 *
 * Clones from template campaigns in Google Ads, applies agent-specific settings
 * (landing page, geo targeting, naming), and registers in Supabase campaigns table.
 *
 * Template campaigns:
 *   - *** TEMPLATE *** | DISPLAY REMARKET (paused in Google Ads)
 *   - *** TEMPLATE *** | DISPLAY IN-MARKET (paused in Google Ads)
 *
 * See: ~/knowledge/business/runbooks/google-ads-campaign-setup.md for full spec.
 */

import { createClient } from "npm:@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_ADS_CUSTOMER_ID = '6551751244';
const DISPLAY_BUDGET_DAILY = 10; // $10/day for display campaigns

// Template campaign IDs (stored as campaignId only, customer ID is always 6551751244)
// These are read from onboarding_settings but have hardcoded fallbacks
const DEFAULT_TEMPLATE_REMARKET = ''; // Set in onboarding_settings: display_remarket_template_id
const DEFAULT_TEMPLATE_INMARKET = ''; // Set in onboarding_settings: display_inmarket_template_id

// Shared remarketing audiences
const ALL_CONVERTERS_AUDIENCE_ID = '7124992471';

// Mobile app category to exclude
const MOBILE_APP_CATEGORY = '60000'; // mobileAppCategoryConstants/60000

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

// Display ad copy (shared across all agents per runbook)
const DISPLAY_AD = {
  businessName: 'Tax Free Wealth Plan',
  longHeadline: 'See How an IUL Can Help You Build Tax-Free Wealth',
  headlines: [
    'Tax-Free Retirement Income',
    'The Account 99% Miss',
    'Zero Market Losses',
    'Your 401(k) Gets Taxed',
    'Build Tax-Free Wealth',
  ],
  descriptions: [
    'Learn how an IUL can create tax-free retirement income. See if you qualify today.',
    'Your 401(k) gets taxed at withdrawal. There may be a tax-free alternative.',
    'Lock in gains. Stay protected in downturns. Zero market losses. See if you qualify.',
  ],
  // Shared image asset IDs (account-level assets)
  landscapeImages: ['343507809855', '343507523109', '343461341386', '343369761014', '343369760942'],
  squareImages: ['343505670621', '343459322785', '343459322734', '343459322716', '343459301308'],
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

// Google Ads API helper
async function googleAds(
  accessToken: string,
  endpoint: string,
  body: any,
  method = 'POST',
): Promise<any> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN')!;
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID')!.replace(/-/g, '');
  const customerId = GOOGLE_ADS_CUSTOMER_ID;

  const url = `https://googleads.googleapis.com/v22/customers/${customerId}/${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'login-customer-id': mccCustomerId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Google Ads API error (${endpoint}): ${raw.slice(0, 500)}`);
  }

  return response.json();
}

async function gaqlQuery(accessToken: string, query: string): Promise<any[]> {
  const data = await googleAds(accessToken, 'googleAds:searchStream', { query });
  const results: any[] = [];
  if (data && Array.isArray(data)) {
    for (const batch of data) {
      if (batch.results) results.push(...batch.results);
    }
  }
  return results;
}

// Create a single display campaign from a template
async function createDisplayCampaign(
  accessToken: string,
  opts: {
    templateCampaignId: string;
    campaignName: string;
    agentId: string;
    landingPage: string;
    states: string[];
    campaignType: 'remarket' | 'inmarket';
  },
): Promise<{ success: boolean; campaignId?: string; error?: string }> {
  const customerId = GOOGLE_ADS_CUSTOMER_ID;

  try {
    // 1. Create dedicated budget ($10/day)
    console.log(`[display] Creating budget for ${opts.campaignName}...`);
    const budgetResult = await googleAds(accessToken, 'campaignBudgets:mutate', {
      operations: [{
        create: {
          name: `${opts.campaignName} Budget`,
          amountMicros: String(DISPLAY_BUDGET_DAILY * 1_000_000),
          deliveryMethod: 'STANDARD',
          explicitlyShared: false,
        },
      }],
    });
    const budgetResourceName = budgetResult.results?.[0]?.resourceName;
    if (!budgetResourceName) throw new Error('Failed to create budget');

    // 2. Create campaign (Display, MaxConv, PAUSED initially)
    console.log(`[display] Creating campaign ${opts.campaignName}...`);
    const campaignResult = await googleAds(accessToken, 'campaigns:mutate', {
      operations: [{
        create: {
          name: opts.campaignName,
          advertisingChannelType: 'DISPLAY',
          status: 'PAUSED',
          campaignBudget: budgetResourceName,
          biddingStrategyType: 'MAXIMIZE_CONVERSIONS',
          maximizeConversions: {},
          geoTargetTypeSetting: {
            positiveGeoTargetType: 'PRESENCE',
          },
          finalUrlSuffix: `agent_id=${opts.agentId}`,
          containsEuPoliticalAdvertising: 3,
          networkSettings: {
            targetGoogleSearch: false,
            targetSearchNetwork: false,
            targetContentNetwork: true,
          },
        },
      }],
    });
    const campaignResourceName = campaignResult.results?.[0]?.resourceName;
    if (!campaignResourceName) throw new Error('Failed to create campaign');
    const campaignId = campaignResourceName.split('/').pop()!;
    console.log(`[display] Created campaign ${campaignId}`);

    // 3. Set geo targeting (states)
    if (opts.states.length > 0) {
      console.log(`[display] Setting geo targets for ${opts.states.length} states...`);
      const geoOps = opts.states
        .filter(s => STATE_TO_GEO_CONSTANT[s.trim().toUpperCase()])
        .map(s => ({
          create: {
            campaign: campaignResourceName,
            criterion: {
              location: {
                geoTargetConstant: `geoTargetConstants/${STATE_TO_GEO_CONSTANT[s.trim().toUpperCase()]}`,
              },
            },
            negative: false,
          },
        }));

      if (geoOps.length > 0) {
        await googleAds(accessToken, 'campaignCriteria:mutate', { operations: geoOps });
      }
    }

    // 4. Exclude All Converters at campaign level
    console.log(`[display] Excluding All Converters audience...`);
    try {
      await googleAds(accessToken, 'campaignCriteria:mutate', {
        operations: [{
          create: {
            campaign: campaignResourceName,
            criterion: {
              userList: {
                userList: `customers/${customerId}/userLists/${ALL_CONVERTERS_AUDIENCE_ID}`,
              },
            },
            negative: true,
          },
        }],
      });
    } catch (e) {
      console.warn('[display] Failed to exclude converters (non-fatal):', e);
    }

    // 5. Exclude mobile app placements
    console.log(`[display] Excluding mobile app placements...`);
    try {
      await googleAds(accessToken, 'campaignCriteria:mutate', {
        operations: [{
          create: {
            campaign: campaignResourceName,
            criterion: {
              mobileAppCategory: {
                mobileAppCategoryConstant: `mobileAppCategoryConstants/${MOBILE_APP_CATEGORY}`,
              },
            },
            negative: true,
          },
        }],
      });
    } catch (e) {
      console.warn('[display] Failed to exclude mobile apps (non-fatal):', e);
    }

    // 6. Clone ad groups + audience targeting from template
    console.log(`[display] Cloning ad groups from template ${opts.templateCampaignId}...`);
    const templateAdGroups = await gaqlQuery(accessToken, `
      SELECT ad_group.id, ad_group.name, ad_group.type, ad_group.status
      FROM ad_group
      WHERE campaign.id = ${opts.templateCampaignId}
    `);

    for (const templateAg of templateAdGroups) {
      const agName = templateAg.adGroup?.name || 'Ad Group';
      const agType = templateAg.adGroup?.type || 'DISPLAY_STANDARD';
      const templateAgId = templateAg.adGroup?.id;

      // Create ad group
      const agResult = await googleAds(accessToken, 'adGroups:mutate', {
        operations: [{
          create: {
            campaign: campaignResourceName,
            name: agName,
            type: agType,
            status: 'ENABLED',
          },
        }],
      });
      const agResourceName = agResult.results?.[0]?.resourceName;
      if (!agResourceName) continue;

      // Copy audience targeting from template ad group
      const templateCriteria = await gaqlQuery(accessToken, `
        SELECT
          ad_group_criterion.criterion_id,
          ad_group_criterion.type,
          ad_group_criterion.user_list.user_list,
          ad_group_criterion.user_interest.user_interest_category,
          ad_group_criterion.custom_audience.custom_audience,
          ad_group_criterion.negative
        FROM ad_group_criterion
        WHERE ad_group.id = ${templateAgId}
          AND ad_group_criterion.type IN ('USER_LIST', 'USER_INTEREST', 'CUSTOM_AUDIENCE')
      `);

      if (templateCriteria.length > 0) {
        const audienceOps = templateCriteria.map((tc: any) => {
          const criterion: any = {};
          if (tc.adGroupCriterion?.userList?.userList) {
            criterion.userList = { userList: tc.adGroupCriterion.userList.userList };
          } else if (tc.adGroupCriterion?.userInterest?.userInterestCategory) {
            criterion.userInterest = { userInterestCategory: tc.adGroupCriterion.userInterest.userInterestCategory };
          } else if (tc.adGroupCriterion?.customAudience?.customAudience) {
            criterion.customAudience = { customAudience: tc.adGroupCriterion.customAudience.customAudience };
          }

          return {
            create: {
              adGroup: agResourceName,
              criterion,
              negative: tc.adGroupCriterion?.negative || false,
            },
          };
        }).filter((op: any) => Object.keys(op.create.criterion).length > 0);

        if (audienceOps.length > 0) {
          try {
            await googleAds(accessToken, 'adGroupCriteria:mutate', { operations: audienceOps });
            console.log(`[display] Copied ${audienceOps.length} audience criteria`);
          } catch (e) {
            console.warn('[display] Failed to copy some audience criteria:', e);
          }
        }
      }

      // 7. Create Responsive Display Ad
      console.log(`[display] Creating Responsive Display Ad...`);
      const marketingImages = DISPLAY_AD.landscapeImages.map(id => ({
        asset: `customers/${customerId}/assets/${id}`,
      }));
      const squareImages = DISPLAY_AD.squareImages.map(id => ({
        asset: `customers/${customerId}/assets/${id}`,
      }));

      try {
        await googleAds(accessToken, 'adGroupAds:mutate', {
          operations: [{
            create: {
              adGroup: agResourceName,
              status: 'ENABLED',
              ad: {
                finalUrls: [opts.landingPage],
                responsiveDisplayAd: {
                  marketingImages,
                  squareMarketingImages: squareImages,
                  headlines: DISPLAY_AD.headlines.map(h => ({ text: h })),
                  longHeadline: { text: DISPLAY_AD.longHeadline },
                  descriptions: DISPLAY_AD.descriptions.map(d => ({ text: d })),
                  businessName: DISPLAY_AD.businessName,
                },
              },
            },
          }],
        });
        console.log(`[display] Responsive Display Ad created`);
      } catch (e) {
        console.warn('[display] Failed to create display ad:', e);
      }
    }

    // 8. Enable the campaign
    console.log(`[display] Enabling campaign...`);
    await googleAds(accessToken, 'campaigns:mutate', {
      operations: [{
        update: {
          resourceName: campaignResourceName,
          status: 'ENABLED',
        },
        updateMask: 'status',
      }],
    });

    return { success: true, campaignId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[display] Failed to create ${opts.campaignType} campaign:`, msg);
    return { success: false, error: msg };
  }
}

// Main handler
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, agentName, agentId, states, landingPage } = await req.json();

    if (!clientId || !agentName) {
      throw new Error('clientId and agentName are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get template campaign IDs from settings
    const [remarkTemplateSetting, inmarketTemplateSetting] = await Promise.all([
      supabase.from('onboarding_settings').select('setting_value').eq('setting_key', 'display_remarket_template_id').maybeSingle(),
      supabase.from('onboarding_settings').select('setting_value').eq('setting_key', 'display_inmarket_template_id').maybeSingle(),
    ]);

    const remarkTemplateId = remarkTemplateSetting.data?.setting_value || DEFAULT_TEMPLATE_REMARKET;
    const inmarketTemplateId = inmarketTemplateSetting.data?.setting_value || DEFAULT_TEMPLATE_INMARKET;

    if (!remarkTemplateId || !inmarketTemplateId) {
      throw new Error('Display campaign template IDs not configured in onboarding_settings (display_remarket_template_id, display_inmarket_template_id)');
    }

    // Parse states
    const stateList = Array.isArray(states)
      ? states
      : typeof states === 'string'
        ? states.split(/[,\s]+/).map((s: string) => s.trim()).filter(Boolean)
        : [];

    // Resolve landing page
    let finalLandingPage = landingPage;
    if (!finalLandingPage) {
      const { data: client } = await supabase
        .from('clients')
        .select('lander_link, agent_id, url_slug')
        .eq('id', clientId)
        .single();
      finalLandingPage = client?.lander_link || `https://www.taxfreewealthplan.com/discover/${client?.url_slug || agentId}`;
    }

    const finalAgentId = agentId || (await supabase.from('clients').select('agent_id').eq('id', clientId).single()).data?.agent_id;

    const accessToken = await getAccessToken();

    // Count existing campaigns to determine label numbering
    const { data: existingCampaigns } = await supabase
      .from('campaigns')
      .select('id')
      .eq('client_id', clientId);
    const existingCount = existingCampaigns?.length || 0;

    const results: { type: string; success: boolean; campaignId?: string; error?: string }[] = [];

    // Create Display Remarketing
    console.log(`[display] Creating Display Remarketing for ${agentName}...`);
    const remarkResult = await createDisplayCampaign(accessToken, {
      templateCampaignId: remarkTemplateId,
      campaignName: `IUL | DISPLAY REMARKET | ${agentName}`,
      agentId: finalAgentId,
      landingPage: finalLandingPage,
      states: stateList,
      campaignType: 'remarket',
    });

    if (remarkResult.success && remarkResult.campaignId) {
      await supabase.from('campaigns').upsert({
        client_id: clientId,
        google_customer_id: GOOGLE_ADS_CUSTOMER_ID,
        google_campaign_id: remarkResult.campaignId,
        is_primary: false,
        label: `IUL | DISPLAY REMARKET | ${agentName}`,
        states: stateList.join(', '),
        current_daily_budget: DISPLAY_BUDGET_DAILY,
      }, { onConflict: 'google_customer_id,google_campaign_id' });
    }
    results.push({ type: 'remarket', ...remarkResult });

    // Create Display In-Market
    console.log(`[display] Creating Display In-Market for ${agentName}...`);
    const inmarketResult = await createDisplayCampaign(accessToken, {
      templateCampaignId: inmarketTemplateId,
      campaignName: `IUL | DISPLAY IN-MARKET | ${agentName}`,
      agentId: finalAgentId,
      landingPage: finalLandingPage,
      states: stateList,
      campaignType: 'inmarket',
    });

    if (inmarketResult.success && inmarketResult.campaignId) {
      await supabase.from('campaigns').upsert({
        client_id: clientId,
        google_customer_id: GOOGLE_ADS_CUSTOMER_ID,
        google_campaign_id: inmarketResult.campaignId,
        is_primary: false,
        label: `IUL | DISPLAY IN-MARKET | ${agentName}`,
        states: stateList.join(', '),
        current_daily_budget: DISPLAY_BUDGET_DAILY,
      }, { onConflict: 'google_customer_id,google_campaign_id' });
    }
    results.push({ type: 'inmarket', ...inmarketResult });

    const allSuccess = results.every(r => r.success);

    return new Response(
      JSON.stringify({
        success: allSuccess,
        results,
        remarkCampaignId: remarkResult.campaignId,
        inmarketCampaignId: inmarketResult.campaignId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[display] Fatal error:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
