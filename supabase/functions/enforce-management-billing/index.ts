import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addDays, format, parseISO, differenceInDays } from "https://esm.sh/date-fns@3";

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

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('enforce-management-billing starting...');
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 1. Get all active clients with management_fee > 0
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, management_fee, billing_frequency, management_stripe_subscription_id, status')
      .eq('status', 'active')
      .gt('management_fee', 0);

    if (clientsError) throw clientsError;
    if (!clients?.length) {
      console.log('No active clients with management fees');
      return jsonResponse({ success: true, checked: 0 });
    }

    // Exempt accounts
    const exemptNames = ['tierre browne', 'james warren'];
    const activeClients = clients.filter(c =>
      !exemptNames.some(name => c.name?.toLowerCase().includes(name))
    );

    // 2. Get recent management billing records (last 45 days to catch monthly + bi-weekly)
    const lookbackDate = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const clientIds = activeClients.map(c => c.id);

    const { data: recentRecords } = await supabase
      .from('billing_records')
      .select('client_id, amount, status, paid_at, due_date, created_at')
      .eq('billing_type', 'management')
      .in('client_id', clientIds)
      .gte('created_at', lookbackDate)
      .order('created_at', { ascending: false });

    // Build per-client latest record map
    const latestRecordPerClient = new Map<string, any>();
    for (const r of (recentRecords || [])) {
      if (!latestRecordPerClient.has(r.client_id)) {
        latestRecordPerClient.set(r.client_id, r);
      }
    }

    // 3. Categorize clients
    const missingSubscription: typeof activeClients = [];
    const syncNeeded: typeof activeClients = [];
    const overdue: Array<{ client: typeof activeClients[0]; record: any; daysOverdue: number }> = [];
    const upcoming: Array<{ client: typeof activeClients[0]; dueDate: string; amount: number }> = [];
    const ok: typeof activeClients = [];

    for (const client of activeClients) {
      const hasSub = !!client.management_stripe_subscription_id;
      const latestRecord = latestRecordPerClient.get(client.id);
      const freq = client.billing_frequency || 'monthly';
      const periodDays = freq === 'bi_weekly' ? 14 : 30;
      const perPeriodAmount = freq === 'bi_weekly' ? client.management_fee / 2 : client.management_fee;

      if (!latestRecord) {
        // No billing record at all
        if (!hasSub) {
          missingSubscription.push(client);
        } else {
          syncNeeded.push(client);
        }
        continue;
      }

      // Check if overdue
      if (latestRecord.status === 'overdue' || latestRecord.status === 'pending') {
        const dueDate = latestRecord.due_date || latestRecord.created_at?.split('T')[0];
        if (dueDate) {
          const daysPast = differenceInDays(now, parseISO(dueDate));
          if (daysPast > 0) {
            overdue.push({ client, record: latestRecord, daysOverdue: daysPast });
            continue;
          }
        }
      }

      // Calculate next due date based on last paid record
      if (latestRecord.status === 'paid') {
        const paidDate = latestRecord.paid_at || latestRecord.created_at;
        if (paidDate) {
          const nextDue = addDays(parseISO(paidDate), periodDays);
          const daysUntil = differenceInDays(nextDue, now);
          if (daysUntil <= 14 && daysUntil >= 0) {
            upcoming.push({
              client,
              dueDate: format(nextDue, 'MM/dd'),
              amount: perPeriodAmount,
            });
          }
        }
        ok.push(client);
      }
    }

    // 4. Build Slack report
    const sections: string[] = [];
    sections.push(`:moneybag: *Management Fee Status — Daily Report*`);
    sections.push(`_${format(now, 'EEEE, MMMM d, yyyy')}_\n`);

    if (missingSubscription.length > 0) {
      sections.push(`*Missing Subscription:*`);
      for (const c of missingSubscription) {
        const freq = c.billing_frequency || 'monthly';
        const label = freq === 'bi_weekly' ? 'bi-weekly' : 'mo';
        sections.push(`- ${c.name} — ${formatCurrency(c.management_fee)}/${label} — No Stripe sub, needs setup`);
      }
      sections.push('');
    }

    if (syncNeeded.length > 0) {
      sections.push(`*Subscription Exists, No Recent Billing Record:*`);
      for (const c of syncNeeded) {
        sections.push(`- ${c.name} — Has sub \`${c.management_stripe_subscription_id?.slice(0, 20)}\` but no billing record — sync needed`);
      }
      sections.push('');
    }

    if (overdue.length > 0) {
      sections.push(`*Overdue:*`);
      for (const { client, daysOverdue } of overdue) {
        const freq = client.billing_frequency || 'monthly';
        const amount = freq === 'bi_weekly' ? client.management_fee / 2 : client.management_fee;
        sections.push(`- ${client.name} — ${formatCurrency(amount)} — ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`);
      }
      sections.push('');
    }

    if (upcoming.length > 0) {
      sections.push(`*Upcoming (next 14 days):*`);
      for (const { client, dueDate, amount } of upcoming) {
        sections.push(`- ${client.name} — ${formatCurrency(amount)} — Due ${dueDate}`);
      }
      sections.push('');
    }

    // Calculate expected revenue for next 14 days
    const expectedNext14 = upcoming.reduce((sum, u) => sum + u.amount, 0);
    if (expectedNext14 > 0) {
      sections.push(`*Expected Revenue (next 14 days):* ${formatCurrency(expectedNext14)}`);
    }

    // Summary line
    const totalExpectedMonthly = activeClients.reduce((sum, c) => {
      const freq = c.billing_frequency || 'monthly';
      return sum + (freq === 'bi_weekly' ? c.management_fee * 2.17 : c.management_fee);
    }, 0);
    sections.push(`\n_Total expected monthly: ${formatCurrency(totalExpectedMonthly)} from ${activeClients.length} clients_`);
    sections.push(`_OK: ${ok.length} | Missing sub: ${missingSubscription.length} | Sync needed: ${syncNeeded.length} | Overdue: ${overdue.length}_`);

    const report = sections.join('\n');
    console.log(report);

    // Only send Slack if there are issues or upcoming fees
    if (missingSubscription.length > 0 || syncNeeded.length > 0 || overdue.length > 0 || upcoming.length > 0) {
      await sendSlackAlert(report);
    }

    return jsonResponse({
      success: true,
      checked: activeClients.length,
      missingSubscription: missingSubscription.length,
      syncNeeded: syncNeeded.length,
      overdue: overdue.length,
      upcoming: upcoming.length,
      ok: ok.length,
      expectedNext14Days: expectedNext14,
    });

  } catch (error) {
    console.error('enforce-management-billing error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
