/**
 * TEST-03: Safe Mode Lifecycle Integration Test
 *
 * Proves the safe mode lifecycle works end-to-end:
 *   1. Safe mode activates when balance drops below safe_mode_threshold
 *   2. Campaign budget snapshots capture budgets correctly
 *   3. Budget restoration after repayment clears safe mode (via real Stripe webhook)
 *   4. RECH-11: re-entry guard prevents re-snapshot while already in safe mode
 *
 * Runs against live Supabase + Stripe test mode with real edge functions.
 * Requires: .test-context.json (written by globalSetup)
 *
 * IMPORTANT: The test client likely has NO real Google Ads campaigns. Safe mode
 * DB state changes (recharge_state, campaign_budget_snapshots) still work, but
 * Google Ads API calls will fail gracefully per RECH-14 error handling.
 */

import { describe, test, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getTestSupabase, cleanTestData } from './helpers/supabase';
import { createTestPaymentIntent, getStripeTestKey } from './helpers/stripe';
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

const SUPABASE_URL = process.env.SUPABASE_URL || '';

// Track fake campaign IDs for cleanup
const fakeCampaignIds: string[] = [];

beforeAll(async () => {
  const contextPath = resolve(__dirname, '../../.test-context.json');
  ctx = JSON.parse(readFileSync(contextPath, 'utf-8'));
  testStartTime = new Date().toISOString();

  // Validate Stripe key is test mode (safety guard)
  getStripeTestKey();
});

afterEach(async () => {
  const supabase = getTestSupabase();

  // Reset recharge_state between tests
  await supabase.from('recharge_state').update({
    state: 'idle',
    safe_mode_active: false,
    safe_mode_activated_at: null,
    grace_period_until: null,
    charge_attempts_today: 0,
    attempt_number: 0,
    current_billing_record_id: null,
    current_stripe_pi_id: null,
    updated_at: new Date().toISOString(),
  }).eq('client_id', ctx.clientId);

  // Reset safe_mode_threshold
  await supabase.from('client_wallets').update({
    safe_mode_threshold: 100,
  }).eq('client_id', ctx.clientId);
});

afterAll(async () => {
  const supabase = getTestSupabase();

  // Clean up fake campaign rows
  for (const id of fakeCampaignIds) {
    await supabase.from('campaigns').delete().eq('id', id);
  }

  // Clean up campaign_budget_snapshots for test client
  await supabase
    .from('campaign_budget_snapshots')
    .delete()
    .eq('client_id', ctx.clientId)
    .gte('created_at', testStartTime);

  // Clean test data (billing_records, wallet_transactions, alerts, etc.)
  await cleanTestData(ctx.clientId, testStartTime);

  // Final recharge_state reset
  await supabase.from('recharge_state').update({
    state: 'idle',
    safe_mode_active: false,
    safe_mode_activated_at: null,
    grace_period_until: null,
  }).eq('client_id', ctx.clientId);

  // Reset wallet thresholds
  await supabase.from('client_wallets').update({
    safe_mode_threshold: 100,
  }).eq('client_id', ctx.clientId);
});

