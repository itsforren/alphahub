/**
 * Alert verification integration tests: TEST-05 through TEST-08.
 *
 * TEST-05: Auto-recharge failure creates system alert
 * TEST-06: Safe mode activation creates critical system alert
 * TEST-07: Reconciliation discrepancy creates system alert (via real sync-stripe-charges)
 * TEST-08: Stale charging records are detected and alerted
 *
 * All tests:
 * - Use testClientId from .test-context.json (created by global setup)
 * - Record testStartTime before each test for filtering
 * - Query system_alerts to verify alerts fired
 * - Clean up created records in afterAll
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getTestSupabase, cleanTestData } from './helpers/supabase';
import { invokeEdgeFunction } from './helpers/edge-function';
import { waitFor } from './helpers/wait';
import * as fs from 'fs';
import * as path from 'path';

// Load test context from global setup
let testClientId: string;
let suiteStartTime: string;
let testStartTime: string;

// Track records created during tests for cleanup
const createdBillingRecordIds: string[] = [];
const createdAlertIds: string[] = [];

beforeAll(() => {
  const contextPath = path.resolve(__dirname, '../../.test-context.json');
  if (!fs.existsSync(contextPath)) {
    throw new Error(
      '.test-context.json not found. Run global setup first: npx vitest run --config tests/vitest.config.integration.ts'
    );
  }
  const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
  testClientId = context.clientId;
  if (!testClientId) throw new Error('testClientId not set in .test-context.json');

  suiteStartTime = new Date().toISOString();
});

beforeEach(() => {
  testStartTime = new Date().toISOString();
});

afterAll(async () => {
  const supabase = getTestSupabase();

  // Clean up billing records created during tests
  for (const id of createdBillingRecordIds) {
    await supabase.from('billing_records').delete().eq('id', id);
  }

  // Clean up system alerts created during tests
  for (const id of createdAlertIds) {
    await supabase.from('system_alerts').delete().eq('id', id);
  }

  // Also clean by suite time range
  await cleanTestData(testClientId, suiteStartTime);

  // Clean up stripe_processed_events with our test prefix
  await supabase
    .from('stripe_processed_events')
    .delete()
    .like('event_id', 'sync_test_%');

  // Reset recharge_state to idle
  await supabase
    .from('recharge_state')
    .update({
      state: 'idle',
      safe_mode_active: false,
      last_failure_at: null,
      last_failure_reason: null,
    })
    .eq('client_id', testClientId);
});

describe('Alert Verification Tests', () => {
  // ── TEST-05: Auto-recharge failure creates system alert ──
  it('TEST-05: auto-recharge failure creates system alert', async () => {
    const supabase = getTestSupabase();

    // Set recharge state to failed to simulate a charge failure condition
    await supabase.from('recharge_state').update({
      state: 'failed',
      last_failure_at: new Date().toISOString(),
      last_failure_reason: 'INTEGRATION_TEST simulated charge failure',
    }).eq('client_id', testClientId);

    // Set wallet balance low enough to trigger recharge detection
    // and ensure auto_billing_enabled + auto_charge_amount are set
    await supabase.from('client_wallets').update({
      auto_billing_enabled: true,
      auto_charge_amount: 200,
      low_balance_threshold: 150,
    }).eq('client_id', testClientId);

    // Invoke auto-recharge-run -- it will try to charge this client
    // but will fail at the Stripe PM lookup or the attempt_recharge mutex
    // The function creates alerts on various failure paths
    const response = await invokeEdgeFunction('auto-recharge-run', {});
    expect(response.status).toBeLessThan(500);

    // Wait for and verify system alert exists
    // The alert may come from various failure paths: charge failure, daily limit,
    // 3DS required, Stripe unreachable, no payment method, etc.
    const alerts = await waitFor(
      async () => {
        const { data } = await supabase
          .from('system_alerts')
          .select('id, severity, title, message, alert_type, metadata, created_at')
          .filter('metadata->>client_id', 'eq', testClientId)
          .gte('created_at', testStartTime)
          .order('created_at', { ascending: false });
        return data ?? [];
      },
      (data) => data.length > 0,
      {
        timeout: 30000,
        interval: 2000,
        description: 'system alert for auto-recharge failure',
      }
    );

    expect(alerts.length).toBeGreaterThan(0);
    const alert = alerts[0];
    expect(['warning', 'critical', 'info']).toContain(alert.severity);
    expect(alert.metadata).toHaveProperty('client_id', testClientId);

    // Track for cleanup
    for (const a of alerts) createdAlertIds.push(a.id);

    // Reset wallet settings
    await supabase.from('client_wallets').update({
      auto_billing_enabled: false,
    }).eq('client_id', testClientId);
  }, 60000);

  // ── TEST-06: Safe mode activation creates critical system alert ──
  it('TEST-06: safe mode activation creates critical system alert', async () => {
    const supabase = getTestSupabase();

    // Set up conditions for safe mode:
    // 1. Balance below safe_mode_threshold (need to ensure wallet has very low balance)
    // 2. Recharge state to 'failed' so safe mode can activate
    await supabase.from('recharge_state').update({
      state: 'failed',
      safe_mode_active: false,
      grace_period_until: null,
    }).eq('client_id', testClientId);

    await supabase.from('client_wallets').update({
      safe_mode_threshold: 999999, // Set extremely high so current balance triggers it
    }).eq('client_id', testClientId);

    // Invoke check-low-balance for this specific client
    // This will detect pessimistic balance <= threshold and activate safe mode
    const response = await invokeEdgeFunction('check-low-balance', {
      clientId: testClientId,
    });
    expect(response.status).toBeLessThan(500);

    // Wait for critical safe mode alert
    const alerts = await waitFor(
      async () => {
        const { data } = await supabase
          .from('system_alerts')
          .select('id, severity, title, message, metadata, created_at')
          .filter('metadata->>client_id', 'eq', testClientId)
          .ilike('title', '%Safe Mode%')
          .gte('created_at', testStartTime)
          .order('created_at', { ascending: false });
        return data ?? [];
      },
      (data) => data.length > 0,
      {
        timeout: 30000,
        interval: 2000,
        description: 'critical alert for safe mode activation',
      }
    );

    expect(alerts.length).toBeGreaterThan(0);
    const alert = alerts[0];
    expect(alert.severity).toBe('critical');
    expect(alert.title).toContain('Safe Mode');
    expect(alert.metadata).toHaveProperty('client_id', testClientId);

    // Track for cleanup
    for (const a of alerts) createdAlertIds.push(a.id);

    // Reset: restore safe_mode_threshold and deactivate safe mode
    await supabase.from('client_wallets').update({
      safe_mode_threshold: 100,
    }).eq('client_id', testClientId);

    await supabase.from('recharge_state').update({
      state: 'idle',
      safe_mode_active: false,
    }).eq('client_id', testClientId);
  }, 60000);

  // ── TEST-07: Reconciliation discrepancy creates system alert ──
  // This test exercises the REAL reconciliation flow via sync-stripe-charges.
  it('TEST-07: reconciliation discrepancy creates system alert via sync-stripe-charges', async () => {
    const supabase = getTestSupabase();
    const timestamp = Date.now();

    // 1. Insert a paid billing_record with NO corresponding wallet_transaction
    //    This is a real reconciliation discrepancy: paid record with no deposit
    const testPiId = `pi_test_reconciliation_${timestamp}`;
    const { data: insertedRecord, error: insertError } = await supabase
      .from('billing_records')
      .insert({
        client_id: testClientId,
        billing_type: 'ad_spend',
        amount: 100,
        status: 'paid',
        paid_at: new Date().toISOString(),
        due_date: new Date().toISOString().split('T')[0],
        stripe_payment_intent_id: testPiId,
        source: 'stripe',
        stripe_account: 'ad_spend',
        recurrence_type: 'one_time',
        is_recurring_parent: false,
        notes: 'INTEGRATION_TEST reconciliation-discrepancy',
      })
      .select('id')
      .single();

    expect(insertError).toBeNull();
    expect(insertedRecord).toBeTruthy();
    createdBillingRecordIds.push(insertedRecord!.id);

    // 2. Verify no wallet_transaction exists for this billing_record (sanity check)
    const { data: existingTx } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('billing_record_id', insertedRecord!.id)
      .eq('transaction_type', 'deposit');

    expect(existingTx?.length ?? 0).toBe(0);

    // 3. Invoke sync-stripe-charges -- this runs reconciliation logic
    //    flagMissingDeposit() will detect the paid record without a deposit
    const response = await invokeEdgeFunction('sync-stripe-charges', {
      clientId: testClientId,
    });
    expect(response.status).toBeLessThan(500);

    // 4. Wait for system alert about missing deposit
    const alerts = await waitFor(
      async () => {
        const { data } = await supabase
          .from('system_alerts')
          .select('id, severity, title, message, alert_type, metadata, created_at')
          .eq('alert_type', 'missing_deposit')
          .gte('created_at', testStartTime)
          .order('created_at', { ascending: false });

        // Filter for alerts matching our specific billing record
        return (data ?? []).filter((a: any) => {
          const meta = a.metadata || {};
          return (
            meta.billing_record_id === insertedRecord!.id ||
            meta.client_id === testClientId
          );
        });
      },
      (data) => data.length > 0,
      {
        timeout: 30000,
        interval: 2000,
        description: 'system alert for reconciliation discrepancy (missing_deposit)',
      }
    );

    // 5. Assert alert exists with proper context
    expect(alerts.length).toBeGreaterThan(0);
    const alert = alerts[0];
    expect(['warning', 'critical']).toContain(alert.severity);
    expect(alert.alert_type).toBe('missing_deposit');

    // Assert the alert contains enough context to identify the discrepancy
    const meta = alert.metadata as Record<string, unknown>;
    const hasContext =
      meta.billing_record_id === insertedRecord!.id ||
      meta.client_id === testClientId ||
      meta.amount === 100;
    expect(hasContext).toBe(true);

    // Track for cleanup
    for (const a of alerts) createdAlertIds.push(a.id);

    // Clean up the stripe_processed_events dedup record
    await supabase
      .from('stripe_processed_events')
      .delete()
      .eq('event_id', `sync_${insertedRecord!.id}`);
  }, 60000);

  // ── TEST-08: Stale charging records are detected and alerted ──
  it('TEST-08: stale charging records are detected and alerted', async () => {
    const supabase = getTestSupabase();

    // 1. Insert a billing_record with status='charging' and updated_at = 5 hours ago
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    const { data: staleRecord, error: insertError } = await supabase
      .from('billing_records')
      .insert({
        client_id: testClientId,
        billing_type: 'ad_spend',
        amount: 200,
        status: 'charging',
        due_date: new Date().toISOString().split('T')[0],
        source: 'auto_recharge',
        stripe_account: 'ad_spend',
        recurrence_type: 'one_time',
        is_recurring_parent: false,
        notes: 'INTEGRATION_TEST stale-charging',
      })
      .select('id')
      .single();

    expect(insertError).toBeNull();
    expect(staleRecord).toBeTruthy();
    createdBillingRecordIds.push(staleRecord!.id);

    // Manually set updated_at to 5 hours ago (can't set via insert due to trigger/default)
    const { error: updateError } = await supabase
      .from('billing_records')
      .update({ updated_at: fiveHoursAgo })
      .eq('id', staleRecord!.id);

    expect(updateError).toBeNull();

    // 2. Call stale_charging_cleanup() RPC directly
    const { data: cleanupResult, error: cleanupError } = await supabase.rpc('stale_charging_cleanup');
    // The RPC may or may not return data depending on implementation
    // It's also called at the start of auto-recharge-run as a fallback

    if (cleanupError) {
      console.warn('stale_charging_cleanup RPC error, trying via auto-recharge-run:', cleanupError);
      // Fallback: invoke auto-recharge-run which calls stale_charging_cleanup at start
      await invokeEdgeFunction('auto-recharge-run', {});
    }

    // 3. Verify the billing record status changed to 'overdue'
    const record = await waitFor(
      async () => {
        const { data } = await supabase
          .from('billing_records')
          .select('id, status')
          .eq('id', staleRecord!.id)
          .single();
        return data;
      },
      (data) => data?.status === 'overdue',
      {
        timeout: 30000,
        interval: 2000,
        description: 'stale charging record marked as overdue',
      }
    );

    expect(record?.status).toBe('overdue');

    // 4. Verify system alert for stale charging cleanup
    const alerts = await waitFor(
      async () => {
        const { data } = await supabase
          .from('system_alerts')
          .select('id, severity, title, message, alert_type, metadata, created_at')
          .eq('alert_type', 'stale_charging')
          .gte('created_at', testStartTime)
          .order('created_at', { ascending: false });
        return data ?? [];
      },
      (data) => data.length > 0,
      {
        timeout: 30000,
        interval: 2000,
        description: 'system alert for stale charging cleanup',
      }
    );

    expect(alerts.length).toBeGreaterThan(0);
    const alert = alerts[0];
    expect(['warning', 'critical']).toContain(alert.severity);
    expect(alert.title).toContain('Stale');

    // Track for cleanup
    for (const a of alerts) createdAlertIds.push(a.id);
  }, 60000);
});
