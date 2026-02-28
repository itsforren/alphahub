import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_API_VERSION = '2021-07-28';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Support both GET with query params and POST with body
    let companyId: string;
    let locationId: string;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      companyId = url.searchParams.get('companyId') || '';
      locationId = url.searchParams.get('locationId') || '';
    } else {
      const body = await req.json();
      companyId = body.companyId || '';
      locationId = body.locationId || '';
    }

    if (!companyId || !locationId) {
      return new Response(
        JSON.stringify({ error: 'companyId and locationId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking snapshot status for location: ${locationId}`);

    // Get location access token via crm-location-token
    const tokenResponse = await fetch(`${supabaseUrl}/functions/v1/crm-location-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ companyId, locationId }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to get location token:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get location token', details: errorText }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { locationAccessToken } = await tokenResponse.json();

    // NOTE:
    // The legacy snapshot status endpoint has been returning 404s in some environments
    // (e.g. "Cannot GET /snapshots/snapshot-status/location/:id").
    // For our onboarding workflow, the real readiness signal is whether snapshot artifacts exist —
    // specifically the "Discovery" calendar. So we treat calendars as the source of truth.

    // Also check for calendars as a secondary indicator that snapshot applied
    let calendarsFound: string[] = [];
    let calendarsFetchOk = false;
    let calendarsStatus: number | null = null;
    let calendarsError: string | null = null;
    // Track full calendar objects for ID extraction
    let calendarsData: any[] = [];
    try {
      const calendarsUrl = `https://services.leadconnectorhq.com/calendars/?locationId=${locationId}`;
      const calendarsResponse = await fetch(calendarsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${locationAccessToken}`,
          'Accept': 'application/json',
          'Version': GHL_API_VERSION,
        },
      });

      calendarsFetchOk = calendarsResponse.ok;
      calendarsStatus = calendarsResponse.status;
      
      if (calendarsResponse.ok) {
        const rawData = await calendarsResponse.json();
        calendarsData = rawData.calendars || [];
        calendarsFound = calendarsData.map((c: any) => c.name);
        console.log(`Found ${calendarsFound.length} calendars:`, calendarsFound);
      } else {
        const text = await calendarsResponse.text();
        calendarsError = text || `Calendars request failed (${calendarsResponse.status})`;
        console.error('Calendars request failed:', calendarsError);
      }
    } catch (calErr) {
      calendarsError = calErr instanceof Error ? calErr.message : 'Unknown calendars fetch error';
      console.error('Error fetching calendars for status check:', calErr);
    }

    // Check specifically for a "Discovery" calendar - this is the key artifact from the snapshot
    // The snapshot MUST include a Discovery calendar for proper funnel functionality
    const discoveryCalendar = calendarsData.find((c: any) => 
      (c.name || '').toLowerCase().includes('discovery')
    );
    const hasDiscoveryCalendar = !!discoveryCalendar;
    const discoveryCalendarId = discoveryCalendar?.id || null;

    // Log the API call (calendars-based status)
    await supabase.from('ghl_api_logs').insert({
      request_type: 'snapshot_status',
      company_id: companyId,
      location_id: locationId,
      status: calendarsFetchOk ? 'success' : 'error',
      response_data: {
        calendarsFound,
        hasDiscoveryCalendar,
        discoveryCalendarId,
        calendarsStatus,
      },
      error_message: calendarsFetchOk ? null : calendarsError,
    });

    return new Response(
      JSON.stringify({
        success: true,
        snapshotStatus: hasDiscoveryCalendar ? 'completed' : 'unknown',
        normalizedStatus: hasDiscoveryCalendar ? 'completed' : 'unknown',
        progress: null,
        snapshotId: null,
        error: calendarsFetchOk ? null : calendarsError,
        raw: null,
        calendarsFound,
        hasDiscoveryCalendar,
        discoveryCalendarId,
        snapshotApplied: hasDiscoveryCalendar,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in crm-snapshot-status:', message);

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
