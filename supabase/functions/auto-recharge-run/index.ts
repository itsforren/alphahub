import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MIN_CHARGE_AMOUNT = 50; // Don't charge less than $50
const STRIPE_AD_SPEND_KEY = () => Deno.env.get('STRIPE_AD_SPEND_SECRET_KEY') || '';

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

    const results: any[] = [];
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

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
        // ── Advisory lock: skip if another process is handling this client ──
        const { data: lockResult } = await supabase.rpc('try_advisory_lock_client', { p_client_id: clientId });
        if (lockResult === false) {
          console.log(`${client.name}: locked by another process, skipping`);
          results.push({ client: client.name, action: 'skipped', reason: 'locked_by_another_process' });
          continue;
        }

        // ── Compute wallet balance via RPC (single source of truth) ──
        const { data: balanceResult, error: balanceError } = await supabase.rpc('compute_wallet_balance', { p_client_id: clientId });
        if (balanceError) {
          console.error(`${client.name}: balance computation failed:`, balanceError);
          results.push({ client: client.name, action: 'error', error: 'balance_computation_failed' });
          continue;
        }

        const remainingBalance = balanceResult?.remaining_balance ?? 0;
        const threshold = wallet.low_balance_threshold ?? 150;

        console.log(`${client.name}: balance=$${Number(remainingBalance).toFixed(2)}, threshold=$${threshold}`);

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
            .gte('paid_at', monthStart);

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

        // ── Daily cap: max 2 charge attempts per client per day ──
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const { count: dailyChargeCount } = await supabase
          .from('billing_records')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .eq('billing_type', 'ad_spend')
          .gte('created_at', todayStart);

        if ((dailyChargeCount || 0) >= 2) {
          console.log(`${client.name}: daily retry limit reached (${dailyChargeCount} charges today)`);
          results.push({ client: client.name, action: 'skipped', reason: 'daily_limit_reached', chargestoday: dailyChargeCount });
          continue;
        }

        // ── Skip if there's already an unpaid (pending/overdue/charging) ad_spend charge in the last 24 hours ──
        const dedup24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const { data: existingUnpaid } = await supabase
          .from('billing_records')
          .select('id, status, created_at')
          .eq('client_id', clientId)
          .eq('billing_type', 'ad_spend')
          .in('status', ['pending', 'overdue', 'charging'])
          .gte('created_at', dedup24h)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingUnpaid) {
          console.log(`${client.name}: existing unpaid charge ${existingUnpaid.id} (${existingUnpaid.status}), skipping new charge`);
          results.push({ client: client.name, action: 'skipped', reason: 'existing_unpaid_charge', record_id: existingUnpaid.id });
          // Still trigger safe mode if not already in it
          await triggerSafeMode(supabase, supabaseUrl, supabaseServiceKey, clientId);
          continue;
        }

        // ── Cooldown: skip if recharged (paid) within the last 2.5 hours ──
        const cooldownMs = 2.5 * 60 * 60 * 1000; // 2.5 hours
        const cooldownCutoff = new Date(now.getTime() - cooldownMs).toISOString();
        const { data: recentCharge } = await supabase
          .from('billing_records')
          .select('id, status, paid_at, created_at')
          .eq('client_id', clientId)
          .eq('billing_type', 'ad_spend')
          .in('status', ['paid'])
          .or(`paid_at.gte.${cooldownCutoff},created_at.gte.${cooldownCutoff}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentCharge) {
          const chargeTime = recentCharge.paid_at || recentCharge.created_at;
          console.log(`${client.name}: recharged recently at ${chargeTime}, cooldown active`);
          results.push({ client: client.name, action: 'skipped', reason: 'cooldown_active', last_charge: chargeTime });
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

        // ── Step 1: Create billing record with 'charging' status BEFORE calling Stripe ──
        const { data: newRecord, error: insertError } = await supabase
          .from('billing_records')
          .insert({
            client_id: clientId,
            billing_type: 'ad_spend',
            amount: chargeAmount,
            due_date: today,
            billing_period_start: today,
            status: 'charging',
            source: 'auto_recharge',
            stripe_account: 'ad_spend',
            recurrence_type: 'one_time',
            is_recurring_parent: false,
            notes: 'Auto-recharge',
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        // Update last_auto_charge_at on charge initiation (not on PI success)
        await supabase
          .from('client_wallets')
          .update({ last_auto_charge_at: now.toISOString() })
          .eq('id', wallet.id);

        console.log(`${client.name}: charging $${chargeAmount} via Stripe (billing_record=${newRecord.id})...`);

        // ── Step 2: Create Stripe PaymentIntent with idempotency key ──
        const piBody = new URLSearchParams({
          amount: String(Math.round(chargeAmount * 100)),
          currency: 'usd',
          customer: stripeCustomer.stripe_customer_id,
          payment_method: paymentMethod.stripe_payment_method_id,
          confirm: 'true',
          off_session: 'true',
          'metadata[client_id]': clientId,
          'metadata[charge_type]': 'auto_recharge',
          'metadata[billing_record_id]': newRecord.id,
        });

        const res = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STRIPE_AD_SPEND_KEY()}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Idempotency-Key': `auto-recharge-${newRecord.id}`,
          },
          body: piBody.toString(),
        });

        const pi = await res.json();

        console.log(`${client.name}: PaymentIntent ${pi.id} status=${pi.status}`);

        // ── Step 3: Update billing record with PI ID but do NOT mark paid ──
        if (pi.status === 'succeeded') {
          // Update with PI ID only -- webhook handles paid + deposit via process_successful_charge()
          await supabase
            .from('billing_records')
            .update({
              stripe_payment_intent_id: pi.id,
            })
            .eq('id', newRecord.id);

          console.log(`${client.name}: PI succeeded, awaiting webhook for paid+deposit (billing_record=${newRecord.id})`);
          results.push({ client: client.name, action: 'charging', amount: chargeAmount, pi_id: pi.id, billing_record_id: newRecord.id });

        } else if (pi.status === 'requires_action') {
          // 3D Secure or similar -- keep as 'charging', add payment link
          const paymentLink = pi.next_action?.redirect_to_url?.url || null;
          await supabase
            .from('billing_records')
            .update({
              stripe_payment_intent_id: pi.id,
              payment_link: paymentLink,
            })
            .eq('id', newRecord.id);

          await supabase
            .from('client_wallets')
            .update({ last_charge_failed_at: now.toISOString() })
            .eq('id', wallet.id);

          await triggerSafeMode(supabase, supabaseUrl, supabaseServiceKey, clientId);

          console.log(`${client.name}: requires 3DS action, billing record stays as charging`);
          results.push({ client: client.name, action: 'requires_action', amount: chargeAmount, payment_link: paymentLink });

        } else {
          // Payment failed -- mark as overdue
          const errorMessage = pi.last_payment_error?.message || pi.error?.message || `Status: ${pi.status}`;

          await supabase
            .from('billing_records')
            .update({
              stripe_payment_intent_id: pi.id || null,
              status: 'overdue',
              last_charge_error: errorMessage,
            })
            .eq('id', newRecord.id);

          await supabase
            .from('client_wallets')
            .update({ last_charge_failed_at: now.toISOString() })
            .eq('id', wallet.id);

          await triggerSafeMode(supabase, supabaseUrl, supabaseServiceKey, clientId);

          console.log(`${client.name}: charge failed -- ${errorMessage}`);
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
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'x-billing-secret': Deno.env.get('BILLING_EDGE_SECRET') || '',
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
