import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-billing-secret',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendSlackAlert(message: string) {
  const webhookUrl = Deno.env.get('SLACK_BILLING_WEBHOOK_URL') || Deno.env.get('SLACK_CHAT_WEBHOOK_URL');
  if (!webhookUrl) {
    console.log('No Slack webhook configured, skipping alert');
    return;
  }
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  } catch (err) {
    console.error('Slack alert failed:', err);
  }
}

function getStripeKey(account: string): string {
  if (account === 'management') {
    return Deno.env.get('STRIPE_MANAGEMENT_SECRET_KEY') || '';
  }
  return Deno.env.get('STRIPE_AD_SPEND_SECRET_KEY') || '';
}

async function verifyStripePaymentIntent(stripeKey: string, piId: string): Promise<{ succeeded: boolean; amount: number }> {
  const res = await fetch(`https://api.stripe.com/v1/payment_intents/${piId}`, {
    headers: { 'Authorization': `Bearer ${stripeKey}` },
  });
  const pi = await res.json();
  return {
    succeeded: pi.status === 'succeeded',
    amount: (pi.amount || 0) / 100,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // WALL-13: Require shared secret or service role JWT for all requests
  const billingSecret = Deno.env.get('BILLING_EDGE_SECRET');
  const providedSecret = req.headers.get('x-billing-secret');

  const authHeader = req.headers.get('Authorization');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;
  const hasValidSecret = billingSecret && providedSecret === billingSecret;

  if (!isServiceRole && !hasValidSecret) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Parse body after auth check
    let body: any = {};
    try { body = await req.json(); } catch { /* no body */ }

    if (body.action === 'approve_deposit') {
      return await handleApproveDeposit(supabase, body);
    }

    console.log('verify-wallet-charges starting...');

    // Only look at charges from the last 48 hours -- FORWARD-LOOKING ONLY
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: recentPaidRecords, error } = await supabase
      .from('billing_records')
      .select('id, client_id, amount, billing_type, paid_at, stripe_payment_intent_id, stripe_account')
      .eq('status', 'paid')
      .eq('billing_type', 'ad_spend')
      .gte('paid_at', cutoff)
      .order('paid_at', { ascending: false });

    if (error) throw error;

    if (!recentPaidRecords?.length) {
      console.log('No recent ad_spend charges to verify');
      return jsonResponse({ success: true, checked: 0, issues: [] });
    }

    // Get client names
    const clientIds = [...new Set(recentPaidRecords.map(r => r.client_id))];
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')
      .in('id', clientIds);
    const clientMap = new Map((clients || []).map(c => [c.id, c.name]));

    const issues: Array<{
      type: 'missing_deposit' | 'amount_mismatch' | 'stripe_not_succeeded' | 'stripe_amount_mismatch';
      billingRecordId: string;
      clientId: string;
      clientName: string;
      chargeAmount: number;
      depositAmount: number | null;
      stripeAmount: number | null;
      paymentIntentId: string | null;
      paidAt: string | null;
    }> = [];
    let checked = 0;

    for (const record of recentPaidRecords) {
      checked++;
      const clientName = clientMap.get(record.client_id) || 'Unknown';

      // 1. Check if wallet deposit exists for this billing record
      const { data: existingDeposit } = await supabase
        .from('wallet_transactions')
        .select('id, amount')
        .eq('billing_record_id', record.id)
        .maybeSingle();

      if (!existingDeposit) {
        issues.push({
          type: 'missing_deposit',
          billingRecordId: record.id,
          clientId: record.client_id,
          clientName,
          chargeAmount: record.amount,
          depositAmount: null,
          stripeAmount: null,
          paymentIntentId: record.stripe_payment_intent_id,
          paidAt: record.paid_at,
        });
        continue;
      }

      // 2. Check amount mismatch
      if (Math.abs(existingDeposit.amount - record.amount) > 0.01) {
        issues.push({
          type: 'amount_mismatch',
          billingRecordId: record.id,
          clientId: record.client_id,
          clientName,
          chargeAmount: record.amount,
          depositAmount: existingDeposit.amount,
          stripeAmount: null,
          paymentIntentId: record.stripe_payment_intent_id,
          paidAt: record.paid_at,
        });
        continue;
      }

      // 3. Verify against Stripe if we have a payment intent ID
      if (record.stripe_payment_intent_id) {
        const stripeKey = getStripeKey(record.stripe_account || 'ad_spend');
        if (stripeKey) {
          try {
            const verification = await verifyStripePaymentIntent(stripeKey, record.stripe_payment_intent_id);
            if (!verification.succeeded) {
              issues.push({
                type: 'stripe_not_succeeded',
                billingRecordId: record.id,
                clientId: record.client_id,
                clientName,
                chargeAmount: record.amount,
                depositAmount: existingDeposit.amount,
                stripeAmount: verification.amount,
                paymentIntentId: record.stripe_payment_intent_id,
                paidAt: record.paid_at,
              });
            } else if (Math.abs(verification.amount - record.amount) > 0.01) {
              issues.push({
                type: 'stripe_amount_mismatch',
                billingRecordId: record.id,
                clientId: record.client_id,
                clientName,
                chargeAmount: record.amount,
                depositAmount: existingDeposit.amount,
                stripeAmount: verification.amount,
                paymentIntentId: record.stripe_payment_intent_id,
                paidAt: record.paid_at,
              });
            }
          } catch (err) {
            console.error(`Stripe verification failed for ${record.stripe_payment_intent_id}:`, err);
          }
        }
      }
    }

    // Send Slack summary if issues found
    if (issues.length > 0) {
      const lines = issues.map(i => {
        if (i.type === 'missing_deposit') return `- ${i.clientName}: $${i.chargeAmount} charged, NO wallet deposit (${i.paymentIntentId || 'N/A'})`;
        if (i.type === 'amount_mismatch') return `- ${i.clientName}: Charged $${i.chargeAmount}, deposited $${i.depositAmount}`;
        if (i.type === 'stripe_not_succeeded') return `- ${i.clientName}: Billing shows paid but Stripe not succeeded (${i.paymentIntentId})`;
        return `- ${i.clientName}: Stripe amount $${i.stripeAmount} vs billing $${i.chargeAmount}`;
      });
      await sendSlackAlert(`:mag: *Wallet Charge Verification*\nChecked ${checked} | Issues: ${issues.length}\n${lines.join('\n')}`);
    }

    console.log(`verify-wallet-charges complete. Checked ${checked}, issues: ${issues.length}`);
    return jsonResponse({ success: true, checked, issues });

  } catch (error) {
    console.error('verify-wallet-charges error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

// Handle approve deposit action from the dashboard
// Routes through process_successful_charge() RPC instead of direct INSERT
async function handleApproveDeposit(supabase: any, body: any) {
  const { billingRecordId } = body;

  if (!billingRecordId) {
    return jsonResponse({ error: 'Missing billingRecordId' }, 400);
  }

  // Validate billing record exists, is paid, has a Stripe PI, and is ad_spend
  const { data: billingRecord } = await supabase
    .from('billing_records')
    .select('id, status, stripe_payment_intent_id, paid_at, amount, billing_type, stripe_account')
    .eq('id', billingRecordId)
    .maybeSingle();

  if (!billingRecord) return jsonResponse({ error: 'Billing record not found' }, 404);
  if (billingRecord.status !== 'paid') return jsonResponse({ error: 'Billing record is not paid' }, 400);
  if (!billingRecord.stripe_payment_intent_id) return jsonResponse({ error: 'No Stripe PaymentIntent linked' }, 400);
  if (billingRecord.billing_type !== 'ad_spend') return jsonResponse({ error: 'Only ad_spend records create deposits' }, 400);

  // Check if deposit already exists (idempotent fast-path)
  const { data: existing } = await supabase
    .from('wallet_transactions')
    .select('id')
    .eq('billing_record_id', billingRecordId)
    .eq('transaction_type', 'deposit')
    .limit(1);

  if (existing && existing.length > 0) {
    return jsonResponse({ success: true, message: 'Deposit already exists (idempotent)', depositId: existing[0].id });
  }

  // Re-verify the PaymentIntent succeeded in Stripe before approving
  const stripeKey = getStripeKey(billingRecord.stripe_account || 'ad_spend');
  if (!stripeKey) return jsonResponse({ error: 'Stripe key not configured for account' }, 500);

  const verification = await verifyStripePaymentIntent(stripeKey, billingRecord.stripe_payment_intent_id);
  if (!verification.succeeded) {
    return jsonResponse({ error: 'Stripe PaymentIntent has not succeeded' }, 400);
  }

  // Route through process_successful_charge RPC (atomic paid + deposit)
  const { error: rpcError } = await supabase.rpc('process_successful_charge', {
    p_billing_record_id: billingRecordId,
    p_stripe_pi_id: billingRecord.stripe_payment_intent_id,
    p_paid_at: billingRecord.paid_at || new Date().toISOString(),
  });

  if (rpcError) {
    // If it's a unique constraint violation, the deposit already exists (idempotent)
    if (rpcError.message?.includes('duplicate') || rpcError.message?.includes('unique')) {
      return jsonResponse({ success: true, message: 'Deposit already exists (idempotent)' });
    }
    return jsonResponse({ error: 'Failed to process deposit: ' + rpcError.message }, 500);
  }

  console.log(`Approved deposit via RPC: billing_record ${billingRecordId}, PI ${billingRecord.stripe_payment_intent_id}`);
  return jsonResponse({ success: true, message: 'Deposit created via process_successful_charge' });
}
