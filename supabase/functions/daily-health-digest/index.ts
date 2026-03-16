/**
 * daily-health-digest: Generates a daily billing health summary.
 *
 * Gathers 6 key metrics:
 * 1. Today's charges (count + total amount)
 * 2. Client health status (clean/warning/problem counts from billing_records)
 * 3. Safe mode count (clients with safe_mode_active=true)
 * 4. Stale charging records (stuck >4h)
 * 5. Sync function health (functions with consecutive_failures > 0)
 * 6. System alerts in last 24h (by severity)
 *
 * Delivers via:
 * - system_alerts (always, via notify())
 * - Slack (rich blocks if SLACK_BILLING_WEBHOOK_URL configured)
 *
 * Invokable via HTTP for on-demand use. Cron scheduling via pg_cron deferred to Phase 10.
 *
 * Auth: BILLING_EDGE_SECRET or service role JWT (same pattern as other billing functions).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notify } from '../_shared/notifications.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-billing-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: Require BILLING_EDGE_SECRET or service role JWT
  const billingSecret = Deno.env.get('BILLING_EDGE_SECRET');
  const providedSecret = req.headers.get('x-billing-secret');
  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const isServiceRole = authHeader === `Bearer ${serviceKey}`;
  const hasValidSecret = billingSecret && providedSecret === billingSecret;

  if (!isServiceRole && !hasValidSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    console.log('[daily-health-digest] Gathering health metrics...');

    // ── Metric 1: Today's charges (count + total amount) ──
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    const { data: todayCharges, error: chargesError } = await supabase
      .from('billing_records')
      .select('amount')
      .eq('status', 'paid')
      .gte('paid_at', todayIso);

    if (chargesError) console.error('[daily-health-digest] charges query error:', chargesError);

    const todayChargeCount = todayCharges?.length ?? 0;
    const todayAmount = (todayCharges ?? []).reduce((sum: number, r: { amount: number }) => sum + (r.amount || 0), 0);

    // ── Metric 2: Client health status (simpler approach: count billing_records with status issues) ──
    // Instead of N RPC calls for audit_books(), count overdue/charging/paid records directly
    const { data: overdueRecords } = await supabase
      .from('billing_records')
      .select('client_id')
      .eq('status', 'overdue')
      .is('archived_at', null);

    const { data: chargingRecords } = await supabase
      .from('billing_records')
      .select('client_id')
      .eq('status', 'charging')
      .is('archived_at', null);

    // Count unique clients with problems (overdue or charging records)
    const problemClientIds = new Set([
      ...(overdueRecords ?? []).map((r: { client_id: string }) => r.client_id),
      ...(chargingRecords ?? []).map((r: { client_id: string }) => r.client_id),
    ]);

    // Get total active client count for clean calculation
    const { count: totalActiveClients } = await supabase
      .from('client_wallets')
      .select('client_id', { count: 'exact', head: true })
      .eq('billing_mode', 'auto_stripe');

    const problemCount = problemClientIds.size;
    // Clients with overdue only are "warning", clients with charging stuck are "problem"
    const warningClientIds = new Set((overdueRecords ?? []).map((r: { client_id: string }) => r.client_id));
    const stuckClientIds = new Set((chargingRecords ?? []).map((r: { client_id: string }) => r.client_id));
    const warningCount = [...warningClientIds].filter(id => !stuckClientIds.has(id)).length;
    const realProblemCount = stuckClientIds.size;
    const cleanCount = (totalActiveClients ?? 0) - problemCount;

    // ── Metric 3: Safe mode count ──
    const { count: safeModeCount } = await supabase
      .from('recharge_state')
      .select('client_id', { count: 'exact', head: true })
      .eq('safe_mode_active', true);

    // ── Metric 4: Stale charging records (stuck >4h) ──
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const { count: staleCount } = await supabase
      .from('billing_records')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'charging')
      .lt('updated_at', fourHoursAgo);

    // ── Metric 5: Sync function health ──
    const { data: syncFailures } = await supabase
      .from('sync_failure_log')
      .select('function_name, consecutive_failures')
      .gt('consecutive_failures', 0);

    const syncIssues = syncFailures?.length ?? 0;

    // ── Metric 6: System alerts in last 24h ──
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentAlerts } = await supabase
      .from('system_alerts')
      .select('severity')
      .gte('created_at', twentyFourHoursAgo);

    const alertCounts = { critical: 0, warning: 0, info: 0 };
    for (const alert of recentAlerts ?? []) {
      const sev = alert.severity as keyof typeof alertCounts;
      if (sev in alertCounts) alertCounts[sev]++;
    }

    // ── Format summary message ──
    const summaryMessage = [
      `*Charges:* ${todayChargeCount} charges today ($${todayAmount.toFixed(2)} collected)`,
      `*Clients:* ${cleanCount} clean, ${warningCount} warnings, ${realProblemCount} problems`,
      `*Safe Mode:* ${safeModeCount ?? 0} clients in safe mode`,
      `*Stale Records:* ${staleCount ?? 0} charging records stuck >4h`,
      `*Sync Health:* ${syncIssues} functions with failures`,
      `*Alerts (24h):* ${alertCounts.critical} critical, ${alertCounts.warning} warning, ${alertCounts.info} info`,
    ].join('\n');

    console.log('[daily-health-digest] Summary:\n', summaryMessage);

    // ── Deliver via notify() (system_alerts + Slack) ──
    await notify({
      supabase,
      severity: 'info',
      title: 'Daily Billing Health Report',
      message: summaryMessage,
      alertType: 'health_digest',
      metadata: {
        today_charges: todayChargeCount,
        today_amount: todayAmount,
        clean_count: cleanCount,
        warning_count: warningCount,
        problem_count: realProblemCount,
        safe_mode_count: safeModeCount ?? 0,
        stale_count: staleCount ?? 0,
        sync_issues: syncIssues,
        alert_counts: alertCounts,
      },
    });

    // ── Rich Slack blocks (if webhook configured) ──
    const slackWebhookUrl = Deno.env.get('SLACK_BILLING_WEBHOOK_URL');
    if (slackWebhookUrl) {
      try {
        const hasProblems = (staleCount ?? 0) > 0 || alertCounts.critical > 0 || (safeModeCount ?? 0) > 0;
        const statusEmoji = hasProblems ? ':warning:' : ':white_check_mark:';

        const blocks = [
          {
            type: 'header',
            text: { type: 'plain_text', text: 'Daily Billing Health Report', emoji: true },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Status:*\n${statusEmoji} ${hasProblems ? 'Needs Attention' : 'All Systems Healthy'}` },
              { type: 'mrkdwn', text: `*Charges Today:*\n${todayChargeCount} ($${todayAmount.toFixed(2)})` },
            ],
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Client Health:*\n${cleanCount} clean / ${warningCount} warn / ${realProblemCount} problem` },
              { type: 'mrkdwn', text: `*Safe Mode:*\n${safeModeCount ?? 0} client${(safeModeCount ?? 0) !== 1 ? 's' : ''}` },
            ],
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Stale Records:*\n${staleCount ?? 0} stuck >4h` },
              { type: 'mrkdwn', text: `*Sync Issues:*\n${syncIssues} function${syncIssues !== 1 ? 's' : ''} failing` },
            ],
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Alerts (24h):*\n:red_circle: ${alertCounts.critical}  :large_yellow_circle: ${alertCounts.warning}  :large_blue_circle: ${alertCounts.info}` },
            ],
          },
          { type: 'divider' },
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `Generated at ${new Date().toISOString()} | AlphaHub Billing` },
            ],
          },
        ];

        const res = await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blocks }),
        });

        if (!res.ok) {
          const raw = await res.text();
          console.error(`[daily-health-digest] Slack blocks failed [${res.status}]: ${raw.slice(0, 300)}`);
        }
      } catch (e) {
        // Slack failure must never break the digest
        console.error('[daily-health-digest] Slack blocks error:', e);
      }
    }

    const result = {
      success: true,
      metrics: {
        today_charges: todayChargeCount,
        today_amount: todayAmount,
        clean_count: cleanCount,
        warning_count: warningCount,
        problem_count: realProblemCount,
        safe_mode_count: safeModeCount ?? 0,
        stale_count: staleCount ?? 0,
        sync_issues: syncIssues,
        alerts_24h: alertCounts,
      },
    };

    console.log('[daily-health-digest] Complete:', JSON.stringify(result));
    return jsonResponse(result);

  } catch (err) {
    console.error('[daily-health-digest] Fatal error:', err);
    return jsonResponse({ error: 'Internal server error', details: String(err) }, 500);
  }
});
