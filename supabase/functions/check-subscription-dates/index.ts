import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const subscriptionId = body?.subscriptionId;
  const account = body?.account || 'management';

  if (!subscriptionId) {
    return new Response(JSON.stringify({ error: 'subscriptionId required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const stripeKey = account === 'management'
    ? Deno.env.get('STRIPE_MANAGEMENT_SECRET_KEY')
    : Deno.env.get('STRIPE_AD_SPEND_SECRET_KEY');

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'No Stripe key configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`);
    url.searchParams.set('expand[]', 'schedule');
    const res = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${stripeKey}` },
    });
    const sub = await res.json();
    // Return all top-level keys for debugging
    const allKeys = Object.keys(sub);
    console.log('All subscription keys:', allKeys.join(', '));
    console.log('Raw sub (first 2000 chars):', JSON.stringify(sub).slice(0, 2000));

    if (sub.error) {
      return new Response(JSON.stringify({ error: sub.error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const priceItem = sub.items?.data?.[0];
    // Also get upcoming invoice to find the actual next payment date
    let nextPaymentDate = null;
    try {
      const upcomingRes = await fetch(`https://api.stripe.com/v1/invoices/upcoming?subscription=${subscriptionId}`, {
        headers: { 'Authorization': `Bearer ${stripeKey}` },
      });
      if (upcomingRes.ok) {
        const upcoming = await upcomingRes.json();
        nextPaymentDate = upcoming.next_payment_attempt
          ? new Date(upcoming.next_payment_attempt * 1000).toISOString()
          : upcoming.due_date
            ? new Date(upcoming.due_date * 1000).toISOString()
            : upcoming.period_end
              ? new Date(upcoming.period_end * 1000).toISOString()
              : null;
      }
    } catch {}

    return new Response(JSON.stringify({
      subscriptionId: sub.id,
      status: sub.status,
      customer: sub.customer,
      currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      billingCycleAnchor: sub.billing_cycle_anchor ? new Date(sub.billing_cycle_anchor * 1000).toISOString() : null,
      cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
      amount: priceItem ? (priceItem.price?.unit_amount || 0) / 100 : 0,
      interval: priceItem?.price?.recurring?.interval,
      intervalCount: priceItem?.price?.recurring?.interval_count,
      schedule: sub.schedule || null,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      nextPaymentDate,
      latestInvoice: sub.latest_invoice,
      startDate: sub.start_date ? new Date(sub.start_date * 1000).toISOString() : null,
      _rawKeys: allKeys,
      _pauseCollection: sub.pause_collection,
      _pendingUpdate: sub.pending_update,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
