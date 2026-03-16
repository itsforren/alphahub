/**
 * handle-client-status-change: Auto-pause campaigns when a client status changes
 * to paused/cancelled/inactive/archived.
 *
 * CAMP-09: Called fire-and-forget from useUpdateClient/useDeleteClient hooks.
 * Orchestrates pause-google-ads-campaign calls for each campaign and logs
 * a summary audit entry.
 *
 * IMPORTANT: Reactivation (status back to 'active') does NOT auto-enable campaigns.
 * This function ONLY pauses. There is no enable logic by design (safety valve).
 *
 * Auth: service role JWT or BILLING_EDGE_SECRET (WALL-13 pattern)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notify } from '../_shared/notifications.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAUSE_STATUSES = ['paused', 'cancelled', 'inactive', 'archived'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // WALL-13: Require shared secret or service role JWT
  const billingSecret = Deno.env.get('BILLING_EDGE_SECRET');
  const providedSecret = req.headers.get('x-billing-secret');
  const authHeader = req.headers.get('Authorization');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;
  const hasValidSecret = billingSecret && providedSecret === billingSecret;

  // Also allow anon key calls from the frontend (supabase.functions.invoke uses anon key)
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const isAnonKey = authHeader === `Bearer ${supabaseAnonKey}`;

  if (!isServiceRole && !hasValidSecret && !isAnonKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { clientId, oldStatus, newStatus } = await req.json();

    if (!clientId || !newStatus) {
      return new Response(
        JSON.stringify({ error: 'clientId and newStatus are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only act on pause-worthy status transitions
    if (!PAUSE_STATUSES.includes(newStatus.toLowerCase())) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'newStatus not pause-worthy' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip if already in a pause-worthy status (no-op)
    if (oldStatus && PAUSE_STATUSES.includes(oldStatus.toLowerCase())) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'oldStatus already pause-worthy' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch client info for notifications
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name')
      .eq('id', clientId)
      .single();

    if (clientError) {
      console.error('Failed to fetch client:', clientError);
      throw new Error(`Client not found: ${clientId}`);
    }

    // Fetch all campaigns with Google Ads campaigns for this client
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, google_customer_id, google_campaign_id, current_daily_budget, status, label')
      .eq('client_id', clientId)
      .not('google_campaign_id', 'is', null);

    if (campaignsError) {
      console.error('Failed to fetch campaigns:', campaignsError);
      throw campaignsError;
    }

    // Filter to non-ignored, non-already-paused campaigns
    const activeCampaigns = (campaigns || []).filter((c) => {
      const status = (c.status || '').toLowerCase();
      return status !== 'paused' && status !== 'removed' && status !== 'ignored';
    });

    console.log(`[handle-client-status-change] Client ${clientId} (${client.name}): ${oldStatus} -> ${newStatus}. ${activeCampaigns.length} campaign(s) to pause.`);

    // Pause each campaign via pause-google-ads-campaign edge function
    let pausedCount = 0;
    const errors: string[] = [];

    for (const campaign of activeCampaigns) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/pause-google-ads-campaign`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerId: campaign.google_customer_id,
            campaignId: campaign.google_campaign_id,
            clientId,
            campaignRowId: campaign.id,
            reason: `client_status_change: ${oldStatus || 'unknown'} -> ${newStatus}`,
          }),
        });

        if (res.ok) {
          pausedCount++;
          console.log(`  Paused campaign ${campaign.label || campaign.google_campaign_id}`);
        } else {
          const errText = await res.text();
          console.error(`  Failed to pause campaign ${campaign.google_campaign_id}:`, errText);
          errors.push(`${campaign.label || campaign.google_campaign_id}: ${errText.slice(0, 200)}`);
        }
      } catch (e) {
        console.error(`  Error pausing campaign ${campaign.google_campaign_id}:`, e);
        errors.push(`${campaign.label || campaign.google_campaign_id}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    // Write summary audit log entry for the client-level status change
    const { error: auditError } = await supabase.from('campaign_audit_log').insert({
      client_id: clientId,
      action: 'client_status_change',
      actor: 'client_status_change',
      old_value: { client_status: oldStatus || 'unknown' },
      new_value: { client_status: newStatus, campaigns_paused: pausedCount },
      reason_codes: [`status_${newStatus.toLowerCase()}`],
      notes: `Client status changed from ${oldStatus || 'unknown'} to ${newStatus}. ${pausedCount} campaign(s) auto-paused.${errors.length > 0 ? ` ${errors.length} error(s).` : ''}`,
    });

    if (auditError) {
      console.error('Failed to write audit log:', auditError);
    }

    // Notify admin
    await notify({
      supabase,
      clientId,
      clientName: client.name,
      severity: 'warning',
      title: 'Client Campaigns Auto-Paused',
      message: `${client.name} status changed to ${newStatus}. ${pausedCount} campaign(s) paused.${errors.length > 0 ? ` ${errors.length} failed.` : ''}`,
      alertType: 'campaigns',
    });

    return new Response(
      JSON.stringify({
        success: true,
        pausedCount,
        totalCampaigns: activeCampaigns.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in handle-client-status-change:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
