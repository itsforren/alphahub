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
    console.error('OAuth token error:', error);
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
    const { clientId, campaignRowId, newDailyBudget, changeSource, changeReason } = await req.json();

    if (!clientId) {
      throw new Error('clientId is required');
    }

    if (typeof newDailyBudget !== 'number' || newDailyBudget <= 0) {
      throw new Error('newDailyBudget must be a positive number');
    }

    console.log(`Updating daily budget to $${newDailyBudget} for client ${clientId}, campaignRowId: ${campaignRowId || 'primary'}, source: ${changeSource || 'unknown'}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // CAMP-08: Safe mode lock -- reject budget edits when safe mode is active
    const { data: rechargeState } = await supabase
      .from('recharge_state')
      .select('safe_mode_active')
      .eq('client_id', clientId)
      .maybeSingle();

    if (rechargeState?.safe_mode_active) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Budget editing locked during safe mode. Resolve payment to unlock.',
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let customerId: string;
    let campaignId: string;

    if (campaignRowId) {
      // Look up campaign from campaigns table
      const { data: campaignRow, error: campaignRowError } = await supabase
        .from('campaigns')
        .select('google_customer_id, google_campaign_id')
        .eq('id', campaignRowId)
        .single();

      if (campaignRowError || !campaignRow) {
        throw new Error(`Campaign row not found: ${campaignRowError?.message}`);
      }

      customerId = campaignRow.google_customer_id;
      campaignId = campaignRow.google_campaign_id;
    } else {
      // Fallback: use clients.google_campaign_id
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, google_campaign_id')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        throw new Error(`Client not found: ${clientError?.message}`);
      }

      if (!client.google_campaign_id) {
        throw new Error('Client does not have a Google Campaign ID configured');
      }

      const rawCampaignField = String(client.google_campaign_id).trim();
      if (!rawCampaignField.includes(':')) {
        throw new Error('google_campaign_id must be in format customerAccountId:campaignId');
      }

      const [customerPart, campaignPart] = rawCampaignField.split(':');
      customerId = customerPart.replace(/\D/g, '');
      campaignId = campaignPart.replace(/\D/g, '');
    }

    if (!customerId || !campaignId) {
      throw new Error('Invalid google_campaign_id value');
    }

    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
    const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

    // Get access token
    const accessToken = await getAccessToken();

    // First, get the campaign's budget resource name
    const searchQuery = `
      SELECT campaign.campaign_budget
      FROM campaign
      WHERE campaign.id = ${campaignId}
    `;

    const searchUrl = `https://googleads.googleapis.com/v22/customers/${customerId}/googleAds:searchStream`;
    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken!,
        'login-customer-id': cleanMccId!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: searchQuery }),
    });

    if (!searchResponse.ok) {
      const raw = await searchResponse.text();
      console.error('Search error:', raw);
      throw new Error(`Failed to get campaign budget: ${raw.slice(0, 500)}`);
    }

    const searchData = await searchResponse.json();
    const budgetResourceName = searchData?.[0]?.results?.[0]?.campaign?.campaignBudget;

    if (!budgetResourceName) {
      throw new Error('Could not find campaign budget resource');
    }

    console.log(`Found budget resource: ${budgetResourceName}`);

    // Update the budget using mutate
    const budgetAmountMicros = Math.round(newDailyBudget * 1_000_000);
    
    const mutateUrl = `https://googleads.googleapis.com/v22/${budgetResourceName}:mutate`;
    const mutateResponse = await fetch(`https://googleads.googleapis.com/v22/customers/${customerId}/campaignBudgets:mutate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken!,
        'login-customer-id': cleanMccId!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operations: [{
          update: {
            resourceName: budgetResourceName,
            amountMicros: budgetAmountMicros.toString(),
          },
          updateMask: 'amount_micros',
        }],
      }),
    });

    if (!mutateResponse.ok) {
      const raw = await mutateResponse.text();
      console.error('Mutate error:', raw);
      let extractedMessage: string | null = null;
      try {
        const parsed = JSON.parse(raw);
        extractedMessage = parsed?.error?.message || parsed?.[0]?.error?.message || null;
      } catch { /* non-JSON */ }
      throw new Error(`Failed to update budget: ${extractedMessage || raw.slice(0, 500)}`);
    }

    const mutateData = await mutateResponse.json();
    console.log('Budget updated successfully:', mutateData);

    // Update local database — campaigns table if campaignRowId, also always update clients
    if (campaignRowId) {
      // Get old budget for history logging
      const { data: oldCampaign } = await supabase
        .from('campaigns')
        .select('current_daily_budget, google_campaign_id')
        .eq('id', campaignRowId)
        .single();

      const oldBudget = oldCampaign?.current_daily_budget ?? null;

      const { error: campaignUpdateError } = await supabase
        .from('campaigns')
        .update({
          current_daily_budget: newDailyBudget,
          last_budget_change_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignRowId);

      if (campaignUpdateError) {
        console.error('Error updating campaign budget:', campaignUpdateError);
      }

      // CAMP-03: Log budget change to campaign_audit_log (replaces ghost campaign_budget_changes table)
      const { error: auditError } = await supabase.from('campaign_audit_log').insert({
        client_id: clientId,
        campaign_id: campaignRowId,
        action: 'budget_change',
        actor: changeSource === 'safe_mode_exit' ? 'system' : 'admin',
        old_value: { daily_budget: oldBudget },
        new_value: { daily_budget: newDailyBudget },
        reason_codes: changeSource ? [changeSource] : ['manual_edit'],
        notes: changeReason || null,
      });

      if (auditError) {
        console.error('Error writing audit log (campaign path):', auditError);
      }

      // Also update clients.target_daily_spend as sum of all campaign budgets
      const { data: allCampaigns } = await supabase
        .from('campaigns')
        .select('current_daily_budget')
        .eq('client_id', clientId);
      if (allCampaigns) {
        const totalBudget = allCampaigns.reduce((sum: number, c: any) => sum + (Number(c.current_daily_budget) || 0), 0);
        await supabase
          .from('clients')
          .update({ target_daily_spend: totalBudget, updated_at: new Date().toISOString() })
          .eq('id', clientId);
      }
    } else {
      // Get old budget for history logging
      const { data: oldClient } = await supabase
        .from('clients')
        .select('target_daily_spend, google_campaign_id')
        .eq('id', clientId)
        .single();

      const { error: updateError } = await supabase
        .from('clients')
        .update({
          target_daily_spend: newDailyBudget,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId);

      if (updateError) {
        console.error('Error updating local client:', updateError);
      }

      // CAMP-03: Log budget change to campaign_audit_log (client-level, no campaign row)
      const { error: auditError } = await supabase.from('campaign_audit_log').insert({
        client_id: clientId,
        campaign_id: null,
        action: 'budget_change',
        actor: changeSource === 'safe_mode_exit' ? 'system' : 'admin',
        old_value: { daily_budget: oldClient?.target_daily_spend ?? null },
        new_value: { daily_budget: newDailyBudget },
        reason_codes: changeSource ? [changeSource] : ['manual_edit'],
        notes: changeReason || null,
      });

      if (auditError) {
        console.error('Error writing audit log (client path):', auditError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      clientId,
      newDailyBudget,
      budgetResourceName,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in update-google-ads-budget:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
