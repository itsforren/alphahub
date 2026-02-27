import { createClient } from "npm:@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bridge-key',
};

// The 18-step automation sequence
const AUTOMATION_STEPS = [
  { step: 1, name: 'lowercase_name', label: 'Lowercase Agent Name' },
  { step: 2, name: 'generate_slug', label: 'Generate URL Slug' },
  { step: 3, name: 'generate_bio', label: 'Generate AI Bio' },
  { step: 4, name: 'create_nfia', label: 'Create NFIA Page' },
  { step: 5, name: 'create_scheduler', label: 'Create Scheduler Page' },
  { step: 6, name: 'create_lander', label: 'Create Lander Page' },
  { step: 7, name: 'create_profile', label: 'Create Profile Page' },
  { step: 8, name: 'create_thankyou', label: 'Create Thank You Page' },
  { step: 9, name: 'create_subaccount', label: 'Create GHL Subaccount' },
  { step: 10, name: 'create_ghl_user', label: 'Activate SaaS' },
  { step: 11, name: 'install_snapshot', label: 'Verify Snapshot & Calendar ID' },
  { step: 12, name: 'provision_phone', label: 'Twilio Overrule & Buy Phone' },
  { step: 13, name: 'pull_calendar_id', label: 'Assign User to Calendars' },
  { step: 14, name: 'assign_calendars', label: 'Update Scheduler Embed' },
  { step: 15, name: 'update_scheduler_embed', label: 'Sync CRM Custom Fields' },
  { step: 16, name: 'sync_crm_custom_fields', label: 'Create Google Ads Campaign' },
  { step: 17, name: 'create_google_ads', label: 'Verify & Test Onboarding' },
  { step: 18, name: 'verify_onboarding', label: 'Mark Complete' },
];

