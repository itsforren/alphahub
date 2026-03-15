import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// HMAC-SHA256 Stripe signature verification (copied from stripe-billing-webhook)
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const parts = signature.split(',');
  const timestampPart = parts.find(p => p.startsWith('t='));
  const sigPart = parts.find(p => p.startsWith('v1='));
  if (!timestampPart || !sigPart) return false;

  const timestamp = timestampPart.split('=')[1];
  const expectedSig = sigPart.split('=')[1];
  const payload = `${timestamp}.${body}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );

  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const computedSig = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  return computedSig === expectedSig;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Step 1: Read body as text for signature verification (NOT req.json())
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') || '';

    // Step 2: Verify Stripe signature against both webhook secrets
    const managementSecret = Deno.env.get('STRIPE_MANAGEMENT_WEBHOOK_SECRET') || '';
    const adSpendSecret = Deno.env.get('STRIPE_AD_SPEND_WEBHOOK_SECRET') || '';

    let verifiedAccount: 'management' | 'ad_spend' | null = null;
    if (managementSecret && await verifySignature(body, signature, managementSecret)) {
      verifiedAccount = 'management';
    } else if (adSpendSecret && await verifySignature(body, signature, adSpendSecret)) {
      verifiedAccount = 'ad_spend';
    }

    if (!verifiedAccount) {
      console.error('Dispute webhook: invalid Stripe signature');
      return jsonResponse({ error: 'Invalid signature' }, 401);
    }

    // Step 3: Parse body AFTER signature verification
    const payload = JSON.parse(body);

    console.log(`Dispute webhook received: ${payload.type} (verified: ${verifiedAccount})`);

    // Handle Stripe dispute events
    const disputeEvents = [
      'charge.dispute.created',
      'charge.dispute.updated',
      'charge.dispute.closed',
      'charge.dispute.funds_reinstated',
      'charge.dispute.funds_withdrawn'
    ];

    if (!disputeEvents.includes(payload.type)) {
      console.log('Ignoring non-dispute event:', payload.type);
      return jsonResponse({ received: true });
    }

    // Step 4: Webhook event dedup via stripe_processed_events
    const { error: dedupError } = await supabase
      .from('stripe_processed_events')
      .insert({
        event_id: payload.id,
        event_type: payload.type,
        stripe_account: verifiedAccount,
        metadata: { dispute_id: payload.data?.object?.id },
      });

    if (dedupError) {
      console.log(`Event ${payload.id} already processed, skipping`);
      return jsonResponse({ received: true, duplicate: true });
    }

    const dispute = payload.data?.object;
    if (!dispute) {
      console.error('No dispute object in payload');
      return jsonResponse({ error: 'No dispute data' }, 400);
    }

    // Extract dispute details
    const disputeData = {
      stripe_dispute_id: dispute.id,
      stripe_charge_id: dispute.charge,
      stripe_payment_intent_id: dispute.payment_intent,
      amount: dispute.amount, // in cents (disputes table convention)
      currency: dispute.currency || 'usd',
      reason: dispute.reason,
      status: mapStripeStatus(dispute.status),
      evidence_due_by: dispute.evidence_details?.due_by
        ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
        : null,
    };

    console.log('Processing dispute:', disputeData);

    // Try to find the client by looking up the charge/payment intent
    let clientId: string | null = null;
    let billingRecord: { id: string; client_id: string; billing_type: string; amount: number } | null = null;

    // First, try to find via billing_records
    if (dispute.payment_intent) {
      const { data: record } = await supabase
        .from('billing_records')
        .select('id, client_id, billing_type, amount')
        .eq('stripe_payment_intent_id', dispute.payment_intent)
        .limit(1)
        .maybeSingle();

      if (record) {
        clientId = record.client_id;
        billingRecord = record;
      }
    }

    // If not found, try to find via customer email
    if (!clientId && dispute.evidence?.customer_email_address) {
      const email = dispute.evidence.customer_email_address.toLowerCase();
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .ilike('email', email)
        .limit(1)
        .maybeSingle();

      if (client) {
        clientId = client.id;
      }
    }

    // Check if dispute already exists
    const { data: existingDispute } = await supabase
      .from('disputes')
      .select('id')
      .eq('stripe_dispute_id', dispute.id)
      .maybeSingle();

    if (existingDispute) {
      // Update existing dispute
      const updateData: Record<string, unknown> = {
        status: disputeData.status,
        updated_at: new Date().toISOString(),
      };

      // If dispute was resolved, set resolved_at
      if (dispute.status === 'won' || dispute.status === 'lost') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('disputes')
        .update(updateData)
        .eq('id', existingDispute.id);

      if (updateError) {
        console.error('Error updating dispute:', updateError);
        return jsonResponse({ error: 'Failed to update dispute' }, 500);
      }

      console.log('Dispute updated:', existingDispute.id);
      return jsonResponse({
        success: true,
        dispute_id: existingDispute.id,
        action: 'updated'
      });
    }

    // Create new dispute record
    const { data: newDispute, error: insertError } = await supabase
      .from('disputes')
      .insert({
        ...disputeData,
        client_id: clientId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting dispute:', insertError);
      return jsonResponse({ error: 'Failed to record dispute' }, 500);
    }

    console.log('Dispute created:', newDispute.id);

    // Create system alert for new dispute
    await supabase
      .from('system_alerts')
      .insert({
        alert_type: 'dispute',
        severity: 'critical',
        title: `New Dispute: $${(dispute.amount / 100).toFixed(2)}`,
        message: `A dispute has been filed for ${dispute.reason || 'unknown reason'}. Evidence due by ${disputeData.evidence_due_by || 'N/A'}.`,
        client_id: clientId,
        metadata: { dispute_id: newDispute.id, stripe_dispute_id: dispute.id },
      });

    // Slack notification for new dispute
    const slackUrl = Deno.env.get('SLACK_BILLING_WEBHOOK_URL');
    if (slackUrl) {
      try {
        await fetch(slackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `:rotating_light: DISPUTE: $${(dispute.amount / 100).toFixed(2)} - ${dispute.reason}. Client: ${clientId || 'unknown'}. Evidence due: ${dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toISOString().split('T')[0] : 'N/A'}`,
          }),
        });
      } catch (slackErr) {
        console.error('Slack notification failed:', slackErr);
      }
    }

    // Wallet deduction for ad_spend disputes (charge.dispute.created only)
    if (payload.type === 'charge.dispute.created' && billingRecord?.billing_type === 'ad_spend' && clientId) {
      console.log(`Ad spend dispute detected, deducting $${(dispute.amount / 100).toFixed(2)} from wallet`);

      // Get the client's wallet
      const { data: wallet } = await supabase
        .from('client_wallets')
        .select('id')
        .eq('client_id', clientId)
        .maybeSingle();

      if (wallet) {
        // Create negative wallet adjustment (cents -> dollars: divide by 100)
        const deductionAmountDollars = dispute.amount / 100;
        const { error: txError } = await supabase
          .from('wallet_transactions')
          .insert({
            wallet_id: wallet.id,
            client_id: clientId,
            transaction_type: 'adjustment',
            amount: -(deductionAmountDollars),
            balance_after: 0, // Not used; balance computed dynamically
            description: `Chargeback - dispute ${dispute.id.substring(0, 20)}`,
            billing_record_id: billingRecord.id,
          });

        if (txError) {
          console.error('Failed to create wallet deduction for dispute:', txError);
        } else {
          console.log(`Wallet deduction of $${deductionAmountDollars.toFixed(2)} created`);

          // Check if balance went negative via compute_wallet_balance() RPC
          const { data: balanceResult } = await supabase.rpc('compute_wallet_balance', {
            p_client_id: clientId,
          });

          if (balanceResult?.remaining_balance < 0) {
            console.log(`Wallet balance negative ($${balanceResult.remaining_balance.toFixed(2)}), triggering safe mode`);

            // Trigger safe mode via check-low-balance with shared secret header
            try {
              await fetch(`${supabaseUrl}/functions/v1/check-low-balance`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'x-billing-secret': Deno.env.get('BILLING_EDGE_SECRET') || '',
                },
                body: JSON.stringify({ clientId }),
              });
            } catch (safeModeErr) {
              console.error('Failed to trigger safe mode after dispute:', safeModeErr);
            }
          }
        }
      } else {
        console.log('No wallet found for client, skipping wallet deduction');
      }
    }

    return jsonResponse({
      success: true,
      dispute_id: newDispute.id,
      action: 'created'
    });

  } catch (error) {
    console.error('Dispute webhook error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'warning_needs_response':
    case 'needs_response':
      return 'needs_response';
    case 'warning_under_review':
    case 'under_review':
      return 'pending';
    case 'won':
      return 'won';
    case 'lost':
      return 'lost';
    default:
      return 'pending';
  }
}
