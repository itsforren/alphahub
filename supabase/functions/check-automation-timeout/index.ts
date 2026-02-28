import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIMEOUT_MINUTES = 10;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Checking for stale automation onboardings...');

    // Calculate the timeout threshold (10 minutes ago)
    const timeoutThreshold = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000).toISOString();

    // Find all clients where:
    // - onboarding_status = 'in_progress'
    // - automation_started_at is older than 10 minutes
    // - automation_completed_at is NULL
    const { data: staleClients, error: findError } = await supabase
      .from('clients')
      .select('id, name, email, agent_id, automation_started_at')
      .eq('onboarding_status', 'in_progress')
      .lt('automation_started_at', timeoutThreshold)
      .is('automation_completed_at', null);

    if (findError) {
      console.error('Error finding stale clients:', findError);
      return new Response(
        JSON.stringify({ error: 'Failed to query stale clients', details: findError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!staleClients || staleClients.length === 0) {
      console.log('No stale automation onboardings found');
      return new Response(
        JSON.stringify({ success: true, message: 'No stale automations found', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${staleClients.length} stale automation onboardings`);

    // Get the error notification email from settings
    const { data: emailSetting } = await supabase
      .from('onboarding_settings')
      .select('setting_value')
      .eq('setting_key', 'automation_error_email')
      .single();

    const notificationEmail = emailSetting?.setting_value;
    
    if (!notificationEmail) {
      console.warn('No automation_error_email configured in onboarding_settings');
    }

    // Process each stale client
    const results = [];
    for (const client of staleClients) {
      console.log(`Processing stale client: ${client.id} (${client.agent_id})`);

      // Update status to error
      const { error: updateError } = await supabase
        .from('clients')
        .update({ onboarding_status: 'error' })
        .eq('id', client.id);

      if (updateError) {
        console.error(`Error updating client ${client.id} to error status:`, updateError);
        results.push({ client_id: client.id, success: false, error: updateError.message });
        continue;
      }

      // Calculate how long it was stuck
      const startTime = new Date(client.automation_started_at);
      const stuckMinutes = Math.floor((Date.now() - startTime.getTime()) / 1000 / 60);

      // Send email notification if configured
      if (notificationEmail && resendApiKey) {
        try {
          const resend = new Resend(resendApiKey);
          
          await resend.emails.send({
            from: 'Alpha Agent <notifications@notify.welthra.com>',
            to: [notificationEmail],
            subject: `⚠️ Automation Failed: ${client.name} (${client.agent_id})`,
            html: `
              <h2>Automation Timeout Alert</h2>
              <p>An agent onboarding automation has exceeded the ${TIMEOUT_MINUTES} minute timeout and has been marked as failed.</p>
              
              <h3>Agent Details:</h3>
              <ul>
                <li><strong>Name:</strong> ${client.name}</li>
                <li><strong>Email:</strong> ${client.email}</li>
                <li><strong>Agent ID:</strong> ${client.agent_id}</li>
                <li><strong>Started At:</strong> ${startTime.toISOString()}</li>
                <li><strong>Time Stuck:</strong> ${stuckMinutes} minutes</li>
              </ul>
              
              <h3>Action Required:</h3>
              <p>Please check the Zapier flow to identify and resolve the issue. The agent's onboarding status has been set to "Error".</p>
              
              <p>After resolving the issue, you can manually update the agent's status or trigger the automation again.</p>
            `,
          });

          console.log(`Email notification sent to ${notificationEmail} for client ${client.id}`);
          results.push({ 
            client_id: client.id, 
            agent_id: client.agent_id,
            success: true, 
            email_sent: true,
            stuck_minutes: stuckMinutes 
          });
        } catch (emailError) {
          console.error(`Error sending email for client ${client.id}:`, emailError);
          results.push({ 
            client_id: client.id, 
            agent_id: client.agent_id,
            success: true, 
            email_sent: false, 
            email_error: emailError instanceof Error ? emailError.message : 'Unknown error',
            stuck_minutes: stuckMinutes 
          });
        }
      } else {
        console.log(`Skipping email - no email configured or RESEND_API_KEY not set`);
        results.push({ 
          client_id: client.id, 
          agent_id: client.agent_id,
          success: true, 
          email_sent: false, 
          reason: !notificationEmail ? 'No email configured' : 'RESEND_API_KEY not set',
          stuck_minutes: stuckMinutes 
        });
      }
    }

    console.log('Automation timeout check completed:', results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${staleClients.length} stale automations`,
        processed: staleClients.length,
        timeout_minutes: TIMEOUT_MINUTES,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        details: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
