import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { restoreFromSnapshot, isInSafeMode } from '../_shared/safe-mode.ts';
import { notify } from '../_shared/notifications.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// -- Helper: Attempt snapshot-based restoration + recharge_state reset after payment --
// Called after process_successful_charge() marks a record as paid for ad_spend.
// Checks balance > charge threshold before restoring (prevents yo-yo).
// Idempotent: restoreFromSnapshot() uses atomic claim on unrestored snapshots.
async function tryRestoreAndResetRechargeState(supabase: any, clientId: string) {
  try {
    const inSafeMode = await isInSafeMode(supabase, clientId);
    if (inSafeMode) {
      // Verify balance is above charge threshold before restoring (prevents yo-yo)
      const { data: wallet } = await supabase
        .from('client_wallets')
        .select('low_balance_threshold')
        .eq('client_id', clientId)
        .maybeSingle();

      const { data: balanceResult } = await supabase.rpc('compute_wallet_balance', {
        p_client_id: clientId,
      });
      const balance = balanceResult?.remaining_balance ?? 0;
      const chargeThreshold = wallet?.low_balance_threshold ?? 150;

      if (balance > chargeThreshold) {
        // Balance above charge threshold -- safe to restore
        const result = await restoreFromSnapshot(supabase, clientId, 'stripe-billing-webhook');
        if (result.restored) {
          await notify({
            supabase, clientId,
            severity: 'info',
            title: 'Campaigns Restored',
            message: `${result.campaignsRestored} campaigns restored from safe mode after payment`,
            metadata: { campaigns_restored: result.campaignsRestored },
          });
        }
      } else {
        console.log(`Balance $${balance} still below charge threshold $${chargeThreshold}, not restoring yet`);
      }
    }

    // Reset recharge_state to idle
    await supabase.from('recharge_state').update({
      state: 'idle',
      current_billing_record_id: null,
      current_stripe_pi_id: null,
      updated_at: new Date().toISOString(),
    }).eq('client_id', clientId);
  } catch (err) {
    console.error(`Error in tryRestoreAndResetRechargeState for client ${clientId}:`, err);
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function calculateNextDueDate(recurrenceType: string, currentDate: Date): Date | null {
  switch (recurrenceType) {
    case 'bi_weekly':
      return addDays(currentDate, 14);
    case 'monthly':
      return addMonths(currentDate, 1);
    default:
      return null;
  }
}

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const parts = signature.split(',');
  const timestampPart = parts.find(p => p.startsWith('t='));
  const sigPart = parts.find(p => p.startsWith('v1='));
  if (!timestampPart || !sigPart) return false;

  const timestamp = timestampPart.split('=')[1];
  const expectedSig = sigPart.split('=')[1];
  const payload = `${timestamp}.${body}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );

  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const computedSig = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  return computedSig === expectedSig;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') || '';

    const managementSecret = Deno.env.get('STRIPE_MANAGEMENT_WEBHOOK_SECRET') || '';
    const adSpendSecret = Deno.env.get('STRIPE_AD_SPEND_WEBHOOK_SECRET') || '';

    let verifiedAccount: 'management' | 'ad_spend' | null = null;
    if (managementSecret && await verifySignature(body, signature, managementSecret)) {
      verifiedAccount = 'management';
    } else if (adSpendSecret && await verifySignature(body, signature, adSpendSecret)) {
      verifiedAccount = 'ad_spend';
    }

    if (!verifiedAccount) {
      console.error('Webhook signature verification failed');
      return jsonResponse({ error: 'Invalid signature' }, 401);
    }

    const event = JSON.parse(body);
    console.log(`stripe-billing-webhook received (${verifiedAccount}):`, event.type);

    const obj = event.data?.object;
    if (!obj) return jsonResponse({ received: true });

    // -- WEBHOOK DEDUP via stripe_processed_events --
    const { error: dedupError } = await supabase
      .from('stripe_processed_events')
      .insert({
        event_id: event.id,
        event_type: event.type,
        stripe_account: verifiedAccount,
        metadata: { object_id: obj.id },
      });

    if (dedupError) {
      console.log(`Event ${event.id} already processed, skipping`);
      console.log(JSON.stringify({ event_id: event.id, event_type: event.type, stripe_account: verifiedAccount, outcome: 'skipped', reason: 'duplicate' }));
      return jsonResponse({ received: true, duplicate: true });
    }

    // --- INVOICE.PAID ---
    if (event.type === 'invoice.paid') {
      const result = await handleInvoicePaid(supabase, obj, verifiedAccount, event);
      console.log(JSON.stringify({ event_id: event.id, event_type: event.type, stripe_account: verifiedAccount, outcome: 'processed' }));
      return result;
    }

    // --- INVOICE.PAYMENT_FAILED ---
    if (event.type === 'invoice.payment_failed') {
      const result = await handlePaymentFailed(supabase, obj);
      console.log(JSON.stringify({ event_id: event.id, event_type: event.type, stripe_account: verifiedAccount, outcome: 'processed' }));
      return result;
    }

    // --- INVOICE.PAYMENT_ACTION_REQUIRED ---
    if (event.type === 'invoice.payment_action_required') {
      const result = await handleActionRequired(supabase, obj);
      console.log(JSON.stringify({ event_id: event.id, event_type: event.type, stripe_account: verifiedAccount, outcome: 'processed' }));
      return result;
    }

    // --- CUSTOMER.SUBSCRIPTION.UPDATED ---
    if (event.type === 'customer.subscription.updated') {
      const result = await handleSubscriptionUpdated(supabase, obj);
      console.log(JSON.stringify({ event_id: event.id, event_type: event.type, stripe_account: verifiedAccount, outcome: 'processed' }));
      return result;
    }

    // --- CUSTOMER.SUBSCRIPTION.DELETED ---
    if (event.type === 'customer.subscription.deleted') {
      const result = await handleSubscriptionDeleted(supabase, obj);
      console.log(JSON.stringify({ event_id: event.id, event_type: event.type, stripe_account: verifiedAccount, outcome: 'processed' }));
      return result;
    }

    // --- INVOICE.UPCOMING ---
    if (event.type === 'invoice.upcoming') {
      const result = await handleInvoiceUpcoming(supabase, obj);
      console.log(JSON.stringify({ event_id: event.id, event_type: event.type, stripe_account: verifiedAccount, outcome: 'processed' }));
      return result;
    }

    // --- PAYMENT_INTENT.SUCCEEDED (safety net for ad spend) ---
    if (event.type === 'payment_intent.succeeded') {
      const result = await handlePaymentIntentSucceeded(supabase, obj, verifiedAccount, event);
      console.log(JSON.stringify({ event_id: event.id, event_type: event.type, stripe_account: verifiedAccount, outcome: 'processed' }));
      return result;
    }

    // --- CHARGE.REFUNDED ---
    if (event.type === 'charge.refunded') {
      const result = await handleChargeRefunded(supabase, obj, verifiedAccount);
      console.log(JSON.stringify({ event_id: event.id, event_type: event.type, stripe_account: verifiedAccount, outcome: 'processed' }));
      return result;
    }

    console.log(JSON.stringify({ event_id: event.id, event_type: event.type, stripe_account: verifiedAccount, outcome: 'skipped', reason: 'unhandled_event_type' }));

    // Alert on unhandled event types for admin visibility
    try {
      await notify({
        supabase,
        severity: 'info',
        title: 'Unhandled Webhook Event Type',
        message: `Received Stripe event type '${event.type}' which is not handled. Event ID: ${event.id}`,
        alertType: 'webhook',
        metadata: { event_id: event.id, event_type: event.type, stripe_account: verifiedAccount },
      });
    } catch (e) {
      console.error('Failed to send unhandled event notification:', e);
    }

    return jsonResponse({ received: true });

  } catch (error) {
    console.error('stripe-billing-webhook error:', error);
    console.log(JSON.stringify({ outcome: 'error', error: String(error) }));

    // Critical alert: webhook processing failure may mean missed deposits
    try {
      await notify({
        supabase,
        severity: 'critical',
        title: 'Webhook Processing Error',
        message: `Failed to process Stripe webhook event: ${String(error).slice(0, 300)}`,
        alertType: 'webhook',
        metadata: { error: String(error).slice(0, 500) },
      });
    } catch (e) {
      console.error('Failed to send webhook error notification:', e);
    }

    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

// ===============================================================
// INVOICE.PAID
// ===============================================================
async function handleInvoicePaid(supabase: any, invoice: any, stripeAccount: string, event: any) {
  const stripeInvoiceId = invoice.id;
  const subscriptionId = invoice.subscription || null;

  // If this invoice came from a subscription, handle via subscription path
  if (subscriptionId) {
    return await handleSubscriptionInvoicePaid(supabase, invoice, stripeAccount, subscriptionId, event);
  }

  // Otherwise, handle as a one-off invoice (ad spend, manual, etc.)
  const { data: record, error: lookupError } = await supabase
    .from('billing_records')
    .select('*')
    .eq('stripe_invoice_id', stripeInvoiceId)
    .maybeSingle();

  if (lookupError || !record) {
    const metadataRecordId = invoice.metadata?.billing_record_id;
    if (metadataRecordId) {
      const { data: metaRecord } = await supabase
        .from('billing_records')
        .select('*')
        .eq('id', metadataRecordId)
        .maybeSingle();
      if (!metaRecord) {
        console.log('No billing record found for invoice:', stripeInvoiceId);
        return jsonResponse({ received: true, no_record: true });
      }
      return await processOneOffInvoicePaid(supabase, metaRecord, invoice, stripeAccount, event);
    }
    console.log('No billing record found for invoice:', stripeInvoiceId);
    return jsonResponse({ received: true, no_record: true });
  }

  if (record.status === 'paid') {
    console.log('Billing record already paid, skipping:', record.id);
    return jsonResponse({ received: true, already_paid: true });
  }

  return await processOneOffInvoicePaid(supabase, record, invoice, stripeAccount, event);
}

// Handle subscription invoice.paid -- find pending record or create new one
async function handleSubscriptionInvoicePaid(
  supabase: any, invoice: any, stripeAccount: string, subscriptionId: string, event: any
) {
  const paidAt = new Date(event.created * 1000).toISOString();

  // Look up local subscription record
  const { data: localSub } = await supabase
    .from('client_stripe_subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (!localSub) {
    console.log('No local subscription found for:', subscriptionId);
    return jsonResponse({ received: true, no_subscription: true });
  }

  // Extract period from the invoice's subscription line item
  const lineItem = invoice.lines?.data?.[0];
  const periodStart = lineItem?.period?.start
    ? new Date(lineItem.period.start * 1000).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  const periodEnd = lineItem?.period?.end
    ? new Date(lineItem.period.end * 1000).toISOString().split('T')[0]
    : null;

  // Check if we already have a billing record for this exact invoice (dedup)
  const { data: existingByInvoice } = await supabase
    .from('billing_records')
    .select('id, status, billing_type')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle();

  if (existingByInvoice) {
    // Use process_successful_charge RPC for ad_spend subscriptions
    if (localSub.billing_type === 'ad_spend') {
      const { data: result, error: rpcError } = await supabase.rpc('process_successful_charge', {
        p_billing_record_id: existingByInvoice.id,
        p_stripe_pi_id: invoice.payment_intent || invoice.charge || '',
        p_paid_at: paidAt,
      });

      if (rpcError) {
        console.error('process_successful_charge failed:', rpcError);
        return jsonResponse({ error: rpcError.message }, 500);
      }

      if (result.action === 'marked_paid' && result.billing_type === 'ad_spend') {
        await tryRestoreAndResetRechargeState(supabase, result.client_id);
      }

      console.log('Subscription invoice processed via RPC:', existingByInvoice.id, result);
    } else if (existingByInvoice.status !== 'paid') {
      // Non-ad_spend (management): just mark paid
      await supabase
        .from('billing_records')
        .update({
          status: 'paid',
          paid_at: paidAt,
          stripe_payment_intent_id: invoice.payment_intent || null,
          source: 'stripe',
        })
        .eq('id', existingByInvoice.id);
    }

    console.log('Subscription invoice already tracked:', existingByInvoice.id);
    return jsonResponse({ received: true, already_tracked: true });
  }

  // Try to find a pending record for this subscription + period
  let { data: pendingRecord } = await supabase
    .from('billing_records')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .eq('billing_period_start', periodStart)
    .in('status', ['pending', 'overdue', 'charging'])
    .maybeSingle();

  // Fallback: find any unlinked pending record for this client + billing type
  // This handles records created before the Stripe subscription was set up
  if (!pendingRecord) {
    const { data: unlinkdRecord } = await supabase
      .from('billing_records')
      .select('*')
      .eq('client_id', localSub.client_id)
      .eq('billing_type', localSub.billing_type)
      .is('stripe_subscription_id', null)
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (unlinkdRecord) {
      console.log(`Found unlinked pending record ${unlinkdRecord.id} (due ${unlinkdRecord.due_date}) — linking to subscription ${subscriptionId}`);
      pendingRecord = unlinkdRecord;
      // Link the record to this subscription for future matching
      await supabase
        .from('billing_records')
        .update({ stripe_subscription_id: subscriptionId })
        .eq('id', unlinkdRecord.id);
    }
  }

  let recordId: string;

  if (pendingRecord) {
    if (localSub.billing_type === 'ad_spend') {
      // Use RPC for ad_spend -- atomically mark paid + create deposit
      const { data: result, error: rpcError } = await supabase.rpc('process_successful_charge', {
        p_billing_record_id: pendingRecord.id,
        p_stripe_pi_id: invoice.payment_intent || invoice.charge || '',
        p_paid_at: paidAt,
      });

      if (rpcError) {
        console.error('process_successful_charge failed:', rpcError);
        return jsonResponse({ error: rpcError.message }, 500);
      }

      // Also stamp the invoice ID and period end on the record
      await supabase
        .from('billing_records')
        .update({
          stripe_invoice_id: invoice.id,
          stripe_account: stripeAccount,
          billing_period_end: periodEnd || pendingRecord.billing_period_end,
          source: 'stripe',
        })
        .eq('id', pendingRecord.id);

      if (result.action === 'marked_paid' && result.billing_type === 'ad_spend') {
        await tryRestoreAndResetRechargeState(supabase, result.client_id);
      }

      recordId = pendingRecord.id;
      console.log(`Pending record ${recordId} processed via RPC for period ${periodStart} - ${periodEnd}`);
    } else {
      // Non-ad_spend: update existing pending record to paid
      const { error: updateError } = await supabase
        .from('billing_records')
        .update({
          status: 'paid',
          paid_at: paidAt,
          stripe_invoice_id: invoice.id,
          stripe_payment_intent_id: invoice.payment_intent || null,
          stripe_account: stripeAccount,
          billing_period_end: periodEnd || pendingRecord.billing_period_end,
          source: 'stripe',
        })
        .eq('id', pendingRecord.id);

      if (updateError) {
        console.error('Failed to update pending record to paid:', updateError);
        return jsonResponse({ received: true, error: updateError.message });
      }

      recordId = pendingRecord.id;
      console.log(`Pending record ${recordId} updated to paid for period ${periodStart} - ${periodEnd}`);
    }
  } else {
    if (localSub.billing_type === 'ad_spend') {
      // Create new record with charging status, then use RPC
      const { data: newRecord, error: insertError } = await supabase
        .from('billing_records')
        .insert({
          client_id: localSub.client_id,
          billing_type: localSub.billing_type,
          amount: localSub.amount,
          status: 'charging',
          billing_period_start: periodStart,
          billing_period_end: periodEnd,
          due_date: periodStart,
          recurrence_type: localSub.recurrence_type,
          is_recurring_parent: true,
          notes: 'Ad spend - subscription',
          stripe_invoice_id: invoice.id,
          stripe_payment_intent_id: invoice.payment_intent || null,
          stripe_subscription_id: subscriptionId,
          stripe_account: stripeAccount,
          source: 'stripe',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Failed to create billing record for subscription invoice:', insertError);
        return jsonResponse({ received: true, error: insertError.message });
      }

      // Now atomically mark paid + create deposit via RPC
      const { data: result, error: rpcError } = await supabase.rpc('process_successful_charge', {
        p_billing_record_id: newRecord.id,
        p_stripe_pi_id: invoice.payment_intent || invoice.charge || '',
        p_paid_at: paidAt,
      });

      if (rpcError) {
        console.error('process_successful_charge failed:', rpcError);
        return jsonResponse({ error: rpcError.message }, 500);
      }

      if (result.action === 'marked_paid' && result.billing_type === 'ad_spend') {
        await tryRestoreAndResetRechargeState(supabase, result.client_id);
      }

      recordId = newRecord.id;
      console.log(`Subscription billing record created and processed via RPC: ${recordId} for period ${periodStart} - ${periodEnd}`);
    } else {
      // Non-ad_spend: create new record as paid (management fees don't need wallet deposits)
      const { data: newRecord, error: insertError } = await supabase
        .from('billing_records')
        .insert({
          client_id: localSub.client_id,
          billing_type: localSub.billing_type || 'management',
          amount: localSub.amount,
          status: 'paid',
          paid_at: paidAt,
          billing_period_start: periodStart,
          billing_period_end: periodEnd,
          due_date: periodStart,
          recurrence_type: localSub.recurrence_type,
          is_recurring_parent: true,
          notes: 'Management fee - subscription',
          stripe_invoice_id: invoice.id,
          stripe_payment_intent_id: invoice.payment_intent || null,
          stripe_subscription_id: subscriptionId,
          stripe_account: stripeAccount,
          source: 'stripe',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Failed to create billing record for subscription invoice:', insertError);
        return jsonResponse({ received: true, error: insertError.message });
      }

      recordId = newRecord.id;
      console.log(`Subscription billing record created: ${recordId} for period ${periodStart} - ${periodEnd}`);
    }
  }

  // Auto-archive any unlinked legacy billing records for this client + type.
  // These are records created manually before the Stripe subscription existed.
  const { data: legacyRecords } = await supabase
    .from('billing_records')
    .select('id')
    .eq('client_id', localSub.client_id)
    .eq('billing_type', localSub.billing_type)
    .is('stripe_subscription_id', null)
    .is('stripe_invoice_id', null)
    .is('archived_at', null)
    .in('status', ['pending', 'overdue']);

  if (legacyRecords?.length) {
    const ids = legacyRecords.map((r: any) => r.id);
    await supabase
      .from('billing_records')
      .update({ archived_at: new Date().toISOString(), notes: 'Auto-archived: replaced by active Stripe subscription' })
      .in('id', ids);
    console.log(`Auto-archived ${ids.length} legacy billing record(s) for client ${localSub.client_id}`);
  }

  // Process referral commission for management fees
  if (localSub.billing_type === 'management') {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      await fetch(`${supabaseUrl}/functions/v1/process-referral-commission`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billing_record_id: recordId,
          client_id: localSub.client_id,
          amount: localSub.amount,
          billing_type: localSub.billing_type,
          billing_period_start: periodStart,
          billing_period_end: periodEnd,
        }),
      });
      console.log(`Referral commission processed for subscription record ${recordId}`);
    } catch (err) {
      console.error('Error processing referral commission:', err);
    }
  }

  // Resolve any active collections
  await supabase
    .from('billing_collections')
    .update({ status: 'resolved' })
    .eq('client_id', localSub.client_id)
    .neq('status', 'resolved');

  return jsonResponse({
    success: true,
    billing_record_id: recordId,
    subscription_id: subscriptionId,
    action: 'subscription_invoice_paid',
  });
}

// Process one-off invoice paid (ad spend, manual invoices)
async function processOneOffInvoicePaid(
  supabase: any, record: any, invoice: any, stripeAccount: string, event: any
) {
  const paidAt = new Date(event.created * 1000).toISOString();

  // 1. For ad_spend: use process_successful_charge RPC (atomic paid + deposit)
  if (record.billing_type === 'ad_spend') {
    const { data: result, error: rpcError } = await supabase.rpc('process_successful_charge', {
      p_billing_record_id: record.id,
      p_stripe_pi_id: invoice.payment_intent || invoice.charge || '',
      p_paid_at: paidAt,
    });

    if (rpcError) {
      console.error('process_successful_charge failed:', rpcError);
      return jsonResponse({ error: rpcError.message }, 500);
    }

    // Stamp additional Stripe metadata on the record
    await supabase
      .from('billing_records')
      .update({
        stripe_payment_intent_id: invoice.payment_intent || null,
        stripe_account: stripeAccount,
        source: 'stripe',
      })
      .eq('id', record.id);

    console.log(`Billing record ${record.id} processed via RPC:`, result);

    // Restore campaigns from safe mode only when actually marked paid
    if (result.action === 'marked_paid' && result.billing_type === 'ad_spend') {
      await tryRestoreAndResetRechargeState(supabase, result.client_id);
    }
  } else {
    // Non-ad_spend (management): mark as paid directly
    await supabase
      .from('billing_records')
      .update({
        status: 'paid',
        paid_at: paidAt,
        stripe_payment_intent_id: invoice.payment_intent || null,
        stripe_account: stripeAccount,
        source: 'stripe',
      })
      .eq('id', record.id);

    console.log(`Billing record ${record.id} marked as paid`);
  }

  // 2. Generate next recurring charge (one-off invoices only, NOT subscriptions)
  if (record.is_recurring_parent && record.recurrence_type !== 'one_time' && !record.stripe_subscription_id) {
    const { data: existingChild } = await supabase
      .from('billing_records')
      .select('id')
      .eq('parent_billing_id', record.id)
      .maybeSingle();

    if (!existingChild) {
      const periodStart = record.billing_period_end
        ? new Date(record.billing_period_end)
        : calculateNextDueDate(record.recurrence_type, new Date(record.billing_period_start || new Date()));

      if (periodStart) {
        const periodEnd = calculateNextDueDate(record.recurrence_type, periodStart);

        const { data: nextRecord, error: nextError } = await supabase
          .from('billing_records')
          .insert({
            client_id: record.client_id,
            billing_type: record.billing_type,
            amount: record.amount,
            billing_period_start: periodStart.toISOString().split('T')[0],
            billing_period_end: periodEnd?.toISOString().split('T')[0],
            due_date: periodStart.toISOString().split('T')[0],
            status: 'pending',
            notes: record.notes,
            recurrence_type: record.recurrence_type,
            is_recurring_parent: true,
            next_due_date: periodEnd?.toISOString().split('T')[0],
            parent_billing_id: record.id,
          })
          .select('id')
          .single();

        if (!nextError && nextRecord) {
          console.log(`Next recurring record created: ${nextRecord.id}`);

          const { data: wallet } = await supabase
            .from('client_wallets')
            .select('billing_mode')
            .eq('client_id', record.client_id)
            .maybeSingle();

          if (wallet?.billing_mode === 'auto_stripe') {
            try {
              const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
              await fetch(`${supabaseUrl}/functions/v1/create-stripe-invoice`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ billing_record_id: nextRecord.id }),
              });
              console.log(`Auto-invoice created for next record ${nextRecord.id}`);
            } catch (invoiceErr) {
              console.error('Failed to auto-create invoice for next record:', invoiceErr);
            }
          }
        }
      }
    }
  }

  // 3. Process referral commission (management only, non-subscription)
  if (record.billing_type === 'management' && !record.stripe_subscription_id) {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      await fetch(`${supabaseUrl}/functions/v1/process-referral-commission`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billing_record_id: record.id,
          client_id: record.client_id,
          amount: record.amount,
          billing_type: record.billing_type,
          billing_period_start: record.billing_period_start,
          billing_period_end: record.billing_period_end,
        }),
      });
      console.log(`Referral commission processed for record ${record.id}`);
    } catch (commissionErr) {
      console.error('Error processing referral commission:', commissionErr);
    }
  }

  // 4. Resolve active collections
  await supabase
    .from('billing_collections')
    .update({ status: 'resolved' })
    .eq('billing_record_id', record.id)
    .neq('status', 'resolved');

  return jsonResponse({
    success: true,
    billing_record_id: record.id,
    actions: {
      marked_paid: true,
      wallet_deposit: record.billing_type === 'ad_spend',
      recurring_generated: record.is_recurring_parent && record.recurrence_type !== 'one_time' && !record.stripe_subscription_id,
      referral_commission: record.billing_type === 'management',
    },
  });
}

// ===============================================================
// INVOICE.PAYMENT_FAILED
// ===============================================================
async function handlePaymentFailed(supabase: any, invoice: any) {
  const stripeInvoiceId = invoice.id;

  // Try lookup by invoice ID first
  let { data: record } = await supabase
    .from('billing_records')
    .select('id, client_id, amount, charge_attempts')
    .eq('stripe_invoice_id', stripeInvoiceId)
    .maybeSingle();

  // Fallback: for subscription invoices, look up by stripe_subscription_id
  if (!record && invoice.subscription) {
    const lineItem = invoice.lines?.data?.[0];
    const periodStart = lineItem?.period?.start
      ? new Date(lineItem.period.start * 1000).toISOString().split('T')[0]
      : null;

    if (periodStart) {
      const { data: subRecord } = await supabase
        .from('billing_records')
        .select('id, client_id, amount, charge_attempts')
        .eq('stripe_subscription_id', invoice.subscription)
        .eq('billing_period_start', periodStart)
        .maybeSingle();
      record = subRecord;
    } else {
      // Last resort: find the most recent pending record for this subscription
      const { data: subRecord } = await supabase
        .from('billing_records')
        .select('id, client_id, amount, charge_attempts')
        .eq('stripe_subscription_id', invoice.subscription)
        .in('status', ['pending', 'overdue', 'charging'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      record = subRecord;
    }

    if (record) {
      // Stamp the invoice ID on the record so future lookups work
      await supabase
        .from('billing_records')
        .update({ stripe_invoice_id: stripeInvoiceId })
        .eq('id', record.id);
      console.log(`Stamped stripe_invoice_id ${stripeInvoiceId} on subscription billing record ${record.id}`);
    }
  }

  if (!record) {
    console.log('No billing record found for failed invoice:', stripeInvoiceId);
    return jsonResponse({ received: true, no_record: true });
  }

  const errorMessage = invoice.last_finalization_error?.message
    || invoice.status_transitions?.finalized_at
    || 'Payment declined';

  await supabase
    .from('billing_records')
    .update({
      charge_attempts: (record.charge_attempts || 0) + 1,
      last_charge_error: errorMessage,
    })
    .eq('id', record.id);

  await supabase
    .from('client_wallets')
    .update({ last_charge_failed_at: new Date().toISOString() })
    .eq('client_id', record.client_id);

  await supabase
    .from('system_alerts')
    .insert({
      alert_type: 'payment_failed',
      severity: 'high',
      title: `Payment Failed: $${(record.amount || 0).toFixed(2)}`,
      message: `Payment attempt ${(record.charge_attempts || 0) + 1} failed. Reason: ${errorMessage}`,
      client_id: record.client_id,
      metadata: {
        billing_record_id: record.id,
        stripe_invoice_id: stripeInvoiceId,
        error: errorMessage,
      },
    });

  console.log(`Payment failed for record ${record.id}: ${errorMessage}`);

  return jsonResponse({
    success: true,
    billing_record_id: record.id,
    action: 'payment_failed',
  });
}

// ===============================================================
// INVOICE.PAYMENT_ACTION_REQUIRED
// ===============================================================
async function handleActionRequired(supabase: any, invoice: any) {
  const stripeInvoiceId = invoice.id;

  // Try lookup by invoice ID first
  let { data: record } = await supabase
    .from('billing_records')
    .select('id, client_id')
    .eq('stripe_invoice_id', stripeInvoiceId)
    .maybeSingle();

  // Fallback: for subscription invoices, look up by stripe_subscription_id
  if (!record && invoice.subscription) {
    const { data: subRecord } = await supabase
      .from('billing_records')
      .select('id, client_id')
      .eq('stripe_subscription_id', invoice.subscription)
      .in('status', ['pending', 'overdue', 'charging'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    record = subRecord;

    if (record) {
      await supabase
        .from('billing_records')
        .update({ stripe_invoice_id: stripeInvoiceId })
        .eq('id', record.id);
    }
  }

  if (!record) return jsonResponse({ received: true, no_record: true });

  if (invoice.hosted_invoice_url) {
    await supabase
      .from('billing_records')
      .update({ payment_link: invoice.hosted_invoice_url })
      .eq('id', record.id);
  }

  console.log(`Action required for record ${record.id}`);
  return jsonResponse({ success: true, billing_record_id: record.id, action: 'action_required' });
}

// ===============================================================
// CUSTOMER.SUBSCRIPTION.UPDATED
// ===============================================================
async function handleSubscriptionUpdated(supabase: any, subscription: any) {
  const periodStart = new Date(subscription.current_period_start * 1000);
  const periodEnd = new Date(subscription.current_period_end * 1000);
  const periodStartStr = periodStart.toISOString().split('T')[0];
  const periodEndStr = periodEnd.toISOString().split('T')[0];

  // 1. Sync period dates to local subscription table
  const { error } = await supabase
    .from('client_stripe_subscriptions')
    .update({
      status: subscription.status,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Failed to update subscription:', error);
  } else {
    console.log(`Subscription ${subscription.id} updated to status: ${subscription.status}`);
  }

  // 2. Create pending billing record for the upcoming charge (only for active subs)
  if (subscription.status === 'active') {
    const { data: localSub } = await supabase
      .from('client_stripe_subscriptions')
      .select('client_id, amount, billing_type, recurrence_type')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle();

    if (localSub) {
      // Check if a record already exists for this period
      const { data: existingRecord } = await supabase
        .from('billing_records')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .eq('billing_period_start', periodStartStr)
        .maybeSingle();

      if (!existingRecord) {
        const { data: newRecord, error: insertError } = await supabase
          .from('billing_records')
          .insert({
            client_id: localSub.client_id,
            billing_type: localSub.billing_type || 'management',
            amount: localSub.amount,
            status: 'pending',
            billing_period_start: periodStartStr,
            billing_period_end: periodEndStr,
            due_date: periodStartStr,
            recurrence_type: localSub.recurrence_type,
            is_recurring_parent: true,
            notes: 'Management fee - subscription',
            stripe_subscription_id: subscription.id,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Failed to create pending billing record:', insertError);
        } else {
          console.log(`Pending billing record ${newRecord.id} created for period ${periodStartStr} - ${periodEndStr}`);
        }
      } else {
        console.log(`Billing record already exists for subscription ${subscription.id} period ${periodStartStr}`);
      }
    }
  }

  return jsonResponse({ success: true, subscription_id: subscription.id, action: 'subscription_updated' });
}

// ===============================================================
// CUSTOMER.SUBSCRIPTION.DELETED
// ===============================================================
async function handleSubscriptionDeleted(supabase: any, subscription: any) {
  const { error } = await supabase
    .from('client_stripe_subscriptions')
    .update({
      status: 'canceled',
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Failed to mark subscription deleted:', error);
  } else {
    console.log(`Subscription ${subscription.id} marked as canceled`);
  }

  return jsonResponse({ success: true, subscription_id: subscription.id, action: 'subscription_deleted' });
}

// ===============================================================
// INVOICE.UPCOMING (safety net for pending records)
// ===============================================================
async function handleInvoiceUpcoming(supabase: any, invoice: any) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) {
    return jsonResponse({ received: true, no_subscription: true });
  }

  const { data: localSub } = await supabase
    .from('client_stripe_subscriptions')
    .select('client_id, amount, billing_type, recurrence_type')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (!localSub) {
    console.log('No local subscription found for upcoming invoice:', subscriptionId);
    return jsonResponse({ received: true, no_subscription: true });
  }

  // Extract period from line item
  const lineItem = invoice.lines?.data?.[0];
  const periodStartStr = lineItem?.period?.start
    ? new Date(lineItem.period.start * 1000).toISOString().split('T')[0]
    : null;
  const periodEndStr = lineItem?.period?.end
    ? new Date(lineItem.period.end * 1000).toISOString().split('T')[0]
    : null;

  if (!periodStartStr) {
    return jsonResponse({ received: true, no_period: true });
  }

  // Check if a record already exists for this period
  const { data: existingRecord } = await supabase
    .from('billing_records')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .eq('billing_period_start', periodStartStr)
    .maybeSingle();

  if (existingRecord) {
    console.log(`Billing record already exists for upcoming period ${periodStartStr}`);
    return jsonResponse({ received: true, already_exists: true });
  }

  const { data: newRecord, error: insertError } = await supabase
    .from('billing_records')
    .insert({
      client_id: localSub.client_id,
      billing_type: localSub.billing_type || 'management',
      amount: localSub.amount,
      status: 'pending',
      billing_period_start: periodStartStr,
      billing_period_end: periodEndStr,
      due_date: periodStartStr,
      recurrence_type: localSub.recurrence_type,
      is_recurring_parent: true,
      notes: 'Management fee - subscription',
      stripe_subscription_id: subscriptionId,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Failed to create pending record from invoice.upcoming:', insertError);
    return jsonResponse({ received: true, error: insertError.message });
  }

  console.log(`Pending record ${newRecord.id} created from invoice.upcoming for period ${periodStartStr}`);
  return jsonResponse({ success: true, billing_record_id: newRecord.id, action: 'upcoming_pending_created' });
}

// ===============================================================
// PAYMENT_INTENT.SUCCEEDED (safety net for ad spend PaymentIntents)
// ===============================================================
async function handlePaymentIntentSucceeded(supabase: any, pi: any, stripeAccount: string, event: any) {
  const paidAt = new Date(event.created * 1000).toISOString();

  // Try metadata first, then fall back to looking up by stripe_payment_intent_id
  let billingRecordId = pi.metadata?.billing_record_id;

  if (!billingRecordId) {
    // Fallback: look up by stripe_payment_intent_id
    const { data: record } = await supabase
      .from('billing_records')
      .select('id')
      .eq('stripe_payment_intent_id', pi.id)
      .maybeSingle();

    if (record) {
      billingRecordId = record.id;
    } else {
      // Fallback 2: match by Stripe customer → client → pending billing record with same amount
      // Handles manual charges created directly in Stripe dashboard
      const customerId = pi.customer;
      const amountDollars = (pi.amount || 0) / 100;

      if (customerId && amountDollars > 0) {
        const { data: pm } = await supabase
          .from('client_payment_methods')
          .select('client_id')
          .eq('stripe_customer_id', customerId)
          .limit(1)
          .maybeSingle();

        if (pm?.client_id) {
          const { data: pendingRecord } = await supabase
            .from('billing_records')
            .select('id')
            .eq('client_id', pm.client_id)
            .eq('billing_type', stripeAccount === 'management' ? 'management' : 'ad_spend')
            .in('status', ['pending', 'charging'])
            .is('archived_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (pendingRecord) {
            billingRecordId = pendingRecord.id;
            console.log(`Matched manual charge to pending record ${billingRecordId} via customer ${customerId}`);
          }
        }
      }

      if (!billingRecordId) {
        console.log('PaymentIntent has no billing_record_id metadata and no matching record, skipping');
        return jsonResponse({ received: true, no_metadata: true });
      }
    }
  }

  // Use process_successful_charge RPC (atomic paid + deposit)
  const { data: result, error: rpcError } = await supabase.rpc('process_successful_charge', {
    p_billing_record_id: billingRecordId,
    p_stripe_pi_id: pi.id,
    p_paid_at: paidAt,
  });

  if (rpcError) {
    console.error('process_successful_charge failed:', rpcError);
    return jsonResponse({ error: rpcError.message }, 500);
  }

  // Stamp stripe_account and source on the record
  await supabase
    .from('billing_records')
    .update({
      stripe_account: stripeAccount,
      source: 'stripe',
    })
    .eq('id', billingRecordId);

  console.log(`PaymentIntent webhook: process_successful_charge result:`, result);

  // Restore campaigns from safe mode (only if actually marked paid and ad_spend)
  if (result.action === 'marked_paid' && result.billing_type === 'ad_spend') {
    await tryRestoreAndResetRechargeState(supabase, result.client_id);
  }

  return jsonResponse({
    success: true,
    billing_record_id: billingRecordId,
    action: result.action,
    ...result,
  });
}

// ===============================================================
// CHARGE.REFUNDED
// ===============================================================
async function handleChargeRefunded(supabase: any, charge: any, stripeAccount: string) {
  const refundAmountCents = charge.amount_refunded;
  const refundAmountDollars = refundAmountCents / 100;

  const { data: record } = await supabase
    .from('billing_records')
    .select('id, client_id, billing_type, amount')
    .eq('stripe_payment_intent_id', charge.payment_intent)
    .maybeSingle();

  if (!record) {
    console.log('No billing record found for refunded charge:', charge.id);
    return jsonResponse({ received: true, no_record: true });
  }

  if (record.billing_type !== 'ad_spend') {
    console.log('Refund for non-ad_spend record, skipping wallet deduction');
    return jsonResponse({ received: true, not_ad_spend: true });
  }

  const { data: wallet } = await supabase
    .from('client_wallets')
    .select('id')
    .eq('client_id', record.client_id)
    .maybeSingle();

  if (!wallet) {
    console.error('No wallet found for refund deduction, client:', record.client_id);
    return jsonResponse({ received: true, no_wallet: true });
  }

  const { error: txnError } = await supabase.from('wallet_transactions').insert({
    wallet_id: wallet.id,
    client_id: record.client_id,
    transaction_type: 'adjustment',
    amount: -(refundAmountDollars),
    balance_after: 0,
    description: `Refund - charge ${charge.id.substring(0, 20)}`,
    billing_record_id: record.id,
  });

  if (txnError) {
    console.error('Failed to create refund adjustment:', txnError);
    return jsonResponse({ error: 'Failed to create refund adjustment' }, 500);
  }

  const { data: balanceResult } = await supabase.rpc('compute_wallet_balance', {
    p_client_id: record.client_id,
  });

  if (balanceResult?.remaining_balance < 0) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    await fetch(`${supabaseUrl}/functions/v1/check-low-balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'x-billing-secret': Deno.env.get('BILLING_EDGE_SECRET') || '',
      },
      body: JSON.stringify({ clientId: record.client_id }),
    });
  }

  await supabase.from('system_alerts').insert({
    alert_type: 'refund',
    severity: 'high',
    title: `Refund: $${refundAmountDollars.toFixed(2)} - ${charge.id.substring(0, 20)}`,
    message: `Charge ${charge.id} refunded $${refundAmountDollars.toFixed(2)}. Wallet balance adjusted.${balanceResult?.remaining_balance < 0 ? ' Balance is now NEGATIVE - safe mode triggered.' : ''}`,
    client_id: record.client_id,
    metadata: {
      charge_id: charge.id,
      refund_amount: refundAmountDollars,
      billing_record_id: record.id,
      stripe_account: stripeAccount,
      balance_after: balanceResult?.remaining_balance,
    },
  });

  const slackUrl = Deno.env.get('SLACK_BILLING_WEBHOOK_URL');
  if (slackUrl) {
    await fetch(slackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `:warning: Refund: $${refundAmountDollars.toFixed(2)} on charge ${charge.id.substring(0, 20)}. Client: ${record.client_id}${balanceResult?.remaining_balance < 0 ? ' | :red_circle: NEGATIVE BALANCE - Safe mode triggered' : ''}`,
      }),
    });
  }

  return jsonResponse({
    success: true,
    action: 'refund_processed',
    amount: refundAmountDollars,
    balance_after: balanceResult?.remaining_balance,
  });
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
