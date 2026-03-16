/**
 * Shared notification helper for billing edge functions.
 *
 * Centralizes alert dispatch: writes to system_alerts table and optionally
 * sends Slack webhooks. All billing-related notifications should go through
 * notify() to ensure consistent persistence and routing.
 *
 * Usage:
 *   import { notify } from '../_shared/notifications.ts';
 *   await notify({ supabase, clientId, severity: 'critical', title: '...', message: '...' });
 */

interface NotifyParams {
  supabase: any;
  clientId?: string;
  clientName?: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  alertType?: string;
}

export async function notify(params: NotifyParams): Promise<void> {
  const {
    supabase,
    clientId,
    clientName,
    severity,
    title,
    message,
    metadata,
    alertType = 'billing',
  } = params;

  // 1. Always write to system_alerts table for persistence and querying
  try {
    const { error } = await supabase.from('system_alerts').insert({
      alert_type: alertType,
      severity,
      title,
      message,
      metadata: {
        client_id: clientId,
        client_name: clientName,
        ...metadata,
      },
    });

    if (error) {
      console.error('Failed to write system_alert:', error);
    }
  } catch (e) {
    console.error('Exception writing system_alert:', e);
  }

  // 2. Send Slack webhook if SLACK_BILLING_WEBHOOK_URL is configured
  const billingWebhookUrl = Deno.env.get('SLACK_BILLING_WEBHOOK_URL');
  if (billingWebhookUrl) {
    try {
      const res = await fetch(billingWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `[${severity.toUpperCase()}] ${title}: ${message}`,
        }),
      });
      if (!res.ok) {
        const raw = await res.text();
        console.error(`Slack billing webhook failed [${res.status}]: ${raw.slice(0, 300)}`);
      }
    } catch (e) {
      // Slack failure must not break the caller
      console.error('Failed to send Slack billing webhook:', e);
    }
  }

  // 3. For critical alerts, also post to the ads manager Slack channel for visibility
  if (severity === 'critical') {
    const adsManagerWebhookUrl = Deno.env.get('SLACK_ADS_MANAGER_WEBHOOK_URL');
    if (adsManagerWebhookUrl) {
      try {
        const res = await fetch(adsManagerWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `[CRITICAL] ${title}: ${message}`,
          }),
        });
        if (!res.ok) {
          const raw = await res.text();
          console.error(`Slack ads manager webhook failed [${res.status}]: ${raw.slice(0, 300)}`);
        }
      } catch (e) {
        console.error('Failed to send Slack ads manager webhook:', e);
      }
    }
  }

  // TODO: Email escalation for critical alerts (deferred to Phase 9 per CONTEXT.md)

  // 4. Log for debugging
  console.log(`[notify] [${severity}] ${title}: ${message}${clientName ? ` (client: ${clientName})` : ''}`);
}
