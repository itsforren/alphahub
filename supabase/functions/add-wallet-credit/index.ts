import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonRes({ error: 'Unauthorized' }, 401);
    }

    // Create a client with the user's token to verify identity
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return jsonRes({ error: 'Unauthorized' }, 401);
    }

    const { client_id, amount, description } = await req.json();

    if (!client_id) {
      return jsonRes({ error: 'client_id is required' }, 400);
    }
    if (typeof amount !== 'number' || amount === 0) {
      return jsonRes({ error: 'amount must be a non-zero number' }, 400);
    }

    // Get or create wallet (using service role — bypasses RLS)
    let wallet;
    const { data: existing } = await supabase
      .from('client_wallets')
      .select('id, tracking_start_date, ad_spend_balance')
      .eq('client_id', client_id)
      .maybeSingle();

    if (existing) {
      wallet = existing;
    } else {
      const today = new Date().toISOString().split('T')[0];
      const { data: newWallet, error: createError } = await supabase
        .from('client_wallets')
        .insert({ client_id, ad_spend_balance: 0, tracking_start_date: today })
        .select('id, tracking_start_date, ad_spend_balance')
        .single();
      if (createError) throw createError;
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

    const newBalance = Number(wallet.ad_spend_balance) + amount;

    // Update wallet balance
    const { error: updateError } = await supabase
      .from('client_wallets')
      .update({
        ad_spend_balance: newBalance,
        last_calculated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (updateError) throw updateError;

    // Record transaction
    const transactionType = amount >= 0 ? 'deposit' : 'adjustment';
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        client_id,
        transaction_type: transactionType,
        amount,
        balance_after: newBalance,
        description: description || (amount >= 0 ? 'Manual credit' : 'Manual adjustment'),
      })
      .select()
      .single();

    if (txError) throw txError;

    console.log(`Wallet credit: $${amount} for client ${client_id} by user ${user.id}`);

    return jsonRes({ success: true, transaction, new_balance: newBalance });

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
