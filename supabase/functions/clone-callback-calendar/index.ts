import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAgencyAccessToken } from '../_shared/ghl-oauth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_COMPANY_ID = '30bFOq4ZtlhKuMOvVPwA';
const GHL_API_VERSION = '2021-04-15';
const SOURCE_LOCATION_ID = 'Uc6b6WyJkSCkydA69OdM'; // James Warren
const SOURCE_CALLBACK_CALENDAR_ID = '7DRohwRVnVUA5QvMOiHN';

async function getLocationToken(supabaseUrl: string, companyId: string, locationId: string, serviceKey: string): Promise<string> {
  const res = await fetch(`${supabaseUrl}/functions/v1/crm-location-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
    body: JSON.stringify({ companyId, locationId }),
  });
  if (!res.ok) throw new Error(`Location token failed: ${await res.text()}`);
  const data = await res.json();
  return data.locationAccessToken;
}

async function fetchCalendarDetails(calendarId: string, accessToken: string): Promise<any> {
  const res = await fetch(`https://services.leadconnectorhq.com/calendars/${calendarId}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${accessToken}`, 'Version': GHL_API_VERSION },
  });
  if (!res.ok) throw new Error(`Fetch calendar failed: ${await res.text()}`);
  const data = await res.json();
  return data.calendar || data;
}

async function fetchAllCalendars(locationId: string, accessToken: string): Promise<any[]> {
  const res = await fetch(`https://services.leadconnectorhq.com/calendars/?locationId=${locationId}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${accessToken}`, 'Version': GHL_API_VERSION },
  });
  if (!res.ok) throw new Error(`Fetch calendars failed: ${await res.text()}`);
  const data = await res.json();
  return data.calendars || [];
}

