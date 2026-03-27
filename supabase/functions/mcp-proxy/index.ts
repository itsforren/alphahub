import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getComputedWalletBalance, getYesterdaySpend, getTodaySpend, getMTDMetrics, getAllComputedBalances, getPerformancePercentage, applyPerformancePercentage } from "./computed-wallet.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-mcp-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth check
  const secret = req.headers.get("x-mcp-secret");
  const expected = Deno.env.get("MCP_PROXY_SECRET");
  if (!expected || secret !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { tool, params } = await req.json();

  let result: string;
  try {
    switch (tool) {
      // ── Existing read tools ──
      case "list_clients": result = await listClients(supabase, params ?? {}); break;
      case "get_client_detail": result = await getClientDetail(supabase, params ?? {}); break;
      case "search_clients": result = await searchClients(supabase, params ?? {}); break;
      case "get_billing_summary": result = await getBillingSummary(supabase, params ?? {}); break;
      case "get_ad_spend_overview": result = await getAdSpendOverview(supabase, params ?? {}); break;
      case "get_campaign_health": result = await getCampaignHealth(supabase, params ?? {}); break;
      case "get_lead_pipeline": result = await getLeadPipeline(supabase, params ?? {}); break;
      case "get_communications": result = await getCommunications(supabase, params ?? {}); break;
      case "get_financial_projections": result = await getFinancialProjections(supabase, params ?? {}); break;
      case "get_alerts": result = await getAlerts(supabase); break;
      // ── New read/monitor tools ──
      case "get_response_times": result = await getResponseTimes(supabase, params ?? {}); break;
      case "get_unread_overview": result = await getUnreadOverview(supabase); break;
      case "get_ticket_workload": result = await getTicketWorkload(supabase); break;
      case "get_onboarding_progress": result = await getOnboardingProgress(supabase); break;
      case "get_daily_dashboard": result = await getDailyDashboard(supabase); break;
      case "run_query": result = await runQuery(supabase, params ?? {}); break;
      case "list_tools": result = listTools(); break;
      // ── New deep read tools ──
      case "get_client_history": result = await getClientHistory(supabase, params ?? {}); break;
      case "get_billing_overview": result = await getBillingOverview(supabase, params ?? {}); break;
      case "get_onboarding_detail": result = await getOnboardingDetail(supabase, params ?? {}); break;
      case "bulk_query": result = await bulkQuery(supabase, params ?? {}); break;
      // ── Write/action tools ──
      case "send_message": result = await sendMessage(supabase, params ?? {}); break;
      case "update_ticket": result = await updateTicket(supabase, params ?? {}); break;
      case "add_ticket_reply": result = await addTicketReply(supabase, params ?? {}); break;
      case "create_ticket": result = await createTicket(supabase, params ?? {}); break;
      case "update_client": result = await updateClientTool(supabase, params ?? {}); break;
      case "update_ad_budget": result = await updateAdBudget(supabase, params ?? {}); break;
      case "update_ad_targeting": result = await updateAdTargeting(supabase, params ?? {}); break;
      case "toggle_ads": result = await toggleAds(supabase, params ?? {}); break;
      case "send_internal_message": result = await sendInternalMessage(supabase, params ?? {}); break;
      case "send_slack_webhook": result = await sendSlackWebhook(params ?? {}); break;
      case "verify_onboarding_item": result = await verifyOnboardingItem(supabase, params ?? {}); break;
      // ── MCC Monitoring tools ──
      case "get_mcc_billing_summary": result = await getMccBillingSummary(supabase); break;
      case "get_mcc_policy_violations": result = await getMccPolicyViolations(supabase); break;
      case "get_mcc_spend_overview": result = await getMccSpendOverview(supabase, params ?? {}); break;
      // ── Enhanced Pipeline Analytics tools ──
      case "get_pipeline_metrics": result = await getPipelineMetrics(supabase, params ?? {}); break;
      case "get_client_funnel_detail": result = await getClientFunnelDetail(supabase, params ?? {}); break;
      case "get_funnel_benchmarks": result = await getFunnelBenchmarks(supabase, params ?? {}); break;
      // ── Financial / Bank tools ──
      case "get_bank_balances": result = await getBankBalances(supabase, params ?? {}); break;
      case "get_recent_transactions": result = await getRecentTransactions(supabase, params ?? {}); break;
      case "get_cash_flow_summary": result = await getCashFlowSummary(supabase, params ?? {}); break;
      // ── Stripe tools ──
      case "get_stripe_balance": result = await getStripeBalance(); break;
      case "get_stripe_customers": result = await getStripeCustomers(params ?? {}); break;
      case "get_stripe_invoices": result = await getStripeInvoices(params ?? {}); break;
      case "get_stripe_subscriptions": result = await getStripeSubscriptions(params ?? {}); break;
      case "get_stripe_charges": result = await getStripeCharges(params ?? {}); break;
      case "get_stripe_payouts": result = await getStripePayouts(params ?? {}); break;
      default:
        result = `Unknown tool: ${tool}. Use list_tools to see available tools.`;
    }
  } catch (e) {
    result = `Error: ${(e as Error).message}`;
  }

  return new Response(JSON.stringify({ result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// ===================== AUDIT HELPER =====================

async function logAudit(sb: any, tool: string, params: any, result: string) {
  try {
    await sb.from("mcp_audit_log").insert({ tool, params, result: result.substring(0, 2000) });
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}

// ===================== EXISTING TOOL IMPLEMENTATIONS =====================

async function listClients(sb: any, params: any): Promise<string> {
  const limit = params.limit ?? 50;
  let query = sb
    .from("clients")
    .select(
      `id, name, email, phone, status, onboarding_status,
       management_fee, monthly_ad_spend, mtd_ad_spend, mtd_leads,
       conversion_rate, cpa, ads_live, start_date, billing_status,
       client_wallets(low_balance_threshold, auto_billing_enabled)`
    )
    .is("deleted_at", null)
    .order("name")
    .limit(limit);

  if (params.status) query = query.eq("status", params.status);

  const [{ data, error }, { balances, performancePercentage: perfPct }] = await Promise.all([query, getAllComputedBalances(sb)]);
  if (error) return `Error: ${error.message}`;
  if (!data?.length) return "No clients found.";

  const lines = data.map((c: any) => {
    const w = Array.isArray(c.client_wallets) ? c.client_wallets[0] : c.client_wallets;
    const computed = balances.get(c.id);
    const bal = computed?.remainingBalance ?? 0;
    const thresh = w?.low_balance_threshold ?? 100;
    const low = bal < thresh ? " ⚠️ LOW" : "";
    return [
      `**${c.name}** (${c.status})`,
      `  Email: ${c.email} | Phone: ${c.phone ?? "N/A"}`,
      `  Mgmt Fee: $${c.management_fee ?? 0} | Ad Budget: $${c.monthly_ad_spend ?? 0} | MTD Spend: $${c.mtd_ad_spend ?? 0}`,
      `  MTD Leads: ${c.mtd_leads ?? 0} | CPA: $${c.cpa ?? "N/A"} | CVR: ${c.conversion_rate ?? "N/A"}%`,
      `  Wallet: $${bal.toFixed(2)}${low} (raw: $${(computed?.rawBalance ?? 0).toFixed(2)}, +${perfPct}% fee) | Ads Live: ${c.ads_live ? "Yes" : "No"}`,
      `  Onboarding: ${c.onboarding_status ?? "N/A"} | Billing: ${c.billing_status ?? "N/A"}`,
      `  Started: ${c.start_date ?? "N/A"} | ID: ${c.id}`,
    ].join("\n");
  });

  return `## Clients (${data.length} total)\n\n${lines.join("\n\n---\n\n")}`;
}

async function getClientDetail(sb: any, params: any): Promise<string> {
  let q = sb.from("clients").select("*").is("deleted_at", null);
  if (params.client_id) q = q.eq("id", params.client_id);
  else if (params.client_name) q = q.ilike("name", `%${params.client_name}%`);
  else return "Error: Provide either client_id or client_name.";

  const { data: clients, error } = await q.limit(1);
  if (error) return `Error: ${error.message}`;
  if (!clients?.length) return "Client not found.";

  const c = clients[0];
  const id = c.id;

  // Get computed wallet balance and metrics (matches frontend logic)
  const [computedWallet, yesterdaySpend, todaySpend, mtdMetrics] = await Promise.all([
    getComputedWalletBalance(sb, id),
    getYesterdaySpend(sb, id),
    getTodaySpend(sb, id),
    getMTDMetrics(sb, id),
  ]);

  const [walletRes, billingRes, campaignRes, leadsRes, chatRes, ticketRes, agreementRes, txnRes, onboardingRes] =
    await Promise.all([
      sb.from("client_wallets").select("*").eq("client_id", id).limit(1),
      sb.from("billing_records").select("id, amount, billing_type, status, due_date, paid_at, created_at").eq("client_id", id).order("created_at", { ascending: false }).limit(10),
      sb.from("campaigns").select("id, google_campaign_id, status, health_score, health_label, current_daily_budget, safe_mode, safe_mode_reason, pace_drift_pct, ai_summary, reason_codes").eq("client_id", id),
      sb.from("leads").select("id, status, first_name, last_name, lead_date, delivery_status").eq("agent_id", id).order("created_at", { ascending: false }).limit(20),
      sb.from("chat_conversations").select("id, status, unread_count_admin, unread_count_client, last_message_at, last_message_preview").eq("client_id", id).limit(1),
      sb.from("support_tickets").select("id, ticket_number, subject, category, priority, status, created_at").eq("client_id", id).order("created_at", { ascending: false }).limit(5),
      sb.from("agreements").select("id, status, signed_at, signer_full_name").eq("client_id", id).order("created_at", { ascending: false }).limit(1),
      sb.from("wallet_transactions").select("id, transaction_type, amount, balance_after, description, created_at").eq("client_id", id).order("created_at", { ascending: false }).limit(10),
      sb.from("onboarding_checklist").select("id, category, status").eq("client_id", id),
    ]);

  const s: string[] = [];
  s.push(`## Client: ${c.name}\n`);
  s.push([
    `**Status**: ${c.status} | **Onboarding**: ${c.onboarding_status ?? "N/A"}`,
    `**Email**: ${c.email} | **Phone**: ${c.phone ?? "N/A"}`,
    `**Started**: ${c.start_date ?? "N/A"} | **Team**: ${c.team ?? "N/A"}`,
    `**Management Fee**: $${c.management_fee ?? 0} | **Ad Budget**: $${c.monthly_ad_spend ?? 0}`,
    `**MTD Spend**: $${c.mtd_ad_spend ?? 0} | **MTD Leads**: ${c.mtd_leads ?? 0}`,
    `**CPA**: $${c.cpa ?? "N/A"} | **CVR**: ${c.conversion_rate ?? "N/A"}%`,
    `**Ads Live**: ${c.ads_live ? "Yes" : "No"} | **Billing Status**: ${c.billing_status ?? "N/A"}`,
    `**Referral Code**: ${c.referral_code ?? "N/A"} | **NPS**: ${c.nps_score ?? "N/A"}`,
    `**Target States**: ${c.target_states ?? "N/A"}`,
    `**Success Manager**: ${c.success_manager_name ?? "N/A"}`,
    `**Google Campaign ID**: ${c.google_campaign_id ?? "N/A"}`,
    `**Target Daily Spend**: $${c.target_daily_spend ?? "N/A"}`,
    `**ID**: ${c.id}`,
  ].join("\n"));

  // Links
  const links: string[] = [];
  if (c.lander_link) links.push(`Lander: ${c.lander_link}`);
  if (c.nfia_link) links.push(`NFIA: ${c.nfia_link}`);
  if (c.tfwp_profile_link) links.push(`TFWP Profile: ${c.tfwp_profile_link}`);
  if (c.tfwp_scheduler_link) links.push(`TFWP Scheduler: ${c.tfwp_scheduler_link}`);
  if (c.thank_you_link) links.push(`Thank You: ${c.thank_you_link}`);
  if (c.crm_link) links.push(`CRM: ${c.crm_link}`);
  if (links.length) s.push(`\n### Links\n${links.map(l => `  ${l}`).join("\n")}`);

  const w = walletRes.data?.[0];
  if (w) {
    s.push(`\n### Wallet (Real-Time Computed — ${computedWallet.performancePercentage}% Performance Fee Applied)
Balance (Agent View): $${computedWallet.remainingBalance.toFixed(2)}
Balance (Raw Ledger): $${computedWallet.rawBalance.toFixed(2)}
Total Deposits: $${computedWallet.totalDeposits.toFixed(2)}
Raw Ad Spend: $${computedWallet.rawSpend.toFixed(2)}
Adjusted Spend (+${computedWallet.performancePercentage}%): $${computedWallet.adjustedSpend.toFixed(2)}
Performance Fee: $${(computedWallet.adjustedSpend - computedWallet.rawSpend).toFixed(2)}
Threshold: $${w.low_balance_threshold}
Auto-Billing: ${w.auto_billing_enabled ? `Yes ($${w.auto_charge_amount})` : "No"}
Last Auto-Charge: ${w.last_auto_charge_at ?? "Never"}
Last Fail: ${w.last_charge_failed_at ?? "None"}

### Spend Metrics
Yesterday: $${yesterdaySpend.toFixed(2)} (adjusted: $${applyPerformancePercentage(yesterdaySpend, computedWallet.performancePercentage).toFixed(2)})
Today: $${todaySpend.toFixed(2)} (adjusted: $${applyPerformancePercentage(todaySpend, computedWallet.performancePercentage).toFixed(2)})
MTD Spend: $${mtdMetrics.mtdSpend.toFixed(2)} (adjusted: $${applyPerformancePercentage(mtdMetrics.mtdSpend, computedWallet.performancePercentage).toFixed(2)})
Daily Budget: $${c.target_daily_spend ?? "N/A"}

### Business Performance
MTD Leads: ${mtdMetrics.mtdLeads}
Applications Submitted: ${mtdMetrics.totalSubmitted}
Issued/Paid Premium: $${mtdMetrics.totalIssuedPaid.toFixed(2)}
Alpha ROI: ${(mtdMetrics.alphaROI * 100).toFixed(1)}% (${mtdMetrics.alphaROI.toFixed(2)}x)`);
  }

  const bills = billingRes.data ?? [];
  if (bills.length) {
    s.push(`\n### Recent Billing (${bills.length})\n` + bills.map((b: any) => `  ${b.billing_type} | $${b.amount} | ${b.status} | Due: ${b.due_date ?? "N/A"} | Paid: ${b.paid_at ?? "N/A"}`).join("\n"));
  }

  const camps = campaignRes.data ?? [];
  if (camps.length) {
    s.push(`\n### Campaigns (${camps.length})\n` + camps.map((cp: any) => `  Health: ${cp.health_score ?? "N/A"} (${cp.health_label ?? "N/A"}) | Budget: $${cp.current_daily_budget ?? "N/A"}/day | Safe Mode: ${cp.safe_mode ? `YES - ${cp.safe_mode_reason}` : "No"}\n  Pace Drift: ${cp.pace_drift_pct ?? "N/A"}% | Reasons: ${(cp.reason_codes ?? []).join(", ") || "None"}${cp.ai_summary ? `\n  AI: ${cp.ai_summary}` : ""}`).join("\n\n"));
  }

  const leads = leadsRes.data ?? [];
  if (leads.length) {
    const sc2: Record<string, number> = {};
    const dc: Record<string, number> = {};
    leads.forEach((l: any) => {
      sc2[l.status ?? "unknown"] = (sc2[l.status ?? "unknown"] || 0) + 1;
      dc[l.delivery_status ?? "unknown"] = (dc[l.delivery_status ?? "unknown"] || 0) + 1;
    });
    s.push(`\n### Leads (last 20)\nBy Status: ${Object.entries(sc2).map(([k, v]) => `${k}: ${v}`).join(" | ")}\nBy Delivery: ${Object.entries(dc).map(([k, v]) => `${k}: ${v}`).join(" | ")}`);
  }

  const chat = chatRes.data?.[0];
  if (chat) {
    s.push(`\n### Chat\nUnread (admin): ${chat.unread_count_admin} | Unread (client): ${chat.unread_count_client}\nLast: ${chat.last_message_preview ?? "N/A"} (${chat.last_message_at ?? "N/A"})`);
  }

  const tickets = ticketRes.data ?? [];
  const openTickets = tickets.filter((t: any) => t.status === 'open' || t.status === 'in_progress').length;
  if (tickets.length) {
    s.push(`\n### Support Tickets (${tickets.length} recent, ${openTickets} open)\n` + tickets.map((t: any) => `  #${t.ticket_number} | ${t.subject} | ${t.priority} | ${t.status}`).join("\n"));
  }

  const agr = agreementRes.data?.[0];
  if (agr) {
    s.push(`\n### Agreement\nStatus: ${agr.status} | Signed: ${agr.signed_at ?? "Not signed"} | Signer: ${agr.signer_full_name ?? "N/A"}`);
  }

  const txns = txnRes.data ?? [];
  if (txns.length) {
    s.push(`\n### Recent Wallet Transactions (${txns.length})\n` + txns.map((t: any) => `  ${t.transaction_type} | $${t.amount} | ${t.description ?? ""} | ${t.created_at}`).join("\n"));
  }

  // Onboarding summary
  const obItems = onboardingRes.data ?? [];
  if (obItems.length) {
    const total = obItems.length;
    const completed = obItems.filter((i: any) => i.status === 'yes').length;
    const pct = Math.round((completed / total) * 100);
    s.push(`\n### Onboarding\nCompletion: ${completed}/${total} (${pct}%)`);
  }

  return s.join("\n");
}

async function searchClients(sb: any, params: any): Promise<string> {
  let q = sb
    .from("clients")
    .select("id, name, email, phone, status, onboarding_status, billing_status, management_fee, monthly_ad_spend, ads_live")
    .is("deleted_at", null)
    .order("name")
    .limit(25);

  if (params.query) q = q.or(`name.ilike.%${params.query}%,email.ilike.%${params.query}%`);
  if (params.status) q = q.eq("status", params.status);
  if (params.billing_status) q = q.eq("billing_status", params.billing_status);
  if (params.onboarding_status) q = q.eq("onboarding_status", params.onboarding_status);

  const { data, error } = await q;
  if (error) return `Error: ${error.message}`;
  if (!data?.length) return "No matching clients found.";

  return `## Search Results (${data.length})\n\n` + data.map((c: any) =>
    `**${c.name}** | ${c.email} | Status: ${c.status} | Billing: ${c.billing_status ?? "N/A"} | Fee: $${c.management_fee ?? 0} | Ads: ${c.ads_live ? "Live" : "Off"} | ID: ${c.id}`
  ).join("\n\n");
}

async function getBillingSummary(sb: any, params: any): Promise<string> {
  const period = params.period ?? "mtd";
  const now = new Date();
  let startDate: string;
  if (period === "mtd") startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  else if (period === "last_30d") { const d = new Date(now); d.setDate(d.getDate() - 30); startDate = d.toISOString().split("T")[0]; }
  else if (period === "last_quarter") { const d = new Date(now); d.setDate(d.getDate() - 90); startDate = d.toISOString().split("T")[0]; }
  else startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const [allRes, overdueRes, recurringRes, creditsRes] = await Promise.all([
    sb.from("billing_records").select("amount, billing_type, status").gte("created_at", startDate),
    sb.from("billing_records").select("id, client_name, amount, billing_type, due_date").eq("status", "overdue").order("due_date"),
    sb.from("billing_records").select("client_name, amount, billing_type, recurrence_type, next_due_date").eq("is_recurring_parent", true).not("next_due_date", "is", null),
    sb.from("client_credits").select("amount, remaining_balance, credit_type").gt("remaining_balance", 0),
  ]);

  const s: string[] = [`## Billing Summary (${period})\n`];
  const records = allRes.data ?? [];
  const totals: Record<string, Record<string, number>> = {};
  let grand = 0, paid = 0;
  records.forEach((r: any) => {
    const t = r.billing_type ?? "other", st = r.status ?? "unknown";
    if (!totals[t]) totals[t] = {};
    totals[t][st] = (totals[t][st] || 0) + (r.amount ?? 0);
    grand += r.amount ?? 0;
    if (st === "paid") paid += r.amount ?? 0;
  });

  s.push(`**Total Billed**: $${grand.toFixed(2)} | **Paid**: $${paid.toFixed(2)} | **Outstanding**: $${(grand - paid).toFixed(2)} | **Records**: ${records.length}\n`);
  for (const [type, statuses] of Object.entries(totals)) {
    s.push(`**${type}**: ${Object.entries(statuses).map(([st, amt]) => `${st}: $${amt.toFixed(2)}`).join(" | ")}`);
  }

  const overdue = overdueRes.data ?? [];
  if (overdue.length) {
    const tot = overdue.reduce((a: number, o: any) => a + (o.amount ?? 0), 0);
    s.push(`\n### Overdue (${overdue.length}) — $${tot.toFixed(2)}`);
    overdue.forEach((o: any) => s.push(`  ${o.client_name ?? "Unknown"} | $${o.amount} | ${o.billing_type} | Due: ${o.due_date ?? "N/A"}`));
  }

  const rec = recurringRes.data ?? [];
  if (rec.length) {
    const tot = rec.reduce((a: number, r: any) => a + (r.amount ?? 0), 0);
    s.push(`\n### Recurring: $${tot.toFixed(2)}/cycle (${rec.length} active)`);
    rec.forEach((r: any) => s.push(`  ${r.client_name ?? "Unknown"} | $${r.amount} | ${r.billing_type} | ${r.recurrence_type} | Next: ${r.next_due_date}`));
  }

  const credits = creditsRes.data ?? [];
  if (credits.length) {
    const tot = credits.reduce((a: number, c: any) => a + (c.remaining_balance ?? 0), 0);
    s.push(`\n### Outstanding Credits: $${tot.toFixed(2)} (${credits.length})`);
  }

  return s.join("\n");
}

async function getAdSpendOverview(sb: any, params: any): Promise<string> {
  const [walletRes, { balances, performancePercentage: perfPct }] = await Promise.all([
    sb.from("client_wallets")
      .select(`id, client_id, low_balance_threshold, auto_billing_enabled, auto_charge_amount, last_auto_charge_at, last_charge_failed_at, clients!inner(name, status, monthly_ad_spend, mtd_ad_spend, ads_live)`),
    getAllComputedBalances(sb),
  ]);
  const { data: wallets, error } = walletRes;
  if (error) return `Error: ${error.message}`;
  if (!wallets?.length) return "No wallets found.";

  const d7 = new Date(); d7.setDate(d7.getDate() - 7);
  const { data: spendData } = await sb.from("ad_spend_daily").select("client_id, cost").gte("spend_date", d7.toISOString().split("T")[0]);
  const daily: Record<string, number> = {};
  (spendData ?? []).forEach((s2: any) => { daily[s2.client_id] = (daily[s2.client_id] || 0) + (s2.cost ?? 0); });

  // Attach computed balance to each wallet
  const enriched = wallets.map((w: any) => {
    const computed = balances.get(w.client_id);
    return { ...w, computedBalance: computed?.remainingBalance ?? 0 };
  });

  // Sort by computed balance ascending
  enriched.sort((a: any, b: any) => a.computedBalance - b.computedBalance);

  let filtered = enriched;
  if (params.only_low_balance) filtered = filtered.filter((w: any) => w.computedBalance < (w.low_balance_threshold ?? 100));
  if (params.only_auto_billing) filtered = filtered.filter((w: any) => w.auto_billing_enabled);

  const totalBal = filtered.reduce((a: number, w: any) => a + w.computedBalance, 0);
  const lowCt = filtered.filter((w: any) => w.computedBalance < (w.low_balance_threshold ?? 100)).length;
  const failCt = filtered.filter((w: any) => w.last_charge_failed_at).length;

  const s: string[] = [`## Ad Spend Overview (${filtered.length} wallets) — ${perfPct}% Performance Fee Applied\n`, `**Total Balance**: $${totalBal.toFixed(2)} | **Low**: ${lowCt} | **Failed Charges**: ${failCt}\n`];

  filtered.forEach((w: any) => {
    const cl = Array.isArray(w.clients) ? w.clients[0] : w.clients;
    const avg = (daily[w.client_id] ?? 0) / 7;
    const runway = avg > 0 ? Math.floor(w.computedBalance / avg) : Infinity;
    const flags: string[] = [];
    if (w.computedBalance < (w.low_balance_threshold ?? 100)) flags.push("LOW");
    if (w.last_charge_failed_at) flags.push("CHARGE FAILED");
    if (w.auto_billing_enabled) flags.push("Auto-Billing");
    const f = flags.length ? ` [${flags.join(", ")}]` : "";

    s.push(`**${cl?.name ?? "Unknown"}** (${cl?.status ?? "N/A"})${f}\n  Balance: $${w.computedBalance.toFixed(2)} | Avg Daily: $${avg.toFixed(2)} | Runway: ${runway === Infinity ? "N/A" : `${runway}d`} | Ads: ${cl?.ads_live ? "Live" : "Off"}\n  Auto: ${w.auto_billing_enabled ? `$${w.auto_charge_amount}` : "Off"}`);
  });

  return s.join("\n");
}

async function getCampaignHealth(sb: any, params: any): Promise<string> {
  let cq = sb.from("campaigns").select(`id, client_id, google_campaign_id, status, health_score, health_label, reason_codes, current_daily_budget, required_daily_spend, wallet_remaining, days_remaining_in_cycle, safe_mode, safe_mode_reason, safe_mode_triggered_at, pace_drift_pct, ai_summary, ignored, leads_last_7d, leads_prior_7d, leads_yesterday, booked_calls_last_7d, booked_calls_prior_7d, booked_call_rate_7d, clients!inner(name, status, ads_live)`).order("health_score", { ascending: true, nullsFirst: true });
  if (params.client_id) cq = cq.eq("client_id", params.client_id);

  const { data: campaigns, error } = await cq;
  if (error) return `Error: ${error.message}`;
  if (!campaigns?.length) return "No campaigns found.";

  let pq = sb.from("proposals").select("id, client_id, campaign_id, proposed_action_type, current_daily_budget, proposed_daily_budget, delta_pct, ai_summary, recommendation_confidence, reason_codes, created_at").eq("status", "pending").order("created_at", { ascending: false });
  if (params.client_id) pq = pq.eq("client_id", params.client_id);
  const { data: proposals } = await pq;

  let filtered = campaigns;
  if (params.only_unhealthy) filtered = filtered.filter((c: any) => (c.health_score ?? 0) < 60 || c.safe_mode);

  const sm = filtered.filter((c: any) => c.safe_mode).length;
  const crit = filtered.filter((c: any) => (c.health_score ?? 0) < 40).length;
  const s: string[] = [`## Campaign Health (${filtered.length} campaigns)\n`, `**Critical**: ${crit} | **Safe Mode**: ${sm} | **Pending Proposals**: ${(proposals ?? []).length}\n`];

  filtered.forEach((c: any) => {
    const cl = Array.isArray(c.clients) ? c.clients[0] : c.clients;
    const flags: string[] = [];
    if (c.safe_mode) flags.push("SAFE MODE");
    if ((c.health_score ?? 0) < 40) flags.push("CRITICAL");
    if (c.ignored) flags.push("IGNORED");
    const f = flags.length ? ` [${flags.join(", ")}]` : "";
    s.push(`**${cl?.name ?? "Unknown"}**${f}\n  Health: ${c.health_score ?? "N/A"} (${c.health_label ?? "N/A"}) | Budget: $${c.current_daily_budget ?? "N/A"}/day\n  Leads 7d: ${c.leads_last_7d ?? 0} (prior: ${c.leads_prior_7d ?? 0}) | Booked 7d: ${c.booked_calls_last_7d ?? 0} | Rate: ${c.booked_call_rate_7d ?? "N/A"}%${c.safe_mode ? `\n  Safe Mode: ${c.safe_mode_reason}` : ""}${c.ai_summary ? `\n  AI: ${c.ai_summary}` : ""}`);
  });

  if (proposals?.length) {
    s.push(`\n### Pending AI Proposals (${proposals.length})`);
    proposals.forEach((p: any) => s.push(`  ${p.proposed_action_type}: $${p.current_daily_budget ?? "?"} → $${p.proposed_daily_budget ?? "?"} (${p.delta_pct ?? "?"}%) | ${p.ai_summary ?? "No summary"}`));
  }

  return s.join("\n");
}

async function getLeadPipeline(sb: any, params: any): Promise<string> {
  const period = params.period ?? "last_30d";
  const now = new Date();
  let startDate: string;
  if (period === "last_7d") { const d = new Date(now); d.setDate(d.getDate() - 7); startDate = d.toISOString().split("T")[0]; }
  else if (period === "mtd") startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  else { const d = new Date(now); d.setDate(d.getDate() - 30); startDate = d.toISOString().split("T")[0]; }

  let lq = sb.from("leads").select("id, agent_id, status, delivery_status, booked_call_at, submitted_at, approved_at, issued_at").gte("created_at", startDate);
  if (params.client_id) lq = lq.eq("agent_id", params.client_id);
  const { data: leads, error } = await lq;
  if (error) return `Error: ${error.message}`;
  if (!leads?.length) return `No leads found for period: ${period}`;

  const sc: Record<string, number> = {};
  const dc: Record<string, number> = {};
  let booked = 0, submitted = 0, approved = 0, issued = 0;
  leads.forEach((l: any) => {
    sc[l.status ?? "unknown"] = (sc[l.status ?? "unknown"] || 0) + 1;
    dc[l.delivery_status ?? "unknown"] = (dc[l.delivery_status ?? "unknown"] || 0) + 1;
    if (l.booked_call_at) booked++;
    if (l.submitted_at) submitted++;
    if (l.approved_at) approved++;
    if (l.issued_at) issued++;
  });

  let kq = sb.from("client_kpi_daily").select("ad_spend, leads, cpl, booked_calls, apps_submitted, issued_paid").gte("date", startDate);
  if (params.client_id) kq = kq.eq("client_id", params.client_id);
  const { data: kpis } = await kq;
  let tSpend = 0, tLeads = 0, tBooked = 0;
  (kpis ?? []).forEach((k: any) => { tSpend += k.ad_spend ?? 0; tLeads += k.leads ?? 0; tBooked += k.booked_calls ?? 0; });
  const cpl = tLeads > 0 ? tSpend / tLeads : 0;
  const bRate = tLeads > 0 ? (tBooked / tLeads) * 100 : 0;

  const s: string[] = [`## Lead Pipeline (${period} — ${leads.length} leads)\n`];
  s.push(`### Funnel\n  Leads: ${leads.length} → Booked: ${booked} → Submitted: ${submitted} → Approved: ${approved} → Issued: ${issued}`);
  s.push(`\n### By Status\n${Object.entries(sc).sort(([, a], [, b]) => b - a).map(([k, v]) => `  ${k}: ${v}`).join("\n")}`);
  s.push(`\n### Delivery\n${Object.entries(dc).sort(([, a], [, b]) => b - a).map(([k, v]) => `  ${k}: ${v}`).join("\n")}`);
  s.push(`\n### KPIs\n  Ad Spend: $${tSpend.toFixed(2)} | CPL: $${cpl.toFixed(2)} | Booked Rate: ${bRate.toFixed(1)}%`);

  if (!params.client_id) {
    const ac: Record<string, number> = {};
    leads.forEach((l: any) => { ac[l.agent_id] = (ac[l.agent_id] || 0) + 1; });
    const ids = Object.keys(ac);
    const { data: cls } = await sb.from("clients").select("id, name").in("id", ids);
    const nm: Record<string, string> = {};
    (cls ?? []).forEach((c: any) => { nm[c.id] = c.name; });
    s.push(`\n### By Agent (top 15)\n${Object.entries(ac).sort(([, a], [, b]) => b - a).slice(0, 15).map(([id, ct]) => `  ${nm[id] ?? id}: ${ct}`).join("\n")}`);
  }

  return s.join("\n");
}

async function getCommunications(sb: any, params: any): Promise<string> {
  const limit = params.limit ?? 20;
  const type = params.type ?? "all";
  const s: string[] = [`## Communications\n`];

  if (type === "all" || type === "chat") {
    let cq = sb.from("chat_conversations").select(`id, client_id, status, unread_count_admin, unread_count_client, last_message_at, last_message_preview, clients!inner(name)`).order("last_message_at", { ascending: false, nullsFirst: false }).limit(limit);
    if (params.client_id) cq = cq.eq("client_id", params.client_id);
    const { data: convos } = await cq;
    const unread = (convos ?? []).reduce((a: number, c: any) => a + (c.unread_count_admin ?? 0), 0);
    s.push(`### Chat (${(convos ?? []).length} conversations, ${unread} unread)\n`);
    (convos ?? []).forEach((c: any) => {
      const cl = Array.isArray(c.clients) ? c.clients[0] : c.clients;
      const uf = c.unread_count_admin > 0 ? ` [${c.unread_count_admin} UNREAD]` : "";
      s.push(`**${cl?.name ?? "Unknown"}**${uf}\n  "${c.last_message_preview ?? "N/A"}" (${c.last_message_at ?? "N/A"})`);
    });

    if (params.client_id && convos?.length) {
      const { data: msgs } = await sb.from("chat_messages").select("sender_name, sender_role, message, created_at").eq("conversation_id", convos[0].id).order("created_at", { ascending: false }).limit(10);
      if (msgs?.length) {
        s.push(`\n#### Recent Messages`);
        msgs.reverse().forEach((m: any) => s.push(`  [${m.sender_role}] ${m.sender_name}: ${m.message.substring(0, 200)} (${m.created_at})`));
      }
    }
  }

  if (type === "all" || type === "tickets") {
    let tq = sb.from("support_tickets").select(`id, ticket_number, client_id, subject, category, priority, status, sla_deadline, created_at, clients(name)`).order("created_at", { ascending: false }).limit(limit);
    if (params.client_id) tq = tq.eq("client_id", params.client_id);
    const { data: tickets } = await tq;
    const open = (tickets ?? []).filter((t: any) => t.status === "open" || t.status === "in_progress").length;
    const urgent = (tickets ?? []).filter((t: any) => (t.priority === "high" || t.priority === "urgent") && (t.status === "open" || t.status === "in_progress")).length;
    s.push(`\n### Tickets (${(tickets ?? []).length} shown, ${open} open, ${urgent} urgent)\n`);
    (tickets ?? []).forEach((t: any) => {
      const cl = Array.isArray(t.clients) ? t.clients[0] : t.clients;
      const uf = t.priority === "urgent" || t.priority === "high" ? ` [${t.priority.toUpperCase()}]` : "";
      s.push(`**#${t.ticket_number}**${uf} — ${t.subject}\n  ${cl?.name ?? "Unknown"} | ${t.category} | ${t.status}${t.sla_deadline ? ` | SLA: ${t.sla_deadline}` : ""}`);
    });
  }

  return s.join("\n");
}

async function getFinancialProjections(sb: any, _params: any): Promise<string> {
  const [clientsRes, recurringRes, walletsRes, creditsRes] = await Promise.all([
    sb.from("clients").select("id, name, management_fee, monthly_ad_spend, commission_contract_percent, referred_by_client_id, status").is("deleted_at", null).in("status", ["active", "Active"]),
    sb.from("billing_records").select("client_name, amount, billing_type, recurrence_type, next_due_date").eq("is_recurring_parent", true).not("next_due_date", "is", null),
    sb.from("client_wallets").select("client_id, auto_charge_amount, clients!inner(name)").eq("auto_billing_enabled", true),
    sb.from("client_credits").select("remaining_balance").gt("remaining_balance", 0),
  ]);

  const clients = clientsRes.data ?? [];
  const mgmt = clients.reduce((a: number, c: any) => a + (c.management_fee ?? 0), 0);
  const adSpend = clients.reduce((a: number, c: any) => a + (c.monthly_ad_spend ?? 0), 0);
  const recMgmt = (recurringRes.data ?? []).filter((r: any) => r.billing_type === "management").reduce((a: number, r: any) => a + (r.amount ?? 0), 0);
  const recAd = (recurringRes.data ?? []).filter((r: any) => r.billing_type === "ad_spend").reduce((a: number, r: any) => a + (r.amount ?? 0), 0);

  let commissions = 0;
  const commDetails: string[] = [];
  clients.forEach((c: any) => {
    if (c.commission_contract_percent > 0 && c.referred_by_client_id) {
      const amt = (c.management_fee ?? 0) * (c.commission_contract_percent / 100);
      commissions += amt;
      const ref = clients.find((r: any) => r.id === c.referred_by_client_id);
      commDetails.push(`  ${c.name} → ${ref?.name ?? "Unknown"}: $${amt.toFixed(2)}/mo`);
    }
  });

  const autoRecharge = (walletsRes.data ?? []).reduce((a: number, w: any) => a + (w.auto_charge_amount ?? 0), 0);
  const creditLiab = (creditsRes.data ?? []).reduce((a: number, c: any) => a + (c.remaining_balance ?? 0), 0);

  const s: string[] = [`## Financial Projections\n`];
  s.push(`### Revenue (Monthly)\n  Management Fees: $${mgmt.toFixed(2)} (${clients.length} clients)\n  Ad Spend Billing: $${adSpend.toFixed(2)}\n  **Total**: $${(mgmt + adSpend).toFixed(2)}`);
  s.push(`\n### Recurring (next cycle)\n  Management: $${recMgmt.toFixed(2)} | Ad Spend: $${recAd.toFixed(2)} | **Total**: $${(recMgmt + recAd).toFixed(2)}`);
  s.push(`\n### Expenses\n  Commissions: $${commissions.toFixed(2)}/mo\n  Credits (liability): $${creditLiab.toFixed(2)}\n  Auto-Recharge Pool: $${autoRecharge.toFixed(2)}`);
  if (commDetails.length) { s.push(`\n### Commission Breakdown`); commDetails.forEach(d => s.push(d)); }
  s.push(`\n### Net Monthly\n  Revenue: $${(mgmt + adSpend).toFixed(2)} - Commissions: $${commissions.toFixed(2)} = **$${(mgmt + adSpend - commissions).toFixed(2)}**`);

  return s.join("\n");
}

async function getAlerts(sb: any): Promise<string> {
  interface Alert { severity: string; category: string; message: string; client?: string; }
  const alerts: Alert[] = [];

  const [lowRes, overdueRes, failedRes, safeRes, unhealthyRes, urgentRes, proposalRes, stalledRes, computedBalances] = await Promise.all([
    sb.from("client_wallets").select("client_id, low_balance_threshold, clients!inner(name, ads_live)"),
    sb.from("billing_records").select("client_name, amount, billing_type, due_date").eq("status", "overdue"),
    sb.from("client_wallets").select("client_id, last_charge_failed_at, clients!inner(name)").not("last_charge_failed_at", "is", null),
    sb.from("campaigns").select("client_id, safe_mode_reason, clients!inner(name)").eq("safe_mode", true),
    sb.from("campaigns").select("client_id, health_score, health_label, reason_codes, clients!inner(name)").lt("health_score", 40).eq("safe_mode", false),
    sb.from("support_tickets").select("ticket_number, subject, priority, clients(name)").in("priority", ["high", "urgent"]).in("status", ["open", "in_progress"]),
    sb.from("proposals").select("proposed_action_type, ai_summary, created_at, clients!inner(name)").eq("status", "pending"),
    sb.from("clients").select("name, onboarding_status, created_at").is("deleted_at", null).in("onboarding_status", ["pending", "in_progress", "error"]),
    getAllComputedBalances(sb),
  ]);

  const computedBalancesMap = computedBalances.balances;
  (lowRes.data ?? []).forEach((w: any) => {
    const computed = computedBalancesMap.get(w.client_id);
    const bal = computed?.remainingBalance ?? 0;
    const thresh = w.low_balance_threshold ?? 100;
    if (bal < thresh) {
      const cl = Array.isArray(w.clients) ? w.clients[0] : w.clients;
      alerts.push({ severity: cl?.ads_live ? "critical" : "warning", category: "Low Wallet", message: `$${bal.toFixed(2)} (threshold: $${thresh})${cl?.ads_live ? " — ADS LIVE" : ""}`, client: cl?.name });
    }
  });
  (overdueRes.data ?? []).forEach((o: any) => alerts.push({ severity: "critical", category: "Overdue Invoice", message: `$${o.amount} ${o.billing_type} — due ${o.due_date ?? "N/A"}`, client: o.client_name }));
  (failedRes.data ?? []).forEach((f: any) => { const cl = Array.isArray(f.clients) ? f.clients[0] : f.clients; alerts.push({ severity: "critical", category: "Failed Charge", message: `Failed: ${f.last_charge_failed_at}`, client: cl?.name }); });
  (safeRes.data ?? []).forEach((c: any) => { const cl = Array.isArray(c.clients) ? c.clients[0] : c.clients; alerts.push({ severity: "warning", category: "Safe Mode", message: c.safe_mode_reason ?? "Unknown", client: cl?.name }); });
  (unhealthyRes.data ?? []).forEach((c: any) => { const cl = Array.isArray(c.clients) ? c.clients[0] : c.clients; alerts.push({ severity: "warning", category: "Unhealthy Campaign", message: `Score: ${c.health_score} — ${(c.reason_codes ?? []).join(", ")}`, client: cl?.name }); });
  (urgentRes.data ?? []).forEach((t: any) => { const cl = Array.isArray(t.clients) ? t.clients[0] : t.clients; alerts.push({ severity: t.priority === "urgent" ? "critical" : "warning", category: "Support Ticket", message: `#${t.ticket_number}: ${t.subject} [${t.priority}]`, client: cl?.name }); });
  (proposalRes.data ?? []).forEach((p: any) => { const cl = Array.isArray(p.clients) ? p.clients[0] : p.clients; alerts.push({ severity: "info", category: "Pending Proposal", message: `${p.proposed_action_type}: ${p.ai_summary ?? "No summary"}`, client: cl?.name }); });
  (stalledRes.data ?? []).forEach((c: any) => alerts.push({ severity: c.onboarding_status === "error" ? "critical" : "info", category: "Stalled Onboarding", message: `Status: ${c.onboarding_status}`, client: c.name }));

  const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => (order[a.severity] ?? 2) - (order[b.severity] ?? 2));

  const cr = alerts.filter(a => a.severity === "critical").length;
  const wr = alerts.filter(a => a.severity === "warning").length;
  const inf = alerts.filter(a => a.severity === "info").length;

  const s: string[] = [`## System Alerts\n`, `**Critical**: ${cr} | **Warning**: ${wr} | **Info**: ${inf} | **Total**: ${alerts.length}\n`];
  if (!alerts.length) { s.push("All clear — no active alerts."); return s.join("\n"); }

  const grouped: Record<string, Alert[]> = {};
  alerts.forEach(a => { if (!grouped[a.category]) grouped[a.category] = []; grouped[a.category].push(a); });
  for (const [cat, items] of Object.entries(grouped)) {
    s.push(`### ${cat} (${items.length}) [${items[0].severity.toUpperCase()}]`);
    items.forEach(a => s.push(`  ${a.client ?? "System"}: ${a.message}`));
    s.push("");
  }

  return s.join("\n");
}

// ===================== NEW READ/MONITOR TOOLS =====================

async function getResponseTimes(sb: any, _params: any): Promise<string> {
  const since = new Date();
  since.setHours(since.getHours() - 24);

  const { data: msgs, error } = await sb
    .from("chat_messages")
    .select("id, conversation_id, sender_role, sender_name, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) return `Error: ${error.message}`;
  if (!msgs?.length) return JSON.stringify({ average_minutes: null, pairs: [], message: "No messages in last 24h" });

  // Get conversation -> client mapping
  const convoIds = [...new Set(msgs.map((m: any) => m.conversation_id))];
  const { data: convos } = await sb
    .from("chat_conversations")
    .select("id, client_id, clients!inner(name)")
    .in("id", convoIds);
  const convoMap: Record<string, any> = {};
  (convos ?? []).forEach((c: any) => { convoMap[c.id] = c; });

  // Group messages by conversation
  const byConvo: Record<string, any[]> = {};
  msgs.forEach((m: any) => {
    if (!byConvo[m.conversation_id]) byConvo[m.conversation_id] = [];
    byConvo[m.conversation_id].push(m);
  });

  const pairs: any[] = [];
  for (const [convoId, convoMsgs] of Object.entries(byConvo)) {
    const conv = convoMap[convoId];
    const clientName = Array.isArray(conv?.clients) ? conv.clients[0]?.name : conv?.clients?.name;
    for (let i = 0; i < convoMsgs.length; i++) {
      if (convoMsgs[i].sender_role === 'client') {
        // Find next admin reply
        for (let j = i + 1; j < convoMsgs.length; j++) {
          if (convoMsgs[j].sender_role === 'admin') {
            const clientTime = new Date(convoMsgs[i].created_at).getTime();
            const adminTime = new Date(convoMsgs[j].created_at).getTime();
            const gapMinutes = Math.round((adminTime - clientTime) / 60000);
            pairs.push({
              client_name: clientName ?? "Unknown",
              client_id: conv?.client_id,
              conversation_id: convoId,
              client_message_at: convoMsgs[i].created_at,
              admin_reply_at: convoMsgs[j].created_at,
              gap_minutes: gapMinutes,
              admin_responder: convoMsgs[j].sender_name,
            });
            break;
          }
        }
      }
    }
  }

  const avgMinutes = pairs.length > 0 ? Math.round(pairs.reduce((a, p) => a + p.gap_minutes, 0) / pairs.length) : null;

  return JSON.stringify({
    average_minutes: avgMinutes,
    total_pairs: pairs.length,
    pairs: pairs.sort((a, b) => new Date(b.client_message_at).getTime() - new Date(a.client_message_at).getTime()),
  });
}

async function getUnreadOverview(sb: any): Promise<string> {
  const { data: convos, error } = await sb
    .from("chat_conversations")
    .select("id, client_id, unread_count_admin, last_message_at, clients!inner(name)")
    .gt("unread_count_admin", 0)
    .order("last_message_at", { ascending: true });

  if (error) return `Error: ${error.message}`;
  if (!convos?.length) return JSON.stringify({ conversations: [], total_unread: 0 });

  const now = Date.now();
  const results = convos.map((c: any) => {
    const cl = Array.isArray(c.clients) ? c.clients[0] : c.clients;
    const lastAt = c.last_message_at ? new Date(c.last_message_at).getTime() : now;
    return {
      client_name: cl?.name ?? "Unknown",
      client_id: c.client_id,
      conversation_id: c.id,
      unread_count: c.unread_count_admin,
      last_message_at: c.last_message_at,
      waiting_minutes: Math.round((now - lastAt) / 60000),
    };
  }).sort((a: any, b: any) => b.waiting_minutes - a.waiting_minutes);

  return JSON.stringify({
    total_unread: results.reduce((a: number, r: any) => a + r.unread_count, 0),
    conversations: results,
  });
}

async function getTicketWorkload(sb: any): Promise<string> {
  const { data: tickets, error } = await sb
    .from("support_tickets")
    .select("id, ticket_number, subject, category, priority, status, created_at, last_reply_at, sla_deadline, assigned_to, clients(name, id)")
    .not("status", "in", '("resolved","closed")')
    .order("created_at", { ascending: true });

  if (error) return `Error: ${error.message}`;
  if (!tickets?.length) return JSON.stringify({ agents: {}, total_open: 0 });

  // Get agent names
  const agentIds = [...new Set(tickets.map((t: any) => t.assigned_to).filter(Boolean))];
  const agentMap: Record<string, string> = {};
  if (agentIds.length) {
    const { data: profiles } = await sb.from("profiles").select("id, name").in("id", agentIds);
    (profiles ?? []).forEach((p: any) => { agentMap[p.id] = p.name; });
  }

  const now = Date.now();
  const grouped: Record<string, any[]> = {};
  tickets.forEach((t: any) => {
    const cl = Array.isArray(t.clients) ? t.clients[0] : t.clients;
    const agentName = t.assigned_to ? (agentMap[t.assigned_to] ?? t.assigned_to) : "Unassigned";
    if (!grouped[agentName]) grouped[agentName] = [];
    grouped[agentName].push({
      ticket_id: t.id,
      ticket_number: t.ticket_number,
      subject: t.subject,
      client_name: cl?.name ?? "Unknown",
      client_id: cl?.id,
      priority: t.priority,
      status: t.status,
      category: t.category,
      created_at: t.created_at,
      last_reply_at: t.last_reply_at,
      sla_deadline: t.sla_deadline,
      hours_since_creation: Math.round((now - new Date(t.created_at).getTime()) / 3600000 * 10) / 10,
      hours_since_last_reply: t.last_reply_at ? Math.round((now - new Date(t.last_reply_at).getTime()) / 3600000 * 10) / 10 : null,
    });
  });

  return JSON.stringify({ total_open: tickets.length, agents: grouped });
}

async function getOnboardingProgress(sb: any): Promise<string> {
  const { data: items, error } = await sb
    .from("onboarding_checklist")
    .select("id, client_id, category, item_key, item_label, status, updated_at, verified, verified_at, clients!inner(name, onboarding_status)")
    .not("clients.onboarding_status", "in", '("completed","complete")');

  if (error) return `Error: ${error.message}`;
  if (!items?.length) return JSON.stringify({ clients: [] });

  const byClient: Record<string, any> = {};
  items.forEach((i: any) => {
    const cl = Array.isArray(i.clients) ? i.clients[0] : i.clients;
    const cid = i.client_id;
    if (!byClient[cid]) {
      byClient[cid] = { client_name: cl?.name, client_id: cid, categories: {}, total: 0, completed: 0, last_activity: null };
    }
    const cat = i.category;
    if (!byClient[cid].categories[cat]) byClient[cid].categories[cat] = { total: 0, completed: 0, items: [] };
    byClient[cid].categories[cat].total++;
    byClient[cid].total++;
    if (i.status === 'yes') {
      byClient[cid].categories[cat].completed++;
      byClient[cid].completed++;
    } else {
      byClient[cid].categories[cat].items.push({ item_key: i.item_key, label: i.item_label });
    }
    if (i.updated_at && (!byClient[cid].last_activity || i.updated_at > byClient[cid].last_activity)) {
      byClient[cid].last_activity = i.updated_at;
    }
  });

  const result = Object.values(byClient).map((c: any) => ({
    ...c,
    completion_pct: Math.round((c.completed / c.total) * 100),
  }));

  return JSON.stringify({ clients: result });
}

async function getDailyDashboard(sb: any): Promise<string> {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const hours48Ago = new Date(now.getTime() - 48 * 3600000).toISOString();
  const hours24Ago = new Date(now.getTime() - 24 * 3600000).toISOString();

  const [unreadRes, ticketRes, walletRes, onboardingRes, adsOffRes, failedPayRes, msgRes, clientCountRes, billingRes, computedBals] = await Promise.all([
    // Unread conversations
    sb.from("chat_conversations").select("id, client_id, unread_count_admin, last_message_at, clients!inner(name)").gt("unread_count_admin", 0),
    // Open tickets with SLA
    sb.from("support_tickets").select("id, ticket_number, subject, priority, status, sla_deadline, assigned_to, created_at, clients(name, id)").in("status", ["open", "in_progress"]),
    // All wallets
    sb.from("client_wallets").select("client_id, low_balance_threshold, last_charge_failed_at, last_auto_charge_at, clients!inner(name, status)"),
    // Onboarding progress
    sb.from("onboarding_checklist").select("client_id, status, updated_at, clients!inner(name, onboarding_status)").not("clients.onboarding_status", "in", '("completed","complete")'),
    // Ads off
    sb.from("clients").select("id, name, status, ads_live").eq("ads_live", false).is("deleted_at", null).in("status", ["active", "Active"]),
    // Failed payments in 48h
    sb.from("client_wallets").select("client_id, last_charge_failed_at, clients!inner(name)").gte("last_charge_failed_at", hours48Ago),
    // Messages for response time calc
    sb.from("chat_messages").select("conversation_id, sender_role, created_at").gte("created_at", hours24Ago).order("created_at", { ascending: true }),
    // Active client count
    sb.from("clients").select("id", { count: "exact", head: true }).is("deleted_at", null).in("status", ["active", "Active"]),
    // Revenue this month
    sb.from("billing_records").select("amount, status").gte("created_at", new Date(now.getFullYear(), now.getMonth(), 1).toISOString()).eq("status", "paid"),
    // Computed balances
    getAllComputedBalances(sb),
  ]);

  const computedBalsMap = computedBals.balances;
  // Calculate today's average response time from messages
  const msgs = msgRes.data ?? [];
  const byConvo: Record<string, any[]> = {};
  msgs.forEach((m: any) => {
    if (!byConvo[m.conversation_id]) byConvo[m.conversation_id] = [];
    byConvo[m.conversation_id].push(m);
  });
  let totalGap = 0, pairCount = 0;
  for (const convoMsgs of Object.values(byConvo)) {
    for (let i = 0; i < convoMsgs.length; i++) {
      if (convoMsgs[i].sender_role === 'client') {
        for (let j = i + 1; j < convoMsgs.length; j++) {
          if (convoMsgs[j].sender_role === 'admin') {
            totalGap += (new Date(convoMsgs[j].created_at).getTime() - new Date(convoMsgs[i].created_at).getTime()) / 60000;
            pairCount++;
            break;
          }
        }
      }
    }
  }

  const nowMs = Date.now();

  const dashboard = {
    timestamp: now.toISOString(),
    unread_conversations: (unreadRes.data ?? []).map((c: any) => {
      const cl = Array.isArray(c.clients) ? c.clients[0] : c.clients;
      return {
        client_name: cl?.name, client_id: c.client_id, unread_count: c.unread_count_admin,
        last_message_at: c.last_message_at,
        waiting_minutes: c.last_message_at ? Math.round((nowMs - new Date(c.last_message_at).getTime()) / 60000) : null,
      };
    }),
    open_tickets: (ticketRes.data ?? []).map((t: any) => {
      const cl = Array.isArray(t.clients) ? t.clients[0] : t.clients;
      return {
        ticket_number: t.ticket_number, subject: t.subject, priority: t.priority, status: t.status,
        sla_deadline: t.sla_deadline, assigned_to: t.assigned_to, created_at: t.created_at,
        client_name: cl?.name, client_id: cl?.id,
        hours_open: Math.round((nowMs - new Date(t.created_at).getTime()) / 3600000 * 10) / 10,
      };
    }),
    wallets: (walletRes.data ?? []).map((w: any) => {
      const cl = Array.isArray(w.clients) ? w.clients[0] : w.clients;
      const computed = computedBalsMap.get(w.client_id);
      return {
        client_name: cl?.name, client_id: w.client_id, client_status: cl?.status,
        balance: computed?.remainingBalance ?? 0, raw_balance: computed?.rawBalance ?? 0,
        performance_fee_pct: computedBals.performancePercentage,
        threshold: w.low_balance_threshold,
        last_charge_failed_at: w.last_charge_failed_at, last_auto_charge_at: w.last_auto_charge_at,
      };
    }),
    onboarding: (() => {
      const byClient: Record<string, any> = {};
      (onboardingRes.data ?? []).forEach((i: any) => {
        const cl = Array.isArray(i.clients) ? i.clients[0] : i.clients;
        const cid = i.client_id;
        if (!byClient[cid]) byClient[cid] = { client_name: cl?.name, client_id: cid, total: 0, completed: 0, last_activity: null };
        byClient[cid].total++;
        if (i.status === 'yes') byClient[cid].completed++;
        if (i.updated_at && (!byClient[cid].last_activity || i.updated_at > byClient[cid].last_activity)) byClient[cid].last_activity = i.updated_at;
      });
      return Object.values(byClient).map((c: any) => ({ ...c, completion_pct: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0 }));
    })(),
    ads_off_active_clients: (adsOffRes.data ?? []).map((c: any) => ({ client_name: c.name, client_id: c.id, status: c.status })),
    failed_payments_48h: (failedPayRes.data ?? []).map((w: any) => {
      const cl = Array.isArray(w.clients) ? w.clients[0] : w.clients;
      return { client_name: cl?.name, client_id: w.client_id, failed_at: w.last_charge_failed_at };
    }),
    average_response_time_minutes: pairCount > 0 ? Math.round(totalGap / pairCount) : null,
    active_client_count: clientCountRes.count ?? 0,
    revenue_collected_this_month: (billingRes.data ?? []).reduce((a: number, b: any) => a + (b.amount ?? 0), 0),
  };

  return JSON.stringify(dashboard);
}

async function runQuery(sb: any, params: any): Promise<string> {
  const query = (params.query ?? "").trim();
  if (!query) return JSON.stringify({ error: "No query provided" });
  if (!/^SELECT/i.test(query)) return JSON.stringify({ error: "Only SELECT queries are allowed" });
  if (query.includes(";")) return JSON.stringify({ error: "Semicolons are not allowed in queries" });

  const { data, error } = await sb.rpc("run_readonly_query", { query_text: query });
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ rows: data, count: Array.isArray(data) ? data.length : 0 });
}

function listTools(): string {
  const tools = [
    // Existing read
    { name: "list_clients", type: "read", description: "List all clients with wallet balances", params: "limit?, status?" },
    { name: "get_client_detail", type: "read", description: "Deep dive on one client with billing, campaigns, leads, chat, tickets, wallet, agreement, onboarding", params: "client_id or client_name" },
    { name: "search_clients", type: "read", description: "Search clients by name/email with filters", params: "query?, status?, billing_status?, onboarding_status?" },
    { name: "get_billing_summary", type: "read", description: "Billing totals, overdue invoices, recurring charges, credits", params: "period? (mtd/last_30d/last_quarter)" },
    { name: "get_ad_spend_overview", type: "read", description: "All wallets with balances, runway, auto-billing status", params: "only_low_balance?, only_auto_billing?" },
    { name: "get_campaign_health", type: "read", description: "Campaign health scores, safe mode, AI proposals", params: "client_id?, only_unhealthy?" },
    { name: "get_lead_pipeline", type: "read", description: "Lead funnel stats by period", params: "period? (last_7d/mtd/last_30d), client_id?" },
    { name: "get_communications", type: "read", description: "Chat conversations and support tickets", params: "client_id?, type? (all/chat/tickets), limit?" },
    { name: "get_financial_projections", type: "read", description: "Revenue projections, commissions, recurring billing", params: "none" },
    { name: "get_alerts", type: "read", description: "System alerts: low wallets, overdue invoices, failed charges, safe mode, unhealthy campaigns, urgent tickets", params: "none" },
    // New read/monitor
    { name: "get_response_times", type: "read", description: "Admin response times for last 24h — all client-message-to-admin-reply pairs with gap in minutes", params: "none" },
    { name: "get_unread_overview", type: "read", description: "All conversations with unread admin messages, waiting times", params: "none" },
    { name: "get_ticket_workload", type: "read", description: "All open tickets grouped by assigned agent with SLA deadlines", params: "none" },
    { name: "get_onboarding_progress", type: "read", description: "Onboarding checklist completion by client and category for active onboardings", params: "none" },
    { name: "get_daily_dashboard", type: "read", description: "Single-call heartbeat: unreads, tickets, wallets, onboarding, ads status, failed payments, response times, revenue", params: "none" },
    { name: "run_query", type: "read", description: "Execute ad-hoc read-only SQL SELECT query against the database", params: "query (SQL string)" },
    { name: "list_tools", type: "meta", description: "List all available tools with descriptions and params", params: "none" },
    // Deep read
    { name: "get_client_history", type: "read", description: "Unified chronological timeline of all events for a client (messages, tickets, payments, budget changes, etc.)", params: "client_id, days? (default 30)" },
    { name: "get_billing_overview", type: "read", description: "Billing data across ALL clients: fee status, payments, wallets, failed charges, summary totals", params: "period? (current_month/last_30_days)" },
    { name: "get_onboarding_detail", type: "read", description: "Full onboarding checklist for a single client with item-level details and verification status", params: "client_id" },
    { name: "bulk_query", type: "meta", description: "Execute up to 10 tool calls in a single request", params: "calls: [{tool, params}, ...]" },
    // Write tools
    { name: "send_message", type: "write", description: "Send a chat message to a client", params: "client_id, message, sender_name?" },
    { name: "update_ticket", type: "write", description: "Update ticket status/priority/assignment", params: "ticket_id, status?, priority?, assigned_to?" },
    { name: "add_ticket_reply", type: "write", description: "Add a reply to a support ticket", params: "ticket_id, message, sender_name?" },
    { name: "create_ticket", type: "write", description: "Create a new support ticket", params: "client_id, title, description, priority?, assigned_to?, category?" },
    { name: "update_client", type: "write", description: "Update whitelisted client fields (status, notes, ads_live, etc.)", params: "client_id, updates: {field: value}" },
    { name: "update_ad_budget", type: "write", description: "Change Google Ads daily budget for a client", params: "client_id, new_daily_budget" },
    { name: "update_ad_targeting", type: "write", description: "Change Google Ads geographic targeting states", params: "client_id, states: [state_codes]" },
    { name: "toggle_ads", type: "write", description: "Pause or enable a client's Google Ads campaign", params: "client_id, action (pause/enable)" },
    { name: "send_internal_message", type: "write", description: "Send a DM to a team member in the admin chat", params: "recipient_user_id, message, sender_name?" },
    { name: "send_slack_webhook", type: "write", description: "Post a message to Slack via webhook", params: "message, channel_override?" },
    { name: "verify_onboarding_item", type: "write", description: "Mark an onboarding checklist item as verified/unverified by AI", params: "item_id, verified, verification_notes?" },
    // MCC Monitoring
    { name: "get_mcc_billing_summary", type: "read", description: "MCC billing account health: billing setup status, account budgets, MTD spend, active campaigns", params: "none" },
    { name: "get_mcc_policy_violations", type: "read", description: "Disapproved/restricted ads across all campaigns with client cross-reference", params: "none" },
    { name: "get_mcc_spend_overview", type: "read", description: "Campaign-level spend metrics across MCC with client mapping and daily breakdown", params: "period? (today/yesterday/last_7d/mtd/last_30d)" },
    // Pipeline Analytics
    { name: "get_pipeline_metrics", type: "read", description: "Comprehensive funnel: booking/show/submission/approval/close rates, premiums, ROI, per-client breakdown", params: "period? (last_7d/last_14d/mtd/last_30d/last_90d), client_id?" },
    { name: "get_client_funnel_detail", type: "read", description: "Deep client funnel: lead-level visibility, conversion time averages, drop-off analysis", params: "client_id (required), period?" },
    { name: "get_funnel_benchmarks", type: "read", description: "Portfolio averages and top performers with optional client comparison and percentile ranking", params: "client_id?, period?" },
    // Financial / Bank
    { name: "get_bank_balances", type: "read", description: "All connected bank/credit card accounts with current and available balances (via Plaid)", params: "none" },
    { name: "get_recent_transactions", type: "read", description: "Recent bank/credit card transactions with categories and merchant info", params: "days? (default 30), limit? (default 50), bank_account_id?, merchant?, min_amount?, category_id?" },
    { name: "get_cash_flow_summary", type: "read", description: "Cash position, burn rate, runway, top merchants, ad spend vs revenue analysis", params: "days? (default 30)" },
    // Stripe
    { name: "get_stripe_balance", type: "read", description: "Current Stripe balance across both accounts (management + ad spend) — available, pending, and connect reserved", params: "none" },
    { name: "get_stripe_customers", type: "read", description: "List or search Stripe customers across both accounts", params: "account? (management/ad_spend/both), email?, limit? (default 20)" },
    { name: "get_stripe_invoices", type: "read", description: "Recent Stripe invoices with payment status, amounts, and line items", params: "account? (management/ad_spend/both), status? (paid/open/draft/uncollectible/void), customer_id?, limit? (default 20)" },
    { name: "get_stripe_subscriptions", type: "read", description: "Active Stripe subscriptions with MRR and billing details", params: "account? (management/ad_spend/both), status? (active/past_due/canceled/all), limit? (default 20)" },
    { name: "get_stripe_charges", type: "read", description: "Recent Stripe charges/payments with refund info", params: "account? (management/ad_spend/both), customer_id?, limit? (default 20)" },
    { name: "get_stripe_payouts", type: "read", description: "Stripe payout history — amounts sent to your bank", params: "account? (management/ad_spend/both), limit? (default 10)" },
  ];
  return JSON.stringify(tools);
}

// ===================== NEW DEEP READ TOOLS =====================

async function getClientHistory(sb: any, params: any): Promise<string> {
  if (!params.client_id) return JSON.stringify({ error: "client_id is required" });
  const days = params.days ?? 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const [msgsRes, ticketsRes, repliesRes, billingRes, auditRes, checklistRes] = await Promise.all([
    sb.from("chat_messages").select("id, sender_name, sender_role, message, created_at, conversation_id")
      .gte("created_at", sinceStr)
      .in("conversation_id",
        sb.from("chat_conversations").select("id").eq("client_id", params.client_id)
      ).order("created_at", { ascending: true }).limit(200),
    sb.from("support_tickets").select("id, ticket_number, subject, status, priority, created_at, resolved_at")
      .eq("client_id", params.client_id).gte("created_at", sinceStr),
    sb.from("ticket_replies").select("id, ticket_id, message, is_admin_reply, created_at")
      .gte("created_at", sinceStr)
      .in("ticket_id", sb.from("support_tickets").select("id").eq("client_id", params.client_id)),
    sb.from("billing_records").select("id, amount, billing_type, status, paid_at, created_at")
      .eq("client_id", params.client_id).gte("created_at", sinceStr),
    sb.from("mcp_audit_log").select("id, tool, params, result, created_at")
      .gte("created_at", sinceStr)
      .filter("params->>client_id", "eq", params.client_id).limit(50),
    sb.from("onboarding_checklist").select("id, item_key, item_label, status, checked_at, category")
      .eq("client_id", params.client_id).not("checked_at", "is", null).gte("checked_at", sinceStr),
  ]);

  const timeline: any[] = [];

  // Chat messages - need to handle subquery differently
  // First get conversation IDs for this client
  const { data: clientConvos } = await sb.from("chat_conversations").select("id").eq("client_id", params.client_id);
  const convoIds = (clientConvos ?? []).map((c: any) => c.id);

  if (convoIds.length) {
    const { data: chatMsgs } = await sb.from("chat_messages")
      .select("id, sender_name, sender_role, message, created_at")
      .in("conversation_id", convoIds)
      .gte("created_at", sinceStr)
      .order("created_at", { ascending: true }).limit(200);

    (chatMsgs ?? []).forEach((m: any) => {
      timeline.push({
        timestamp: m.created_at,
        event_type: m.sender_role === 'client' ? 'message_received' : 'message_sent',
        summary: `${m.sender_name}: ${m.message.substring(0, 150)}`,
      });
    });
  }

  (ticketsRes.data ?? []).forEach((t: any) => {
    timeline.push({ timestamp: t.created_at, event_type: 'ticket_created', summary: `#${t.ticket_number}: ${t.subject} [${t.priority}]` });
    if (t.resolved_at) timeline.push({ timestamp: t.resolved_at, event_type: 'ticket_resolved', summary: `#${t.ticket_number}: ${t.subject}` });
  });

  // Ticket replies
  const ticketIds = (ticketsRes.data ?? []).map((t: any) => t.id);
  if (ticketIds.length) {
    const { data: replies } = await sb.from("ticket_replies")
      .select("id, ticket_id, message, is_admin_reply, created_at")
      .in("ticket_id", ticketIds).gte("created_at", sinceStr);
    (replies ?? []).forEach((r: any) => {
      timeline.push({ timestamp: r.created_at, event_type: r.is_admin_reply ? 'ticket_reply_admin' : 'ticket_reply_client', summary: r.message.substring(0, 150) });
    });
  }

  (billingRes.data ?? []).forEach((b: any) => {
    timeline.push({ timestamp: b.created_at, event_type: 'billing_created', summary: `${b.billing_type}: $${b.amount} [${b.status}]` });
    if (b.paid_at) timeline.push({ timestamp: b.paid_at, event_type: 'payment_collected', summary: `${b.billing_type}: $${b.amount} paid` });
  });

  (auditRes.data ?? []).forEach((a: any) => {
    timeline.push({ timestamp: a.created_at, event_type: 'ai_action', summary: `${a.tool}: ${(a.result ?? '').substring(0, 150)}` });
  });

  (checklistRes.data ?? []).forEach((c: any) => {
    timeline.push({ timestamp: c.checked_at, event_type: 'onboarding_step_completed', summary: `[${c.category}] ${c.item_label}` });
  });

  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return JSON.stringify({ client_id: params.client_id, days, total_events: timeline.length, timeline });
}

async function getBillingOverview(sb: any, params: any): Promise<string> {
  const now = new Date();
  const period = params.period ?? "current_month";
  let startDate: string;
  if (period === "last_30_days") {
    const d = new Date(now); d.setDate(d.getDate() - 30);
    startDate = d.toISOString().split("T")[0];
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  }

  const [clientsRes, billingRes, walletsRes, spendRes, computedBals] = await Promise.all([
    sb.from("clients").select("id, name, management_fee, billing_status, status").is("deleted_at", null),
    sb.from("billing_records").select("client_id, client_name, amount, billing_type, status, due_date, paid_at, created_at").gte("created_at", startDate),
    sb.from("client_wallets").select("client_id, last_charge_failed_at, last_auto_charge_at"),
    sb.from("ad_spend_daily").select("client_id, cost").gte("spend_date", startDate),
    getAllComputedBalances(sb),
  ]);

  const { balances: computedBalsMap2, performancePercentage: billingPerfPct } = computedBals;
  const clients = clientsRes.data ?? [];
  const billing = billingRes.data ?? [];
  const wallets = walletsRes.data ?? [];
  const spend = spendRes.data ?? [];

  const walletMap: Record<string, any> = {};
  wallets.forEach((w: any) => { walletMap[w.client_id] = w; });
  const spendMap: Record<string, number> = {};
  spend.forEach((s2: any) => { spendMap[s2.client_id] = (spendMap[s2.client_id] || 0) + (s2.cost ?? 0); });
  const billingByClient: Record<string, any[]> = {};
  billing.forEach((b: any) => {
    if (!billingByClient[b.client_id]) billingByClient[b.client_id] = [];
    billingByClient[b.client_id].push(b);
  });

  let totalRevenue = 0, totalOutstanding = 0, totalWallets = 0, overdueCount = 0;
  const clientData = clients.map((c: any) => {
    const bills = billingByClient[c.id] ?? [];
    const w = walletMap[c.id];
    const computed = computedBalsMap2.get(c.id);
    const bal = computed?.remainingBalance ?? 0;
    const paidBills = bills.filter((b: any) => b.status === 'paid');
    const overdueBills = bills.filter((b: any) => b.status === 'overdue');
    const lastPaid = paidBills.sort((a: any, b: any) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())[0];
    const totalPaid = paidBills.reduce((a: number, b: any) => a + (b.amount ?? 0), 0);
    const totalOverdue = overdueBills.reduce((a: number, b: any) => a + (b.amount ?? 0), 0);

    totalRevenue += totalPaid;
    totalOutstanding += totalOverdue;
    totalWallets += bal;
    if (overdueBills.length) overdueCount++;

    return {
      client_name: c.name, client_id: c.id, status: c.status,
      management_fee: c.management_fee, billing_status: c.billing_status,
      last_payment_date: lastPaid?.paid_at ?? null,
      last_payment_amount: lastPaid?.amount ?? null,
      total_paid_this_period: totalPaid,
      total_overdue: totalOverdue,
      overdue_bills: overdueBills.length,
      wallet_balance: bal,
      total_ad_spend: spendMap[c.id] ?? 0,
      failed_charge_at: w?.last_charge_failed_at ?? null,
    };
  });

  return JSON.stringify({
    period,
    summary: { total_revenue_collected: totalRevenue, total_outstanding: totalOutstanding, total_wallet_balances: totalWallets, clients_with_overdue: overdueCount, total_clients: clients.length },
    clients: clientData,
  });
}

async function getOnboardingDetail(sb: any, params: any): Promise<string> {
  if (!params.client_id) return JSON.stringify({ error: "client_id is required" });

  const { data: items, error } = await sb
    .from("onboarding_checklist")
    .select("id, category, item_key, item_label, status, notes, checked_at, checked_by, display_order, verified, verified_at, verification_notes, updated_at")
    .eq("client_id", params.client_id)
    .order("category").order("display_order");

  if (error) return JSON.stringify({ error: error.message });
  if (!items?.length) return JSON.stringify({ client_id: params.client_id, categories: {}, message: "No checklist items found" });

  const categories: Record<string, any> = {};
  items.forEach((i: any) => {
    if (!categories[i.category]) categories[i.category] = { total: 0, completed: 0, items: [] };
    categories[i.category].total++;
    if (i.status === 'yes') categories[i.category].completed++;
    categories[i.category].items.push({
      item_id: i.id, item_key: i.item_key, label: i.item_label,
      completed: i.status === 'yes', checked_at: i.checked_at, notes: i.notes,
      verified: i.verified ?? false, verified_at: i.verified_at, verification_notes: i.verification_notes,
    });
  });

  const total = items.length;
  const completed = items.filter((i: any) => i.status === 'yes').length;

  return JSON.stringify({
    client_id: params.client_id,
    overall_completion_pct: Math.round((completed / total) * 100),
    total_items: total,
    completed_items: completed,
    categories,
  });
}

async function bulkQuery(sb: any, params: any): Promise<string> {
  const calls = params.calls;
  if (!Array.isArray(calls)) return JSON.stringify({ error: "calls must be an array of {tool, params}" });
  if (calls.length > 10) return JSON.stringify({ error: "Maximum 10 calls per bulk request" });

  // We need to re-invoke the tool logic inline
  const results = await Promise.allSettled(
    calls.map(async (call: any) => {
      const { tool: t, params: p } = call;
      switch (t) {
        case "list_clients": return { tool: t, success: true, result: await listClients(sb, p ?? {}) };
        case "get_client_detail": return { tool: t, success: true, result: await getClientDetail(sb, p ?? {}) };
        case "search_clients": return { tool: t, success: true, result: await searchClients(sb, p ?? {}) };
        case "get_billing_summary": return { tool: t, success: true, result: await getBillingSummary(sb, p ?? {}) };
        case "get_ad_spend_overview": return { tool: t, success: true, result: await getAdSpendOverview(sb, p ?? {}) };
        case "get_campaign_health": return { tool: t, success: true, result: await getCampaignHealth(sb, p ?? {}) };
        case "get_lead_pipeline": return { tool: t, success: true, result: await getLeadPipeline(sb, p ?? {}) };
        case "get_communications": return { tool: t, success: true, result: await getCommunications(sb, p ?? {}) };
        case "get_financial_projections": return { tool: t, success: true, result: await getFinancialProjections(sb, p ?? {}) };
        case "get_alerts": return { tool: t, success: true, result: await getAlerts(sb) };
        case "get_response_times": return { tool: t, success: true, result: await getResponseTimes(sb, p ?? {}) };
        case "get_unread_overview": return { tool: t, success: true, result: await getUnreadOverview(sb) };
        case "get_ticket_workload": return { tool: t, success: true, result: await getTicketWorkload(sb) };
        case "get_onboarding_progress": return { tool: t, success: true, result: await getOnboardingProgress(sb) };
        case "get_daily_dashboard": return { tool: t, success: true, result: await getDailyDashboard(sb) };
        case "run_query": return { tool: t, success: true, result: await runQuery(sb, p ?? {}) };
        case "get_client_history": return { tool: t, success: true, result: await getClientHistory(sb, p ?? {}) };
        case "get_billing_overview": return { tool: t, success: true, result: await getBillingOverview(sb, p ?? {}) };
        case "get_onboarding_detail": return { tool: t, success: true, result: await getOnboardingDetail(sb, p ?? {}) };
        case "get_mcc_billing_summary": return { tool: t, success: true, result: await getMccBillingSummary(sb) };
        case "get_mcc_policy_violations": return { tool: t, success: true, result: await getMccPolicyViolations(sb) };
        case "get_mcc_spend_overview": return { tool: t, success: true, result: await getMccSpendOverview(sb, p ?? {}) };
        case "get_pipeline_metrics": return { tool: t, success: true, result: await getPipelineMetrics(sb, p ?? {}) };
        case "get_client_funnel_detail": return { tool: t, success: true, result: await getClientFunnelDetail(sb, p ?? {}) };
        case "get_funnel_benchmarks": return { tool: t, success: true, result: await getFunnelBenchmarks(sb, p ?? {}) };
        default: return { tool: t, success: false, error: `Unknown tool: ${t}` };
      }
    })
  );

  return JSON.stringify(results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return { tool: calls[i].tool, success: false, error: (r.reason as Error).message };
  }));
}

// ===================== WRITE TOOLS =====================

async function sendMessage(sb: any, params: any): Promise<string> {
  if (!params.client_id) return "Error: client_id is required";
  if (!params.message) return "Error: message is required";

  const senderName = params.sender_name ?? "OpenClaw AI";
  const systemId = "00000000-0000-0000-0000-000000000000";

  // Get or create conversation
  const { data: convoId, error: convoErr } = await sb.rpc("get_or_create_conversation", { p_client_id: params.client_id });
  if (convoErr) return `Error: ${convoErr.message}`;

  // Insert message — the update_conversation_on_message trigger handles metadata
  const { data: msg, error: msgErr } = await sb.from("chat_messages").insert({
    conversation_id: convoId,
    sender_id: systemId,
    sender_name: senderName,
    sender_role: "admin",
    message: params.message,
  }).select("id").single();

  if (msgErr) return `Error: ${msgErr.message}`;

  const result = `Message sent to client ${params.client_id} in conversation ${convoId}. Message ID: ${msg.id}`;
  await logAudit(sb, "send_message", params, result);
  return result;
}

async function updateTicket(sb: any, params: any): Promise<string> {
  if (!params.ticket_id) return "Error: ticket_id is required";

  const updates: any = {};
  if (params.status) {
    updates.status = params.status;
    if (params.status === "resolved" || params.status === "closed") updates.resolved_at = new Date().toISOString();
    if ((params.status === "open" || params.status === "in_progress") && !params.keep_resolved_at) updates.resolved_at = null;
  }
  if (params.priority) updates.priority = params.priority;
  if (params.assigned_to) {
    updates.assigned_to = params.assigned_to;
    updates.assigned_at = new Date().toISOString();
  }

  if (Object.keys(updates).length === 0) return "Error: No updates provided. Pass status, priority, or assigned_to.";

  const { error } = await sb.from("support_tickets").update(updates).eq("id", params.ticket_id);
  if (error) return `Error: ${error.message}`;

  const result = `Ticket ${params.ticket_id} updated: ${JSON.stringify(updates)}`;
  await logAudit(sb, "update_ticket", params, result);
  return result;
}

async function addTicketReply(sb: any, params: any): Promise<string> {
  if (!params.ticket_id) return "Error: ticket_id is required";
  if (!params.message) return "Error: message is required";

  const systemId = "00000000-0000-0000-0000-000000000000";

  const { error: replyErr } = await sb.from("ticket_replies").insert({
    ticket_id: params.ticket_id,
    user_id: systemId,
    message: params.message,
    is_admin_reply: true,
  });
  if (replyErr) return `Error: ${replyErr.message}`;

  // Update last_reply_at on the ticket
  await sb.from("support_tickets").update({ last_reply_at: new Date().toISOString() }).eq("id", params.ticket_id);

  const result = `Reply added to ticket ${params.ticket_id}`;
  await logAudit(sb, "add_ticket_reply", params, result);
  return result;
}

async function createTicket(sb: any, params: any): Promise<string> {
  if (!params.client_id) return "Error: client_id is required";
  if (!params.title) return "Error: title is required";
  if (!params.description) return "Error: description is required";

  const { data: ticket, error } = await sb.from("support_tickets").insert({
    client_id: params.client_id,
    subject: params.title,
    message: params.description,
    priority: params.priority ?? "medium",
    assigned_to: params.assigned_to ?? null,
    category: params.category ?? "general",
    status: "open",
  }).select("id, ticket_number").single();

  if (error) return `Error: ${error.message}`;

  const result = `Ticket created: #${ticket.ticket_number} (${ticket.id})`;
  await logAudit(sb, "create_ticket", params, result);
  return result;
}

const CLIENT_FIELD_WHITELIST = ["status", "onboarding_status", "billing_status", "notes", "success_manager_name", "target_states", "nps_score", "ads_live"];

async function updateClientTool(sb: any, params: any): Promise<string> {
  if (!params.client_id) return "Error: client_id is required";
  if (!params.updates || typeof params.updates !== "object") return "Error: updates must be an object";

  const disallowed = Object.keys(params.updates).filter(k => !CLIENT_FIELD_WHITELIST.includes(k));
  if (disallowed.length) return `Error: Fields not allowed: ${disallowed.join(", ")}. Allowed: ${CLIENT_FIELD_WHITELIST.join(", ")}`;

  const { error } = await sb.from("clients").update({ ...params.updates, updated_at: new Date().toISOString() }).eq("id", params.client_id);
  if (error) return `Error: ${error.message}`;

  const result = `Client ${params.client_id} updated: ${JSON.stringify(params.updates)}`;
  await logAudit(sb, "update_client", params, result);
  return result;
}

async function updateAdBudget(sb: any, params: any): Promise<string> {
  if (!params.client_id) return "Error: client_id is required";
  if (typeof params.new_daily_budget !== "number" || params.new_daily_budget < 0.01) return "Error: new_daily_budget must be a number >= 0.01";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const resp = await fetch(`${supabaseUrl}/functions/v1/update-google-ads-budget`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: params.client_id, newDailyBudget: params.new_daily_budget }),
  });

  const data = await resp.json();
  const result = data.success ? `Budget updated to $${params.new_daily_budget}/day for client ${params.client_id}` : `Error: ${data.error ?? "Unknown error"}`;
  await logAudit(sb, "update_ad_budget", params, result);
  return result;
}

