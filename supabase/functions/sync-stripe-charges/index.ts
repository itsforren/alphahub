import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notify } from '../_shared/notifications.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-billing-secret',
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

async function sendSlackAlert(message: string) {
  const webhookUrl = Deno.env.get('SLACK_BILLING_WEBHOOK_URL') || Deno.env.get('SLACK_CHAT_WEBHOOK_URL');
  if (!webhookUrl) {
    console.log('No Slack webhook configured, skipping alert');
    return;
  }
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  } catch (err) {
    console.error('Slack alert failed:', err);
  }
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

// Flags a missing wallet deposit for admin review instead of auto-creating it.
// Per CONTEXT.md: "reconciliation flags the charge for admin review -- does NOT auto-create."
// Returns true if a new flag was created, false if already flagged/deposited.
async function flagMissingDeposit(
  supabase: any,
  billingRecordId: string,
  clientId: string,
  amount: number,
): Promise<boolean> {
  // Idempotency check -- skip if deposit already exists for this billing record
  const { data: existingTxRows } = await supabase
    .from('wallet_transactions')
    .select('id')
    .eq('billing_record_id', billingRecordId)
    .eq('transaction_type', 'deposit')
    .limit(1);

  if (existingTxRows && existingTxRows.length > 0) return false; // Already deposited

  // Check if a system_alert already exists for this billing_record_id (avoid duplicate alerts)
  const { data: existingAlert } = await supabase
    .from('system_alerts')
    .select('id')
    .eq('alert_type', 'missing_deposit')
    .eq('metadata->>billing_record_id', billingRecordId)
    .limit(1);

  if (existingAlert && existingAlert.length > 0) return false; // Already flagged

  // Insert into stripe_processed_events for dedup consistency
  const { error: dedupError } = await supabase
    .from('stripe_processed_events')
    .insert({
      event_id: `sync_${billingRecordId}`,
      event_type: 'sync.missing_deposit',
      stripe_account: 'ad_spend',
      processed_at: new Date().toISOString(),
    });

  if (dedupError) return false; // Already processed (PK conflict)

  // Route through notify() for system_alerts persistence + Slack delivery + email/SMS for critical
  try {
    await notify({
      supabase,
      clientId,
      severity: 'warning',
      title: `Missing wallet deposit: $${amount}`,
      message: `Paid ad_spend billing record ${billingRecordId} has no wallet deposit. Stripe charge verified as succeeded. Flagged for admin review -- use verify-wallet-charges to approve.`,
      alertType: 'missing_deposit',
      metadata: {
        billing_record_id: billingRecordId,
        amount,
        source: 'sync-stripe-charges',
      },
    });
  } catch (e) {
    console.error('Failed to send missing deposit notification:', e);
  }

  console.log(`Flagged missing deposit: billing_record ${billingRecordId}, client ${clientId}, $${amount}`);
  return true;
}

// Search Stripe account for a customer by email; returns customer_id or null
async function findStripeCustomerByEmail(stripeKey: string, email: string): Promise<string | null> {
  try {
    const url = new URL('https://api.stripe.com/v1/customers/search');
    url.searchParams.set('query', `email:'${email}'`);
    url.searchParams.set('limit', '1');
    const res = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${stripeKey}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.id || null;
  } catch {
    return null;
  }
}

