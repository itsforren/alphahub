/**
 * TEST-01: Charge -> Deposit Integration Test
 *
 * Proves that the core billing chain works:
 *   Stripe charge -> webhook -> billing record paid -> wallet deposit created
 *
 * Runs against live Supabase + Stripe test mode with real PaymentIntents.
 * Requires: .test-context.json (written by globalSetup)
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getTestSupabase, cleanTestData } from './helpers/supabase';
import { createTestPaymentIntent, getStripeTestKey } from './helpers/stripe';
import { waitFor } from './helpers/wait';

interface TestContext {
  clientId: string;
  stripeCustomerId: string;
  paymentMethodId: string;
  testStartTime: string;
}

let ctx: TestContext;
let testStartTime: string;

const SUPABASE_URL = process.env.SUPABASE_URL || '';

beforeAll(() => {
  const contextPath = resolve(__dirname, '../../.test-context.json');
  ctx = JSON.parse(readFileSync(contextPath, 'utf-8'));
  testStartTime = new Date().toISOString();

  // Validate Stripe key is test mode (safety guard)
  getStripeTestKey();
});

afterAll(async () => {
  // Clean up all test data created during this test file
  await cleanTestData(ctx.clientId, testStartTime);
});

describe('Charge -> Deposit Integration (TEST-01)', () => {
  test('successful charge creates billing record and wallet deposit', async () => {
    const supabase = getTestSupabase();

    // 1. Create a billing record in 'charging' status
    const { data: record, error: insertError } = await supabase
      .from('billing_records')
      .insert({
        client_id: ctx.clientId,
        amount: 50,
        status: 'charging',
        billing_type: 'ad_spend',
        notes: 'INTEGRATION_TEST charge-deposit',
        source: 'stripe',
      })
      .select('id')
      .single();

    expect(insertError).toBeNull();
    expect(record).toBeTruthy();
    const recordId = record!.id;

    // 2. Create a Stripe PaymentIntent (confirm=true, off_session=true)
    const pi = await createTestPaymentIntent({
      customerId: ctx.stripeCustomerId,
      paymentMethodId: ctx.paymentMethodId,
      amountCents: 5000,
      metadata: {
        billing_record_id: recordId,
        source: 'integration_test',
      },
    });

    expect(pi.id).toBeTruthy();
    expect(pi.status).toBe('succeeded');

    // 3. Update billing record with stripe_payment_intent_id
    const { error: updateError } = await supabase
      .from('billing_records')
      .update({ stripe_payment_intent_id: pi.id as string })
      .eq('id', recordId);

    expect(updateError).toBeNull();

    // 4. Wait for Stripe webhook to process and mark record as paid
    const paidRecord = await waitFor(
      async () => {
        const { data } = await supabase
          .from('billing_records')
          .select('id, status, stripe_payment_intent_id, paid_at')
          .eq('id', recordId)
          .single();
        return data;
      },
      (result) => result?.status === 'paid',
      {
        timeout: 45000,
        interval: 2000,
        description: `billing record ${recordId} status='paid' -- ensure Stripe test mode webhook is configured at ${SUPABASE_URL}/functions/v1/stripe-billing-webhook`,
      }
    );

    // 5. Assert billing record is correctly paid
    expect(paidRecord.status).toBe('paid');
    expect(paidRecord.stripe_payment_intent_id).toBeTruthy();
    expect(paidRecord.paid_at).not.toBeNull();

    // 6. Query wallet_transactions for the deposit
    const { data: deposits, error: depositError } = await supabase
      .from('wallet_transactions')
      .select('id, amount, transaction_type, billing_record_id')
      .eq('client_id', ctx.clientId)
      .eq('billing_record_id', recordId)
      .eq('transaction_type', 'deposit');

    expect(depositError).toBeNull();
    expect(deposits).toHaveLength(1);
    expect(deposits![0].amount).toBe(50);
  });

  test('failed charge does not create deposit', async () => {
    const supabase = getTestSupabase();

    // 1. Create a billing record in 'charging' status
    const { data: record, error: insertError } = await supabase
      .from('billing_records')
      .insert({
        client_id: ctx.clientId,
        amount: 100,
        status: 'charging',
        billing_type: 'ad_spend',
        notes: 'INTEGRATION_TEST charge-deposit-fail',
        source: 'stripe',
      })
      .select('id')
      .single();

    expect(insertError).toBeNull();
    const recordId = record!.id;

    // 2. Create PaymentIntent with a declined card (pm_card_chargeDeclined)
    //    This will throw because Stripe returns an error for declined cards.
    let piError: Error | null = null;
    try {
      await createTestPaymentIntent({
        customerId: ctx.stripeCustomerId,
        paymentMethodId: 'pm_card_chargeDeclined',
        amountCents: 10000,
        metadata: {
          billing_record_id: recordId,
          source: 'integration_test',
        },
      });
    } catch (err) {
      piError = err instanceof Error ? err : new Error(String(err));
    }

    // The PI creation itself should fail (card_declined)
    expect(piError).not.toBeNull();
    expect(piError!.message).toContain('card_declined');

    // 3. Wait a short period for any webhook to process (failure webhooks are fast)
    //    The billing record should NOT become 'paid'
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // 4. Check billing record status -- should NOT be 'paid'
    const { data: updatedRecord } = await supabase
      .from('billing_records')
      .select('status')
      .eq('id', recordId)
      .single();

    expect(updatedRecord?.status).not.toBe('paid');

    // 5. Assert: 0 deposits exist for this billing record
    const { data: deposits } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('client_id', ctx.clientId)
      .eq('billing_record_id', recordId)
      .eq('transaction_type', 'deposit');

    expect(deposits).toHaveLength(0);
  });

  test('deposit amount matches Stripe charge amount (cents/dollars conversion)', async () => {
    const supabase = getTestSupabase();

    // 1. Create billing record for $75.50
    const { data: record, error: insertError } = await supabase
      .from('billing_records')
      .insert({
        client_id: ctx.clientId,
        amount: 75.5,
        status: 'charging',
        billing_type: 'ad_spend',
        notes: 'INTEGRATION_TEST charge-deposit-conversion',
        source: 'stripe',
      })
      .select('id')
      .single();

    expect(insertError).toBeNull();
    const recordId = record!.id;

    // 2. Create PaymentIntent for 7550 cents ($75.50)
    const pi = await createTestPaymentIntent({
      customerId: ctx.stripeCustomerId,
      paymentMethodId: ctx.paymentMethodId,
      amountCents: 7550,
      metadata: {
        billing_record_id: recordId,
        source: 'integration_test',
      },
    });

    expect(pi.status).toBe('succeeded');

    // 3. Update billing record with PI id
    await supabase
      .from('billing_records')
      .update({ stripe_payment_intent_id: pi.id as string })
      .eq('id', recordId);

    // 4. Wait for webhook to process
    await waitFor(
      async () => {
        const { data } = await supabase
          .from('billing_records')
          .select('status')
          .eq('id', recordId)
          .single();
        return data;
      },
      (result) => result?.status === 'paid',
      {
        timeout: 45000,
        interval: 2000,
        description: `billing record ${recordId} status='paid' (conversion test) -- ensure Stripe test mode webhook is configured at ${SUPABASE_URL}/functions/v1/stripe-billing-webhook`,
      }
    );

    // 5. Query wallet deposit and verify amount conversion
    const { data: deposits, error: depositError } = await supabase
      .from('wallet_transactions')
      .select('id, amount, transaction_type')
      .eq('client_id', ctx.clientId)
      .eq('billing_record_id', recordId)
      .eq('transaction_type', 'deposit');

    expect(depositError).toBeNull();
    expect(deposits).toHaveLength(1);
    // Verify cents-to-dollars conversion: 7550 cents = $75.50
    expect(deposits![0].amount).toBe(75.5);
  });
});
