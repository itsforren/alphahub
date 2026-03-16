/**
 * auto-recharge-run: SOLE charge initiation function.
 *
 * Responsibilities:
 * - Independently detects low balance (balance <= charge threshold)
 * - Calls attempt_recharge() RPC for concurrency mutex + rate limiting
 * - Creates Stripe PaymentIntents for clients that acquire the mutex
 * - Updates recharge_state after each Stripe outcome
 *
 * Does NOT:
 * - Activate safe mode (that's check-low-balance's job)
 * - Import or use _shared/safe-mode.ts
 * - Implement inline daily caps, cooldowns, or advisory locks
 *   (all handled atomically by attempt_recharge() PG function)
 *
 * State machine: idle/failed -> charging -> succeeded/failed
 * Concurrency: Row-level mutex in attempt_recharge() (no advisory locks)
 * Rate limiting: 2/day + escalating cooldown (PG function)
 * Monthly cap: Atomic check in PG function
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notify } from '../_shared/notifications.ts';

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

    // ── Step 1: Clean up stale charging records (RECH-13) ──
    const { data: cleanupResult } = await supabase.rpc('stale_charging_cleanup');
    if (cleanupResult?.cleaned_up > 0) {
      console.log(`Cleaned ${cleanupResult.cleaned_up} stale charging records`);
      await notify({
        supabase,
        severity: 'info',
        title: 'Stale Charging Cleanup',
        message: `Cleaned ${cleanupResult.cleaned_up} stale charging records`,
        metadata: cleanupResult,
      });
    }

    // ── Step 2: Query all auto_stripe wallets with auto-billing enabled ──
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
    const today = new Date().toISOString().split('T')[0];

    for (const wallet of wallets) {
      const clientId = wallet.client_id;

      // ── Fetch client record ──
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, email, status')
        .eq('id', clientId)
        .maybeSingle();

      if (clientError || !client) {
        results.push({ client_id: clientId, action: 'skipped', reason: 'client_not_found' });
        continue;
      }

      if (client.status !== 'active') {
        results.push({ client: client.name, action: 'skipped', reason: 'not_active' });
        continue;
      }

      try {
        // ── Step 3a: Compute wallet balance via RPC (single source of truth) ──
        const { data: balanceResult, error: balanceError } = await supabase.rpc(
          'compute_wallet_balance',
          { p_client_id: clientId },
        );

        if (balanceError) {
          console.error(`${client.name}: balance computation failed:`, balanceError);
          results.push({ client: client.name, action: 'error', error: 'balance_computation_failed' });
          continue;
        }

        const balance = balanceResult?.remaining_balance ?? 0;
        const chargeThreshold = wallet.low_balance_threshold ?? 150;

        console.log(`${client.name}: balance=$${Number(balance).toFixed(2)}, threshold=$${chargeThreshold}`);

        // ── Step 3b: Skip if balance is above charge threshold (RECH-01) ──
        if (balance > chargeThreshold) {
          results.push({ client: client.name, action: 'balance_ok', balance });
          continue;
        }

        // ── Step 3c: Validate charge amount ──
        const chargeAmount = Number(wallet.auto_charge_amount);
        if (chargeAmount < MIN_CHARGE_AMOUNT) {
          console.log(`${client.name}: charge amount $${chargeAmount} below minimum $${MIN_CHARGE_AMOUNT}`);
          results.push({ client: client.name, action: 'skipped', reason: 'charge_amount_below_minimum' });
          continue;
        }

        // ── Step 3d: Call attempt_recharge() RPC (RECH-06/07/08/09/10) ──
        // This handles: state mutex, daily limit (2/day), escalating cooldown, monthly cap
        const { data: rechargeResult, error: rechargeError } = await supabase.rpc(
          'attempt_recharge',
          {
            p_client_id: clientId,
            p_charge_amount: chargeAmount,
            p_monthly_cap: wallet.monthly_ad_spend_cap,
          },
        );

        if (rechargeError || !rechargeResult?.success) {
          const reason = rechargeResult?.reason || rechargeError?.message || 'unknown';
          console.log(`${client.name}: attempt_recharge rejected — ${reason}`);
          results.push({ client: client.name, action: 'skipped', reason });

          // Notify on daily limit hits
          if (rechargeResult?.reason === 'daily_limit') {
            await notify({
              supabase,
              clientId,
              clientName: client.name,
              severity: 'warning',
              title: 'Daily Charge Limit Reached',
              message: `Client ${client.name} hit daily charge limit (2/day). Balance: $${Number(balance).toFixed(2)}.`,
            });
          }

          // Notify on monthly cap exceeded
          if (rechargeResult?.reason === 'monthly_cap_exceeded') {
            await notify({
              supabase,
              clientId,
              clientName: client.name,
              severity: 'warning',
              title: 'Monthly Cap Reached',
              message: `Client ${client.name} hit monthly cap ($${rechargeResult.cap}). Month total: $${rechargeResult.month_total}.`,
              metadata: { cap: rechargeResult.cap, month_total: rechargeResult.month_total },
            });
          }

          continue;
        }

        // ── Step 3e: Look up Stripe customer and payment method ──
        const { data: stripeCustomer } = await supabase
          .from('client_stripe_customers')
          .select('stripe_customer_id')
          .eq('client_id', clientId)
          .eq('stripe_account', 'ad_spend')
          .maybeSingle();

        if (!stripeCustomer) {
          console.log(`${client.name}: no Stripe customer linked for ad_spend`);
          results.push({ client: client.name, action: 'skipped', reason: 'no_stripe_customer' });
          // Reset state back to failed since we can't charge
          await supabase.from('recharge_state').update({
            state: 'failed',
            last_failure_at: new Date().toISOString(),
            last_failure_reason: 'no_stripe_customer',
            updated_at: new Date().toISOString(),
          }).eq('client_id', clientId);
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
          console.log(`${client.name}: no default payment method on file`);
          results.push({ client: client.name, action: 'skipped', reason: 'no_payment_method' });
          // Reset state back to failed since we can't charge
          await supabase.from('recharge_state').update({
            state: 'failed',
            last_failure_at: new Date().toISOString(),
            last_failure_reason: 'no_payment_method',
            updated_at: new Date().toISOString(),
          }).eq('client_id', clientId);
          continue;
        }

        // ── Step 3f: Create billing record with 'charging' status BEFORE Stripe call ──
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

        // Link billing record to recharge_state
        await supabase.from('recharge_state').update({
          current_billing_record_id: newRecord.id,
          updated_at: new Date().toISOString(),
        }).eq('client_id', clientId);

        console.log(`${client.name}: charging $${chargeAmount} via Stripe (billing_record=${newRecord.id})...`);

        // ── Step 3g: Create Stripe PaymentIntent with idempotency key ──
        try {
          const piBody = new URLSearchParams({
            amount: String(Math.round(chargeAmount * 100)),
            currency: 'usd',
            customer: stripeCustomer.stripe_customer_id,
            payment_method: paymentMethod.stripe_payment_method_id,
            confirm: 'true',
            off_session: 'true',
            'metadata[client_id]': clientId,
            'metadata[source]': 'auto_recharge',
            'metadata[billing_record_id]': newRecord.id,
          });

          const res = await fetch('https://api.stripe.com/v1/payment_intents', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${STRIPE_AD_SPEND_KEY()}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Idempotency-Key': rechargeResult.idempotency_key,
            },
            body: piBody.toString(),
          });

          const pi = await res.json();
          console.log(`${client.name}: PaymentIntent ${pi.id} status=${pi.status}`);

          if (pi.status === 'succeeded') {
            // ── PI succeeded: update recharge_state, let webhook handle paid+deposit ──
            await supabase.from('billing_records').update({
              stripe_payment_intent_id: pi.id,
            }).eq('id', newRecord.id);

            await supabase.from('recharge_state').update({
              state: 'succeeded',
              current_stripe_pi_id: pi.id,
              last_success_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('client_id', clientId);

            // Update last_auto_charge_at on wallet
            await supabase.from('client_wallets').update({
              last_auto_charge_at: new Date().toISOString(),
            }).eq('client_id', clientId);

            await notify({
              supabase,
              clientId,
              clientName: client.name,
              severity: 'info',
              title: 'Auto-Recharge Succeeded',
              message: `Charged $${chargeAmount.toFixed(2)} for ${client.name}. Awaiting webhook confirmation.`,
              metadata: { amount: chargeAmount, pi_id: pi.id, billing_record_id: newRecord.id },
            });

            console.log(`${client.name}: PI succeeded, awaiting webhook for paid+deposit`);
            results.push({
              client: client.name,
              action: 'charged',
              amount: chargeAmount,
              pi_id: pi.id,
              billing_record_id: newRecord.id,
            });

          } else if (pi.status === 'requires_action') {
            // ── 3D Secure required: mark failed, store payment link ──
            const paymentLink = pi.next_action?.redirect_to_url?.url || null;

            await supabase.from('billing_records').update({
              stripe_payment_intent_id: pi.id,
              payment_link: paymentLink,
            }).eq('id', newRecord.id);

            await supabase.from('recharge_state').update({
              state: 'failed',
              last_failure_at: new Date().toISOString(),
              last_failure_reason: 'requires_action_3ds',
              attempt_number: rechargeResult.charge_attempts_today,
              updated_at: new Date().toISOString(),
            }).eq('client_id', clientId);

            await notify({
              supabase,
              clientId,
              clientName: client.name,
              severity: 'warning',
              title: '3DS Authentication Required',
              message: `Auto-recharge for ${client.name} ($${chargeAmount.toFixed(2)}) requires 3DS verification.`,
              metadata: { amount: chargeAmount, pi_id: pi.id, payment_link: paymentLink },
            });

            console.log(`${client.name}: requires 3DS action`);
            results.push({
              client: client.name,
              action: 'requires_action',
              amount: chargeAmount,
              payment_link: paymentLink,
            });

          } else {
            // ── PI failed: mark billing record overdue, update recharge_state ──
            const errorMessage = pi.last_payment_error?.message || pi.error?.message || `Status: ${pi.status}`;

            await supabase.from('billing_records').update({
              stripe_payment_intent_id: pi.id || null,
              status: 'overdue',
              last_charge_error: errorMessage,
            }).eq('id', newRecord.id);

            await supabase.from('recharge_state').update({
              state: 'failed',
              last_failure_at: new Date().toISOString(),
              last_failure_reason: errorMessage.slice(0, 500),
              attempt_number: rechargeResult.charge_attempts_today,
              updated_at: new Date().toISOString(),
            }).eq('client_id', clientId);

            // Escalation: critical alert after 2nd failure
            const severity = rechargeResult.charge_attempts_today >= 2 ? 'critical' : 'warning';
            await notify({
              supabase,
              clientId,
              clientName: client.name,
              severity,
              title: severity === 'critical' ? 'Repeated Charge Failure' : 'Charge Failed',
              message: `Attempt ${rechargeResult.charge_attempts_today}/2 failed for ${client.name}: ${errorMessage}`,
              metadata: { amount: chargeAmount, stripe_error: errorMessage },
            });

            console.log(`${client.name}: charge failed — ${errorMessage}`);
            results.push({
              client: client.name,
              action: 'charge_failed',
              amount: chargeAmount,
              error: errorMessage,
            });
          }

        } catch (stripeError) {
          // ── RECH-14: Stripe unreachable — fail gracefully, do NOT modify budgets ──
          const errorMsg = (stripeError as Error).message;
          console.error(`${client.name}: Stripe API unreachable:`, stripeError);

          // Mark billing record as overdue
          await supabase.from('billing_records').update({
            status: 'overdue',
            last_charge_error: 'stripe_unreachable: ' + errorMsg,
          }).eq('id', newRecord.id);

          await supabase.from('recharge_state').update({
            state: 'failed',
            last_failure_at: new Date().toISOString(),
            last_failure_reason: 'stripe_unreachable: ' + errorMsg.slice(0, 450),
            updated_at: new Date().toISOString(),
          }).eq('client_id', clientId);

          await notify({
            supabase,
            clientId,
            clientName: client.name,
            severity: 'critical',
            title: 'Stripe API Unreachable',
            message: `Cannot reach Stripe for ${client.name}. No budgets modified. Will retry next run.`,
          });

          results.push({
            client: client.name,
            action: 'stripe_unreachable',
            error: errorMsg,
          });
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

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
  });
}
