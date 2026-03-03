import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// ── Helper: Restore campaign budget after safe mode ──
async function restoreCampaignBudgetIfSafeMode(supabase: any, clientId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, safe_mode, pre_safe_mode_budget, google_customer_id, google_campaign_id')
      .eq('client_id', clientId)
      .maybeSingle();

    if (!campaign || !campaign.safe_mode) return;

    let restoreBudget = campaign.pre_safe_mode_budget;
    if (!restoreBudget) {
      const { data: client } = await supabase
        .from('clients')
        .select('ad_spend_budget')
        .eq('id', clientId)
        .single();
      restoreBudget = client?.ad_spend_budget ? Number(client.ad_spend_budget) / 30 : null;
    }

    if (!restoreBudget || restoreBudget <= 0.01) {
      console.log(`No valid restore budget for client ${clientId}, skipping safe mode exit`);
      return;
    }

    const budgetRes = await fetch(`${supabaseUrl}/functions/v1/update-google-ads-budget`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clientId, newDailyBudget: restoreBudget }),
    });
    const budgetResult = await budgetRes.json();

    if (!budgetRes.ok) {
      console.error(`Failed to restore budget for client ${clientId}:`, budgetResult);
      return;
    }

    await supabase
      .from('campaigns')
      .update({
        safe_mode: false,
        safe_mode_reason: null,
        safe_mode_triggered_at: null,
        safe_mode_budget_used: null,
        pre_safe_mode_budget: null,
        updated_at: new Date().toISOString(),
      })
      .eq('client_id', clientId);

    await supabase
      .from('clients')
      .update({ target_daily_spend: restoreBudget, updated_at: new Date().toISOString() })
      .eq('id', clientId);

    await supabase.from('campaign_audit_log').insert([{
      client_id: clientId,
      campaign_id: campaign.id,
      action: 'SAFE_MODE_EXITED',
      actor: 'system',
      reason_codes: ['WALLET_REFILLED'],
      old_value: { safe_mode: true, budget: 0.01 },
      new_value: { safe_mode: false, budget: restoreBudget },
      notes: `Campaign budget restored to $${restoreBudget}/day after successful ad spend payment`,
    }]);

    console.log(`✅ Campaign budget restored to $${restoreBudget}/day for client ${clientId}`);
  } catch (err) {
    console.error(`Error restoring campaign budget for client ${clientId}:`, err);
  }
}