async function updateAdTargeting(sb: any, params: any): Promise<string> {
  if (!params.client_id) return "Error: client_id is required";
  if (!Array.isArray(params.states) || !params.states.length) return "Error: states must be a non-empty array of state codes";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const resp = await fetch(`${supabaseUrl}/functions/v1/update-google-ads-targeting`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: params.client_id, states: params.states }),
  });

  const data = await resp.json();
  const result = data.success ? `Targeting updated to ${params.states.join(", ")} for client ${params.client_id}` : `Error: ${data.error ?? "Unknown error"}`;
  await logAudit(sb, "update_ad_targeting", params, result);
  return result;
}

// ── toggle_ads: Google Ads campaign enable/pause ──
// Follows the exact same OAuth pattern as update-google-ads-budget

async function getGoogleAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_ADS_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_ADS_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_ADS_REFRESH_TOKEN");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken!,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Google access token: ${error}`);
  }
  const data = await response.json();
  return data.access_token;
}

async function toggleAds(sb: any, params: any): Promise<string> {
  if (!params.client_id) return "Error: client_id is required";
  if (!params.action || !["pause", "enable"].includes(params.action)) return 'Error: action must be "pause" or "enable"';

  // Get client's Google Campaign ID
  const { data: client, error: clientError } = await sb
    .from("clients")
    .select("id, name, google_campaign_id")
    .eq("id", params.client_id)
    .single();

  if (clientError || !client) return `Error: Client not found: ${clientError?.message}`;
  if (!client.google_campaign_id) return "Error: Client does not have a Google Campaign ID configured";

  const rawField = String(client.google_campaign_id).trim();
  if (!rawField.includes(":")) return "Error: google_campaign_id must be in format customerAccountId:campaignId";

  const [customerPart, campaignPart] = rawField.split(":");
  const customerId = customerPart.replace(/\D/g, "");
  const campaignId = campaignPart.replace(/\D/g, "");
  if (!customerId || !campaignId) return "Error: Invalid google_campaign_id value";

  const developerToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");
  const mccCustomerId = Deno.env.get("GOOGLE_ADS_MCC_CUSTOMER_ID");
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, "").replace(/\D/g, "");

  try {
    const accessToken = await getGoogleAccessToken();

    const newStatus = params.action === "pause" ? "PAUSED" : "ENABLED";
    const resourceName = `customers/${customerId}/campaigns/${campaignId}`;

    const mutateResponse = await fetch(
      `https://googleads.googleapis.com/v22/customers/${customerId}/campaigns:mutate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": developerToken!,
          "login-customer-id": cleanMccId!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operations: [
            {
              update: {
                resourceName,
                status: newStatus,
              },
              updateMask: "status",
            },
          ],
        }),
      }
    );

    if (!mutateResponse.ok) {
      const raw = await mutateResponse.text();
      console.error("toggle_ads mutate error:", raw);
      let msg: string | null = null;
      try {
        const parsed = JSON.parse(raw);
        msg = parsed?.error?.message || parsed?.[0]?.error?.message || null;
      } catch { /* non-JSON */ }
      const result = `Error: Failed to ${params.action} campaign: ${msg || raw.slice(0, 500)}`;
      await logAudit(sb, "toggle_ads", params, result);
      return result;
    }

    // Update local database
    const adsLive = params.action === "enable";
    await sb.from("clients").update({ ads_live: adsLive, updated_at: new Date().toISOString() }).eq("id", params.client_id);

    const result = `Campaign ${params.action === "pause" ? "paused" : "enabled"} for ${client.name} (${resourceName}). ads_live set to ${adsLive}`;
    await logAudit(sb, "toggle_ads", params, result);
    return result;
  } catch (e) {
    const result = `Error: ${(e as Error).message}`;
    await logAudit(sb, "toggle_ads", params, result);
    return result;
  }
}

async function sendInternalMessage(sb: any, params: any): Promise<string> {
  if (!params.recipient_user_id) return "Error: recipient_user_id is required";
  if (!params.message) return "Error: message is required";

  // Use a system user ID for OpenClaw
  const systemId = "00000000-0000-0000-0000-000000000000";
  const p1 = systemId < params.recipient_user_id ? systemId : params.recipient_user_id;
  const p2 = systemId < params.recipient_user_id ? params.recipient_user_id : systemId;

  // Find or create DM conversation
  let { data: convo } = await sb
    .from("admin_dm_conversations")
    .select("id")
    .eq("participant1_id", p1)
    .eq("participant2_id", p2)
    .limit(1)
    .single();

  if (!convo) {
    const { data: newConvo, error: createErr } = await sb
      .from("admin_dm_conversations")
      .insert({ participant1_id: p1, participant2_id: p2 })
      .select("id")
      .single();
    if (createErr) return `Error creating DM conversation: ${createErr.message}`;
    convo = newConvo;
  }

  // Insert message — the update_admin_dm_on_message trigger handles metadata
  const { error: msgErr } = await sb.from("admin_dm_messages").insert({
    conversation_id: convo.id,
    sender_id: systemId,
    message: params.message,
  });

  if (msgErr) return `Error: ${msgErr.message}`;

  const result = `Internal message sent to user ${params.recipient_user_id}`;
  await logAudit(sb, "send_internal_message", params, result);
  return result;
}

async function sendSlackWebhook(_params: any): Promise<string> {
  if (!_params.message) return "Error: message is required";

  const channel = _params.channel_override ?? "chat";
  let webhookUrl: string | undefined;

  if (channel === "ads" || channel === "ads_manager") {
    webhookUrl = Deno.env.get("SLACK_ADS_MANAGER_WEBHOOK_URL");
  } else {
    webhookUrl = Deno.env.get("SLACK_CHAT_WEBHOOK_URL");
  }

  if (!webhookUrl) return `Error: No Slack webhook URL configured for channel "${channel}"`;

  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: _params.message }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      return `Error: Slack webhook returned ${resp.status}: ${body}`;
    }

    return `Slack message sent to ${channel} channel`;
  } catch (e) {
    return `Error: ${(e as Error).message}`;
  }
}

async function verifyOnboardingItem(sb: any, params: any): Promise<string> {
  if (!params.item_id) return "Error: item_id is required";
  if (typeof params.verified !== "boolean") return "Error: verified must be a boolean";

  const updates: any = {
    verified: params.verified,
    verified_at: params.verified ? new Date().toISOString() : null,
    verification_notes: params.verification_notes ?? null,
  };

  const { error } = await sb.from("onboarding_checklist").update(updates).eq("id", params.item_id);
  if (error) return `Error: ${error.message}`;

  const result = `Onboarding item ${params.item_id} ${params.verified ? "verified" : "unverified"}${params.verification_notes ? `: ${params.verification_notes}` : ""}`;
  await logAudit(sb, "verify_onboarding_item", params, result);
  return result;
}

// ===================== DATE PERIOD HELPER =====================

function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  switch (period) {
    case "today": return { start: today, end: today };
    case "yesterday": { const d = new Date(now); d.setDate(d.getDate() - 1); const y = fmt(d); return { start: y, end: y }; }
    case "last_7d": { const d = new Date(now); d.setDate(d.getDate() - 7); return { start: fmt(d), end: today }; }
    case "last_14d": { const d = new Date(now); d.setDate(d.getDate() - 14); return { start: fmt(d), end: today }; }
    case "mtd": return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, end: today };
    case "last_30d": { const d = new Date(now); d.setDate(d.getDate() - 30); return { start: fmt(d), end: today }; }
    case "last_90d": { const d = new Date(now); d.setDate(d.getDate() - 90); return { start: fmt(d), end: today }; }
    default: return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, end: today };
  }
}

const GAQL_DATE_MAP: Record<string, string> = {
  today: "TODAY", yesterday: "YESTERDAY", last_7d: "LAST_7_DAYS", mtd: "THIS_MONTH", last_30d: "LAST_30_DAYS",
};

function getGoogleAdsHeaders(accessToken: string): Record<string, string> {
  const developerToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN")!;
  const mccCustomerId = Deno.env.get("GOOGLE_ADS_MCC_CUSTOMER_ID")?.replace(/\D/g, "") ?? "";
  return {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    "login-customer-id": mccCustomerId,
    "Content-Type": "application/json",
  };
}

async function gaqlQuery(accessToken: string, customerId: string, query: string): Promise<any[]> {
  const headers = getGoogleAdsHeaders(accessToken);
  const cid = customerId.replace(/\D/g, "");
  const resp = await fetch(`https://googleads.googleapis.com/v22/customers/${cid}/googleAds:searchStream`, {
    method: "POST", headers, body: JSON.stringify({ query }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Google Ads API ${resp.status}: ${txt.substring(0, 500)}`);
  }
  const data = await resp.json();
  // searchStream returns array of batches each with results
  return (data ?? []).flatMap((batch: any) => batch.results ?? []);
}

// ===================== MCC MONITORING TOOLS =====================

async function getMccBillingSummary(sb: any): Promise<string> {
  const mccId = Deno.env.get("GOOGLE_ADS_MCC_CUSTOMER_ID")?.replace(/\D/g, "") ?? "";
  try {
    const accessToken = await getGoogleAccessToken();

    // Parallel: billing setup, account budgets, MTD campaign spend
    const [billingResults, budgetResults, spendResults] = await Promise.allSettled([
      gaqlQuery(accessToken, mccId, `SELECT billing_setup.status, billing_setup.payments_account_info.payments_account_id, billing_setup.payments_account_info.payments_account_name FROM billing_setup`),
      gaqlQuery(accessToken, mccId, `SELECT account_budget.status, account_budget.amount_served_micros, account_budget.approved_spending_limit_micros FROM account_budget`),
      gaqlQuery(accessToken, mccId, `SELECT campaign.id, campaign.status, metrics.cost_micros FROM campaign WHERE segments.date DURING THIS_MONTH AND campaign.status = 'ENABLED'`),
    ]);

    const billing = billingResults.status === "fulfilled" ? billingResults.value : [];
    const budgets = budgetResults.status === "fulfilled" ? budgetResults.value : [];
    const spend = spendResults.status === "fulfilled" ? spendResults.value : [];

    const totalSpendMtd = spend.reduce((s: number, r: any) => s + Number(r.metrics?.costMicros ?? 0), 0) / 1_000_000;
    const activeCampaigns = new Set(spend.map((r: any) => r.campaign?.id)).size;

    const budgetInfo = budgets.map((b: any) => ({
      status: b.accountBudget?.status,
      amount_served: Number(b.accountBudget?.amountServedMicros ?? 0) / 1_000_000,
      approved_limit: b.accountBudget?.approvedSpendingLimitMicros ? Number(b.accountBudget.approvedSpendingLimitMicros) / 1_000_000 : null,
    }));

    const billingInfo = billing.map((b: any) => ({
      status: b.billingSetup?.status,
      payments_account_id: b.billingSetup?.paymentsAccountInfo?.paymentsAccountId,
      payments_account_name: b.billingSetup?.paymentsAccountInfo?.paymentsAccountName,
    }));

    return JSON.stringify({
      mcc_customer_id: mccId,
      billing_setups: billingInfo,
      account_budgets: budgetInfo,
      total_spend_mtd: Math.round(totalSpendMtd * 100) / 100,
      active_campaigns_count: activeCampaigns,
      errors: [
        billingResults.status === "rejected" ? `billing_setup: ${(billingResults.reason as Error).message}` : null,
        budgetResults.status === "rejected" ? `account_budget: ${(budgetResults.reason as Error).message}` : null,
        spendResults.status === "rejected" ? `campaign_spend: ${(spendResults.reason as Error).message}` : null,
      ].filter(Boolean),
    });
  } catch (e) {
    return JSON.stringify({ error: (e as Error).message });
  }
}

async function getMccPolicyViolations(sb: any): Promise<string> {
  const mccId = Deno.env.get("GOOGLE_ADS_MCC_CUSTOMER_ID")?.replace(/\D/g, "") ?? "";
  try {
    const accessToken = await getGoogleAccessToken();

    // Get all client campaigns for cross-referencing
    const { data: campaigns } = await sb.from("campaigns").select("google_campaign_id, client_id, clients!inner(name)");
    const campaignToClient: Record<string, string> = {};
    (campaigns ?? []).forEach((c: any) => {
      if (c.google_campaign_id) {
        const parts = c.google_campaign_id.split(":");
        if (parts.length === 2) campaignToClient[parts[1]] = (Array.isArray(c.clients) ? c.clients[0] : c.clients)?.name ?? "Unknown";
      }
    });

    // Query for policy violations across MCC managed accounts
    // We need to query each child account — get list of accessible customers first
    const custResults = await gaqlQuery(accessToken, mccId, `SELECT customer_client.id, customer_client.descriptive_name, customer_client.status FROM customer_client WHERE customer_client.manager = false AND customer_client.status = 'ENABLED'`);

    const violations: any[] = [];
    for (const cust of custResults) {
      const childId = cust.customerClient?.id;
      if (!childId) continue;
      try {
        const adResults = await gaqlQuery(accessToken, childId, `SELECT campaign.id, campaign.name, ad_group_ad.policy_summary.approval_status, ad_group_ad.policy_summary.policy_topic_entries, ad_group_ad.policy_summary.review_status FROM ad_group_ad WHERE ad_group_ad.policy_summary.approval_status IN ('DISAPPROVED', 'AREA_OF_INTEREST_ONLY')`);
        adResults.forEach((r: any) => {
          const campId = r.campaign?.id;
          violations.push({
            campaign_id: campId,
            campaign_name: r.campaign?.name,
            client_name: campaignToClient[campId] ?? cust.customerClient?.descriptiveName ?? "Unknown",
            customer_id: childId,
            approval_status: r.adGroupAd?.policySummary?.approvalStatus,
            review_status: r.adGroupAd?.policySummary?.reviewStatus,
            policy_topics: (r.adGroupAd?.policySummary?.policyTopicEntries ?? []).map((e: any) => ({ topic: e.topic, type: e.type })),
            severity: r.adGroupAd?.policySummary?.approvalStatus === "DISAPPROVED" ? "CRITICAL" : "WARNING",
          });
        });
      } catch (e) {
        console.error(`Policy check failed for customer ${childId}:`, (e as Error).message);
      }
    }

    return JSON.stringify({
      has_violations: violations.length > 0,
      total_violations: violations.length,
      critical_count: violations.filter(v => v.severity === "CRITICAL").length,
      warning_count: violations.filter(v => v.severity === "WARNING").length,
      violations,
    });
  } catch (e) {
    return JSON.stringify({ error: (e as Error).message });
  }
}

async function getMccSpendOverview(sb: any, params: any): Promise<string> {
  const period = params.period ?? "mtd";
  const mccId = Deno.env.get("GOOGLE_ADS_MCC_CUSTOMER_ID")?.replace(/\D/g, "") ?? "";
  const gaqlPeriod = GAQL_DATE_MAP[period] ?? "THIS_MONTH";

  try {
    const accessToken = await getGoogleAccessToken();

    // Get campaign-to-client mapping
    const { data: dbCampaigns } = await sb.from("campaigns").select("google_campaign_id, client_id, clients!inner(name, id)");
    const campaignToClient: Record<string, { name: string; id: string }> = {};
    (dbCampaigns ?? []).forEach((c: any) => {
      if (c.google_campaign_id) {
        const parts = c.google_campaign_id.split(":");
        if (parts.length === 2) {
          const cl = Array.isArray(c.clients) ? c.clients[0] : c.clients;
          campaignToClient[parts[1]] = { name: cl?.name ?? "Unknown", id: cl?.id ?? c.client_id };
        }
      }
    });

    // Get child accounts
    const custResults = await gaqlQuery(accessToken, mccId, `SELECT customer_client.id, customer_client.descriptive_name FROM customer_client WHERE customer_client.manager = false AND customer_client.status = 'ENABLED'`);

    const allRows: any[] = [];
    const dailyMap: Record<string, { spend: number; conversions: number }> = {};

    for (const cust of custResults) {
      const childId = cust.customerClient?.id;
      if (!childId) continue;
      try {
        const results = await gaqlQuery(accessToken, childId, `SELECT segments.date, campaign.id, campaign.name, campaign.status, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.ctr, metrics.average_cpc FROM campaign WHERE segments.date DURING ${gaqlPeriod}`);
        results.forEach((r: any) => {
          const costMicros = Number(r.metrics?.costMicros ?? 0);
          const cost = costMicros / 1_000_000;
          const row = {
            date: r.segments?.date,
            campaign_id: r.campaign?.id,
            campaign_name: r.campaign?.name,
            campaign_status: r.campaign?.status,
            customer_id: childId,
            spend: Math.round(cost * 100) / 100,
            impressions: Number(r.metrics?.impressions ?? 0),
            clicks: Number(r.metrics?.clicks ?? 0),
            conversions: Number(r.metrics?.conversions ?? 0),
            ctr: Number(r.metrics?.ctr ?? 0),
            average_cpc: Number(r.metrics?.averageCpc ?? 0) / 1_000_000,
          };
          allRows.push(row);

          const d = row.date;
          if (d) {
            if (!dailyMap[d]) dailyMap[d] = { spend: 0, conversions: 0 };
            dailyMap[d].spend += row.spend;
            dailyMap[d].conversions += row.conversions;
          }
        });
      } catch (e) {
        console.error(`Spend query failed for customer ${childId}:`, (e as Error).message);
      }
    }

    const totalSpend = allRows.reduce((s, r) => s + r.spend, 0);
    const totalImpressions = allRows.reduce((s, r) => s + r.impressions, 0);
    const totalClicks = allRows.reduce((s, r) => s + r.clicks, 0);
    const totalConversions = allRows.reduce((s, r) => s + r.conversions, 0);
    const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

    // Aggregate by campaign for top spenders
    const byCampaign: Record<string, { spend: number; conversions: number; name: string; campId: string }> = {};
    allRows.forEach(r => {
      const key = r.campaign_id;
      if (!byCampaign[key]) byCampaign[key] = { spend: 0, conversions: 0, name: r.campaign_name, campId: key };
      byCampaign[key].spend += r.spend;
      byCampaign[key].conversions += r.conversions;
    });

    const topSpenders = Object.values(byCampaign)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 15)
      .map(c => {
        const client = campaignToClient[c.campId];
        return {
          client_name: client?.name ?? c.name,
          client_id: client?.id ?? null,
          campaign_id: c.campId,
          spend: Math.round(c.spend * 100) / 100,
          conversions: c.conversions,
          cpa: c.conversions > 0 ? Math.round((c.spend / c.conversions) * 100) / 100 : null,
        };
      });

    const dailyBreakdown = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({ date, spend: Math.round(d.spend * 100) / 100, conversions: d.conversions }));

    const activeCampaigns = new Set(allRows.filter(r => r.campaign_status === "ENABLED").map(r => r.campaign_id)).size;
    const pausedCampaigns = new Set(allRows.filter(r => r.campaign_status === "PAUSED").map(r => r.campaign_id)).size;

    return JSON.stringify({
      period,
      total_spend: Math.round(totalSpend * 100) / 100,
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      total_conversions: totalConversions,
      average_cpc: Math.round(avgCPC * 100) / 100,
      average_ctr: Math.round(avgCTR * 10000) / 10000,
      active_campaigns: activeCampaigns,
      paused_campaigns: pausedCampaigns,
      top_spending_clients: topSpenders,
      daily_breakdown: dailyBreakdown,
    });
  } catch (e) {
    return JSON.stringify({ error: (e as Error).message });
  }
}

// ===================== ENHANCED PIPELINE ANALYTICS TOOLS =====================

async function getPipelineMetrics(sb: any, params: any): Promise<string> {
  const period = params.period ?? "mtd";
  const { start, end } = getDateRange(period);
  const startISO = `${start}T00:00:00`;
  const endISO = `${end}T23:59:59`;

  let leadsQuery = sb.from("leads").select("id, agent_id, status, lead_source, booked_call_at, submitted_at, approved_at, issued_at, target_premium, submitted_premium, approved_premium, issued_premium, created_at").gte("created_at", startISO).lte("created_at", endISO);
  if (params.client_id) leadsQuery = leadsQuery.eq("agent_id", params.client_id);
  const { data: leads, error: leadsErr } = await leadsQuery;
  if (leadsErr) return JSON.stringify({ error: leadsErr.message });

  let spendQuery = sb.from("ad_spend_daily").select("client_id, cost").gte("spend_date", start).lte("spend_date", end);
  if (params.client_id) spendQuery = spendQuery.eq("client_id", params.client_id);
  const { data: spendRows } = await spendQuery;

  let kpiQuery = sb.from("client_kpi_daily").select("client_id, date, leads, booked_calls, apps_submitted, issued_paid, issued_premium, ad_spend").gte("date", start).lte("date", end);
  if (params.client_id) kpiQuery = kpiQuery.eq("client_id", params.client_id);
  const { data: kpiRows } = await kpiQuery;

  const allLeads = leads ?? [];
  const totalLeads = allLeads.length;
  const booked = allLeads.filter((l: any) => l.booked_call_at).length;
  const submitted = allLeads.filter((l: any) => l.submitted_at || l.status === "submitted").length;
  const approved = allLeads.filter((l: any) => l.approved_at || l.status === "approved").length;
  const issued = allLeads.filter((l: any) => l.issued_at || l.status === "issued paid").length;

  const totalTargetPremium = allLeads.reduce((s: number, l: any) => s + Number(l.target_premium || 0), 0);
  const totalSubmittedPremium = allLeads.reduce((s: number, l: any) => s + Number(l.submitted_premium || 0), 0);
  const totalApprovedPremium = allLeads.reduce((s: number, l: any) => s + Number(l.approved_premium || 0), 0);
  const totalIssuedPremium = allLeads.reduce((s: number, l: any) => s + Number(l.issued_premium || 0), 0);

  const bookingRate = totalLeads > 0 ? booked / totalLeads : 0;
  const submissionRate = totalLeads > 0 ? submitted / totalLeads : 0;
  const approvalRate = submitted > 0 ? approved / submitted : 0;
  const closeRate = totalLeads > 0 ? issued / totalLeads : 0;

  // Ad spend
  const spendMap: Record<string, number> = {};
  (spendRows ?? []).forEach((s: any) => { spendMap[s.client_id] = (spendMap[s.client_id] || 0) + Number(s.cost || 0); });
  const totalAdSpend = Object.values(spendMap).reduce((a, b) => a + b, 0);

  const cpl = totalLeads > 0 ? totalAdSpend / totalLeads : 0;
  const cpAppt = booked > 0 ? totalAdSpend / booked : 0;
  const cpApp = submitted > 0 ? totalAdSpend / submitted : 0;
  const cpIssued = issued > 0 ? totalAdSpend / issued : 0;
  const roi = totalAdSpend > 0 ? (totalIssuedPremium - totalAdSpend) / totalAdSpend : 0;

  // Source breakdown
  const bySource: Record<string, number> = {};
  allLeads.forEach((l: any) => { const src = l.lead_source || "unknown"; bySource[src] = (bySource[src] || 0) + 1; });

  // Daily breakdown from KPIs
  const dailyMap: Record<string, any> = {};
  (kpiRows ?? []).forEach((k: any) => {
    const d = k.date;
    if (!dailyMap[d]) dailyMap[d] = { date: d, leads: 0, booked: 0, submitted: 0, issued: 0, issued_premium: 0, ad_spend: 0 };
    dailyMap[d].leads += k.leads ?? 0;
    dailyMap[d].booked += k.booked_calls ?? 0;
    dailyMap[d].submitted += k.apps_submitted ?? 0;
    dailyMap[d].issued += k.issued_paid ?? 0;
    dailyMap[d].issued_premium += Number(k.issued_premium ?? 0);
    dailyMap[d].ad_spend += Number(k.ad_spend ?? 0);
  });
  const dailyBreakdown = Object.values(dailyMap).sort((a: any, b: any) => a.date.localeCompare(b.date));

  const result: any = {
    period, start_date: start, end_date: end,
    total_leads: totalLeads, leads_by_source: bySource,
    appointments_booked: booked, booking_rate: Math.round(bookingRate * 10000) / 10000,
    applications_submitted: submitted, submission_rate: Math.round(submissionRate * 10000) / 10000,
    applications_approved: approved, approval_rate: Math.round(approvalRate * 10000) / 10000,
    policies_issued: issued, close_rate: Math.round(closeRate * 10000) / 10000,
    total_target_premium: Math.round(totalTargetPremium * 100) / 100,
    total_submitted_premium: Math.round(totalSubmittedPremium * 100) / 100,
    total_approved_premium: Math.round(totalApprovedPremium * 100) / 100,
    total_issued_premium: Math.round(totalIssuedPremium * 100) / 100,
    total_ad_spend: Math.round(totalAdSpend * 100) / 100,
    cost_per_lead: Math.round(cpl * 100) / 100,
    cost_per_appointment: Math.round(cpAppt * 100) / 100,
    cost_per_application: Math.round(cpApp * 100) / 100,
    cost_per_issued_policy: Math.round(cpIssued * 100) / 100,
    roi: Math.round(roi * 10000) / 10000,
    daily_breakdown: dailyBreakdown,
  };

  // Per-client breakdown if no client_id filter
  if (!params.client_id) {
    const byClient: Record<string, { leads: number; booked: number; submitted: number; issued: number; issuedPremium: number }> = {};
    allLeads.forEach((l: any) => {
      const cid = l.agent_id;
      if (!byClient[cid]) byClient[cid] = { leads: 0, booked: 0, submitted: 0, issued: 0, issuedPremium: 0 };
      byClient[cid].leads++;
      if (l.booked_call_at) byClient[cid].booked++;
      if (l.submitted_at || l.status === "submitted") byClient[cid].submitted++;
      if (l.issued_at || l.status === "issued paid") { byClient[cid].issued++; byClient[cid].issuedPremium += Number(l.issued_premium || 0); }
    });

    const clientIds = Object.keys(byClient);
    const { data: clients } = await sb.from("clients").select("id, name").in("id", clientIds);
    const nameMap: Record<string, string> = {};
    (clients ?? []).forEach((c: any) => { nameMap[c.id] = c.name; });

    result.by_client = clientIds.map(cid => {
      const c = byClient[cid];
      const spend = spendMap[cid] ?? 0;
      return {
        client_id: cid, client_name: nameMap[cid] ?? cid,
        leads: c.leads, booked: c.booked, booking_rate: c.leads > 0 ? Math.round((c.booked / c.leads) * 10000) / 10000 : 0,
        submitted: c.submitted, issued: c.issued,
        close_rate: c.leads > 0 ? Math.round((c.issued / c.leads) * 10000) / 10000 : 0,
        total_issued_premium: Math.round(c.issuedPremium * 100) / 100,
        ad_spend: Math.round(spend * 100) / 100,
        cpl: c.leads > 0 ? Math.round((spend / c.leads) * 100) / 100 : 0,
        roi: spend > 0 ? Math.round(((c.issuedPremium - spend) / spend) * 10000) / 10000 : 0,
      };
    }).sort((a: any, b: any) => b.leads - a.leads);
  }

  return JSON.stringify(result);
}

async function getClientFunnelDetail(sb: any, params: any): Promise<string> {
  if (!params.client_id) return JSON.stringify({ error: "client_id is required" });
  const period = params.period ?? "last_30d";
  const { start, end } = getDateRange(period);
  const startISO = `${start}T00:00:00`;
  const endISO = `${end}T23:59:59`;

  const [clientRes, leadsRes, spendRes] = await Promise.all([
    sb.from("clients").select("id, name").eq("id", params.client_id).single(),
    sb.from("leads").select("id, first_name, last_name, email, phone, status, lead_source, booked_call_at, submitted_at, approved_at, issued_at, target_premium, submitted_premium, approved_premium, issued_premium, created_at").eq("agent_id", params.client_id).gte("created_at", startISO).lte("created_at", endISO).order("created_at", { ascending: false }).limit(500),
    sb.from("ad_spend_daily").select("cost").eq("client_id", params.client_id).gte("spend_date", start).lte("spend_date", end),
  ]);

  const client = clientRes.data;
  const allLeads = leadsRes.data ?? [];
  const totalAdSpend = (spendRes.data ?? []).reduce((s: number, r: any) => s + Number(r.cost || 0), 0);

  const totalLeads = allLeads.length;
  const booked = allLeads.filter((l: any) => l.booked_call_at).length;
  const submitted = allLeads.filter((l: any) => l.submitted_at || l.status === "submitted").length;
  const approved = allLeads.filter((l: any) => l.approved_at || l.status === "approved").length;
  const issued = allLeads.filter((l: any) => l.issued_at || l.status === "issued paid").length;

  const totalIssuedPremium = allLeads.reduce((s: number, l: any) => s + Number(l.issued_premium || 0), 0);

  // Recent leads (last 50)
  const now = Date.now();
  const recentLeads = allLeads.slice(0, 50).map((l: any) => {
    const daysInFunnel = Math.round((now - new Date(l.created_at).getTime()) / 86400000);
    let currentStage = "new";
    if (l.issued_at || l.status === "issued paid") currentStage = "issued";
    else if (l.approved_at || l.status === "approved") currentStage = "approved";
    else if (l.submitted_at || l.status === "submitted") currentStage = "submitted";
    else if (l.booked_call_at) currentStage = "booked";
    return {
      lead_id: l.id, name: `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim() || "N/A",
      email: l.email, phone: l.phone, status: l.status, lead_source: l.lead_source,
      created_at: l.created_at, booked_at: l.booked_call_at, submitted_at: l.submitted_at,
      approved_at: l.approved_at, issued_at: l.issued_at,
      target_premium: l.target_premium, submitted_premium: l.submitted_premium, issued_premium: l.issued_premium,
      days_in_funnel: daysInFunnel, current_stage: currentStage,
    };
  });

  // Conversion time averages
  const diffs = { leadToBooked: [] as number[], bookedToSubmitted: [] as number[], submittedToApproved: [] as number[], approvedToIssued: [] as number[], leadToIssued: [] as number[] };
  allLeads.forEach((l: any) => {
    const created = new Date(l.created_at).getTime();
    if (l.booked_call_at) diffs.leadToBooked.push((new Date(l.booked_call_at).getTime() - created) / 3600000);
    if (l.booked_call_at && l.submitted_at) diffs.bookedToSubmitted.push((new Date(l.submitted_at).getTime() - new Date(l.booked_call_at).getTime()) / 86400000);
    if (l.submitted_at && l.approved_at) diffs.submittedToApproved.push((new Date(l.approved_at).getTime() - new Date(l.submitted_at).getTime()) / 86400000);
    if (l.approved_at && l.issued_at) diffs.approvedToIssued.push((new Date(l.issued_at).getTime() - new Date(l.approved_at).getTime()) / 86400000);
    if (l.issued_at) diffs.leadToIssued.push((new Date(l.issued_at).getTime() - created) / 86400000);
  });
  const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : null;

  // Drop-off analysis
  const neverBooked = allLeads.filter((l: any) => !l.booked_call_at && l.status === "new").length;
  const bookedNotSubmitted = allLeads.filter((l: any) => l.booked_call_at && !l.submitted_at && !["submitted", "approved", "issued paid"].includes(l.status)).length;
  const submittedNotApproved = allLeads.filter((l: any) => (l.submitted_at || l.status === "submitted") && !l.approved_at && !["approved", "issued paid"].includes(l.status)).length;
  const approvedNotIssued = allLeads.filter((l: any) => (l.approved_at || l.status === "approved") && !l.issued_at && l.status !== "issued paid").length;

  return JSON.stringify({
    client_id: params.client_id, client_name: client?.name ?? "Unknown", period,
    start_date: start, end_date: end,
    total_leads: totalLeads, appointments_booked: booked, applications_submitted: submitted,
    applications_approved: approved, policies_issued: issued,
    booking_rate: totalLeads > 0 ? Math.round((booked / totalLeads) * 10000) / 10000 : 0,
    submission_rate: totalLeads > 0 ? Math.round((submitted / totalLeads) * 10000) / 10000 : 0,
    approval_rate: submitted > 0 ? Math.round((approved / submitted) * 10000) / 10000 : 0,
    close_rate: totalLeads > 0 ? Math.round((issued / totalLeads) * 10000) / 10000 : 0,
    total_issued_premium: Math.round(totalIssuedPremium * 100) / 100,
    total_ad_spend: Math.round(totalAdSpend * 100) / 100,
    cost_per_lead: totalLeads > 0 ? Math.round((totalAdSpend / totalLeads) * 100) / 100 : 0,
    roi: totalAdSpend > 0 ? Math.round(((totalIssuedPremium - totalAdSpend) / totalAdSpend) * 10000) / 10000 : 0,
    recent_leads: recentLeads,
    conversion_time_averages: {
      lead_to_booked_hours: avg(diffs.leadToBooked),
      booked_to_submitted_days: avg(diffs.bookedToSubmitted),
      submitted_to_approved_days: avg(diffs.submittedToApproved),
      approved_to_issued_days: avg(diffs.approvedToIssued),
      lead_to_issued_days: avg(diffs.leadToIssued),
    },
    drop_off_analysis: {
      leads_never_booked: neverBooked,
      leads_booked_not_submitted: bookedNotSubmitted,
      leads_submitted_not_approved: submittedNotApproved,
      leads_approved_not_issued: approvedNotIssued,
    },
  });
}