// Allowed edge functions that can be proxied
const ALLOWED_FUNCTIONS = [
  'generate-agent-bio',
  'nfia-create-agent',
  'webflow-cms-create',
  'webflow-cms-update',
  'ghl-create-subaccount',
  'ghl-create-user',
  'crm-snapshot-status',
  'crm-discovery-calendar',
  'crm-location-token',
  'ghl-inject-twilio',
  'ghl-provision-phone',
  'ghl-assign-user-to-all-calendars',
  'ghl-sync-custom-fields',
  'create-google-ads-campaign',
  'verify-onboarding-live',
  'refresh-stable-headshot',
  'verify-onboarding',
  'send-test-lead',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const bridgeKey = Deno.env.get('ONBOARDING_BRIDGE_KEY');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Validate bridge key
    const providedKey = req.headers.get('x-bridge-key');
    if (!bridgeKey || !providedKey || providedKey !== bridgeKey) {
      console.error('Bridge auth failed. Key provided:', !!providedKey, 'Key configured:', !!bridgeKey);
      return new Response(JSON.stringify({ error: 'Unauthorized', code: 'AUTH_INVALID' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { action, client_id, agent_id } = body;

    console.log(`=== BRIDGE ACTION: ${action} ===`);
    console.log('client_id:', client_id);
    console.log('agent_id:', agent_id);

    // Resolve client_id if agent_id is provided instead
    let resolvedClientId = client_id;
    if (!resolvedClientId && agent_id) {
      const { data: clientByAgent } = await supabase
        .from('clients')
        .select('id')
        .eq('agent_id', agent_id)
        .single();
      if (clientByAgent) {
        resolvedClientId = clientByAgent.id;
        console.log('Resolved client_id from agent_id:', resolvedClientId);
      }
    }

    switch (action) {
      case 'get_client': {
        if (!resolvedClientId) {
          return new Response(JSON.stringify({ error: 'Missing client_id or agent_id' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: client, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', resolvedClientId)
          .single();

        if (error || !client) {
          return new Response(JSON.stringify({ error: 'Client not found', details: error?.message }), 
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ success: true, client }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'update_client': {
        if (!resolvedClientId) {
          return new Response(JSON.stringify({ error: 'Missing client_id or agent_id' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { fields } = body;
        if (!fields || typeof fields !== 'object') {
          return new Response(JSON.stringify({ error: 'Missing or invalid fields object' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Add updated_at
        const updateData = { ...fields, updated_at: new Date().toISOString() };
        
        const { data: updatedClient, error } = await supabase
          .from('clients')
          .update(updateData)
          .eq('id', resolvedClientId)
          .select()
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: 'Failed to update client', details: error.message }), 
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.log('Client updated, fields:', Object.keys(fields));
        return new Response(JSON.stringify({ success: true, client: updatedClient }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'get_run': {
        if (!resolvedClientId) {
          return new Response(JSON.stringify({ error: 'Missing client_id or agent_id' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: run, error } = await supabase
          .from('onboarding_automation_runs')
          .select('*')
          .eq('client_id', resolvedClientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          return new Response(JSON.stringify({ error: 'Failed to fetch run', details: error.message }), 
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ success: true, run, steps: AUTOMATION_STEPS }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'update_step': {
        if (!resolvedClientId) {
          return new Response(JSON.stringify({ error: 'Missing client_id or agent_id' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { step, success, data, error: stepError } = body;
        if (typeof step !== 'number' || typeof success !== 'boolean') {
          return new Response(JSON.stringify({ error: 'Missing step number or success boolean' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Get the latest run
        const { data: run } = await supabase
          .from('onboarding_automation_runs')
          .select('*')
          .eq('client_id', resolvedClientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!run) {
          return new Response(JSON.stringify({ error: 'No automation run found for client' }), 
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Update steps arrays
        const stepsCompleted = (run.steps_completed as number[]) || [];
        const stepsFailed = (run.steps_failed as number[]) || [];
        const stepData = (run.step_data as Record<string, unknown>) || {};

        if (success) {
          if (!stepsCompleted.includes(step)) stepsCompleted.push(step);
          const failedIdx = stepsFailed.indexOf(step);
          if (failedIdx >= 0) stepsFailed.splice(failedIdx, 1);
        } else {
          if (!stepsFailed.includes(step)) stepsFailed.push(step);
          const completedIdx = stepsCompleted.indexOf(step);
          if (completedIdx >= 0) stepsCompleted.splice(completedIdx, 1);
        }

        // Store step data
        stepData[`step_${step}`] = {
          success,
          data: data || null,
          error: stepError || null,
          timestamp: new Date().toISOString(),
        };

        const updatePayload: Record<string, unknown> = {
          steps_completed: stepsCompleted,
          steps_failed: stepsFailed,
          step_data: stepData,
          current_step: step,
          last_step_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Set status to running if still pending
        if (run.status === 'pending') {
          updatePayload.status = 'running';
          updatePayload.started_at = new Date().toISOString();
        }

        const { error: updateError } = await supabase
          .from('onboarding_automation_runs')
          .update(updatePayload)
          .eq('id', run.id);

        if (updateError) {
          return new Response(JSON.stringify({ error: 'Failed to update step', details: updateError.message }), 
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.log(`Step ${step} updated: success=${success}`);
        return new Response(JSON.stringify({ 
          success: true, 
          step, 
          step_success: success,
          steps_completed: stepsCompleted,
          steps_failed: stepsFailed,
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'complete_run': {
        if (!resolvedClientId) {
          return new Response(JSON.stringify({ error: 'Missing client_id or agent_id' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Update the automation run
        const { data: run } = await supabase
          .from('onboarding_automation_runs')
          .select('id')
          .eq('client_id', resolvedClientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (run) {
          await supabase
            .from('onboarding_automation_runs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', run.id);
        }

        // Update client status
        await supabase
          .from('clients')
          .update({
            onboarding_status: 'automation_complete',
            automation_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', resolvedClientId);

        console.log('Automation run completed for client:', resolvedClientId);
        return new Response(JSON.stringify({ success: true, message: 'Automation completed' }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'fail_run': {
        if (!resolvedClientId) {
          return new Response(JSON.stringify({ error: 'Missing client_id or agent_id' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { error: failError } = body;

        const { data: run } = await supabase
          .from('onboarding_automation_runs')
          .select('id, error_log')
          .eq('client_id', resolvedClientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (run) {
          const errorLog = (run.error_log as unknown[]) || [];
          errorLog.push({
            error: failError || 'Unknown error',
            timestamp: new Date().toISOString(),
          });

          await supabase
            .from('onboarding_automation_runs')
            .update({
              status: 'failed',
              error_log: errorLog,
              updated_at: new Date().toISOString(),
            })
            .eq('id', run.id);
        }

        // Update client status
        await supabase
          .from('clients')
          .update({
            onboarding_status: 'error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', resolvedClientId);

        console.log('Automation run failed for client:', resolvedClientId, 'Error:', failError);
        return new Response(JSON.stringify({ success: true, message: 'Automation marked as failed' }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'call_function': {
        const { function_name, payload } = body;
        
        if (!function_name || typeof function_name !== 'string') {
          return new Response(JSON.stringify({ error: 'Missing function_name' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Security: only allow whitelisted functions
        if (!ALLOWED_FUNCTIONS.includes(function_name)) {
          return new Response(JSON.stringify({ 
            error: 'Function not allowed', 
            allowed: ALLOWED_FUNCTIONS 
          }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.log(`Proxying call to: ${function_name}`);
        console.log('Payload:', JSON.stringify(payload || {}, null, 2));

        try {
          const functionResponse = await fetch(`${supabaseUrl}/functions/v1/${function_name}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify(payload || {}),
          });

          const responseText = await functionResponse.text();
          let responseData: unknown;
          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = { raw: responseText };
          }

          console.log(`Function ${function_name} response status:`, functionResponse.status);

          return new Response(JSON.stringify({ 
            success: functionResponse.ok, 
            status: functionResponse.status,
            data: responseData,
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (err) {
          console.error(`Function ${function_name} call error:`, err);
          return new Response(JSON.stringify({ 
            success: false, 
            error: err instanceof Error ? err.message : 'Unknown error',
          }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      case 'start_run': {
        if (!resolvedClientId) {
          return new Response(JSON.stringify({ error: 'Missing client_id or agent_id' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Update existing pending run to running, or create a new one
        const { data: existingRun } = await supabase
          .from('onboarding_automation_runs')
          .select('id, status')
          .eq('client_id', resolvedClientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingRun && existingRun.status === 'pending') {
          await supabase
            .from('onboarding_automation_runs')
            .update({
              status: 'running',
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingRun.id);
          
          console.log('Started existing pending run:', existingRun.id);
          return new Response(JSON.stringify({ success: true, run_id: existingRun.id, action: 'started' }), 
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else {
          // Create new run
          const { data: newRun, error } = await supabase
            .from('onboarding_automation_runs')
            .insert({
              client_id: resolvedClientId,
              status: 'running',
              current_step: 1,
              total_steps: AUTOMATION_STEPS.length,
              steps_completed: [],
              steps_failed: [],
              step_data: {},
              started_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (error) {
            return new Response(JSON.stringify({ error: 'Failed to create run', details: error.message }), 
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }

          console.log('Created new run:', newRun.id);
          return new Response(JSON.stringify({ success: true, run_id: newRun.id, action: 'created' }), 
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      default:
        return new Response(JSON.stringify({ 
          error: 'Unknown action', 
          available_actions: [
            'get_client',
            'update_client', 
            'get_run',
            'update_step',
            'start_run',
            'complete_run',
            'fail_run',
            'call_function',
          ] 
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (error: unknown) {
    console.error('Bridge error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
