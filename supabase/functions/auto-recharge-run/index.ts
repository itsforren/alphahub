import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MIN_CHARGE_AMOUNT = 50; // Don't charge less than $50
const STRIPE_AD_SPEND_KEY = () => Deno.env.get('STRIPE_AD_SPEND_SECRET_KEY') || '';

// ── Charge Stripe via PaymentIntent (off-session, auto-confirm) ──
async function chargePaymentIntent(
  stripeKey: string,
  stripeCustomerId: string,
  paymentMethodId: string,
  amountCents: number,
  clientId: string,
): Promise<any> {
  const body = new URLSearchParams({
    amount: String(amountCents),
    currency: 'usd',
    customer: stripeCustomerId,
    payment_method: paymentMethodId,
    confirm: 'true',
    off_session: 'true',
    'metadata[client_id]': clientId,
    'metadata[charge_type]': 'auto_recharge',
  });

  const res = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  return await res.json();
}

// ── Idempotent wallet deposit ──
async function ensureWalletDeposit(
  supabase: any,
  clientId: string,
  billingRecordId: string,
  amount: number,
  trackingDate: string,
  piId: string,
): Promise<void> {
  const { data: existingDeposit } = await supabase
    .from('wallet_transactions')
    .select('id')
    .eq('billing_record_id', billingRecordId)
    .maybeSingle();

  if (existingDeposit) return;

  let { data: wallet } = await supabase
    .from('client_wallets')
    .select('id, tracking_start_date')
    .eq('client_id', clientId)
    .maybeSingle();

  if (!wallet) {
    const { data: newWallet, error } = await supabase
      .from('client_wallets')
      .insert({ client_id: clientId, tracking_start_date: trackingDate })
      .select('id, tracking_start_date')
      .single();
    if (error) { console.error('Failed to create wallet:', error); return; }
    wallet = newWallet;
  } else if (!wallet.tracking_start_date || trackingDate < wallet.tracking_start_date) {
    await supabase
      .from('client_wallets')
      .update({ tracking_start_date: trackingDate })
      .eq('id', wallet.id);
  }

  if (!wallet?.id) return;

  await supabase.from('wallet_transactions').insert({
    wallet_id: wallet.id,
    client_id: clientId,
    transaction_type: 'deposit',
    amount,
    balance_after: 0,
    description: `Auto-recharge deposit — ${piId.slice(0, 16)}`,
    billing_record_id: billingRecordId,
  });
}

