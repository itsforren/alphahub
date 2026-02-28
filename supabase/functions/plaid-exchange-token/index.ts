import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple encryption using the ENCRYPTION_KEY
function encryptToken(token: string, key: string): string {
  // XOR-based encryption with base64 encoding
  const keyBytes = new TextEncoder().encode(key)
  const tokenBytes = new TextEncoder().encode(token)
  const encrypted = new Uint8Array(tokenBytes.length)
  
  for (let i = 0; i < tokenBytes.length; i++) {
    encrypted[i] = tokenBytes[i] ^ keyBytes[i % keyBytes.length]
  }
  
  return btoa(String.fromCharCode(...encrypted))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const PLAID_CLIENT_ID = (Deno.env.get('PLAID_CLIENT_ID') || '').trim()
    const PLAID_SECRET = (Deno.env.get('PLAID_SECRET') || '').trim()
    const PLAID_ENV = (Deno.env.get('PLAID_ENV') || 'sandbox').trim().toLowerCase()
    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY')

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      return new Response(
        JSON.stringify({ error: 'plaid_not_configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!ENCRYPTION_KEY) {
      return new Response(
        JSON.stringify({ error: 'Encryption key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: roleData } = await supabaseClient.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'admin' 
    })
    
    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { public_token, metadata } = await req.json()

    if (!public_token) {
      return new Response(
        JSON.stringify({ error: 'Missing public_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const plaidBaseUrl = PLAID_ENV === 'production' 
      ? 'https://production.plaid.com'
      : PLAID_ENV === 'development'
        ? 'https://development.plaid.com'
        : 'https://sandbox.plaid.com'

    // Exchange public token for access token
    const exchangeResponse = await fetch(`${plaidBaseUrl}/item/public_token/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        public_token,
      }),
    })

    const exchangeData = await exchangeResponse.json()

    if (!exchangeResponse.ok) {
      console.error('Plaid exchange error:', exchangeData)
      return new Response(
        JSON.stringify({ error: 'Failed to exchange token', details: exchangeData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { access_token, item_id } = exchangeData

    // Get account info
    const accountsResponse = await fetch(`${plaidBaseUrl}/accounts/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_token,
      }),
    })

    const accountsData = await accountsResponse.json()

    if (!accountsResponse.ok) {
      console.error('Plaid accounts error:', accountsData)
      return new Response(
        JSON.stringify({ error: 'Failed to get accounts', details: accountsData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Encrypt access token
    const encryptedToken = encryptToken(access_token, ENCRYPTION_KEY)

    // Use service role client to insert
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Store each account using upsert to handle multiple accounts per connection
    const insertedAccounts = []
    for (const account of accountsData.accounts) {
      const { data: insertedAccount, error: insertError } = await serviceClient
        .from('bank_accounts')
        .upsert({
          plaid_item_id: item_id,
          plaid_account_id: account.account_id,
          plaid_access_token_encrypted: encryptedToken,
          institution_name: metadata?.institution?.name || 'Unknown Institution',
          institution_id: metadata?.institution?.institution_id,
          account_name: account.name,
          account_type: account.type,
          account_subtype: account.subtype,
          mask: account.mask,
          current_balance: account.balances?.current || 0,
          available_balance: account.balances?.available,
          currency_code: account.balances?.iso_currency_code || 'USD',
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'plaid_account_id' })
        .select()
        .single()

      if (insertError) {
        console.error('Insert account error:', insertError, 'for account:', account.account_id)
      } else {
        insertedAccounts.push(insertedAccount)
        console.log('Successfully stored account:', account.name, account.account_id)
      }
    }

    console.log(`Stored ${insertedAccounts.length} bank accounts from ${metadata?.institution?.name}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        accounts: insertedAccounts,
        message: `Connected ${insertedAccounts.length} account(s) from ${metadata?.institution?.name || 'your bank'}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error in plaid-exchange-token:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
