import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type StripeAccount = 'ad_spend' | 'management';

function getStripeKey(account: StripeAccount): string {
  const key = account === 'management'
    ? Deno.env.get('STRIPE_MANAGEMENT_SECRET_KEY')
    : Deno.env.get('STRIPE_AD_SPEND_SECRET_KEY');
  if (!key) throw new Error(`Missing Stripe secret key for ${account}`);
  return key;
}

async function stripePost(path: string, key: string, body: Record<string, string>, extraHeaders?: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...extraHeaders,
    },
    body: new URLSearchParams(body).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Stripe error: ${res.status}`);
  return data;
}

async function stripeGet(path: string, key: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${key}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Stripe error: ${res.status}`);
  return data;
}

Deno.serve(async (req) => {
  // NOTE: Campaign restoration after payment is handled by stripe-billing-webhook
  // via restoreFromSnapshot() from _shared/safe-mode.ts. This function only
  // creates the billing record and initiates the Stripe charge.
  // RECH-05: All inline restoration logic removed to prevent .maybeSingle() bug.

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { billing_record_id } = await req.json() as { billing_record_id: string };

    if (!billing_record_id) {
      return new Response(JSON.stringify({ error: 'billing_record_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the billing record
    const { data: record, error: recordError } = await supabase
      .from('billing_records')
      .select('*')
      .eq('id', billing_record_id)
      .single();

    if (recordError || !record) {
      console.error('Billing record lookup error:', recordError);
      return new Response(JSON.stringify({ error: 'Billing record not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch client info
    const { data: clientInfo, error: clientError } = await supabase
      .from('clients')
      .select('name, email')
      .eq('id', record.client_id)
      .single();

    if (clientError || !clientInfo) {
      console.error('Client lookup error:', clientError);
      return new Response(JSON.stringify({ error: 'Client not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Skip if already has a Stripe invoice
    if (record.stripe_invoice_id) {
      return new Response(JSON.stringify({
        success: true,
        already_exists: true,
        stripe_invoice_id: record.stripe_invoice_id,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine Stripe account from billing type
    const stripeAccount: StripeAccount = record.billing_type === 'management' ? 'management' : 'ad_spend';
    const stripeKey = getStripeKey(stripeAccount);

    console.log(`create-stripe-invoice: starting for record=${billing_record_id}, type=${record.billing_type}, account=${stripeAccount}, amount=$${record.amount}`);

    // Check if client has a default payment method for this account
    const { data: defaultPm } = await supabase
      .from('client_payment_methods')
      .select('stripe_payment_method_id, stripe_customer_id')
      .eq('client_id', record.client_id)
      .eq('stripe_account', stripeAccount)
      .eq('is_default', true)
      .maybeSingle();

    console.log(`create-stripe-invoice: defaultPm=${defaultPm?.stripe_payment_method_id ?? 'none (will send invoice link)'}`);

    // Get or create Stripe customer — prefer customer from payment method (authoritative)
    let stripeCustomerId: string;

    if (defaultPm?.stripe_customer_id) {
      stripeCustomerId = defaultPm.stripe_customer_id;
    } else {
      const { data: existingCustomers } = await supabase
        .from('client_stripe_customers')
        .select('stripe_customer_id')
        .eq('client_id', record.client_id)
        .eq('stripe_account', stripeAccount)
        .order('created_at', { ascending: true })
        .limit(1);

      const existingCustomer = existingCustomers?.[0] ?? null;

      if (existingCustomer) {
        stripeCustomerId = existingCustomer.stripe_customer_id;
      } else {
        const customer = await stripePost('/customers', stripeKey, {
          email: clientInfo.email,
          name: clientInfo.name,
          'metadata[alpha_client_id]': record.client_id,
          'metadata[stripe_account]': stripeAccount,
        });
        stripeCustomerId = customer.id;

        await supabase
          .from('client_stripe_customers')
          .insert({
            client_id: record.client_id,
            stripe_account: stripeAccount,
            stripe_customer_id: stripeCustomerId,
          });
      }
    }

    console.log(`create-stripe-invoice: customer=${stripeCustomerId}`);

    // Calculate amount in cents
    const amountCents = Math.round(record.amount * 100);
    const description = record.billing_type === 'management'
      ? `Alpha Agent Management Fee${record.billing_period_start ? ` - ${record.billing_period_start}` : ''}`
      : `Ad Spend Deposit${record.billing_period_start ? ` - ${record.billing_period_start}` : ''}`;

    let invoice: any;
    let autoCharged = false;

    if (defaultPm) {
      if (stripeAccount === 'ad_spend') {
        // ── AD SPEND: Direct PaymentIntent with charging status flow ──
        console.log(`create-stripe-invoice: using PaymentIntent for ad_spend charge`);

        // Update billing record status to 'charging' before creating PI
        await supabase
          .from('billing_records')
          .update({
            status: 'charging',
            source: 'stripe',
          })
          .eq('id', billing_record_id);

        const paymentIntent = await stripePost('/payment_intents', stripeKey, {
          customer: stripeCustomerId,
          payment_method: defaultPm.stripe_payment_method_id,
          amount: amountCents.toString(),
          currency: 'usd',
          confirm: 'true',
          off_session: 'true',
          description,
          'metadata[billing_record_id]': billing_record_id,
          'metadata[billing_type]': record.billing_type,
          'metadata[client_id]': record.client_id,
        }, {
          'Idempotency-Key': `invoice-${billing_record_id}`,
        });

        console.log(`PaymentIntent created: ${paymentIntent.id}, status: ${paymentIntent.status}`);

        if (paymentIntent.status === 'succeeded') {
          // Update with PI ID only -- webhook handles paid + deposit via process_successful_charge()
          autoCharged = true;
          await supabase
            .from('billing_records')
            .update({
              stripe_payment_intent_id: paymentIntent.id,
              stripe_account: stripeAccount,
            })
            .eq('id', billing_record_id);

          console.log(`Ad spend PaymentIntent succeeded: ${paymentIntent.id}, awaiting webhook for paid+deposit`);

          return new Response(JSON.stringify({
            success: true,
            auto_charged: true,
            stripe_account: stripeAccount,
            amount_charged: record.amount,
            payment_intent_id: paymentIntent.id,
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else if (paymentIntent.status === 'requires_action') {
          const paymentLink = paymentIntent.next_action?.redirect_to_url?.url || null;
          await supabase
            .from('billing_records')
            .update({
              stripe_payment_intent_id: paymentIntent.id,
              stripe_account: stripeAccount,
              payment_link: paymentLink,
            })
            .eq('id', billing_record_id);

          return new Response(JSON.stringify({
            success: true,
            auto_charged: false,
            payment_link: paymentLink,
            stripe_account: stripeAccount,
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          // PI failed -- mark as overdue
          const errorMessage = paymentIntent.last_payment_error?.message || `Status: ${paymentIntent.status}`;
          await supabase
            .from('billing_records')
            .update({
              stripe_payment_intent_id: paymentIntent.id,
              stripe_account: stripeAccount,
              status: 'overdue',
              last_charge_error: errorMessage,
            })
            .eq('id', billing_record_id);

          throw new Error(`PaymentIntent failed: ${errorMessage}`);
        }
      } else {
        // ── MANAGEMENT: Invoice flow (auto-charge) ──
        invoice = await stripePost('/invoices', stripeKey, {
          customer: stripeCustomerId,
          auto_advance: 'false',
          collection_method: 'charge_automatically',
          default_payment_method: defaultPm.stripe_payment_method_id,
          'metadata[billing_record_id]': billing_record_id,
          'metadata[billing_type]': record.billing_type,
        });

        console.log(`Draft invoice created: ${invoice.id}`);

        await stripePost('/invoiceitems', stripeKey, {
          customer: stripeCustomerId,
          invoice: invoice.id,
          amount: amountCents.toString(),
          currency: 'usd',
          description,
        });

        console.log(`Invoice item attached to ${invoice.id}: $${record.amount}`);

        invoice = await stripePost(`/invoices/${invoice.id}/finalize`, stripeKey, {});

        console.log(`Invoice finalized: ${invoice.id}, status: ${invoice.status}`);

        if (invoice.status === 'paid') {
          autoCharged = true;
          console.log(`Invoice ${invoice.id} was auto-paid during finalization`);
        } else {
          try {
            invoice = await stripePost(`/invoices/${invoice.id}/pay`, stripeKey, {});
            autoCharged = true;
            console.log(`Invoice ${invoice.id} manually paid`);
          } catch (payError) {
            console.error('Auto-charge failed:', (payError as Error).message);
          }
        }
      }
    } else {
      // ── SEND INVOICE PATH (no card on file) ──
      // 1. Create invoice as DRAFT
      invoice = await stripePost('/invoices', stripeKey, {
        customer: stripeCustomerId,
        auto_advance: 'false',
        collection_method: 'send_invoice',
        days_until_due: '7',
        'metadata[billing_record_id]': billing_record_id,
        'metadata[billing_type]': record.billing_type,
      });

      // 2. Attach invoice item
      await stripePost('/invoiceitems', stripeKey, {
        customer: stripeCustomerId,
        invoice: invoice.id,
        amount: amountCents.toString(),
        currency: 'usd',
        description,
      });

      // 3. Finalize to generate hosted_invoice_url
      invoice = await stripePost(`/invoices/${invoice.id}/finalize`, stripeKey, {});
    }

    // Update billing record with Stripe details (management fee / send invoice paths)
    const updateData: Record<string, any> = {
      stripe_invoice_id: invoice.id,
      stripe_account: stripeAccount,
    };

    if (invoice.payment_intent) {
      updateData.stripe_payment_intent_id = invoice.payment_intent;
    }

    if (autoCharged) {
      updateData.status = 'paid';
      updateData.paid_at = new Date().toISOString();
    }

    if (invoice.hosted_invoice_url && !defaultPm) {
      updateData.payment_link = invoice.hosted_invoice_url;
    }

    await supabase
      .from('billing_records')
      .update(updateData)
      .eq('id', billing_record_id);

    console.log(`Stripe invoice created for billing record ${billing_record_id}:`, {
      invoice_id: invoice.id,
      auto_charged: autoCharged,
      stripe_account: stripeAccount,
      amount_cents: amountCents,
    });

    return new Response(JSON.stringify({
      success: true,
      invoice_id: invoice.id,
      payment_link: invoice.hosted_invoice_url || null,
      auto_charged: autoCharged,
      stripe_account: stripeAccount,
      amount_charged: autoCharged ? record.amount : 0,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('create-stripe-invoice error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
