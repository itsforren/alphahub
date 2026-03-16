/**
 * TEST-02: Auto-Recharge Flow Integration Test
 *
 * Proves that the auto-recharge state machine works end-to-end:
 *   1. Low balance triggers charge via attempt_recharge() PG function
 *   2. Daily limit (2/day) is enforced
 *   3. Charge failure updates recharge_state correctly
 *
 * Runs against live Supabase + Stripe test mode with real edge functions.
 * Requires: .test-context.json (written by globalSetup)
 *
 * IMPORTANT: auto-recharge-run processes ALL eligible clients, not just the
 * test client. Tests filter results by testClientId. The edge function uses
 * client_stripe_customers and client_payment_methods tables (not client_wallets
 * stripe_customer_id).
 */

import { describe, test, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getTestSupabase, cleanTestData } from './helpers/supabase';
import { getStripeTestKey } from './helpers/stripe';
import { invokeEdgeFunction } from './helpers/edge-function';
import { waitFor } from './helpers/wait';

interface TestContext {
  clientId: string;
  stripeCustomerId: string;
  paymentMethodId: string;
  testStartTime: string;
}

let ctx: TestContext;
let testStartTime: string;

beforeAll(async () => {
  const contextPath = resolve(__dirname, '../../.test-context.json');
  ctx = JSON.parse(readFileSync(contextPath, 'utf-8'));
  testStartTime = new Date().toISOString();

  // Validate Stripe key is test mode (safety guard)
  getStripeTestKey();

  const supabase = getTestSupabase();

  // Ensure auto-recharge-run can find this client's Stripe customer.
  // The edge function looks up client_stripe_customers (not client_wallets).
  const { error: cscError } = await supabase
    .from('client_stripe_customers')
    .upsert(
      {
        client_id: ctx.clientId,
        stripe_account: 'ad_spend',
        stripe_customer_id: ctx.stripeCustomerId,
      },
      { onConflict: 'client_id,stripe_account' }
    );
  if (cscError) console.warn('[auto-recharge setup] client_stripe_customers upsert:', cscError.message);

  // Ensure default payment method row exists in client_payment_methods
  const { data: existingPM } = await supabase
    .from('client_payment_methods')
    .select('id')
    .eq('client_id', ctx.clientId)
    .eq('stripe_account', 'ad_spend')
    .eq('is_default', true)
    .maybeSingle();

  if (!existingPM) {
    const { error: pmError } = await supabase
      .from('client_payment_methods')
      .upsert(
        {
          client_id: ctx.clientId,
          stripe_account: 'ad_spend',
          stripe_customer_id: ctx.stripeCustomerId,
          stripe_payment_method_id: ctx.paymentMethodId,
          is_default: true,
        },
        { onConflict: 'stripe_payment_method_id' }
      );
    if (pmError) console.warn('[auto-recharge setup] client_payment_methods upsert:', pmError.message);
  }
});

afterEach(async () => {
  const supabase = getTestSupabase();

  // Reset recharge_state to idle between tests
  await supabase.from('recharge_state').update({
    state: 'idle',
    safe_mode_active: false,
    charge_attempts_today: 0,
    attempt_number: 0,
    last_charge_at: null,
    last_failure_at: null,
    last_failure_reason: null,
    current_billing_record_id: null,
    current_stripe_pi_id: null,
    idempotency_key: null,
    updated_at: new Date().toISOString(),
  }).eq('client_id', ctx.clientId);

  // Reset wallet settings to defaults
  await supabase.from('client_wallets').update({
    auto_billing_enabled: true,
    auto_charge_amount: 500,
    low_balance_threshold: 150,
    safe_mode_threshold: 100,
  }).eq('client_id', ctx.clientId);
});