// ── Restore campaign budget if client is in safe mode ──
async function restoreCampaignIfSafeMode(supabase: any, supabaseUrl: string, supabaseServiceKey: string, clientId: string): Promise<void> {
  try {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, safe_mode, pre_safe_mode_budget')
      .eq('client_id', clientId)
      .maybeSingle();

    if (!campaign?.safe_mode) return;

    let restoreBudget = campaign.pre_safe_mode_budget;
    if (!restoreBudget) {
      const { data: client } = await supabase.from('clients').select('ad_spend_budget').eq('id', clientId).single();
      restoreBudget = client?.ad_spend_budget ? Number(client.ad_spend_budget) / 30 : null;
    }

    if (!restoreBudget || restoreBudget <= 0.01) return;

    const res = await fetch(`${supabaseUrl}/functions/v1/update-google-ads-budget`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, newDailyBudget: restoreBudget }),
    });

    if (!res.ok) { console.error('Failed to restore budget for', clientId); return; }

    await supabase.from('campaigns').update({
      safe_mode: false,
      safe_mode_reason: null,
      safe_mode_triggered_at: null,
      safe_mode_budget_used: null,
      pre_safe_mode_budget: null,
      updated_at: new Date().toISOString(),
    }).eq('client_id', clientId);

    await supabase.from('clients')
      .update({ target_daily_spend: restoreBudget, updated_at: new Date().toISOString() })
      .eq('id', clientId);

    await supabase.from('campaign_audit_log').insert([{
      client_id: clientId,
      campaign_id: campaign.id,
      action: 'SAFE_MODE_EXITED',
      actor: 'system',
      reason_codes: ['WALLET_REFILLED'],
      old_value: { safe_mode: true },
      new_value: { safe_mode: false, budget: restoreBudget },
      notes: `Campaign budget restored to $${restoreBudget}/day after auto-recharge`,
    }]);

    console.log(`✅ Campaign restored to $${restoreBudget}/day for client ${clientId}`);
  } catch (err) {
    console.error('Error restoring campaign for client', clientId, err);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('auto-recharge-run starting...');

    const { data: wallets, error: walletsError } = await supabase
      .from('client_wallets')
      .select('*')
      .eq('billing_mode', 'auto_stripe')
      .eq('auto_billing_enabled', true)
      .not('auto_charge_amount', 'is', null);

    if (walletsError) throw walletsError;

    if (!wallets?.length) {
      console.log('No clients with auto-billing enabled');
      return jsonResponse({ success: true, processed: 0 });
    }

    const { data: perfSetting } = await supabase
      .from('onboarding_settings')
      .select('setting_value')
      .eq('setting_key', 'performance_percentage')
      .maybeSingle();

    const rawPerf = perfSetting?.setting_value ? parseFloat(perfSetting.setting_value) : NaN;
    const performancePercentage = Number.isFinite(rawPerf) ? rawPerf : 0;

    const results: any[] = [];
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const rollingStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const wallet of wallets) {
      const clientId = wallet.client_id;

      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, email, status')
        .eq('id', clientId)
        .maybeSingle();

      if (clientError || !client) {
        results.push({ client_id: clientId, action: 'skipped', reason: 'client not found' });
        continue;
      }

      if (client.status !== 'active') {
        results.push({ client: client.name, action: 'skipped', reason: 'not active' });
        continue;
      }

      try {
        // ── Compute wallet balance ──
        const { data: deposits } = await supabase
          .from('wallet_transactions')
          .select('amount')
          .eq('client_id', clientId)
          .eq('transaction_type', 'deposit');

        const totalDeposits = deposits?.reduce((sum: number, tx: any) => sum + Number(tx.amount), 0) ?? 0;

        let trackedSpend = 0;
        if (wallet.tracking_start_date) {
          const { data: spendData } = await supabase
            .from('ad_spend_daily')
            .select('cost')
            .eq('client_id', clientId)
            .gte('spend_date', wallet.tracking_start_date);
          trackedSpend = spendData?.reduce((sum: number, day: any) => sum + Number(day.cost || 0), 0) ?? 0;
        }

        const displayedSpend = trackedSpend * (1 + performancePercentage / 100);
        const remainingBalance = totalDeposits - displayedSpend;
        const threshold = wallet.low_balance_threshold ?? 150;

        console.log(`${client.name}: balance=$${remainingBalance.toFixed(2)}, threshold=$${threshold}`);

        if (remainingBalance > threshold) {
          results.push({ client: client.name, action: 'ok', balance: remainingBalance });
          continue;
        }

        // ── Monthly cap ──
        let chargeAmount = Number(wallet.auto_charge_amount);

        if (wallet.monthly_ad_spend_cap) {
          const { data: monthlyCharges } = await supabase
            .from('billing_records')
            .select('amount')
            .eq('client_id', clientId)
            .eq('billing_type', 'ad_spend')
            .eq('status', 'paid')
            .gte('paid_at', rollingStart);

          const monthTotal = monthlyCharges?.reduce((sum: number, r: any) => sum + Number(r.amount), 0) ?? 0;
          const remainingCap = Number(wallet.monthly_ad_spend_cap) - monthTotal;

          if (remainingCap <= 0) {
            console.log(`${client.name}: monthly cap reached ($${wallet.monthly_ad_spend_cap})`);
            results.push({ client: client.name, action: 'cap_reached', monthTotal });
            await triggerSafeMode(supabase, supabaseUrl, supabaseServiceKey, clientId);
            continue;
          }

          chargeAmount = Math.min(chargeAmount, remainingCap);
        }

        if (chargeAmount < MIN_CHARGE_AMOUNT) {
          console.log(`${client.name}: charge amount too small ($${chargeAmount}), triggering safe mode`);
          results.push({ client: client.name, action: 'safe_mode', reason: 'charge_too_small' });
          await triggerSafeMode(supabase, supabaseUrl, supabaseServiceKey, clientId);
          continue;
        }

        // ── Deduplication: skip if already charged today ──
        const { data: existingToday } = await supabase
          .from('billing_records')
          .select('id, status')
          .eq('client_id', clientId)
          .eq('billing_type', 'ad_spend')
          .eq('billing_period_start', today)
          .in('status', ['pending', 'paid'])
          .maybeSingle();

        if (existingToday) {
          console.log(`${client.name}: already recharged today (${existingToday.status}), skipping`);
          results.push({ client: client.name, action: 'skipped', reason: 'already_recharged_today' });
          continue;
        }

        // ── Look up Stripe customer and payment method ──
        const { data: stripeCustomer } = await supabase
          .from('client_stripe_customers')
          .select('stripe_customer_id')
          .eq('client_id', clientId)
          .eq('stripe_account', 'ad_spend')
          .maybeSingle();

        if (!stripeCustomer) {
          console.log(`${client.name}: no Stripe customer linked for ad_spend, triggering safe mode`);
          results.push({ client: client.name, action: 'safe_mode', reason: 'no_stripe_customer' });
          await triggerSafeMode(supabase, supabaseUrl, supabaseServiceKey, clientId);
          continue;
        }

        const { data: paymentMethod } = await supabase
          .from('client_payment_methods')
          .select('stripe_payment_method_id')
          .eq('client_id', clientId)
          .eq('stripe_account', 'ad_spend')
          .eq('is_default', true)
          .maybeSingle();

        if (!paymentMethod) {
          console.log(`${client.name}: no payment method on file, triggering safe mode`);
          results.push({ client: client.name, action: 'safe_mode', reason: 'no_payment_method' });
          await triggerSafeMode(supabase, supabaseUrl, supabaseServiceKey, clientId);
          continue;
        }

        // ── Charge Stripe directly ──
        console.log(`${client.name}: charging $${chargeAmount} via Stripe...`);
        const pi = await chargePaymentIntent(
          STRIPE_AD_SPEND_KEY(),
          stripeCustomer.stripe_customer_id,
          paymentMethod.stripe_payment_method_id,
          Math.round(chargeAmount * 100),
          clientId,
        );

        console.log(`${client.name}: PaymentIntent ${pi.id} status=${pi.status}`);

        // ── Create billing record based on actual charge outcome ──
        if (pi.status === 'succeeded') {
          const paidAt = new Date().toISOString();
          const { data: newRecord, error: insertError } = await supabase
            .from('billing_records')
            .insert({
              client_id: clientId,
              billing_type: 'ad_spend',
              amount: chargeAmount,
              due_date: today,
              billing_period_start: today,
              status: 'paid',
              paid_at: paidAt,
              stripe_payment_intent_id: pi.id,
              stripe_account: 'ad_spend',
              recurrence_type: 'one_time',
              is_recurring_parent: false,
              notes: 'Auto-recharge',
            })
            .select('id')
            .single();

          if (insertError) throw insertError;

          // Wallet deposit
          await ensureWalletDeposit(supabase, clientId, newRecord.id, chargeAmount, today, pi.id);

          // Restore campaign if in safe mode
          await restoreCampaignIfSafeMode(supabase, supabaseUrl, supabaseServiceKey, clientId);

          // Update last auto charge timestamp
          await supabase
            .from('client_wallets')
            .update({ last_auto_charge_at: now.toISOString() })
            .eq('id', wallet.id);

          console.log(`${client.name}: ✅ auto-recharged $${chargeAmount}`);
          results.push({ client: client.name, action: 'recharged', amount: chargeAmount, pi_id: pi.id });

        } else if (pi.status === 'requires_action') {
          // 3D Secure or similar — create pending record with payment link
          const paymentLink = pi.next_action?.redirect_to_url?.url || null;
          const { data: newRecord } = await supabase
            .from('billing_records')
            .insert({
              client_id: clientId,
              billing_type: 'ad_spend',
              amount: chargeAmount,
              due_date: today,
              billing_period_start: today,
              status: 'pending',
              stripe_payment_intent_id: pi.id,
              stripe_account: 'ad_spend',
              payment_link: paymentLink,
              recurrence_type: 'one_time',
              is_recurring_parent: false,
              notes: 'Auto-recharge',
            })
            .select('id')
            .single();

          // Trigger safe mode — manual action required
          await supabase
            .from('client_wallets')
            .update({ last_charge_failed_at: now.toISOString() })
            .eq('id', wallet.id);

          await triggerSafeMode(supabase, supabaseUrl, supabaseServiceKey, clientId);

          console.log(`${client.name}: requires 3DS action, billing record created as pending`);
          results.push({ client: client.name, action: 'requires_action', amount: chargeAmount, payment_link: paymentLink });

        } else {
          // Payment failed
          const errorMessage = pi.last_payment_error?.message || pi.error?.message || `Payment failed (status: ${pi.status})`;

          await supabase
            .from('billing_records')
            .insert({
              client_id: clientId,
              billing_type: 'ad_spend',
              amount: chargeAmount,
              due_date: today,
              billing_period_start: today,
              status: 'overdue',
              stripe_payment_intent_id: pi.id || null,
              stripe_account: 'ad_spend',
              last_charge_error: errorMessage,
              recurrence_type: 'one_time',
              is_recurring_parent: false,
              notes: 'Auto-recharge',
            });

          await supabase
            .from('client_wallets')
            .update({ last_charge_failed_at: now.toISOString() })
            .eq('id', wallet.id);

          await triggerSafeMode(supabase, supabaseUrl, supabaseServiceKey, clientId);

          console.log(`${client.name}: ❌ charge failed — ${errorMessage}`);
          results.push({ client: client.name, action: 'charge_failed', amount: chargeAmount, error: errorMessage });
        }

      } catch (clientError) {
        console.error(`Error processing ${client.name}:`, clientError);
        results.push({ client: client.name, action: 'error', error: (clientError as Error).message });
      }
    }

    console.log(`auto-recharge-run complete. Processed ${results.length} clients.`);
    return jsonResponse({ success: true, processed: results.length, results });

  } catch (error) {
    console.error('auto-recharge-run error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

async function triggerSafeMode(
  supabase: any,
  supabaseUrl: string,
  supabaseServiceKey: string,
  clientId: string,
) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/check-low-balance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clientId }),
    });
  } catch (e) {
    console.error('Failed to trigger safe mode for client:', clientId, e);
  }
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
  });
}
