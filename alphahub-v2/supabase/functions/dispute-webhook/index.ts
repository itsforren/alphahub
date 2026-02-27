import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload = await req.json();
    
    console.log('Dispute webhook received:', payload.type);

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
      return new Response(JSON.stringify({ received: true }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const dispute = payload.data?.object;
    if (!dispute) {
      console.error('No dispute object in payload');
      return new Response(JSON.stringify({ error: 'No dispute data' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Extract dispute details
    const disputeData = {
      stripe_dispute_id: dispute.id,
      stripe_charge_id: dispute.charge,
      stripe_payment_intent_id: dispute.payment_intent,
      amount: dispute.amount, // in cents
      currency: dispute.currency || 'usd',
      reason: dispute.reason,
      status: mapStripeStatus(dispute.status),
      evidence_due_by: dispute.evidence_details?.due_by 
        ? new Date(dispute.evidence_details.due_by * 1000).toISOString() 
        : null,
    };

    console.log('Processing dispute:', disputeData);

    // Try to find the client by looking up the charge/payment intent
    let clientId = null;
    
    // First, try to find via billing_records
    if (dispute.payment_intent) {
      const { data: billingRecord } = await supabase
        .from('billing_records')
        .select('client_id')
        .eq('stripe_payment_intent_id', dispute.payment_intent)
        .limit(1)
        .maybeSingle();
      
      if (billingRecord) {
        clientId = billingRecord.client_id;
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
      const updateData: any = {
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
        return new Response(JSON.stringify({ error: 'Failed to update dispute' }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      console.log('Dispute updated:', existingDispute.id);
      return new Response(JSON.stringify({ 
        success: true, 
        dispute_id: existingDispute.id,
        action: 'updated'
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
      return new Response(JSON.stringify({ error: 'Failed to record dispute' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
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

    return new Response(JSON.stringify({ 
      success: true, 
      dispute_id: newDispute.id,
      action: 'created'
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Dispute webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
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
