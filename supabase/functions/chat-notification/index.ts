import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_CHAT_WEBHOOK_URL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SMS notification recipients
const SMS_RECIPIENTS = [
  { name: "Forren", phone: "+17864237328" },
  { name: "Sierra", phone: "+17253432766" },
];

// Always notify these emails
const ALWAYS_NOTIFY_EMAILS = ["sierra@alphaagent.io"];

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'client' | 'admin';
  message: string;
  created_at: string;
}

interface NotificationRequest {
  message: ChatMessage;
  type: 'INSERT';
}

// Send SMS via Twilio
async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log('Twilio credentials not configured, skipping SMS');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: TWILIO_PHONE_NUMBER,
          Body: body,
        }),
      }
    );

    const result = await response.json();
    if (response.ok) {
      console.log(`SMS sent to ${to}: SID ${result.sid}`);
      return true;
    } else {
      console.error(`SMS failed to ${to}:`, result);
      return false;
    }
  } catch (error) {
    console.error(`SMS error to ${to}:`, error);
    return false;
  }
}

// Send Slack notification
async function sendSlackNotification(clientName: string, message: string, directUrl: string): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    console.log('Slack webhook not configured, skipping');
    return false;
  }

  try {
    const payload = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `💬 New message from ${clientName}`,
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: message.length > 200 ? message.substring(0, 200) + "..." : message
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Reply Now",
                emoji: true
              },
              url: directUrl,
              style: "primary"
            }
          ]
        }
      ]
    };

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log('Slack notification sent successfully');
      return true;
    } else {
      console.error('Slack notification failed:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('Slack error:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationRequest = await req.json();
    const { message, type } = payload;

    console.log('Received notification request:', { messageId: message.id, sender: message.sender_name, role: message.sender_role });

    if (type !== 'INSERT') {
      return new Response(JSON.stringify({ success: true, message: 'Ignored non-insert event' }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get conversation details to find the client
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone,
          success_manager_email
        )
      `)
      .eq('id', message.conversation_id)
      .single();

    if (convError) {
      console.error('Error fetching conversation:', convError);
      throw convError;
    }

    const client = conversation.clients;
    const clientId = client?.id;
    const portalUrl = 'https://alphaagent.io';
    
    // Direct URL to the specific conversation
    const directUrl = clientId 
      ? `${portalUrl}/hub/admin/inbox?client=${clientId}`
      : `${portalUrl}/hub/admin/inbox`;

    let recipients: string[] = [];
    let subject: string;
    let htmlContent: string;

    if (message.sender_role === 'client') {
      // ============================================
      // CLIENT SENT MESSAGE - NOTIFY ADMINS + TEAM
      // ============================================
      
      // Get all admin emails from profiles with admin role
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map(r => r.user_id);
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('email')
          .in('id', adminIds);

        recipients = adminProfiles?.map(p => p.email).filter(Boolean) as string[] || [];
      }

      // Also notify the success manager if set
      if (client?.success_manager_email) {
        recipients.push(client.success_manager_email);
      }

      // Always include hardcoded emails
      recipients.push(...ALWAYS_NOTIFY_EMAILS);

      // Remove duplicates
      recipients = [...new Set(recipients)];

      const clientName = client?.name || 'Client';
      const messagePreview = message.message.length > 100 
        ? message.message.substring(0, 100) + "..." 
        : message.message;

      subject = `💬 New message from ${clientName}`;
      
      // GREEN THEME EMAIL TEMPLATE
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">💬 New Chat Message</h1>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="color: #495057; margin: 0 0 20px 0;">
              <strong>${clientName}</strong> sent you a message:
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #16a34a;">
              <p style="color: #212529; margin: 0; white-space: pre-wrap;">${message.message}</p>
            </div>
            <div style="margin-top: 30px;">
              <a href="${directUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Reply Now
              </a>
            </div>
            <p style="color: #6c757d; font-size: 12px; margin-top: 30px;">
              You're receiving this because a client sent a message in the portal chat.
            </p>
          </div>
        </div>
      `;

      // SEND SMS NOTIFICATIONS
      const smsBody = `💬 ${clientName}: "${messagePreview}"\n\nReply: ${directUrl}`;
      const smsPromises = SMS_RECIPIENTS.map(r => sendSMS(r.phone, smsBody));
      
      // SEND SLACK NOTIFICATION
      const slackPromise = sendSlackNotification(clientName, message.message, directUrl);

      // Run SMS and Slack in parallel (non-blocking for email)
      Promise.all([...smsPromises, slackPromise]).then(results => {
        console.log('SMS/Slack results:', results);
      }).catch(err => {
        console.error('SMS/Slack error:', err);
      });

    } else {
      // ============================================
      // ADMIN SENT MESSAGE - NOTIFY CLIENT
      // ============================================
      if (client?.email) {
        recipients = [client.email];
      }

      const clientDirectUrl = `${portalUrl}/hub/chat`;

      // SMS notification to client
      if (client?.phone) {
        const messagePreview = message.message.length > 80 
          ? message.message.substring(0, 80) + "..." 
          : message.message;
        const clientSmsBody = `Alpha Agent: ${message.sender_name} sent you a message: "${messagePreview}" - View: ${clientDirectUrl}`;
        sendSMS(client.phone, clientSmsBody).then(ok => {
          console.log(`Client SMS ${ok ? 'sent' : 'skipped'} to ${client.phone}`);
        }).catch(err => {
          console.error('Client SMS error:', err);
        });
      } else {
        console.log('No phone number on client profile, skipping SMS');
      }

      subject = `📣 Your Success Manager replied`;
      
      // GREEN THEME EMAIL TEMPLATE FOR CLIENTS
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📣 New Reply from Support</h1>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="color: #495057; margin: 0 0 20px 0;">
              <strong>${message.sender_name}</strong> replied to your message:
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #16a34a;">
              <p style="color: #212529; margin: 0; white-space: pre-wrap;">${message.message}</p>
            </div>
            <div style="margin-top: 30px;">
              <a href="${clientDirectUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                View Chat
              </a>
            </div>
            <p style="color: #6c757d; font-size: 12px; margin-top: 30px;">
              You're receiving this because your success manager replied to your chat.
            </p>
          </div>
        </div>
      `;
    }

    if (recipients.length === 0) {
      console.log('No recipients found for notification');
      return new Response(JSON.stringify({ success: true, message: 'No recipients' }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('Sending email to:', recipients);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Alpha Agent <notifications@notify.welthra.com>",
        to: recipients,
        subject,
        html: htmlContent,
      }),
    });

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, emailData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in chat-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
