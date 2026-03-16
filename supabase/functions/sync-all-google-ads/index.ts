import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notify } from '../_shared/notifications.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Accept optional daysBack from request body (default 30 for daily, 3 for hourly)
    let requestedDaysBack = 30;
    try {
      const body = await req.json();
      if (body?.daysBack) requestedDaysBack = body.daysBack;
    } catch { /* empty body is fine, use default */ }

    console.log(`Starting sync for all Google Ads clients (daysBack: ${requestedDaysBack})...`);

    // Get all active clients with Google Ads campaigns
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, google_campaign_id')
      .eq('status', 'active')
      .not('google_campaign_id', 'is', null);

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    console.log(`Found ${clients?.length || 0} clients with Google Ads campaigns`);

    const results: Array<{
      clientId: string;
      clientName: string;
      success: boolean;
      error?: string;
      daysUpdated?: number;
    }> = [];

    for (const client of clients || []) {
      try {
        console.log(`Syncing ${client.name} (campaign: ${client.google_campaign_id})...`);

        const syncResponse = await fetch(`${supabaseUrl}/functions/v1/sync-google-ads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ 
            clientId: client.id,
            daysBack: requestedDaysBack,
          }),
        });

        const syncResult = await syncResponse.json();

        if (syncResponse.ok) {
          results.push({
            clientId: client.id,
            clientName: client.name,
            success: true,
            daysUpdated: syncResult.daysUpdated || syncResult.recordsCreated,
          });
          console.log(`✓ ${client.name} synced successfully`);
        } else {
          results.push({
            clientId: client.id,
            clientName: client.name,
            success: false,
            error: syncResult.error || 'Unknown error',
          });
          console.log(`✗ ${client.name} sync failed: ${syncResult.error}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (syncError) {
        const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown error';
        results.push({
          clientId: client.id,
          clientName: client.name,
          success: false,
          error: errorMessage,
        });
        console.log(`✗ ${client.name} sync error: ${errorMessage}`);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`Sync complete: ${successCount} success, ${failedCount} failed`);

    // -- Failure tracking: reset on any success, increment on all-clients-failed --
    const FUNCTION_NAME = 'sync-all-google-ads';
    const allFailed = failedCount > 0 && successCount === 0;

    if (allFailed) {
      // Increment failure counter
      const { data: failState } = await supabase
        .from('sync_failure_log')
        .select('consecutive_failures')
        .eq('function_name', FUNCTION_NAME)
        .single();

      const newCount = (failState?.consecutive_failures ?? 0) + 1;
      await supabase.from('sync_failure_log').update({
        consecutive_failures: newCount,
        last_failure_at: new Date().toISOString(),
        last_error: results.filter(r => !r.success).map(r => r.error).join('; ').slice(0, 500),
      }).eq('function_name', FUNCTION_NAME);

      if (newCount >= 3) {
        await notify({
          supabase,
          severity: 'critical',
          title: 'Google Ads Sync Failing',
          message: `${newCount} consecutive full failures (${newCount * 5}+ minutes stale). Last errors: ${results.filter(r => !r.success).map(r => `${r.clientName}: ${r.error}`).join(', ').slice(0, 300)}`,
          alertType: 'sync_failure',
          metadata: { function_name: FUNCTION_NAME, consecutive_failures: newCount },
        });
      }
    } else {
      // Reset failure counter on any success
      await supabase.from('sync_failure_log').update({
        consecutive_failures: 0,
        last_success_at: new Date().toISOString(),
      }).eq('function_name', FUNCTION_NAME);
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalClients: clients?.length || 0,
          successful: successCount,
          failed: failedCount,
        },
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error syncing all Google Ads:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Track systemic failure
    try {
      const { data: failState } = await supabase
        .from('sync_failure_log')
        .select('consecutive_failures')
        .eq('function_name', 'sync-all-google-ads')
        .single();
      const newCount = (failState?.consecutive_failures ?? 0) + 1;
      await supabase.from('sync_failure_log').update({
        consecutive_failures: newCount,
        last_failure_at: new Date().toISOString(),
        last_error: errorMessage.slice(0, 500),
      }).eq('function_name', 'sync-all-google-ads');
      if (newCount >= 3) {
        await notify({
          supabase,
          severity: 'critical',
          title: 'Google Ads Sync Failing',
          message: `${newCount} consecutive failures. Error: ${errorMessage.slice(0, 300)}`,
          alertType: 'sync_failure',
        });
      }
    } catch { /* failure tracking itself should never break the response */ }

    return new Response(
      JSON.stringify({ error: 'Failed to sync all clients', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
