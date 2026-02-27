import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerificationResult {
  leadId: string;
  ghlContactId: string | null;
  contactExists: boolean;
  contactData: any | null;
  error: string | null;
}

// Get location access token from the crm-location-token function
async function getLocationToken(supabaseUrl: string, companyId: string, locationId: string, serviceKey: string): Promise<string> {
  const response = await fetch(`${supabaseUrl}/functions/v1/crm-location-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ companyId, locationId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get location token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { leadId, clientId } = body;

    console.log('=== VERIFY LEAD DELIVERY ===');
    console.log(`Lead ID: ${leadId}, Client ID: ${clientId}`);

    if (!leadId && !clientId) {
      throw new Error('Either leadId or clientId is required');
    }

    // If verifying a specific lead
    if (leadId) {
      const result = await verifyLeadInGHL(supabase, supabaseUrl, supabaseServiceKey, leadId);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If verifying all recent leads for a client
    if (clientId) {
      // Get the client's agent_id
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, agent_id, subaccount_id')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        throw new Error('Client not found');
      }

      // Get leads that claim to be delivered but need verification
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, ghl_contact_id, delivery_status, first_name, last_name, email')
        .eq('agent_id', client.agent_id)
        .eq('delivery_status', 'delivered')
        .not('ghl_contact_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (leadsError) {
        throw new Error(`Failed to fetch leads: ${leadsError.message}`);
      }

      console.log(`Verifying ${leads?.length || 0} delivered leads for ${client.name}`);

      const results: VerificationResult[] = [];
      let verifiedCount = 0;
      let notFoundCount = 0;

      for (const lead of leads || []) {
        const result = await verifyLeadInGHL(supabase, supabaseUrl, supabaseServiceKey, lead.id);
        results.push(result);
        
        if (result.contactExists) {
          verifiedCount++;
        } else {
          notFoundCount++;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        client: {
          id: client.id,
          name: client.name,
        },
        summary: {
          totalChecked: results.length,
          verified: verifiedCount,
          notFound: notFoundCount,
        },
        results,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid request');

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in verify-lead-delivery:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function verifyLeadInGHL(
  supabase: any,
  supabaseUrl: string,
  supabaseServiceKey: string,
  leadId: string
): Promise<VerificationResult> {
  try {
    // Fetch the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, clients!inner(id, name, subaccount_id)')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return {
        leadId,
        ghlContactId: null,
        contactExists: false,
        contactData: null,
        error: 'Lead not found in database',
      };
    }

    // If no GHL contact ID, cannot verify
    if (!lead.ghl_contact_id) {
      return {
        leadId,
        ghlContactId: null,
        contactExists: false,
        contactData: null,
        error: 'No GHL contact ID stored - lead may not have been delivered',
      };
    }

    // Get client's subaccount to query GHL
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, subaccount_id')
      .eq('agent_id', lead.agent_id)
      .single();

    if (clientError || !client?.subaccount_id) {
      return {
        leadId,
        ghlContactId: lead.ghl_contact_id,
        contactExists: false,
        contactData: null,
        error: 'Client subaccount not configured',
      };
    }

    // Get GHL OAuth tokens
    const { data: oauthToken, error: oauthError } = await supabase
      .from('ghl_oauth_tokens')
      .select('company_id')
      .single();

    if (oauthError || !oauthToken?.company_id) {
      return {
        leadId,
        ghlContactId: lead.ghl_contact_id,
        contactExists: false,
        contactData: null,
        error: 'GHL OAuth not configured',
      };
    }

    // Get location token
    let accessToken: string;
    try {
      accessToken = await getLocationToken(
        supabaseUrl,
        oauthToken.company_id,
        client.subaccount_id,
        supabaseServiceKey
      );
    } catch (tokenError) {
      return {
        leadId,
        ghlContactId: lead.ghl_contact_id,
        contactExists: false,
        contactData: null,
        error: `Failed to get GHL access token: ${tokenError instanceof Error ? tokenError.message : 'Unknown'}`,
      };
    }

    // Query GHL for the contact
    console.log(`Verifying contact ${lead.ghl_contact_id} in location ${client.subaccount_id}`);
    
    const ghlResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/${lead.ghl_contact_id}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28',
          'Accept': 'application/json',
        },
      }
    );

    if (!ghlResponse.ok) {
      const errorStatus = ghlResponse.status;
      
      // Update lead status if contact not found
      if (errorStatus === 404) {
        await supabase
          .from('leads')
          .update({
            delivery_status: 'failed',
            delivery_error: 'Contact not found in GHL - may have been deleted',
          })
          .eq('id', leadId);
      }
      
      return {
        leadId,
        ghlContactId: lead.ghl_contact_id,
        contactExists: false,
        contactData: null,
        error: errorStatus === 404 
          ? 'Contact not found in GHL - may have been deleted' 
          : `GHL API error: ${errorStatus}`,
      };
    }

    const ghlData = await ghlResponse.json();
    
    // Contact exists!
    console.log(`Contact verified: ${ghlData.contact?.firstName} ${ghlData.contact?.lastName}`);

    return {
      leadId,
      ghlContactId: lead.ghl_contact_id,
      contactExists: true,
      contactData: {
        id: ghlData.contact?.id,
        firstName: ghlData.contact?.firstName,
        lastName: ghlData.contact?.lastName,
        email: ghlData.contact?.email,
        phone: ghlData.contact?.phone,
        tags: ghlData.contact?.tags,
        dateAdded: ghlData.contact?.dateAdded,
      },
      error: null,
    };

  } catch (error) {
    console.error('Error verifying lead:', error);
    return {
      leadId,
      ghlContactId: null,
      contactExists: false,
      contactData: null,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}