async function getFunnelBenchmarks(sb: any, params: any): Promise<string> {
  const period = params.period ?? "last_30d";
  const { start, end } = getDateRange(period);
  const startISO = `${start}T00:00:00`;
  const endISO = `${end}T23:59:59`;

  const [leadsRes, spendRes, clientsRes] = await Promise.all([
    sb.from("leads").select("id, agent_id, status, booked_call_at, submitted_at, approved_at, issued_at, issued_premium, created_at").gte("created_at", startISO).lte("created_at", endISO),
    sb.from("ad_spend_daily").select("client_id, cost").gte("spend_date", start).lte("spend_date", end),
    sb.from("clients").select("id, name").is("deleted_at", null),
  ]);

  const allLeads = leadsRes.data ?? [];
  const nameMap: Record<string, string> = {};
  (clientsRes.data ?? []).forEach((c: any) => { nameMap[c.id] = c.name; });
  const spendMap: Record<string, number> = {};
  (spendRes.data ?? []).forEach((s: any) => { spendMap[s.client_id] = (spendMap[s.client_id] || 0) + Number(s.cost || 0); });

  // Per-client metrics
  const byClient: Record<string, { leads: number; booked: number; submitted: number; issued: number; issuedPremium: number }> = {};
  allLeads.forEach((l: any) => {
    const cid = l.agent_id;
    if (!byClient[cid]) byClient[cid] = { leads: 0, booked: 0, submitted: 0, issued: 0, issuedPremium: 0 };
    byClient[cid].leads++;
    if (l.booked_call_at) byClient[cid].booked++;
    if (l.submitted_at || l.status === "submitted") byClient[cid].submitted++;
    if (l.issued_at || l.status === "issued paid") { byClient[cid].issued++; byClient[cid].issuedPremium += Number(l.issued_premium || 0); }
  });

  // Only clients with >0 leads for averages
  const clientMetrics = Object.entries(byClient).filter(([, v]) => v.leads > 0).map(([cid, v]) => {
    const spend = spendMap[cid] ?? 0;
    return {
      client_id: cid, client_name: nameMap[cid] ?? cid,
      booking_rate: v.booked / v.leads,
      submission_rate: v.submitted / v.leads,
      close_rate: v.issued / v.leads,
      average_premium: v.issued > 0 ? v.issuedPremium / v.issued : 0,
      cpl: v.leads > 0 ? spend / v.leads : 0,
      roi: spend > 0 ? (v.issuedPremium - spend) / spend : 0,
      leads: v.leads,
    };
  });

  const avgOf = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const r2 = (n: number) => Math.round(n * 10000) / 10000;

  const portfolioAvg = {
    booking_rate: r2(avgOf(clientMetrics.map(c => c.booking_rate))),
    submission_rate: r2(avgOf(clientMetrics.map(c => c.submission_rate))),
    close_rate: r2(avgOf(clientMetrics.map(c => c.close_rate))),
    average_premium: Math.round(avgOf(clientMetrics.map(c => c.average_premium)) * 100) / 100,
    cpl: Math.round(avgOf(clientMetrics.map(c => c.cpl)) * 100) / 100,
    roi: r2(avgOf(clientMetrics.map(c => c.roi))),
  };

  // Top performers
  const topBy = (metric: string) => {
    const sorted = [...clientMetrics].sort((a, b) => (b as any)[metric] - (a as any)[metric]);
    const top = sorted[0];
    return top ? { client_name: top.client_name, metric, value: r2((top as any)[metric]) } : null;
  };

  const topPerformers = ["booking_rate", "close_rate", "average_premium", "roi"].map(topBy).filter(Boolean);

  const result: any = { period, portfolio_average: portfolioAvg, top_performers: topPerformers, total_clients_with_data: clientMetrics.length };

  // Client comparison if requested
  if (params.client_id) {
    const clientData = clientMetrics.find(c => c.client_id === params.client_id);
    if (clientData) {
      const percentileOf = (metric: string) => {
        const vals = clientMetrics.map(c => (c as any)[metric]).sort((a: number, b: number) => a - b);
        const idx = vals.indexOf((clientData as any)[metric]);
        return Math.round((idx / vals.length) * 100);
      };
      result.client_comparison = {
        client_name: clientData.client_name,
        metrics: {
          booking_rate: { value: r2(clientData.booking_rate), vs_avg: r2(clientData.booking_rate - portfolioAvg.booking_rate), percentile: percentileOf("booking_rate") },
          close_rate: { value: r2(clientData.close_rate), vs_avg: r2(clientData.close_rate - portfolioAvg.close_rate), percentile: percentileOf("close_rate") },
          average_premium: { value: Math.round(clientData.average_premium * 100) / 100, vs_avg: Math.round((clientData.average_premium - portfolioAvg.average_premium) * 100) / 100, percentile: percentileOf("average_premium") },
          roi: { value: r2(clientData.roi), vs_avg: r2(clientData.roi - portfolioAvg.roi), percentile: percentileOf("roi") },
        },
      };
    } else {
      result.client_comparison = { error: "No data for this client in the selected period" };
    }
  }

  return JSON.stringify(result);
}

