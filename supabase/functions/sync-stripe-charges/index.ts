import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

// Creates a wallet deposit for a paid ad_spend billing record (idempotent).
// Returns true if a new deposit was created, false if it already existed or failed.
async function ensureWalletDeposit(
  supabase: any,
  billingRecordId: string,
  clientId: string,
  amount: number,
  paidAt: string
): Promise<boolean> {
  // Idempotency check — skip if deposit already exists for this billing record
  const { data: existingTx } = await supabase
    .from('wallet_transactions')
    .select('id')
    .eq('billing_record_id', billingRecordId)
    .maybeSingle();

  if (existingTx) return false; // Already deposited, nothing to do

  // Get or create the client wallet
  let { data: wallet } = await supabase
    .from('client_wallets')
    .select('id, tracking_start_date')
    .eq('client_id', clientId)
    .maybeSingle();

  const paidDate = paidAt.split('T')[0];

  if (!wallet) {
    const { data: newWallet, error: walletErr } = await supabase
      .from('client_wallets')
      .insert({
        client_id: clientId,
        tracking_start_date: paidDate,
      })
      .select('id, tracking_start_date')
      .single();

    if (walletErr) {
      console.error(`Failed to create wallet for client ${clientId}:`, walletErr);
      return false;
    }
    wallet = newWallet;
  } else if (!wallet.tracking_start_date) {
    // Wallet exists but tracking never started — set it now
    await supabase
      .from('client_wallets')
      .update({ tracking_start_date: paidDate })
      .eq('id', wallet.id);
  }

  if (!wallet?.id) return false;

  // Create the deposit entry
  const { error: txErr } = await supabase
    .from('wallet_transactions')
    .insert({
      wallet_id: wallet.id,
      client_id: clientId,
      transaction_type: 'deposit',
      amount,
      balance_after: 0,
      description: `Ad spend deposit (Stripe sync) — ${paidDate}`,
      billing_record_id: billingRecordId,
    });

  if (txErr) {
    console.error(`Failed to create wallet deposit for billing record ${billingRecordId}:`, txErr);
    return false;
  }
  return true;
}

// ── Per-client full sync: pull all Stripe invoices and reconcile ──
async function syncClient(supabase: any, clientId: string) {
  const changes: any[] = [];
  let created = 0;
  let updated = 0;
  let deposited = 0;

  // 1. Get all Stripe customer records for this client
  const { data: customers, error: custError } = await supabase
    .from('client_stripe_customers')
    .select('stripe_customer_id, stripe_account')
    .eq('client_id', clientId);

  if (custError) throw custError;
  if (!customers || customers.length === 0) {
    return { synced: 0, created: 0, updated: 0, deposited: 0, changes: [], message: 'No Stripe customer found' };
  }

  // 2. Fetch client name
  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', clientId)
    .maybeSingle();
  const clientName = client?.name || null;

  for (const customer of customers) {
    const stripeKey = getStripeKey(customer.stripe_account);
    if (!stripeKey) continue;

    const billingType = customer.stripe_account === 'management' ? 'management' : 'ad_spend';

    // 3. Paginate through all Stripe invoices for this customer
    let hasMore = true;
    let startingAfter: string | null = null;
    let pageCount = 0;

    while (hasMore && pageCount < 5) { // up to 250 invoices
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
        if (invoiceData.data?.length > 0) {
          startingAfter = invoiceData.data[invoiceData.data.length - 1].id;
        }
      } catch {
        break;
      }

      for (const invoice of invoiceData.data || []) {
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
          .select('id, status, billing_type, amount, last_charge_error')
          .eq('stripe_invoice_id', invoice.id)
          .maybeSingle();

        let recordId: string;

        if (existing) {
          recordId = existing.id;

          // Update status if different
          const statusChanged = existing.status !== newStatus;
          const errorChanged = lastError && existing.last_charge_error !== lastError;

          if (statusChanged || errorChanged) {
            const updateData: any = { status: newStatus };
            if (paidAt) updateData.paid_at = paidAt;
            if (lastError !== null) updateData.last_charge_error = lastError;
            else updateData.last_charge_error = null; // clear error on success

            await supabase
              .from('billing_records')
              .update(updateData)
              .eq('id', existing.id);

            updated++;
            changes.push({ id: existing.id, stripeInvoiceId: invoice.id, from: existing.status, to: newStatus });
          }
        } else {
          // 5. No matching record — create one from Stripe data
          const description = invoice.description
            || invoice.lines?.data?.[0]?.description
            || `${billingType === 'management' ? 'Management fee' : 'Ad spend'} — ${invoiceDate}`;

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

          const { data: insertedRecord, error: insertErr } = await supabase
            .from('billing_records')
            .insert(newRecord)
            .select('id')
            .single();

          if (!insertErr && insertedRecord) {
            recordId = insertedRecord.id;
            created++;
            changes.push({ stripeInvoiceId: invoice.id, action: 'created', status: newStatus, amount, billingType });
          } else {
            console.error(`Failed to create billing record for invoice ${invoice.id}:`, insertErr);
            continue;
          }
        }

        // 6. For paid ad_spend records, ensure wallet deposit exists
        if (newStatus === 'paid' && billingType === 'ad_spend' && paidAt && amount > 0) {
          const depositAmount = existing?.amount ?? amount;
          const wasDeposited = await ensureWalletDeposit(supabase, recordId!, clientId, depositAmount, paidAt);
          if (wasDeposited) deposited++;
        }
      }
    }
  }

  return {
    synced: customers.length,
    created,
    updated,
    deposited,
    changes,
  };
}

