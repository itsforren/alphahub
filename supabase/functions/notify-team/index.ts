import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fetchWithTimeout(url: string, opts: RequestInit, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Validate env vars upfront
  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('NOTIFICATION_FROM_EMAIL') || 'Alpha Agent <notifications@notify.welthra.com>';

  const canSMS = !!(twilioSid && twilioToken && twilioPhone);
  const canEmail = !!resendKey;

  if (!canSMS && !canEmail) {
    console.error('notify-team: No notification channels configured (missing Twilio AND Resend env vars)');
    return new Response(JSON.stringify({ error: 'No notification channels configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { leadId } = await req.json();
    if (!leadId) {
      return new Response(JSON.stringify({ error: 'Missing leadId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, agent_id, first_name, last_name, phone, email, state, age, interest, lead_date')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.log('Lead not found:', leadId);
      return new Response(JSON.stringify({ error: 'Lead not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch team members who want notifications for this agent
    const { data: team } = await supabase
      .from('team_notification_preferences')
      .select('*')
      .eq('agent_id', lead.agent_id);

    if (!team || team.length === 0) {
      console.log('No team members configured for agent:', lead.agent_id);
      return new Response(JSON.stringify({ sent: 0, skipped: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Build the message (escape HTML for email safety)
    const rawName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'New Lead';
    const safeName = escapeHtml(rawName);
    const rawDetails = [lead.state, lead.age ? `Age ${lead.age}` : null].filter(Boolean).join(' · ');
    const safeDetails = escapeHtml(rawDetails);
    const dialLink = `https://alphaagent.io/dial?lead_id=${encodeURIComponent(lead.id)}`;

    const smsBody = `🔔 New Lead: ${rawName}\n${rawDetails}\n\nTap to dial:\n${dialLink}`;

    const emailHtml = `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="margin: 0 0 8px;">New Lead: ${safeName}</h2>
        <p style="color: #666; margin: 0 0 16px;">${safeDetails}</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          ${lead.phone ? `<tr><td style="padding: 4px 0; color: #999;">Phone</td><td style="padding: 4px 0;"><a href="tel:${escapeHtml(lead.phone)}">${escapeHtml(lead.phone)}</a></td></tr>` : ''}
          ${lead.email ? `<tr><td style="padding: 4px 0; color: #999;">Email</td><td style="padding: 4px 0;">${escapeHtml(lead.email)}</td></tr>` : ''}
          ${lead.interest ? `<tr><td style="padding: 4px 0; color: #999;">Interest</td><td style="padding: 4px 0;">${escapeHtml(lead.interest)}</td></tr>` : ''}
        </table>
        <a href="${dialLink}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #ec4899, #f59e0b); color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
          Open Dial Tracker
        </a>
      </div>
    `;

    // 4. Send notifications
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    const results = await Promise.allSettled(
      team.flatMap((member: any) => {
        const tasks: Promise<any>[] = [];

        const wantsSMS = member.notify_sms && member.phone;
        const wantsEmail = member.notify_email && member.email;

        if (!wantsSMS && !wantsEmail) {
          skipped++;
          console.log(`Skipping ${member.user_name}: no contact method configured`);
          return tasks;
        }

        if (wantsSMS && canSMS) {
          tasks.push(
            sendSMS(twilioSid!, twilioToken!, twilioPhone!, member.phone, smsBody)
              .then(() => { sent++; })
              .catch((err) => { failed++; errors.push(`SMS to ${member.user_name}: ${err.message}`); })
          );
        }

        if (wantsEmail && canEmail) {
          tasks.push(
            sendEmail(resendKey!, fromEmail, member.email, `New Lead: ${rawName}`, emailHtml)
              .then(() => { sent++; })
              .catch((err) => { failed++; errors.push(`Email to ${member.user_name}: ${err.message}`); })
          );
        }

        return tasks;
      })
    );

    console.log(`notify-team lead=${leadId} agent=${lead.agent_id}: sent=${sent} failed=${failed} skipped=${skipped}${errors.length ? ' errors=' + JSON.stringify(errors) : ''}`);

    return new Response(JSON.stringify({ sent, failed, skipped, errors: errors.length ? errors : undefined }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('notify-team error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ── Twilio SMS (10s timeout) ──

async function sendSMS(accountSid: string, authToken: string, from: string, to: string, body: string) {
  const res = await fetchWithTimeout(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

// ── Resend Email (10s timeout) ──

async function sendEmail(apiKey: string, from: string, to: string, subject: string, html: string) {
  const res = await fetchWithTimeout('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json();
}
