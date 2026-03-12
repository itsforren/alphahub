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

interface StripeCustomerInfo {
  id: string;
  email: string | null;
  name: string | null;
  created: string;
}

// Search Stripe customers by email (ad_spend account only — uses the key passed in)
async function searchStripeByEmail(stripeKey: string, email: string): Promise<StripeCustomerInfo[]> {
  try {
    const url = new URL('https://api.stripe.com/v1/customers');
    url.searchParams.set('email', email);
    url.searchParams.set('limit', '10');
    const res = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${stripeKey}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((c: any) => ({
      id: c.id,
      email: c.email || null,
      name: c.name || null,
      created: new Date(c.created * 1000).toISOString(),
    }));
  } catch {
    return [];
  }
}

// Search Stripe customers by name (ad_spend account only)
async function searchStripeByName(stripeKey: string, name: string): Promise<StripeCustomerInfo[]> {
  try {
    const url = new URL('https://api.stripe.com/v1/customers/search');
    url.searchParams.set('query', `name~"${name}"`);
    url.searchParams.set('limit', '10');
    const res = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${stripeKey}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((c: any) => ({
      id: c.id,
      email: c.email || null,
      name: c.name || null,
      created: new Date(c.created * 1000).toISOString(),
    }));
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
    const { clientId, sinceDate, linkCustomerId } = await req.json();
    if (!clientId) return jsonResponse({ error: 'clientId required' }, 400);

    const adSpendKey = Deno.env.get('STRIPE_AD_SPEND_SECRET_KEY') || '';
    if (!adSpendKey) return jsonResponse({ error: 'Stripe key not configured' }, 500);

    // ── Handle explicit link request ──
    if (linkCustomerId) {
      const { error } = await supabase
        .from('client_stripe_customers')
        .insert({ client_id: clientId, stripe_account: 'ad_spend', stripe_customer_id: linkCustomerId });
      if (error) return jsonResponse({ error: `Failed to link: ${error.message}` }, 400);
      console.log(`Linked Stripe customer ${linkCustomerId} to client ${clientId}`);
      return jsonResponse({ success: true, linked: linkCustomerId });
    }

    // Default 60 days, or use sinceDate from request
    const since = sinceDate
      ? Math.floor(new Date(sinceDate).getTime() / 1000)
      : Math.floor(Date.now() / 1000) - (60 * 24 * 60 * 60);

    // 1. Get linked Stripe customer IDs from our DB (ad_spend only)
    const { data: linkedCustomers } = await supabase
      .from('client_stripe_customers')
      .select('stripe_customer_id')
      .eq('client_id', clientId)
      .eq('stripe_account', 'ad_spend');

    const linkedIds = new Set((linkedCustomers || []).map(c => c.stripe_customer_id));

    // 2. Get client email and name to search Stripe ad_spend account for unlinked customers
    const { data: client } = await supabase
      .from('clients')
      .select('email, name')
      .eq('id', clientId)
      .single();

    const discoveredCustomers: Array<{ id: string; email: string | null; name: string | null; created: string }> = [];
    const seenDiscovered = new Set<string>();

    // Search by email on ad_spend Stripe account
    if (client?.email) {
      const emailResults = await searchStripeByEmail(adSpendKey, client.email);
      for (const cust of emailResults) {
        if (!linkedIds.has(cust.id) && !seenDiscovered.has(cust.id)) {
          seenDiscovered.add(cust.id);
          discoveredCustomers.push(cust);
        }
      }
    }

    // Search by name on ad_spend Stripe account
    if (client?.name) {
      const nameResults = await searchStripeByName(adSpendKey, client.name);
      for (const cust of nameResults) {
        if (!linkedIds.has(cust.id) && !seenDiscovered.has(cust.id)) {
          seenDiscovered.add(cust.id);
          discoveredCustomers.push(cust);
        }
      }
    }

    // 3. Fetch payment intents from linked customers only
    const allCharges = [];
    for (const custId of linkedIds) {
      const charges = await fetchPaymentIntents(adSpendKey, custId, since);
      allCharges.push(...charges);
    }

    // Also fetch from discovered customers so admin can see what's there
    const discoveredCharges = [];
    for (const cust of discoveredCustomers) {
      const charges = await fetchPaymentIntents(adSpendKey, cust.id, since);
      discoveredCharges.push(...charges);
    }

    // Dedupe
    const seen = new Set<string>();
    const dedupedCharges = [...allCharges, ...discoveredCharges].filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    dedupedCharges.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    return jsonResponse({
      stripeCharges: dedupedCharges,
      customerIds: [...linkedIds],
      discoveredCustomers,
    });
  } catch (err) {
    console.error('audit-client-billing error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
