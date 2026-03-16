import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type StripeAccount = 'ad_spend' | 'management';

function getStripeKey(account: StripeAccount): string {
  const key = account === 'management'
    ? Deno.env.get('STRIPE_MANAGEMENT_SECRET_KEY')
    : Deno.env.get('STRIPE_AD_SPEND_SECRET_KEY');
  if (!key) throw new Error(`Missing Stripe secret key for ${account}`);
  return key;
}

async function stripePost(path: string, key: string, body?: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Stripe error: ${res.status}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { client_id, stripe_account, payment_method_db_id } = await req.json() as {
      client_id: string;
      stripe_account: StripeAccount;
      payment_method_db_id: string;
    };

    if (!client_id || !stripe_account || !payment_method_db_id) {
      return new Response(JSON.stringify({ error: 'client_id, stripe_account, and payment_method_db_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Look up the payment method row
    const { data: pmRow, error: pmError } = await supabase
      .from('client_payment_methods')
      .select('id, client_id, stripe_account, stripe_payment_method_id, stripe_customer_id')
      .eq('id', payment_method_db_id)
      .single();

    if (pmError || !pmRow) {
      return new Response(JSON.stringify({ error: 'Payment method not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Validate ownership and account match
    if (pmRow.client_id !== client_id || pmRow.stripe_account !== stripe_account) {
      return new Response(JSON.stringify({ error: 'Payment method does not belong to this client or account' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { stripe_payment_method_id, stripe_customer_id } = pmRow;

    // 3. Update Stripe customer default payment method
    const stripeKey = getStripeKey(stripe_account);
    await stripePost(`/customers/${stripe_customer_id}`, stripeKey, {
      'invoice_settings[default_payment_method]': stripe_payment_method_id,
    });

    // 4. Unset is_default on all PMs for this client + account
    const { error: unsetError } = await supabase
      .from('client_payment_methods')
      .update({ is_default: false })
      .eq('client_id', client_id)
      .eq('stripe_account', stripe_account);

    if (unsetError) throw unsetError;

    // 5. Set is_default on the selected PM
    const { error: setError } = await supabase
      .from('client_payment_methods')
      .update({ is_default: true })
      .eq('id', payment_method_db_id);

    if (setError) throw setError;

    console.log(`Default payment method set for client ${client_id} (${stripe_account}): ${stripe_payment_method_id}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('set-default-payment-method error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