// ── Helper: Ensure wallet deposit exists for ad_spend billing records ──
async function ensureWalletDeposit(
  supabase: any,
  clientId: string,
  billingRecordId: string,
  amount: number,
  trackingDate: string,
  invoiceId: string
) {
  try {
    const { data: existingWallet } = await supabase
      .from('client_wallets')
      .select('id, tracking_start_date')
      .eq('client_id', clientId)
      .maybeSingle();

    let walletId: string;

    if (existingWallet) {
      walletId = existingWallet.id;
      if (!existingWallet.tracking_start_date || trackingDate < existingWallet.tracking_start_date) {
        await supabase
          .from('client_wallets')
          .update({ tracking_start_date: trackingDate })
          .eq('id', existingWallet.id);
      }
    } else {
      const { data: newWallet } = await supabase
        .from('client_wallets')
        .insert({
          client_id: clientId,
          ad_spend_balance: 0,
          tracking_start_date: trackingDate,
        })
        .select()
        .single();

      if (!newWallet) {
        console.error(`Failed to create wallet for client ${clientId}`);
        return;
      }
      walletId = newWallet.id;
    }

    // Dedup: only insert if no deposit exists for this billing record
    const { data: existingDeposit } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('billing_record_id', billingRecordId)
      .eq('transaction_type', 'deposit')
      .maybeSingle();

    if (!existingDeposit) {
      await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: walletId,
          client_id: clientId,
          transaction_type: 'deposit',
          amount,
          balance_after: 0,
          description: `Ad spend deposit - Invoice ${invoiceId?.slice(0, 12) || billingRecordId.slice(0, 8)}`,
          billing_record_id: billingRecordId,
        });
      console.log(`Wallet deposit created for billing record ${billingRecordId}`);
    } else {
      console.log(`Wallet deposit already exists for billing record ${billingRecordId}`);
    }

    // Restore campaign budget if client was in safe mode
    await restoreCampaignBudgetIfSafeMode(supabase, clientId);
  } catch (err) {
    console.error(`Error ensuring wallet deposit for client ${clientId}:`, err);
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

    // ─── INVOICE.PAID ───
    if (event.type === 'invoice.paid') {
      return await handleInvoicePaid(supabase, obj, verifiedAccount);
    }

    // ─── INVOICE.PAYMENT_FAILED ───
    if (event.type === 'invoice.payment_failed') {
      return await handlePaymentFailed(supabase, obj);
    }

    // ─── INVOICE.PAYMENT_ACTION_REQUIRED ───
    if (event.type === 'invoice.payment_action_required') {
      return await handleActionRequired(supabase, obj);
    }

    // ─── CUSTOMER.SUBSCRIPTION.UPDATED ───
    if (event.type === 'customer.subscription.updated') {
      return await handleSubscriptionUpdated(supabase, obj);
    }

    // ─── CUSTOMER.SUBSCRIPTION.DELETED ───
    if (event.type === 'customer.subscription.deleted') {
      return await handleSubscriptionDeleted(supabase, obj);
    }

    // ─── INVOICE.UPCOMING ───
    if (event.type === 'invoice.upcoming') {
      return await handleInvoiceUpcoming(supabase, obj);
    }

    // ─── PAYMENT_INTENT.SUCCEEDED (safety net for ad spend) ───
    if (event.type === 'payment_intent.succeeded') {
      return await handlePaymentIntentSucceeded(supabase, obj, verifiedAccount);
    }

    return jsonResponse({ received: true });

  } catch (error) {
    console.error('stripe-billing-webhook error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// INVOICE.PAID
// ═══════════════════════════════════════════════════════════════
async function handleInvoicePaid(supabase: any, invoice: any, stripeAccount: string) {
  const stripeInvoiceId = invoice.id;
  const subscriptionId = invoice.subscription || null;

  // If this invoice came from a subscription, handle via subscription path
  if (subscriptionId) {
    return await handleSubscriptionInvoicePaid(supabase, invoice, stripeAccount, subscriptionId);
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
      return await processOneOffInvoicePaid(supabase, metaRecord, invoice, stripeAccount);
    }
    console.log('No billing record found for invoice:', stripeInvoiceId);
    return jsonResponse({ received: true, no_record: true });
  }

  if (record.status === 'paid') {
    console.log('Billing record already paid, skipping:', record.id);
    return jsonResponse({ received: true, already_paid: true });
  }

  return await processOneOffInvoicePaid(supabase, record, invoice, stripeAccount);
}

// Handle subscription invoice.paid — find pending record or create new one
async function handleSubscriptionInvoicePaid(
  supabase: any, invoice: any, stripeAccount: string, subscriptionId: string
) {
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
    .select('id, status')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle();

  if (existingByInvoice) {
    if (existingByInvoice.status !== 'paid') {
      await supabase
        .from('billing_records')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: invoice.payment_intent || null,
        })
        .eq('id', existingByInvoice.id);
    }

    // Ensure wallet deposit exists for ad_spend subscriptions (even on dedup path)
    if (localSub.billing_type === 'ad_spend') {
      await ensureWalletDeposit(supabase, localSub.client_id, existingByInvoice.id, localSub.amount, periodStart, invoice.id);
    }

    console.log('Subscription invoice already tracked:', existingByInvoice.id);
    return jsonResponse({ received: true, already_tracked: true });
  }

  // Try to find a pending record for this subscription + period
  const { data: pendingRecord } = await supabase
    .from('billing_records')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .eq('billing_period_start', periodStart)
    .in('status', ['pending', 'overdue'])
    .maybeSingle();

  let recordId: string;

  if (pendingRecord) {
    // Update existing pending record to paid
    const { error: updateError } = await supabase
      .from('billing_records')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: invoice.payment_intent || null,
        stripe_account: stripeAccount,
        billing_period_end: periodEnd || pendingRecord.billing_period_end,
      })
      .eq('id', pendingRecord.id);

    if (updateError) {
      console.error('Failed to update pending record to paid:', updateError);
      return jsonResponse({ received: true, error: updateError.message });
    }

    recordId = pendingRecord.id;
    console.log(`Pending record ${recordId} updated to paid for period ${periodStart} - ${periodEnd}`);
  } else {
    // Fallback: create new record as paid (no pending record existed)
    const { data: newRecord, error: insertError } = await supabase
      .from('billing_records')
      .insert({
        client_id: localSub.client_id,
        billing_type: localSub.billing_type || 'management',
        amount: localSub.amount,
        status: 'paid',
        paid_at: new Date().toISOString(),
        billing_period_start: periodStart,
        billing_period_end: periodEnd,
        due_date: periodStart,
        recurrence_type: localSub.recurrence_type,
        is_recurring_parent: true,
        notes: localSub.billing_type === 'ad_spend' ? 'Ad spend - subscription' : 'Management fee - subscription',
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: invoice.payment_intent || null,
        stripe_subscription_id: subscriptionId,
        stripe_account: stripeAccount,
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

  // Wallet deposit for ad_spend subscriptions
  if (localSub.billing_type === 'ad_spend') {
    await ensureWalletDeposit(supabase, localSub.client_id, recordId, localSub.amount, periodStart, invoice.id);
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
  supabase: any, record: any, invoice: any, stripeAccount: string
) {
  const now = new Date().toISOString();

  // 1. Mark billing record as PAID
  await supabase
    .from('billing_records')
    .update({
      status: 'paid',
      paid_at: now,
      stripe_payment_intent_id: invoice.payment_intent || null,
      stripe_account: stripeAccount,
    })
    .eq('id', record.id);

  console.log(`Billing record ${record.id} marked as paid`);

  // 2. Wallet deposit (ad_spend only)
  if (record.billing_type === 'ad_spend') {
    const trackingDate = record.billing_period_start || new Date().toISOString().split('T')[0];

    const { data: existingWallet } = await supabase
      .from('client_wallets')
      .select('id, tracking_start_date')
      .eq('client_id', record.client_id)
      .maybeSingle();

    if (existingWallet) {
      if (!existingWallet.tracking_start_date || trackingDate < existingWallet.tracking_start_date) {
        await supabase
          .from('client_wallets')
          .update({ tracking_start_date: trackingDate })
          .eq('id', existingWallet.id);
      }

      const { data: existingDeposit } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('billing_record_id', record.id)
        .eq('transaction_type', 'deposit')
        .maybeSingle();

      if (!existingDeposit) {
        const creditUsed = record.credit_amount_used ?? 0;
        await supabase
          .from('wallet_transactions')
          .insert({
            wallet_id: existingWallet.id,
            client_id: record.client_id,
            transaction_type: 'deposit',
            amount: record.amount,
            balance_after: 0,
            description: `Ad spend deposit - Invoice ${record.id.slice(0, 8)}${creditUsed > 0 ? ` (payment reduced by $${creditUsed} credit)` : ''}`,
            billing_record_id: record.id,
          });
        console.log(`Wallet deposit created for record ${record.id}`);
      }
    } else {
      const { data: newWallet } = await supabase
        .from('client_wallets')
        .insert({
          client_id: record.client_id,
          ad_spend_balance: 0,
          tracking_start_date: trackingDate,
        })
        .select()
        .single();

      if (newWallet) {
        const creditUsed = record.credit_amount_used ?? 0;
        await supabase
          .from('wallet_transactions')
          .insert({
            wallet_id: newWallet.id,
            client_id: record.client_id,
            transaction_type: 'deposit',
            amount: record.amount,
            balance_after: record.amount,
            description: `Ad spend deposit - Invoice ${record.id.slice(0, 8)}${creditUsed > 0 ? ` (payment reduced by $${creditUsed} credit)` : ''}`,
            billing_record_id: record.id,
          });
        console.log(`New wallet created + deposit for record ${record.id}`);
      }
    }

    // Safety net: restore campaign budget if client was in safe mode
    await restoreCampaignBudgetIfSafeMode(supabase, record.client_id);
  }

  // 3. Generate next recurring charge (one-off invoices only, NOT subscriptions)
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

  // 4. Process referral commission (management only, non-subscription)
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

  // 5. Resolve active collections
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

// ═══════════════════════════════════════════════════════════════
// INVOICE.PAYMENT_FAILED
// ═══════════════════════════════════════════════════════════════
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
        .in('status', ['pending', 'overdue'])
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

// ═══════════════════════════════════════════════════════════════
// INVOICE.PAYMENT_ACTION_REQUIRED
// ═══════════════════════════════════════════════════════════════
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
      .in('status', ['pending', 'overdue'])
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

// ═══════════════════════════════════════════════════════════════
// CUSTOMER.SUBSCRIPTION.UPDATED
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// CUSTOMER.SUBSCRIPTION.DELETED
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// INVOICE.UPCOMING (safety net for pending records)
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// PAYMENT_INTENT.SUCCEEDED (safety net for ad spend PaymentIntents)
// ═══════════════════════════════════════════════════════════════
async function handlePaymentIntentSucceeded(supabase: any, pi: any, stripeAccount: string) {
  const billingRecordId = pi.metadata?.billing_record_id;
  if (!billingRecordId) {
    console.log('PaymentIntent has no billing_record_id metadata, skipping');
    return jsonResponse({ received: true, no_metadata: true });
  }

  const { data: record } = await supabase
    .from('billing_records')
    .select('*')
    .eq('id', billingRecordId)
    .maybeSingle();

  if (!record) {
    console.log('No billing record found for PaymentIntent metadata:', billingRecordId);
    return jsonResponse({ received: true, no_record: true });
  }

  if (record.status === 'paid') {
    console.log('Billing record already paid (inline handler succeeded):', record.id);
    return jsonResponse({ received: true, already_processed: true });
  }

  // Mark as paid
  const now = new Date().toISOString();
  await supabase
    .from('billing_records')
    .update({
      status: 'paid',
      paid_at: now,
      stripe_payment_intent_id: pi.id,
      stripe_account: stripeAccount,
    })
    .eq('id', record.id);

  console.log(`PaymentIntent webhook: billing record ${record.id} marked as paid`);

  // Wallet deposit for ad spend
  if (record.billing_type === 'ad_spend') {
    const trackingDate = record.billing_period_start || now.split('T')[0];
    const { data: wallet } = await supabase
      .from('client_wallets')
      .select('id, tracking_start_date')
      .eq('client_id', record.client_id)
      .maybeSingle();

    if (wallet) {
      if (!wallet.tracking_start_date || trackingDate < wallet.tracking_start_date) {
        await supabase
          .from('client_wallets')
          .update({ tracking_start_date: trackingDate })
          .eq('id', wallet.id);
      }

      const { data: existingDeposit } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('billing_record_id', record.id)
        .eq('transaction_type', 'deposit')
        .maybeSingle();

      if (!existingDeposit) {
        await supabase
          .from('wallet_transactions')
          .insert({
            wallet_id: wallet.id,
            client_id: record.client_id,
            transaction_type: 'deposit',
            amount: record.amount,
            balance_after: 0,
            description: `Ad spend deposit - PI webhook ${pi.id.slice(0, 12)}`,
            billing_record_id: record.id,
          });
        console.log(`Wallet deposit created via webhook for PI ${pi.id}`);
      }
    }

    // ── Auto-resume campaign if in safe mode ──
    await restoreCampaignBudgetIfSafeMode(supabase, record.client_id);
  }

  return jsonResponse({
    success: true,
    billing_record_id: record.id,
    action: 'payment_intent_succeeded',
  });
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
