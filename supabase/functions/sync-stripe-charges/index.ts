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

function getStripeKey(stripeAccount: string): string {
  if (stripeAccount === 'management') {
    return Deno.env.get('STRIPE_MANAGEMENT_SECRET_KEY') || '';
  }
  return Deno.env.get('STRIPE_AD_SPEND_SECRET_KEY') || '';
}

async function fetchStripe(path: string, stripeKey: string): Promise<any> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { 'Authorization': `Bearer ${stripeKey}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Stripe ${path} failed (${res.status}): ${err}`);
  }
  return res.json();
}

function mapInvoiceToAlphaHub(invoice: any): { status: string; paidAt: string | null; lastError: string | null } {
  const stripeStatus = invoice.status;
  const pastDue = invoice.due_date && invoice.due_date * 1000 < Date.now();

  if (stripeStatus === 'paid') {
    const paidAtTs = invoice.status_transitions?.paid_at;
    return {
      status: 'paid',
      paidAt: paidAtTs ? new Date(paidAtTs * 1000).toISOString() : new Date().toISOString(),
      lastError: null,
    };
  }
  if (stripeStatus === 'void') {
    return { status: 'cancelled', paidAt: null, lastError: null };
  }
  if (stripeStatus === 'uncollectible' || (stripeStatus === 'open' && pastDue)) {
    return { status: 'overdue', paidAt: null, lastError: invoice.last_payment_error?.message || null };
  }
  // open but not past due = pending
  return { status: 'pending', paidAt: null, lastError: null };
}

function mapPaymentIntentToAlphaHub(pi: any): { status: string; paidAt: string | null; lastError: string | null } {
  if (pi.status === 'succeeded') {
    return {
      status: 'paid',
      paidAt: pi.created ? new Date(pi.created * 1000).toISOString() : new Date().toISOString(),
      lastError: null,
    };
  }
  if (pi.status === 'canceled' || pi.status === 'requires_payment_method') {
    return { status: 'overdue', paidAt: null, lastError: pi.last_payment_error?.message || null };
  }
  return { status: 'pending', paidAt: null, lastError: null };
}

// ── Per-client full sync: update existing + create missing from Stripe ──
async function syncClient(supabase: any, clientId: string) {
  const changes: any[] = [];
  let created = 0;
  let updated = 0;

  // 1. Get all Stripe customer records for this client
  const { data: customers, error: custError } = await supabase
    .from('client_stripe_customers')
    .select('stripe_customer_id, stripe_account')
    .eq('client_id', clientId);

  if (custError) throw custError;
  if (!customers || customers.length === 0) {
    return { synced: 0, created: 0, updated: 0, changes: [], message: 'No Stripe customer found' };
  }

  // 2. Fetch client name for billing record creation
  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', clientId)
    .maybeSingle();
  const clientName = client?.name || null;

  for (const customer of customers) {
    const stripeKey = getStripeKey(customer.stripe_account);
    if (!stripeKey) continue;

    // 3. Fetch all invoices from Stripe for this customer
    let hasMore = true;
    let startingAfter: string | null = null;
    let pageCount = 0;

    while (hasMore && pageCount < 3) {
      const url = new URL('https://api.stripe.com/v1/invoices');
      url.searchParams.set('customer', customer.stripe_customer_id);
      url.searchParams.set('limit', '50');
      if (startingAfter) url.searchParams.set('starting_after', startingAfter);

      let invoiceData: any;
      try {
        const res = await fetch(url.toString(), {
          headers: { 'Authorization': `Bearer ${stripeKey}` },
        });
        if (!res.ok) break;
        invoiceData = await res.json();
        hasMore = invoiceData.has_more || false;
        pageCount++;
      } catch {
        break;
      }

      for (const invoice of invoiceData.data || []) {
        if (hasMore) startingAfter = invoice.id;

        // Skip drafts — not real charges
        if (invoice.status === 'draft') continue;

        const { status: newStatus, paidAt, lastError } = mapInvoiceToAlphaHub(invoice);

        const amount = (invoice.amount_due || 0) / 100;
        const invoiceDate = invoice.created
          ? new Date(invoice.created * 1000).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        const periodStart = invoice.period_start
          ? new Date(invoice.period_start * 1000).toISOString().split('T')[0]
          : invoiceDate;
        const periodEnd = invoice.period_end
          ? new Date(invoice.period_end * 1000).toISOString().split('T')[0]
          : null;

        // 4. Look up existing billing_record by stripe_invoice_id
        const { data: existing } = await supabase
          .from('billing_records')
          .select('id, status, last_charge_error')
          .eq('stripe_invoice_id', invoice.id)
          .maybeSingle();

        if (existing) {
          // Update status if different
          if (existing.status !== newStatus || (lastError && existing.last_charge_error !== lastError)) {
            const updateData: any = { status: newStatus };
            if (paidAt) updateData.paid_at = paidAt;
            if (lastError !== null) updateData.last_charge_error = lastError;

            await supabase
              .from('billing_records')
              .update(updateData)
              .eq('id', existing.id);

            updated++;
            changes.push({ id: existing.id, stripeInvoiceId: invoice.id, from: existing.status, to: newStatus });
          }
        } else {
          // 5. No matching record — create one from Stripe data
          const billingType = customer.stripe_account === 'management' ? 'management' : 'ad_spend';
          const description = invoice.description
            || invoice.lines?.data?.[0]?.description
            || `${billingType === 'management' ? 'Management fee' : 'Ad spend'} - ${invoiceDate}`;

          const newRecord: any = {
            client_id: clientId,
            client_name: clientName,
            billing_type: billingType,
            amount,
            status: newStatus,
            stripe_invoice_id: invoice.id,
            stripe_account: customer.stripe_account,
            billing_period_start: periodStart,
            billing_period_end: periodEnd,
            due_date: invoiceDate,
            notes: description,
            is_recurring_parent: false,
            recurrence_type: 'one_time',
          };
          if (paidAt) newRecord.paid_at = paidAt;
          if (invoice.payment_intent) newRecord.stripe_payment_intent_id = invoice.payment_intent;
          if (invoice.subscription) newRecord.stripe_subscription_id = invoice.subscription;
          if (lastError) newRecord.last_charge_error = lastError;

          const { error: insertErr } = await supabase
            .from('billing_records')
            .insert(newRecord);

          if (!insertErr) {
            created++;
            changes.push({ stripeInvoiceId: invoice.id, action: 'created', status: newStatus, amount });
          } else {
            console.error(`Failed to create billing record for invoice ${invoice.id}:`, insertErr);
          }
        }
      }
    }
  }

  return {
    synced: customers.length,
    created,
    updated,
    changes,
  };
}

