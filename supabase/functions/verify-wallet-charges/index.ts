import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check if this is an "approve deposit" action
    let body: any = {};
    try { body = await req.json(); } catch { /* no body */ }

    if (body.action === 'approve_deposit') {
      return await handleApproveDeposit(supabase, body);
    }

    console.log('verify-wallet-charges starting...');

    // Only look at charges from the last 48 hours — FORWARD-LOOKING ONLY
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

// Handle approve/dismiss deposit actions from the dashboard
async function handleApproveDeposit(supabase: any, body: any) {
  const { billingRecordId, clientId, amount } = body;

  if (!billingRecordId || !clientId || !amount) {
    return jsonResponse({ error: 'Missing billingRecordId, clientId, or amount' }, 400);
  }

  // Check if deposit already exists (idempotent)
  const { data: existing } = await supabase
    .from('wallet_transactions')
    .select('id')
    .eq('billing_record_id', billingRecordId)
    .maybeSingle();

  if (existing) {
    return jsonResponse({ success: true, message: 'Deposit already exists', depositId: existing.id });
  }

  // Get or create wallet
  let { data: wallet } = await supabase
    .from('client_wallets')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle();

  if (!wallet) {
    const { data: newWallet, error } = await supabase
      .from('client_wallets')
      .insert({ client_id: clientId, tracking_start_date: new Date().toISOString().split('T')[0] })
      .select('id')
      .single();
    if (error) return jsonResponse({ error: 'Failed to create wallet' }, 500);
    wallet = newWallet;
  }

  // Create the deposit
  const { data: deposit, error: depositError } = await supabase.from('wallet_transactions').insert({
    wallet_id: wallet.id,
    client_id: clientId,
    transaction_type: 'deposit',
    amount,
    balance_after: 0,
    description: `Manual deposit approval — billing record ${billingRecordId.slice(0, 8)}`,
    billing_record_id: billingRecordId,
  }).select('id').single();

  if (depositError) {
    return jsonResponse({ error: 'Failed to create deposit: ' + depositError.message }, 500);
  }

  console.log(`Approved deposit: $${amount} for client ${clientId} (billing record ${billingRecordId})`);
  return jsonResponse({ success: true, depositId: deposit.id });
}
