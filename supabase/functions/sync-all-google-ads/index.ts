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
    
    return new Response(
      JSON.stringify({ error: 'Failed to sync all clients', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
