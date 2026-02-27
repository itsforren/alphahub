import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RouterIssue {
  clientId: string;
  clientName: string;
  agentId: string | null;
  issues: string[];
  severity: 'error' | 'warning';
  failedLeadsLast24h: number;
  pendingLeadsLast24h: number;
}

interface StuckLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  agent_id: string;
  delivery_status: string;
  created_at: string;
  delivery_error: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('=== LEAD ROUTER HEALTH CHECK ===');
    console.log('Starting lead router health check...');

    // Get all active clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, agent_id, subaccount_id, ghl_user_id, crm_delivery_enabled, status')
      .eq('status', 'active');

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    console.log(`Checking ${clients?.length || 0} active clients...`);

    // Get leads from last 24 hours to check delivery status
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: recentLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email, agent_id, delivery_status, delivery_error, created_at')
      .gte('created_at', yesterday.toISOString());

    if (leadsError) {
      console.error('Failed to fetch recent leads:', leadsError);
    }

    // === RED ALARM: Check for stuck leads (pending > 30 minutes) ===
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

    const stuckLeads: StuckLead[] = (recentLeads || []).filter(lead => {
      if (lead.delivery_status === 'pending' || lead.delivery_status === 'retrying') {
        const leadTime = new Date(lead.created_at);
        return leadTime < thirtyMinutesAgo;
      }
      return false;
    }) as StuckLead[];

    if (stuckLeads.length > 0) {
      console.log(`🚨 RED ALARM: ${stuckLeads.length} leads stuck in pending/retrying > 30 minutes`);
      
      // Create critical alert for stuck leads
      const stuckLeadDetails = stuckLeads.slice(0, 10).map(l => ({
        id: l.id,
        name: `${l.first_name} ${l.last_name}`,
        email: l.email,
        status: l.delivery_status,
        created_at: l.created_at,
      }));

      await supabase.from('system_alerts').insert({
        alert_type: 'stuck_leads',
        severity: 'high',
        title: `🚨 ${stuckLeads.length} Lead(s) Stuck in Delivery Queue`,
        message: `Leads are stuck in pending/retrying status for over 30 minutes. Immediate attention required.`,
        details: stuckLeadDetails,
      });
    }

    // === RED ALARM: Check for failed lead spikes (> 3 failures in last hour) ===
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const recentFailures = (recentLeads || []).filter(lead => {
      if (lead.delivery_status === 'failed' || lead.delivery_status === 'failed_permanent') {
        const leadTime = new Date(lead.created_at);
        return leadTime > oneHourAgo;
      }
      return false;
    });

    if (recentFailures.length >= 3) {
      console.log(`🚨 RED ALARM: ${recentFailures.length} delivery failures in the last hour`);

      // Check if we already have an unacknowledged alert for this
      const { data: existingSpike } = await supabase
        .from('system_alerts')
        .select('id')
        .eq('alert_type', 'delivery_failure_spike')
        .gte('created_at', oneHourAgo.toISOString())
        .is('acknowledged_at', null)
        .single();

      if (!existingSpike) {
        const failedLeadDetails = recentFailures.slice(0, 10).map(l => ({
          id: l.id,
          name: `${l.first_name} ${l.last_name}`,
          email: l.email,
          error: l.delivery_error,
        }));

        await supabase.from('system_alerts').insert({
          alert_type: 'delivery_failure_spike',
          severity: 'high',
          title: `🚨 Delivery Failure Spike: ${recentFailures.length} failed in last hour`,
          message: `Multiple lead delivery failures detected. Check GHL OAuth connection and client configurations.`,
          details: failedLeadDetails,
        });
      }
    }

    // Aggregate lead issues by agent
    const leadIssuesByAgent: Record<string, { failed: number; pending: number; errors: string[] }> = {};
    for (const lead of recentLeads || []) {
      if (!lead.agent_id) continue;
      if (!leadIssuesByAgent[lead.agent_id]) {
        leadIssuesByAgent[lead.agent_id] = { failed: 0, pending: 0, errors: [] };
      }
      if (lead.delivery_status === 'failed' || lead.delivery_status === 'failed_permanent') {
        leadIssuesByAgent[lead.agent_id].failed++;
        if (lead.delivery_error && !leadIssuesByAgent[lead.agent_id].errors.includes(lead.delivery_error)) {
          leadIssuesByAgent[lead.agent_id].errors.push(lead.delivery_error);
        }
      } else if (lead.delivery_status === 'pending') {
        leadIssuesByAgent[lead.agent_id].pending++;
      }
    }

    const routerIssues: RouterIssue[] = [];

    for (const client of clients || []) {
      const issues: string[] = [];
      let severity: 'error' | 'warning' = 'warning';

      // Check router configuration
      if (!client.agent_id) {
        issues.push('Missing Agent ID - leads cannot be routed');
        severity = 'error';
      }
      if (!client.subaccount_id) {
        issues.push('Missing Subaccount ID - leads cannot be delivered to GHL');
        severity = 'error';
      }
      if (!client.ghl_user_id) {
        issues.push('Missing GHL User ID - leads will not be auto-assigned');
      }
      if (client.crm_delivery_enabled === false) {
        issues.push('CRM delivery is disabled');
      }

      // Check for delivery failures
      const agentLeadIssues = client.agent_id ? leadIssuesByAgent[client.agent_id] : null;
      const failedLeads = agentLeadIssues?.failed || 0;
      const pendingLeads = agentLeadIssues?.pending || 0;

      if (failedLeads > 0) {
        issues.push(`${failedLeads} lead(s) failed delivery in last 24h`);
        if (agentLeadIssues?.errors.length) {
          issues.push(`Errors: ${agentLeadIssues.errors.slice(0, 2).join('; ')}`);
        }
        severity = 'error';
      }

      if (pendingLeads > 3) {
        issues.push(`${pendingLeads} lead(s) stuck in pending status`);
        if (severity !== 'error') severity = 'warning';
      }

      // Only add to issues list if there are actual problems
      if (issues.length > 0 && client.crm_delivery_enabled !== false) {
        routerIssues.push({
          clientId: client.id,
          clientName: client.name,
          agentId: client.agent_id,
          issues,
          severity,
          failedLeadsLast24h: failedLeads,
          pendingLeadsLast24h: pendingLeads,
        });
      }
    }

    console.log(`Found ${routerIssues.length} clients with router issues`);

    // Create system alerts for critical issues
    const criticalIssues = routerIssues.filter(r => r.severity === 'error');
    
    if (criticalIssues.length > 0) {
      // Check if we already have an unacknowledged alert for today
      const today = new Date().toISOString().split('T')[0];
      const { data: existingAlert } = await supabase
        .from('system_alerts')
        .select('id')
        .eq('alert_type', 'lead_router_health')
        .gte('created_at', today)
        .is('acknowledged_at', null)
        .single();

      if (!existingAlert) {
        const alertDetails = criticalIssues.map(i => ({
          clientName: i.clientName,
          issues: i.issues,
          failedLeads: i.failedLeadsLast24h,
        }));

        await supabase.from('system_alerts').insert({
          alert_type: 'lead_router_health',
          severity: 'high',
          title: `Lead Router Issues: ${criticalIssues.length} agent(s) need attention`,
          message: criticalIssues.map(i => `${i.clientName}: ${i.issues[0]}`).join('\n'),
          details: alertDetails,
        });

        console.log('Created system alert for lead router issues');
      } else {
        console.log('System alert already exists for today');
      }
    }

    // Return detailed results
    return new Response(
      JSON.stringify({
        success: true,
        checkedAt: new Date().toISOString(),
        totalClients: clients?.length || 0,
        issuesFound: routerIssues.length,
        criticalIssues: criticalIssues.length,
        stuckLeads: stuckLeads.length,
        recentFailures: recentFailures.length,
        issues: routerIssues,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Lead router health check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