// ===================== FINANCIAL / BANK TOOLS =====================

async function getBankBalances(sb: any, params: any): Promise<string> {
  const { data: accounts, error } = await sb
    .from("bank_accounts")
    .select("id, account_name, institution_name, account_type, account_subtype, mask, current_balance, available_balance, is_active, last_synced_at, account_category, account_label")
    .eq("is_active", true)
    .order("institution_name");

  if (error) return `Error: ${error.message}`;
  if (!accounts || accounts.length === 0) return "No connected bank accounts found.";

  const s: string[] = ["## Bank Account Balances\n"];

  let totalCurrent = 0;
  let totalAvailable = 0;

  // Group by category first, then institution
  const byCat = new Map<string, any[]>();
  for (const a of accounts) {
    const cat = a.account_category ?? "business";
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat)!.push(a);
    totalCurrent += a.current_balance ?? 0;
    totalAvailable += a.available_balance ?? 0;
  }

  s.push(`**Total Across All Accounts:** Current: $${totalCurrent.toFixed(2)} | Available: $${totalAvailable.toFixed(2)}\n`);

  for (const [cat, catAccounts] of byCat) {
    s.push(`\n## ${cat === "business" ? "🏢 Business Accounts" : "👤 Personal Accounts"}`);
    const byInst = new Map<string, any[]>();
    for (const a of catAccounts) {
      if (!byInst.has(a.institution_name)) byInst.set(a.institution_name, []);
      byInst.get(a.institution_name)!.push(a);
    }
    for (const [inst, accts] of byInst) {
      s.push(`\n### ${inst}`);
      for (const a of accts) {
        const mask = a.mask ? ` (••••${a.mask})` : "";
        const subtype = a.account_subtype ? ` — ${a.account_subtype}` : "";
        const label = a.account_label ? ` [${a.account_label}]` : "";
        const synced = a.last_synced_at ? new Date(a.last_synced_at).toLocaleString() : "Never";
        s.push(`- **${a.account_name}**${mask}${subtype}${label}`);
        s.push(`  Type: ${a.account_type} | Current: $${(a.current_balance ?? 0).toFixed(2)} | Available: $${(a.available_balance ?? 0).toFixed(2)} | Last Synced: ${synced}`);
      }
    }
  }

  return s.join("\n");
}

