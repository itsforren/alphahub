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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN')!;
    const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID')!.replace(/-/g, '');

    const accessToken = await getAccessToken();

    const apiUrl = (customerId: string) =>
      `https://googleads.googleapis.com/v22/customers/${customerId}/googleAds:searchStream`;

    const fetchQuery = async (customerId: string, query: string) => {
      const response = await fetch(apiUrl(customerId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'login-customer-id': mccCustomerId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const raw = await response.text();
        console.error(`Google Ads API error for ${customerId}:`, raw.slice(0, 300));
        return null;
      }
      return response.json();
    };

    // 1. List all child accounts under the MCC
    const childAccountsQuery = `
      SELECT customer_client.id, customer_client.descriptive_name
      FROM customer_client
      WHERE customer_client.manager = false
        AND customer_client.status = 'ENABLED'
    `;

    const childData = await fetchQuery(mccCustomerId, childAccountsQuery);
    const childAccounts: { id: string; name: string }[] = [];

    if (childData && Array.isArray(childData)) {
      for (const batch of childData) {
        for (const row of (batch.results || [])) {
          childAccounts.push({
            id: row.customerClient?.id?.toString() || '',
            name: row.customerClient?.descriptiveName || '',
          });
        }
      }
    }

    console.log(`Found ${childAccounts.length} child accounts`);

    // 2. For each child account, list all ENABLED campaigns
    interface GoogleCampaign {
      customerId: string;
      customerName: string;
      campaignId: string;
      campaignName: string;
      status: string;
    }

    const allGoogleCampaigns: GoogleCampaign[] = [];

    for (const account of childAccounts) {
      const campaignQuery = `
        SELECT campaign.id, campaign.name, campaign.status
        FROM campaign
        WHERE campaign.status = 'ENABLED'
      `;

      const campaignData = await fetchQuery(account.id, campaignQuery);
      if (campaignData && Array.isArray(campaignData)) {
        for (const batch of campaignData) {
          for (const row of (batch.results || [])) {
            allGoogleCampaigns.push({
              customerId: account.id,
              customerName: account.name,
              campaignId: row.campaign?.id?.toString() || '',
              campaignName: row.campaign?.name || '',
              status: row.campaign?.status || '',
            });
          }
        }
      }
    }

    console.log(`Found ${allGoogleCampaigns.length} enabled campaigns across all accounts`);

    // 3. Get all tracked campaigns from DB
    const { data: trackedCampaigns } = await supabase
      .from('campaigns')
      .select('google_customer_id, google_campaign_id, client_id, label, ignored');

    const trackedSet = new Set(
      (trackedCampaigns || []).map(c => `${c.google_customer_id}:${c.google_campaign_id}`)
    );

    // 4. Get all active clients for matching
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, agent_id, status')
      .in('status', ['active', 'onboarding']);

    // 5. Find untracked campaigns and suggest matches
    const untracked = allGoogleCampaigns
      .filter(gc => !trackedSet.has(`${gc.customerId}:${gc.campaignId}`))
      .map(gc => {
        // Try to match campaign name to a client/agent name
        const campaignNameLower = gc.campaignName.toLowerCase();
        let suggestedClient: { id: string; name: string } | null = null;
        let matchScore = 0;

        for (const client of (clients || [])) {
          const clientName = (client.name || '').toLowerCase();
          if (!clientName) continue;

          // Check if client name appears in campaign name
          // Split client name into parts and check each
          const nameParts = clientName.split(/\s+/);
          const lastNameMatch = nameParts.length > 1 && campaignNameLower.includes(nameParts[nameParts.length - 1]);
          const fullNameMatch = campaignNameLower.includes(clientName);
          const firstNameMatch = nameParts[0].length > 2 && campaignNameLower.includes(nameParts[0]);

          let score = 0;
          if (fullNameMatch) score = 3;
          else if (lastNameMatch && firstNameMatch) score = 2;
          else if (lastNameMatch) score = 1;

          if (score > matchScore) {
            matchScore = score;
            suggestedClient = { id: client.id, name: client.name };
          }
        }

        return {
          customerId: gc.customerId,
          customerName: gc.customerName,
          campaignId: gc.campaignId,
          campaignName: gc.campaignName,
          suggestedClientId: suggestedClient?.id || null,
          suggestedClientName: suggestedClient?.name || null,
          matchScore,
        };
      });

    console.log(`Found ${untracked.length} untracked campaigns`);

    return new Response(
      JSON.stringify({
        untrackedCampaigns: untracked,
        totalGoogleCampaigns: allGoogleCampaigns.length,
        totalTracked: trackedSet.size,
        clients: (clients || []).map(c => ({ id: c.id, name: c.name })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error finding untracked campaigns:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
