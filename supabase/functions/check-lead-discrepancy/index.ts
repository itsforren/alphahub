import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function postAdsManagerWebhook(payload: unknown): Promise<void> {
  const webhookUrl = Deno.env.get('SLACK_ADS_MANAGER_WEBHOOK_URL');
  if (!webhookUrl) return;
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const raw = await res.text();
      throw new Error(`Ads Manager webhook failed [${res.status}]: ${raw.slice(0, 500)}`);
    }
  } catch (e) {
    console.error('Failed to post Ads Manager Slack webhook:', e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Checking for lead discrepancies...');
    
    // Get the current month's date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    // Get all active clients with Google Ads campaigns
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, agent_id, google_campaign_id, crm_delivery_enabled')
      .eq('status', 'active')
      .not('google_campaign_id', 'is', null)
      .not('agent_id', 'is', null);

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    console.log(`Found ${clients?.length || 0} clients with Google Ads campaigns`);

    const discrepancies: Array<{
      clientId: string;
      clientName: string;
      googleConversions: number;
      actualLeads: number;
      difference: number;
    }> = [];

    for (const client of clients || []) {
      // Get Google Ads conversions for this month
      const { data: adSpendData, error: adSpendError } = await supabase
        .from('ad_spend_daily')
        .select('conversions')
        .eq('client_id', client.id)
        .gte('spend_date', startOfMonth.toISOString().split('T')[0])
        .lte('spend_date', endOfMonth.toISOString().split('T')[0]);

      if (adSpendError) {
        console.error(`Failed to fetch ad spend for ${client.name}:`, adSpendError);
        continue;
      }

      const googleConversions = adSpendData?.reduce((sum, day) => sum + (day.conversions || 0), 0) || 0;

      // Get actual leads delivered this month
      const { count: actualLeads, error: leadsError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', client.agent_id)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (leadsError) {
        console.error(`Failed to fetch leads for ${client.name}:`, leadsError);
        continue;
      }

      const difference = googleConversions - (actualLeads || 0);

      // Alert if discrepancy is 2 or more leads
      if (difference >= 2) {
        discrepancies.push({
          clientId: client.id,
          clientName: client.name,
          googleConversions,
          actualLeads: actualLeads || 0,
          difference,
        });

        console.log(`⚠️ Discrepancy found for ${client.name}: Google=${googleConversions}, Actual=${actualLeads}, Diff=${difference}`);
      }
    }

    // Create alerts for discrepancies
    if (discrepancies.length > 0) {
      const alertsToInsert = discrepancies.map(d => ({
        alert_type: 'lead_discrepancy',
        title: `Lead Discrepancy: ${d.clientName}`,
        message: `Google Ads shows ${d.googleConversions} conversions but only ${d.actualLeads} leads received. Missing ${d.difference} leads.`,
        severity: d.difference >= 5 ? 'critical' : 'warning',
        metadata: {
          client_id: d.clientId,
          client_name: d.clientName,
          google_conversions: d.googleConversions,
          actual_leads: d.actualLeads,
          difference: d.difference,
          checked_at: new Date().toISOString(),
        },
      }));

      const { error: insertError } = await supabase
        .from('system_alerts')
        .insert(alertsToInsert);

      if (insertError) {
        console.error('Failed to insert alerts:', insertError);
      } else {
        console.log(`Created ${alertsToInsert.length} discrepancy alerts`);

        // Slack feed (summary + top 5)
        await postAdsManagerWebhook({
          text: `🔍 Lead discrepancy alerts: ${discrepancies.length}`,
          blocks: [
            { type: 'header', text: { type: 'plain_text', text: '🔍 Lead Discrepancy Detected' } },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text:
                  `Found *${discrepancies.length}* client(s) where Google conversions exceed received leads by 2+.\n\n` +
                  discrepancies
                    .slice(0, 5)
                    .map((d) => `• *${d.clientName}*: Google ${d.googleConversions} vs Leads ${d.actualLeads} (missing ${d.difference})`)
                    .join('\n'),
              },
            },
          ],
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        clientsChecked: clients?.length || 0,
        discrepanciesFound: discrepancies.length,
        discrepancies,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error checking lead discrepancies:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: 'Failed to check discrepancies', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
