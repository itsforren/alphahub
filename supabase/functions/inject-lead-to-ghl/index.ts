import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadData {
  id: string;
  agent_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  state?: string;
  lead_source?: string;
  // Qualification fields
  age?: string;
  employment?: string;
  interest?: string;
  savings?: string;
  investments?: string;
  timezone?: string;
  // Attribution fields
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  lead_data?: Record<string, unknown>;
  notes?: string;
}

// Fallback custom field keys if no cached mapping exists
// Note: state and timezone are native GHL contact fields - no custom field needed
const FALLBACK_CUSTOM_FIELDS = {
  savings: 'contact.savings',
  investments: 'contact.investments',
  employment: 'contact.employment',
  interest: 'contact.interest',
  age: 'contact.age',
  fallback: 'contact.fallback',
};

// Interface for cached field mappings
interface FieldMapping {
  field_name: string;
  ghl_field_id: string | null;
  ghl_field_name: string | null;
}

// Get cached field mappings for a client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCachedFieldMappings(
  supabase: any,
  clientId: string
): Promise<Record<string, string | null>> {
  const { data, error } = await supabase
    .from('ghl_custom_field_mappings')
    .select('field_name, ghl_field_id, ghl_field_name')
    .eq('client_id', clientId);

  if (error || !data || data.length === 0) {
    console.log('No cached field mappings found, will use fallback keys');
    return {};
  }

  const mappings: Record<string, string | null> = {};
  for (const row of data as FieldMapping[]) {
    mappings[row.field_name] = row.ghl_field_id;
  }
  
  console.log('Loaded cached field mappings:', Object.entries(mappings).map(([k, v]) => `${k}=${v ? 'mapped' : 'unmapped'}`).join(', '));
  return mappings;
}

// Get location access token
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
    const error = await response.text();
    throw new Error(`Failed to get location token: ${error}`);
  }

  const data = await response.json();
  return data.locationAccessToken;
}

// Clean array-formatted strings like ["value1","value2"] into "value1, value2"
function cleanArrayString(value: string | undefined): string | undefined {
  if (!value) return undefined;
  
  // Check if it looks like a JSON array
  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.join(', ');
      }
    } catch {
      // Not valid JSON, just strip brackets and quotes
      return value
        .replace(/^\[|\]$/g, '')  // Remove [ and ]
        .replace(/"/g, '')        // Remove quotes
        .split(',')
        .map(s => s.trim())
        .join(', ');
    }
  }
  
  return value;
}

// Build comprehensive fallback string with ALL lead data
function buildFallbackData(leadData: LeadData): string {
  const parts: string[] = [];
  
  // Contact info first
  parts.push('=== Contact Info ===');
  const fullName = [leadData.first_name, leadData.last_name].filter(Boolean).join(' ');
  if (fullName) parts.push(`Name: ${fullName}`);
  if (leadData.email) parts.push(`Email: ${leadData.email}`);
  if (leadData.phone) parts.push(`Phone: ${leadData.phone}`);
  if (leadData.state) parts.push(`State: ${leadData.state}`);
  
  // Qualification data - clean array strings
  parts.push('');
  parts.push('=== Qualification ===');
  if (leadData.age) parts.push(`Age: ${cleanArrayString(leadData.age)}`);
  if (leadData.employment) parts.push(`Employment: ${cleanArrayString(leadData.employment)}`);
  if (leadData.interest) parts.push(`Interest: ${cleanArrayString(leadData.interest)}`);
  if (leadData.savings) parts.push(`Savings: ${cleanArrayString(leadData.savings)}`);
  if (leadData.investments) parts.push(`Investments: ${cleanArrayString(leadData.investments)}`);
  if (leadData.timezone) parts.push(`Timezone: ${leadData.timezone}`);
  
  // Any existing notes
  if (leadData.notes) {
    parts.push('');
    parts.push('=== Notes ===');
    parts.push(leadData.notes);
  }
  
  parts.push('');
  parts.push(`Delivered via AlphaHub at ${new Date().toISOString()}`);
  
  return parts.join('\n');
}

