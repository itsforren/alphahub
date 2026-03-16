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

  // 4. Email via Resend (critical only)
  if (severity === 'critical') {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      try {
        const recipientsCsv = Deno.env.get('ALERT_EMAIL_RECIPIENTS') || '';
        const to = recipientsCsv
          ? recipientsCsv.split(',').map((e: string) => e.trim()).filter(Boolean)
          : ['admin@alphaagent.io'];

        const htmlBody = `
          <h2 style="color:#dc2626;">[CRITICAL] ${title}</h2>
          <p>${message}</p>
          ${clientName ? `<p><strong>Client:</strong> ${clientName}</p>` : ''}
          <p style="color:#6b7280;font-size:12px;">AlphaHub Billing Alert &mdash; ${new Date().toISOString()}</p>
        `;

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'AlphaHub Billing <alerts@alphaagent.io>',
            to,
            subject: `[CRITICAL] ${title}`,
            html: htmlBody,
          }),
        });

        if (!emailRes.ok) {
          const raw = await emailRes.text();
          console.error(`Resend email failed [${emailRes.status}]: ${raw.slice(0, 300)}`);
        } else {
          console.log('[notify] Critical email sent via Resend');
        }
      } catch (e) {
        // Email failure must NEVER break the caller
        console.error('Failed to send Resend email:', e);
      }
    } else {
      console.log('[notify] RESEND_API_KEY not configured, skipping email');
    }
  }

  // 5. SMS via Twilio (critical only)
  if (severity === 'critical') {
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioFrom = Deno.env.get('TWILIO_PHONE_NUMBER');
    const adminPhone = Deno.env.get('ADMIN_PHONE_NUMBER');

    if (twilioSid && twilioToken && twilioFrom && adminPhone) {
      try {
        const smsBody = `[CRITICAL] ${title}: ${message}`.slice(0, 160);
        const authString = btoa(`${twilioSid}:${twilioToken}`);

        const smsParams = new URLSearchParams({
          To: adminPhone,
          From: twilioFrom,
          Body: smsBody,
        });

        const smsRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${authString}`,
            },
            body: smsParams.toString(),
          },
        );

        if (!smsRes.ok) {
          const raw = await smsRes.text();
          console.error(`Twilio SMS failed [${smsRes.status}]: ${raw.slice(0, 300)}`);
        } else {
          console.log('[notify] Critical SMS sent via Twilio');
        }
      } catch (e) {
        // SMS failure must NEVER break the caller
        console.error('Failed to send Twilio SMS:', e);
      }
    } else {
      console.log('[notify] Twilio env vars not fully configured, skipping SMS');
    }
  }

  // 6. Log for debugging
  console.log(`[notify] [${severity}] ${title}: ${message}${clientName ? ` (client: ${clientName})` : ''}`);
}
