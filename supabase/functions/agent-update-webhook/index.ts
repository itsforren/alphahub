import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      console.error('Missing API key');
      return new Response(
        JSON.stringify({ error: 'Missing API key', code: 'AUTH_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify API key exists and is active
    const { data: keyData, error: keyError } = await supabase
      .from('webhook_api_keys')
      .select('id, name, is_active, request_count')
      .eq('api_key', apiKey)
      .single();

    if (keyError || !keyData) {
      console.error('Invalid API key:', keyError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid API key', code: 'AUTH_INVALID' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!keyData.is_active) {
      console.error('API key is inactive:', keyData.name);
      return new Response(
        JSON.stringify({ error: 'API key is inactive', code: 'AUTH_INACTIVE' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used_at and request_count
    await supabase
      .from('webhook_api_keys')
      .update({ 
        last_used_at: new Date().toISOString(),
        request_count: (keyData.request_count || 0) + 1
      })
      .eq('id', keyData.id);

    // Parse the incoming payload
    const payload = await req.json();
    console.log('Received agent-update webhook payload:', JSON.stringify(payload, null, 2));

    // Get agent_id from payload - this is REQUIRED
    const agentId = payload.agent_id || payload.AgentId || payload.agentId;
    
    if (!agentId) {
      console.error('Missing required field: agent_id');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required field: agent_id', 
          code: 'VALIDATION_ERROR',
          received_fields: Object.keys(payload)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the client by agent_id - include fields needed for campaign creation
    const { data: existingClient, error: findError } = await supabase
      .from('clients')
      .select('id, name, email, agent_id, automation_started_at, onboarding_status, google_campaign_id, states, ad_spend_budget, lander_link')
      .eq('agent_id', agentId)
      .maybeSingle();

    if (findError) {
      console.error('Error finding client by agent_id:', findError);
      return new Response(
        JSON.stringify({ 
          error: 'Error finding client', 
          code: 'FIND_ERROR',
          details: findError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!existingClient) {
      console.error('No client found with agent_id:', agentId);
      return new Response(
        JSON.stringify({ 
          error: 'No client found with this agent_id', 
          code: 'NOT_FOUND',
          agent_id: agentId
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Allow updates even if already completed (for agreement_link, etc.)
    if (existingClient.onboarding_status === 'error') {
      console.log('Client automation was in error state, proceeding with update:', existingClient.id);
    }

    // Helper function to ensure URLs have https:// prefix
    const ensureHttps = (url: string | null | undefined): string | null => {
      if (!url) return null;
      const trimmed = url.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }
      return `https://${trimmed}`;
    };

    // Build update data for asset links
    const now = new Date();
    const updateData: Record<string, any> = {};

    // Only update fields that are provided in the payload - normalize URLs with https://
    if (payload.nfia_link) updateData.nfia_link = ensureHttps(payload.nfia_link);
    if (payload.lander_link) updateData.lander_link = ensureHttps(payload.lander_link);
    if (payload.scheduler_link) updateData.scheduler_link = ensureHttps(payload.scheduler_link);
    if (payload.thankyou_link) updateData.thankyou_link = ensureHttps(payload.thankyou_link);
    if (payload.ads_link) updateData.ads_link = ensureHttps(payload.ads_link);
    if (payload.agreement_link) updateData.agreement_link = ensureHttps(payload.agreement_link);
    if (payload.tfwp_profile_link) updateData.tfwp_profile_link = ensureHttps(payload.tfwp_profile_link);
    if (payload.discovery_calendar_id) updateData.discovery_calendar_id = payload.discovery_calendar_id;
    
    // Store ghl_user_id if provided
    if (payload.ghl_user_id) {
      updateData.ghl_user_id = payload.ghl_user_id;
    }
    
    // Auto-generate crm_link from subaccount_id - use Alpha Agent CRM domain
    if (payload.subaccount_id) {
      updateData.subaccount_id = payload.subaccount_id;
      updateData.crm_link = `https://app.alphaagentcrm.com/v2/location/${payload.subaccount_id}`;
    }

    // Determine if this is the second webhook call (has asset links that indicate onboarding is progressing)
    const hasSubaccount = payload.subaccount_id || existingClient.lander_link;
    const isInitialOnboarding = payload.lander_link || payload.nfia_link;

    // STEP 1: Save client data FIRST before campaign creation
    // This ensures lander_link is in the database if campaign function needs to fall back to it
    if (Object.keys(updateData).length > 0) {
      console.log('Saving client data first:', existingClient.id, 'with fields:', Object.keys(updateData));
      
      const { error: preSaveError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', existingClient.id);

      if (preSaveError) {
        console.error('Error pre-saving client data:', preSaveError);
        // Continue anyway - we'll try to save again at the end
      }
    }

    // STEP 2: Auto-create Google Ads campaign if needed
    let campaignCreated = false;
    let campaignError: string | null = null;
    
    // Only create campaign if:
    // 1. No google_campaign_id exists yet
    // 2. We have a subaccount_id (either from payload or existing)
    // 3. This is the initial onboarding (not just an agreement_link update)
    if (!existingClient.google_campaign_id && hasSubaccount && isInitialOnboarding) {
      console.log('No Google campaign exists, attempting to create one...');
      
      try {
        // Use lander_link from payload (preferred) or existing client
        const landerLink = payload.lander_link || existingClient.lander_link;
        // Use ad_spend_budget as monthly budget - function will divide by 30
        const monthlyBudget = existingClient.ad_spend_budget || 0;
        // Get states from existing client record
        const states = existingClient.states;
        
        console.log('Campaign creation params:', {
          clientId: existingClient.id,
          states,
          budget: monthlyBudget,
          agentId: agentId,
          agentName: existingClient.name,
          landingPage: landerLink,
        });
        
        // Call create-google-ads-campaign function
        const campaignResponse = await fetch(
          `${supabaseUrl}/functions/v1/create-google-ads-campaign`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              clientId: existingClient.id,
              states: states,
              budget: monthlyBudget, // Monthly budget - function divides by 30
              agentId: existingClient.agent_id,
              agentName: existingClient.name,
              landingPage: landerLink, // Pass directly - function handles priority
            }),
          }
        );

        const campaignResult = await campaignResponse.json();
        console.log('Campaign creation response:', JSON.stringify(campaignResult, null, 2));

        if (campaignResponse.ok && campaignResult.success) {
          updateData.google_campaign_id = campaignResult.campaignId;
          updateData.ads_link = campaignResult.adsLink || `https://ads.google.com/aw/campaigns?campaignId=${campaignResult.campaignId}`;
          campaignCreated = true;
          console.log('Google Ads campaign created successfully:', campaignResult.campaignId);
        } else {
          campaignError = campaignResult.error || 'Unknown campaign creation error';
          console.error('Campaign creation failed:', campaignError);
        }
      } catch (err) {
        campaignError = err instanceof Error ? err.message : 'Campaign creation exception';
        console.error('Campaign creation exception:', err);
      }
    } else if (existingClient.google_campaign_id) {
      console.log('Google campaign already exists, skipping creation:', existingClient.google_campaign_id);
    }

    // STEP 3: Auto-setup calendars if ghl_user_id and subaccount_id are provided
    let calendarSetupResult: { success: boolean; updated?: number; skipped?: number; error?: string } | null = null;
    
    const ghlUserId = payload.ghl_user_id;
    const subaccountId = payload.subaccount_id || updateData.subaccount_id;
    
    if (ghlUserId && subaccountId && isInitialOnboarding) {
      console.log('=== CALENDAR SETUP START ===');
      console.log('ghl_user_id:', ghlUserId);
      console.log('subaccount_id:', subaccountId);
      console.log('agent_name:', existingClient.name);
      
      try {
        // Fetch company_id from ghl_oauth_tokens
        const { data: oauthData, error: oauthError } = await supabase
          .from('ghl_oauth_tokens')
          .select('company_id')
          .not('company_id', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
        if (oauthError || !oauthData?.company_id) {
          console.error('Failed to get GHL company_id for calendar setup:', oauthError?.message || 'No company_id found');
          calendarSetupResult = { success: false, error: 'No GHL OAuth connection found' };
        } else {
          const companyId = oauthData.company_id;
          console.log('Found company_id:', companyId);
          
          // Call ghl-assign-user-to-all-calendars function
          const calendarResponse = await fetch(
            `${supabaseUrl}/functions/v1/ghl-assign-user-to-all-calendars`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                companyId: companyId,
                locationId: subaccountId,
                userId: ghlUserId,
                agentName: existingClient.name,
                activateCalendars: true,
              }),
            }
          );

          const calendarResult = await calendarResponse.json();
          console.log('Calendar setup response:', JSON.stringify(calendarResult, null, 2));

          if (calendarResponse.ok && calendarResult.success) {
            calendarSetupResult = {
              success: true,
              updated: calendarResult.updated_count || calendarResult.updatedCalendars?.length || 0,
              skipped: calendarResult.skipped_count || calendarResult.skippedCalendars?.length || 0,
            };
            console.log('Calendar setup completed successfully:', calendarSetupResult);
          } else {
            calendarSetupResult = { 
              success: false, 
              error: calendarResult.error || 'Unknown calendar setup error' 
            };
            console.error('Calendar setup failed:', calendarSetupResult.error);
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Calendar setup exception';
        calendarSetupResult = { success: false, error: errMsg };
        console.error('Calendar setup exception:', err);
      }
      
      console.log('=== CALENDAR SETUP END ===');
    } else if (!ghlUserId || !subaccountId) {
      console.log('Skipping calendar setup - missing ghl_user_id or subaccount_id');
    }

    // STEP 4: Set onboarding status to automation_complete if this is the initial onboarding call
    // This means AI onboarding is done, but human admin still needs to verify and complete manually
    if (isInitialOnboarding && existingClient.onboarding_status === 'in_progress') {
      updateData.automation_completed_at = now.toISOString();
      updateData.onboarding_status = 'automation_complete';
    }

    console.log('Updating client:', existingClient.id, 'with data:', updateData);

    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', existingClient.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating client:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update client', 
          code: 'UPDATE_ERROR',
          details: updateError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate automation duration
    let durationMs = 0;
    let durationFormatted = 'N/A';
    
    if (existingClient.automation_started_at) {
      const startTime = new Date(existingClient.automation_started_at);
      durationMs = now.getTime() - startTime.getTime();
      const durationSeconds = Math.floor(durationMs / 1000);
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;
      durationFormatted = `${minutes}m ${seconds}s`;
    }

    console.log('Client updated successfully:', updatedClient.id, 'Duration:', durationFormatted);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: campaignCreated 
          ? 'Agent profile updated with new Google Ads campaign' 
          : 'Agent profile updated',
        client_id: updatedClient.id,
        agent_id: updatedClient.agent_id,
        automation_started_at: existingClient.automation_started_at,
        automation_completed_at: updatedClient.automation_completed_at,
        duration_ms: durationMs,
        duration_formatted: durationFormatted,
        onboarding_status: updatedClient.onboarding_status,
        campaign_created: campaignCreated,
        campaign_id: updatedClient.google_campaign_id || null,
        campaign_error: campaignError,
        calendar_setup: calendarSetupResult,
        updated_fields: Object.keys(updateData).filter(k => k !== 'automation_completed_at' && k !== 'onboarding_status')
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
