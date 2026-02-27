import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, newPassword } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    if (!newPassword) {
      return new Response(JSON.stringify({ error: 'Password is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    if (newPassword.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const normalizedEmail = email.toLowerCase().trim()
    console.log(`Setting password for email: ${normalizedEmail}`)

    // Find the client record
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, name, user_id, password_set_at')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (clientError) {
      console.error('Error finding client:', clientError)
      return new Response(JSON.stringify({ error: 'Error finding client' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    if (!client) {
      return new Response(JSON.stringify({ error: 'Client not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      })
    }

    if (!client.user_id) {
      return new Response(JSON.stringify({ error: 'No account linked to this client' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Update the user's password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      client.user_id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      return new Response(JSON.stringify({ error: 'Failed to update password' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    // Update password_set_at timestamp
    const { error: clientUpdateError } = await supabaseAdmin
      .from('clients')
      .update({ password_set_at: new Date().toISOString() })
      .eq('id', client.id)

    if (clientUpdateError) {
      console.error('Error updating password_set_at:', clientUpdateError)
      // Continue anyway, password was set successfully
    }

    console.log(`Successfully set password for client: ${client.name}`)

    return new Response(JSON.stringify({ 
      success: true,
      clientId: client.id,
      clientName: client.name
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