// Create contact in GHL
async function createGHLContact(
  locationId: string, 
  accessToken: string, 
  leadData: LeadData,
  ghlUserId?: string,
  fieldMappings?: Record<string, string | null>
): Promise<{ contactId: string; created: boolean }> {
  // Build custom fields using cached ID-based mappings or fallback to key-based
  const customFields: Array<{ id?: string; key?: string; value: string }> = [];
  const useCachedMappings = fieldMappings && Object.keys(fieldMappings).length > 0;
  
  console.log(`Building custom fields (using ${useCachedMappings ? 'cached ID-based' : 'fallback key-based'} mappings)`);

  // Helper to add a field using ID if available, otherwise fallback to key
  const addField = (fieldName: string, value: string | undefined) => {
    if (!value) return;
    
    if (useCachedMappings && fieldMappings[fieldName]) {
      // Use ID-based mapping (guaranteed to work)
      customFields.push({ id: fieldMappings[fieldName]!, value });
      console.log(`  ${fieldName}: using ID ${fieldMappings[fieldName]}`);
    } else if (!useCachedMappings) {
      // Use fallback key-based (may not work if field doesn't exist)
      const key = FALLBACK_CUSTOM_FIELDS[fieldName as keyof typeof FALLBACK_CUSTOM_FIELDS];
      if (key) {
        customFields.push({ key, value });
        console.log(`  ${fieldName}: using fallback key ${key}`);
      }
    } else {
      console.log(`  ${fieldName}: skipped (no mapping configured)`);
    }
  };
  
  // Add qualification fields as custom fields (state & timezone are native GHL fields, handled separately)
  // Clean array-formatted strings to comma-separated values
  addField('savings', cleanArrayString(leadData.savings));
  addField('investments', cleanArrayString(leadData.investments));
  addField('employment', cleanArrayString(leadData.employment));
  addField('interest', cleanArrayString(leadData.interest));
  addField('age', cleanArrayString(leadData.age));
  
  // Build and add fallback with ALL lead data
  const fallbackData = buildFallbackData(leadData);
  addField('fallback', fallbackData);

  const contactPayload: Record<string, unknown> = {
    locationId,
    firstName: leadData.first_name || '',
    lastName: leadData.last_name || '',
    email: leadData.email || undefined,
    phone: leadData.phone || undefined,
    source: leadData.lead_source || 'AlphaHub',
    tags: ['alpha'], // Apply "alpha" tag to trigger automation
    customFields, // Always include custom fields (includes fallback with all data)
    notes: [fallbackData], // Dump full survey summary into contact notes
  };

  // Auto-assign to GHL user if configured
  if (ghlUserId) {
    contactPayload.assignedTo = ghlUserId;
    console.log('Auto-assigning lead to GHL user:', ghlUserId);
  }

  // Add native state field
  if (leadData.state) {
    contactPayload.state = leadData.state;
  }

  // Add native timezone field
  if (leadData.timezone) {
    contactPayload.timezone = leadData.timezone;
  }

  console.log('Setting custom fields:', customFields.map(f => f.key).join(', '));

  console.log('Creating GHL contact with payload:', JSON.stringify(contactPayload, null, 2));

  const response = await fetch('https://services.leadconnectorhq.com/contacts/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Version': '2021-07-28',
    },
    body: JSON.stringify(contactPayload),
  });

  const responseText = await response.text();
  console.log('GHL create contact response:', response.status, responseText);

  if (!response.ok) {
    // Check if it's a duplicate (contact already exists)
    // GHL returns "duplicated contacts" or "duplicate" in error message
    if (response.status === 400 && (responseText.includes('duplicate') || responseText.includes('duplicated'))) {
      console.log('Duplicate contact detected, attempting to update existing contact');
      
      // Try to extract contactId from error response (GHL provides it in meta)
      let existingContactId: string | null = null;
      try {
        const errorData = JSON.parse(responseText);
        existingContactId = errorData.meta?.contactId || null;
      } catch {
        // If can't parse, fall back to search
      }
      
      if (existingContactId) {
        console.log('Found existing contact ID from error response:', existingContactId);
        // Add the alpha tag, update custom fields, and add notes on existing contact
        await addTagToContact(existingContactId, accessToken, 'alpha');
        await updateContactCustomFields(existingContactId, accessToken, customFields, fallbackData);
        return { contactId: existingContactId, created: false };
      }

      // Fallback: Try to find existing contact by email or phone
      const existingContact = await findExistingContact(locationId, accessToken, leadData.email, leadData.phone);
      if (existingContact) {
        // Add the alpha tag, update custom fields, and add notes on existing contact
        await addTagToContact(existingContact.id, accessToken, 'alpha');
        await updateContactCustomFields(existingContact.id, accessToken, customFields, fallbackData);
        return { contactId: existingContact.id, created: false };
      }
    }
    throw new Error(`Failed to create GHL contact: ${responseText}`);
  }

  const data = JSON.parse(responseText);
  const newContactId = data.contact?.id || data.id;

  return { contactId: newContactId, created: true };
}

