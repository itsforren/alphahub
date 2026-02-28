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

async function stripeGet(path: string, key: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${key}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Stripe error: ${res.status}`);
  return data;
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
    const { client_id, stripe_account, setup_intent_id } = await req.json() as {
      client_id: string;
      stripe_account: StripeAccount;
      setup_intent_id: string;
    };

    if (!client_id || !stripe_account || !setup_intent_id) {
      return new Response(JSON.stringify({ error: 'client_id, stripe_account, and setup_intent_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeKey = getStripeKey(stripe_account);

    // Retrieve the SetupIntent to get the payment_method
    const setupIntent = await stripeGet(`/setup_intents/${setup_intent_id}`, stripeKey);
    const paymentMethodId = setupIntent.payment_method;

    if (!paymentMethodId) {
      return new Response(JSON.stringify({ error: 'No payment method on SetupIntent' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Retrieve PaymentMethod details (card info)
    const pm = await stripeGet(`/payment_methods/${paymentMethodId}`, stripeKey);
    const card = pm.card || {};

    // Get the Stripe customer ID
    const { data: customerRecord } = await supabase
      .from('client_stripe_customers')
      .select('stripe_customer_id')
      .eq('client_id', client_id)
      .eq('stripe_account', stripe_account)
      .single();

    if (!customerRecord) {
      return new Response(JSON.stringify({ error: 'No Stripe customer found for this client' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeCustomerId = customerRecord.stripe_customer_id;

    // Attach payment method to customer (if not already)
    try {
      await stripePost(`/payment_methods/${paymentMethodId}/attach`, stripeKey, {
        customer: stripeCustomerId,
      });
    } catch (e) {
      // If already attached, continue
      if (!(e as Error).message?.includes('already been attached')) throw e;
    }

    // Set as default payment method on customer
    await stripePost(`/customers/${stripeCustomerId}`, stripeKey, {
      'invoice_settings[default_payment_method]': paymentMethodId,
    });

    // Check for duplicate physical card (same last4, brand, exp) to prevent duplicates
    const { data: existingDuplicate } = await supabase
      .from('client_payment_methods')
      .select('id, stripe_payment_method_id')
      .eq('client_id', client_id)
      .eq('stripe_account', stripe_account)
      .eq('card_last_four', card.last4 || '')
      .eq('card_brand', card.brand || '')
      .eq('card_exp_month', card.exp_month || 0)
      .eq('card_exp_year', card.exp_year || 0)
      .neq('stripe_payment_method_id', paymentMethodId)
      .limit(1);

    // If a duplicate physical card exists, remove the old entry
    if (existingDuplicate && existingDuplicate.length > 0) {
      console.log(`Removing duplicate card entry ${existingDuplicate[0].id} for client ${client_id}`);
      await supabase
        .from('client_payment_methods')
        .delete()
        .eq('id', existingDuplicate[0].id);
    }

    // Unset is_default on existing payment methods for this client + account
    await supabase
      .from('client_payment_methods')
      .update({ is_default: false })
      .eq('client_id', client_id)
      .eq('stripe_account', stripe_account);

    // Save the new payment method
    const { data: savedPm, error: saveError } = await supabase
      .from('client_payment_methods')
      .upsert({
        client_id,
        stripe_account,
        stripe_customer_id: stripeCustomerId,
        stripe_payment_method_id: paymentMethodId,
        card_brand: card.brand || null,
        card_last_four: card.last4 || null,
        card_exp_month: card.exp_month || null,
        card_exp_year: card.exp_year || null,
        is_default: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'stripe_payment_method_id',
      })
      .select()
      .single();

    if (saveError) throw saveError;

    console.log(`Payment method saved for client ${client_id} (${stripe_account}):`, paymentMethodId);

    return new Response(JSON.stringify({
      success: true,
      payment_method: {
        id: savedPm.id,
        card_brand: card.brand,
        card_last_four: card.last4,
        card_exp_month: card.exp_month,
        card_exp_year: card.exp_year,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('save-payment-method error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