async function createCalendar(locationId: string, payload: any, accessToken: string): Promise<any> {
  const res = await fetch(`https://services.leadconnectorhq.com/calendars/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${accessToken}`, 'Version': GHL_API_VERSION },
    body: JSON.stringify({ ...payload, locationId }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Create calendar failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  return data.calendar || data;
}

async function updateCalendar(calendarId: string, payload: any, accessToken: string): Promise<void> {
  const res = await fetch(`https://services.leadconnectorhq.com/calendars/${calendarId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${accessToken}`, 'Version': GHL_API_VERSION },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Update calendar failed (${res.status}): ${err}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;
    const onlyClientId = body.client_id || null; // optional: process one agent only

    // 1. Get source calendar template from James Warren's subaccount
    console.log('[Clone] Fetching source callback calendar template...');
    const sourceToken = await getLocationToken(supabaseUrl, GHL_COMPANY_ID, SOURCE_LOCATION_ID, supabaseKey);
    const sourceCalendar = await fetchCalendarDetails(SOURCE_CALLBACK_CALENDAR_ID, sourceToken);
    console.log(`[Clone] Source calendar: "${sourceCalendar.name}", type: ${sourceCalendar.calendarType}`);

    // 2. Get all active agents (excluding own-CRM and Sierra who has no subaccount)
    let query = supabase
      .from('clients')
      .select('id, name, agent_id, subaccount_id, ghl_user_id, callback_calendar_id, discovery_calendar_id, use_own_crm')
      .eq('status', 'active')
      .eq('use_own_crm', false)
      .not('subaccount_id', 'is', null)
      .not('ghl_user_id', 'is', null);

    if (onlyClientId) {
      query = query.eq('id', onlyClientId);
    }

    const { data: agents, error: agentsError } = await query;
    if (agentsError) throw new Error(`Failed to fetch agents: ${agentsError.message}`);

    console.log(`[Clone] Processing ${agents?.length || 0} agents`);

    const results: any[] = [];

    for (const agent of agents || []) {
      const result: any = { name: agent.name, agent_id: agent.agent_id, subaccount_id: agent.subaccount_id };

      try {
        // Skip James Warren (source) — he already has it
        if (agent.subaccount_id === SOURCE_LOCATION_ID) {
          // Just store the existing callback calendar ID
          if (!agent.callback_calendar_id) {
            await supabase.from('clients').update({ callback_calendar_id: SOURCE_CALLBACK_CALENDAR_ID }).eq('id', agent.id);
          }
          result.status = 'skipped';
          result.reason = 'Source agent — already has callback calendar';
          result.callback_calendar_id = SOURCE_CALLBACK_CALENDAR_ID;
          results.push(result);
          continue;
        }

        // Check if agent already has a callback calendar
        if (agent.callback_calendar_id) {
          result.status = 'skipped';
          result.reason = 'Already has callback_calendar_id';
          result.callback_calendar_id = agent.callback_calendar_id;
          results.push(result);
          continue;
        }

        // Get location token for this agent's subaccount
        const agentToken = await getLocationToken(supabaseUrl, GHL_COMPANY_ID, agent.subaccount_id, supabaseKey);

        // Check if a callback calendar already exists
        const existingCalendars = await fetchAllCalendars(agent.subaccount_id, agentToken);
        const existingCallback = existingCalendars.find((c: any) =>
          c.name && (c.name.toLowerCase().includes('callback') || c.name.toLowerCase().includes('call back'))
        );

        if (existingCallback) {
          // Already exists — just assign agent and save ID
          console.log(`[Clone] ${agent.name}: callback calendar already exists (${existingCallback.id}), assigning agent`);

          if (!dryRun) {
            // Assign agent to existing calendar
            const calDetails = await fetchCalendarDetails(existingCallback.id, agentToken);
            const teamMembers = calDetails.teamMembers || [];
            const alreadyAssigned = teamMembers.some((tm: any) => tm.userId === agent.ghl_user_id);

            if (!alreadyAssigned) {
              teamMembers.push({
                userId: agent.ghl_user_id,
                priority: 0.5,
                meetingLocationType: 'phone',
                meetingLocation: '',
                isPrimary: teamMembers.length === 0,
              });
              await updateCalendar(existingCallback.id, { teamMembers, isActive: true }, agentToken);
            }

            await supabase.from('clients').update({ callback_calendar_id: existingCallback.id }).eq('id', agent.id);
          }

          result.status = 'existing';
          result.callback_calendar_id = existingCallback.id;
          results.push(result);
          continue;
        }

        // Create new callback calendar from template
        console.log(`[Clone] ${agent.name}: creating callback calendar...`);

        if (dryRun) {
          result.status = 'dry_run';
          result.would_create = true;
          results.push(result);
          continue;
        }

        // Build create payload from source calendar (personal type, uses user availability)
        const calendarName = `Callback | ${agent.name}`;
        const createPayload: any = {
          name: calendarName,
          calendarType: 'personal',
          description: sourceCalendar.description || 'Callback scheduling calendar',
          slotDuration: sourceCalendar.slotDuration || 10,
          slotBuffer: sourceCalendar.slotBuffer || 0,
          slotInterval: sourceCalendar.slotInterval || 30,
          preBuffer: sourceCalendar.preBuffer || 0,
          appoinmentPerSlot: sourceCalendar.appoinmentPerSlot || 1,
          appoinmentPerDay: sourceCalendar.appoinmentPerDay || 0,
          isActive: true,
          teamMembers: [{
            userId: agent.ghl_user_id,
            priority: 0.5,
            meetingLocationType: 'phone',
            meetingLocation: '',
            isPrimary: true,
          }],
        };

        const newCalendar = await createCalendar(agent.subaccount_id, createPayload, agentToken);
        const newCalId = newCalendar.id || newCalendar._id;

        console.log(`[Clone] ${agent.name}: callback calendar created (${newCalId})`);

        // Save to client record
        await supabase.from('clients').update({ callback_calendar_id: newCalId }).eq('id', agent.id);

        result.status = 'created';
        result.callback_calendar_id = newCalId;
        results.push(result);

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));

      } catch (err: any) {
        console.error(`[Clone] ${agent.name}: ERROR:`, err.message);
        result.status = 'error';
        result.error = err.message;
        results.push(result);
      }
    }

    const created = results.filter(r => r.status === 'created').length;
    const existing = results.filter(r => r.status === 'existing').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;

    console.log(`[Clone] Done: ${created} created, ${existing} existing, ${skipped} skipped, ${errors} errors`);

    return new Response(JSON.stringify({
      ok: true,
      summary: { total: results.length, created, existing, skipped, errors },
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[Clone] Fatal error:', err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