async function getRecentTransactions(sb: any, params: any): Promise<string> {
  const limit = Math.min(params.limit ?? 50, 200);
  const days = params.days ?? 30;
  const sinceDate = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

  let query = sb
    .from("expenses")
    .select("id, transaction_date, merchant_name, description, amount, currency_code, is_pending, category_id, bank_account_id, plaid_personal_finance_category, is_recurring, bank_accounts(account_name, institution_name, mask), expense_categories(name, color)")
    .gte("transaction_date", sinceDate)
    .order("transaction_date", { ascending: false })
    .limit(limit);

  if (params.bank_account_id) query = query.eq("bank_account_id", params.bank_account_id);
  if (params.merchant) query = query.ilike("merchant_name", `%${params.merchant}%`);
  if (params.min_amount) query = query.gte("amount", params.min_amount);
  if (params.category_id) query = query.eq("category_id", params.category_id);

  const { data: transactions, error } = await query;
  if (error) return `Error: ${error.message}`;
  if (!transactions || transactions.length === 0) return `No transactions found in last ${days} days.`;

  const s: string[] = [`## Recent Transactions (last ${days} days)\n`];

  let totalSpend = 0;
  const byCategory = new Map<string, number>();

  for (const tx of transactions) {
    totalSpend += tx.amount;
    const catName = tx.expense_categories?.name ?? "Uncategorized";
    byCategory.set(catName, (byCategory.get(catName) ?? 0) + tx.amount);
  }

  s.push(`**Total:** $${totalSpend.toFixed(2)} across ${transactions.length} transactions\n`);

  // Category breakdown
  s.push("### By Category");
  const sorted = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  for (const [cat, amt] of sorted) {
    const pct = ((amt / totalSpend) * 100).toFixed(1);
    s.push(`- ${cat}: $${amt.toFixed(2)} (${pct}%)`);
  }

  // Transaction list
  s.push("\n### Transactions");
  for (const tx of transactions) {
    const pending = tx.is_pending ? " [PENDING]" : "";
    const recurring = tx.is_recurring ? " 🔄" : "";
    const cat = tx.expense_categories?.name ?? "";
    const acct = tx.bank_accounts?.account_name ?? "";
    const mask = tx.bank_accounts?.mask ? ` ••••${tx.bank_accounts.mask}` : "";
    s.push(`- ${tx.transaction_date} | $${tx.amount.toFixed(2)}${pending}${recurring} | ${tx.merchant_name ?? tx.description} | ${cat} | ${acct}${mask}`);
  }

  return s.join("\n");
}

