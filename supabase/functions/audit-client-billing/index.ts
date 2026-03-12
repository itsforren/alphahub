import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { clientId, sinceDate } = await req.json();
    if (!clientId) return jsonResponse({ error: 'clientId required' }, 400);

    // Look up all ad_spend Stripe customer IDs for this client
    const { data: customers } = await supabase
      .from('client_stripe_customers')
      .select('stripe_customer_id')
      .eq('client_id', clientId)
      .eq('stripe_account', 'ad_spend');

    const adSpendKey = Deno.env.get('STRIPE_AD_SPEND_SECRET_KEY') || '';
    if (!adSpendKey) return jsonResponse({ error: 'Stripe key not configured' }, 500);

    // Default 60 days, or use sinceDate from request
    const since = sinceDate
      ? Math.floor(new Date(sinceDate).getTime() / 1000)
      : Math.floor(Date.now() / 1000) - (60 * 24 * 60 * 60);

    const stripeCharges: Array<{
      id: string;
      amount: number;
      status: string;
      created: string;
      customer: string;
      description: string | null;
      metadata: Record<string, string>;
    }> = [];

    for (const cust of customers || []) {
      let hasMore = true;
      let startingAfter: string | null = null;
      let pages = 0;

      while (hasMore && pages < 5) {
        const url = new URL('https://api.stripe.com/v1/payment_intents');
        url.searchParams.set('customer', cust.stripe_customer_id);
        url.searchParams.set('limit', '100');
        url.searchParams.set('created[gte]', String(since));

        if (startingAfter) url.searchParams.set('starting_after', startingAfter);

        const res = await fetch(url.toString(), {
          headers: { 'Authorization': `Bearer ${adSpendKey}` },
        });

        if (!res.ok) {
          console.error(`Stripe error for ${cust.stripe_customer_id}: ${await res.text()}`);
          break;
        }

        const data = await res.json();
        hasMore = data.has_more || false;

        for (const pi of data.data || []) {
          stripeCharges.push({
            id: pi.id,
            amount: (pi.amount || 0) / 100,
            status: pi.status,
            created: new Date(pi.created * 1000).toISOString(),
            customer: cust.stripe_customer_id,
            description: pi.description || null,
            metadata: pi.metadata || {},
          });
          if (hasMore) startingAfter = pi.id;
        }
        pages++;
      }
    }

    // Sort newest first
    stripeCharges.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    return jsonResponse({
      stripeCharges,
      customerIds: (customers || []).map(c => c.stripe_customer_id),
    });
  } catch (err) {
    console.error('audit-client-billing error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
