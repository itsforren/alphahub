import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Detect status from GHL stage name keywords
function detectStatusFromStageName(stageName: string): string | null {
  const lower = stageName.toLowerCase();
  
  // Check in order of specificity (most specific first)
  if (lower.includes('issued') || lower.includes('paid') || lower.includes('policy issued')) {
    return 'issued paid';
  }
  if (lower.includes('approved') || lower.includes('approval')) {
    return 'approved';
  }
  if (lower.includes('submitted') || lower.includes('application') || lower.includes('app submitted')) {
    return 'submitted';
  }
  if (lower.includes('booked') || lower.includes('call scheduled') || lower.includes('appointment') || lower.includes('scheduled call')) {
    return 'booked call';
  }
  
  return null; // Unknown stage, don't update
}

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
        request_count: (keyData.request_count || 0) + 1,
      })
      .eq('id', keyData.id);

    // Parse the incoming payload
    const payload = await req.json();
    console.log('Received lead status update payload:', JSON.stringify(payload, null, 2));

    // Extract customData object if present (GHL sends data nested here)
    const customData = payload.customData || payload.custom_data || {};
    
    // Extract fields - PRIORITIZE customData over GHL's standard fields since GHL sends its own status like "open"
    const locationId = customData.location_id || customData.locationId || 
                       payload.location_id || payload.locationId || payload.Location_ID || payload['Location ID'] ||
                       payload.location?.id;
    const email = customData.email || customData.Email || payload.email || payload.Email;
    
    // NEW: Accept stage_name for smart detection
    const stageName = customData.stage_name || customData.stageName || 
                      payload.stage_name || payload.stageName || 
                      payload.pipeline_stage_name || payload.pipelineStageName ||
                      customData.pipeline_stage_name || '';
    
    // Status can be explicit OR detected from stage name
    let status = customData.status || customData.Status || payload.status || payload.Status;
    
    // If no explicit status but we have a stage name, try to detect it
    if (!status && stageName) {
      const detectedStatus = detectStatusFromStageName(stageName);
      if (detectedStatus) {
        console.log(`Detected status "${detectedStatus}" from stage name "${stageName}"`);
        status = detectedStatus;
      }
    }
    
    const targetPremium = parseFloat(
      payload.target_premium || payload.targetPremium || payload.Target_Premium || payload['Target Premium'] ||
      customData.target_premium || customData.targetPremium || customData.Target_Premium || '0'
    ) || null;
    
    console.log('Extracted fields:', { locationId, email, status, stageName, targetPremium });

    // Validate required fields
    if (!locationId) {
      console.error('Missing required field: location_id');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required field: location_id', 
          code: 'VALIDATION_ERROR',
          received_fields: Object.keys(payload)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email) {
      console.error('Missing required field: email');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required field: email', 
          code: 'VALIDATION_ERROR',
          received_fields: Object.keys(payload)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!status) {
      // If we have a stage name but couldn't detect status, log it for debugging
      if (stageName) {
        console.log(`Could not detect status from stage name: "${stageName}". Skipping update.`);
        return new Response(
          JSON.stringify({ 
            message: 'Stage name received but no matching status detected',
            code: 'NO_STATUS_MATCH',
            stage_name: stageName,
            hint: 'Stage must contain keywords like: booked, appointment, submitted, application, approved, issued, paid'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.error('Missing required field: status');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required field: status (or stage_name with detectable keywords)', 
          code: 'VALIDATION_ERROR',
          received_fields: Object.keys(payload)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize status value
    const normalizedStatus = status.toLowerCase().trim();
    const validStatuses = ['booked call', 'submitted', 'approved', 'issued paid'];
    
    if (!validStatuses.includes(normalizedStatus)) {
      console.error('Invalid status value:', status);
      return new Response(
        JSON.stringify({ 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 
          code: 'VALIDATION_ERROR',
          received_status: status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find client by subaccount_id (location_id) — filter out cancelled clients
    // to avoid .maybeSingle() error when duplicate records exist
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, agent_id, name')
      .eq('subaccount_id', locationId)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (clientError) {
      console.error('Error finding client:', clientError);
      return new Response(
        JSON.stringify({ 
          error: 'Database error while finding client', 
          code: 'DB_ERROR',
          details: clientError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!client) {
      console.error('No client found with location_id:', locationId);
      return new Response(
        JSON.stringify({ 
          error: 'No client found with this location_id', 
          code: 'NOT_FOUND',
          location_id: locationId
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!client.agent_id) {
      console.error('Client has no agent_id:', client.id);
      return new Response(
        JSON.stringify({ 
          error: 'Client has no agent_id configured', 
          code: 'CONFIG_ERROR',
          client_id: client.id
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found client: ${client.name} (agent_id: ${client.agent_id})`);

    // Find lead by agent_id and email
    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('agent_id', client.agent_id)
      .ilike('email', email)
      .order('created_at', { ascending: false });

    if (leadError) {
      console.error('Error finding lead:', leadError);
      return new Response(
        JSON.stringify({ 
          error: 'Database error while finding lead', 
          code: 'DB_ERROR',
          details: leadError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!leads || leads.length === 0) {
      console.error('No lead found with email:', email, 'for agent:', client.agent_id);
      return new Response(
        JSON.stringify({ 
          error: 'No lead found with this email for this agent', 
          code: 'NOT_FOUND',
          email: email,
          agent_id: client.agent_id
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the most recent lead if multiple exist
    const lead = leads[0];
    const oldStatus = lead.status;
    console.log(`Found lead: ${lead.first_name} ${lead.last_name} (id: ${lead.id}), current status: ${oldStatus}`);

    // Prevent status downgrade — never regress a lead to a lower stage
    const statusRank: Record<string, number> = {
      'new': 0,
      'booked call': 1,
      'submitted': 2,
      'approved': 3,
      'issued paid': 4,
    };
    const oldRank = statusRank[oldStatus?.toLowerCase()] ?? -1;
    const newRank = statusRank[normalizedStatus] ?? -1;

    if (newRank >= 0 && oldRank >= 0 && newRank < oldRank) {
      console.log(`BLOCKED downgrade: ${oldStatus} (rank ${oldRank}) -> ${normalizedStatus} (rank ${newRank}). Keeping current status.`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Status downgrade blocked — lead is already at a higher stage',
          lead_id: lead.id,
          current_status: oldStatus,
          attempted_status: normalizedStatus,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update object based on status
    const now = new Date().toISOString();
    const updateData: Record<string, any> = {
      status: normalizedStatus,
      updated_at: now,
    };

    // Update target_premium if provided
    if (targetPremium !== null && targetPremium > 0) {
      updateData.target_premium = targetPremium;
    }

    // Set status-specific fields
    switch (normalizedStatus) {
      case 'booked call':
        // Just update status
        break;
      case 'submitted':
        updateData.submitted_at = now;
        if (targetPremium !== null && targetPremium > 0) {
          updateData.submitted_premium = targetPremium;
        }
        break;
      case 'approved':
        updateData.approved_at = now;
        if (targetPremium !== null && targetPremium > 0) {
          updateData.approved_premium = targetPremium;
        }
        break;
      case 'issued paid':
        updateData.issued_at = now;
        if (targetPremium !== null && targetPremium > 0) {
          updateData.issued_premium = targetPremium;
        }
        break;
    }

    console.log('Updating lead with:', JSON.stringify(updateData, null, 2));

    // Update the lead
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', lead.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lead:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update lead', 
          code: 'UPDATE_ERROR',
          details: updateError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Lead updated successfully:', updatedLead.id);

    // Log status change to history table
    try {
      const { error: historyError } = await supabase
        .from('lead_status_history')
        .insert({
          lead_id: lead.id,
          old_status: oldStatus,
          new_status: normalizedStatus,
          source_stage: stageName || null,
          target_premium: targetPremium,
          changed_by: 'webhook',
        });

      if (historyError) {
        console.error('Error logging status history (non-fatal):', historyError);
      } else {
        console.log('Status change logged to history');
      }
    } catch (historyErr) {
      console.error('Error logging status history (non-fatal):', historyErr);
    }

    // Recalculate client metrics
    try {
      await recalculateClientMetrics(supabase, client.id, client.agent_id);
      console.log('Client metrics recalculated');
    } catch (metricsError) {
      console.error('Error recalculating metrics (non-fatal):', metricsError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead status updated successfully',
        lead_id: updatedLead.id,
        lead_name: `${updatedLead.first_name} ${updatedLead.last_name}`,
        old_status: oldStatus,
        new_status: normalizedStatus,
        detected_from_stage: stageName ? true : false,
        source_stage: stageName || null,
        target_premium: updateData.target_premium || null,
        client_name: client.name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error in lead-status-webhook:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        details: message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to recalculate client metrics after lead status update
async function recalculateClientMetrics(supabase: any, clientId: string, agentId: string) {
  // Fetch all leads for this agent
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .eq('agent_id', agentId);

  if (leadsError) {
    throw new Error(`Error fetching leads: ${leadsError.message}`);
  }

  const allLeads = leads || [];
  
  // Calculate metrics
  const totalLeads = allLeads.length;
  const bookedCalls = allLeads.filter((l: any) => 
    l.status === 'booked call' || l.status === 'submitted' || l.status === 'approved' || l.status === 'issued paid'
  ).length;
  const applications = allLeads.filter((l: any) => 
    l.status === 'submitted' || l.status === 'approved' || l.status === 'issued paid'
  ).length;
  const issuedPaidCount = allLeads.filter((l: any) => l.status === 'issued paid').length;
  const totalIssuedPremium = allLeads
    .filter((l: any) => l.status === 'issued paid' && l.issued_premium)
    .reduce((sum: number, l: any) => sum + (parseFloat(l.issued_premium) || 0), 0);

  // Fetch ad spend for CPL calculation
  const { data: adSpendData } = await supabase
    .from('ad_spend_daily')
    .select('spend')
    .eq('client_id', clientId);

  const totalAdSpend = (adSpendData || []).reduce(
    (sum: number, row: any) => sum + (parseFloat(row.spend) || 0), 
    0
  );

  // Calculate derived metrics
  const cpl = totalLeads > 0 ? totalAdSpend / totalLeads : 0;
  const cpa = applications > 0 ? totalAdSpend / applications : 0;
  const cpba = bookedCalls > 0 ? totalAdSpend / bookedCalls : 0;
  const conversionRate = totalLeads > 0 ? (issuedPaidCount / totalLeads) * 100 : 0;

  // Update client metrics (only columns that exist on the clients table)
  const { error: updateError } = await supabase
    .from('clients')
    .update({
      mtd_leads: totalLeads,
      booked_calls: bookedCalls,
      applications: applications,
      cpl: cpl,
      cpa: cpa,
      cpba: cpba,
      conversion_rate: conversionRate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId);

  if (updateError) {
    throw new Error(`Error updating client metrics: ${updateError.message}`);
  }
}
