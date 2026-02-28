import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get location access token from the token exchange endpoint
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

// Fetch all calendars for a location
async function fetchCalendars(locationId: string, accessToken: string): Promise<any[]> {
  const response = await fetch(`https://services.leadconnectorhq.com/calendars/?locationId=${locationId}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
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

// Fetch full calendar details including teamMembers
async function fetchCalendarDetails(calendarId: string, accessToken: string): Promise<any> {
  const response = await fetch(`https://services.leadconnectorhq.com/calendars/${calendarId}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Version': '2021-04-15',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch calendar details: ${error}`);
  }

  const data = await response.json();
  return data.calendar || data;
}

// Update calendar with new teamMembers, activation status, optional rename, and redirect URL
async function updateCalendar(
  calendarId: string, 
  updatePayload: {
    teamMembers?: any[];
    isActive?: boolean;
    name?: string;
    formSubmitRedirectURL?: string;
    formSubmitType?: string;
  },
  accessToken: string
): Promise<boolean> {
  const response = await fetch(`https://services.leadconnectorhq.com/calendars/${calendarId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Version': '2021-04-15',
    },
    body: JSON.stringify(updatePayload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update calendar: ${error}`);
  }

  return true;
}

// Helper to transform calendar name with agent name
function transformCalendarName(originalName: string, agentName: string): string {
  // Remove " Call" suffix if present, then append "| Agent Name"
  // e.g. "IUL Discovery Call" -> "IUL Discovery | John Smith"
  // e.g. "Zoom IUL Overview Call" -> "Zoom IUL Overview | John Smith"
  const baseName = originalName.replace(/\s*Call$/i, '').trim();
  return `${baseName} | ${agentName}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const startTime = Date.now();
  let logEntry: any = {
    request_type: 'assign_user_all_calendars',
    status: 'pending',
  };

  try {
    const { 
      companyId, 
      locationId, 
      userId, 
      agentName, 
      activateCalendars = true,
      discoveryCalendarId,  // Optional: specific calendar to set redirect URL
      confirmationUrl       // Optional: thank you page URL for discovery calendar
    } = await req.json();

    logEntry.company_id = companyId || null;
    logEntry.location_id = locationId || null;

    // Validate required fields
    if (!companyId || !locationId || !userId) {
      logEntry.status = 'error';
      logEntry.error_message = 'companyId, locationId, and userId are required';
      await supabase.from('ghl_api_logs').insert(logEntry);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'companyId, locationId, and userId are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Assigning user ${userId} to all calendars in location ${locationId}`);
    if (agentName) {
      console.log(`Will rename calendars with agent name: ${agentName}`);
    }
    if (activateCalendars) {
      console.log(`Will activate all calendars`);
    }
    if (discoveryCalendarId && confirmationUrl) {
      console.log(`Will set redirect URL on discovery calendar ${discoveryCalendarId}: ${confirmationUrl}`);
    }

    // Get location access token
    const accessToken = await getLocationToken(supabaseUrl, companyId, locationId, supabaseServiceKey);
    console.log('Location token obtained successfully');

    // Fetch all calendars
    const calendars = await fetchCalendars(locationId, accessToken);
    console.log(`Found ${calendars.length} calendars`);

    const updatedCalendars: any[] = [];
    const skippedCalendars: any[] = [];

    // Process each calendar
    for (const calendar of calendars) {
      try {
        console.log(`Processing calendar: ${calendar.name} (${calendar.id})`);

        // Fetch full calendar details
        const calendarDetails = await fetchCalendarDetails(calendar.id, accessToken);
        
        // Check calendar type - skip personal calendars
        const calendarType = calendarDetails.calendarType || calendarDetails.type;
        if (calendarType === 'personal') {
          skippedCalendars.push({
            calendarId: calendar.id,
            name: calendar.name,
            reason: 'Personal calendar - cannot assign team members'
          });
          console.log(`Skipped personal calendar: ${calendar.name}`);
          continue;
        }

        // Get existing team members
        const existingMembers = calendarDetails.teamMembers || [];
        
        // Check if user is already assigned
        const userAlreadyAssigned = existingMembers.some((m: any) => m.userId === userId);
        
        // Build the update payload
        const updatePayload: any = {};
        let needsUpdate = false;
        let updateActions: string[] = [];

        // Add user to team members if not already assigned
        if (!userAlreadyAssigned) {
          updatePayload.teamMembers = [
            ...existingMembers,
            {
              userId: userId,
              priority: 0.5,
              isPrimary: existingMembers.length === 0,
            }
          ];
          needsUpdate = true;
          updateActions.push('assigned user');
        }

        // Activate calendar if requested
        if (activateCalendars && !calendarDetails.isActive) {
          updatePayload.isActive = true;
          needsUpdate = true;
          updateActions.push('activated');
        }

        // Rename calendar if agent name provided
        if (agentName) {
          const newName = transformCalendarName(calendar.name, agentName);
          if (newName !== calendar.name) {
            updatePayload.name = newName;
            needsUpdate = true;
            updateActions.push(`renamed to "${newName}"`);
          }
        }

        // Set redirect URL only on the discovery calendar
        if (discoveryCalendarId && confirmationUrl && calendar.id === discoveryCalendarId) {
          updatePayload.formSubmitType = 'RedirectURL';
          updatePayload.formSubmitRedirectURL = confirmationUrl;
          needsUpdate = true;
          updateActions.push(`redirect URL set`);
        }

        // Skip if no updates needed
        if (!needsUpdate) {
          skippedCalendars.push({
            calendarId: calendar.id,
            name: calendar.name,
            reason: 'No updates needed (user already assigned, calendar active, name unchanged)'
          });
          console.log(`No updates needed for: ${calendar.name}`);
          continue;
        }

        // Update the calendar
        await updateCalendar(calendar.id, updatePayload, accessToken);
        
        updatedCalendars.push({
          calendarId: calendar.id,
          originalName: calendar.name,
          newName: updatePayload.name || calendar.name,
          actions: updateActions,
          updated: true
        });
        console.log(`Successfully updated: ${calendar.name} - ${updateActions.join(', ')}`);

      } catch (calendarError: any) {
        console.error(`Error processing calendar ${calendar.id}:`, calendarError.message);
        skippedCalendars.push({
          calendarId: calendar.id,
          name: calendar.name,
          reason: `Error: ${calendarError.message}`
        });
      }
    }

    const elapsedMs = Date.now() - startTime;
    
    // Log success
    logEntry.status = 'success';
    logEntry.response_data = {
      userId,
      totalCalendars: calendars.length,
      updatedCount: updatedCalendars.length,
      skippedCount: skippedCalendars.length,
      elapsedMs,
    };
    await supabase.from('ghl_api_logs').insert(logEntry);

    const result = {
      success: true,
      locationId,
      userId,
      totalCalendars: calendars.length,
      updatedCalendars,
      skippedCalendars,
    };

    console.log(`Completed: ${updatedCalendars.length} updated, ${skippedCalendars.length} skipped`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in ghl-assign-user-to-all-calendars:', message);

    logEntry.status = 'error';
    logEntry.error_message = message;
    await supabase.from('ghl_api_logs').insert(logEntry);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
