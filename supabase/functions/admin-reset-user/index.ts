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

    const { clientId, email, password } = await req.json()

    if (!clientId || !email || !password) {
      return new Response(JSON.stringify({ error: 'clientId, email, and password are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const forceNew = req.headers.get('x-force-new-user') === 'true'
    console.log(`Admin reset for client ${clientId} with email ${normalizedEmail}, forceNew=${forceNew}`)

    // Get the client
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, name, user_id')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return new Response(JSON.stringify({ error: 'Client not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      })
    }

    let userId = null

    // If forceNew is true, always create a new user (don't reuse existing)
    if (!forceNew && client.user_id) {
      userId = client.user_id
      console.log(`Updating existing user ${userId}`)
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: normalizedEmail,
        password: password,
        email_confirm: true
      })

      if (updateError) {
        console.error('Error updating user:', updateError)
        userId = null
      }
    }

    // Create new user if needed
    if (!userId) {
      // Check if email already exists in auth - but only reuse if not forcing new
      if (!forceNew) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers?.users.find(u => u.email?.toLowerCase() === normalizedEmail)

        if (existingUser) {
          // Check if this user is linked to another client
          const { data: linkedClient } = await supabaseAdmin
            .from('clients')
            .select('id')
            .eq('user_id', existingUser.id)
            .neq('id', clientId)
            .maybeSingle()

          if (linkedClient) {
            // Email belongs to another client, can't reuse
            return new Response(JSON.stringify({ 
              error: 'This email is already associated with another client account' 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            })
          }

          userId = existingUser.id
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: password,
            email_confirm: true
          })
          if (updateError) {
            console.error('Error updating existing user password:', updateError)
          }
        }
      }
      
      // Create brand new user
      if (!userId) {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password: password,
          email_confirm: true,
          user_metadata: { name: client.name }
        })

        if (createError) {
          console.error('Error creating user:', createError)
          return new Response(JSON.stringify({ error: createError.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          })
        }
        userId = newUser.user.id
      }
    }

    // Update client to link to user
    await supabaseAdmin
      .from('clients')
      .update({ 
        user_id: userId, 
        email: normalizedEmail,
        password_set_at: new Date().toISOString() 
      })
      .eq('id', clientId)

    // Ensure profile exists
    await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: normalizedEmail,
        name: client.name
      }, { onConflict: 'id' })

    // Ensure client role exists
    await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'client'
      }, { onConflict: 'user_id,role' })

    console.log(`Successfully reset user ${userId} for client ${clientId}`)

    return new Response(JSON.stringify({ 
      success: true,
      userId,
      clientId,
      email: normalizedEmail
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
