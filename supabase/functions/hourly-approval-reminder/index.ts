import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if we're in quiet hours (Eastern timezone)
    const now = new Date();
    const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const easternHour = eastern.getHours();

    // Get settings for quiet hours
    const { data: settings } = await supabase
      .from('campaign_settings')
      .select('reminder_quiet_hours_start, reminder_quiet_hours_end, slack_webhook_url')
      .is('campaign_id', null)
      .single();

    const quietStart = settings?.reminder_quiet_hours_start ?? 22; // 10pm
    const quietEnd = settings?.reminder_quiet_hours_end ?? 8; // 8am
    const slackWebhook = settings?.slack_webhook_url;

    // Check if in quiet hours
    const inQuietHours = easternHour >= quietStart || easternHour < quietEnd;
    
    if (inQuietHours) {
      console.log(`⏰ In quiet hours (${quietStart}:00-${quietEnd}:00 ET), skipping reminder`);
      return new Response(JSON.stringify({
        success: true,
        message: 'Skipped - quiet hours',
        easternHour,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get pending proposals
    const { data: proposals, error } = await supabase
      .from('proposals')
      .select(`
        id, proposed_action_type, proposed_daily_budget, current_daily_budget,
        delta_pct, reason_codes, recommendation_confidence, created_at,
        clients!inner(name),
        campaigns!inner(status, health_score)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!proposals || proposals.length === 0) {
      console.log('✅ No pending proposals');
      return new Response(JSON.stringify({
        success: true,
        message: 'No pending proposals',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📬 Found ${proposals.length} pending proposals, sending reminder...`);

    // Build batched reminder message
    const lines = [`⏰ **${proposals.length} Pending Approval${proposals.length > 1 ? 's' : ''}**\n`];

    for (const p of proposals) {
      const deltaStr = p.delta_pct > 0 ? `+${p.delta_pct.toFixed(1)}%` : `${p.delta_pct.toFixed(1)}%`;
      const confidence = p.recommendation_confidence 
        ? `${(p.recommendation_confidence * 100).toFixed(0)}%` 
        : 'N/A';
      // Handle the joined data - campaigns and clients come as arrays from the join
      const campaignData = p.campaigns as unknown;
      const clientData = p.clients as unknown;
      const campaign = Array.isArray(campaignData) ? campaignData[0] : campaignData;
      const client = Array.isArray(clientData) ? clientData[0] : clientData;
      const status = (campaign as { status?: string })?.status?.toUpperCase() || 'UNKNOWN';
      const healthScore = (campaign as { health_score?: number })?.health_score || 'N/A';
      const clientName = (client as { name?: string })?.name || 'Unknown';
      
      lines.push(
        `• **${clientName}** | ${status} | Health: ${healthScore} | ` +
        `$${p.current_daily_budget?.toFixed(2)} → $${p.proposed_daily_budget?.toFixed(2)} (${deltaStr}) | ` +
        `Confidence: ${confidence}`
      );
    }

    lines.push(`\n👉 Review and approve in the Campaign Command Center`);

    const message = lines.join('\n');

    // Post to team chat
    try {
      await supabase.from('admin_channel_messages').insert({
        channel_id: '00000000-0000-0000-0000-000000000001',
        sender_id: '00000000-0000-0000-0000-000000000000',
        message,
      });
      console.log('Posted reminder to team chat');
    } catch (chatError) {
      console.error('Failed to post to team chat:', chatError);
    }

    // Post to Slack if configured
    if (slackWebhook) {
      try {
        await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message.replace(/\*\*/g, '*') }),
        });
        console.log('Posted reminder to Slack');
      } catch (slackError) {
        console.error('Failed to post to Slack:', slackError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      pendingCount: proposals.length,
      message: 'Reminder sent',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in hourly-approval-reminder:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
