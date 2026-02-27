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

async function stripePost(path: string, key: string, body: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
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

async function payInvoiceNow(invoiceId: string, paymentMethodId: string, key: string): Promise<any> {
  const invoice = await stripeGet(`/invoices/${invoiceId}`, key);
  console.log(`Invoice ${invoiceId} status: ${invoice.status}`);

  if (invoice.status === 'paid') {
    console.log(`Invoice ${invoiceId} already paid`);
    return invoice;
  }

  if (invoice.status === 'draft') {
    console.log(`Finalizing invoice ${invoiceId}...`);
    const finalized = await stripePost(`/invoices/${invoiceId}/finalize`, key, {});
    console.log(`Invoice finalized: ${finalized.status}`);
    if (finalized.status === 'paid') return finalized;
  }

  console.log(`Paying invoice ${invoiceId} with payment method ${paymentMethodId}...`);
  try {
    const paid = await stripePost(`/invoices/${invoiceId}/pay`, key, {
      payment_method: paymentMethodId,
    });
    console.log(`Invoice payment result: ${paid.status}`);
    return paid;
  } catch (payErr) {
    const errMsg = (payErr as Error).message;
    if (errMsg.includes('already paid') || errMsg.includes('Invoice is already paid')) {
      console.log('Invoice was already paid (race condition)');
      return await stripeGet(`/invoices/${invoiceId}`, key);
    }
    throw payErr;
  }
}

function safeIso(ts: number | null | undefined, fallback: Date): string {
  if (!ts || typeof ts !== 'number') return fallback.toISOString();
  try {
    return new Date(ts * 1000).toISOString();
  } catch {
    return fallback.toISOString();
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { client_id, amount, recurrence_type, notes, stripe_account: requestedAccount, billing_type: requestedBillingType } = await req.json() as {
      client_id: string;
      amount: number;
      recurrence_type: 'monthly' | 'bi_weekly';
      notes?: string;
      stripe_account?: StripeAccount;
      billing_type?: string;
    };

    if (!client_id || !amount || !recurrence_type) {
      return new Response(JSON.stringify({ error: 'client_id, amount, and recurrence_type required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeAccount: StripeAccount = requestedAccount || 'management';
    const billingType = requestedBillingType || 'management';
    console.log(`create-stripe-subscription: client=${client_id}, amount=${amount}, recurrence=${recurrence_type}, account=${stripeAccount}, type=${billingType}`);

    const stripeKey = getStripeKey(stripeAccount);

    // Get client info
    const { data: clientInfo, error: clientError } = await supabase
      .from('clients')
      .select('name, email')
      .eq('id', client_id)
      .single();

    if (clientError || !clientInfo) {
      return new Response(JSON.stringify({ error: 'Client not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get default payment method
    const { data: defaultPm } = await supabase
      .from('client_payment_methods')
      .select('stripe_payment_method_id')
      .eq('client_id', client_id)
      .eq('stripe_account', stripeAccount)
      .eq('is_default', true)
      .maybeSingle();

    if (!defaultPm) {
      return new Response(JSON.stringify({ error: 'No payment method on file. Please add a card first.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── STEP 1: Get or create Stripe customer FIRST ───
    // Must happen before idempotency check so we can query Stripe by customer ID
    let stripeCustomerId: string;
    const { data: existingCustomer } = await supabase
      .from('client_stripe_customers')
      .select('stripe_customer_id')
      .eq('client_id', client_id)
      .eq('stripe_account', stripeAccount)
      .maybeSingle();

    if (existingCustomer) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
      console.log(`Using existing Stripe customer: ${stripeCustomerId}`);
    } else {
      const customer = await stripePost('/customers', stripeKey, {
        email: clientInfo.email,
        name: clientInfo.name,
        'metadata[alpha_client_id]': client_id,
        'metadata[stripe_account]': stripeAccount,
      });
      stripeCustomerId = customer.id;
      console.log(`Created new Stripe customer: ${stripeCustomerId}`);

      await supabase
        .from('client_stripe_customers')
        .insert({
          client_id,
          stripe_account: stripeAccount,
          stripe_customer_id: stripeCustomerId,
        });
    }

    // ─── STEP 2: IDEMPOTENCY — Check local DB ───
    const { data: existingSub } = await supabase
      .from('client_stripe_subscriptions')
      .select('id, stripe_subscription_id, status')
      .eq('client_id', client_id)
      .eq('stripe_account', stripeAccount)
      .eq('billing_type', billingType)
      .not('status', 'eq', 'canceled')
      .maybeSingle();

    if (existingSub) {
      if (existingSub.status === 'active') {
        console.log(`Active subscription already exists in DB: ${existingSub.stripe_subscription_id}`);

        // ── CRITICAL: Ensure a billing record exists for this subscription ──
        const { data: existingBillingRecord } = await supabase
          .from('billing_records')
          .select('id')
          .eq('stripe_subscription_id', existingSub.stripe_subscription_id)
          .maybeSingle();

        if (!existingBillingRecord) {
          console.log(`No billing record found for active sub ${existingSub.stripe_subscription_id} — creating one now`);
          // Fetch the Stripe subscription to get accurate period dates
          try {
            const stripeSub = await stripeGet(`/subscriptions/${existingSub.stripe_subscription_id}`, stripeKey);
            const now = new Date();
            const fallbackDays = recurrence_type === 'bi_weekly' ? 14 : 30;
            const periodStartIso = safeIso(stripeSub.current_period_start, now);
            const periodEndIso = safeIso(stripeSub.current_period_end, new Date(Date.now() + fallbackDays * 24 * 60 * 60 * 1000));
            const periodStart = periodStartIso.split('T')[0];
            const periodEnd = periodEndIso.split('T')[0];

            await supabase.from('billing_records').insert({
              client_id,
              billing_type: billingType,
              amount,
              status: 'paid',
              billing_period_start: periodStart,
              billing_period_end: periodEnd,
              due_date: periodStart,
              paid_at: new Date().toISOString(),
              recurrence_type,
              is_recurring_parent: true,
              notes: notes || `Management fee — recovered from active subscription`,
              stripe_subscription_id: existingSub.stripe_subscription_id,
              stripe_account: stripeAccount,
            });
            console.log('Billing record created for recovered active subscription');
          } catch (fetchErr) {
            console.error('Failed to fetch Stripe sub for billing record creation:', (fetchErr as Error).message);
            // Still return success — the subscription IS active
          }
        } else {
          console.log(`Billing record already exists for sub ${existingSub.stripe_subscription_id}`);
        }

        return new Response(JSON.stringify({
          success: true,
          already_exists: true,
          status: 'active',
          subscription_id: existingSub.stripe_subscription_id,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (existingSub.status === 'incomplete') {
        console.log(`Found incomplete subscription in DB ${existingSub.stripe_subscription_id}, attempting recovery...`);
        try {
          const stripeSub = await stripeGet(`/subscriptions/${existingSub.stripe_subscription_id}`, stripeKey);
          const latestInvoiceId = typeof stripeSub.latest_invoice === 'string'
            ? stripeSub.latest_invoice
            : stripeSub.latest_invoice?.id;

          if (latestInvoiceId) {
            await payInvoiceNow(latestInvoiceId, defaultPm.stripe_payment_method_id, stripeKey);
          }

          const updatedSub = await stripeGet(`/subscriptions/${existingSub.stripe_subscription_id}`, stripeKey);
          console.log(`Recovered subscription status: ${updatedSub.status}`);

          await supabase
            .from('client_stripe_subscriptions')
            .update({ status: updatedSub.status })
            .eq('id', existingSub.id);

          return new Response(JSON.stringify({
            success: true,
            recovered: true,
            status: updatedSub.status,
            subscription_id: updatedSub.id,
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (recoveryErr) {
          console.error('Subscription recovery failed:', (recoveryErr as Error).message);
        }
      }
    }

    // ─── STEP 3: IDEMPOTENCY — Check Stripe directly ───
    // Catches the case where DB write failed after Stripe charge succeeded on a previous attempt.
    // Without this, retries create duplicate subscriptions even though Stripe already charged.
    console.log(`Checking Stripe for existing active subscriptions on customer ${stripeCustomerId}...`);
    const stripeSubList = await stripeGet(
      `/subscriptions?customer=${stripeCustomerId}&status=active&limit=10`,
      stripeKey
    );

    if (stripeSubList.data?.length > 0) {
      // Find the subscription matching our billing type (check metadata)
      const matchingSub = stripeSubList.data.find((s: any) =>
        s.metadata?.billing_type === billingType || s.metadata?.alpha_client_id === client_id
      ) || stripeSubList.data[0]; // fallback to first if no metadata match

      console.log(`Found ${stripeSubList.data.length} active subscription(s) in Stripe. Using: ${matchingSub.id}`);

      // Cancel any extra duplicate subscriptions
      for (const sub of stripeSubList.data) {
        if (sub.id !== matchingSub.id) {
          console.log(`Canceling duplicate subscription ${sub.id}...`);
          try {
            await stripePost(`/subscriptions/${sub.id}/cancel`, stripeKey, {});
          } catch (cancelErr) {
            console.error(`Failed to cancel duplicate ${sub.id}:`, (cancelErr as Error).message);
          }
        }
      }

      // Sync to local DB
      const fallbackDaysRecov = recurrence_type === 'bi_weekly' ? 14 : 30;
      const periodStartIso = safeIso(matchingSub.current_period_start, new Date());
      const periodEndIso = safeIso(matchingSub.current_period_end, new Date(Date.now() + fallbackDaysRecov * 24 * 60 * 60 * 1000));

      await supabase
        .from('client_stripe_subscriptions')
        .upsert({
          client_id,
          stripe_account: stripeAccount,
          stripe_subscription_id: matchingSub.id,
          stripe_price_id: matchingSub.items?.data?.[0]?.price?.id || null,
          stripe_customer_id: stripeCustomerId,
          status: matchingSub.status,
          billing_type: billingType,
          amount,
          recurrence_type,
          current_period_start: periodStartIso,
          current_period_end: periodEndIso,
        }, { onConflict: 'stripe_subscription_id' });

      // Ensure a billing record exists for this subscription
      const { data: existingRecord } = await supabase
        .from('billing_records')
        .select('id')
        .eq('stripe_subscription_id', matchingSub.id)
        .maybeSingle();

      if (!existingRecord) {
        const periodStart = periodStartIso.split('T')[0];
        const periodEnd = periodEndIso.split('T')[0];
        await supabase.from('billing_records').insert({
          client_id,
          billing_type: billingType,
          amount,
          status: 'paid',
          billing_period_start: periodStart,
          billing_period_end: periodEnd,
          due_date: periodStart,
          paid_at: new Date().toISOString(),
          recurrence_type,
          is_recurring_parent: true,
          notes: notes || `Management fee - recovered from Stripe`,
          stripe_subscription_id: matchingSub.id,
          stripe_account: stripeAccount,
        });
        console.log('Created missing billing record for recovered Stripe subscription');
      }

      return new Response(JSON.stringify({
        success: true,
        already_exists: true,
        status: 'active',
        subscription_id: matchingSub.id,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── STEP 4: Create new Stripe Price ───
    const amountCents = Math.round(amount * 100);
    const priceParams: Record<string, string> = {
      unit_amount: amountCents.toString(),
      currency: 'usd',
      'product_data[name]': billingType === 'ad_spend' ? `Alpha Agent Ad Spend - Monthly` : `Alpha Agent Management Fee`,
      'product_data[metadata][alpha_client_id]': client_id,
    };

    if (recurrence_type === 'bi_weekly') {
      priceParams['recurring[interval]'] = 'week';
      priceParams['recurring[interval_count]'] = '2';
    } else {
      priceParams['recurring[interval]'] = 'month';
      priceParams['recurring[interval_count]'] = '1';
    }

    const price = await stripePost('/prices', stripeKey, priceParams);
    console.log(`Dynamic price created: ${price.id} ($${amount} ${recurrence_type})`);

    // ─── STEP 5: Create Stripe Subscription ───
    const subscription = await stripePost('/subscriptions', stripeKey, {
      customer: stripeCustomerId,
      'items[0][price]': price.id,
      default_payment_method: defaultPm.stripe_payment_method_id,
      'payment_settings[payment_method_types][0]': 'card',
      'payment_settings[save_default_payment_method]': 'on_subscription',
      payment_behavior: 'allow_incomplete',
      'metadata[alpha_client_id]': client_id,
      'metadata[billing_type]': billingType,
      'metadata[recurrence_type]': recurrence_type,
    });

    console.log(`Subscription created: ${subscription.id}, initial status: ${subscription.status}`);

    // ─── STEP 6: Force-pay the first invoice ───
    let confirmedStatus = subscription.status;
    let paidInvoiceId: string | null = null;

    if (subscription.latest_invoice) {
      const latestInvoiceId = typeof subscription.latest_invoice === 'string'
        ? subscription.latest_invoice
        : subscription.latest_invoice?.id;

      if (latestInvoiceId) {
        try {
          const paidInvoice = await payInvoiceNow(latestInvoiceId, defaultPm.stripe_payment_method_id, stripeKey);
          paidInvoiceId = paidInvoice.id;
          console.log(`First invoice payment result: ${paidInvoice.status}`);

          const updatedSub = await stripeGet(`/subscriptions/${subscription.id}`, stripeKey);
          confirmedStatus = updatedSub.status;
          console.log(`Subscription confirmed status after payment: ${confirmedStatus}`);
        } catch (payErr) {
          const errMsg = (payErr as Error).message;
          console.error(`First invoice payment failed: ${errMsg}`);
          return new Response(JSON.stringify({
            success: false,
            error: `Payment failed: ${errMsg}`,
            status: 'incomplete',
            subscription_id: subscription.id,
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // ─── STEP 7: Re-fetch for accurate period data ───
    const finalSub = await stripeGet(`/subscriptions/${subscription.id}`, stripeKey);
    const now = new Date();
    // Use correct interval for fallback (14 days for bi_weekly, 30 days for monthly)
    const fallbackDays = recurrence_type === 'bi_weekly' ? 14 : 30;
    const fallbackEnd = new Date(Date.now() + fallbackDays * 24 * 60 * 60 * 1000);
    const periodStartIso = safeIso(finalSub.current_period_start || subscription.current_period_start, now);
    const periodEndIso = safeIso(finalSub.current_period_end || subscription.current_period_end, fallbackEnd);

    // ─── STEP 8: Store subscription locally ───
    await supabase
      .from('client_stripe_subscriptions')
      .insert({
        client_id,
        stripe_account: stripeAccount,
        stripe_subscription_id: subscription.id,
        stripe_price_id: price.id,
        stripe_customer_id: stripeCustomerId,
        status: confirmedStatus,
        billing_type: billingType,
        amount,
        recurrence_type,
        current_period_start: periodStartIso,
        current_period_end: periodEndIso,
      });

    // ─── STEP 9: Create initial billing record (paid) ───
    const periodStart = periodStartIso.split('T')[0];
    const periodEnd = periodEndIso.split('T')[0];
    const isActive = confirmedStatus === 'active';

    const { data: billingRecord } = await supabase
      .from('billing_records')
      .insert({
        client_id,
        billing_type: billingType,
        amount,
        status: isActive ? 'paid' : 'pending',
        billing_period_start: periodStart,
        billing_period_end: periodEnd,
        due_date: periodStart,
        paid_at: isActive ? new Date().toISOString() : null,
        recurrence_type,
        is_recurring_parent: true,
        notes: notes || `${billingType === 'ad_spend' ? 'Ad spend' : 'Management fee'} - $${amount.toLocaleString()}/${recurrence_type === 'bi_weekly' ? 'bi-weekly' : 'mo'}`,
        stripe_subscription_id: subscription.id,
        stripe_invoice_id: paidInvoiceId,
        stripe_account: stripeAccount,
      })
      .select('id')
      .single();

    console.log(`Billing record created: ${billingRecord?.id}, status: ${isActive ? 'paid' : 'pending'}`);

    // ─── STEP 10: Create NEXT period pending billing record so it shows in tracker ───
    if (isActive) {
      const nextPeriodStart = periodEndIso.split('T')[0]; // next period starts when current ends
      
      // Calculate next period end by adding interval to periodEndIso (already safe)
      const currentPeriodEnd = new Date(periodEndIso);
      const nextPeriodEndDate = new Date(currentPeriodEnd);
      if (recurrence_type === 'bi_weekly') {
        nextPeriodEndDate.setDate(nextPeriodEndDate.getDate() + 14);
      } else {
        nextPeriodEndDate.setMonth(nextPeriodEndDate.getMonth() + 1);
      }
      const nextPeriodEnd = nextPeriodEndDate.toISOString().split('T')[0];

      await supabase.from('billing_records').insert({
        client_id,
        billing_type: billingType,
        amount,
        status: 'pending',
        billing_period_start: nextPeriodStart,
        billing_period_end: nextPeriodEnd,
        due_date: nextPeriodStart,
        recurrence_type,
        is_recurring_parent: false,
        parent_billing_id: billingRecord?.id || null,
        notes: `${billingType === 'ad_spend' ? 'Ad spend' : 'Management fee'} - next billing cycle`,
        stripe_subscription_id: subscription.id,
        stripe_account: stripeAccount,
      });
      console.log(`Next period pending billing record created for ${nextPeriodStart}`);
    }

    return new Response(JSON.stringify({
      success: true,
      status: confirmedStatus,
      subscription_id: subscription.id,
      billing_record_id: billingRecord?.id,
      current_period_start: periodStart,
      current_period_end: periodEnd,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('create-stripe-subscription error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
