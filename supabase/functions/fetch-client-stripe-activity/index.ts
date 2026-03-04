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
    const { clientId } = await req.json();
    if (!clientId) {
      return jsonResponse({ error: 'clientId required' }, 400);
    }

    // Look up all Stripe customer records for this client
    const { data: customers, error: custError } = await supabase
      .from('client_stripe_customers')
      .select('stripe_customer_id, stripe_account')
      .eq('client_id', clientId);

    if (custError) throw custError;

    if (!customers || customers.length === 0) {
      return jsonResponse({ invoices: [], customerCount: 0, message: 'No Stripe customer found for this client' });
    }

    const managementKey = Deno.env.get('STRIPE_MANAGEMENT_SECRET_KEY') || '';
    const adSpendKey = Deno.env.get('STRIPE_AD_SPEND_SECRET_KEY') || '';

    const allInvoices: any[] = [];

    for (const customer of customers) {
      const stripeKey = customer.stripe_account === 'management' ? managementKey : adSpendKey;
      if (!stripeKey) {
        console.warn(`No Stripe key configured for account: ${customer.stripe_account}`);
        continue;
      }

      // Fetch all invoices for this customer (paginate up to 3 pages = 150 invoices)
      let hasMore = true;
      let startingAfter: string | null = null;
      let pageCount = 0;

      while (hasMore && pageCount < 3) {
        const url = new URL('https://api.stripe.com/v1/invoices');
        url.searchParams.set('customer', customer.stripe_customer_id);
        url.searchParams.set('limit', '50');
        if (startingAfter) url.searchParams.set('starting_after', startingAfter);

        try {
          const res = await fetch(url.toString(), {
            headers: { 'Authorization': `Bearer ${stripeKey}` },
          });

          if (!res.ok) {
            const errText = await res.text();
            console.error(`Stripe invoices fetch failed for customer ${customer.stripe_customer_id}: ${errText}`);
            break;
          }

          const data = await res.json();
          hasMore = data.has_more || false;

          for (const invoice of data.data || []) {
            allInvoices.push({
              id: invoice.id,
              stripeAccount: customer.stripe_account,
              type: 'invoice',
              number: invoice.number || null,
              amount: (invoice.amount_due || 0) / 100,
              amountPaid: (invoice.amount_paid || 0) / 100,
              amountRemaining: (invoice.amount_remaining || 0) / 100,
              currency: invoice.currency || 'usd',
              status: invoice.status, // draft | open | paid | void | uncollectible
              description: invoice.description
                || invoice.lines?.data?.[0]?.description
                || null,
              created: invoice.created
                ? new Date(invoice.created * 1000).toISOString()
                : null,
              dueDate: invoice.due_date
                ? new Date(invoice.due_date * 1000).toISOString()
                : null,
              paidAt: invoice.status_transitions?.paid_at
                ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
                : null,
              periodStart: invoice.period_start
                ? new Date(invoice.period_start * 1000).toISOString()
                : null,
              periodEnd: invoice.period_end
                ? new Date(invoice.period_end * 1000).toISOString()
                : null,
              hostedUrl: invoice.hosted_invoice_url || null,
              pdfUrl: invoice.invoice_pdf || null,
              lastPaymentError: invoice.last_payment_error?.message || null,
              attemptCount: invoice.attempt_count || 0,
              subscriptionId: invoice.subscription || null,
              paymentIntentId: invoice.payment_intent || null,
            });

            if (hasMore) startingAfter = invoice.id;
          }

          pageCount++;
        } catch (err) {
          console.error(`Error fetching page for customer ${customer.stripe_customer_id}:`, err);
          break;
        }
      }
    }

    // Sort by created date descending
    allInvoices.sort((a, b) => {
      if (!a.created || !b.created) return 0;
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });

    return jsonResponse({
      invoices: allInvoices,
      customerCount: customers.length,
    });
  } catch (err) {
    console.error('fetch-client-stripe-activity error:', err);
    return jsonResponse({ error: 'Internal server error', details: String(err) }, 500);
  }
});