describe('Safe Mode Lifecycle Integration (TEST-03)', () => {
  test('safe mode activates when balance drops below safe mode threshold', async () => {
    const supabase = getTestSupabase();

    // 1. Set up test client for safe mode detection
    await supabase.from('client_wallets').update({
      safe_mode_threshold: 999999, // Set extremely high so current balance triggers it
    }).eq('client_id', ctx.clientId);

    // Set recharge_state to failed (simulating failed charge), safe_mode not yet active
    await supabase.from('recharge_state').update({
      state: 'failed',
      safe_mode_active: false,
      safe_mode_activated_at: null,
      grace_period_until: null,
    }).eq('client_id', ctx.clientId);

    // 2. Invoke check-low-balance for this specific client
    const response = await invokeEdgeFunction('check-low-balance', {
      clientId: ctx.clientId,
    });
    expect(response.status).toBeLessThan(500);

    // 3. Wait for safe_mode_active=true in recharge_state
    const rechargeState = await waitFor(
      async () => {
        const { data } = await supabase
          .from('recharge_state')
          .select('safe_mode_active, safe_mode_activated_at')
          .eq('client_id', ctx.clientId)
          .single();
        return data;
      },
      (result) => result?.safe_mode_active === true,
      {
        timeout: 30000,
        interval: 2000,
        description: 'recharge_state.safe_mode_active = true after check-low-balance',
      }
    );

    // 4. Assert safe mode is active
    expect(rechargeState.safe_mode_active).toBe(true);
    expect(rechargeState.safe_mode_activated_at).not.toBeNull();

    // 5. Check campaign_budget_snapshots
    //    Test client may have 0 campaigns -- both snapshot-exists and no-snapshot are valid
    const { data: snapshots } = await supabase
      .from('campaign_budget_snapshots')
      .select('id, snapshot_type, campaign_budgets, created_at')
      .eq('client_id', ctx.clientId)
      .eq('snapshot_type', 'safe_mode_entry')
      .gte('created_at', testStartTime)
      .order('created_at', { ascending: false });

    // Either we have a snapshot (client had campaigns) or 0 snapshots (no campaigns)
    // Both are valid -- safe mode is active regardless
    if (snapshots && snapshots.length > 0) {
      expect(snapshots[0].snapshot_type).toBe('safe_mode_entry');
      expect(snapshots[0].campaign_budgets).toBeTruthy();
    }

    // 6. Check system alert for Safe Mode Activated
    const { data: alerts } = await supabase
      .from('system_alerts')
      .select('id, title, severity, metadata')
      .filter('metadata->>client_id', 'eq', ctx.clientId)
      .ilike('title', '%Safe Mode%')
      .gte('created_at', testStartTime)
      .order('created_at', { ascending: false });

    expect(alerts).not.toBeNull();
    expect(alerts!.length).toBeGreaterThanOrEqual(1);
    expect(alerts![0].severity).toBe('critical');
    expect(alerts![0].title).toContain('Safe Mode');
  }, 60000);

  test('safe mode snapshot captures campaign budgets correctly', async () => {
    const supabase = getTestSupabase();

    // 1. Insert a fake campaign row for the test client
    const { data: fakeCampaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        client_id: ctx.clientId,
        google_campaign_id: 'test_campaign_snapshot_1',
        google_customer_id: 'test_customer_snapshot_1',
        current_daily_budget: 50,
        safe_mode: false,
        ignored: false,
        status: 'green',
      })
      .select('id')
      .single();

    expect(campaignError).toBeNull();
    expect(fakeCampaign).toBeTruthy();
    fakeCampaignIds.push(fakeCampaign!.id);

    // 2. Set balance below safe mode threshold
    await supabase.from('client_wallets').update({
      safe_mode_threshold: 999999,
    }).eq('client_id', ctx.clientId);

    await supabase.from('recharge_state').update({
      state: 'failed',
      safe_mode_active: false,
      safe_mode_activated_at: null,
      grace_period_until: null,
    }).eq('client_id', ctx.clientId);

    // 3. Invoke check-low-balance
    const response = await invokeEdgeFunction('check-low-balance', {
      clientId: ctx.clientId,
    });
    expect(response.status).toBeLessThan(500);

    // 4. Wait for safe_mode_active=true
    await waitFor(
      async () => {
        const { data } = await supabase
          .from('recharge_state')
          .select('safe_mode_active')
          .eq('client_id', ctx.clientId)
          .single();
        return data;
      },
      (result) => result?.safe_mode_active === true,
      {
        timeout: 30000,
        interval: 2000,
        description: 'recharge_state.safe_mode_active = true for snapshot test',
      }
    );

    // 5. Query campaign_budget_snapshots for this client
    const { data: snapshots, error: snapError } = await supabase
      .from('campaign_budget_snapshots')
      .select('id, snapshot_type, campaign_budgets, triggered_by')
      .eq('client_id', ctx.clientId)
      .eq('snapshot_type', 'safe_mode_entry')
      .gte('created_at', testStartTime)
      .order('created_at', { ascending: false });

    expect(snapError).toBeNull();
    expect(snapshots).not.toBeNull();
    expect(snapshots!.length).toBeGreaterThanOrEqual(1);

    const snapshot = snapshots![0];
    expect(snapshot.triggered_by).toBe('check-low-balance');

    // 6. Verify snapshot contains our fake campaign's budget data
    const budgets = snapshot.campaign_budgets as Array<{
      campaign_id: string;
      campaign_name: string;
      daily_budget: number;
    }>;

    expect(budgets).toBeTruthy();
    expect(Array.isArray(budgets)).toBe(true);

    // Find the fake campaign in the snapshot
    const fakeBudget = budgets.find(
      (b) => b.campaign_name === 'test_campaign_snapshot_1'
    );
    expect(fakeBudget).toBeTruthy();
    expect(fakeBudget!.daily_budget).toBe(50);

    // 7. Verify campaigns row has safe_mode=true
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('safe_mode')
      .eq('id', fakeCampaign!.id)
      .single();

    expect(campaign?.safe_mode).toBe(true);

    // Cleanup: delete the fake campaign (also handled in afterAll)
    await supabase.from('campaigns').delete().eq('id', fakeCampaign!.id);
    // Remove from tracking since we cleaned it here
    const idx = fakeCampaignIds.indexOf(fakeCampaign!.id);
    if (idx !== -1) fakeCampaignIds.splice(idx, 1);
  }, 60000);

  test('budget restoration after repayment clears safe mode via real webhook', async () => {
    const supabase = getTestSupabase();

    // This test MUST exercise the real end-to-end restoration path:
    // PaymentIntent -> webhook -> tryRestoreAndResetRechargeState -> restoreFromSnapshot
    // Do NOT shortcut by directly mutating DB state.

    // 1. Start from safe-mode-active state
    await supabase.from('recharge_state').update({
      safe_mode_active: true,
      safe_mode_activated_at: new Date().toISOString(),
      state: 'failed',
      grace_period_until: null,
    }).eq('client_id', ctx.clientId);

    // Insert campaign_budget_snapshots with snapshot_type='safe_mode_entry'
    const snapshotData = [
      {
        campaign_id: 'fake-campaign-for-restore-test',
        campaign_name: 'test_campaign_restore',
        daily_budget: 75,
        status: 'green',
      },
    ];

    const { data: snapshotRow, error: snapInsertError } = await supabase
      .from('campaign_budget_snapshots')
      .insert({
        client_id: ctx.clientId,
        snapshot_type: 'safe_mode_entry',
        campaign_budgets: snapshotData,
        triggered_by: 'integration_test',
        restored_at: null,
      })
      .select('id')
      .single();

    expect(snapInsertError).toBeNull();
    expect(snapshotRow).toBeTruthy();

    // Ensure wallet balance is high enough that restoration check passes.
    // The webhook checks balance > low_balance_threshold before restoring.
    // Set low_balance_threshold low to ensure the check passes.
    await supabase.from('client_wallets').update({
      low_balance_threshold: 0,
    }).eq('client_id', ctx.clientId);

    // Add a positive wallet transaction to ensure balance is clearly above 0
    await supabase.from('wallet_transactions').insert({
      client_id: ctx.clientId,
      amount: 99999,
      transaction_type: 'adjustment',
      description: 'INTEGRATION_TEST ensure high balance for restoration',
    });

    // 2. Create a billing record in 'charging' status
    const { data: record, error: insertError } = await supabase
      .from('billing_records')
      .insert({
        client_id: ctx.clientId,
        amount: 500,
        status: 'charging',
        billing_type: 'ad_spend',
        notes: 'INTEGRATION_TEST safe-mode-restoration',
        source: 'stripe',
      })
      .select('id')
      .single();

    expect(insertError).toBeNull();
    expect(record).toBeTruthy();
    const recordId = record!.id;

    // 3. Create a real Stripe PaymentIntent
    const pi = await createTestPaymentIntent({
      customerId: ctx.stripeCustomerId,
      paymentMethodId: ctx.paymentMethodId,
      amountCents: 50000, // $500
      metadata: {
        billing_record_id: recordId,
        source: 'integration_test',
      },
    });

    expect(pi.id).toBeTruthy();
    expect(pi.status).toBe('succeeded');

    // 4. Update billing record with stripe_payment_intent_id
    const { error: updateError } = await supabase
      .from('billing_records')
      .update({ stripe_payment_intent_id: pi.id as string })
      .eq('id', recordId);

    expect(updateError).toBeNull();

    // 5. Wait for the Stripe webhook to process and mark record as paid
    const paidRecord = await waitFor(
      async () => {
        const { data } = await supabase
          .from('billing_records')
          .select('id, status, paid_at')
          .eq('id', recordId)
          .single();
        return data;
      },
      (result) => result?.status === 'paid',
      {
        timeout: 45000,
        interval: 2000,
        description: `billing record ${recordId} status='paid' -- ensure Stripe test mode webhook is configured at ${SUPABASE_URL}/functions/v1/stripe-billing-webhook. Timed out waiting for webhook to process PaymentIntent -- ensure Stripe test mode webhook is configured.`,
      }
    );

    expect(paidRecord.status).toBe('paid');

    // 6. Wait for safe_mode_active to become false
    // The webhook handler calls tryRestoreAndResetRechargeState which uses restoreFromSnapshot()
    const restoredState = await waitFor(
      async () => {
        const { data } = await supabase
          .from('recharge_state')
          .select('safe_mode_active, state, grace_period_until')
          .eq('client_id', ctx.clientId)
          .single();
        return data;
      },
      (result) => result?.safe_mode_active === false,
      {
        timeout: 15000,
        interval: 1000,
        description: 'recharge_state.safe_mode_active = false after webhook restoration',
      }
    );

    // 7. Assert safe mode is cleared
    expect(restoredState.safe_mode_active).toBe(false);

    // 8. Assert campaign_budget_snapshots.restored_at is set
    const { data: restoredSnapshot } = await supabase
      .from('campaign_budget_snapshots')
      .select('restored_at, restored_by')
      .eq('id', snapshotRow!.id)
      .single();

    expect(restoredSnapshot?.restored_at).not.toBeNull();

    // 9. Assert grace_period_until is set (approximately 2h from now)
    expect(restoredState.grace_period_until).not.toBeNull();
    const gracePeriod = new Date(restoredState.grace_period_until!);
    const now = new Date();
    const diffHours = (gracePeriod.getTime() - now.getTime()) / (1000 * 60 * 60);
    // Should be roughly 2 hours in the future (allow 1-3h range for test timing)
    expect(diffHours).toBeGreaterThan(0.5);
    expect(diffHours).toBeLessThan(3);

    // 10. Assert recharge_state.state = 'idle' (reset after successful payment)
    expect(restoredState.state).toBe('idle');
  }, 90000);

  test('RECH-11: re-entry guard prevents re-snapshot while in safe mode', async () => {
    const supabase = getTestSupabase();

    // 1. Set recharge_state: safe_mode_active=true, recent activation
    const activatedAt = new Date().toISOString();
    await supabase.from('recharge_state').update({
      safe_mode_active: true,
      safe_mode_activated_at: activatedAt,
      state: 'failed',
      grace_period_until: null,
    }).eq('client_id', ctx.clientId);

    // 2. Insert a budget snapshot (to verify it doesn't get overwritten)
    const existingSnapshotData = [
      {
        campaign_id: 'existing-snapshot-campaign',
        campaign_name: 'test_campaign_guard',
        daily_budget: 100,
        status: 'green',
      },
    ];

    const { data: existingSnapshot, error: snapError } = await supabase
      .from('campaign_budget_snapshots')
      .insert({
        client_id: ctx.clientId,
        snapshot_type: 'safe_mode_entry',
        campaign_budgets: existingSnapshotData,
        triggered_by: 'integration_test_rech11',
        restored_at: null,
      })
      .select('id, created_at')
      .single();

    expect(snapError).toBeNull();
    expect(existingSnapshot).toBeTruthy();

    // Record count of snapshots before the call
    const { data: beforeSnapshots } = await supabase
      .from('campaign_budget_snapshots')
      .select('id')
      .eq('client_id', ctx.clientId)
      .eq('snapshot_type', 'safe_mode_entry')
      .is('restored_at', null);

    const beforeCount = beforeSnapshots?.length ?? 0;

    // Set high threshold to trigger safe mode detection
    await supabase.from('client_wallets').update({
      safe_mode_threshold: 999999,
    }).eq('client_id', ctx.clientId);

    // 3. Invoke check-low-balance
    const response = await invokeEdgeFunction('check-low-balance', {
      clientId: ctx.clientId,
    });
    expect(response.status).toBeLessThan(500);

    // 4. Wait a short period for any processing
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 5. Assert no NEW campaign_budget_snapshots row was created
    const { data: afterSnapshots } = await supabase
      .from('campaign_budget_snapshots')
      .select('id')
      .eq('client_id', ctx.clientId)
      .eq('snapshot_type', 'safe_mode_entry')
      .is('restored_at', null);

    const afterCount = afterSnapshots?.length ?? 0;
    expect(afterCount).toBe(beforeCount); // No new unrestored snapshots

    // 6. Assert the existing snapshot is unchanged
    const { data: unchangedSnapshot } = await supabase
      .from('campaign_budget_snapshots')
      .select('id, campaign_budgets, triggered_by, created_at')
      .eq('id', existingSnapshot!.id)
      .single();

    expect(unchangedSnapshot).toBeTruthy();
    expect(unchangedSnapshot!.triggered_by).toBe('integration_test_rech11');
    expect(unchangedSnapshot!.campaign_budgets).toEqual(existingSnapshotData);

    // 7. Assert safe mode is still active (not toggled off and back on)
    const { data: stillActive } = await supabase
      .from('recharge_state')
      .select('safe_mode_active, safe_mode_activated_at')
      .eq('client_id', ctx.clientId)
      .single();

    expect(stillActive?.safe_mode_active).toBe(true);
    // activated_at should not have been updated (same timestamp as before)
    expect(stillActive?.safe_mode_activated_at).toBe(activatedAt);
  }, 60000);
});
