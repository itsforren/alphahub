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
      .select('id, name, referred_by_client_id')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      console.error('Error fetching client:', clientError);
      return new Response(
        JSON.stringify({ success: false, error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!client.referred_by_client_id) {
      console.log('Client has no referrer, skipping commission');
      return new Response(
        JSON.stringify({ success: true, message: 'Client has no referrer' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const referrerId = client.referred_by_client_id;

    // Get the referral record
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .select('id, status')
      .eq('referrer_client_id', referrerId)
      .eq('referred_client_id', client_id)
      .single();

    if (referralError) {
      console.log('No referral record found, creating one...');
      // Referral record might not exist if onboarding didn't have the referral code
      // This is okay - we can still process the commission
    }

    // Check if referral is active (not churned)
    if (referral && referral.status === 'churned') {
      console.log('Referral is churned, skipping commission');
      return new Response(
        JSON.stringify({ success: true, message: 'Referral is churned, no commission' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if commission already exists for this billing record (prevent duplicates)
    const { data: existingReward, error: existingError } = await supabase
      .from('referral_rewards')
      .select('id')
      .eq('billing_record_id', billing_record_id)
      .maybeSingle();

    if (existingReward) {
      console.log('Commission already exists for this billing record:', existingReward.id);
      return new Response(
        JSON.stringify({ success: true, message: 'Commission already processed', reward_id: existingReward.id }),
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

    const commissionPercentage = config?.commission_percentage || 10;
    const commissionAmount = (amount * commissionPercentage) / 100;

    console.log(`Calculating commission: ${amount} * ${commissionPercentage}% = ${commissionAmount}`);

    // Create the referral reward record
    const periodStart = billing_period_start ? billing_period_start.split('T')[0] : null;
    const periodEnd = billing_period_end ? billing_period_end.split('T')[0] : null;

    const rewardData: Record<string, unknown> = {
      referral_id: referral?.id || null,
      referrer_client_id: referrerId,
      amount: commissionAmount,
      reward_type: 'monthly_commission',
      status: 'approved', // Auto-approved since it's triggered by paid billing
      period_start: periodStart,
      period_end: periodEnd,
      billing_record_id: billing_record_id,
      referred_client_name: client.name,
      notes: `${commissionPercentage}% commission on $${amount.toFixed(2)} management fee from ${client.name}`,
    };

    const { data: reward, error: rewardError } = await supabase
      .from('referral_rewards')
      .insert(rewardData)
      .select()
      .single();

    if (rewardError) {
      console.error('Error creating reward:', rewardError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create reward', details: rewardError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Reward created:', reward.id);

    // Create credit for the referrer
    const { data: credit, error: creditError } = await supabase
      .from('client_credits')
      .insert({
        client_id: referrerId,
        amount: commissionAmount,
        original_amount: commissionAmount,
        remaining_balance: commissionAmount,
        credit_type: 'referral',
        reason: `Referral commission from ${client.name} - ${periodStart || 'Payment'}`,
      })
      .select()
      .single();

    if (creditError) {
      console.error('Error creating credit:', creditError);
      // Don't fail the whole operation - reward was already created
    } else {
      console.log('Credit created:', credit.id);
    }

    // Log activity if we have a referral record
    if (referral) {
      try {
        await supabase.from('prospect_activities').insert({
          prospect_id: referral.id, // Using referral ID as proxy
          activity_type: 'referral_commission_paid',
          activity_data: {
            reward_id: reward.id,
            credit_id: credit?.id,
            amount: commissionAmount,
            billing_record_id,
            referred_client_name: client.name,
          },
        });
      } catch (activityError) {
        console.error('Error logging activity:', activityError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Commission processed successfully',
        reward_id: reward.id,
        credit_id: credit?.id,
        commission_amount: commissionAmount,
        referrer_client_id: referrerId,
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
