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

async function stripeRequest(path: string, key: string, body?: Record<string, string>) {
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
    const { client_id, stripe_account } = await req.json() as {
      client_id: string;
      stripe_account: StripeAccount;
    };

    if (!client_id || !stripe_account) {
      return new Response(JSON.stringify({ error: 'client_id and stripe_account required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeKey = getStripeKey(stripe_account);

    // Check if Stripe customer already exists for this client + account
    const { data: existingCustomer } = await supabase
      .from('client_stripe_customers')
      .select('stripe_customer_id')
      .eq('client_id', client_id)
      .eq('stripe_account', stripe_account)
      .maybeSingle();

    let stripeCustomerId: string;

    if (existingCustomer) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
    } else {
      // Fetch client info to create Stripe customer
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('name, email')
        .eq('id', client_id)
        .single();

      if (clientError || !client) {
        return new Response(JSON.stringify({ error: 'Client not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create Stripe customer
      const customer = await stripeRequest('/customers', stripeKey, {
        email: client.email,
        name: client.name,
        'metadata[alpha_client_id]': client_id,
        'metadata[stripe_account]': stripe_account,
      });

      stripeCustomerId = customer.id;

      // Store in client_stripe_customers
      await supabase
        .from('client_stripe_customers')
        .insert({
          client_id,
          stripe_account,
          stripe_customer_id: stripeCustomerId,
        });
    }

    // Create SetupIntent for saving payment method
    const setupIntent = await stripeRequest('/setup_intents', stripeKey, {
      customer: stripeCustomerId,
      usage: 'off_session',
    });

    console.log(`SetupIntent created for client ${client_id} (${stripe_account}):`, setupIntent.id);

    return new Response(JSON.stringify({
      client_secret: setupIntent.client_secret,
      stripe_customer_id: stripeCustomerId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('create-setup-intent error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
