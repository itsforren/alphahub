import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetaAdsConfig {
  access_token: string;
  ad_account_id: string;
  campaign_ids: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Meta Ads config from settings
    const { data: settings } = await supabase
      .from('internal_marketing_settings')
      .select('setting_value')
      .eq('setting_key', 'meta_ads_config')
      .single();

    const config = settings?.setting_value as MetaAdsConfig | null;
    
    if (!config?.access_token || !config?.ad_account_id) {
      return new Response(
        JSON.stringify({ error: 'Meta Ads not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get today's date and month start
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Build API URL for insights
    const adAccountId = config.ad_account_id.startsWith('act_') 
      ? config.ad_account_id 
      : `act_${config.ad_account_id}`;

    // Query for account-level insights MTD
    const insightsUrl = new URL(`https://graph.facebook.com/v18.0/${adAccountId}/insights`);
    insightsUrl.searchParams.set('access_token', config.access_token);
    insightsUrl.searchParams.set('fields', 'spend,impressions,clicks');
    insightsUrl.searchParams.set('time_range', JSON.stringify({
      since: monthStart,
      until: today,
    }));
    insightsUrl.searchParams.set('level', 'account');

    // If specific campaign IDs are configured, filter to those
    if (config.campaign_ids && config.campaign_ids.length > 0) {
      insightsUrl.searchParams.set('filtering', JSON.stringify([{
        field: 'campaign.id',
        operator: 'IN',
        value: config.campaign_ids,
      }]));
    }

    const mtdResponse = await fetch(insightsUrl.toString());
    
    if (!mtdResponse.ok) {
      const errorData = await mtdResponse.json();
      console.error('Meta Ads API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Meta Ads data', details: errorData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const mtdData = await mtdResponse.json();
    const mtdSpend = parseFloat(mtdData.data?.[0]?.spend || '0');

    // Query for today's insights
    const todayUrl = new URL(`https://graph.facebook.com/v18.0/${adAccountId}/insights`);
    todayUrl.searchParams.set('access_token', config.access_token);
    todayUrl.searchParams.set('fields', 'spend');
    todayUrl.searchParams.set('time_range', JSON.stringify({
      since: today,
      until: today,
    }));
    todayUrl.searchParams.set('level', 'account');

    if (config.campaign_ids && config.campaign_ids.length > 0) {
      todayUrl.searchParams.set('filtering', JSON.stringify([{
        field: 'campaign.id',
        operator: 'IN',
        value: config.campaign_ids,
      }]));
    }

    const todayResponse = await fetch(todayUrl.toString());
    const todayData = await todayResponse.json();
    const todaySpend = parseFloat(todayData.data?.[0]?.spend || '0');

    return new Response(
      JSON.stringify({
        adAccountId,
        today: todaySpend,
        mtd: mtdSpend,
        currency: 'USD',
        campaignIds: config.campaign_ids,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-meta-ads:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