async function getCashFlowSummary(sb: any, params: any): Promise<string> {
  const days = params.days ?? 30;
  const sinceDate = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

  // Get bank balances
  const { data: accounts } = await sb
    .from("bank_accounts")
    .select("id, account_name, institution_name, account_type, account_subtype, mask, current_balance, available_balance, account_category")
    .eq("is_active", true);

  // Get transactions for period
  const { data: transactions } = await sb
    .from("expenses")
    .select("amount, transaction_date, is_pending, merchant_name, expense_categories(name)")
    .gte("transaction_date", sinceDate)
    .order("transaction_date", { ascending: false });

  // Get revenue (client wallet deposits)
  const { data: deposits } = await sb
    .from("wallet_transactions")
    .select("amount, created_at, transaction_type")
    .eq("transaction_type", "deposit")
    .gte("created_at", sinceDate + "T00:00:00Z");

  // Get ad spend for the period
  const { data: adSpend } = await sb
    .from("ad_spend_daily")
    .select("cost, spend_date")
    .gte("spend_date", sinceDate);

  const s: string[] = [`## Cash Flow Summary (last ${days} days)\n`];

  // Current Position - split by business vs personal
  const bizAccts = (accounts ?? []).filter((a: any) => (a.account_category ?? 'business') === 'business');
  const persAccts = (accounts ?? []).filter((a: any) => a.account_category === 'personal');

  const sumPosition = (list: any[]) => {
    let checking = 0, credit = 0, savings = 0;
    for (const a of list) {
      const bal = a.current_balance ?? 0;
      if (a.account_type === "credit") credit += bal;
      else if (a.account_subtype === "savings") savings += bal;
      else checking += bal;
    }
    return { checking, savings, credit, net: checking + savings - credit };
  };

  const biz = sumPosition(bizAccts);
  const pers = sumPosition(persAccts);
  const total = sumPosition(accounts ?? []);

  s.push("### 💰 Current Cash Position");
  s.push("**🏢 Business**");
  s.push(`- Checking: $${biz.checking.toFixed(2)} | Savings: $${biz.savings.toFixed(2)} | Credit: $${biz.credit.toFixed(2)} | Net: $${biz.net.toFixed(2)}`);
  if (persAccts.length > 0) {
    s.push("**👤 Personal**");
    s.push(`- Checking: $${pers.checking.toFixed(2)} | Savings: $${pers.savings.toFixed(2)} | Credit: $${pers.credit.toFixed(2)} | Net: $${pers.net.toFixed(2)}`);
  }
  s.push(`**💼 Combined Net Position:** $${total.net.toFixed(2)}`);

  // Revenue
  const totalDeposits = (deposits ?? []).reduce((a: number, d: any) => a + d.amount, 0);
  s.push(`\n### 📈 Revenue (${days}d)`);
  s.push(`- Client Wallet Deposits: $${totalDeposits.toFixed(2)}`);

  // Expenses
  const totalExpenses = (transactions ?? []).reduce((a: number, t: any) => a + t.amount, 0);
  const totalAdSpend = (adSpend ?? []).reduce((a: number, s: any) => a + (s.cost ?? 0), 0);
  s.push(`\n### 📉 Expenses (${days}d)`);
  s.push(`- **Total Transactions:** $${totalExpenses.toFixed(2)} (${(transactions ?? []).length} transactions)`);
  s.push(`- **Ad Spend (Google Ads):** $${totalAdSpend.toFixed(2)}`);

  // Burn Rate
  const dailyBurn = totalExpenses / days;
  const dailyAdBurn = totalAdSpend / days;
  s.push(`\n### 🔥 Burn Rate`);
  s.push(`- **Daily Avg Expense:** $${dailyBurn.toFixed(2)}`);
  s.push(`- **Daily Avg Ad Spend:** $${dailyAdBurn.toFixed(2)}`);
  s.push(`- **Monthly Burn Estimate:** $${(dailyBurn * 30).toFixed(2)}`);
  s.push(`- **Monthly Ad Spend Estimate:** $${(dailyAdBurn * 30).toFixed(2)}`);

  // Runway
  const netCash = biz.checking + biz.savings;
  const monthlyBurn = dailyBurn * 30;
  const runway = monthlyBurn > 0 ? (netCash / monthlyBurn) : Infinity;
  s.push(`\n### 🛬 Runway`);
  s.push(`- **Business Cash Available:** $${netCash.toFixed(2)}`);
  s.push(`- **Monthly Burn:** $${monthlyBurn.toFixed(2)}`);
  s.push(`- **Estimated Runway:** ${runway === Infinity ? "N/A" : `${runway.toFixed(1)} months`}`);

  // Top expenses
  const byMerchant = new Map<string, number>();
  for (const tx of (transactions ?? [])) {
    const name = tx.merchant_name ?? "Unknown";
    byMerchant.set(name, (byMerchant.get(name) ?? 0) + tx.amount);
  }
  const topMerchants = [...byMerchant.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (topMerchants.length > 0) {
    s.push("\n### 🏪 Top Merchants");
    for (const [m, amt] of topMerchants) {
      s.push(`- ${m}: $${amt.toFixed(2)}`);
    }
  }

  // Ad Spend vs Revenue check
  s.push("\n### ⚖️ Ad Spend vs Client Revenue");
  const performanceFee = totalAdSpend * 0.10;
  s.push(`- Total Ad Spend: $${totalAdSpend.toFixed(2)}`);
  s.push(`- Performance Fee (10%): $${performanceFee.toFixed(2)}`);
  s.push(`- Client Deposits: $${totalDeposits.toFixed(2)}`);
  const margin = totalDeposits - totalAdSpend - performanceFee;
  s.push(`- **Net Margin on Ads:** $${margin.toFixed(2)} ${margin < 0 ? "⚠️ NEGATIVE" : "✅"}`);

  return s.join("\n");
}

// ===================== STRIPE TOOLS =====================

type StripeAccount = "management" | "ad_spend";

function getStripeKey(account: StripeAccount): string {
  const key = account === "management"
    ? Deno.env.get("STRIPE_MANAGEMENT_SECRET_KEY")
    : Deno.env.get("STRIPE_AD_SPEND_SECRET_KEY");
  if (!key) throw new Error(`Missing Stripe secret key for ${account}`);
  return key;
}

async function stripeFetch(account: StripeAccount, path: string): Promise<any> {
  const key = getStripeKey(account);
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { "Authorization": `Bearer ${key}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Stripe API error (${account}): ${res.status} ${err}`);
  }
  return res.json();
}

