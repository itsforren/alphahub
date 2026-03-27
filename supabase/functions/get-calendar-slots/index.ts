import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getLocationToken(
  supabaseUrl: string, companyId: string, locationId: string, serviceKey: string
): Promise<string> {
  const res = await fetch(`${supabaseUrl}/functions/v1/crm-location-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
    body: JSON.stringify({ companyId, locationId }),
  });
  if (!res.ok) throw new Error(`Token error: ${await res.text()}`);
  const data = await res.json();
  return data.locationAccessToken;
}

// Find a calendar by type (discovery or strategy)
async function findCalendar(
  locationId: string, token: string, calendarType: 'discovery' | 'strategy'
): Promise<{ id: string; name: string } | null> {
  const res = await fetch(
    `https://services.leadconnectorhq.com/calendars/?locationId=${locationId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Version': '2021-04-15',
      },
    }
  );
  if (!res.ok) throw new Error(`Failed to fetch calendars: ${await res.text()}`);
  const data = await res.json();
  const calendars = data.calendars || [];

  if (calendarType === 'discovery') {
    // Match "IUL Discovery Call" or "Discovery Call"
    const match = calendars.find((c: any) =>
      c.name.toLowerCase().includes('discovery')
    );
    return match ? { id: match.id, name: match.name } : null;
  } else if (calendarType === 'callback') {
    // Match "Callback" calendar
    const match = calendars.find((c: any) =>
      c.name.toLowerCase().includes('callback')
    );
    return match ? { id: match.id, name: match.name } : null;
  } else {
    // Match "Strategy Call", "Zoom Call", "Intro Call" for strategy
    const keywords = ['strategy', 'zoom', 'consultation'];
    const match = calendars.find((c: any) =>
      keywords.some(k => c.name.toLowerCase().includes(k))
    );
    return match ? { id: match.id, name: match.name } : null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { agent_id, calendar_type, calendar_id, start_date, end_date, timezone } = await req.json();

    if (!agent_id || !calendar_type) {
      return new Response(
        JSON.stringify({ error: 'Missing agent_id or calendar_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client's subaccount
    const { data: client } = await supabase
      .from('clients')
      .select('subaccount_id')
      .eq('agent_id', agent_id)
      .single();

    if (!client?.subaccount_id) {
      throw new Error('Client subaccount not found');
    }

    // Get company ID
    const { data: tokenData } = await supabase
      .from('ghl_oauth_tokens')
      .select('company_id')
      .limit(1)
      .single();

    if (!tokenData?.company_id) throw new Error('No GHL OAuth token');

    const locationToken = await getLocationToken(
      supabaseUrl, tokenData.company_id, client.subaccount_id, serviceKey
    );

    // Find the right calendar — use direct ID if provided, otherwise search by type
    let calendar: { id: string; name: string } | null = null;
    if (calendar_id) {
      calendar = { id: calendar_id, name: calendar_type };
      console.log(`Using direct calendar ID: ${calendar_id}`);
    } else {
      calendar = await findCalendar(client.subaccount_id, locationToken, calendar_type);
    }

    if (!calendar) {
      return new Response(
        JSON.stringify({ error: `No ${calendar_type} calendar found`, slots: [] }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch free slots — GHL expects epoch milliseconds
    const startMs = start_date
      ? new Date(start_date).getTime()
      : Date.now();
    const endMs = end_date
      ? new Date(end_date).getTime()
      : Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 days ahead

    const tz = timezone || 'America/New_York';
    const slotsUrl = `https://services.leadconnectorhq.com/calendars/${calendar.id}/free-slots?startDate=${startMs}&endDate=${endMs}&timezone=${encodeURIComponent(tz)}`;
    const slotsRes = await fetch(slotsUrl, {
      headers: {
        'Authorization': `Bearer ${locationToken}`,
        'Accept': 'application/json',
        'Version': '2021-04-15',
      },
    });

    if (!slotsRes.ok) {
      const err = await slotsRes.text();
      console.error('Free slots error:', err);
      throw new Error(`Failed to fetch slots: ${err}`);
    }

    const slotsData = await slotsRes.json();

    // slotsData is typically { [date]: { slots: [{ slot: "ISO string" }] } }
    // Flatten into a simple array grouped by date
    const slotsByDate: { date: string; slots: string[] }[] = [];

    for (const [date, value] of Object.entries(slotsData)) {
      if (date.startsWith('_')) continue; // skip metadata keys
      const daySlots = (value as any)?.slots || [];
      if (daySlots.length > 0) {
        slotsByDate.push({
          date,
          slots: daySlots.map((s: any) => s.slot || s),
        });
      }
    }

    return new Response(
      JSON.stringify({
        calendar_id: calendar.id,
        calendar_name: calendar.name,
        calendar_type,
        slots_by_date: slotsByDate,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('get-calendar-slots error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
