import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleAdsMetrics {
  date: string;
  campaignId: string;
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
}

interface CampaignInfo {
  dailyBudget: number;
  targetStates: string[];
}

// Google Ads geo target constant IDs to US state abbreviations
// Canonical mapping — must match sync-google-ads-targeting/index.ts
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

function geoConstantToState(geoConstant: string): string | null {
  // Format: "geoTargetConstants/21136" -> extract ID and map to state
  const match = geoConstant.match(/geoTargetConstants\/(\d+)/);
  if (match) {
    return GEO_CONSTANT_TO_STATE[match[1]] || null;
  }
  return null;
}

// Safe numeric parser: ensures we always get a valid finite number or 0
function safeNumber(value: unknown, defaultVal = 0): number {
  if (value === null || value === undefined) return defaultVal;
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultVal;
}

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

async function fetchGoogleAdsData(
  accessToken: string,
  customerId: string,
  campaignId: string,
  startDate: string,
  endDate: string
): Promise<{ metrics: GoogleAdsMetrics[]; campaignInfo: CampaignInfo }> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');

  // Remove dashes and trim whitespace from customer IDs
  const cleanCustomerId = customerId.trim().replace(/-/g, '');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

  const metricsQuery = `
    SELECT
      segments.date,
      campaign.id,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE campaign.id = ${campaignId}
      AND segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY segments.date DESC
  `;

  // Query for campaign budget
  const budgetQuery = `
    SELECT
      campaign.id,
      campaign.name,
      campaign_budget.amount_micros
    FROM campaign
    WHERE campaign.id = ${campaignId}
  `;

  // Query for geo targeting (states)
  const geoQuery = `
    SELECT
      campaign.id,
      campaign_criterion.location.geo_target_constant
    FROM campaign_criterion
    WHERE campaign.id = ${campaignId}
      AND campaign_criterion.type = 'LOCATION'
      AND campaign_criterion.negative = false
  `;

  console.log(`Fetching Google Ads data for customer ${cleanCustomerId}, campaign ${campaignId}`);
  console.log(`MCC login-customer-id: ${cleanMccId}`);
  console.log(`Date range: ${startDate} to ${endDate}`);

  const apiUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/googleAds:searchStream`;

  // Helper to make API calls
  const fetchQuery = async (query: string) => {
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
      console.error('Google Ads API error response:', raw);
      let extractedMessage: string | null = null;
      try {
        const parsed = JSON.parse(raw);
        extractedMessage = parsed?.error?.message || parsed?.[0]?.error?.message || null;
      } catch { /* non-JSON */ }
      throw new Error(`Google Ads API error (${response.status}): ${extractedMessage || raw.slice(0, 500)}`);
    }
    return response.json();
  };

  // Fetch metrics
  const metricsData = await fetchQuery(metricsQuery);
  const results: GoogleAdsMetrics[] = [];

  if (metricsData && Array.isArray(metricsData)) {
    for (const batch of metricsData) {
      if (batch.results) {
        for (const row of batch.results) {
          // Use safeNumber to handle decimal conversions properly
          results.push({
            date: row.segments?.date || '',
            campaignId: row.campaign?.id?.toString() || campaignId,
            cost: safeNumber(row.metrics?.costMicros, 0) / 1_000_000,
            impressions: safeNumber(row.metrics?.impressions, 0),
            clicks: safeNumber(row.metrics?.clicks, 0),
            conversions: safeNumber(row.metrics?.conversions, 0), // Can be decimal like 6.5
            ctr: safeNumber(row.metrics?.ctr, 0) * 100,
            cpc: safeNumber(row.metrics?.averageCpc, 0) / 1_000_000,
          });
        }
      }
    }
  }

  // Fetch campaign budget
  let dailyBudget = 0;
  try {
    const budgetData = await fetchQuery(budgetQuery);
    if (budgetData?.[0]?.results?.[0]?.campaignBudget?.amountMicros) {
      dailyBudget = safeNumber(budgetData[0].results[0].campaignBudget.amountMicros, 0) / 1_000_000;
    }
    console.log(`Campaign daily budget: $${dailyBudget}`);
  } catch (e) {
    console.error('Error fetching budget:', e);
  }

  // Fetch geo targeting (states)
  const targetStates: string[] = [];
  try {
    const geoData = await fetchQuery(geoQuery);
    if (geoData && Array.isArray(geoData)) {
      for (const batch of geoData) {
        if (batch.results) {
          for (const row of batch.results) {
            const geoConstant = row.campaignCriterion?.location?.geoTargetConstant;
            if (geoConstant) {
              const stateAbbrev = geoConstantToState(geoConstant);
              if (stateAbbrev) {
                targetStates.push(stateAbbrev);
              }
            }
          }
        }
      }
    }
    console.log(`Target states: ${targetStates.join(', ')}`);
  } catch (e) {
    console.error('Error fetching geo targeting:', e);
  }

  console.log(`Fetched ${results.length} daily records from Google Ads`);
  return { metrics: results, campaignInfo: { dailyBudget, targetStates } };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, daysBack = 7 } = await req.json();

    if (!clientId) {
      throw new Error('clientId is required');
    }

    console.log(`Starting Google Ads sync for client ${clientId}, daysBack: ${daysBack}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get client's Google Campaign ID and customer ID
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, google_campaign_id, agent_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error(`Client not found: ${clientError?.message}`);
    }

    if (!client.google_campaign_id) {
      throw new Error('Client does not have a Google Campaign ID configured');
    }

    // Parse google_campaign_id - REQUIRED format: "customerId:campaignId"
    // Example: "655-175-1244:23363894096"
    const rawCampaignField = String(client.google_campaign_id).trim();
    
    // Default MCC customer ID for auto-formatting
    const DEFAULT_CUSTOMER_ID = '6551751244';

    let customerId: string;
    let campaignId: string;

    if (!rawCampaignField.includes(':')) {
      // Auto-format: if only campaign ID provided, use default customer ID
      console.log(`Campaign ID missing colon, auto-formatting with default customer ID: ${DEFAULT_CUSTOMER_ID}`);
      customerId = DEFAULT_CUSTOMER_ID;
      campaignId = rawCampaignField.replace(/\D/g, '');
      
      // Update the client record with the formatted value
      const formattedValue = `${customerId}:${campaignId}`;
      await supabase
        .from('clients')
        .update({ google_campaign_id: formattedValue })
        .eq('id', clientId);
      console.log(`Updated client google_campaign_id to: ${formattedValue}`);
    } else {
      const [customerPart, campaignPart] = rawCampaignField.split(':');
      customerId = customerPart.replace(/\D/g, '');
      campaignId = campaignPart.replace(/\D/g, '');
    }

    if (!customerId || !campaignId) {
      throw new Error(
        'Invalid google_campaign_id value. Use format customerAccountId:campaignId with digits only (dashes ok).'
      );
    }

    console.log(`Parsed google_campaign_id => customerId=${customerId}, campaignId=${campaignId}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Get access token
    const accessToken = await getAccessToken();

    // Fetch metrics and campaign info from Google Ads
    const { metrics, campaignInfo } = await fetchGoogleAdsData(
      accessToken,
      customerId,
      campaignId,
      formatDate(startDate),
      formatDate(endDate)
    );

    // Track upsert successes and failures
    let upsertedCount = 0;
    const failedDates: string[] = [];
    const upsertErrors: { date: string; error: string }[] = [];

    // Upsert daily records into ad_spend_daily with utilization and overdelivery
    for (const metric of metrics) {
      // Calculate budget utilization and overdelivery
      const budgetUtilization = campaignInfo.dailyBudget > 0 
        ? metric.cost / campaignInfo.dailyBudget 
        : null;
      const isOverdelivery = campaignInfo.dailyBudget > 0 && metric.cost > campaignInfo.dailyBudget;

      const { error: upsertError } = await supabase
        .from('ad_spend_daily')
        .upsert({
          client_id: clientId,
          campaign_id: metric.campaignId,
          spend_date: metric.date,
          cost: metric.cost,
          impressions: metric.impressions,
          clicks: metric.clicks,
          conversions: metric.conversions, // Now numeric in DB, can handle decimals
          ctr: metric.ctr,
          cpc: metric.cpc,
          budget_daily: campaignInfo.dailyBudget || null,
          budget_utilization: budgetUtilization,
          overdelivery: isOverdelivery,
          campaign_enabled: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'client_id,campaign_id,spend_date',
        });

      if (upsertError) {
        console.error(`Error upserting metric for ${metric.date}:`, upsertError.message);
        failedDates.push(metric.date);
        upsertErrors.push({ date: metric.date, error: upsertError.message });
      } else {
        upsertedCount++;
      }
    }

    // Log summary of upserts
    console.log(`Upsert summary: ${upsertedCount} succeeded, ${failedDates.length} failed`);
    if (failedDates.length > 0) {
      console.error(`Failed dates: ${failedDates.join(', ')}`);
    }

    // Upsert into campaigns table
    console.log(`Upserting campaign record for client ${clientId}`);
    const { error: campaignUpsertError } = await supabase
      .from('campaigns')
      .upsert({
        client_id: clientId,
        google_customer_id: customerId,
        google_campaign_id: campaignId,
        current_daily_budget: campaignInfo.dailyBudget || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'client_id',
      });

    if (campaignUpsertError) {
      console.error('Error upserting campaign:', campaignUpsertError);
    } else {
      console.log('Campaign record upserted successfully');
    }

    // Calculate MTD metrics
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const { data: mtdData, error: mtdError } = await supabase
      .from('ad_spend_daily')
      .select('cost, clicks, impressions, conversions')
      .eq('client_id', clientId)
      .gte('spend_date', formatDate(monthStart))
      .lte('spend_date', formatDate(now));

    if (mtdError) {
      console.error('Error fetching MTD data:', mtdError);
    }

    // Aggregate MTD metrics
    const mtdMetrics = (mtdData || []).reduce(
      (acc, row) => ({
        totalCost: acc.totalCost + safeNumber(row.cost, 0),
        totalClicks: acc.totalClicks + safeNumber(row.clicks, 0),
        totalImpressions: acc.totalImpressions + safeNumber(row.impressions, 0),
        totalConversions: acc.totalConversions + safeNumber(row.conversions, 0),
      }),
      { totalCost: 0, totalClicks: 0, totalImpressions: 0, totalConversions: 0 }
    );

    // Calculate derived metrics
    const ctr = mtdMetrics.totalImpressions > 0 
      ? (mtdMetrics.totalClicks / mtdMetrics.totalImpressions) * 100 
      : 0;
    const cpc = mtdMetrics.totalClicks > 0 
      ? mtdMetrics.totalCost / mtdMetrics.totalClicks 
      : 0;
    const conversionRate = mtdMetrics.totalClicks > 0 
      ? (mtdMetrics.totalConversions / mtdMetrics.totalClicks) * 100 
      : 0;

    // Get MTD leads count for CPL calculation
    const { data: mtdLeads } = await supabase
      .from('clients')
      .select('mtd_leads')
      .eq('id', clientId)
      .single();

    const mtdLeadsCount = mtdLeads?.mtd_leads || 0;
    const cpl = mtdLeadsCount > 0 
      ? mtdMetrics.totalCost / mtdLeadsCount 
      : 0;

    // Update client metrics including daily budget and target states
    const updatePayload: Record<string, unknown> = {
      mtd_ad_spend: mtdMetrics.totalCost,
      ctr: ctr,
      cpc: cpc,
      cpl: cpl,
      conversion_rate: conversionRate,
      updated_at: new Date().toISOString(),
    };

    // Add daily budget if fetched
    if (campaignInfo.dailyBudget > 0) {
      updatePayload.target_daily_spend = campaignInfo.dailyBudget;
    }

    // NOTE: States are NOT synced here. Use the dedicated sync-google-ads-targeting
    // function (triggered from the StateSelector "Sync from Google Ads" button or
    // the main refresh button) to avoid overwriting states with incorrect mappings.

    const { error: updateError } = await supabase
      .from('clients')
      .update(updatePayload)
      .eq('id', clientId);

    if (updateError) {
      console.error('Error updating client metrics:', updateError);
    }

    // Determine overall success - fail if ANY upserts failed
    const overallSuccess = failedDates.length === 0;

    const result = {
      success: overallSuccess,
      clientId,
      recordsFetched: metrics.length,
      recordsUpserted: upsertedCount,
      failedDates: failedDates.length > 0 ? failedDates : undefined,
      upsertErrors: upsertErrors.length > 0 ? upsertErrors : undefined,
      dateRange: {
        start: formatDate(startDate),
        end: formatDate(endDate),
      },
      campaignInfo: {
        dailyBudget: campaignInfo.dailyBudget,
        targetStates: campaignInfo.targetStates,
      },
      mtdMetrics: {
        adSpend: mtdMetrics.totalCost,
        clicks: mtdMetrics.totalClicks,
        impressions: mtdMetrics.totalImpressions,
        conversions: mtdMetrics.totalConversions,
        ctr,
        cpc,
        cpl,
        conversionRate,
      },
    };

    console.log('Sync completed:', JSON.stringify(result));

    // Return 200 even if some upserts failed - the success flag indicates actual status
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in sync-google-ads:', error);
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
