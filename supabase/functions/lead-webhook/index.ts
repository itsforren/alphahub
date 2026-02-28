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
        request_count: (keyData.request_count || 0) + 1,
      })
      .eq('id', keyData.id);

    // Parse the incoming payload
    const payload = await req.json();
    console.log('Received webhook payload:', JSON.stringify(payload, null, 2));

    // Extract visitor_id from payload (passed from tracking script)
    // Support multiple naming conventions from different tracking integrations
    const visitorId = payload.visitor_id || payload.visitorId || payload.alpha_visitor_id || payload.nfia_visitor_id || null;

    // Map common field names to our schema - includes ALL CAPS variations from GHL
    // CRITICAL: Parse contact_id from webhook payload for idempotency
    const contactId = payload.contact_id || payload.contactId || payload['Contact ID'] || payload.contact?.id;
    
    const leadData: Record<string, any> = {
      // Prefer contact_id for lead_id (better idempotency with GHL)
      lead_id: contactId || payload.lead_id || payload.leadId || payload.Lead_ID || payload['Lead ID'] || payload.LEAD_ID || payload['LEAD ID'] || crypto.randomUUID(),
      agent_id: payload.agent_id || payload.agentId || payload.Agent_ID || payload['Agent ID'] || payload.AGENT_ID || payload['AGENT ID'],
      // FIXED: Parse multiple date field variations including date_created
      lead_date: parseDate(
        payload.lead_date || 
        payload.leadDate || 
        payload.Lead_Date || 
        payload['Lead Date'] || 
        payload['Date Created'] ||
        payload.date_created ||      // GHL's native field
        payload.dateCreated ||        // camelCase variant
        payload.contact?.dateAdded || // nested contact object
        payload.contact?.dateCreated  // nested contact object
      ) || new Date().toISOString(), // FALLBACK: use current time if all else fails
      state: payload.state || payload.State || payload['Resident State'],
      first_name: payload.first_name || payload.firstName || payload.First_Name || payload['First Name'],
      last_name: payload.last_name || payload.lastName || payload.Last_Name || payload['Last Name'],
      phone: payload.phone || payload.Phone,
      email: payload.email || payload.Email,
      age: payload.age || payload.Age || payload.AGE || payload['Birth Year'],
      employment: payload.employment || payload.Employment || payload.EMPLOYMENT || payload['EMPLOYMENT TXT'],
      interest: payload.interest || payload.Interest || payload.INTEREST || payload['INTEREST TXT'],
      savings: payload.savings || payload.Savings || payload['MONTHLY SAVINGS'] || payload['MONTHLY SAVINGS TXT'],
      investments: payload.investments || payload.Investments || payload.INVESTMENTS || payload['INVESTMENTS TXT'],
      timezone: payload.timezone || payload.Timezone,
      lead_source: payload.lead_source || payload.leadSource || payload.Lead_Source || payload['Lead Source'] || payload.contact_source,
      status: payload.status || 'new',
      lead_data: extractExtraFields(payload),
      webhook_payload: payload,
      // Attribution tracking
      utm_source: payload.utm_source || payload.utmSource || payload.UTM_Source,
      utm_medium: payload.utm_medium || payload.utmMedium || payload.UTM_Medium,
      utm_campaign: payload.utm_campaign || payload.utmCampaign || payload.UTM_Campaign,
      utm_content: payload.utm_content || payload.utmContent || payload.UTM_Content,
      utm_term: payload.utm_term || payload.utmTerm || payload.UTM_Term,
      gclid: payload.gclid || payload.GCLID || payload.Gaclid,
      fbclid: payload.fbclid || payload.FBCLID,
      // Delivery will be tracked - set to pending before inject call
      delivery_attempts: 0,
    };

    console.log('Parsed lead_date:', leadData.lead_date, '| Source fields checked: lead_date, date_created, contact.dateAdded');

    const leadEmail = (leadData.email || '').toLowerCase().trim();

    // Validate required fields
    if (!leadData.agent_id) {
      console.error('Missing required field: agent_id');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required field: agent_id (or Agent ID)', 
          code: 'VALIDATION_ERROR',
          received_fields: Object.keys(payload)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!leadData.lead_id) {
      console.error('Missing required field: lead_id');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required field: lead_id (or Lead ID)', 
          code: 'VALIDATION_ERROR',
          received_fields: Object.keys(payload)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicate lead_id (idempotency)
    const { data: existingLead, error: existingError } = await supabase
      .from('leads')
      .select('id, lead_id')
      .eq('lead_id', leadData.lead_id)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing lead:', existingError);
    }

    if (existingLead) {
      console.log('Duplicate lead detected, returning existing:', existingLead.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Lead already exists',
          lead_id: existingLead.id,
          duplicate: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Track pipeline metric: webhook_received
    try {
      await supabase.rpc('increment_pipeline_metric', {
        p_agent_id: leadData.agent_id,
        p_stage: 'webhook_received'
      });
    } catch (metricErr) {
      console.error('Failed to track webhook_received metric:', metricErr);
    }

    // Insert the lead
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting lead:', insertError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to insert lead', 
          code: 'INSERT_ERROR',
          details: insertError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Lead created successfully:', newLead.id);

    // Track pipeline metric: stored
    try {
      await supabase.rpc('increment_pipeline_metric', {
        p_agent_id: leadData.agent_id,
        p_stage: 'stored'
      });
    } catch (metricErr) {
      console.error('Failed to track stored metric:', metricErr);
    }

    // =========== IDENTITY RESOLUTION (The "Locking" Mechanism) ===========
    // Link this lead to visitor tracking data
    if (leadEmail || visitorId) {
      console.log('Starting identity resolution...', { visitorId, leadEmail });
      
      // Try to find the visitor session
      let visitorSession = null;
      
      // First try by visitor_id (passed from tracking script)
      if (visitorId) {
        const { data } = await supabase
          .from('visitor_sessions')
          .select('*')
          .eq('visitor_id', visitorId)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
        visitorSession = data;
      }
      
      // If no session found and we have email, try by email
      if (!visitorSession && leadEmail) {
        const { data } = await supabase
          .from('visitor_sessions')
          .select('*')
          .eq('email', leadEmail)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
        visitorSession = data;
      }

      // "LOCK" the session: Update all sessions for this visitor with the email
      if (visitorId && leadEmail) {
        await supabase
          .from('visitor_sessions')
          .update({ email: leadEmail, lead_id: newLead.id, converted_at: new Date().toISOString() })
          .eq('visitor_id', visitorId);
        console.log('Sessions locked with email:', leadEmail);
      }

      // Get first-touch session (earliest session for this visitor)
      const { data: firstSession } = await supabase
        .from('visitor_sessions')
        .select('*')
        .eq('visitor_id', visitorId || visitorSession?.visitor_id || '')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      // Get last-touch session (most recent session)
      const { data: lastSession } = await supabase
        .from('visitor_sessions')
        .select('*')
        .eq('visitor_id', visitorId || visitorSession?.visitor_id || '')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Count total sessions and page views
      const { count: sessionCount } = await supabase
        .from('visitor_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('visitor_id', visitorId || visitorSession?.visitor_id || '');

      const { count: pageViewCount } = await supabase
        .from('visitor_events')
        .select('*', { count: 'exact', head: true })
        .eq('visitor_id', visitorId || visitorSession?.visitor_id || '')
        .eq('event_type', 'page_view');

      // Get all touchpoints for conversion path
      const { data: allEvents } = await supabase
        .from('visitor_events')
        .select('event_type, page_url, created_at, element_text')
        .eq('visitor_id', visitorId || visitorSession?.visitor_id || '')
        .order('created_at', { ascending: true })
        .limit(100);

      // Build conversion path
      const conversionPath = (allEvents || []).map(e => ({
        type: e.event_type,
        url: e.page_url,
        at: e.created_at,
        label: e.element_text
      }));

      // Calculate time to conversion
      const firstTouchAt = firstSession?.created_at ? new Date(firstSession.created_at) : null;
      const conversionTime = new Date();
      const hoursToConvert = firstTouchAt 
        ? (conversionTime.getTime() - firstTouchAt.getTime()) / (1000 * 60 * 60) 
        : null;

      // Create lead_attribution record
      const attributionData = {
        lead_id: newLead.id,
        visitor_id: visitorId || visitorSession?.visitor_id || `lead-${newLead.id}`,
        first_touch_source: firstSession?.utm_source || leadData.utm_source,
        first_touch_medium: firstSession?.utm_medium || leadData.utm_medium,
        first_touch_campaign: firstSession?.utm_campaign || leadData.utm_campaign,
        first_touch_content: firstSession?.utm_content || leadData.utm_content,
        first_touch_term: firstSession?.utm_term || leadData.utm_term,
        first_touch_gclid: firstSession?.gclid || leadData.gclid,
        first_touch_fbclid: firstSession?.fbclid || leadData.fbclid,
        first_touch_referrer: firstSession?.referrer_url,
        first_touch_landing_page: firstSession?.landing_page,
        first_touch_at: firstSession?.created_at,
        last_touch_source: lastSession?.utm_source || leadData.utm_source,
        last_touch_medium: lastSession?.utm_medium || leadData.utm_medium,
        last_touch_campaign: lastSession?.utm_campaign || leadData.utm_campaign,
        last_touch_content: lastSession?.utm_content || leadData.utm_content,
        last_touch_term: lastSession?.utm_term || leadData.utm_term,
        last_touch_gclid: lastSession?.gclid || leadData.gclid,
        last_touch_fbclid: lastSession?.fbclid || leadData.fbclid,
        last_touch_referrer: lastSession?.referrer_url,
        last_touch_landing_page: lastSession?.landing_page,
        last_touch_at: lastSession?.created_at || new Date().toISOString(),
        touch_count: sessionCount || 1,
        total_page_views: pageViewCount || 0,
        total_sessions: sessionCount || 1,
        time_to_conversion_hours: hoursToConvert,
        referral_code: firstSession?.referral_code || leadData.referral_code,
        conversion_path: conversionPath,
      };

      const { error: attrError } = await supabase
        .from('lead_attribution')
        .insert(attributionData);

      if (attrError) {
        console.error('Error creating lead_attribution:', attrError);
      } else {
        console.log('Lead attribution created for lead:', newLead.id);
      }
    }

    // Set delivery_status to pending now that we're about to inject
    await supabase
      .from('leads')
      .update({ delivery_status: 'pending' })
      .eq('id', newLead.id);

    // Trigger GHL injection in background (fire and forget)
    fetch(`${supabaseUrl}/functions/v1/inject-lead-to-ghl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ leadId: newLead.id }),
    }).then(res => {
      if (!res.ok) console.error('GHL injection failed:', res.status);
      else console.log('GHL injection triggered for lead:', newLead.id);
    }).catch(err => console.error('GHL injection error:', err));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead created successfully',
        lead_id: newLead.id,
        duplicate: false
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

// Helper to parse various date formats
function parseDate(dateStr: string | null | undefined): string | null {
  if (dateStr === null || dateStr === undefined) return null;

  const trimmed = String(dateStr).trim();
  if (!trimmed) return null;

  // MM/DD/YYYY (or M/D/YY)
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const [mRaw, dRaw, yRaw] = parts.map((p) => p.trim());

    const month = Number(mRaw);
    const day = Number(dRaw);
    const year = Number(yRaw.length === 2 ? `20${yRaw}` : yRaw);

    if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    // Use UTC to avoid timezone shifts
    const d = new Date(Date.UTC(year, month - 1, day));

    // Strict validation: ensure the components match (catches 02/30, 13/40, etc.)
    if (
      d.getUTCFullYear() !== year ||
      d.getUTCMonth() !== month - 1 ||
      d.getUTCDate() !== day
    ) {
      return null;
    }

    try {
      return d.toISOString();
    } catch {
      return null;
    }
  }

  // ISO format / other
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  try {
    return parsed.toISOString();
  } catch {
    return null;
  }
}

// Extract extra fields that don't map to our schema
function extractExtraFields(payload: Record<string, any>): Record<string, any> {
  const knownFields = [
    'lead_id', 'leadId', 'Lead_ID', 'Lead ID',
    'agent_id', 'agentId', 'Agent_ID', 'Agent ID',
    'agent_name', 'agentName', 'Agent_Name', 'Agent Name',
    'lead_date', 'leadDate', 'Lead_Date', 'Lead Date',
    'state', 'State',
    'first_name', 'firstName', 'First_Name', 'First Name',
    'last_name', 'lastName', 'Last_Name', 'Last Name',
    'phone', 'Phone',
    'email', 'Email',
    'age', 'Age',
    'employment', 'Employment',
    'interest', 'Interest',
    'savings', 'Savings',
    'investments', 'Investments',
    'timezone', 'Timezone',
    'lead_source', 'leadSource', 'Lead_Source', 'Lead Source',
    'status'
  ];
  
  const extra: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!knownFields.includes(key) && value !== undefined && value !== null && value !== '') {
      extra[key] = value;
    }
  }
  return extra;
}
