import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessCommissionPayload {
  billing_record_id: string;
  client_id: string;
  amount: number;
  billing_type: string;
  billing_period_start?: string;
  billing_period_end?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: ProcessCommissionPayload = await req.json();
    console.log('Processing referral commission for billing record:', payload.billing_record_id);

    const { billing_record_id, client_id, amount, billing_type, billing_period_start, billing_period_end } = payload;

    // Only process management fees
    if (billing_type !== 'management') {
      console.log('Skipping - not a management fee:', billing_type);
      return new Response(
        JSON.stringify({ success: true, message: 'Not a management fee, skipping commission' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if client was referred
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, referred_by_client_id, referred_by_client_id_secondary')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      console.error('Error fetching client:', clientError);
      return new Response(
        JSON.stringify({ success: false, error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!client.referred_by_client_id && !client.referred_by_client_id_secondary) {
      console.log('Client has no referrers, skipping commission');
      return new Response(
        JSON.stringify({ success: true, message: 'Client has no referrers' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get commission configuration
    const { data: config, error: configError } = await supabase
      .from('referral_commission_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.log('No active commission config found, using default 10%');
    }

    const primaryPercentage = config?.commission_percentage || 10;
    const secondaryPercentage = 5; // Fixed 5% for secondary referrer

    const periodStart = billing_period_start ? billing_period_start.split('T')[0] : null;
    const periodEnd = billing_period_end ? billing_period_end.split('T')[0] : null;

    const results: { primary?: any; secondary?: any } = {};

    // --- Process PRIMARY referrer ---
    if (client.referred_by_client_id) {
      const result = await processReferrerCommission(supabase, {
        referrerId: client.referred_by_client_id,
        clientId: client_id,
        clientName: client.name,
        billingRecordId: billing_record_id,
        amount,
        commissionPercentage: primaryPercentage,
        tier: 'primary',
        periodStart,
        periodEnd,
      });
      results.primary = result;
    }

    // --- Process SECONDARY referrer ---
    if (client.referred_by_client_id_secondary) {
      const result = await processReferrerCommission(supabase, {
        referrerId: client.referred_by_client_id_secondary,
        clientId: client_id,
        clientName: client.name,
        billingRecordId: billing_record_id,
        amount,
        commissionPercentage: secondaryPercentage,
        tier: 'secondary',
        periodStart,
        periodEnd,
      });
      results.secondary = result;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Commission processed successfully',
        ...results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper: process commission for a single referrer (primary or secondary)
async function processReferrerCommission(
  supabase: any,
  params: {
    referrerId: string;
    clientId: string;
    clientName: string;
    billingRecordId: string;
    amount: number;
    commissionPercentage: number;
    tier: 'primary' | 'secondary';
    periodStart: string | null;
    periodEnd: string | null;
  }
) {
  const { referrerId, clientId, clientName, billingRecordId, amount, commissionPercentage, tier, periodStart, periodEnd } = params;

  console.log(`Processing ${tier} referrer commission: referrer=${referrerId}, ${commissionPercentage}%`);

  // Get the referral record (optional)
  const { data: referral } = await supabase
    .from('referrals')
    .select('id, status')
    .eq('referrer_client_id', referrerId)
    .eq('referred_client_id', clientId)
    .maybeSingle();

  // Check if referral is churned
  if (referral && referral.status === 'churned') {
    console.log(`${tier} referral is churned, skipping commission`);
    return { skipped: true, reason: 'churned' };
  }

  // Check if commission already exists for this billing record + referrer (prevent duplicates)
  const { data: existingReward } = await supabase
    .from('referral_rewards')
    .select('id')
    .eq('billing_record_id', billingRecordId)
    .eq('referrer_client_id', referrerId)
    .maybeSingle();

  if (existingReward) {
    console.log(`${tier} commission already exists for billing record:`, existingReward.id);
    return { skipped: true, reason: 'duplicate', reward_id: existingReward.id };
  }

  const commissionAmount = (amount * commissionPercentage) / 100;
  console.log(`${tier} commission: ${amount} * ${commissionPercentage}% = ${commissionAmount}`);

  // Create the referral reward record
  const rewardData: Record<string, unknown> = {
    referral_id: referral?.id || null,
    referrer_client_id: referrerId,
    amount: commissionAmount,
    reward_type: 'monthly_commission',
    status: 'approved',
    period_start: periodStart,
    period_end: periodEnd,
    billing_record_id: billingRecordId,
    referred_client_name: clientName,
    notes: `${tier === 'secondary' ? 'Secondary ' : ''}${commissionPercentage}% commission on $${amount.toFixed(2)} management fee from ${clientName}`,
  };

  const { data: reward, error: rewardError } = await supabase
    .from('referral_rewards')
    .insert(rewardData)
    .select()
    .single();

  if (rewardError) {
    console.error(`Error creating ${tier} reward:`, rewardError);
    return { error: rewardError.message };
  }

  console.log(`${tier} reward created:`, reward.id);

  // Create credit for the referrer
  const { data: credit, error: creditError } = await supabase
    .from('client_credits')
    .insert({
      client_id: referrerId,
      amount: commissionAmount,
      original_amount: commissionAmount,
      remaining_balance: commissionAmount,
      credit_type: 'referral',
      reason: `${tier === 'secondary' ? 'Secondary referral' : 'Referral'} commission from ${clientName} - ${periodStart || 'Payment'}`,
    })
    .select()
    .single();

  if (creditError) {
    console.error(`Error creating ${tier} credit:`, creditError);
  } else {
    console.log(`${tier} credit created:`, credit.id);
  }

  // Log activity if we have a referral record
  if (referral) {
    try {
      await supabase.from('prospect_activities').insert({
        prospect_id: referral.id,
        activity_type: 'referral_commission_paid',
        activity_data: {
          reward_id: reward.id,
          credit_id: credit?.id,
          amount: commissionAmount,
          billing_record_id: billingRecordId,
          referred_client_name: clientName,
          tier,
        },
      });
    } catch (activityError) {
      console.error(`Error logging ${tier} activity:`, activityError);
    }
  }

  return {
    reward_id: reward.id,
    credit_id: credit?.id,
    commission_amount: commissionAmount,
    referrer_client_id: referrerId,
    tier,
  };
}
