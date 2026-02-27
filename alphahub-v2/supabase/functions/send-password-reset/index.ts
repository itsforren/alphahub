import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Branded email template
const createEmailTemplate = (name: string, resetLink: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Reset Your Alpha Agent Password</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    Reset your Alpha Agent password
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
                      Reset Your Password
                    </h1>
                  </td>
                </tr>
                
                <!-- Body Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 24px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                      Hi ${name},
                    </p>
                    <p style="margin: 0 0 24px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                      We received a request to reset your password. Click the button below to create a new password for your Alpha Agent account.
                    </p>
                    <p style="margin: 0 0 24px 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                      This link will expire in 1 hour for security reasons.
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="border-collapse: collapse; margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetLink}" 
                             style="display: inline-block; background: linear-gradient(135deg, #ca8a04 0%, #eab308 100%); color: #18181b; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(202, 138, 4, 0.3);">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Security Note -->
                    <p style="margin: 24px 0 0 0; color: #71717a; font-size: 14px; line-height: 1.5;">
                      If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    const { email } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const normalizedEmail = email.toLowerCase().trim()
    console.log(`Sending password reset email to: ${normalizedEmail}`)

    // Check if user exists - check clients table first
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, name, user_id')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    // Also check profiles for staff members
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, name')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    // Get the user_id
    const userId = client?.user_id || profile?.id
    const userName = client?.name || profile?.name || 'there'

    if (!userId) {
      // Don't reveal if email exists or not for security
      console.log(`No user found for email: ${normalizedEmail}, returning success anyway`)
      return new Response(JSON.stringify({ 
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate password reset link using Supabase Admin
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: {
        redirectTo: 'https://alphaagent.io/reset-password'
      }
    })

    if (linkError) {
      console.error('Error generating reset link:', linkError)
      return new Response(JSON.stringify({ error: 'Failed to generate reset link' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    // The link from generateLink contains token_hash, we need to build the proper URL
    const resetLink = linkData.properties?.action_link || `https://alphaagent.io/reset-password`

    // Send branded email via Resend
    const resend = new Resend(resendApiKey)
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Alpha Agent <notifications@notify.welthra.com>',
      to: [normalizedEmail],
      subject: 'Reset Your Alpha Agent Password',
      html: createEmailTemplate(userName, resetLink),
    })

    if (emailError) {
      console.error('Error sending email:', emailError)
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    console.log(`Password reset email sent successfully: ${emailData?.id}`)

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Password reset email sent successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
