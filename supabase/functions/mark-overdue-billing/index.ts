import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Marks pending billing records as overdue when their due_date has passed.
// Safe to call repeatedly — only updates records that actually need it.
// Designed to run as a daily cron job.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const today = new Date().toISOString().split('T')[0];

    // Mark pending records as overdue where:
    // - due_date < today
    // - not already overdue/paid/cancelled
    // - not archived
    // We do NOT touch records with stripe_subscription_id — Stripe's webhook handles those
    const { data: updated, error } = await supabase
      .from('billing_records')
      .update({ status: 'overdue' })
      .eq('status', 'pending')
      .lt('due_date', today)
      .is('archived_at', null)
      .select('id, client_id, client_name, billing_type, amount, due_date');

    if (error) throw error;

    const count = updated?.length || 0;
    console.log(`mark-overdue-billing: marked ${count} records as overdue`);

    if (count > 0) {
      console.log('Overdue records:', updated?.map(r =>
        `${r.client_name || r.client_id} — ${r.billing_type} $${r.amount} due ${r.due_date}`
      ).join(', '));
    }

    return new Response(JSON.stringify({ success: true, marked_overdue: count, records: updated }), {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('mark-overdue-billing error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });
  }
});