function resolveAccounts(account?: string): StripeAccount[] {
  if (account === "management") return ["management"];
  if (account === "ad_spend") return ["ad_spend"];
  return ["management", "ad_spend"];
}

function centsToUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

async function getStripeBalance(): Promise<string> {
  const accounts: StripeAccount[] = ["management", "ad_spend"];
  const s: string[] = ["# Stripe Balance\n"];

  for (const acct of accounts) {
    try {
      const bal = await stripeFetch(acct, "/balance");
      const label = acct === "management" ? "Management Fees" : "Ad Spend";
      s.push(`## ${label} Account`);
      for (const a of (bal.available ?? [])) {
        s.push(`- **Available:** ${centsToUsd(a.amount)} ${a.currency.toUpperCase()}`);
      }
      for (const p of (bal.pending ?? [])) {
        s.push(`- **Pending:** ${centsToUsd(p.amount)} ${p.currency.toUpperCase()}`);
      }
      if (bal.connect_reserved) {
        for (const r of bal.connect_reserved) {
          s.push(`- **Connect Reserved:** ${centsToUsd(r.amount)} ${r.currency.toUpperCase()}`);
        }
      }
      s.push("");
    } catch (e) {
      s.push(`## ${acct} Account\n- Error: ${(e as Error).message}\n`);
    }
  }
  return s.join("\n");
}

