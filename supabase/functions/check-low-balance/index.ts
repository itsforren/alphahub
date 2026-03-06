import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function postAdsManagerWebhook(payload: unknown): Promise<void> {
  const webhookUrl = Deno.env.get('SLACK_ADS_MANAGER_WEBHOOK_URL');
  if (!webhookUrl) return;
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const raw = await res.text();
      throw new Error(`Ads Manager webhook failed [${res.status}]: ${raw.slice(0, 500)}`);
    }
  } catch (e) {
    console.error('Failed to post Ads Manager Slack webhook:', e);
  }
}

// Default threshold if not set per-client
const DEFAULT_LOW_BALANCE_THRESHOLD = 150;
// Safe Mode budget ladder - try lowest first, fallback if rejected
const SAFE_MODE_BUDGETS = [0.01, 0.10, 1.00];

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

async function updateGoogleAdsBudget(
  accessToken: string,
  customerId: string,
  campaignId: string,
  newDailyBudget: number
): Promise<{ success: boolean; budgetUsed: number }> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

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
    return { success: false, budgetUsed: 0 };
  }

  const searchData = await searchResponse.json();
  const budgetResourceName = searchData?.[0]?.results?.[0]?.campaign?.campaignBudget;

  if (!budgetResourceName) {
    console.error('Could not find campaign budget resource');
    return { success: false, budgetUsed: 0 };
  }

  // Try Safe Mode budget ladder
  for (const budgetToTry of SAFE_MODE_BUDGETS) {
    const budgetAmountMicros = Math.round(budgetToTry * 1_000_000);
    
    console.log(`Attempting to set budget to $${budgetToTry}...`);

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

    if (mutateResponse.ok) {
      console.log(`Successfully set Safe Mode budget to $${budgetToTry}`);
      return { success: true, budgetUsed: budgetToTry };
    }
    
    const raw = await mutateResponse.text();
    console.warn(`Budget $${budgetToTry} rejected: ${raw.slice(0, 200)}`);
  }

  console.error('All Safe Mode budget attempts failed');
  return { success: false, budgetUsed: 0 };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let clientsToCheck: { id: string; name: string; google_campaign_id: string | null; target_daily_spend: number | null }[] = [];

    if (clientId) {
      // Check specific client
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, google_campaign_id, target_daily_spend')
        .eq('id', clientId)
        .single();
      
      if (error) throw error;
      if (data) clientsToCheck = [data];
    } else {
      // Check all clients with Google Ads campaigns
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, google_campaign_id, target_daily_spend')
        .not('google_campaign_id', 'is', null);
      
      if (error) throw error;
      clientsToCheck = data || [];
    }

    console.log(`Checking ${clientsToCheck.length} clients for low balance`);

    const results: { clientId: string; clientName: string; action: string; balance: number }[] = [];
    let accessToken: string | null = null;

    for (const client of clientsToCheck) {
      // Skip if already in safe mode (at minimum budget)
      if (client.target_daily_spend && client.target_daily_spend <= SAFE_MODE_BUDGETS[SAFE_MODE_BUDGETS.length - 1]) {
        console.log(`Client ${client.name} already in Safe Mode, skipping`);
        continue;
      }

      // Get wallet deposits total
      const { data: deposits } = await supabase
        .from('wallet_transactions')
        .select('amount')
        .eq('client_id', client.id)
        .eq('transaction_type', 'deposit');

      const totalDeposits = deposits?.reduce((sum, tx) => sum + Number(tx.amount), 0) ?? 0;

      // Get wallet tracking start date and low balance threshold
      const { data: wallet } = await supabase
        .from('client_wallets')
        .select('tracking_start_date, low_balance_threshold, billing_mode')
        .eq('client_id', client.id)
        .maybeSingle();

      // Admin exempt accounts bypass wallet-based safe mode
      if (wallet?.billing_mode === 'admin_exempt') {
        console.log(`Client ${client.name}: admin_exempt — skipping wallet safe mode check`);
        continue;
      }

      // Use per-client threshold or default
      const lowBalanceThreshold = wallet?.low_balance_threshold ?? DEFAULT_LOW_BALANCE_THRESHOLD;

      // Fetch performance percentage setting
      const { data: perfSetting } = await supabase
        .from('onboarding_settings')
        .select('setting_value')
        .eq('setting_key', 'performance_percentage')
        .maybeSingle();
      
      // Default to 0% if not configured - never hardcode a non-zero default
      const rawPerf = perfSetting?.setting_value ? parseFloat(perfSetting.setting_value) : NaN;
      const performancePercentage = Number.isFinite(rawPerf) ? rawPerf : 0;

      // Get tracked ad spend from tracking start date
      let trackedSpend = 0;
      if (wallet?.tracking_start_date) {
        const { data: spendData } = await supabase
          .from('ad_spend_daily')
          .select('cost')
          .eq('client_id', client.id)
          .gte('spend_date', wallet.tracking_start_date);
        
        trackedSpend = spendData?.reduce((sum, day) => sum + Number(day.cost || 0), 0) ?? 0;
      }

      // Apply performance fee to get displayed spend
      const displayedSpend = trackedSpend * (1 + performancePercentage / 100);
      const remainingBalance = totalDeposits - displayedSpend;
      console.log(`Client ${client.name}: Balance = $${remainingBalance.toFixed(2)}`);

      // Check if balance is at or below per-client threshold
      if (remainingBalance <= lowBalanceThreshold && client.google_campaign_id) {
        console.log(`Client ${client.name} has low balance ($${remainingBalance.toFixed(2)}) below threshold ($${lowBalanceThreshold}), entering Safe Mode`);

        // Parse google_campaign_id
        const rawCampaignField = String(client.google_campaign_id).trim();
        if (rawCampaignField.includes(':')) {
          const [customerPart, campaignPart] = rawCampaignField.split(':');
          const customerId = customerPart.replace(/\D/g, '');
          const campaignId = campaignPart.replace(/\D/g, '');

          if (customerId && campaignId) {
            // Get access token only once
            if (!accessToken) {
              accessToken = await getAccessToken();
            }

            const result = await updateGoogleAdsBudget(accessToken, customerId, campaignId, SAFE_MODE_BUDGETS[0]);
            
            if (result.success) {
              // Update client with safe mode info
              await supabase
                .from('clients')
                .update({ 
                  target_daily_spend: result.budgetUsed,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', client.id);

              // Update campaigns table with safe mode status
              await supabase
                .from('campaigns')
                .update({
                  safe_mode: true,
                  safe_mode_triggered_at: new Date().toISOString(),
                  safe_mode_reason: 'SAFE_WALLET',
                  safe_mode_budget_used: result.budgetUsed,
                  pre_safe_mode_budget: client.target_daily_spend,
                  updated_at: new Date().toISOString(),
                })
                .eq('client_id', client.id);

              // Create audit log entry
              await supabase.from('campaign_audit_log').insert([{
                client_id: client.id,
                action: 'SAFE_MODE_TRIGGERED',
                actor: 'system',
                reason_codes: ['LOW_WALLET_BALANCE'],
                old_value: { target_daily_spend: client.target_daily_spend },
                new_value: { target_daily_spend: result.budgetUsed, safe_mode: true },
                notes: `Safe Mode activated due to low wallet balance ($${remainingBalance.toFixed(2)}). Budget set to $${result.budgetUsed}.`,
              }]);

              // Create decision event
              await supabase.from('decision_events').insert([{
                client_id: client.id,
                decision_type: 'AUTO_SAFE_MODE',
                status_at_decision: 'low_balance',
                reason_codes: ['LOW_WALLET_BALANCE'],
                proposed_action_type: 'SAFE_MODE',
                proposed_daily_budget: result.budgetUsed,
                was_approved: true,
                decision_at: new Date().toISOString(),
                decision_outcome: 'AUTO_APPROVED',
                primary_reason_category: 'WALLET_PROTECTION',
                specific_reason_codes: ['BALANCE_BELOW_THRESHOLD'],
                next_action: 'MONITOR',
                features_at_decision: { wallet_balance: remainingBalance, threshold: lowBalanceThreshold },
                ai_provider: 'system',
              }]);

              results.push({
                clientId: client.id,
                clientName: client.name,
                action: `Safe Mode activated at $${result.budgetUsed}/day`,
                balance: remainingBalance,
              });

              await postAdsManagerWebhook({
                text: `💰 Low balance → Safe Mode: ${client.name}`,
                blocks: [
                  { type: 'header', text: { type: 'plain_text', text: '💰 Low Balance: Safe Mode Activated' } },
                  {
                    type: 'section',
                    text: {
                      type: 'mrkdwn',
                      text: `*Client:* ${client.name}\n*Balance:* $${remainingBalance.toFixed(2)} (threshold $${lowBalanceThreshold})\n*Budget set:* $${result.budgetUsed}/day`,
                    },
                  },
                ],
              });
            } else {
              results.push({
                clientId: client.id,
                clientName: client.name,
                action: 'Failed to enter Safe Mode - all budget levels rejected',
                balance: remainingBalance,
              });

              await postAdsManagerWebhook({
                text: `❌ Safe Mode failed: ${client.name}`,
                blocks: [
                  { type: 'header', text: { type: 'plain_text', text: '❌ Safe Mode Failed' } },
                  {
                    type: 'section',
                    text: {
                      type: 'mrkdwn',
                      text: `*Client:* ${client.name}\n*Balance:* $${remainingBalance.toFixed(2)}\n*Result:* All Safe Mode budget attempts were rejected by Google Ads.`,
                    },
                  },
                ],
              });
            }
          }
        }
      } else if (remainingBalance <= lowBalanceThreshold) {
        results.push({
          clientId: client.id,
          clientName: client.name,
          action: 'Low balance but no Google Ads campaign configured',
          balance: remainingBalance,
        });

        await postAdsManagerWebhook({
          text: `💰 Low balance (no campaign): ${client.name}`,
          blocks: [
            { type: 'header', text: { type: 'plain_text', text: '💰 Low Balance Warning' } },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Client:* ${client.name}\n*Balance:* $${remainingBalance.toFixed(2)} (threshold $${lowBalanceThreshold})\n*Note:* No Google Ads campaign configured.`,
              },
            },
          ],
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      checked: clientsToCheck.length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in check-low-balance:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});