// -- Per-client full sync: pull all Stripe invoices and reconcile --
async function syncClient(supabase: any, clientId: string) {
  const changes: any[] = [];
  let created = 0;
  let updated = 0;
  let flagged = 0;

  // 1. Fetch client info (name + email for Stripe lookup)
  const { data: client } = await supabase
    .from('clients')
    .select('name, email')
    .eq('id', clientId)
    .maybeSingle();
  const clientName = client?.name || null;
  const clientEmail = client?.email || null;

  // 2. Get linked Stripe customer records
  const { data: existingCustomers, error: custError } = await supabase
    .from('client_stripe_customers')
    .select('stripe_customer_id, stripe_account')
    .eq('client_id', clientId);

  if (custError) throw custError;

  // 3. Auto-discover missing Stripe accounts by searching by email
  const linkedAccounts = new Set((existingCustomers || []).map((c: any) => c.stripe_account));
  const allCustomers = [...(existingCustomers || [])];

  if (clientEmail) {
    for (const account of ['management', 'ad_spend'] as const) {
      if (linkedAccounts.has(account)) continue;
      const stripeKey = getStripeKey(account);
      if (!stripeKey) continue;
      const stripeCustomerId = await findStripeCustomerByEmail(stripeKey, clientEmail);
      if (stripeCustomerId) {
        // Save the link so future syncs don't need to search again
        const { error: insertErr } = await supabase
          .from('client_stripe_customers')
          .insert({ client_id: clientId, stripe_account: account, stripe_customer_id: stripeCustomerId });
        if (!insertErr) {
          allCustomers.push({ stripe_customer_id: stripeCustomerId, stripe_account: account });
          changes.push({ action: 'linked_stripe_customer', account, stripeCustomerId });
        }
      }
    }
  }

  if (allCustomers.length === 0) {
    return { synced: 0, created: 0, updated: 0, flagged: 0, changes: [], message: 'No Stripe customer found' };
  }

  // 3b. Auto-discover subscriptions for each linked Stripe customer
  for (const customer of allCustomers) {
    const stripeKey = getStripeKey(customer.stripe_account);
    if (!stripeKey) continue;
    try {
      // Fetch all non-canceled subscriptions (active, past_due, trialing, unpaid, paused)
      const subsUrl = new URL('https://api.stripe.com/v1/subscriptions');
      subsUrl.searchParams.set('customer', customer.stripe_customer_id);
      subsUrl.searchParams.set('limit', '10');
      subsUrl.searchParams.set('status', 'all');
      const subsRes = await fetch(subsUrl.toString(), {
        headers: { 'Authorization': `Bearer ${stripeKey}` },
      });
      if (!subsRes.ok) {
        console.error(`Subscription fetch failed for ${customer.stripe_customer_id}: ${subsRes.status}`);
        continue;
      }
      const subsData = await subsRes.json();
      console.log(`Found ${subsData.data?.length || 0} subscriptions for ${customer.stripe_customer_id} (${customer.stripe_account})`);

      for (const sub of subsData.data || []) {
        // Skip only fully canceled/expired
        if (sub.status === 'canceled' || sub.status === 'incomplete_expired') continue;
        const priceItem = sub.items?.data?.[0];
        const amount = priceItem ? (priceItem.price?.unit_amount || 0) / 100 : 0;
        const interval = priceItem?.price?.recurring?.interval || 'month';
        const recurrenceType = interval === 'week' ? 'bi_weekly' : 'monthly';
        const billingType = customer.stripe_account === 'management' ? 'management' : 'ad_spend';
        const periodStart = sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null;
        const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

        console.log(`Upserting subscription ${sub.id} (${sub.status}) $${amount} ${recurrenceType} for ${customer.stripe_account}`);

        const { error: upsertErr } = await supabase
          .from('client_stripe_subscriptions')
          .upsert({
            client_id: clientId,
            stripe_account: customer.stripe_account,
            stripe_subscription_id: sub.id,
            stripe_price_id: priceItem?.price?.id || null,
            stripe_customer_id: customer.stripe_customer_id,
            status: sub.status,
            billing_type: billingType,
            amount,
            recurrence_type: recurrenceType,
            current_period_start: periodStart,
            current_period_end: periodEnd,
          }, { onConflict: 'stripe_subscription_id' });

        if (upsertErr) {
          console.error(`Subscription upsert failed for ${sub.id}:`, upsertErr);
        } else {
          changes.push({ action: 'synced_subscription', subscription_id: sub.id, account: customer.stripe_account, amount, status: sub.status });
        }
      }

      // Also check subscription schedules (future-dated subscriptions)
      const schedUrl = new URL('https://api.stripe.com/v1/subscription_schedules');
      schedUrl.searchParams.set('customer', customer.stripe_customer_id);
      schedUrl.searchParams.set('limit', '10');
      const schedRes = await fetch(schedUrl.toString(), {
        headers: { 'Authorization': `Bearer ${stripeKey}` },
      });
      if (schedRes.ok) {
        const schedData = await schedRes.json();
        for (const sched of schedData.data || []) {
          if (sched.status !== 'not_started' && sched.status !== 'active') continue;
          if (sched.subscription) {
            // Schedule already has an active subscription -- handled above
            continue;
          }
          // Future-dated schedule without active sub yet
          const phase = sched.phases?.[0];
          if (!phase) continue;
          const priceItem = phase.items?.[0];
          const amount = priceItem ? (priceItem.price_data?.unit_amount || priceItem.price?.unit_amount || 0) / 100 : 0;
          const startDate = phase.start_date ? new Date(phase.start_date * 1000).toISOString() : null;
          const endDate = phase.end_date ? new Date(phase.end_date * 1000).toISOString() : null;

          console.log(`Found scheduled subscription ${sched.id} starting ${startDate}, $${amount}`);
          changes.push({ action: 'found_scheduled_subscription', schedule_id: sched.id, account: customer.stripe_account, amount, start_date: startDate, status: sched.status });
        }
      }
    } catch (err) {
      console.error(`Subscription discovery failed for ${customer.stripe_customer_id}:`, err);
    }
  }

  for (const customer of allCustomers) {
    const stripeKey = getStripeKey(customer.stripe_account);
    if (!stripeKey) continue;

    const billingType = customer.stripe_account === 'management' ? 'management' : 'ad_spend';

    // Paginate through all Stripe invoices for this customer
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
        // Skip drafts -- not real charges
        if (invoice.status === 'draft') continue;

        const { status: newStatus, paidAt, lastError } = mapInvoiceToAlphaHub(invoice);

        const amount = (invoice.amount_due || 0) / 100;
        const invoiceDate = invoice.created
          ? new Date(invoice.created * 1000).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        // Use line item period (accurate per-invoice) over invoice-level period
        // (which can return the subscription start date for all invoices)
        const lineItem = invoice.lines?.data?.[0];
        const periodStart = lineItem?.period?.start
          ? new Date(lineItem.period.start * 1000).toISOString().split('T')[0]
          : invoice.period_start
            ? new Date(invoice.period_start * 1000).toISOString().split('T')[0]
            : invoiceDate;
        const periodEnd = lineItem?.period?.end
          ? new Date(lineItem.period.end * 1000).toISOString().split('T')[0]
          : invoice.period_end
            ? new Date(invoice.period_end * 1000).toISOString().split('T')[0]
            : null;

        // 4. Look up existing billing_record by stripe_invoice_id
        // Use .limit(1) instead of .maybeSingle() to avoid errors when duplicates exist
        const { data: existingRows } = await supabase
          .from('billing_records')
          .select('id, status, billing_type, amount, last_charge_error')
          .eq('stripe_invoice_id', invoice.id)
          .is('archived_at', null)
          .limit(1);

        let existing = existingRows?.[0] || null;

        // 4b. Fuzzy match: if no Stripe-linked record found, check for manual records
        // matching client_id + billing_type + amount + due_date within +/-3 days
        if (!existing) {
          const windowStart = new Date(new Date(invoiceDate).getTime() - 3 * 86400000).toISOString().split('T')[0];
          const windowEnd = new Date(new Date(invoiceDate).getTime() + 3 * 86400000).toISOString().split('T')[0];

          const { data: fuzzyRows } = await supabase
            .from('billing_records')
            .select('id, status, billing_type, amount, last_charge_error')
            .eq('client_id', clientId)
            .eq('billing_type', billingType)
            .eq('amount', amount)
            .is('stripe_invoice_id', null)
            .is('archived_at', null)
            .gte('due_date', windowStart)
            .lte('due_date', windowEnd)
            .limit(1);

          const fuzzyMatch = fuzzyRows?.[0] || null;
          if (fuzzyMatch) {
            // Back-fill Stripe IDs onto the existing manual record
            const backfill: any = { stripe_invoice_id: invoice.id, stripe_account: customer.stripe_account };
            if (invoice.payment_intent) backfill.stripe_payment_intent_id = invoice.payment_intent;
            if (invoice.subscription) backfill.stripe_subscription_id = invoice.subscription;

            await supabase
              .from('billing_records')
              .update(backfill)
              .eq('id', fuzzyMatch.id);

            existing = fuzzyMatch;
            console.log(`Fuzzy-matched invoice ${invoice.id} to manual record ${fuzzyMatch.id}, back-filled Stripe IDs`);
            changes.push({ id: fuzzyMatch.id, stripeInvoiceId: invoice.id, action: 'fuzzy_matched_backfill' });
          }
        }

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
          // 5. No matching record -- create one from Stripe data
          const description = invoice.description
            || invoice.lines?.data?.[0]?.description
            || `${billingType === 'management' ? 'Management fee' : 'Ad spend'} -- ${invoiceDate}`;

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

        // 6. For paid ad_spend records, flag missing deposits for admin review
        if (newStatus === 'paid' && billingType === 'ad_spend' && amount > 0) {
          const depositAmount = existing?.amount ?? amount;
          const wasFlagged = await flagMissingDeposit(supabase, recordId!, clientId, depositAmount);
          if (wasFlagged) flagged++;
        }
      }
    }
  }

  // 7. Discover standalone charges (PaymentIntents not linked to invoices)
  for (const customer of allCustomers) {
    const stripeKey = getStripeKey(customer.stripe_account);
    if (!stripeKey) continue;
    const billingType = customer.stripe_account === 'management' ? 'management' : 'ad_spend';

    try {
      // Only fetch recent charges (last 60 days) to avoid huge data pulls
      const since = Math.floor(Date.now() / 1000) - 60 * 24 * 60 * 60;
      const chargesUrl = new URL('https://api.stripe.com/v1/charges');
      chargesUrl.searchParams.set('customer', customer.stripe_customer_id);
      chargesUrl.searchParams.set('limit', '50');
      chargesUrl.searchParams.set('created[gte]', String(since));
      const chargesRes = await fetch(chargesUrl.toString(), {
        headers: { 'Authorization': `Bearer ${stripeKey}` },
      });
      if (!chargesRes.ok) continue;
      const chargesData = await chargesRes.json();

      for (const charge of chargesData.data || []) {
        // Skip charges that belong to an invoice (already handled above)
        if (charge.invoice) continue;
        // Skip non-succeeded charges
        if (charge.status !== 'succeeded') continue;

        const amount = (charge.amount || 0) / 100;
        if (amount <= 0) continue;

        // Check if we already have a billing record for this charge (by payment_intent OR by charge id)
        const piId = charge.payment_intent || charge.id;
        const { data: existingByPiRows } = await supabase
          .from('billing_records')
          .select('id')
          .eq('client_id', clientId)
          .eq('stripe_payment_intent_id', piId)
          .is('archived_at', null)
          .limit(1);

        if (existingByPiRows && existingByPiRows.length > 0) continue; // Already tracked

        // Fuzzy match: check for records matching client_id + billing_type + amount + due_date within +/-3 days
        const chargeCreatedDate = charge.created ? new Date(charge.created * 1000).toISOString().split('T')[0] : null;
        if (chargeCreatedDate) {
          const windowStart = new Date(new Date(chargeCreatedDate).getTime() - 3 * 86400000).toISOString().split('T')[0];
          const windowEnd = new Date(new Date(chargeCreatedDate).getTime() + 3 * 86400000).toISOString().split('T')[0];

          const { data: fuzzyMatchRows } = await supabase
            .from('billing_records')
            .select('id, stripe_payment_intent_id')
            .eq('client_id', clientId)
            .eq('billing_type', billingType)
            .eq('amount', amount)
            .is('archived_at', null)
            .gte('due_date', windowStart)
            .lte('due_date', windowEnd)
            .limit(1);

          const fuzzyMatch = fuzzyMatchRows?.[0] || null;
          if (fuzzyMatch) {
            // Back-fill the stripe_payment_intent_id on the existing record so future syncs match by PI
            if (!fuzzyMatch.stripe_payment_intent_id) {
              await supabase
                .from('billing_records')
                .update({ stripe_payment_intent_id: piId, stripe_account: customer.stripe_account })
                .eq('id', fuzzyMatch.id);
            }

            console.log(`Skipping charge ${charge.id} -- fuzzy-matched to record ${fuzzyMatch.id}, back-filled PI`);
            continue;
          }
        }

        const chargeDate = charge.created ? new Date(charge.created * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const paidAt = charge.created ? new Date(charge.created * 1000).toISOString() : new Date().toISOString();
        const description = charge.description || `${billingType === 'management' ? 'Management fee' : 'Ad spend'} -- direct charge ${chargeDate}`;

        const { data: insertedRecord, error: insertErr } = await supabase
          .from('billing_records')
          .insert({
            client_id: clientId,
            client_name: clientName,
            billing_type: billingType,
            amount,
            status: 'paid',
            paid_at: paidAt,
            stripe_payment_intent_id: piId,
            stripe_account: customer.stripe_account,
            due_date: chargeDate,
            billing_period_start: chargeDate,
            notes: description,
            is_recurring_parent: false,
            recurrence_type: 'one_time',
          })
          .select('id')
          .single();

        if (!insertErr && insertedRecord) {
          created++;
          changes.push({ stripeChargeId: charge.id, action: 'created_from_charge', status: 'paid', amount, billingType });

          // For ad_spend, flag missing deposit for admin review
          if (billingType === 'ad_spend') {
            const wasFlagged = await flagMissingDeposit(supabase, insertedRecord.id, clientId, amount);
            if (wasFlagged) flagged++;
          }
        }
      }
    } catch (err) {
      console.error(`Charge discovery failed for ${customer.stripe_customer_id}:`, err);
    }
  }

  return {
    synced: allCustomers.length,
    created,
    updated,
    flagged,
    changes,
  };
}