// ── Global reconciliation: fix statuses on existing records that have Stripe IDs ──
async function syncGlobal(supabase: any) {
  const { data: records, error: fetchError } = await supabase
    .from('billing_records')
    .select('id, billing_type, status, stripe_invoice_id, stripe_payment_intent_id, client_name, client_id, stripe_account, amount')
    .in('status', ['pending', 'overdue'])
    .or('stripe_invoice_id.not.is.null,stripe_payment_intent_id.not.is.null');

  if (fetchError) throw fetchError;
  if (!records || records.length === 0) return { synced: 0, updated: 0, deposited: 0, changes: [] };

  const changes: any[] = [];
  let updated = 0;
  let deposited = 0;

  await Promise.all(records.map(async (record: any) => {
    const account = record.stripe_account || record.billing_type;
    const stripeKey = getStripeKey(account);
    if (!stripeKey) return;

    let newStatus: string;
    let paidAt: string | null = null;
    let lastError: string | null = null;

    try {
      if (record.stripe_invoice_id) {
        const res = await fetch(`https://api.stripe.com/v1/invoices/${record.stripe_invoice_id}`, {
          headers: { 'Authorization': `Bearer ${stripeKey}` },
        });
        if (!res.ok) return;
        const invoice = await res.json();
        ({ status: newStatus, paidAt, lastError } = mapInvoiceToAlphaHub(invoice));
      } else if (record.stripe_payment_intent_id) {
        const res = await fetch(`https://api.stripe.com/v1/payment_intents/${record.stripe_payment_intent_id}`, {
          headers: { 'Authorization': `Bearer ${stripeKey}` },
        });
        if (!res.ok) return;
        const pi = await res.json();
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
      else updateData.last_charge_error = null;

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

        // Ensure wallet deposit for newly-paid ad_spend records
        if (newStatus === 'paid' && record.billing_type === 'ad_spend' && paidAt && record.amount > 0) {
          await ensureWalletDeposit(supabase, record.id, record.client_id, record.amount, paidAt);
          deposited++;
        }
      }
    }
  }));

  return { synced: records.length, updated, deposited, changes };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // No auth check — internal admin function called from within the AlphaHub admin UI

  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* no body on cron */ }

    const clientId: string | null = body?.clientId || null;

    let result: any;
    if (clientId) {
      result = await syncClient(supabase, clientId);
    } else {
      result = await syncGlobal(supabase);
    }

    console.log('sync-stripe-charges result:', JSON.stringify(result));
    return jsonResponse(result);
  } catch (err) {
    console.error('sync-stripe-charges error:', err);
    return jsonResponse({ error: 'Internal server error', details: String(err) }, 500);
  }
});
