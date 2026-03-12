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

// Search Stripe customers by email
async function searchStripeByEmail(stripeKey: string, email: string): Promise<string[]> {
  try {
    const url = new URL('https://api.stripe.com/v1/customers');
    url.searchParams.set('email', email);
    url.searchParams.set('limit', '10');
    const res = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${stripeKey}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((c: any) => c.id);
  } catch {
    return [];
  }
}

// Search Stripe customers by name
async function searchStripeByName(stripeKey: string, name: string): Promise<string[]> {
  try {
    const url = new URL('https://api.stripe.com/v1/customers/search');
    url.searchParams.set('query', `name~"${name}"`);
    url.searchParams.set('limit', '10');
    const res = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${stripeKey}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((c: any) => c.id);
  } catch {
    return [];
  }
}

// Fetch payment intents for a customer
async function fetchPaymentIntents(
  stripeKey: string,
  customerId: string,
  since: number,
): Promise<Array<{ id: string; amount: number; status: string; created: string; customer: string; description: string | null; metadata: Record<string, string> }>> {
  const results: typeof returnType = [];
  type returnType = Array<{ id: string; amount: number; status: string; created: string; customer: string; description: string | null; metadata: Record<string, string> }>;

  let hasMore = true;
  let startingAfter: string | null = null;
  let pages = 0;

  while (hasMore && pages < 5) {
    const url = new URL('https://api.stripe.com/v1/payment_intents');
    url.searchParams.set('customer', customerId);
    url.searchParams.set('limit', '100');
    url.searchParams.set('created[gte]', String(since));
    if (startingAfter) url.searchParams.set('starting_after', startingAfter);

    const res = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${stripeKey}` },
    });

    if (!res.ok) {
      console.error(`Stripe PI fetch error for ${customerId}: ${await res.text()}`);
      break;
    }

    const data = await res.json();
    hasMore = data.has_more || false;

    for (const pi of data.data || []) {
      results.push({
        id: pi.id,
        amount: (pi.amount || 0) / 100,
        status: pi.status,
        created: new Date(pi.created * 1000).toISOString(),
        customer: customerId,
        description: pi.description || null,
        metadata: pi.metadata || {},
      });
      if (hasMore) startingAfter = pi.id;
    }
    pages++;
  }

  return results;
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

    const adSpendKey = Deno.env.get('STRIPE_AD_SPEND_SECRET_KEY') || '';
    if (!adSpendKey) return jsonResponse({ error: 'Stripe key not configured' }, 500);

    // Default 60 days, or use sinceDate from request
    const since = sinceDate
      ? Math.floor(new Date(sinceDate).getTime() / 1000)
      : Math.floor(Date.now() / 1000) - (60 * 24 * 60 * 60);

    // 1. Get linked Stripe customer IDs from our DB
    const { data: linkedCustomers } = await supabase
      .from('client_stripe_customers')
      .select('stripe_customer_id')
      .eq('client_id', clientId)
      .eq('stripe_account', 'ad_spend');

    const linkedIds = new Set((linkedCustomers || []).map(c => c.stripe_customer_id));

    // 2. Get client email and name to search Stripe for unlinked customers
    const { data: client } = await supabase
      .from('clients')
      .select('email, name')
      .eq('id', clientId)
      .single();

    const discoveredIds = new Set<string>();
    const newlyLinked: string[] = [];

    if (client?.email) {
      const emailResults = await searchStripeByEmail(adSpendKey, client.email);
      for (const id of emailResults) {
        if (!linkedIds.has(id)) discoveredIds.add(id);
      }
    }

    if (client?.name) {
      const nameResults = await searchStripeByName(adSpendKey, client.name);
      for (const id of nameResults) {
        if (!linkedIds.has(id)) discoveredIds.add(id);
      }
    }

    // 3. Auto-link any discovered customers to our DB
    for (const custId of discoveredIds) {
      const { error } = await supabase
        .from('client_stripe_customers')
        .insert({ client_id: clientId, stripe_account: 'ad_spend', stripe_customer_id: custId })
        .select()
        .single();

      if (!error) {
        newlyLinked.push(custId);
        linkedIds.add(custId);
        console.log(`Auto-linked Stripe customer ${custId} to client ${clientId}`);
      }
    }

    // 4. Fetch payment intents from ALL customers (linked + newly discovered)
    const allCustomerIds = [...linkedIds];
    const allCharges = [];

    for (const custId of allCustomerIds) {
      const charges = await fetchPaymentIntents(adSpendKey, custId, since);
      allCharges.push(...charges);
    }

    // Dedupe by PI id (same PI can't belong to multiple customers, but just in case)
    const seen = new Set<string>();
    const dedupedCharges = allCharges.filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    // Sort newest first
    dedupedCharges.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    return jsonResponse({
      stripeCharges: dedupedCharges,
      customerIds: allCustomerIds,
      newlyLinked,
    });
  } catch (err) {
    console.error('audit-client-billing error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