async function getStripeCustomers(params: any): Promise<string> {
  const accounts = resolveAccounts(params.account);
  const limit = params.limit ?? 20;
  const s: string[] = ["# Stripe Customers\n"];

  for (const acct of accounts) {
    try {
      let path = `/customers?limit=${limit}`;
      if (params.email) path += `&email=${encodeURIComponent(params.email)}`;
      const data = await stripeFetch(acct, path);
      const label = acct === "management" ? "Management" : "Ad Spend";
      s.push(`## ${label} Account (${data.data.length} customers)`);
      for (const c of data.data) {
        const bal = c.balance ? ` | Balance: ${centsToUsd(c.balance)}` : "";
        const delinquent = c.delinquent ? " | **DELINQUENT**" : "";
        s.push(`- **${c.name ?? c.email ?? c.id}** — ${c.email ?? "no email"}${bal}${delinquent} | Created: ${new Date(c.created * 1000).toLocaleDateString()}`);
      }
      s.push("");
    } catch (e) {
      s.push(`## ${acct} Account\n- Error: ${(e as Error).message}\n`);
    }
  }
  return s.join("\n");
}

async function getStripeInvoices(params: any): Promise<string> {
  const accounts = resolveAccounts(params.account);
  const limit = params.limit ?? 20;
  const s: string[] = ["# Stripe Invoices\n"];

  for (const acct of accounts) {
    try {
      let path = `/invoices?limit=${limit}`;
      if (params.status) path += `&status=${params.status}`;
      if (params.customer_id) path += `&customer=${params.customer_id}`;
      const data = await stripeFetch(acct, path);
      const label = acct === "management" ? "Management" : "Ad Spend";

      let totalPaid = 0, totalOpen = 0, totalOverdue = 0;
      const rows: string[] = [];
      for (const inv of data.data) {
        const amount = centsToUsd(inv.amount_due);
        const paid = inv.amount_paid ? centsToUsd(inv.amount_paid) : "$0.00";
        const due = inv.due_date ? new Date(inv.due_date * 1000).toLocaleDateString() : "N/A";
        const overdue = inv.status === "open" && inv.due_date && inv.due_date * 1000 < Date.now();
        const statusIcon = inv.status === "paid" ? "✅" : overdue ? "🔴" : inv.status === "open" ? "🟡" : "⚪";
        rows.push(`| ${statusIcon} | ${inv.number ?? inv.id} | ${inv.customer_name ?? inv.customer_email ?? inv.customer} | ${amount} | ${paid} | ${inv.status}${overdue ? " OVERDUE" : ""} | ${due} |`);
        if (inv.status === "paid") totalPaid += inv.amount_paid ?? 0;
        if (inv.status === "open" && !overdue) totalOpen += inv.amount_due;
        if (overdue) totalOverdue += inv.amount_due;
      }

      s.push(`## ${label} Account (${data.data.length} invoices)`);
      s.push(`- **Total Paid:** ${centsToUsd(totalPaid)} | **Open:** ${centsToUsd(totalOpen)} | **Overdue:** ${centsToUsd(totalOverdue)}`);
      s.push(`\n| Status | Invoice | Customer | Amount | Paid | Status | Due |`);
      s.push(`|--------|---------|----------|--------|------|--------|-----|`);
      s.push(...rows);
      s.push("");
    } catch (e) {
      s.push(`## ${acct} Account\n- Error: ${(e as Error).message}\n`);
    }
  }
  return s.join("\n");
}

async function getStripeSubscriptions(params: any): Promise<string> {
  const accounts = resolveAccounts(params.account);
  const limit = params.limit ?? 20;
  const status = params.status ?? "active";
  const s: string[] = ["# Stripe Subscriptions\n"];

  for (const acct of accounts) {
    try {
      let path = `/subscriptions?limit=${limit}`;
      if (status !== "all") path += `&status=${status}`;
      const data = await stripeFetch(acct, path);
      const label = acct === "management" ? "Management" : "Ad Spend";

      let totalMRR = 0;
      s.push(`## ${label} Account (${data.data.length} subscriptions)`);
      for (const sub of data.data) {
        const items = sub.items?.data ?? [];
        let subMRR = 0;
        const itemDescs: string[] = [];
        for (const item of items) {
          const price = item.price;
          let monthly = price.unit_amount ?? 0;
          if (price.recurring?.interval === "year") monthly = Math.round(monthly / 12);
          else if (price.recurring?.interval === "week") monthly = monthly * 4;
          subMRR += monthly;
          itemDescs.push(`${price.nickname ?? price.product ?? "item"}: ${centsToUsd(price.unit_amount)}/${price.recurring?.interval ?? "mo"}`);
        }
        totalMRR += subMRR;
        const statusIcon = sub.status === "active" ? "✅" : sub.status === "past_due" ? "🔴" : "⚪";
        const nextBill = sub.current_period_end ? new Date(sub.current_period_end * 1000).toLocaleDateString() : "N/A";
        s.push(`- ${statusIcon} **${sub.customer}** — ${sub.status} | MRR: ${centsToUsd(subMRR)} | Next bill: ${nextBill}`);
        for (const desc of itemDescs) s.push(`  - ${desc}`);
      }
      s.push(`\n**Total MRR (${label}):** ${centsToUsd(totalMRR)}`);
      s.push("");
    } catch (e) {
      s.push(`## ${acct} Account\n- Error: ${(e as Error).message}\n`);
    }
  }
  return s.join("\n");
}

async function getStripeCharges(params: any): Promise<string> {
  const accounts = resolveAccounts(params.account);
  const limit = params.limit ?? 20;
  const s: string[] = ["# Stripe Charges\n"];

  for (const acct of accounts) {
    try {
      let path = `/charges?limit=${limit}`;
      if (params.customer_id) path += `&customer=${params.customer_id}`;
      const data = await stripeFetch(acct, path);
      const label = acct === "management" ? "Management" : "Ad Spend";

      let totalSucceeded = 0, totalFailed = 0, totalRefunded = 0;
      s.push(`## ${label} Account (${data.data.length} charges)`);
      for (const ch of data.data) {
        const amount = centsToUsd(ch.amount);
        const refundAmt = ch.amount_refunded > 0 ? ` (refunded: ${centsToUsd(ch.amount_refunded)})` : "";
        const statusIcon = ch.status === "succeeded" ? "✅" : ch.status === "failed" ? "❌" : "⚪";
        const date = new Date(ch.created * 1000).toLocaleDateString();
        const desc = ch.description ?? ch.statement_descriptor ?? "";
        const customer = ch.customer ?? "guest";
        s.push(`- ${statusIcon} ${date} | ${amount}${refundAmt} | ${ch.status} | ${customer} | ${desc}`);
        if (ch.status === "succeeded") totalSucceeded += ch.amount;
        if (ch.status === "failed") totalFailed += ch.amount;
        totalRefunded += ch.amount_refunded ?? 0;
      }
      s.push(`\n**Totals:** Succeeded: ${centsToUsd(totalSucceeded)} | Failed: ${centsToUsd(totalFailed)} | Refunded: ${centsToUsd(totalRefunded)}`);
      s.push("");
    } catch (e) {
      s.push(`## ${acct} Account\n- Error: ${(e as Error).message}\n`);
    }
  }
  return s.join("\n");
}

async function getStripePayouts(params: any): Promise<string> {
  const accounts = resolveAccounts(params.account);
  const limit = params.limit ?? 10;
  const s: string[] = ["# Stripe Payouts\n"];

  for (const acct of accounts) {
    try {
      const data = await stripeFetch(acct, `/payouts?limit=${limit}`);
      const label = acct === "management" ? "Management" : "Ad Spend";

      let totalPaid = 0;
      s.push(`## ${label} Account (${data.data.length} payouts)`);
      for (const p of data.data) {
        const amount = centsToUsd(p.amount);
        const statusIcon = p.status === "paid" ? "✅" : p.status === "in_transit" ? "🚚" : p.status === "failed" ? "❌" : "⚪";
        const arrival = p.arrival_date ? new Date(p.arrival_date * 1000).toLocaleDateString() : "N/A";
        const created = new Date(p.created * 1000).toLocaleDateString();
        s.push(`- ${statusIcon} ${created} | ${amount} | ${p.status} | Arrives: ${arrival} | ${p.description ?? ""}`);
        if (p.status === "paid") totalPaid += p.amount;
      }
      s.push(`\n**Total Paid Out:** ${centsToUsd(totalPaid)}`);
      s.push("");
    } catch (e) {
      s.push(`## ${acct} Account\n- Error: ${(e as Error).message}\n`);
    }
  }
  return s.join("\n");
}
