/**
 * Vitest globalSetup: creates or finds a dedicated integration test client
 * with Stripe test customer, payment method, and billing settings.
 *
 * Writes .test-context.json for test files to read.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CONTEXT_FILE = resolve(__dirname, '../../.test-context.json');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Required environment variable ${name} is not set. ` +
      'Copy .env.test.example to .env.test and fill in values.'
    );
  }
  return value;
}

async function stripeRequest(
  path: string,
  body: Record<string, string>,
  apiKey: string,
  method: string = 'POST'
): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Stripe API error (${response.status}): ${JSON.stringify(data.error || data)}`);
  }
  return data as Record<string, unknown>;
}

export async function setup(): Promise<void> {
  console.log('\n[setup] Starting integration test setup...');

  // 1. Validate all required env vars
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const stripeKey = requireEnv('STRIPE_TEST_SECRET_KEY');
  requireEnv('BILLING_EDGE_SECRET');

  // Guard against live Stripe keys
  if (stripeKey.startsWith('sk_live_') || stripeKey.startsWith('rk_live_')) {
    throw new Error('REFUSING TO RUN TESTS WITH LIVE STRIPE KEY');
  }

  console.log('[setup] Environment variables validated');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const testStartTime = new Date().toISOString();

  // 2. Create or find test client
  console.log('[setup] Looking for Integration Test Client...');
  let clientId: string;

  const { data: existingClients, error: findError } = await supabase
    .from('clients')
    .select('id')
    .eq('company_name', 'Integration Test Client')
    .limit(1);

  if (findError) {
    throw new Error(`Failed to query clients: ${findError.message}`);
  }

  if (existingClients && existingClients.length > 0) {
    clientId = existingClients[0].id;
    console.log(`[setup] Found existing test client: ${clientId}`);
  } else {
    const { data: newClient, error: insertError } = await supabase
      .from('clients')
      .insert({ company_name: 'Integration Test Client', status: 'active' })
      .select('id')
      .single();

    if (insertError || !newClient) {
      throw new Error(`Failed to create test client: ${insertError?.message || 'no data returned'}`);
    }
    clientId = newClient.id;
    console.log(`[setup] Created new test client: ${clientId}`);
  }

  // 3. Create or find Stripe test customer
  console.log('[setup] Setting up Stripe test customer...');
  let stripeCustomerId: string;
  let paymentMethodId: string;

  const { data: wallet, error: walletError } = await supabase
    .from('client_wallets')
    .select('id, stripe_customer_id')
    .eq('client_id', clientId)
    .eq('wallet_type', 'ad_spend')
    .limit(1)
    .maybeSingle();

  if (walletError) {
    throw new Error(`Failed to query client_wallets: ${walletError.message}`);
  }

  if (wallet?.stripe_customer_id) {
    stripeCustomerId = wallet.stripe_customer_id;
    console.log(`[setup] Found existing Stripe customer: ${stripeCustomerId}`);

    // Check for existing payment methods
    const pmList = await stripeRequest(
      `/customers/${stripeCustomerId}/payment_methods?type=card`,
      {},
      stripeKey,
      'GET'
    );
    const methods = (pmList as { data?: Array<{ id: string }> }).data || [];
    if (methods.length > 0) {
      paymentMethodId = methods[0].id;
      console.log(`[setup] Found existing payment method: ${paymentMethodId}`);
    } else {
      paymentMethodId = await attachPaymentMethod(stripeCustomerId, stripeKey);
      console.log(`[setup] Attached new payment method: ${paymentMethodId}`);
    }
  } else {
    // Create Stripe customer
    const customer = await stripeRequest('/customers', {
      name: 'Integration Test Client',
      'metadata[source]': 'integration_test',
    }, stripeKey);
    stripeCustomerId = customer.id as string;
    console.log(`[setup] Created Stripe customer: ${stripeCustomerId}`);

    // Attach payment method
    paymentMethodId = await attachPaymentMethod(stripeCustomerId, stripeKey);
    console.log(`[setup] Attached payment method: ${paymentMethodId}`);

    // Create or update wallet
    if (wallet) {
      const { error: updateError } = await supabase
        .from('client_wallets')
        .update({
          stripe_customer_id: stripeCustomerId,
          billing_mode: 'auto_stripe',
        })
        .eq('id', wallet.id);
      if (updateError) {
        throw new Error(`Failed to update wallet: ${updateError.message}`);
      }
    } else {
      const { error: insertWalletError } = await supabase
        .from('client_wallets')
        .insert({
          client_id: clientId,
          wallet_type: 'ad_spend',
          stripe_customer_id: stripeCustomerId,
          billing_mode: 'auto_stripe',
        });
      if (insertWalletError) {
        throw new Error(`Failed to create wallet: ${insertWalletError.message}`);
      }
    }
    console.log('[setup] Wallet configured with Stripe customer');
  }

  // 4. Ensure recharge_state row exists
  console.log('[setup] Ensuring recharge_state...');
  const { error: rechargeError } = await supabase
    .from('recharge_state')
    .upsert(
      { client_id: clientId, state: 'idle', safe_mode_active: false },
      { onConflict: 'client_id' }
    );
  if (rechargeError) {
    console.warn(`[setup] recharge_state upsert warning: ${rechargeError.message}`);
  }

  // 5. Ensure billing_settings defaults
  console.log('[setup] Ensuring billing settings...');
  const { error: settingsError } = await supabase
    .from('client_wallets')
    .update({
      auto_charge_amount: 500,
      low_balance_threshold: 150,
      safe_mode_threshold: 100,
    })
    .eq('client_id', clientId)
    .eq('wallet_type', 'ad_spend');
  if (settingsError) {
    console.warn(`[setup] billing settings update warning: ${settingsError.message}`);
  }

  // 6. Write test context file
  const context = {
    clientId,
    stripeCustomerId,
    paymentMethodId,
    testStartTime,
  };

  writeFileSync(CONTEXT_FILE, JSON.stringify(context, null, 2));
  console.log(`[setup] Test context written to ${CONTEXT_FILE}`);
  console.log('[setup] Setup complete!\n');
}

async function attachPaymentMethod(customerId: string, apiKey: string): Promise<string> {
  // Create payment method with test card token
  const pm = await stripeRequest('/payment_methods', {
    type: 'card',
    'card[token]': 'tok_visa',
  }, apiKey);

  const pmId = pm.id as string;

  // Attach to customer
  await stripeRequest(`/payment_methods/${pmId}/attach`, {
    customer: customerId,
  }, apiKey);

  // Set as default
  await stripeRequest(`/customers/${customerId}`, {
    'invoice_settings[default_payment_method]': pmId,
  }, apiKey);

  return pmId;
}
