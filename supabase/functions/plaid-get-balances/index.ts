import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Decrypt token
function decryptToken(encrypted: string, key: string): string {
  const keyBytes = new TextEncoder().encode(key)
  const encryptedBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))
  const decrypted = new Uint8Array(encryptedBytes.length)
  
  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length]
  }
  
  return new TextDecoder().decode(decrypted)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID')
    const PLAID_SECRET = Deno.env.get('PLAID_SECRET')
    const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox'
    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY')

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      return new Response(
        JSON.stringify({ error: 'plaid_not_configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseClient = createClient(
      supabaseUrl,
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

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all active Plaid-connected bank accounts
    const { data: accounts, error: accountsError } = await serviceClient
      .from('bank_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('is_manual', false)
      .not('plaid_access_token_encrypted', 'is', null)

    if (accountsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bank accounts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ accounts: [], message: 'No connected accounts' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const plaidBaseUrl = PLAID_ENV === 'production' 
      ? 'https://production.plaid.com'
      : PLAID_ENV === 'development'
        ? 'https://development.plaid.com'
        : 'https://sandbox.plaid.com'

    // Group by item_id
    const itemGroups = new Map<string, typeof accounts>()
    for (const account of accounts) {
      const itemId = account.plaid_item_id
      if (!itemGroups.has(itemId)) {
        itemGroups.set(itemId, [])
      }
      itemGroups.get(itemId)!.push(account)
    }

    const updatedAccounts = []

    for (const [itemId, itemAccounts] of itemGroups) {
      const firstAccount = itemAccounts[0]
      const accessToken = decryptToken(firstAccount.plaid_access_token_encrypted!, ENCRYPTION_KEY!)

      try {
        const balancesResponse = await fetch(`${plaidBaseUrl}/accounts/balance/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            access_token: accessToken,
          }),
        })

        const balancesData = await balancesResponse.json()

        if (!balancesResponse.ok) {
          console.error(`Plaid balance error for item ${itemId}:`, balancesData)
          continue
        }

        // Update each account's balance
        for (const plaidAccount of balancesData.accounts) {
          const matchingAccount = itemAccounts.find(a => a.mask === plaidAccount.mask)
          if (matchingAccount) {
            const { data: updated } = await serviceClient
              .from('bank_accounts')
              .update({
                current_balance: plaidAccount.balances.current,
                available_balance: plaidAccount.balances.available,
              })
              .eq('id', matchingAccount.id)
              .select()
              .single()

            if (updated) {
              updatedAccounts.push(updated)
            }
          }
        }

      } catch (error) {
        console.error(`Error fetching balances for item ${itemId}:`, error)
      }
    }

    console.log(`Updated balances for ${updatedAccounts.length} accounts`)

    return new Response(
      JSON.stringify({ accounts: updatedAccounts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error in plaid-get-balances:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
