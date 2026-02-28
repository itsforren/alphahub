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

// Apply categorization rules
async function categorizeTransaction(
  serviceClient: any,
  merchantName: string | null,
  description: string
): Promise<{ categoryId: string | null; isAutoCateg: boolean }> {
  if (!merchantName && !description) {
    return { categoryId: null, isAutoCateg: false }
  }

  const { data: rules } = await serviceClient
    .from('categorization_rules')
    .select('id, category_id, match_type, match_value, match_field')
    .eq('is_active', true)
    .order('priority', { ascending: false })

  if (!rules || rules.length === 0) {
    return { categoryId: null, isAutoCateg: false }
  }

  const textToMatch = {
    merchant_name: (merchantName || '').toUpperCase(),
    description: (description || '').toUpperCase(),
  }

  for (const rule of rules) {
    const field = textToMatch[rule.match_field as keyof typeof textToMatch] || ''
    const matchValue = rule.match_value.toUpperCase()
    let matched = false

    switch (rule.match_type) {
      case 'exact':
        matched = field === matchValue
        break
      case 'contains':
        matched = field.includes(matchValue)
        break
      case 'starts_with':
        matched = field.startsWith(matchValue)
        break
      case 'ends_with':
        matched = field.endsWith(matchValue)
        break
      case 'regex':
        try {
          matched = new RegExp(rule.match_value, 'i').test(field)
        } catch {
          matched = false
        }
        break
    }

    if (matched) {
      return { categoryId: rule.category_id, isAutoCateg: true }
    }
  }

  return { categoryId: null, isAutoCateg: false }
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

    // For cron jobs, we skip auth check. For manual triggers, verify admin.
    const authHeader = req.headers.get('Authorization')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    // If there's an auth header, verify it's an admin
    if (authHeader && !authHeader.includes(serviceRoleKey)) {
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
        global: { headers: { Authorization: authHeader } }
      })
      
      const { data: { user } } = await userClient.auth.getUser()
      if (user) {
        const { data: roleData } = await userClient.rpc('has_role', { 
          _user_id: user.id, 
          _role: 'admin' 
        })
        if (!roleData) {
          return new Response(
            JSON.stringify({ error: 'Admin access required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // Get optional bank_account_id from request body
    let bankAccountId: string | null = null
    try {
      const body = await req.json()
      bankAccountId = body.bank_account_id
    } catch {
      // No body, sync all accounts
    }

    // Get all active bank accounts (or specific one)
    let query = serviceClient
      .from('bank_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('is_manual', false)
      .not('plaid_access_token_encrypted', 'is', null)

    if (bankAccountId) {
      query = query.eq('id', bankAccountId)
    }

    const { data: accounts, error: accountsError } = await query

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bank accounts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No bank accounts to sync', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const plaidBaseUrl = PLAID_ENV === 'production' 
      ? 'https://production.plaid.com'
      : PLAID_ENV === 'development'
        ? 'https://development.plaid.com'
        : 'https://sandbox.plaid.com'

    let totalSynced = 0
    const syncResults = []

    // Group accounts by item_id (they share the same access token)
    const itemGroups = new Map<string, typeof accounts>()
    for (const account of accounts) {
      const itemId = account.plaid_item_id
      if (!itemGroups.has(itemId)) {
        itemGroups.set(itemId, [])
      }
      itemGroups.get(itemId)!.push(account)
    }

    for (const [itemId, itemAccounts] of itemGroups) {
      const firstAccount = itemAccounts[0]
      const accessToken = decryptToken(firstAccount.plaid_access_token_encrypted!, ENCRYPTION_KEY!)

      try {
        // Use transactions/sync for incremental updates
        let cursor = firstAccount.sync_cursor || undefined
        let hasMore = true
        let addedCount = 0
        let modifiedCount = 0
        let removedCount = 0

        while (hasMore) {
          const syncBody: any = {
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            access_token: accessToken,
          }
          if (cursor) {
            syncBody.cursor = cursor
          }

          const syncResponse = await fetch(`${plaidBaseUrl}/transactions/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(syncBody),
          })

          const syncData = await syncResponse.json()

          if (!syncResponse.ok) {
            console.error(`Plaid sync error for item ${itemId}:`, syncData)
            syncResults.push({ itemId, error: syncData.error_message || 'Sync failed' })
            break
          }

          // Process added transactions
          for (const tx of syncData.added || []) {
            // Find matching account
            const matchingAccount = itemAccounts.find(a => 
              a.mask === tx.account_id.slice(-4) || a.account_name.includes(tx.account_id)
            ) || firstAccount

            const { categoryId, isAutoCateg } = await categorizeTransaction(
              serviceClient,
              tx.merchant_name,
              tx.name
            )

            const { error: insertError } = await serviceClient
              .from('expenses')
              .upsert({
                plaid_transaction_id: tx.transaction_id,
                bank_account_id: matchingAccount.id,
                category_id: categoryId,
                transaction_date: tx.date,
                posted_date: tx.authorized_date,
                merchant_name: tx.merchant_name,
                description: tx.name,
                amount: Math.abs(tx.amount), // Plaid uses negative for outflows
                currency_code: tx.iso_currency_code || 'USD',
                is_pending: tx.pending,
                is_auto_categorized: isAutoCateg,
                plaid_category: tx.category,
                plaid_personal_finance_category: tx.personal_finance_category,
              }, { onConflict: 'plaid_transaction_id' })

            if (insertError) {
              console.error('Insert transaction error:', insertError)
            } else {
              addedCount++
            }
          }

          // Process modified transactions
          for (const tx of syncData.modified || []) {
            const { error: updateError } = await serviceClient
              .from('expenses')
              .update({
                transaction_date: tx.date,
                posted_date: tx.authorized_date,
                merchant_name: tx.merchant_name,
                description: tx.name,
                amount: Math.abs(tx.amount),
                is_pending: tx.pending,
                plaid_category: tx.category,
                plaid_personal_finance_category: tx.personal_finance_category,
              })
              .eq('plaid_transaction_id', tx.transaction_id)

            if (!updateError) modifiedCount++
          }

          // Process removed transactions
          for (const tx of syncData.removed || []) {
            const { error: deleteError } = await serviceClient
              .from('expenses')
              .delete()
              .eq('plaid_transaction_id', tx.transaction_id)

            if (!deleteError) removedCount++
          }

          cursor = syncData.next_cursor
          hasMore = syncData.has_more
        }

        // Update sync cursor and timestamp for all accounts in this item
        for (const account of itemAccounts) {
          await serviceClient
            .from('bank_accounts')
            .update({ 
              sync_cursor: cursor,
              last_synced_at: new Date().toISOString()
            })
            .eq('id', account.id)
        }

        totalSynced += addedCount
        syncResults.push({
          itemId,
          institution: firstAccount.institution_name,
          added: addedCount,
          modified: modifiedCount,
          removed: removedCount,
        })

        console.log(`Synced ${addedCount} transactions for ${firstAccount.institution_name}`)

      } catch (error: unknown) {
        console.error(`Error syncing item ${itemId}:`, error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        syncResults.push({ itemId, error: message })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalSynced,
        results: syncResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error in plaid-sync-transactions:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
