import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get Eastern timezone date string
function getEasternYesterday(): string {
  const now = new Date();
  const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  eastern.setDate(eastern.getDate() - 1);
  return eastern.toISOString().split('T')[0];
}

function get7DayRange(baseDate: string): { start: string; end: string; priorStart: string; priorEnd: string } {
  const base = new Date(baseDate);
  
  const start = new Date(base);
  start.setDate(start.getDate() - 6);
  
  const priorEnd = new Date(start);
  priorEnd.setDate(priorEnd.getDate() - 1);
  
  const priorStart = new Date(priorEnd);
  priorStart.setDate(priorStart.getDate() - 6);
  
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  
  return {
    start: fmt(start),
    end: baseDate,
    priorStart: fmt(priorStart),
    priorEnd: fmt(priorEnd),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('📊 Starting KPI Aggregation Job...');

    const yesterday = getEasternYesterday();
    const range = get7DayRange(yesterday);
    
    console.log(`Date: ${yesterday}, 7d range: ${range.start} to ${range.end}`);

    // Get all active clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, agent_id, name')
      .is('deleted_at', null)
      .eq('status', 'active');

    if (clientsError) throw clientsError;
    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No active clients' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${clients.length} clients...`);

    for (const client of clients) {
      try {
        // Get ad spend for yesterday
        const { data: adSpendYesterday } = await supabase
          .from('ad_spend_daily')
          .select('cost, clicks, conversions')
          .eq('client_id', client.id)
          .eq('spend_date', yesterday)
          .maybeSingle();

        const adSpend = Number(adSpendYesterday?.cost || 0);
        const clicks = Number(adSpendYesterday?.clicks || 0);
        const conversions = Number(adSpendYesterday?.conversions || 0);

        // Get leads for yesterday from leads table
        const { data: leadsYesterday } = await supabase
          .from('leads')
          .select('id, booked_call_at, status, submitted_at, issued_at')
          .eq('agent_id', client.agent_id || '')
          .gte('created_at', yesterday)
          .lt('created_at', yesterday + 'T23:59:59');

        const leadsArr = leadsYesterday || [];
        const leads = leadsArr.length;
        const bookedCalls = leadsArr.filter(l => l.booked_call_at).length;
        const appsSubmitted = leadsArr.filter(l => l.status === 'submitted' || l.submitted_at).length;
        const approvals = leadsArr.filter(l => l.status === 'approved').length;
        const declines = leadsArr.filter(l => l.status === 'declined').length;
        const issuedPaid = leadsArr.filter(l => l.status === 'issued paid' || l.issued_at).length;

        // Calculate rates
        const bookedRate = leads > 0 ? (bookedCalls / leads) * 100 : null;
        const appRate = bookedCalls > 0 ? (appsSubmitted / bookedCalls) * 100 : null;
        const issuedRate = appsSubmitted > 0 ? (issuedPaid / appsSubmitted) * 100 : null;

        // Calculate cost metrics
        const cpl = leads > 0 ? adSpend / leads : null;
        const cpbc = bookedCalls > 0 ? adSpend / bookedCalls : null;
        const cpsa = appsSubmitted > 0 ? adSpend / appsSubmitted : null;
        const cpIssuedPaid = issuedPaid > 0 ? adSpend / issuedPaid : null;

        // Upsert daily KPI
        await supabase
          .from('client_kpi_daily')
          .upsert({
            client_id: client.id,
            date: yesterday,
            leads,
            booked_calls: bookedCalls,
            shows: 0, // TODO: Add shows tracking when available
            apps_submitted: appsSubmitted,
            approvals,
            declines,
            issued_paid: issuedPaid,
            ad_spend: adSpend,
            clicks,
            conversions,
            booked_rate: bookedRate,
            app_rate: appRate,
            issued_rate: issuedRate,
            cpl,
            cpbc,
            cpsa,
            cp_issued_paid: cpIssuedPaid,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'client_id,date' });

        // Calculate 7-day rolling metrics
        const { data: last7dData } = await supabase
          .from('client_kpi_daily')
          .select('*')
          .eq('client_id', client.id)
          .gte('date', range.start)
          .lte('date', range.end);

        const { data: prior7dData } = await supabase
          .from('client_kpi_daily')
          .select('*')
          .eq('client_id', client.id)
          .gte('date', range.priorStart)
          .lte('date', range.priorEnd);

        const sum7d = (arr: typeof last7dData, field: string) => 
          (arr || []).reduce((s, r) => s + (Number((r as Record<string, unknown>)[field]) || 0), 0);

        const leads7d = sum7d(last7dData, 'leads');
        const bookedCalls7d = sum7d(last7dData, 'booked_calls');
        const appsSubmitted7d = sum7d(last7dData, 'apps_submitted');
        const issuedPaid7d = sum7d(last7dData, 'issued_paid');
        const adSpend7d = sum7d(last7dData, 'ad_spend');

        const leadsPrior7d = sum7d(prior7dData, 'leads');
        const bookedCallsPrior7d = sum7d(prior7dData, 'booked_calls');
        const adSpendPrior7d = sum7d(prior7dData, 'ad_spend');

        const bookedRate7d = leads7d > 0 ? (bookedCalls7d / leads7d) * 100 : null;
        const cpbc7d = bookedCalls7d > 0 ? adSpend7d / bookedCalls7d : null;
        const cpsa7d = appsSubmitted7d > 0 ? adSpend7d / appsSubmitted7d : null;
        const cpIssuedPaid7d = issuedPaid7d > 0 ? adSpend7d / issuedPaid7d : null;

        const bookedRatePrior7d = leadsPrior7d > 0 ? (bookedCallsPrior7d / leadsPrior7d) * 100 : null;
        const cpbcPrior7d = bookedCallsPrior7d > 0 ? adSpendPrior7d / bookedCallsPrior7d : null;

        const bookedRateDelta = bookedRate7d !== null && bookedRatePrior7d !== null 
          ? bookedRate7d - bookedRatePrior7d 
          : null;
        const cpbcDelta = cpbc7d !== null && cpbcPrior7d !== null 
          ? cpbc7d - cpbcPrior7d 
          : null;

        // Upsert rolling KPI
        await supabase
          .from('client_kpi_rolling')
          .upsert({
            client_id: client.id,
            snapshot_date: yesterday,
            leads_7d: leads7d,
            booked_calls_7d: bookedCalls7d,
            apps_submitted_7d: appsSubmitted7d,
            issued_paid_7d: issuedPaid7d,
            ad_spend_7d: adSpend7d,
            booked_rate_7d: bookedRate7d,
            cpbc_7d: cpbc7d,
            cpsa_7d: cpsa7d,
            cp_issued_paid_7d: cpIssuedPaid7d,
            leads_prior_7d: leadsPrior7d,
            booked_calls_prior_7d: bookedCallsPrior7d,
            ad_spend_prior_7d: adSpendPrior7d,
            cpbc_prior_7d: cpbcPrior7d,
            booked_rate_delta: bookedRateDelta,
            cpbc_delta: cpbcDelta,
          }, { onConflict: 'client_id,snapshot_date' });

        // Update campaigns table with downstream metrics
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('id')
          .eq('client_id', client.id)
          .maybeSingle();

        if (campaign) {
          await supabase
            .from('campaigns')
            .update({
              cpbc_7d: cpbc7d,
              cpsa_7d: cpsa7d,
              cp_issued_paid_7d: cpIssuedPaid7d,
              apps_submitted_7d: appsSubmitted7d,
              issued_paid_7d: issuedPaid7d,
              updated_at: new Date().toISOString(),
            })
            .eq('id', campaign.id);
        }

        console.log(`  ✓ ${client.name}: leads=${leads7d}, booked=${bookedCalls7d}, apps=${appsSubmitted7d}, issued=${issuedPaid7d}`);
      } catch (error) {
        console.error(`  ✗ Error processing ${client.name}:`, error);
      }
    }

    console.log('✅ KPI Aggregation complete');

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Processed ${clients.length} clients`,
      date: yesterday,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ KPI Aggregation failed:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