// Find existing contact by email or phone
async function findExistingContact(
  locationId: string,
  accessToken: string,
  email?: string,
  phone?: string
): Promise<{ id: string } | null> {
  const query = email || phone;
  if (!query) return null;

  const response = await fetch(
    `https://services.leadconnectorhq.com/contacts/search?locationId=${locationId}&query=${encodeURIComponent(query)}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
      },
    }
  );

  if (!response.ok) {
    console.log('Failed to search for existing contact');
    return null;
  }

  const data = await response.json();
  if (data.contacts && data.contacts.length > 0) {
    return { id: data.contacts[0].id };
  }

  return null;
}

// Add tag to an existing contact
async function addTagToContact(contactId: string, accessToken: string, tag: string): Promise<void> {
  const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Version': '2021-07-28',
    },
    body: JSON.stringify({ tags: [tag] }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.log('Failed to add tag to contact:', error);
  }
}

// Update contact custom fields and notes (for existing contacts that need lead data)
async function updateContactCustomFields(
  contactId: string,
  accessToken: string,
  customFields: Array<{ id?: string; key?: string; value: string }>,
  notes?: string,
): Promise<void> {
  const body: Record<string, unknown> = { customFields };
  if (notes) body.notes = [notes];

  const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Version': '2021-07-28',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.log('Failed to update contact custom fields:', error);
  } else {
    console.log('Successfully updated custom fields on existing contact');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let leadId: string | null = null;
  
  try {
    const body = await req.json();
    leadId = body.leadId;

    if (!leadId) {
      return new Response(
        JSON.stringify({ error: 'Missing leadId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Injecting lead to GHL:', leadId);

    // Fetch the lead with ALL fields
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Failed to fetch lead:', leadError);
      return new Response(
        JSON.stringify({ error: 'Lead not found', details: leadError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the client/agent's subaccount_id and ghl_user_id
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, subaccount_id, ghl_user_id, name, crm_delivery_enabled')
      .eq('agent_id', lead.agent_id)
      .single();

    if (clientError || !client) {
      const errorMessage = `No client found for agent_id: ${lead.agent_id}`;
      console.error(errorMessage);
      
      // Log delivery failure
      await logDeliveryAttempt(supabase, lead.id, null, 'failed', null, errorMessage);
      await updateLeadDeliveryStatus(supabase, lead.id, 'failed', errorMessage);
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if CRM delivery is disabled for this agent
    if (client.crm_delivery_enabled === false) {
      console.log(`CRM delivery disabled for ${client.name}, skipping GHL injection`);
      
      // Track as "skipped" in pipeline metrics
      await supabase.rpc('increment_pipeline_metric', {
        p_agent_id: lead.agent_id,
        p_stage: 'skipped'
      });
      
      // Update lead to show it was skipped (not failed)
      await supabase
        .from('leads')
        .update({
          delivery_status: 'skipped',
          delivery_error: null,
        })
        .eq('id', lead.id);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true,
          message: 'CRM delivery disabled for this agent'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!client.subaccount_id) {
      const errorMessage = `Client ${client.name} has no subaccount_id configured`;
      console.error(errorMessage);
      
      await logDeliveryAttempt(supabase, lead.id, null, 'failed', null, errorMessage);
      await updateLeadDeliveryStatus(supabase, lead.id, 'failed', errorMessage);
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const locationId = client.subaccount_id;

    // Get the GHL OAuth token (company_id)
    const { data: oauthToken, error: oauthError } = await supabase
      .from('ghl_oauth_tokens')
      .select('company_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (oauthError || !oauthToken?.company_id) {
      const errorMessage = 'GHL OAuth not configured';
      console.error(errorMessage, oauthError);
      
      await logDeliveryAttempt(supabase, lead.id, locationId, 'failed', null, errorMessage);
      await updateLeadDeliveryStatus(supabase, lead.id, 'failed', errorMessage);
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get location access token
    const accessToken = await getLocationToken(supabaseUrl, oauthToken.company_id, locationId, supabaseServiceKey);

    // Get cached field mappings for this client (uses ID-based mappings if available)
    const fieldMappings = await getCachedFieldMappings(supabase, client.id);

    // Create contact in GHL with all fields, custom fields, and notes fallback
    const { contactId, created } = await createGHLContact(locationId, accessToken, lead as LeadData, client.ghl_user_id, fieldMappings);

    console.log(`GHL contact ${created ? 'created' : 'found'}: ${contactId}`);

    // Log successful delivery
    await logDeliveryAttempt(supabase, lead.id, locationId, 'success', contactId, null);
    
    // Update lead with delivery status
    await supabase
      .from('leads')
      .update({
        delivery_status: 'delivered',
        delivered_at: new Date().toISOString(),
        ghl_contact_id: contactId,
        delivery_error: null,
        last_delivery_attempt_at: new Date().toISOString(),
      })
      .eq('id', lead.id);

    // Track pipeline metric: delivered
    try {
      await supabase.rpc('increment_pipeline_metric', {
        p_agent_id: lead.agent_id,
        p_stage: 'delivered'
      });
    } catch (metricErr) {
      console.error('Failed to track delivered metric:', metricErr);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        contactId,
        created,
        message: created ? 'Contact created with custom fields and notes' : 'Existing contact updated with notes'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error injecting lead to GHL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update lead status to failed if we have a leadId
    if (leadId) {
      try {
        // Get agent_id for metric tracking
        const { data: leadData } = await supabase
          .from('leads')
          .select('agent_id')
          .eq('id', leadId)
          .single();

        await logDeliveryAttempt(supabase, leadId, null, 'failed', null, errorMessage);
        await updateLeadDeliveryStatus(supabase, leadId, 'failed', errorMessage);
        console.log('Updated lead delivery status to failed:', leadId);

        // Track pipeline metric: failed
        if (leadData?.agent_id) {
          await supabase.rpc('increment_pipeline_metric', {
            p_agent_id: leadData.agent_id,
            p_stage: 'failed'
          });
        }
      } catch (updateError) {
        console.error('Failed to update lead delivery status:', updateError);
      }
    }
    
    return new Response(
      JSON.stringify({ error: 'Failed to inject lead', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper to log delivery attempt
async function logDeliveryAttempt(
  supabase: any,
  leadId: string,
  locationId: string | null,
  status: string,
  contactId: string | null,
  errorMessage: string | null
) {
  // Get current attempt count
  const { data: lead } = await supabase
    .from('leads')
    .select('delivery_attempts')
    .eq('id', leadId)
    .single();

  const attemptNumber = ((lead?.delivery_attempts as number) || 0) + 1;

  await supabase.from('lead_delivery_logs').insert({
    lead_id: leadId,
    attempt_number: attemptNumber,
    status,
    ghl_location_id: locationId,
    ghl_contact_id: contactId,
    error_message: errorMessage,
  });
}

// Helper to update lead delivery status
async function updateLeadDeliveryStatus(
  supabase: any,
  leadId: string,
  status: string,
  errorMessage: string
) {
  const { data: lead } = await supabase
    .from('leads')
    .select('delivery_attempts')
    .eq('id', leadId)
    .single();

  await supabase
    .from('leads')
    .update({
      delivery_status: status,
      delivery_error: errorMessage,
      delivery_attempts: ((lead?.delivery_attempts as number) || 0) + 1,
      last_delivery_attempt_at: new Date().toISOString(),
    })
    .eq('id', leadId);
}
