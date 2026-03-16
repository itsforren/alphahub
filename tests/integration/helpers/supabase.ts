import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Returns a Supabase client using service role key for test queries.
 * Fail-fast: throws if required env vars are missing.
 */
export function getTestSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('SUPABASE_URL is not set. Copy .env.test.example to .env.test and fill in values.');
  }
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Copy .env.test.example to .env.test and fill in values.');
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _client;
}

/**
 * Cleans test data for a specific client created after a given timestamp.
 * Deletes: billing_records, wallet_transactions, system_alerts,
 *          stripe_processed_events, and resets recharge_state.
 */
export async function cleanTestData(clientId: string, since: string): Promise<void> {
  const supabase = getTestSupabase();

  // Delete billing_records for this client created after the test start
  const { error: brError } = await supabase
    .from('billing_records')
    .delete()
    .eq('client_id', clientId)
    .gte('created_at', since);
  if (brError) console.warn('[cleanTestData] billing_records cleanup error:', brError.message);

  // Delete wallet_transactions for this client created after the test start
  const { error: wtError } = await supabase
    .from('wallet_transactions')
    .delete()
    .eq('client_id', clientId)
    .gte('created_at', since);
  if (wtError) console.warn('[cleanTestData] wallet_transactions cleanup error:', wtError.message);

  // Delete system_alerts for this client created after the test start
  const { error: saError } = await supabase
    .from('system_alerts')
    .delete()
    .filter('metadata->>client_id', 'eq', clientId)
    .gte('created_at', since);
  if (saError) console.warn('[cleanTestData] system_alerts cleanup error:', saError.message);

  // Delete stripe_processed_events with test_ prefix created after the test start
  const { error: speError } = await supabase
    .from('stripe_processed_events')
    .delete()
    .like('event_id', 'test_%')
    .gte('processed_at', since);
  if (speError) console.warn('[cleanTestData] stripe_processed_events cleanup error:', speError.message);

  // Reset recharge_state to idle
  const { error: rsError } = await supabase
    .from('recharge_state')
    .update({ state: 'idle', safe_mode_active: false })
    .eq('client_id', clientId);
  if (rsError) console.warn('[cleanTestData] recharge_state reset error:', rsError.message);
}
