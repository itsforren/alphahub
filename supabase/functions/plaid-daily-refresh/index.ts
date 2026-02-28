import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Decrypt token (same as plaid-get-balances)
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

  const startTime = Date.now()
  console.log('[plaid-daily-refresh] Starting scheduled refresh...')

  try {
    const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID')
    const PLAID_SECRET = Deno.env.get('PLAID_SECRET')
    const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox'
    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY')

    if (!PLAID_CLIENT_ID || !PLAID_SECRET || !ENCRYPTION_KEY) {
      console.error('[plaid-daily-refresh] Missing Plaid credentials')
      return new Response(
        JSON.stringify({ error: 'plaid_not_configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ── Step 1: Refresh Balances ──
    console.log('[plaid-daily-refresh] Step 1: Refreshing balances...')

    const { data: accounts, error: accountsError } = await serviceClient
      .from('bank_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('is_manual', false)
      .not('plaid_access_token_encrypted', 'is', null)

    if (accountsError) {
      console.error('[plaid-daily-refresh] Failed to fetch accounts:', accountsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bank accounts', details: accountsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!accounts || accounts.length === 0) {
      console.log('[plaid-daily-refresh] No active Plaid accounts found')
      return new Response(
        JSON.stringify({ message: 'No accounts to refresh', balances_updated: 0, transactions_synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const plaidBaseUrl = PLAID_ENV === 'production'
      ? 'https://production.plaid.com'
      : PLAID_ENV === 'development'
        ? 'https://development.plaid.com'
        : 'https://sandbox.plaid.com'

    // Group by item_id to minimize API calls
    const itemGroups = new Map<string, typeof accounts>()
    for (const account of accounts) {
      const itemId = account.plaid_item_id
      if (!itemId) continue
      if (!itemGroups.has(itemId)) itemGroups.set(itemId, [])
      itemGroups.get(itemId)!.push(account)
    }

    let balancesUpdated = 0
    const balanceErrors: string[] = []

    for (const [itemId, itemAccounts] of itemGroups) {
      const firstAccount = itemAccounts[0]
      try {
        const accessToken = decryptToken(firstAccount.plaid_access_token_encrypted!, ENCRYPTION_KEY)

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
          console.error(`[plaid-daily-refresh] Balance error for item ${itemId}:`, balancesData)
          balanceErrors.push(`Item ${itemId}: ${balancesData?.error_message ?? 'Unknown error'}`)
          continue
        }

        for (const plaidAccount of balancesData.accounts) {
          const matchingAccount = itemAccounts.find(a => a.mask === plaidAccount.mask)
          if (matchingAccount) {
            await serviceClient
              .from('bank_accounts')
              .update({
                current_balance: plaidAccount.balances.current,
                available_balance: plaidAccount.balances.available,
                last_synced_at: new Date().toISOString(),
              })
              .eq('id', matchingAccount.id)
            balancesUpdated++
          }
        }
      } catch (error) {
        console.error(`[plaid-daily-refresh] Error for item ${itemId}:`, error)
        balanceErrors.push(`Item ${itemId}: ${(error as Error).message}`)
      }
    }

    console.log(`[plaid-daily-refresh] Balances updated: ${balancesUpdated}`)

    // ── Step 2: Sync Transactions ──
    console.log('[plaid-daily-refresh] Step 2: Syncing transactions...')

    let totalTransactionsSynced = 0
    const txnErrors: string[] = []

    for (const [itemId, itemAccounts] of itemGroups) {
      const firstAccount = itemAccounts[0]
      try {
        const accessToken = decryptToken(firstAccount.plaid_access_token_encrypted!, ENCRYPTION_KEY)
        const cursor = firstAccount.sync_cursor || undefined

        const syncResponse = await fetch(`${plaidBaseUrl}/transactions/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            access_token: accessToken,
            cursor: cursor,
            count: 500,
          }),
        })

        const syncData = await syncResponse.json()

        if (!syncResponse.ok) {
          console.error(`[plaid-daily-refresh] Sync error for item ${itemId}:`, syncData)
          txnErrors.push(`Item ${itemId}: ${syncData?.error_message ?? 'Unknown error'}`)
          continue
        }

        const added = syncData.added ?? []
        const modified = syncData.modified ?? []

        // Insert new transactions
        for (const txn of added) {
          const matchingAccount = itemAccounts.find(a => a.plaid_account_id === txn.account_id)
          if (!matchingAccount) continue

          await serviceClient
            .from('expenses')
            .upsert({
              plaid_transaction_id: txn.transaction_id,
              bank_account_id: matchingAccount.id,
              amount: Math.abs(txn.amount),
              transaction_date: txn.date,
              merchant_name: txn.merchant_name || txn.name,
              description: txn.name,
              currency_code: txn.iso_currency_code || 'USD',
              is_pending: txn.pending,
              plaid_personal_finance_category: txn.personal_finance_category?.primary || null,
            }, { onConflict: 'plaid_transaction_id' })

          totalTransactionsSynced++
        }

        // Update modified transactions
        for (const txn of modified) {
          await serviceClient
            .from('expenses')
            .update({
              amount: Math.abs(txn.amount),
              transaction_date: txn.date,
              merchant_name: txn.merchant_name || txn.name,
              description: txn.name,
              is_pending: txn.pending,
            })
            .eq('plaid_transaction_id', txn.transaction_id)
        }

        // Update cursor for all accounts in this item
        if (syncData.next_cursor) {
          for (const acct of itemAccounts) {
            await serviceClient
              .from('bank_accounts')
              .update({ sync_cursor: syncData.next_cursor })
              .eq('id', acct.id)
          }
        }
      } catch (error) {
        console.error(`[plaid-daily-refresh] Txn sync error for item ${itemId}:`, error)
        txnErrors.push(`Item ${itemId}: ${(error as Error).message}`)
      }
    }

    const elapsed = Date.now() - startTime
    console.log(`[plaid-daily-refresh] Done in ${elapsed}ms. Balances: ${balancesUpdated}, Transactions: ${totalTransactionsSynced}`)

    return new Response(
      JSON.stringify({
        success: true,
        balances_updated: balancesUpdated,
        transactions_synced: totalTransactionsSynced,
        balance_errors: balanceErrors.length > 0 ? balanceErrors : undefined,
        transaction_errors: txnErrors.length > 0 ? txnErrors : undefined,
        elapsed_ms: elapsed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('[plaid-daily-refresh] Fatal error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
