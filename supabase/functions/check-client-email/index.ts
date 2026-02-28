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

    const { email, action, password } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const normalizedEmail = email.toLowerCase().trim()
    console.log(`Checking email: ${normalizedEmail}, action: ${action || 'check'}`)

    // Check if email exists in clients table
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, name, email, user_id, status, password_set_at')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (clientError) {
      console.error('Error checking client:', clientError)
      return new Response(JSON.stringify({ error: 'Error checking client status' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    // Also check profiles and user_roles for admin/member accounts
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (profileError) {
      console.error('Error checking profile:', profileError)
    }

    console.log(`Profile query result for ${normalizedEmail}:`, JSON.stringify(profile))

    let userRole = null
    let isStaffMember = false
    if (profile) {
      // Get ALL roles for this user (they may have multiple)
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id)
      
      if (roleError) {
        console.error('Error checking role:', roleError)
      }
      console.log(`Role query result for user ${profile.id}:`, JSON.stringify(roleData))
      
      // Check if any of their roles is admin or member
      const roles = roleData?.map(r => r.role) || []
      if (roles.includes('admin')) {
        userRole = 'admin'
        isStaffMember = true
      } else if (roles.includes('member')) {
        userRole = 'member'
        isStaffMember = true
      } else if (roles.length > 0) {
        userRole = roles[0]
      }
    }

    console.log(`Client found: ${!!client}, Profile found: ${!!profile}, Role: ${userRole}, Is staff: ${isStaffMember}`)

    console.log(`Client found: ${!!client}, Profile found: ${!!profile}, Role: ${userRole}, Is staff: ${isStaffMember}`)

    // If just checking email status
    if (!action || action === 'check') {
      // Staff member (admin/member) - they already have auth accounts
      if (isStaffMember && profile) {
        return new Response(JSON.stringify({ 
          exists: true, 
          hasAccount: true, 
          isStaffMember: true,
          userRole: userRole,
          clientName: profile.name,
          userId: profile.id
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Client check
      if (!client) {
        return new Response(JSON.stringify({ 
          exists: false, 
          hasAccount: false, 
          isStaffMember: false,
          clientName: null 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // SECURITY FIX: Verify that the auth user actually exists if user_id is set
      let hasAccount = false
      let needsPasswordSetup = false
      
      if (client.user_id) {
        // Check if auth user actually exists by looking up the user
        const { data: authUser, error: authLookupError } = await supabaseAdmin.auth.admin.getUserById(client.user_id)
        
        if (authLookupError || !authUser?.user) {
          // user_id is set but auth user doesn't exist - this is an orphaned link
          console.warn(`Client ${client.id} has orphaned user_id ${client.user_id} - auth user does not exist`)
          // Clear the orphaned user_id
          await supabaseAdmin
            .from('clients')
            .update({ user_id: null, password_set_at: null })
            .eq('id', client.id)
          console.log(`Cleared orphaned user_id for client ${client.id}`)
          hasAccount = false
        } else {
          hasAccount = true
          needsPasswordSetup = !client.password_set_at
        }
      }

      return new Response(JSON.stringify({
        exists: true, 
        hasAccount, 
        needsPasswordSetup,
        isStaffMember: false,
        clientName: client.name,
        clientId: client.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // If action is 'create-account' - create auth user and link to client
    if (action === 'create-account') {
      if (!client) {
        return new Response(JSON.stringify({ error: 'Client not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        })
      }

      if (client.user_id) {
        return new Response(JSON.stringify({ error: 'Account already exists' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      if (!password) {
        return new Response(JSON.stringify({ error: 'Password is required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      // Create auth user
      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true // Auto-confirm since they're a verified client
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

      // Link user_id to client record
      const { error: updateClientError } = await supabaseAdmin
        .from('clients')
        .update({ user_id: userId })
        .eq('id', client.id)

      if (updateClientError) {
        console.error('Error linking user to client:', updateClientError)
        // Try to clean up the auth user we just created
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return new Response(JSON.stringify({ error: 'Failed to link account to client' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        })
      }

      // Create profile record
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: normalizedEmail,
          name: client.name
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        // Continue anyway, profile can be created later
      }

      // Assign client role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'client'
        })

      if (roleError) {
        console.error('Error assigning role:', roleError)
        // Continue anyway, role can be assigned later
      }

      // Set password_set_at since user created their own password
      const { error: passwordSetError } = await supabaseAdmin
        .from('clients')
        .update({ password_set_at: new Date().toISOString() })
        .eq('id', client.id)
      
      if (passwordSetError) {
        console.error('Error setting password_set_at:', passwordSetError)
        // Continue anyway, not critical
      }

      console.log(`Successfully created account for client: ${client.name}`)

      return new Response(JSON.stringify({ 
        success: true,
        userId: userId,
        clientId: client.id,
        clientName: client.name
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })

  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
