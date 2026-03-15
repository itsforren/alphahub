import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-billing-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // WALL-13: Require shared secret or service role JWT for service-to-service calls
    const billingSecret = Deno.env.get('BILLING_EDGE_SECRET');
    const providedSecret = req.headers.get('x-billing-secret');

    const authHeader = req.headers.get('Authorization');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;
    const hasValidSecret = billingSecret && providedSecret === billingSecret;

    if (!isServiceRole && !hasValidSecret) {
      return jsonRes(
        { error: 'Unauthorized' },
        401
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { client_id, amount, description, reason, billing_record_id, type } = await req.json();

    // Reject deposit-type transactions — deposits must come through Stripe
    if (type === 'deposit') {
      return jsonRes(
        { error: 'Deposits must come through Stripe. Use adjustment for corrections.' },
        400
      );
    }

    if (!client_id) {
      return jsonRes({ error: 'client_id is required' }, 400);
    }
    if (typeof amount !== 'number' || amount === 0) {
      return jsonRes({ error: 'amount must be a non-zero number' }, 400);
    }

    // Get or create wallet (using service role — bypasses RLS)
    let wallet;
    const { data: existing, error: fetchError } = await supabase
      .from('client_wallets')
      .select('id, tracking_start_date')
      .eq('client_id', client_id)
      .maybeSingle();

    if (fetchError) {
      console.error('Wallet fetch error:', fetchError);
      return jsonRes({ error: 'Failed to fetch wallet: ' + fetchError.message }, 500);
    }

    if (existing) {
      wallet = existing;
    } else {
      const today = new Date().toISOString().split('T')[0];
      const { data: newWallet, error: createError } = await supabase
        .from('client_wallets')
        .insert({ client_id, ad_spend_balance: 0, tracking_start_date: today })
        .select('id, tracking_start_date')
        .single();
      if (createError) {
        console.error('Wallet create error:', createError);
        return jsonRes({ error: 'Failed to create wallet: ' + createError.message }, 500);
      }
      wallet = newWallet;
    }

    // Ensure tracking_start_date is set
    if (!wallet.tracking_start_date) {
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('client_wallets')
        .update({ tracking_start_date: today })
        .eq('id', wallet.id);
    }

    // Idempotency check: if billing_record_id provided, check for existing adjustment
    if (billing_record_id) {
      const { data: existingTx } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('billing_record_id', billing_record_id)
        .eq('transaction_type', 'adjustment')
        .maybeSingle();

      if (existingTx) {
        return jsonRes({ success: true, already_exists: true, transaction_id: existingTx.id });
      }
    }

    // Record transaction — always 'adjustment', never 'deposit'
    const txDescription = description || reason || 'Admin adjustment';
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        client_id,
        transaction_type: 'adjustment',
        amount,
        balance_after: 0, // Deprecated — balance is computed via compute_wallet_balance()
        description: txDescription,
        billing_record_id: billing_record_id || null,
      })
      .select()
      .single();

    if (txError) {
      console.error('Transaction insert error:', txError);
      return jsonRes({ error: 'Failed to record transaction: ' + txError.message }, 500);
    }

    console.log(`Wallet adjustment: $${amount} for client ${client_id} — ${txDescription}`);

    return jsonRes({ success: true, transaction });

  } catch (error) {
    console.error('add-wallet-credit error:', error);
    return jsonRes({ error: (error as Error).message || 'Internal server error' }, 500);
  }
});

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
