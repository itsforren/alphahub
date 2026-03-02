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

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    // Check if caller is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      console.log(`Non-admin user ${callerUser.id} attempted to create user`)
      return new Response(JSON.stringify({ error: 'Only admins can create users' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      })
    }

    const { email, name, role, userType, clientId, partnerId } = await req.json()

    if (!email || !name || !role) {
      return new Response(JSON.stringify({ error: 'Email, name, and role are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const normalizedEmail = email.toLowerCase().trim()
    console.log(`Creating ${userType} user: ${normalizedEmail}, role: ${role}`)

    // Check if user already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find(u => u.email?.toLowerCase() === normalizedEmail)
    
    if (existingUser) {
      console.log(`User already exists: ${existingUser.id}`)
      return new Response(JSON.stringify({ error: 'A user with this email already exists' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Generate a random temporary password
    const tempPassword = crypto.randomUUID() + 'Aa1!'

    // Create the auth user
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name }
    })

    if (createError) {
      console.error('Error creating auth user:', createError)
      return new Response(JSON.stringify({ error: createError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const userId = authUser.user.id
    console.log(`Created auth user: ${userId}`)

    // Create profile (the trigger should handle this, but let's ensure)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: normalizedEmail,
        name: name.trim()
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Not fatal, continue
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: role
      }, { onConflict: 'user_id,role' })

    if (roleError) {
      console.error('Error assigning role:', roleError)
    }

    // If this is a client, link to client record
    if (userType === 'client' && clientId) {
      const { error: linkError } = await supabaseAdmin
        .from('clients')
        .update({ 
          user_id: userId,
          password_set_at: null // They need to set password
        })
        .eq('id', clientId)

      if (linkError) {
        console.error('Error linking client:', linkError)
      } else {
        console.log(`Linked user ${userId} to client ${clientId}`)
      }
    }

    // If this is a referral partner, link to partner record
    if (userType === 'referrer' && partnerId) {
      const { error: linkError } = await supabaseAdmin
        .from('referral_partners')
        .update({ user_id: userId })
        .eq('id', partnerId)

      if (linkError) {
        console.error('Error linking partner:', linkError)
      } else {
        console.log(`Linked user ${userId} to partner ${partnerId}`)
      }
    }

    // Send password reset email so user can set their own password
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: {
        redirectTo: 'https://hub.alphaagent.io/auth/reset-password'
      }
    })

    if (resetError) {
      console.error('Error generating password reset:', resetError)
      // Not fatal - user exists and can request reset manually
    }

    console.log(`Successfully created user account for: ${name} (${normalizedEmail})`)

    return new Response(JSON.stringify({ 
      success: true,
      userId,
      email: normalizedEmail,
      name,
      role
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
