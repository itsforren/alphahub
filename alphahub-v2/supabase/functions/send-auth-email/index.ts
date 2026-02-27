import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Branded email template
const createEmailTemplate = (content: string, buttonText: string, buttonUrl: string, preheader: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Alpha Agent</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader}
  </div>
  
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 0 0 32px 0;">
              <table role="presentation" style="border-collapse: collapse;">
                <tr>
                  <td style="padding-right: 4px;">
                    <span style="font-size: 28px; font-weight: 300; color: #18181b; letter-spacing: -0.5px;">ALPHA</span>
                  </td>
                  <td>
                    <span style="font-size: 28px; font-weight: 700; color: #ca8a04; letter-spacing: -0.5px;">AGENT</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Content Card -->
          <tr>
            <td>
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
                
                <!-- Gradient Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #ca8a04 0%, #eab308 50%, #facc15 100%); padding: 32px 40px; border-radius: 16px 16px 0 0;">
                    <h1 style="margin: 0; color: #18181b; font-size: 24px; font-weight: 700;">
                      ${content.split('\n')[0]}
                    </h1>
                  </td>
                </tr>
                
                <!-- Body Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 24px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                      ${content.split('\n').slice(1).join('<br><br>')}
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="border-collapse: collapse; margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <a href="${buttonUrl}" 
                             style="display: inline-block; background: linear-gradient(135deg, #ca8a04 0%, #eab308 100%); color: #18181b; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(202, 138, 4, 0.3);">
                            ${buttonText}
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Security Note -->
                    <p style="margin: 24px 0 0 0; color: #71717a; font-size: 14px; line-height: 1.5;">
                      If you didn't request this email, you can safely ignore it.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 0; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #71717a; font-size: 13px;">
                Alpha Agent powered by Welthra
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} Alpha Agent. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, email, name, resetLink, confirmLink, token } = await req.json();

    console.log(`Sending ${type} email to: ${email}`);

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resend = new Resend(RESEND_API_KEY);
    const displayName = name || 'there';
    
    let subject: string;
    let content: string;
    let buttonText: string;
    let buttonUrl: string;
    let preheader: string;

    switch (type) {
      case 'password-reset':
        subject = 'Reset Your Alpha Agent Password';
        content = `Reset Your Password\nHi ${displayName},\n\nWe received a request to reset your password. Click the button below to create a new password for your Alpha Agent account.\n\nThis link will expire in 1 hour for security reasons.`;
        buttonText = 'Reset Password';
        buttonUrl = resetLink;
        preheader = 'Reset your Alpha Agent password';
        break;

      case 'welcome-set-password':
        subject = 'Welcome to Alpha Agent - Set Your Password';
        content = `Welcome to Alpha Agent!\nHi ${displayName},\n\nYour Alpha Agent account is ready! To get started, please set your password by clicking the button below.\n\nOnce you've set your password, you'll have full access to your client portal.`;
        buttonText = 'Set Your Password';
        buttonUrl = confirmLink;
        preheader = 'Set your password to access your Alpha Agent portal';
        break;

      case 'magic-link':
        subject = 'Sign In to Alpha Agent';
        content = `Sign In to Your Account\nHi ${displayName},\n\nClick the button below to sign in to your Alpha Agent account. This link will expire in 1 hour.\n\nIf you didn't request this login link, please ignore this email.`;
        buttonText = 'Sign In';
        buttonUrl = confirmLink;
        preheader = 'Your secure login link for Alpha Agent';
        break;

      case 'email-confirmation':
        subject = 'Confirm Your Alpha Agent Email';
        content = `Confirm Your Email\nHi ${displayName},\n\nPlease confirm your email address by clicking the button below.\n\nThis helps us ensure the security of your Alpha Agent account.`;
        buttonText = 'Confirm Email';
        buttonUrl = confirmLink;
        preheader = 'Confirm your email address for Alpha Agent';
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid email type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const htmlContent = createEmailTemplate(content, buttonText, buttonUrl, preheader);

    const { data, error } = await resend.emails.send({
      from: 'Alpha Agent <notifications@notify.welthra.com>',
      to: [email],
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error('Error sending email:', error);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Email sent successfully: ${data?.id}`);

    return new Response(JSON.stringify({ success: true, emailId: data?.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-auth-email:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
