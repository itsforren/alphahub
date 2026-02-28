import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface CollectionSettings {
  reminder_days_before: number;
  late_notice_days: number;
  warning_days: number;
  final_notice_days: number;
  collections_days: number;
}

const DEFAULT_SETTINGS: CollectionSettings = {
  reminder_days_before: 3,
  late_notice_days: 1,
  warning_days: 7,
  final_notice_days: 21,
  collections_days: 30,
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting billing collections run...");

    // Get collection settings
    const { data: settingsData } = await supabase
      .from("sla_settings")
      .select("setting_value")
      .eq("setting_key", "collections")
      .single();

    const settings: CollectionSettings = settingsData?.setting_value || DEFAULT_SETTINGS;
    console.log("Using settings:", settings);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all pending billing records with client info
    const { data: pendingBills, error: billsError } = await supabase
      .from("billing_records")
      .select(`
        id,
        client_id,
        billing_type,
        amount,
        due_date,
        credit_amount_used
      `)
      .eq("status", "pending")
      .not("due_date", "is", null);

    if (billsError) {
      console.error("Error fetching billing records:", billsError);
      throw billsError;
    }

    console.log(`Found ${pendingBills?.length || 0} pending bills`);

    let emailsSent = 0;
    let errors: string[] = [];

    for (const bill of pendingBills || []) {
      try {
        const dueDate = new Date(bill.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const daysOverdue = -daysUntilDue;

        // Get client info
        const { data: client } = await supabase
          .from("clients")
          .select("name, email")
          .eq("id", bill.client_id)
          .single();

        if (!client?.email) {
          console.log(`No email for client ${bill.client_id}, skipping`);
          continue;
        }

        // Check if collection record exists
        let { data: collection } = await supabase
          .from("billing_collections")
          .select("*")
          .eq("billing_record_id", bill.id)
          .single();

        // Determine what email stage we should be at
        let targetStage: string | null = null;
        let emailSubject = "";
        let emailBody = "";
        const netAmount = bill.amount - (bill.credit_amount_used || 0);
        const billingType = bill.billing_type === "ad_spend" ? "Ad Spend" : "Management Fee";

        if (daysUntilDue === settings.reminder_days_before) {
          targetStage = "reminder";
          emailSubject = `Payment Reminder: ${billingType} Due in ${settings.reminder_days_before} Days`;
          emailBody = `
            <h2>Payment Reminder</h2>
            <p>Dear ${client.name},</p>
            <p>This is a friendly reminder that your <strong>${billingType}</strong> payment of <strong>$${netAmount.toFixed(2)}</strong> is due on <strong>${bill.due_date}</strong>.</p>
            <p>Please ensure your payment is made by the due date to avoid any service interruptions.</p>
            <p>Thank you for your continued partnership.</p>
            <p>Best regards,<br>Alpha Team</p>
          `;
        } else if (daysOverdue >= settings.late_notice_days && daysOverdue < settings.warning_days) {
          targetStage = "late";
          emailSubject = `OVERDUE: ${billingType} Payment Required`;
          emailBody = `
            <h2>Payment Overdue Notice</h2>
            <p>Dear ${client.name},</p>
            <p>Your <strong>${billingType}</strong> payment of <strong>$${netAmount.toFixed(2)}</strong> was due on <strong>${bill.due_date}</strong> and is now <strong>${daysOverdue} day(s) overdue</strong>.</p>
            <p>Please make your payment immediately to avoid any service disruptions or additional fees.</p>
            <p>If you have already made this payment, please disregard this notice.</p>
            <p>Best regards,<br>Alpha Team</p>
          `;
        } else if (daysOverdue >= settings.warning_days && daysOverdue < settings.final_notice_days) {
          targetStage = "warning";
          emailSubject = `URGENT: ${billingType} Payment ${daysOverdue} Days Overdue`;
          emailBody = `
            <h2>Urgent Payment Required</h2>
            <p>Dear ${client.name},</p>
            <p>Your account has a <strong>${billingType}</strong> payment of <strong>$${netAmount.toFixed(2)}</strong> that is now <strong>${daysOverdue} days overdue</strong>.</p>
            <p><strong>Please note:</strong> If payment is not received within the next ${settings.final_notice_days - daysOverdue} days, we will have no choice but to escalate this matter to our collections department.</p>
            <p>To avoid this, please make your payment immediately.</p>
            <p>Best regards,<br>Alpha Team</p>
          `;
        } else if (daysOverdue >= settings.final_notice_days && daysOverdue < settings.collections_days) {
          targetStage = "final";
          emailSubject = `FINAL NOTICE: ${billingType} Payment - Collections Warning`;
          emailBody = `
            <h2>FINAL NOTICE - Collections Warning</h2>
            <p>Dear ${client.name},</p>
            <p>Despite our previous attempts to contact you, your <strong>${billingType}</strong> payment of <strong>$${netAmount.toFixed(2)}</strong> remains unpaid and is now <strong>${daysOverdue} days overdue</strong>.</p>
            <p><strong style="color: #dc2626;">This is your final notice.</strong></p>
            <p>If we do not receive payment by <strong>${new Date(today.getTime() + (settings.collections_days - daysOverdue) * 24 * 60 * 60 * 1000).toLocaleDateString()}</strong>, we will have no other choice but to send this payment to collections. This may affect your credit score and result in additional fees.</p>
            <p>Please contact us immediately to resolve this matter.</p>
            <p>Best regards,<br>Alpha Team</p>
          `;
        } else if (daysOverdue >= settings.collections_days) {
          targetStage = "collections";
          emailSubject = `ACCOUNT SENT TO COLLECTIONS: ${billingType} Payment`;
          emailBody = `
            <h2>Account Sent to Collections</h2>
            <p>Dear ${client.name},</p>
            <p>As we have not received payment for your <strong>${billingType}</strong> balance of <strong>$${netAmount.toFixed(2)}</strong> despite multiple notices, your account has been forwarded to our collections department.</p>
            <p>You may be contacted by our collections team regarding this outstanding balance.</p>
            <p>If you wish to resolve this matter directly, please contact us immediately.</p>
            <p>Best regards,<br>Alpha Team</p>
          `;
        }

        // If we have a target stage and haven't already sent this stage
        if (targetStage && (!collection || collection.email_stage !== targetStage)) {
          console.log(`Sending ${targetStage} email to ${client.email} for bill ${bill.id}`);

          // Send email
          const { error: emailError } = await resend.emails.send({
            from: "Alpha Team <billing@resend.dev>",
            to: [client.email],
            subject: emailSubject,
            html: emailBody,
          });

          if (emailError) {
            console.error(`Failed to send email to ${client.email}:`, emailError);
            errors.push(`Failed to send ${targetStage} email to ${client.email}`);
            continue;
          }

          emailsSent++;

          // Create or update collection record
          const statusMap: Record<string, string> = {
            reminder: "reminder_sent",
            late: "late_notice_sent",
            warning: "late_notice_sent",
            final: "final_notice_sent",
            collections: "sent_to_collections",
          };

          if (collection) {
            await supabase
              .from("billing_collections")
              .update({
                status: statusMap[targetStage],
                email_stage: targetStage,
                last_email_sent_at: new Date().toISOString(),
                escalated_at: targetStage === "collections" ? new Date().toISOString() : collection.escalated_at,
              })
              .eq("id", collection.id);
          } else {
            const { data: newCollection } = await supabase
              .from("billing_collections")
              .insert({
                billing_record_id: bill.id,
                client_id: bill.client_id,
                status: statusMap[targetStage],
                email_stage: targetStage,
                last_email_sent_at: new Date().toISOString(),
                escalated_at: targetStage === "collections" ? new Date().toISOString() : null,
              })
              .select()
              .single();
            
            collection = newCollection;
          }

          // Log the event
          if (collection) {
            await supabase
              .from("billing_collection_events")
              .insert({
                collection_id: collection.id,
                event_type: "email_sent",
                email_template: targetStage,
                email_subject: emailSubject,
                recipient_email: client.email,
                status_from: collection?.status || "none",
                status_to: statusMap[targetStage],
              });
          }
        }
      } catch (billError) {
        console.error(`Error processing bill ${bill.id}:`, billError);
        errors.push(`Error processing bill ${bill.id}: ${billError}`);
      }
    }

    console.log(`Collections run complete. Emails sent: ${emailsSent}. Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in billing-collections-run:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
