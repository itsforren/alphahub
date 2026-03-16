/**
 * Vitest globalSetup teardown: cleans test artifacts created during the test run.
 * Does NOT delete the test client itself (reused across runs).
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CONTEXT_FILE = resolve(__dirname, '../../.test-context.json');

export async function teardown(): Promise<void> {
  console.log('\n[teardown] Starting integration test cleanup...');

  if (!existsSync(CONTEXT_FILE)) {
    console.warn('[teardown] No .test-context.json found, skipping cleanup');
    return;
  }

  let context: { clientId: string; testStartTime: string };
  try {
    context = JSON.parse(readFileSync(CONTEXT_FILE, 'utf-8'));
  } catch (err) {
    console.warn('[teardown] Failed to read .test-context.json:', err);
    return;
  }

  const { clientId, testStartTime } = context;
  console.log(`[teardown] Cleaning data for client ${clientId} since ${testStartTime}`);

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[teardown] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY, skipping DB cleanup');
    cleanupContextFile();
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Delete billing_records with INTEGRATION_TEST in notes OR created after test start
  const { error: brError } = await supabase
    .from('billing_records')
    .delete()
    .eq('client_id', clientId)
    .gte('created_at', testStartTime);
  if (brError) {
    console.warn('[teardown] billing_records cleanup error:', brError.message);
  } else {
    console.log('[teardown] billing_records cleaned');
  }

  // Delete wallet_transactions created after test start
  const { error: wtError } = await supabase
    .from('wallet_transactions')
    .delete()
    .eq('client_id', clientId)
    .gte('created_at', testStartTime);
  if (wtError) {
    console.warn('[teardown] wallet_transactions cleanup error:', wtError.message);
  } else {
    console.log('[teardown] wallet_transactions cleaned');
  }

  // Delete system_alerts for this client created after test start
  const { error: saError } = await supabase
    .from('system_alerts')
    .delete()
    .filter('metadata->>client_id', 'eq', clientId)
    .gte('created_at', testStartTime);
  if (saError) {
    console.warn('[teardown] system_alerts cleanup error:', saError.message);
  } else {
    console.log('[teardown] system_alerts cleaned');
  }

  // Delete stripe_processed_events with test_ prefix created after test start
  const { error: speError } = await supabase
    .from('stripe_processed_events')
    .delete()
    .like('event_id', 'test_%')
    .gte('processed_at', testStartTime);
  if (speError) {
    console.warn('[teardown] stripe_processed_events cleanup error:', speError.message);
  } else {
    console.log('[teardown] stripe_processed_events cleaned');
  }

  // Reset recharge_state to idle
  const { error: rsError } = await supabase
    .from('recharge_state')
    .update({ state: 'idle', safe_mode_active: false })
    .eq('client_id', clientId);
  if (rsError) {
    console.warn('[teardown] recharge_state reset error:', rsError.message);
  } else {
    console.log('[teardown] recharge_state reset to idle');
  }

  // Clean up context file
  cleanupContextFile();
  console.log('[teardown] Cleanup complete!\n');
}

function cleanupContextFile(): void {
  try {
    if (existsSync(CONTEXT_FILE)) {
      unlinkSync(CONTEXT_FILE);
      console.log('[teardown] Removed .test-context.json');
    }
  } catch (err) {
    console.warn('[teardown] Failed to remove .test-context.json:', err);
  }
}
