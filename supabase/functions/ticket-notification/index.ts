import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketNotificationRequest {
  type: 'new_ticket' | 'ticket_assigned' | 'sla_warning';
  ticket_id: string;
  assignee_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, ticket_id, assignee_email }: TicketNotificationRequest = await req.json();

    console.log(`Processing ${type} notification for ticket ${ticket_id}`);

    // Fetch ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select(`
        *,
        client:clients!support_tickets_client_id_fkey(id, name, email)
      `)
      .eq('id', ticket_id)
      .single();

    if (ticketError || !ticket) {
      console.error('Failed to fetch ticket:', ticketError);
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let recipientEmail = assignee_email;
    let emailSubject = '';
    let emailHtml = '';

    const ticketUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/hub/admin/tickets`;
    const clientName = ticket.client?.name || 'Unknown Client';
    const slaDeadline = ticket.sla_deadline 
      ? new Date(ticket.sla_deadline).toLocaleString('en-US', { 
          dateStyle: 'medium', 
          timeStyle: 'short' 
        })
      : 'Not set';

    // Get assignee email if not provided
    if (!recipientEmail && ticket.assigned_to) {
      const { data: agent } = await supabase
        .from('support_agents')
        .select('email')
        .eq('user_id', ticket.assigned_to)
        .single();
      
      recipientEmail = agent?.email;
    }

    if (!recipientEmail) {
      console.log('No recipient email found, skipping notification');
      return new Response(
        JSON.stringify({ success: true, message: 'No recipient to notify' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (type) {
      case 'new_ticket':
        emailSubject = `[New Ticket] ${ticket.subject} - ${clientName}`;
        emailHtml = `
          <h2>New Support Ticket Assigned</h2>
          <p>A new support ticket has been assigned to you:</p>
          
          <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Client</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${clientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Subject</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${ticket.subject}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Category</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${ticket.category}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Priority</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${ticket.priority}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">SLA Deadline</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${slaDeadline}</td>
            </tr>
          </table>
          
          <h3>Message:</h3>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            ${ticket.message.replace(/\n/g, '<br>')}
          </div>
          
          <p>
            <a href="${ticketUrl}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
              View Ticket Dashboard
            </a>
          </p>
        `;
        break;

      case 'ticket_assigned':
        emailSubject = `[Assigned] ${ticket.subject} - ${clientName}`;
        emailHtml = `
          <h2>Ticket Assigned to You</h2>
          <p>A support ticket has been assigned to you:</p>
          
          <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Client</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${clientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Subject</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${ticket.subject}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">SLA Deadline</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${slaDeadline}</td>
            </tr>
          </table>
          
          <p>
            <a href="${ticketUrl}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
              View Ticket
            </a>
          </p>
        `;
        break;

      case 'sla_warning':
        emailSubject = `⚠️ [SLA Warning] ${ticket.subject} - Deadline Approaching`;
        emailHtml = `
          <h2 style="color: #f59e0b;">⚠️ SLA Deadline Approaching</h2>
          <p>This ticket is approaching its SLA deadline:</p>
          
          <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Client</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${clientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Subject</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${ticket.subject}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #f59e0b;">SLA Deadline</td>
              <td style="padding: 8px; border: 1px solid #ddd; color: #f59e0b; font-weight: bold;">${slaDeadline}</td>
            </tr>
          </table>
          
          <p style="color: #f59e0b;">Please take action to resolve this ticket before the deadline.</p>
          
          <p>
            <a href="${ticketUrl}" style="display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px;">
              View Ticket Now
            </a>
          </p>
        `;
        break;
    }

    console.log(`Sending ${type} email to ${recipientEmail}`);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Alpha Hub <notifications@alphaagent.io>',
        to: [recipientEmail],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();
      console.error('Failed to send email:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Email sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error('Error in ticket-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