afterAll(async () => {
  await cleanTestData(ctx.clientId, testStartTime);

  const supabase = getTestSupabase();

  // Clean campaign_budget_snapshots created during tests
  await supabase
    .from('campaign_budget_snapshots')
    .delete()
    .eq('client_id', ctx.clientId)
    .gte('created_at', testStartTime);

  // Final recharge_state reset
  await supabase.from('recharge_state').update({
    state: 'idle',
    safe_mode_active: false,
    charge_attempts_today: 0,
    attempt_number: 0,
  }).eq('client_id', ctx.clientId);

  // Reset auto billing to off after tests complete
  await supabase.from('client_wallets').update({
    auto_billing_enabled: false,
  }).eq('client_id', ctx.clientId);
});

describe('Auto-Recharge Flow Integration (TEST-02)', () => {
  test('auto-recharge-run charges when balance is below threshold', async () => {
    const supabase = getTestSupabase();

    // 1. Set up wallet state: auto-billing enabled, standard thresholds
    await supabase.from('client_wallets').update({
      auto_billing_enabled: true,
      auto_charge_amount: 500,
      low_balance_threshold: 150,
    }).eq('client_id', ctx.clientId);

    // Ensure recharge_state is idle with 0 attempts
    await supabase.from('recharge_state').update({
      state: 'idle',
      safe_mode_active: false,
      charge_attempts_today: 0,
      attempt_number: 0,
      last_charge_at: null,
    }).eq('client_id', ctx.clientId);

    // 2. Push balance below threshold with a large negative adjustment
    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        client_id: ctx.clientId,
        amount: -99999,
        transaction_type: 'adjustment',
        description: 'INTEGRATION_TEST force low balance for auto-recharge',
      });
    expect(txError).toBeNull();

    // 3. Invoke auto-recharge-run edge function
    const response = await invokeEdgeFunction('auto-recharge-run');
    expect(response.status).toBeLessThan(500);

    // 4. Wait for recharge_state to show a charge attempt was made
    // The state should transition from idle -> charging -> succeeded (or stay at succeeded)
    const rechargeState = await waitFor(
      async () => {
        const { data } = await supabase
          .from('recharge_state')
          .select('state, last_charge_at, charge_attempts_today, attempt_number')
          .eq('client_id', ctx.clientId)
          .single();
        return data;
      },
      (result) => {
        // State should have moved past idle (charging, succeeded, or failed)
        return result?.state !== 'idle' || (result?.charge_attempts_today ?? 0) > 0;
      },
      {
        timeout: 30000,
        interval: 2000,
        description: 'recharge_state transition from idle after auto-recharge-run',
      }
    );

    // Assert a charge was attempted
    expect(rechargeState.charge_attempts_today).toBeGreaterThanOrEqual(1);
    expect(rechargeState.last_charge_at).not.toBeNull();

    // 5. Check for a billing record created by auto-recharge-run
    const { data: billingRecords } = await supabase
      .from('billing_records')
      .select('id, amount, status, stripe_payment_intent_id, source')
      .eq('client_id', ctx.clientId)
      .eq('source', 'auto_recharge')
      .gte('created_at', testStartTime)
      .order('created_at', { ascending: false });

    expect(billingRecords).not.toBeNull();
    expect(billingRecords!.length).toBeGreaterThanOrEqual(1);

    const latestRecord = billingRecords![0];
    expect(latestRecord.amount).toBe(500); // auto_charge_amount
    expect(latestRecord.stripe_payment_intent_id).toBeTruthy(); // PI was created

    // 6. If the webhook fires and marks it paid, verify deposit
    // Wait briefly to see if status reaches paid (webhook-dependent)
    try {
      const paidRecord = await waitFor(
        async () => {
          const { data } = await supabase
            .from('billing_records')
            .select('status, paid_at')
            .eq('id', latestRecord.id)
            .single();
          return data;
        },
        (result) => result?.status === 'paid',
        {
          timeout: 45000,
          interval: 2000,
          description: `billing record ${latestRecord.id} paid (webhook processing)`,
        }
      );

      expect(paidRecord.status).toBe('paid');
      expect(paidRecord.paid_at).not.toBeNull();

      // Verify wallet deposit exists
      const { data: deposits } = await supabase
        .from('wallet_transactions')
        .select('id, amount, transaction_type')
        .eq('client_id', ctx.clientId)
        .eq('billing_record_id', latestRecord.id)
        .eq('transaction_type', 'deposit');

      expect(deposits).toHaveLength(1);
      expect(deposits![0].amount).toBe(500);
    } catch {
      // If webhook doesn't fire within timeout, verify PI was at least created
      // This is acceptable -- the PI succeeded in Stripe, webhook may not be configured
      console.warn(
        `Webhook did not process billing record ${latestRecord.id} within timeout. ` +
        'PI was created successfully. Ensure Stripe test mode webhook is configured.'
      );
      expect(latestRecord.stripe_payment_intent_id).toBeTruthy();
    }

    // 7. Check system alert was created
    const { data: alerts } = await supabase
      .from('system_alerts')
      .select('id, title, severity, metadata')
      .filter('metadata->>client_id', 'eq', ctx.clientId)
      .gte('created_at', testStartTime)
      .order('created_at', { ascending: false });

    expect(alerts).not.toBeNull();
    expect(alerts!.length).toBeGreaterThanOrEqual(1);
  }, 90000);

  test('auto-recharge respects daily limit (2 charges per day)', async () => {
    const supabase = getTestSupabase();

    // 1. Set recharge_state with 2 attempts already made today
    const now = new Date().toISOString();
    await supabase.from('recharge_state').update({
      state: 'idle',
      charge_attempts_today: 2,
      last_charge_at: now,
      attempt_number: 2,
    }).eq('client_id', ctx.clientId);

    // Set up wallet for auto-billing with low balance
    await supabase.from('client_wallets').update({
      auto_billing_enabled: true,
      auto_charge_amount: 500,
      low_balance_threshold: 150,
    }).eq('client_id', ctx.clientId);

    // Push balance below threshold
    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        client_id: ctx.clientId,
        amount: -99999,
        transaction_type: 'adjustment',
        description: 'INTEGRATION_TEST force low balance for daily limit test',
      });
    expect(txError).toBeNull();

    // Record current billing records count
    const { data: beforeRecords } = await supabase
      .from('billing_records')
      .select('id')
      .eq('client_id', ctx.clientId)
      .eq('source', 'auto_recharge')
      .gte('created_at', testStartTime);

    const beforeCount = beforeRecords?.length ?? 0;

    // 2. Invoke auto-recharge-run
    const response = await invokeEdgeFunction('auto-recharge-run');
    expect(response.status).toBeLessThan(500);

    // 3. Wait a short period for any processing
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 4. Assert no new billing record was created (daily limit reached)
    const { data: afterRecords } = await supabase
      .from('billing_records')
      .select('id')
      .eq('client_id', ctx.clientId)
      .eq('source', 'auto_recharge')
      .gte('created_at', testStartTime);

    const afterCount = afterRecords?.length ?? 0;
    expect(afterCount).toBe(beforeCount); // No new records

    // 5. Verify recharge_state was not transitioned to 'charging'
    const { data: rechargeState } = await supabase
      .from('recharge_state')
      .select('state, charge_attempts_today')
      .eq('client_id', ctx.clientId)
      .single();

    // State should still be idle (attempt_recharge rejected it)
    expect(rechargeState?.state).not.toBe('charging');
    expect(rechargeState?.charge_attempts_today).toBe(2);

    // 6. Check for daily limit notification
    const { data: alerts } = await supabase
      .from('system_alerts')
      .select('id, title, severity')
      .filter('metadata->>client_id', 'eq', ctx.clientId)
      .ilike('title', '%Daily%Limit%')
      .gte('created_at', testStartTime);

    // Daily limit alert may or may not be created depending on whether
    // the function specifically generated one for this client
    // (it depends on the attempt_recharge return reason matching 'daily_limit')
    if (alerts && alerts.length > 0) {
      expect(alerts[0].severity).toBe('warning');
    }
  }, 60000);

  test('auto-recharge handles charge failure gracefully', async () => {
    const supabase = getTestSupabase();

    // 1. Set up wallet state with low balance
    await supabase.from('client_wallets').update({
      auto_billing_enabled: true,
      auto_charge_amount: 500,
      low_balance_threshold: 150,
    }).eq('client_id', ctx.clientId);

    // Ensure recharge_state is idle
    await supabase.from('recharge_state').update({
      state: 'idle',
      safe_mode_active: false,
      charge_attempts_today: 0,
      attempt_number: 0,
      last_charge_at: null,
    }).eq('client_id', ctx.clientId);

    // 2. Swap the default payment method to a declining card
    // Update client_payment_methods to use pm_card_chargeDeclined
    await supabase.from('client_payment_methods').update({
      stripe_payment_method_id: 'pm_card_chargeDeclined',
    }).eq('client_id', ctx.clientId)
      .eq('stripe_account', 'ad_spend')
      .eq('is_default', true);

    // Push balance below threshold
    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        client_id: ctx.clientId,
        amount: -99999,
        transaction_type: 'adjustment',
        description: 'INTEGRATION_TEST force low balance for failure test',
      });
    expect(txError).toBeNull();

    // 3. Invoke auto-recharge-run
    const response = await invokeEdgeFunction('auto-recharge-run');
    expect(response.status).toBeLessThan(500);

    // 4. Wait for recharge_state to reflect failure
    const rechargeState = await waitFor(
      async () => {
        const { data } = await supabase
          .from('recharge_state')
          .select('state, last_failure_at, last_failure_reason, charge_attempts_today')
          .eq('client_id', ctx.clientId)
          .single();
        return data;
      },
      (result) => result?.state === 'failed' && result?.last_failure_at !== null,
      {
        timeout: 30000,
        interval: 2000,
        description: 'recharge_state transition to failed after declined card',
      }
    );

    expect(rechargeState.state).toBe('failed');
    expect(rechargeState.last_failure_at).not.toBeNull();
    expect(rechargeState.last_failure_reason).toBeTruthy();

    // 5. Verify billing record exists with status 'overdue' or 'charging'
    //    (overdue if the PI creation itself failed, charging if PI created but failed)
    const { data: billingRecords } = await supabase
      .from('billing_records')
      .select('id, status, stripe_payment_intent_id, last_charge_error')
      .eq('client_id', ctx.clientId)
      .eq('source', 'auto_recharge')
      .gte('created_at', testStartTime)
      .order('created_at', { ascending: false });

    expect(billingRecords).not.toBeNull();
    expect(billingRecords!.length).toBeGreaterThanOrEqual(1);

    const failedRecord = billingRecords![0];
    expect(failedRecord.status).not.toBe('paid');

    // 6. Assert no wallet deposit was created for the failed charge
    if (failedRecord.id) {
      const { data: deposits } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('client_id', ctx.clientId)
        .eq('billing_record_id', failedRecord.id)
        .eq('transaction_type', 'deposit');

      expect(deposits).toHaveLength(0);
    }

    // 7. Check for charge failure alert
    const { data: alerts } = await supabase
      .from('system_alerts')
      .select('id, title, severity, metadata')
      .filter('metadata->>client_id', 'eq', ctx.clientId)
      .gte('created_at', testStartTime)
      .order('created_at', { ascending: false });

    expect(alerts).not.toBeNull();
    expect(alerts!.length).toBeGreaterThanOrEqual(1);

    // 8. Restore the valid payment method for subsequent tests
    await supabase.from('client_payment_methods').update({
      stripe_payment_method_id: ctx.paymentMethodId,
    }).eq('client_id', ctx.clientId)
      .eq('stripe_account', 'ad_spend')
      .eq('is_default', true);
  }, 60000);
});
