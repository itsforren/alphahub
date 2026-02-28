import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRY_ATTEMPTS = 3;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Starting retry for failed lead deliveries...');

    // Fetch leads that need retry
    const { data: failedLeads, error: fetchError } = await supabase
      .from('leads')
      .select('id, agent_id, lead_id, delivery_attempts, first_name, last_name')
      .in('delivery_status', ['failed', 'pending'])
      .lt('delivery_attempts', MAX_RETRY_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(50); // Process in batches

    if (fetchError) {
      console.error('Error fetching failed leads:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch leads', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!failedLeads || failedLeads.length === 0) {
      console.log('No failed leads to retry');
      return new Response(
        JSON.stringify({ success: true, message: 'No leads to retry', retried: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${failedLeads.length} leads to retry`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each lead
    for (const lead of failedLeads) {
      try {
        // Mark as retrying
        await supabase
          .from('leads')
          .update({ delivery_status: 'retrying' })
          .eq('id', lead.id);

        // Call inject-lead-to-ghl function
        const response = await fetch(`${supabaseUrl}/functions/v1/inject-lead-to-ghl`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ leadId: lead.id }),
        });

        if (response.ok) {
          console.log(`Successfully retried lead ${lead.id}`);
          results.success++;
        } else {
          const error = await response.text();
          console.error(`Failed to retry lead ${lead.id}:`, error);
          results.failed++;
          results.errors.push(`Lead ${lead.lead_id}: ${error}`);

          // Check if we've exceeded max attempts
          const newAttemptCount = (lead.delivery_attempts || 0) + 1;
          if (newAttemptCount >= MAX_RETRY_ATTEMPTS) {
            await supabase
              .from('leads')
              .update({ 
                delivery_status: 'failed_permanent',
                delivery_error: `Max retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded`,
              })
              .eq('id', lead.id);
          }
        }
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing lead ${lead.id}:`, errorMsg);
        results.failed++;
        results.errors.push(`Lead ${lead.lead_id}: ${errorMsg}`);
      }
    }

    console.log(`Retry complete: ${results.success} success, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${failedLeads.length} leads`,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error in retry function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: 'Internal error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
