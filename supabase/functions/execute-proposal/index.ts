import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// GOOGLE ADS API
// ============================================================================

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
    throw new Error(`Failed to get access token: ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function updateGoogleAdsBudget(
  accessToken: string,
  customerId: string,
  campaignId: string,
  newDailyBudget: number
): Promise<{ success: boolean; budgetUsed: number | null; error?: string }> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
  const cleanCustomerId = customerId.replace(/-/g, '');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

  // Safe mode fallback ladder
  const fallbackBudgets = newDailyBudget <= 0.01 ? [0.01, 0.10, 1.00] : [newDailyBudget];

  // Get budget resource name
  const searchQuery = `
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
    body: JSON.stringify({ query: searchQuery }),
  });

  if (!searchResponse.ok) {
    const raw = await searchResponse.text();
    return { success: false, budgetUsed: null, error: `Failed to get budget resource: ${raw}` };
  }

  const searchData = await searchResponse.json();
  const budgetResourceName = searchData?.[0]?.results?.[0]?.campaign?.campaignBudget;

  if (!budgetResourceName) {
    return { success: false, budgetUsed: null, error: 'Could not find campaign budget resource' };
  }

  // Try each budget in fallback ladder
  for (const budget of fallbackBudgets) {
    const budgetAmountMicros = Math.round(budget * 1_000_000);

    const mutateResponse = await fetch(
      `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/campaignBudgets:mutate`,
      {
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
      }
    );

    if (mutateResponse.ok) {
      console.log(`Successfully updated budget to $${budget}`);
      return { success: true, budgetUsed: budget };
    }

    console.log(`Budget $${budget} rejected, trying next fallback`);
  }

  return { success: false, budgetUsed: null, error: 'All budget values rejected by Google Ads' };
}

// ============================================================================
// SLACK NOTIFICATION
// ============================================================================

