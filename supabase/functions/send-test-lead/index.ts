import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sample test data that mirrors real lead fields
const TEST_LEAD_DATA = {
  age: '35-44',
  employment: 'Employed Full-Time',
  interest: 'Life Insurance',
  savings: '$25,000 - $50,000',
  investments: '$50,000 - $100,000',
  timezone: 'America/New_York',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { agentId, clientId } = body;

    if (!agentId && !clientId) {
      return new Response(
        JSON.stringify({ error: 'Either agentId or clientId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the client info
    let client;
    if (clientId) {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, agent_id, subaccount_id, ghl_user_id, crm_delivery_enabled, use_own_crm, external_webhook_url')
        .eq('id', clientId)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Client not found', details: error?.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      client = data;
    } else {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, agent_id, subaccount_id, ghl_user_id, crm_delivery_enabled, use_own_crm, external_webhook_url')
        .eq('agent_id', agentId)
        .single();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Client not found for agent_id', details: error?.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      client = data;
    }

    console.log(`Sending test lead to ${client.name} (agent_id: ${client.agent_id})`);

    // Check router readiness
    const issues: string[] = [];
    if (!client.agent_id) issues.push('Missing agent_id');
    if (!client.subaccount_id) issues.push('Missing subaccount_id');
    if (!client.ghl_user_id) issues.push('Missing ghl_user_id (leads won\'t be auto-assigned)');
    if (client.crm_delivery_enabled === false) issues.push('CRM delivery is disabled');

    // Create test lead with ALL fields populated
    const testLeadId = `TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const timestamp = new Date().toISOString();
    
    const testLead = {
      lead_id: testLeadId,
      agent_id: client.agent_id,
      first_name: 'Test',
      last_name: 'Lead',
      email: `test+${Date.now()}@alphahub.test`,
      phone: '+15555550100',
      state: 'TX',
      // Include all qualification fields
      age: TEST_LEAD_DATA.age,
      employment: TEST_LEAD_DATA.employment,
      interest: TEST_LEAD_DATA.interest,
      savings: TEST_LEAD_DATA.savings,
      investments: TEST_LEAD_DATA.investments,
      timezone: TEST_LEAD_DATA.timezone,
      // Attribution fields
      lead_source: 'AlphaHub Test',
      utm_source: 'alphahub_test',
      utm_medium: 'router_validation',
      utm_campaign: 'test_lead',
      utm_content: 'full_fields',
      utm_term: 'qualification',
      gclid: `test_gclid_${Date.now()}`,
      // Status fields
      status: 'new',
      delivery_status: client.crm_delivery_enabled !== false ? 'pending' : null,
      notes: `Test lead sent at ${timestamp} to validate router for ${client.name}. Contains all qualification fields.`,
      // Store extra data in lead_data JSON field
      lead_data: {
        test_generated: true,
        generated_at: timestamp,
        client_id: client.id,
        qualification_data: TEST_LEAD_DATA,
      },
    };

    const { data: insertedLead, error: insertError } = await supabase
      .from('leads')
      .insert(testLead)
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create test lead', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Test lead created with all fields:', insertedLead.id);

    // Deliver test lead: webhook (own CRM) or GHL injection
    let deliveryResult = null;
    if (client.use_own_crm && client.external_webhook_url) {
      // Own-CRM mode: POST to agent's webhook
      try {
        console.log(`[Own CRM] Sending test lead to webhook: ${client.external_webhook_url}`);
        const webhookPayload = {
          lead_id: insertedLead.id,
          first_name: testLead.first_name,
          last_name: testLead.last_name,
          email: testLead.email,
          phone: testLead.phone,
          state: testLead.state,
          agent_id: testLead.agent_id,
          lead_source: testLead.lead_source,
          age: testLead.age,
          employment: testLead.employment,
          interest: testLead.interest,
          savings: testLead.savings,
          investments: testLead.investments,
          timezone: testLead.timezone,
          utm_source: testLead.utm_source,
          utm_medium: testLead.utm_medium,
          utm_campaign: testLead.utm_campaign,
          utm_content: testLead.utm_content,
          utm_term: testLead.utm_term,
          gclid: testLead.gclid,
          notes: testLead.notes,
          created_at: new Date().toISOString(),
        };

        const webhookResp = await fetch(client.external_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        });

        deliveryResult = {
          success: webhookResp.ok,
          method: 'webhook',
          status: webhookResp.status,
          webhookUrl: client.external_webhook_url,
          error: webhookResp.ok ? null : `Webhook returned ${webhookResp.status}`,
        };

        // Update lead delivery status
        await supabase.from('leads').update({
          delivery_status: webhookResp.ok ? 'delivered' : 'failed',
          delivery_error: webhookResp.ok ? null : `Webhook ${webhookResp.status}`,
        }).eq('id', insertedLead.id);

        console.log('[Own CRM] Webhook delivery result:', deliveryResult);
      } catch (webhookError) {
        deliveryResult = {
          success: false,
          method: 'webhook',
          error: webhookError instanceof Error ? webhookError.message : 'Webhook error',
        };
      }
    } else if (client.crm_delivery_enabled !== false && client.subaccount_id) {
      // Standard GHL injection
      try {
        const injectResponse = await fetch(`${supabaseUrl}/functions/v1/inject-lead-to-ghl`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ leadId: insertedLead.id }),
        });

        const injectResult = await injectResponse.json();
        deliveryResult = {
          success: injectResponse.ok,
          method: 'ghl',
          contactId: injectResult.contactId,
          created: injectResult.created,
          error: injectResult.error,
        };

        console.log('GHL injection result:', deliveryResult);
      } catch (injectError) {
        deliveryResult = {
          success: false,
          method: 'ghl',
          error: injectError instanceof Error ? injectError.message : 'Unknown injection error',
        };
      }
    }

    // Fetch updated lead status
    const { data: updatedLead } = await supabase
      .from('leads')
      .select('delivery_status, delivery_error, ghl_contact_id')
      .eq('id', insertedLead.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        testLeadId: insertedLead.id,
        fieldsIncluded: Object.keys(testLead).filter(k => testLead[k as keyof typeof testLead] !== null),
        client: {
          id: client.id,
          name: client.name,
          agentId: client.agent_id,
          subaccountId: client.subaccount_id,
          ghlUserId: client.ghl_user_id,
          crmDeliveryEnabled: client.crm_delivery_enabled !== false,
        },
        routerStatus: {
          ready: issues.length === 0 || (issues.length === 1 && issues[0].includes('ghl_user_id')),
          issues,
        },
        delivery: deliveryResult,
        leadStatus: updatedLead,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error sending test lead:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: 'Failed to send test lead', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
