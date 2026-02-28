import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MIN_CHARGE_AMOUNT = 50; // Don't charge less than $50

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('auto-recharge-run starting...');

    // Fetch all wallets with auto-billing enabled
    const { data: wallets, error: walletsError } = await supabase
      .from('client_wallets')
      .select('*')
      .eq('billing_mode', 'auto_stripe')
      .eq('auto_billing_enabled', true)
      .not('auto_charge_amount', 'is', null);

    if (walletsError) throw walletsError;

    if (!wallets?.length) {
      console.log('No clients with auto-billing enabled');
      return jsonResponse({ success: true, processed: 0 });
    }

    // Get performance percentage (global setting)
    const { data: perfSetting } = await supabase
      .from('onboarding_settings')
      .select('setting_value')
      .eq('setting_key', 'performance_percentage')
      .maybeSingle();

    const rawPerf = perfSetting?.setting_value ? parseFloat(perfSetting.setting_value) : NaN;
    const performancePercentage = Number.isFinite(rawPerf) ? rawPerf : 0;

    const results: any[] = [];
    const now = new Date();
    const rollingStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const wallet of wallets) {
      const clientId = wallet.client_id;

      // Fetch client info separately (no FK between client_wallets and clients)
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, email, status, google_campaign_id')
        .eq('id', clientId)
        .maybeSingle();

      if (clientError || !client) {
        results.push({ client_id: clientId, action: 'skipped', reason: 'client not found' });
        continue;
      }

      // Skip non-active clients
      if (client.status !== 'active') {
        results.push({ client: client.name, action: 'skipped', reason: 'not active' });
        continue;
      }

      try {
        // ── Compute wallet balance (same logic as check-low-balance) ──

        // Total deposits
        const { data: deposits } = await supabase
          .from('wallet_transactions')
          .select('amount')
          .eq('client_id', clientId)
          .eq('transaction_type', 'deposit');

        const totalDeposits = deposits?.reduce((sum: number, tx: any) => sum + Number(tx.amount), 0) ?? 0;

        // Tracked spend since tracking_start_date
        let trackedSpend = 0;
        if (wallet.tracking_start_date) {
          const { data: spendData } = await supabase
            .from('ad_spend_daily')
            .select('cost')
            .eq('client_id', clientId)
            .gte('spend_date', wallet.tracking_start_date);

          trackedSpend = spendData?.reduce((sum: number, day: any) => sum + Number(day.cost || 0), 0) ?? 0;
        }

        // Apply performance fee
        const displayedSpend = trackedSpend * (1 + performancePercentage / 100);
        const remainingBalance = totalDeposits - displayedSpend;
        const threshold = wallet.low_balance_threshold ?? 150;

        console.log(`${client.name}: balance=$${remainingBalance.toFixed(2)}, threshold=$${threshold}`);

        // Skip if balance is above threshold
        if (remainingBalance > threshold) {
          results.push({ client: client.name, action: 'ok', balance: remainingBalance });
          continue;
        }

        // ── Check monthly cap ──
        let chargeAmount = Number(wallet.auto_charge_amount);

        if (wallet.monthly_ad_spend_cap) {
          // Sum all ad_spend billing records paid this month
          const { data: monthlyCharges } = await supabase
            .from('billing_records')
            .select('amount')
            .eq('client_id', clientId)
            .eq('billing_type', 'ad_spend')
            .eq('status', 'paid')
            .gte('paid_at', rollingStart);

          const monthTotal = monthlyCharges?.reduce((sum: number, r: any) => sum + Number(r.amount), 0) ?? 0;
          const remainingCap = Number(wallet.monthly_ad_spend_cap) - monthTotal;

          if (remainingCap <= 0) {
            console.log(`${client.name}: monthly cap reached ($${wallet.monthly_ad_spend_cap})`);
            results.push({ client: client.name, action: 'cap_reached', monthTotal });

            // Trigger safe mode since cap is reached
            await triggerSafeMode(supabase, supabaseUrl, supabaseServiceKey, clientId);
            continue;
          }

          // Cap the charge amount to remaining cap
          chargeAmount = Math.min(chargeAmount, remainingCap);
        }

        // If charge would be too small, trigger safe mode instead
        if (chargeAmount < MIN_CHARGE_AMOUNT) {
          console.log(`${client.name}: charge amount too small ($${chargeAmount}), triggering safe mode`);
          results.push({ client: client.name, action: 'safe_mode', reason: 'charge_too_small' });
          await triggerSafeMode(supabase, supabaseUrl, supabaseServiceKey, clientId);
          continue;
        }

        // ── Check for default payment method ──
        const { data: paymentMethod } = await supabase
          .from('client_payment_methods')
          .select('stripe_payment_method_id')
          .eq('client_id', clientId)
          .eq('stripe_account', 'ad_spend')
          .eq('is_default', true)
          .maybeSingle();

        if (!paymentMethod) {
          console.log(`${client.name}: no payment method on file, triggering safe mode`);
          results.push({ client: client.name, action: 'safe_mode', reason: 'no_payment_method' });
          await triggerSafeMode(supabase, supabaseUrl, supabaseServiceKey, clientId);
          continue;
        }

        // ── Create billing record and charge ──
        const today = now.toISOString().split('T')[0];
        const { data: newRecord, error: insertError } = await supabase
          .from('billing_records')
          .insert({
            client_id: clientId,
            billing_type: 'ad_spend',
            amount: chargeAmount,
            due_date: today,
            billing_period_start: today,
            status: 'pending',
            recurrence_type: 'one_time',
            is_recurring_parent: false,
            notes: 'Auto-recharge',
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        // Invoke create-stripe-invoice to charge
        const invoiceRes = await fetch(`${supabaseUrl}/functions/v1/create-stripe-invoice`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ billing_record_id: newRecord.id }),
        });

        const invoiceResult = await invoiceRes.json();

        if (invoiceResult.auto_charged) {
          // Update last auto charge timestamp
          await supabase
            .from('client_wallets')
            .update({ last_auto_charge_at: now.toISOString() })
            .eq('id', wallet.id);

          console.log(`${client.name}: auto-recharged $${chargeAmount}`);
          results.push({ client: client.name, action: 'recharged', amount: chargeAmount });
        } else {
          // Charge failed or requires action — update failure timestamp
          await supabase
            .from('client_wallets')
            .update({ last_charge_failed_at: now.toISOString() })
            .eq('id', wallet.id);

          console.log(`${client.name}: auto-charge failed, triggering safe mode`);
          results.push({ client: client.name, action: 'charge_failed', amount: chargeAmount });
          await triggerSafeMode(supabase, supabaseUrl, supabaseServiceKey, clientId);
        }

      } catch (clientError) {
        console.error(`Error processing ${client.name}:`, clientError);
        results.push({ client: client.name, action: 'error', error: (clientError as Error).message });
      }
    }

    console.log(`auto-recharge-run complete. Processed ${results.length} clients.`);

    return jsonResponse({ success: true, processed: results.length, results });

  } catch (error) {
    console.error('auto-recharge-run error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

// Trigger safe mode via the existing check-low-balance function
async function triggerSafeMode(
  supabase: any,
  supabaseUrl: string,
  supabaseServiceKey: string,
  clientId: string,
) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/check-low-balance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ client_id: clientId }),
    });
  } catch (e) {
    console.error('Failed to trigger safe mode for client:', clientId, e);
  }
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
}