// -- Global reconciliation: fix statuses on existing records that have Stripe IDs --
async function syncGlobal(supabase: any) {
  const { data: records, error: fetchError } = await supabase
    .from('billing_records')
    .select('id, billing_type, status, stripe_invoice_id, stripe_payment_intent_id, client_name, client_id, stripe_account, amount')
    .is('archived_at', null)
    .in('status', ['pending', 'overdue'])
    .or('stripe_invoice_id.not.is.null,stripe_payment_intent_id.not.is.null');

  if (fetchError) throw fetchError;
  if (!records || records.length === 0) return { synced: 0, updated: 0, flagged: 0, changes: [] };

  const changes: any[] = [];
  let updated = 0;
  let flagged = 0;

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

        // Flag missing deposit for newly-paid ad_spend records
        if (newStatus === 'paid' && record.billing_type === 'ad_spend' && record.amount > 0) {
          const wasFlagged = await flagMissingDeposit(supabase, record.id, record.client_id, record.amount);
          if (wasFlagged) flagged++;
        }
      }
    }
  }));

  return { synced: records.length, updated, flagged, changes };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // WALL-13: Require shared secret, service role JWT, or admin user JWT
  const billingSecret = Deno.env.get('BILLING_EDGE_SECRET');
  const providedSecret = req.headers.get('x-billing-secret');

  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const isServiceRole = authHeader === `Bearer ${serviceKey}`;
  const hasValidSecret = billingSecret && providedSecret === billingSecret;

  // Also allow admin users calling from frontend (JWT with admin role)
  let isAdmin = false;
  if (!isServiceRole && !hasValidSecret && authHeader?.startsWith('Bearer ')) {
    try {
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: roles } = await createClient(supabaseUrl, serviceKey)
          .from('user_roles')
          .select('role')
          .eq('id', user.id)
          .single();
        isAdmin = roles?.role === 'admin';
      }
    } catch { /* not an admin */ }
  }

  if (!isServiceRole && !hasValidSecret && !isAdmin) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

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

    // Track sync success -- reset failure counter
    try {
      await supabase.from('sync_failure_log').update({
        consecutive_failures: 0,
        last_success_at: new Date().toISOString(),
      }).eq('function_name', 'sync-stripe-charges');
    } catch { /* tracking failure should not break response */ }

    return jsonResponse(result);
  } catch (err) {
    console.error('sync-stripe-charges error:', err);
    const errorMessage = String(err) || 'Unknown error';

    // Track sync failure -- increment counter, escalate at 3+
    try {
      const { data: failState } = await supabase
        .from('sync_failure_log')
        .select('consecutive_failures')
        .eq('function_name', 'sync-stripe-charges')
        .single();
      const newCount = (failState?.consecutive_failures ?? 0) + 1;
      await supabase.from('sync_failure_log').update({
        consecutive_failures: newCount,
        last_failure_at: new Date().toISOString(),
        last_error: errorMessage.slice(0, 500),
      }).eq('function_name', 'sync-stripe-charges');
      if (newCount >= 3) {
        await notify({
          supabase,
          severity: 'critical',
          title: 'Stripe Charge Sync Failing',
          message: `${newCount} consecutive failures (${newCount * 5}+ minutes without reconciliation). Error: ${errorMessage.slice(0, 300)}`,
          alertType: 'sync_failure',
          metadata: { function_name: 'sync-stripe-charges', consecutive_failures: newCount },
        });
      }
    } catch { /* tracking failure should not break response */ }

    return jsonResponse({ error: 'Internal server error', details: errorMessage }, 500);
  }
});