// ── Global sync: update existing records that already have Stripe IDs ──
async function syncGlobal(supabase: any) {
  const { data: records, error: fetchError } = await supabase
    .from('billing_records')
    .select('id, billing_type, status, stripe_invoice_id, stripe_payment_intent_id, client_name, client_id, stripe_account')
    .in('status', ['pending', 'overdue'])
    .or('stripe_invoice_id.not.is.null,stripe_payment_intent_id.not.is.null');

  if (fetchError) throw fetchError;
  if (!records || records.length === 0) return { synced: 0, updated: 0, changes: [] };

  const changes: any[] = [];
  let updated = 0;

  await Promise.all(records.map(async (record: any) => {
    // Use stripe_account field if available, fallback to billing_type
    const account = record.stripe_account || record.billing_type;
    const stripeKey = getStripeKey(account);
    if (!stripeKey) return;

    let newStatus: string;
    let paidAt: string | null = null;
    let lastError: string | null = null;

    try {
      if (record.stripe_invoice_id) {
        const invoice = await fetchStripe(`/invoices/${record.stripe_invoice_id}`, stripeKey);
        ({ status: newStatus, paidAt, lastError } = mapInvoiceToAlphaHub(invoice));
      } else if (record.stripe_payment_intent_id) {
        const pi = await fetchStripe(`/payment_intents/${record.stripe_payment_intent_id}`, stripeKey);
        ({ status: newStatus, paidAt, lastError } = mapPaymentIntentToAlphaHub(pi));
      } else {
        return;
      }
    } catch (err) {
      console.error(`Failed to fetch Stripe status for record ${record.id}:`, err);
      return;
    }

    if (newStatus !== record.status) {
      const updateData: any = { status: newStatus };
      if (paidAt) updateData.paid_at = paidAt;
      if (lastError !== null) updateData.last_charge_error = lastError;

      const { error: updateError } = await supabase
        .from('billing_records')
        .update(updateData)
        .eq('id', record.id);

      if (!updateError) {
        updated++;
        changes.push({
          id: record.id,
          clientName: record.client_name || record.client_id,
          from: record.status,
          to: newStatus,
        });
      }
    }
  }));

  return { synced: records.length, updated, changes };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Auth check — require service role Bearer or be a scheduled invocation (no body auth for cron)
  const authHeader = req.headers.get('Authorization') || '';
  const isCron = req.headers.get('x-cron-invoke') === 'true';
  if (!isCron && authHeader.slice(7) !== serviceKey) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* no body on cron */ }

    const clientId: string | null = body?.clientId || null;

    let result: any;
    if (clientId) {
      // Per-client full sync (from UI Sync button)
      result = await syncClient(supabase, clientId);
    } else {
      // Global reconciliation (cron or manual trigger without clientId)
      result = await syncGlobal(supabase);
    }

    console.log('sync-stripe-charges result:', JSON.stringify(result));
    return jsonResponse(result);
  } catch (err) {
    console.error('sync-stripe-charges error:', err);
    return jsonResponse({ error: 'Internal server error', details: String(err) }, 500);
  }
});
