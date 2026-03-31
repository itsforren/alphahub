import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Build the message
    const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'New Lead';
    const details = [lead.state, lead.age ? `Age ${lead.age}` : null].filter(Boolean).join(' · ');
    const dialLink = `https://alphaagent.io/dial?lead_id=${lead.id}`;

    const smsBody = `🔔 New Lead: ${name}\n${details}\n\nTap to dial:\n${dialLink}`;

    const emailHtml = `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="margin: 0 0 8px;">New Lead: ${name}</h2>
        <p style="color: #666; margin: 0 0 16px;">${details}</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          ${lead.phone ? `<tr><td style="padding: 4px 0; color: #999;">Phone</td><td style="padding: 4px 0;"><a href="tel:${lead.phone}">${lead.phone}</a></td></tr>` : ''}
          ${lead.email ? `<tr><td style="padding: 4px 0; color: #999;">Email</td><td style="padding: 4px 0;">${lead.email}</td></tr>` : ''}
          ${lead.interest ? `<tr><td style="padding: 4px 0; color: #999;">Interest</td><td style="padding: 4px 0;">${lead.interest}</td></tr>` : ''}
        </table>
        <a href="${dialLink}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #ec4899, #f59e0b); color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
          Open Dial Tracker
        </a>
      </div>
    `;

    // 4. Send notifications
    const results = await Promise.allSettled(
      team.flatMap((member: any) => {
        const tasks: Promise<any>[] = [];

        if (member.notify_sms && member.phone) {
          tasks.push(sendSMS(member.phone, smsBody));
        }

        if (member.notify_email && member.email) {
          tasks.push(sendEmail(member.email, `New Lead: ${name}`, emailHtml));
        }

        return tasks;
      })
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`Notifications for lead ${leadId}: ${sent} sent, ${failed} failed`);

    return new Response(JSON.stringify({ sent, failed }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('notify-team error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ── Twilio SMS ──

async function sendSMS(to: string, body: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
  const from = Deno.env.get('TWILIO_PHONE_NUMBER')!;

  const res = await fetch(
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
    throw new Error(`Twilio SMS failed: ${err}`);
  }
  return res.json();
}

// ── Resend Email ──

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('NOTIFICATION_FROM_EMAIL') || 'Alpha Agent <notifications@notify.welthra.com>',
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend email failed: ${err}`);
  }
  return res.json();
}
