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

async function stripePost(path: string, key: string, body: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Stripe error: ${res.status}`);
  return data;
}

async function syncAccountCards(
  supabase: any,
  clientId: string,
  clientEmail: string,
  clientName: string,
  stripeAccount: StripeAccount,
  stripeKey: string
): Promise<number> {
  let stripeCustomerId: string | null = null;
  let synced = 0;

  // Check if we already have a customer record
  const { data: existingCustomer } = await supabase
    .from('client_stripe_customers')
    .select('stripe_customer_id')
    .eq('client_id', clientId)
    .eq('stripe_account', stripeAccount)
    .maybeSingle();

  if (existingCustomer) {
    stripeCustomerId = existingCustomer.stripe_customer_id;
  } else {
    // Search Stripe by email
    try {
      const searchRes = await stripeGet(
        `/customers?email=${encodeURIComponent(clientEmail)}&limit=1`,
        stripeKey
      );
      if (searchRes.data && searchRes.data.length > 0) {
        stripeCustomerId = searchRes.data[0].id;
        // Link in our DB
        await supabase.from('client_stripe_customers').insert({
          client_id: clientId,
          stripe_account: stripeAccount,
          stripe_customer_id: stripeCustomerId,
        });
        console.log(`Auto-linked ${stripeAccount} customer ${stripeCustomerId} for client ${clientId}`);
      }
    } catch (e) {
      console.error(`Error searching Stripe customers for ${stripeAccount}:`, e);
    }
  }

  if (!stripeCustomerId) {
    console.log(`[sync-stripe-cards] ${stripeAccount}: No customer found for email "${clientEmail}"`);
    return 0;
  }
  console.log(`[sync-stripe-cards] ${stripeAccount}: Found customer ${stripeCustomerId} for email "${clientEmail}"`);

  // Fetch payment methods from Stripe
  try {
    const pmList = await stripeGet(
      `/payment_methods?customer=${stripeCustomerId}&type=card&limit=10`,
      stripeKey
    );

    if (!pmList.data || pmList.data.length === 0) return 0;

    // Get existing payment methods in our DB
    const { data: existingPms } = await supabase
      .from('client_payment_methods')
      .select('stripe_payment_method_id')
      .eq('client_id', clientId)
      .eq('stripe_account', stripeAccount);

    const existingPmIds = new Set(
      (existingPms || []).map((p: any) => p.stripe_payment_method_id)
    );

    // Get the customer's default PM
    let defaultPmId: string | null = null;
    try {
      const customer = await stripeGet(`/customers/${stripeCustomerId}`, stripeKey);
      defaultPmId = customer.invoice_settings?.default_payment_method || null;
    } catch (_) {
      // ignore
    }

    for (const pm of pmList.data) {
      if (existingPmIds.has(pm.id)) continue;

      const card = pm.card || {};
      const isDefault = pm.id === defaultPmId;

      // Physical card dedup: check if same card_last_four + brand + exp already exists
      const { data: existingCard } = await supabase
        .from('client_payment_methods')
        .select('id')
        .eq('client_id', clientId)
        .eq('stripe_account', stripeAccount)
        .eq('card_last_four', card.last4 || '')
        .eq('card_brand', card.brand || '')
        .eq('card_exp_month', card.exp_month || 0)
        .eq('card_exp_year', card.exp_year || 0)
        .maybeSingle();

      if (existingCard) {
        // Update the existing row's stripe PM ID instead of inserting a duplicate
        await supabase
          .from('client_payment_methods')
          .update({
            stripe_payment_method_id: pm.id,
            is_default: isDefault || undefined,
          })
          .eq('id', existingCard.id);
        console.log(`[sync-stripe-cards] Dedup: updated existing card row ${existingCard.id} with new pm ${pm.id}`);
        continue;
      }

      // If this is default, unset existing defaults first
      if (isDefault) {
        await supabase
          .from('client_payment_methods')
          .update({ is_default: false })
          .eq('client_id', clientId)
          .eq('stripe_account', stripeAccount);
      }

      await supabase.from('client_payment_methods').insert({
        client_id: clientId,
        stripe_account: stripeAccount,
        stripe_customer_id: stripeCustomerId,
        stripe_payment_method_id: pm.id,
        card_brand: card.brand || null,
        card_last_four: card.last4 || null,
        card_exp_month: card.exp_month || null,
        card_exp_year: card.exp_year || null,
        is_default: isDefault,
      });

      synced++;
    }
  } catch (e) {
    console.error(`Error syncing cards for ${stripeAccount}:`, e);
  }

  return synced;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { client_id } = await req.json() as { client_id: string };

    if (!client_id) {
      return new Response(JSON.stringify({ error: 'client_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get client email
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('email, name')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      return new Response(JSON.stringify({ error: 'Client not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = { management: 0, ad_spend: 0 };

    // Sync both accounts in parallel
    const [mgmtSynced, adSpendSynced] = await Promise.all([
      syncAccountCards(supabase, client_id, client.email, client.name, 'management', getStripeKey('management')),
      syncAccountCards(supabase, client_id, client.email, client.name, 'ad_spend', getStripeKey('ad_spend')),
    ]);

    results.management = mgmtSynced;
    results.ad_spend = adSpendSynced;

    console.log(`sync-stripe-cards for client ${client_id}:`, results);

    return new Response(JSON.stringify({ synced: results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('sync-stripe-cards error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
