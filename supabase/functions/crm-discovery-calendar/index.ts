import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Get location access token by calling the crm-location-token function
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

// Fetch calendars from GHL API
async function fetchCalendars(locationId: string, accessToken: string): Promise<any[]> {
  const response = await fetch(`https://services.leadconnectorhq.com/calendars/?locationId=${locationId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Version': '2021-04-15',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch calendars: ${error}`);
  }

  const data = await response.json();
  return data.calendars || [];
}

// Find discovery calendar with improved matching (prefer exact "IUL Discovery" matches)
function findDiscoveryCalendar(calendars: any[]): { calendar: any | null; allNames: string[] } {
  const allNames = calendars.map(c => c.name);

  // 1. Exact match for known calendar names (case-insensitive)
  const exactNames = ['iul discovery call', 'discovery call'];
  const exactMatch = calendars.find(c =>
    exactNames.includes(c.name.toLowerCase().trim())
  );
  if (exactMatch) return { calendar: exactMatch, allNames };

  // 2. Broad match: any calendar containing "discovery"
  const discoveryMatches = calendars.filter(c =>
    c.name.toLowerCase().includes('discovery')
  );

  if (discoveryMatches.length === 0) return { calendar: null, allNames };

  // 3. If multiple matches, prefer the one with "IUL" in the name
  if (discoveryMatches.length > 1) {
    const iulMatch = discoveryMatches.find(c =>
      c.name.toLowerCase().includes('iul')
    );
    if (iulMatch) return { calendar: iulMatch, allNames };
  }

  return { calendar: discoveryMatches[0], allNames };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get('companyId');
    const locationId = url.searchParams.get('locationId');

    if (!companyId || !locationId) {
      return new Response(
        JSON.stringify({ error: 'companyId and locationId query parameters are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Looking up discovery calendar for company: ${companyId}, location: ${locationId}`);

    // Log the incoming request
    await supabase.from('ghl_api_logs').insert({
      request_type: 'discovery_calendar_lookup',
      company_id: companyId,
      location_id: locationId,
      status: 'pending',
    });

    // Get location access token
    let accessToken: string;
    try {
      accessToken = await getLocationToken(supabaseUrl, companyId, locationId, supabaseServiceKey);
    } catch (tokenError: unknown) {
      const message = tokenError instanceof Error ? tokenError.message : 'Unknown error';
      console.error('Failed to get location token:', message);
      
      await supabase.from('ghl_api_logs').insert({
        request_type: 'discovery_calendar_lookup',
        company_id: companyId,
        location_id: locationId,
        status: 'error',
        error_message: `Token error: ${message}`,
      });
      
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with CRM', details: message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch calendars with retry logic
    let calendars: any[] = [];
    let lastError: string = '';
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching calendars, attempt ${attempt}/${maxRetries}`);
        calendars = await fetchCalendars(locationId, accessToken);
        break;
      } catch (fetchError: unknown) {
        lastError = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        console.error(`Attempt ${attempt} failed:`, lastError);
        
        if (attempt < maxRetries) {
          await delay(1000 * attempt); // Exponential backoff
        }
      }
    }

    if (calendars.length === 0 && lastError) {
      await supabase.from('ghl_api_logs').insert({
        request_type: 'discovery_calendar_lookup',
        company_id: companyId,
        location_id: locationId,
        status: 'error',
        error_message: lastError,
      });
      
      return new Response(
        JSON.stringify({ error: 'Failed to fetch calendars after retries', details: lastError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find discovery calendar
    const { calendar: discoveryCalendar, allNames } = findDiscoveryCalendar(calendars);

    if (!discoveryCalendar) {
      console.log(`No discovery calendar found. Available calendars: ${allNames.join(', ')}`);
      
      await supabase.from('ghl_api_logs').insert({
        request_type: 'discovery_calendar_lookup',
        company_id: companyId,
        location_id: locationId,
        status: 'not_found',
        response_data: { available_calendars: allNames },
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'No discovery calendar found',
          availableCalendars: allNames,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found discovery calendar: ${discoveryCalendar.name} (${discoveryCalendar.id})`);

    // Log success
    await supabase.from('ghl_api_logs').insert({
      request_type: 'discovery_calendar_lookup',
      company_id: companyId,
      location_id: locationId,
      status: 'success',
      response_data: { 
        calendar_id: discoveryCalendar.id,
        calendar_name: discoveryCalendar.name,
        total_calendars: calendars.length,
      },
    });

    return new Response(
      JSON.stringify({
        discoveryCalendarId: discoveryCalendar.id,
        matchedName: discoveryCalendar.name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in crm-discovery-calendar:', message);
    
    await supabase.from('ghl_api_logs').insert({
      request_type: 'discovery_calendar_lookup',
      status: 'error',
      error_message: message,
    });

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
