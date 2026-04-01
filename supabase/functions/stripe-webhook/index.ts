import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

/** Verify Stripe HMAC-SHA256 webhook signature */
async function verifyStripeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const sigPart = parts.find(p => p.startsWith('v1='));
    if (!timestampPart || !sigPart) return false;
    const timestamp = timestampPart.split('=')[1];
    const expectedSig = sigPart.split('=')[1];
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`));
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    return computed === expectedSig;
  } catch {
    return false;
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
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') || '';

    // Verify signature against both Stripe accounts
    const mgmtSecret   = Deno.env.get('STRIPE_MANAGEMENT_WEBHOOK_SECRET') || '';
    const adSpendSecret = Deno.env.get('STRIPE_AD_SPEND_WEBHOOK_SECRET') || '';
    const verified = (mgmtSecret && await verifyStripeSignature(body, signature, mgmtSecret))
                  || (adSpendSecret && await verifyStripeSignature(body, signature, adSpendSecret));

    if (!verified) {
      console.error('Stripe webhook signature verification failed');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(body);
    
    console.log('Stripe webhook received:', payload.type);

    // Handle checkout.session.completed or payment_intent.succeeded
    if (payload.type !== 'checkout.session.completed' && payload.type !== 'payment_intent.succeeded') {
      console.log('Ignoring event type:', payload.type);
      return new Response(JSON.stringify({ received: true }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const data = payload.data?.object;
    if (!data) {
      console.error('No data object in payload');
      return new Response(JSON.stringify({ error: 'No data in payload' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Extract customer email
    let customerEmail = data.customer_email || data.receipt_email;
    const customerId = data.customer;
    
    // If no direct email, try to get from customer object
    if (!customerEmail && customerId) {
      // Customer lookup would require Stripe API - for now just log
      console.log('No email in payload, customer ID:', customerId);
    }

    if (!customerEmail) {
      console.error('No customer email found in payload');
      return new Response(JSON.stringify({ error: 'No customer email' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    customerEmail = customerEmail.toLowerCase().trim();

    // Extract transaction details
    const transactionId = data.id || data.payment_intent;
    const amountTotal = (data.amount_total || data.amount || 0) / 100; // Convert cents to dollars
    const currency = data.currency || 'usd';
    const productName = data.metadata?.product_name || 'Unknown Product';

    console.log('Processing payment:', { 
      transactionId, 
      email: customerEmail, 
      amount: amountTotal 
    });

    // DEDUPLICATION: Check if this transaction already exists
    const { data: existingConversion } = await supabase
      .from('conversions')
      .select('id')
      .eq('transaction_id', transactionId)
      .single();

    if (existingConversion) {
      console.log('Duplicate transaction, ignoring:', transactionId);
      return new Response(JSON.stringify({ 
        received: true, 
        duplicate: true,
        transaction_id: transactionId 
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // IDENTITY RESOLUTION: Look up the visitor by email
    const { data: visitorSession } = await supabase
      .from('visitor_sessions')
      .select('*')
      .eq('email', customerEmail)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    // Get lead attribution data if exists
    const { data: attribution } = await supabase
      .from('lead_attribution')
      .select('*')
      .ilike('visitor_id', visitorSession?.visitor_id || 'NO_MATCH')
      .limit(1)
      .single();

    // Build conversion record with attribution data
    const conversionData = {
      visitor_id: visitorSession?.visitor_id || null,
      lead_id: visitorSession?.lead_id || attribution?.lead_id || null,
      email: customerEmail,
      transaction_id: transactionId,
      amount: amountTotal,
      currency: currency,
      first_touch_source: attribution?.first_touch_source || visitorSession?.utm_source || null,
      first_touch_campaign: attribution?.first_touch_campaign || visitorSession?.utm_campaign || null,
      last_touch_source: attribution?.last_touch_source || visitorSession?.utm_source || null,
      last_touch_campaign: attribution?.last_touch_campaign || visitorSession?.utm_campaign || null,
      stripe_customer_id: customerId || null,
      product_name: productName,
      payment_status: 'succeeded',
    };

    // Insert conversion record
    const { data: conversion, error: conversionError } = await supabase
      .from('conversions')
      .insert(conversionData)
      .select()
      .single();

    if (conversionError) {
      console.error('Error inserting conversion:', conversionError);
      return new Response(JSON.stringify({ error: 'Failed to record conversion' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('Conversion recorded:', conversion.id);

    // Update lead_attribution if we found a match
    if (attribution) {
      // Could add revenue tracking to lead_attribution here
      console.log('Attribution found for conversion:', attribution.id);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      conversion_id: conversion.id,
      attributed: !!visitorSession 
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Stripe webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
