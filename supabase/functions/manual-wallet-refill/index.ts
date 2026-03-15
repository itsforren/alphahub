import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // WALL-13: Require shared secret for service-to-service calls
  const billingSecret = Deno.env.get('BILLING_EDGE_SECRET');
  const providedSecret = req.headers.get('x-billing-secret');

  const authHeader = req.headers.get('Authorization');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;
  const hasValidSecret = billingSecret && providedSecret === billingSecret;

  if (!isServiceRole && !hasValidSecret) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { client_id, amount } = await req.json() as { client_id: string; amount?: number };
    if (!client_id) {
      return jsonRes({ error: 'client_id required' }, 400);
    }

    // Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from('client_wallets')
      .select('*')
      .eq('client_id', client_id)
      .maybeSingle();

    if (walletError || !wallet) {
      return jsonRes({ error: 'Wallet not found' }, 404);
    }

    const chargeAmount = amount || Number(wallet.auto_charge_amount) || 250;

    // Check monthly cap
    if (wallet.monthly_ad_spend_cap) {
      const rollingStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: monthlyCharges } = await supabase
        .from('billing_records')
        .select('amount')
        .eq('client_id', client_id)
        .eq('billing_type', 'ad_spend')
        .eq('status', 'paid')
        .gte('paid_at', rollingStart);

      const monthTotal = monthlyCharges?.reduce((sum: number, r: any) => sum + Number(r.amount), 0) ?? 0;
      const remainingCap = Number(wallet.monthly_ad_spend_cap) - monthTotal;

      if (remainingCap <= 0) {
        return jsonRes({ error: 'Monthly ad spend cap reached', cap: wallet.monthly_ad_spend_cap, spent: monthTotal }, 400);
      }

      if (chargeAmount > remainingCap) {
        return jsonRes({ error: `Charge amount ($${chargeAmount}) exceeds remaining cap ($${remainingCap.toFixed(2)})`, remaining_cap: remainingCap }, 400);
      }
    }

    // Check for payment method
    const { data: paymentMethod } = await supabase
      .from('client_payment_methods')
      .select('stripe_payment_method_id')
      .eq('client_id', client_id)
      .eq('stripe_account', 'ad_spend')
      .eq('is_default', true)
      .maybeSingle();

    if (!paymentMethod) {
      return jsonRes({ error: 'No default ad spend payment method on file' }, 400);
    }

    // Create billing record
    const today = new Date().toISOString().split('T')[0];
    const { data: newRecord, error: insertError } = await supabase
      .from('billing_records')
      .insert({
        client_id,
        billing_type: 'ad_spend',
        amount: chargeAmount,
        due_date: today,
        billing_period_start: today,
        status: 'charging',
        source: 'auto_recharge',
        recurrence_type: 'one_time',
        is_recurring_parent: false,
        notes: 'Manual wallet refill',
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    // Invoke create-stripe-invoice to charge
    const invoiceRes = await fetch(`${supabaseUrl}/functions/v1/create-stripe-invoice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ billing_record_id: newRecord.id }),
    });

    const invoiceResult = await invoiceRes.json();

    if (invoiceResult.auto_charged) {
      await supabase
        .from('client_wallets')
        .update({ last_auto_charge_at: new Date().toISOString() })
        .eq('id', wallet.id);

      console.log(`manual-wallet-refill: charged $${chargeAmount} for client ${client_id}`);
      return jsonRes({ success: true, amount_charged: chargeAmount });
    } else {
      return jsonRes({ error: 'Charge failed or requires action', details: invoiceResult }, 400);
    }

  } catch (error) {
    console.error('manual-wallet-refill error:', error);
    return jsonRes({ error: (error as Error).message || 'Internal server error' }, 500);
  }
});

function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
