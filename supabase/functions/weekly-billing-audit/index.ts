import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { format, subDays } from "https://esm.sh/date-fns@3";

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

function fmt(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('weekly-billing-audit starting...');
    const now = new Date();
    const weekStart = subDays(now, 7).toISOString();
    const weekStartDate = subDays(now, 7).toISOString().split('T')[0];

    // 1. Get all active clients with management fees
    const { data: activeClients } = await supabase
      .from('clients')
      .select('id, name, management_fee, billing_frequency, management_stripe_subscription_id')
      .eq('status', 'active')
      .gt('management_fee', 0);

    // Exempt accounts
    const exemptNames = ['tierre browne', 'james warren'];
    const feeClients = (activeClients || []).filter(c =>
      !exemptNames.some(name => c.name?.toLowerCase().includes(name))
    );

    // 2. Management fees — expected vs actual this week
    const expectedMonthlyMgmt = feeClients.reduce((sum, c) => {
      const freq = c.billing_frequency || 'monthly';
      return sum + (freq === 'bi_weekly' ? c.management_fee * 2.17 : c.management_fee);
    }, 0);
    const expectedWeeklyMgmt = expectedMonthlyMgmt / 4.33; // ~weekly equivalent

    const { data: mgmtPaid } = await supabase
      .from('billing_records')
      .select('client_id, amount')
      .eq('billing_type', 'management')
      .eq('status', 'paid')
      .gte('paid_at', weekStart);

    const actualMgmt = (mgmtPaid || []).reduce((sum, r) => sum + (r.amount || 0), 0);
    const mgmtPaidClientIds = new Set((mgmtPaid || []).map(r => r.client_id));
    const mgmtDelta = expectedWeeklyMgmt - actualMgmt;

    // Clients with fee but no payment this week
    const mgmtMissing = feeClients.filter(c => !mgmtPaidClientIds.has(c.id));

    // 3. Ad spend — charges vs wallet deposits this week
    const { data: adSpendPaid } = await supabase
      .from('billing_records')
      .select('id, client_id, amount')
      .eq('billing_type', 'ad_spend')
      .eq('status', 'paid')
      .gte('paid_at', weekStart);

    const adSpendTotal = (adSpendPaid || []).reduce((sum, r) => sum + (r.amount || 0), 0);

    // Check wallet deposits for these billing records
    const adSpendRecordIds = (adSpendPaid || []).map(r => r.id);
    let depositMismatches: Array<{ clientName: string; chargeAmount: number; depositAmount: number | null }> = [];

    if (adSpendRecordIds.length > 0) {
      const { data: deposits } = await supabase
        .from('wallet_transactions')
        .select('billing_record_id, amount, client_id')
        .in('billing_record_id', adSpendRecordIds);

      const depositMap = new Map((deposits || []).map(d => [d.billing_record_id, d.amount]));
      const clientNameMap = new Map((activeClients || []).map(c => [c.id, c.name]));

      for (const record of (adSpendPaid || [])) {
        const depositAmount = depositMap.get(record.id);
        if (depositAmount === undefined) {
          depositMismatches.push({
            clientName: clientNameMap.get(record.client_id) || 'Unknown',
            chargeAmount: record.amount,
            depositAmount: null,
          });
        } else if (Math.abs(depositAmount - record.amount) > 0.01) {
          depositMismatches.push({
            clientName: clientNameMap.get(record.client_id) || 'Unknown',
            chargeAmount: record.amount,
            depositAmount,
          });
        }
      }
    }

    // 4. Ad spend tracked vs charged
    const { data: adSpendDaily } = await supabase
      .from('ad_spend_daily')
      .select('client_id, cost')
      .gte('spend_date', weekStartDate);

    const trackedAdSpend = (adSpendDaily || []).reduce((sum, r) => sum + Number(r.cost || 0), 0);

    // 5. Build report
    const sections: string[] = [];
    sections.push(`:bar_chart: *Weekly Billing Audit Report*`);
    sections.push(`_Week of ${format(subDays(now, 7), 'MMM d')} — ${format(now, 'MMM d, yyyy')}_\n`);

    // Management fees section
    sections.push(`*Management Fees:*`);
    sections.push(`Expected (weekly equiv): ${fmt(expectedWeeklyMgmt)}`);
    sections.push(`Actual collected: ${fmt(actualMgmt)}`);
    if (mgmtDelta > 0) {
      sections.push(`Delta (missing): ${fmt(mgmtDelta)}`);
    }
    sections.push(`Clients with fee: ${feeClients.length} | Paid this week: ${mgmtPaidClientIds.size}`);

    if (mgmtMissing.length > 0 && mgmtMissing.length <= 15) {
      sections.push(`\n_No mgmt payment this week:_`);
      for (const c of mgmtMissing.slice(0, 10)) {
        const freq = c.billing_frequency || 'monthly';
        const hasSub = c.management_stripe_subscription_id ? 'has sub' : 'NO sub';
        sections.push(`  - ${c.name} (${fmt(c.management_fee)}/${freq === 'bi_weekly' ? '2wk' : 'mo'}, ${hasSub})`);
      }
      if (mgmtMissing.length > 10) {
        sections.push(`  ... and ${mgmtMissing.length - 10} more`);
      }
    }

    // Ad spend section
    sections.push(`\n*Ad Spend:*`);
    sections.push(`Tracked platform spend: ${fmt(trackedAdSpend)}`);
    sections.push(`Stripe charges collected: ${fmt(adSpendTotal)} (${(adSpendPaid || []).length} charges)`);

    if (depositMismatches.length > 0) {
      sections.push(`\n:warning: *Deposit Discrepancies (${depositMismatches.length}):*`);
      for (const d of depositMismatches.slice(0, 5)) {
        if (d.depositAmount === null) {
          sections.push(`  - ${d.clientName}: Charged ${fmt(d.chargeAmount)} — NO wallet deposit`);
        } else {
          sections.push(`  - ${d.clientName}: Charged ${fmt(d.chargeAmount)}, deposited ${fmt(d.depositAmount)}`);
        }
      }
      if (depositMismatches.length > 5) {
        sections.push(`  ... and ${depositMismatches.length - 5} more`);
      }
    }

    // Summary
    const totalRevenue = actualMgmt + adSpendTotal;
    sections.push(`\n*Total Weekly Revenue:* ${fmt(totalRevenue)}`);
    sections.push(`_Management: ${fmt(actualMgmt)} | Ad Spend: ${fmt(adSpendTotal)}_`);

    const report = sections.join('\n');
    console.log(report);
    await sendSlackAlert(report);

    return jsonResponse({
      success: true,
      management: {
        expectedWeekly: expectedWeeklyMgmt,
        actual: actualMgmt,
        delta: mgmtDelta,
        clientsWithFee: feeClients.length,
        clientsPaid: mgmtPaidClientIds.size,
        clientsMissing: mgmtMissing.length,
      },
      adSpend: {
        trackedPlatformSpend: trackedAdSpend,
        stripeCharges: adSpendTotal,
        chargeCount: (adSpendPaid || []).length,
        depositMismatches: depositMismatches.length,
      },
      totalRevenue,
    });

  } catch (error) {
    console.error('weekly-billing-audit error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