async function postToSlack(webhookUrl: string, message: string): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  } catch (error) {
    console.error('Failed to post to Slack:', error);
  }
}

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

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      proposalId, 
      action, // 'approve' | 'deny'
      userId,
      // Denial flow fields
      decisionOutcome,
      primaryReasonCategory,
      specificReasonCodes,
      nextAction,
      confidenceOverride,
      userNote,
      overrideBudget,
    } = await req.json();

    if (!proposalId) {
      throw new Error('proposalId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get proposal details
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        *,
        campaigns!inner(google_customer_id, google_campaign_id, current_daily_budget),
        clients!inner(id, name, target_daily_spend)
      `)
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) {
      throw new Error(`Proposal not found: ${proposalError?.message}`);
    }

    if (proposal.status !== 'pending') {
      throw new Error(`Proposal already ${proposal.status}`);
    }

    // Get settings for slack webhook
    const { data: settings } = await supabase
      .from('campaign_settings')
      .select('slack_webhook_url, policy_version')
      .is('campaign_id', null)
      .single();

    const slackWebhook = settings?.slack_webhook_url;
    const policyVersion = settings?.policy_version || 'v1.0';

    const customerId = proposal.campaigns.google_customer_id;
    const campaignId = proposal.campaigns.google_campaign_id;
    const currentBudget = proposal.current_daily_budget;
    const clientName = proposal.clients.name;

    if (action === 'deny') {
      // Handle denial
      const finalBudget = overrideBudget || currentBudget;
      const wasOverride = overrideBudget && overrideBudget !== currentBudget;

      // Update proposal
      await supabase
        .from('proposals')
        .update({
          status: wasOverride ? 'approved' : 'denied',
          decision_outcome: decisionOutcome,
          primary_reason_category: primaryReasonCategory,
          specific_reason_codes: specificReasonCodes,
          next_action: nextAction,
          confidence_override: confidenceOverride,
          user_note: userNote,
          user_override_budget: overrideBudget,
          user_decline_reason: userNote,
          approved_by: userId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId);

      // If user provided override budget, execute it
      if (wasOverride) {
        const accessToken = await getAccessToken();
        const result = await updateGoogleAdsBudget(accessToken, customerId, campaignId, overrideBudget);

        if (result.success) {
          // Update campaign and client
          await supabase
            .from('campaigns')
            .update({
              current_daily_budget: result.budgetUsed,
              last_budget_change_at: new Date().toISOString(),
              last_budget_change_by: 'USER',
            })
            .eq('id', proposal.campaign_id);

          await supabase
            .from('clients')
            .update({ target_daily_spend: result.budgetUsed })
            .eq('id', proposal.client_id);

          // Update proposal as executed
          await supabase
            .from('proposals')
            .update({
              status: 'executed',
              executed_at: new Date().toISOString(),
              execution_result: { budgetUsed: result.budgetUsed, success: true },
            })
            .eq('id', proposalId);

          // Log audit
          await supabase.from('campaign_audit_log').insert({
            campaign_id: proposal.campaign_id,
            client_id: proposal.client_id,
            proposal_id: proposalId,
            actor: 'USER',
            actor_user_id: userId,
            action: 'BUDGET_OVERRIDE_EXECUTED',
            old_value: { budget: currentBudget },
            new_value: { budget: result.budgetUsed },
            reason_codes: proposal.reason_codes,
            notes: `User overrode proposed $${proposal.proposed_daily_budget} with $${overrideBudget}`,
          });
        }
      }

      // Create decision event
      await supabase.from('decision_events').insert({
        campaign_id: proposal.campaign_id,
        client_id: proposal.client_id,
        proposal_id: proposalId,
        policy_version: policyVersion,
        ai_provider: proposal.ai_provider,
        decision_type: wasOverride ? 'MANUAL_OVERRIDE' : 'PROPOSAL',
        status_at_decision: proposal.status,
        reason_codes: proposal.reason_codes,
        proposed_action_type: proposal.proposed_action_type,
        proposed_daily_budget: proposal.proposed_daily_budget,
        proposed_delta_pct: proposal.delta_pct,
        proposed_pacing_info: proposal.pacing_info,
        was_approved: wasOverride,
        decision_at: new Date().toISOString(),
        final_action_type: wasOverride ? 'SET_BUDGET' : null,
        final_daily_budget: wasOverride ? overrideBudget : null,
        decision_outcome: decisionOutcome,
        primary_reason_category: primaryReasonCategory,
        specific_reason_codes: specificReasonCodes,
        next_action: nextAction,
        confidence_override: confidenceOverride,
        user_note: userNote,
        recommendation_confidence: proposal.recommendation_confidence,
        features_at_decision: proposal.pacing_info || {},
      });

      // Log audit for denial
      if (!wasOverride) {
        await supabase.from('campaign_audit_log').insert({
          campaign_id: proposal.campaign_id,
          client_id: proposal.client_id,
          proposal_id: proposalId,
          actor: 'USER',
          actor_user_id: userId,
          action: 'PROPOSAL_DENIED',
          reason_codes: specificReasonCodes || [],
          notes: `${primaryReasonCategory}: ${userNote || 'No reason provided'}`,
        });
      }

      await postAdsManagerWebhook({
        text: `⛔ Proposal denied: ${clientName}`,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: wasOverride ? '⚠️ Proposal Denied (Override Executed)' : '⛔ Proposal Denied' } },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Client:* ${clientName}\n*Proposal:* $${Number(currentBudget).toFixed(2)} → $${Number(proposal.proposed_daily_budget || 0).toFixed(2)}\n*Result:* ${wasOverride ? `Override to $${Number(overrideBudget || 0).toFixed(2)}` : 'Denied (no change)'}\n*Reason:* ${primaryReasonCategory || '—'}\n*Note:* ${userNote || '—'}`,
            },
          },
        ],
      });

      return new Response(JSON.stringify({
        success: true,
        action: wasOverride ? 'override_executed' : 'denied',
        budgetUsed: wasOverride ? overrideBudget : null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'approve') {
      // Execute the proposal
      const targetBudget = proposal.proposed_daily_budget;
      const accessToken = await getAccessToken();
      const result = await updateGoogleAdsBudget(accessToken, customerId, campaignId, targetBudget);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update Google Ads budget');
      }

      // Update campaign
      await supabase
        .from('campaigns')
        .update({
          current_daily_budget: result.budgetUsed,
          last_budget_change_at: new Date().toISOString(),
          last_budget_change_by: 'USER',
          safe_mode: proposal.proposed_action_type === 'SAFE_MODE',
          safe_mode_triggered_at: proposal.proposed_action_type === 'SAFE_MODE' ? new Date().toISOString() : null,
        })
        .eq('id', proposal.campaign_id);

      // Update client
      await supabase
        .from('clients')
        .update({ target_daily_spend: result.budgetUsed })
        .eq('id', proposal.client_id);

      // Update proposal
      await supabase
        .from('proposals')
        .update({
          status: 'executed',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          executed_at: new Date().toISOString(),
          execution_result: { budgetUsed: result.budgetUsed, success: true },
          decision_outcome: 'APPROVE_AS_IS',
        })
        .eq('id', proposalId);

      // Log audit
      await supabase.from('campaign_audit_log').insert({
        campaign_id: proposal.campaign_id,
        client_id: proposal.client_id,
        proposal_id: proposalId,
        actor: 'USER',
        actor_user_id: userId,
        action: 'PROPOSAL_APPROVED_EXECUTED',
        old_value: { budget: currentBudget },
        new_value: { budget: result.budgetUsed },
        reason_codes: proposal.reason_codes,
      });

      // Create decision event
      await supabase.from('decision_events').insert({
        campaign_id: proposal.campaign_id,
        client_id: proposal.client_id,
        proposal_id: proposalId,
        policy_version: policyVersion,
        ai_provider: proposal.ai_provider,
        decision_type: 'PROPOSAL',
        status_at_decision: proposal.status,
        reason_codes: proposal.reason_codes,
        proposed_action_type: proposal.proposed_action_type,
        proposed_daily_budget: proposal.proposed_daily_budget,
        proposed_delta_pct: proposal.delta_pct,
        proposed_pacing_info: proposal.pacing_info,
        was_approved: true,
        decision_at: new Date().toISOString(),
        final_action_type: proposal.proposed_action_type,
        final_daily_budget: result.budgetUsed,
        decision_outcome: 'APPROVE_AS_IS',
        recommendation_confidence: proposal.recommendation_confidence,
        features_at_decision: proposal.pacing_info || {},
      });

      // Build report message
      const deltaStr = proposal.delta_pct > 0 ? `+${proposal.delta_pct.toFixed(1)}%` : `${proposal.delta_pct.toFixed(1)}%`;
      const reportMessage = `📊 **Campaign Change Executed**

**Client:** ${clientName}
**Action:** ${proposal.proposed_action_type}
**Budget:** $${currentBudget.toFixed(2)} → $${result.budgetUsed?.toFixed(2)} (${deltaStr})
**Status:** ${proposal.status}
**Reason Codes:** ${proposal.reason_codes?.join(', ') || 'None'}
**Confidence:** ${(proposal.recommendation_confidence * 100).toFixed(0)}%
**AI Summary:** ${proposal.ai_summary}`;

      // Post to team chat
      try {
        await supabase.from('admin_channel_messages').insert({
          channel_id: '00000000-0000-0000-0000-000000000001',
          sender_id: '00000000-0000-0000-0000-000000000000',
          message: reportMessage,
        });
      } catch (chatError) {
        console.error('Failed to post to team chat:', chatError);
      }

      // Post to Slack if configured
      if (slackWebhook) {
        await postToSlack(slackWebhook, reportMessage.replace(/\*\*/g, '*'));
      }

      await postAdsManagerWebhook({
        text: `✅ Executed: ${clientName}`,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '✅ Proposal Approved & Executed' } },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Client:* ${clientName}\n*Action:* ${proposal.proposed_action_type}\n*Budget:* $${Number(currentBudget).toFixed(2)} → $${Number(result.budgetUsed || 0).toFixed(2)}\n*Reasons:* ${proposal.reason_codes?.join(', ') || '—'}\n*Summary:* ${proposal.ai_summary || '—'}`,
            },
          },
        ],
      });

      return new Response(JSON.stringify({
        success: true,
        action: 'executed',
        budgetUsed: result.budgetUsed,
        clientName,
        oldBudget: currentBudget,
        newBudget: result.budgetUsed,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      throw new Error('Invalid action. Use "approve" or "deny"');
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in execute-proposal:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
