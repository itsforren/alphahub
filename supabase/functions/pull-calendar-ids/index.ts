import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_COMPANY_ID = '30bFOq4ZtlhKuMOvVPwA';

async function getLocationToken(supabaseUrl: string, locationId: string, serviceKey: string): Promise<string> {
  const res = await fetch(`${supabaseUrl}/functions/v1/crm-location-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
    body: JSON.stringify({ companyId: GHL_COMPANY_ID, locationId }),
  });
  if (!res.ok) throw new Error(`Token failed: ${await res.text()}`);
  return (await res.json()).locationAccessToken;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: agents } = await supabase
      .from('clients')
      .select('id, name, subaccount_id, strategy_calendar_id, use_own_crm')
      .eq('status', 'active')
      .eq('use_own_crm', false)
      .not('subaccount_id', 'is', null);

    const results: any[] = [];

    for (const agent of agents || []) {
      const result: any = { name: agent.name };

      try {
        if (agent.strategy_calendar_id) {
          result.status = 'skipped';
          result.strategy_calendar_id = agent.strategy_calendar_id;
          results.push(result);
          continue;
        }

        const token = await getLocationToken(supabaseUrl, agent.subaccount_id, supabaseKey);
        const res = await fetch(`https://services.leadconnectorhq.com/calendars/?locationId=${agent.subaccount_id}`, {
          headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}`, 'Version': '2021-04-15' },
        });
        if (!res.ok) throw new Error(`Fetch calendars: ${res.status}`);
        const cals = (await res.json()).calendars || [];

        // Find Zoom/Strategy calendar — match "zoom", "strategy", or "overview"
        const zoomCal = cals.find((c: any) => {
          const name = (c.name || '').toLowerCase();
          return name.includes('zoom') || name.includes('strategy') || name.includes('overview');
        });

        if (zoomCal) {
          await supabase.from('clients').update({ strategy_calendar_id: zoomCal.id }).eq('id', agent.id);
          result.status = 'found';
          result.strategy_calendar_id = zoomCal.id;
          result.calendar_name = zoomCal.name;
        } else {
          result.status = 'not_found';
          result.available = cals.map((c: any) => ({ id: c.id, name: c.name }));
        }

        results.push(result);
        await new Promise(r => setTimeout(r, 300));
      } catch (err: any) {
        result.status = 'error';
        result.error = err.message;
        results.push(result);
      }
    }

    const found = results.filter(r => r.status === 'found').length;
    const notFound = results.filter(r => r.status === 'not_found').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;

    return new Response(JSON.stringify({
      ok: true,
      summary: { total: results.length, found, not_found: notFound, skipped, errors },
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
