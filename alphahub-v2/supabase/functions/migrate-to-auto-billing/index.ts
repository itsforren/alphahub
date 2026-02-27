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

  const { data: existingCustomer } = await supabase
    .from('client_stripe_customers')
    .select('stripe_customer_id')
    .eq('client_id', clientId)
    .eq('stripe_account', stripeAccount)
    .maybeSingle();

  if (existingCustomer) {
    stripeCustomerId = existingCustomer.stripe_customer_id;
  } else {
    try {
      const searchRes = await stripeGet(
        `/customers?email=${encodeURIComponent(clientEmail)}&limit=1`,
        stripeKey
      );
      if (searchRes.data?.length > 0) {
        stripeCustomerId = searchRes.data[0].id;
        await supabase.from('client_stripe_customers').insert({
          client_id: clientId,
          stripe_account: stripeAccount,
          stripe_customer_id: stripeCustomerId,
        });
        console.log(`Auto-linked ${stripeAccount} customer ${stripeCustomerId}`);
      }
    } catch (e) {
      console.error(`Error searching Stripe customers for ${stripeAccount}:`, e);
    }
  }

  if (!stripeCustomerId) return 0;

  try {
    const pmList = await stripeGet(
      `/payment_methods?customer=${stripeCustomerId}&type=card&limit=10`,
      stripeKey
    );
    if (!pmList.data?.length) return 0;

    const { data: existingPms } = await supabase
      .from('client_payment_methods')
      .select('stripe_payment_method_id')
      .eq('client_id', clientId)
      .eq('stripe_account', stripeAccount);

    const existingPmIds = new Set((existingPms || []).map((p: any) => p.stripe_payment_method_id));

    let defaultPmId: string | null = null;
    try {
      const customer = await stripeGet(`/customers/${stripeCustomerId}`, stripeKey);
      defaultPmId = customer.invoice_settings?.default_payment_method || null;
    } catch (_) {}

    for (const pm of pmList.data) {
      if (existingPmIds.has(pm.id)) continue;
      const card = pm.card || {};
      const isDefault = pm.id === defaultPmId;

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
      return jsonRes({ error: 'client_id required' }, 400);
    }

    // 1. Fetch client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('email, name')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      return jsonRes({ error: 'Client not found' }, 404);
    }

    console.log(`migrate-to-auto-billing: starting for client ${client_id} (${client.email})`);

    // 2. Sync cards from both Stripe accounts
    const mgmtKey = getStripeKey('management');
    const adKey = getStripeKey('ad_spend');

    await Promise.all([
      syncAccountCards(supabase, client_id, client.email, client.name, 'management', mgmtKey),
      syncAccountCards(supabase, client_id, client.email, client.name, 'ad_spend', adKey),
    ]);

    // 3. Check for default ad spend card
    const { data: adSpendCard } = await supabase
      .from('client_payment_methods')
      .select('id, card_brand, card_last_four')
      .eq('client_id', client_id)
      .eq('stripe_account', 'ad_spend')
      .eq('is_default', true)
      .maybeSingle();

    // If no default, check for any ad spend card and set it as default
    let hasAdSpendCard = !!adSpendCard;
    if (!hasAdSpendCard) {
      const { data: anyAdCard } = await supabase
        .from('client_payment_methods')
        .select('id, card_brand, card_last_four')
        .eq('client_id', client_id)
        .eq('stripe_account', 'ad_spend')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anyAdCard) {
        await supabase
          .from('client_payment_methods')
          .update({ is_default: true })
          .eq('id', anyAdCard.id);
        hasAdSpendCard = true;
        console.log(`Set ${anyAdCard.card_brand} ****${anyAdCard.card_last_four} as default ad_spend card`);
      }
    }

    // 4. Check for active management subscription
    let { data: activeSub } = await supabase
      .from('client_stripe_subscriptions')
      .select('id, stripe_subscription_id')
      .eq('client_id', client_id)
      .eq('status', 'active')
      .maybeSingle();

    // If no local subscription, search Stripe management account
    if (!activeSub) {
      const { data: mgmtCustomer } = await supabase
        .from('client_stripe_customers')
        .select('stripe_customer_id')
        .eq('client_id', client_id)
        .eq('stripe_account', 'management')
        .maybeSingle();

      if (mgmtCustomer) {
        try {
          const subs = await stripeGet(
            `/subscriptions?customer=${mgmtCustomer.stripe_customer_id}&status=active&limit=1`,
            mgmtKey
          );
          if (subs.data?.length > 0) {
            const sub = subs.data[0];
            const amount = (sub.items?.data?.[0]?.price?.unit_amount || 0) / 100;
            const interval = sub.items?.data?.[0]?.price?.recurring?.interval || 'month';

            await supabase.from('client_stripe_subscriptions').insert({
              client_id,
              stripe_account: 'management',
              stripe_subscription_id: sub.id,
              stripe_customer_id: mgmtCustomer.stripe_customer_id,
              stripe_price_id: sub.items?.data?.[0]?.price?.id || null,
              status: 'active',
              amount,
              billing_type: 'management',
              recurrence_type: interval === 'month' ? 'monthly' : 'bi_weekly',
              current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            });

            activeSub = { id: 'imported', stripe_subscription_id: sub.id };
            console.log(`Imported management subscription ${sub.id} from Stripe`);
          }
        } catch (e) {
          console.error('Error searching Stripe subscriptions:', e);
        }
      }
    }

    const hasSubscription = !!activeSub;

    console.log(`migrate-to-auto-billing: hasAdSpendCard=${hasAdSpendCard}, hasSubscription=${hasSubscription}`);

    // 5. Decision logic
    if (hasAdSpendCard && hasSubscription) {
      // Migrate: update wallet without resetting billing_cycle_start_at
      const { data: existingWallet } = await supabase
        .from('client_wallets')
        .select('id')
        .eq('client_id', client_id)
        .maybeSingle();

      const walletData = {
        billing_mode: 'auto_stripe',
        auto_billing_enabled: true,
        auto_charge_amount: 250,
        low_balance_threshold: 150,
      };

      if (existingWallet) {
        await supabase
          .from('client_wallets')
          .update(walletData)
          .eq('id', existingWallet.id);
      } else {
        await supabase
          .from('client_wallets')
          .insert({ client_id, ...walletData });
      }

      console.log(`migrate-to-auto-billing: client ${client_id} migrated successfully`);
      return jsonRes({ status: 'migrated' });
    }

    if (!hasAdSpendCard && !hasSubscription) {
      return jsonRes({ status: 'needs_full_setup' });
    }
    if (!hasAdSpendCard) {
      return jsonRes({ status: 'needs_ad_spend_card' });
    }
    return jsonRes({ status: 'needs_management_subscription' });

  } catch (error) {
    console.error('migrate-to-auto-billing error:', error);
    return jsonRes({ error: (error as Error).message || 'Internal server error' }, 500);
  }
});

function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
