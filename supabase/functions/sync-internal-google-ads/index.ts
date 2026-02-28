import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get internal campaign ID from settings
    const { data: settings } = await supabase
      .from('internal_marketing_settings')
      .select('setting_value')
      .eq('setting_key', 'google_ads_internal_campaign_id')
      .single();

    const campaignId = settings?.setting_value?.replace(/"/g, '');
    
    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: 'Internal Google Ads campaign ID not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get Google Ads credentials
    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    const clientId = Deno.env.get('GOOGLE_ADS_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET');
    const refreshToken = Deno.env.get('GOOGLE_ADS_REFRESH_TOKEN');
    const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');

    if (!developerToken || !refreshToken) {
      return new Response(
        JSON.stringify({ error: 'Google Ads credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get today's date and month start for queries
    const now = new Date();
    const today = now.toISOString().split('T')[0].replace(/-/g, '');
    const monthStart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}01`;

    // Query for campaign metrics
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        metrics.cost_micros,
        segments.date
      FROM campaign
      WHERE campaign.id = ${campaignId}
        AND segments.date >= '${monthStart}'
        AND segments.date <= '${today}'
    `;

    const apiUrl = `https://googleads.googleapis.com/v15/customers/${mccCustomerId?.replace(/-/g, '')}/googleAds:searchStream`;
    
    const metricsResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!metricsResponse.ok) {
      const errorText = await metricsResponse.text();
      console.error('Google Ads API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Google Ads data', details: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const metricsData = await metricsResponse.json();
    
    // Calculate totals
    let mtdSpend = 0;
    let todaySpend = 0;
    const todayStr = now.toISOString().split('T')[0].replace(/-/g, '');

    for (const response of metricsData) {
      if (response.results) {
        for (const result of response.results) {
          const costMicros = parseInt(result.metrics?.cost_micros || '0');
          const cost = costMicros / 1_000_000;
          mtdSpend += cost;
          
          if (result.segments?.date === todayStr) {
            todaySpend += cost;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        campaignId,
        today: todaySpend,
        mtd: mtdSpend,
        currency: 'USD',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-internal-google-ads:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
