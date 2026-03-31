import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Tool Definitions (Claude API format) ──────────────────────────────

export const TOOL_DEFINITIONS = [
  {
    name: "get_lead_stats",
    description:
      "Get the agent's lead counts by status, booking rate, premium amounts, and recent lead activity. Use this when the agent asks about leads, results, or performance.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          description: "Time period to check",
          enum: ["last_7_days", "last_30_days", "mtd", "all_time"],
        },
      },
      required: ["period"],
    },
  },
  {
    name: "get_wallet_and_billing",
    description:
      "Get the agent's wallet balance, billing records, payment status, and deposit history. Use this when the agent asks about billing, payments, wallet, or charges.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_campaign_metrics",
    description:
      "Get the agent's ad spend, CPL, impressions, clicks, conversions, and campaign activity. Use this when the agent asks about their campaign, ad spend, or cost per lead.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          description: "Time period to check",
          enum: ["last_7_days", "last_30_days", "mtd", "all_time"],
        },
      },
      required: ["period"],
    },
  },
  {
    name: "get_performance_snapshot",
    description:
      "Get a quick summary of the agent's overall performance: ROI, CPL, booking rate, app rate. Use this for a high-level overview or when doing a check-in.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "check_lead_pipeline",
    description:
      "Actively diagnose whether leads are flowing for this agent. Checks recent lead deliveries, campaign activity, wallet status, and identifies any bottlenecks. Use this when the agent says they're not getting leads or something seems wrong.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "check_campaign_health",
    description:
      "Check if the agent's Google Ads campaign is active and healthy. Looks at recent spend data, daily budget, conversion trends, and flags any issues like death spirals or zero-spend days. Use this when the agent asks about their campaign or when diagnosing lead issues.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "run_funnel_diagnostic",
    description:
      "Run a full pipeline diagnostic for this agent. Checks if leads are being created, delivered to CRM, routed correctly, enhanced conversions firing, bookings flowing back, and client config is complete. Use this when an agent says leads aren't showing up, something seems broken, or you need to verify the pipeline is healthy.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "update_client_states",
    description:
      "Update the agent's licensed states. Use this when the agent asks to add or change their states. Pass the FULL list of states they should have (existing + new ones).",
    input_schema: {
      type: "object" as const,
      properties: {
        states: {
          type: "string",
          description: "Comma-separated state abbreviations, e.g. 'FL,TX,CA,NY'. Include ALL states they should have, not just new ones.",
        },
      },
      required: ["states"],
    },
  },
  {
    name: "get_client_info",
    description:
      "Get the agent's full account info: NPN number, package type, management fee, states, contract dates, billing frequency, timezone, and other profile details. Use this when they ask about their account info, NPN, contract, or any personal details on file.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_client_links",
    description:
      "Get all the agent's links: CRM, scheduler, landing page, NFIA profile, TFWP profile, and thank you page. Use this when the agent asks for any of their links or needs to find a specific page.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_crm_credentials",
    description:
      "Get the agent's CRM login credentials, link, and sub-account config. Use this when they ask how to log into their CRM, have CRM issues, forgot their password, or need their CRM link. ALWAYS call this for any CRM-related question.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_agreement_download",
    description:
      "Get a download link for the agent's signed service agreement PDF. Use this when the agent asks to download or view their agreement.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_agreement_details",
    description:
      "Get the agent's service agreement details including key terms they acknowledged, signed date, and contract highlights. Use this when an agent mentions cancelling, disputes terms, or asks about their agreement.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "create_support_ticket",
    description:
      "Create a support ticket for issues that need human attention from the marketing team. Use this when you can't solve an issue yourself, when the agent wants to cancel, or when you find a real problem during debugging.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: [
            "BILLING",
            "LEADS",
            "CAMPAIGN",
            "TECHNICAL",
            "RETENTION",
            "OTHER",
          ],
          description: "Issue category",
        },
        priority: {
          type: "string",
          enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
          description: "Urgency level",
        },
        summary: {
          type: "string",
          description: "Short summary of the issue",
        },
        details: {
          type: "string",
          description:
            "Full details: what the agent reported, what you checked, your assessment",
        },
      },
      required: ["category", "priority", "summary"],
    },
  },
];

// ── Tool Handlers ─────────────────────────────────────────────────────

interface ToolContext {
  supabase: SupabaseClient;
  clientId: string;
  agentId: string;
  conversationId: string;
  performancePct: number;
  trackingStartDate: string | null;
}

export async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  switch (toolName) {
    case "get_lead_stats":
      return await getLeadStats(ctx, toolInput.period as string);
    case "get_wallet_and_billing":
      return await getWalletAndBilling(ctx);
    case "get_campaign_metrics":
      return await getCampaignMetrics(ctx, toolInput.period as string);
    case "get_performance_snapshot":
      return await getPerformanceSnapshot(ctx);
    case "check_lead_pipeline":
      return await checkLeadPipeline(ctx);
    case "check_campaign_health":
      return await checkCampaignHealth(ctx);
    case "run_funnel_diagnostic":
      return await runFunnelDiagnostic(ctx);
    case "get_client_info":
      return await getClientInfo(ctx);
    case "get_client_links":
      return await getClientLinks(ctx);
    case "update_client_states":
      return await updateClientStates(ctx, toolInput.states as string);
    case "get_crm_credentials":
      return await getCrmCredentials(ctx);
    case "get_agreement_download":
      return await getAgreementDownload(ctx);
    case "get_agreement_details":
      return await getAgreementDetails(ctx);
    case "create_support_ticket":
      return await createSupportTicket(ctx, toolInput);
    default:
      return `Unknown tool: ${toolName}`;
  }
}

// ── Helper: Date Ranges ───────────────────────────────────────────────

function getDateRange(period: string): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();

  switch (period) {
    case "last_7_days": {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      return { from: from.toISOString(), to };
    }
    case "last_30_days": {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { from: from.toISOString(), to };
    }
    case "mtd": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: from.toISOString(), to };
    }
    case "all_time":
    default:
      return { from: "2020-01-01T00:00:00Z", to };
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function applyPerformanceFee(amount: number, pct: number): number {
  return amount * (1 + pct / 100);
}

// ── get_lead_stats ────────────────────────────────────────────────────

async function getLeadStats(ctx: ToolContext, period: string): Promise<string> {
  const range = getDateRange(period);

  let query = ctx.supabase
    .from("leads")
    .select(
      "id, status, submitted_premium, issued_premium, approved_premium, target_premium, booked_call_at, submitted_at, issued_at, created_at",
    )
    .eq("agent_id", ctx.agentId);

  if (period !== "all_time") {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  }

  const { data: leads, error } = await query;
  if (error) return `Error fetching leads: ${error.message}`;
  if (!leads || leads.length === 0) return `No leads found for period: ${period}`;

  const total = leads.length;
  const statusCounts: Record<string, number> = {};
  let bookedCount = 0;
  let submittedPremium = 0;
  let issuedPremium = 0;
  let firstLead = "";
  let lastLead = "";

  for (const lead of leads) {
    const s = lead.status || "new";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
    if (lead.booked_call_at) bookedCount++;
    submittedPremium += lead.submitted_premium || lead.target_premium || 0;
    issuedPremium += lead.issued_premium || 0;

    if (!firstLead || lead.created_at < firstLead) firstLead = lead.created_at;
    if (!lastLead || lead.created_at > lastLead) lastLead = lead.created_at;
  }

  const bookingRate = total > 0 ? ((bookedCount / total) * 100).toFixed(1) : "0";

  const lines = [
    `Period: ${period}`,
    `Total leads: ${total}`,
  ];

  for (const [status, count] of Object.entries(statusCounts).sort()) {
    lines.push(`  ${status}: ${count}`);
  }

  lines.push(`Booked calls (by timestamp): ${bookedCount}`);
  lines.push(`Booking rate: ${bookingRate}%`);
  lines.push(`Submitted premium: $${submittedPremium.toLocaleString()}`);
  lines.push(`Issued premium: $${issuedPremium.toLocaleString()}`);
  if (firstLead) lines.push(`First lead: ${formatDate(firstLead)}`);
  if (lastLead) lines.push(`Last lead: ${formatDate(lastLead)}`);

  return lines.join("\n");
}

// ── get_wallet_and_billing ────────────────────────────────────────────

async function getWalletAndBilling(ctx: ToolContext): Promise<string> {
  const [walletRes, billingRes, txRes] = await Promise.all([
    ctx.supabase
      .from("client_wallets")
      .select("*")
      .eq("client_id", ctx.clientId)
      .single(),
    ctx.supabase
      .from("billing_records")
      .select(
        "id, billing_type, amount, status, due_date, paid_at, source, created_at",
      )
      .eq("client_id", ctx.clientId)
      .order("created_at", { ascending: false })
      .limit(10),
    ctx.supabase
      .from("wallet_transactions")
      .select("id, transaction_type, amount, description, created_at")
      .eq("client_id", ctx.clientId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const wallet = walletRes.data;
  const billing = billingRes.data || [];
  const transactions = txRes.data || [];

  const lines: string[] = [];

  if (wallet) {
    lines.push("== Wallet ==");
    lines.push(`Balance: $${(wallet.ad_spend_balance || 0).toFixed(2)}`);
    lines.push(`Low balance threshold: $${wallet.low_balance_threshold || 150}`);
    lines.push(`Auto-billing: ${wallet.auto_billing_enabled ? "enabled" : "disabled"}`);
    lines.push(`Auto-charge amount: $${wallet.auto_charge_amount || "not set"}`);
    lines.push(
      `Monthly ad spend cap: $${wallet.monthly_ad_spend_cap ? wallet.monthly_ad_spend_cap.toLocaleString() : "not set"}`,
    );
    lines.push(`Billing mode: ${wallet.billing_mode || "manual"}`);
    if (wallet.tracking_start_date) {
      lines.push(`Tracking since: ${formatDate(wallet.tracking_start_date)}`);
    }
  } else {
    lines.push("No wallet found for this client.");
  }

  lines.push("");
  lines.push("== Recent Billing Records ==");
  if (billing.length === 0) {
    lines.push("No billing records.");
  } else {
    for (const b of billing) {
      lines.push(
        `${formatDate(b.created_at)} - ${b.billing_type} - $${(b.amount / 100).toFixed(2)} - ${b.status}${b.paid_at ? ` (paid ${formatDate(b.paid_at)})` : ""}`,
      );
    }
  }

  lines.push("");
  lines.push("== Recent Wallet Transactions ==");
  if (transactions.length === 0) {
    lines.push("No wallet transactions.");
  } else {
    for (const t of transactions) {
      lines.push(
        `${formatDate(t.created_at)} - ${t.transaction_type} - $${t.amount?.toFixed(2)} - ${t.description || ""}`,
      );
    }
  }

  return lines.join("\n");
}

// ── get_campaign_metrics ──────────────────────────────────────────────

async function getCampaignMetrics(
  ctx: ToolContext,
  period: string,
): Promise<string> {
  const range = getDateRange(period);

  let query = ctx.supabase
    .from("ad_spend_daily")
    .select("cost, impressions, clicks, conversions, spend_date, campaign_enabled, budget_daily")
    .eq("client_id", ctx.clientId)
    .order("spend_date", { ascending: false });

  if (period !== "all_time") {
    query = query.gte("spend_date", range.from.slice(0, 10)).lte("spend_date", range.to.slice(0, 10));
  }

  const { data: spendData, error } = await query;
  if (error) return `Error fetching campaign data: ${error.message}`;
  if (!spendData || spendData.length === 0) {
    return `No ad spend data found for period: ${period}. Campaign may not have any spend recorded.`;
  }

  let totalCost = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  let daysWithSpend = 0;
  let lastSpendDate = "";
  let latestEnabled: boolean | null = null;
  let latestBudget: number | null = null;

  for (const day of spendData) {
    const cost = day.cost || 0;
    totalCost += cost;
    totalImpressions += day.impressions || 0;
    totalClicks += day.clicks || 0;
    totalConversions += day.conversions || 0;
    if (cost > 0) daysWithSpend++;

    if (!lastSpendDate && cost > 0) lastSpendDate = day.spend_date;
    if (latestEnabled === null) latestEnabled = day.campaign_enabled;
    if (latestBudget === null) latestBudget = day.budget_daily;
  }

  const displayCost = applyPerformanceFee(totalCost, ctx.performancePct);
  const avgDailySpend = daysWithSpend > 0
    ? applyPerformanceFee(totalCost / daysWithSpend, ctx.performancePct)
    : 0;

  // Get lead count for CPL calculation
  const leadRange = getDateRange(period);
  let leadQuery = ctx.supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", ctx.agentId);

  if (period !== "all_time") {
    leadQuery = leadQuery.gte("created_at", leadRange.from).lte("created_at", leadRange.to);
  }

  const { count: leadCount } = await leadQuery;
  const cpl = leadCount && leadCount > 0 ? displayCost / leadCount : 0;

  const lines = [
    `Period: ${period}`,
    `Total spend (display): $${displayCost.toFixed(2)}`,
    `Days with spend: ${daysWithSpend}`,
    `Average daily spend: $${avgDailySpend.toFixed(2)}`,
    `Total impressions: ${totalImpressions.toLocaleString()}`,
    `Total clicks: ${totalClicks.toLocaleString()}`,
    `Total conversions: ${totalConversions}`,
    `CTR: ${totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0"}%`,
    `CPC: $${totalClicks > 0 ? applyPerformanceFee(totalCost / totalClicks, ctx.performancePct).toFixed(2) : "0"}`,
    `Leads in period: ${leadCount || 0}`,
    `CPL: $${cpl > 0 ? cpl.toFixed(2) : "N/A"}`,
    `Last day with spend: ${lastSpendDate || "none"}`,
    `Campaign enabled (latest): ${latestEnabled !== null ? latestEnabled : "unknown"}`,
    `Daily budget (latest): $${latestBudget !== null ? latestBudget.toFixed(2) : "unknown"}`,
  ];

  return lines.join("\n");
}

// ── get_performance_snapshot ──────────────────────────────────────────

async function getPerformanceSnapshot(ctx: ToolContext): Promise<string> {
  // Leads all-time
  const { data: allLeads } = await ctx.supabase
    .from("leads")
    .select(
      "id, status, booked_call_at, submitted_premium, issued_premium, target_premium, created_at",
    )
    .eq("agent_id", ctx.agentId);

  const leads = allLeads || [];
  const totalLeads = leads.length;
  let bookedCalls = 0;
  let submitted = 0;
  let issued = 0;
  let submittedPremium = 0;
  let issuedPremium = 0;

  for (const l of leads) {
    if (l.booked_call_at) bookedCalls++;
    if (l.status === "submitted" || l.status === "approved" || l.status === "issued paid") submitted++;
    if (l.status === "issued paid") issued++;
    submittedPremium += l.submitted_premium || l.target_premium || 0;
    issuedPremium += l.issued_premium || 0;
  }

  // Total ad spend
  const { data: spendData } = await ctx.supabase
    .from("ad_spend_daily")
    .select("cost")
    .eq("client_id", ctx.clientId);

  let rawSpend = 0;
  for (const s of spendData || []) {
    rawSpend += s.cost || 0;
  }
  const displaySpend = applyPerformanceFee(rawSpend, ctx.performancePct);

  const bookingRate = totalLeads > 0 ? ((bookedCalls / totalLeads) * 100).toFixed(1) : "0";
  const appRate = bookedCalls > 0 ? ((submitted / bookedCalls) * 100).toFixed(1) : "0";
  const cpl = totalLeads > 0 ? displaySpend / totalLeads : 0;
  const roi = displaySpend > 0 ? ((issuedPremium - displaySpend) / displaySpend * 100).toFixed(0) : "N/A";

  return [
    "== Performance Snapshot (All-Time) ==",
    `Total leads: ${totalLeads}`,
    `Booked calls: ${bookedCalls}`,
    `Submitted/approved/issued apps: ${submitted}`,
    `Issued paid: ${issued}`,
    `Booking rate: ${bookingRate}%`,
    `App rate (from booked): ${appRate}%`,
    `Total ad spend (display): $${displaySpend.toFixed(2)}`,
    `CPL: $${cpl > 0 ? cpl.toFixed(2) : "N/A"}`,
    `Submitted premium: $${submittedPremium.toLocaleString()}`,
    `Issued premium: $${issuedPremium.toLocaleString()}`,
    `ALPHA ROI: ${roi}%`,
  ].join("\n");
}

// ── check_lead_pipeline ───────────────────────────────────────────────

async function checkLeadPipeline(ctx: ToolContext): Promise<string> {
  const findings: string[] = ["== Lead Pipeline Diagnostic =="];

  // 1. Recent leads
  const { data: recentLeads } = await ctx.supabase
    .from("leads")
    .select("id, status, created_at, delivery_status, delivery_error")
    .eq("agent_id", ctx.agentId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!recentLeads || recentLeads.length === 0) {
    findings.push("WARNING: No leads found at all for this agent.");
  } else {
    const latest = recentLeads[0];
    const daysSinceLastLead = Math.floor(
      (Date.now() - new Date(latest.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    findings.push(`Last lead received: ${formatDate(latest.created_at)} (${daysSinceLastLead} days ago)`);

    if (daysSinceLastLead > 3) {
      findings.push("WARNING: No leads in over 3 days. Possible issue.");
    }

    // Check delivery status
    const failedDeliveries = recentLeads.filter(
      (l) => l.delivery_status === "failed" || l.delivery_error,
    );
    if (failedDeliveries.length > 0) {
      findings.push(
        `WARNING: ${failedDeliveries.length} of last 10 leads had delivery issues.`,
      );
    }

    // Last 7 days lead count
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCount = recentLeads.filter(
      (l) => new Date(l.created_at) >= sevenDaysAgo,
    ).length;
    findings.push(`Leads in last 7 days: ${recentCount}`);
  }

  // 2. Campaign spending check
  const { data: recentSpend } = await ctx.supabase
    .from("ad_spend_daily")
    .select("cost, spend_date, campaign_enabled")
    .eq("client_id", ctx.clientId)
    .order("spend_date", { ascending: false })
    .limit(7);

  if (!recentSpend || recentSpend.length === 0) {
    findings.push("WARNING: No ad spend data found. Campaign may not be active.");
  } else {
    const lastSpendDay = recentSpend.find((d) => (d.cost || 0) > 0);
    if (lastSpendDay) {
      const daysSinceSpend = Math.floor(
        (Date.now() - new Date(lastSpendDay.spend_date).getTime()) / (1000 * 60 * 60 * 24),
      );
      findings.push(`Last day with ad spend: ${lastSpendDay.spend_date} (${daysSinceSpend} days ago)`);
      if (daysSinceSpend > 2) {
        findings.push("WARNING: Campaign hasn't spent in over 2 days.");
      }
    } else {
      findings.push("WARNING: No spend in the most recent records.");
    }
    findings.push(`Campaign enabled (latest): ${recentSpend[0]?.campaign_enabled ?? "unknown"}`);
  }

  // 3. Wallet balance
  const { data: wallet } = await ctx.supabase
    .from("client_wallets")
    .select("ad_spend_balance, low_balance_threshold, auto_billing_enabled")
    .eq("client_id", ctx.clientId)
    .single();

  if (wallet) {
    const bal = wallet.ad_spend_balance || 0;
    findings.push(`Wallet balance: $${bal.toFixed(2)}`);
    if (bal <= 0) {
      findings.push("CRITICAL: Wallet is empty. This will pause the campaign.");
    } else if (bal < (wallet.low_balance_threshold || 150)) {
      findings.push("WARNING: Wallet is below the low balance threshold.");
    }
    findings.push(`Auto-billing: ${wallet.auto_billing_enabled ? "enabled" : "disabled"}`);
  }

  // Summary
  findings.push("");
  const warnings = findings.filter((f) => f.startsWith("WARNING") || f.startsWith("CRITICAL"));
  if (warnings.length === 0) {
    findings.push("ASSESSMENT: Pipeline looks healthy. Leads are flowing and campaign is active.");
  } else {
    findings.push(`ASSESSMENT: Found ${warnings.length} potential issue(s). Review warnings above.`);
  }

  return findings.join("\n");
}

// ── check_campaign_health ─────────────────────────────────────────────

async function checkCampaignHealth(ctx: ToolContext): Promise<string> {
  const findings: string[] = ["== Campaign Health Diagnostic =="];

  // Get last 14 days of spend data
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data: spendData } = await ctx.supabase
    .from("ad_spend_daily")
    .select("cost, impressions, clicks, conversions, spend_date, campaign_enabled, budget_daily")
    .eq("client_id", ctx.clientId)
    .gte("spend_date", fourteenDaysAgo.toISOString().slice(0, 10))
    .order("spend_date", { ascending: false });

  if (!spendData || spendData.length === 0) {
    findings.push("No campaign data in the last 14 days.");
    findings.push("Campaign may not be set up or may be completely paused.");
    return findings.join("\n");
  }

  const latestDay = spendData[0];
  findings.push(`Latest data: ${latestDay.spend_date}`);
  findings.push(`Campaign enabled: ${latestDay.campaign_enabled ?? "unknown"}`);
  findings.push(`Daily budget: $${latestDay.budget_daily?.toFixed(2) ?? "unknown"}`);

  // Spending pattern
  let totalSpend = 0;
  let zeroSpendDays = 0;
  let totalConversions = 0;
  let consecutiveZeroConversions = 0;
  let maxConsecutiveZeroConversions = 0;

  for (const day of spendData) {
    const cost = day.cost || 0;
    totalSpend += cost;
    if (cost === 0) zeroSpendDays++;

    if ((day.conversions || 0) === 0 && cost > 0) {
      consecutiveZeroConversions++;
      maxConsecutiveZeroConversions = Math.max(maxConsecutiveZeroConversions, consecutiveZeroConversions);
    } else if ((day.conversions || 0) > 0) {
      consecutiveZeroConversions = 0;
    }
    totalConversions += day.conversions || 0;
  }

  const displaySpend = applyPerformanceFee(totalSpend, ctx.performancePct);
  findings.push(`Spend last 14 days (display): $${displaySpend.toFixed(2)}`);
  findings.push(`Days with zero spend: ${zeroSpendDays} of ${spendData.length}`);
  findings.push(`Total conversions: ${totalConversions}`);

  // Health checks
  if (zeroSpendDays >= 5) {
    findings.push("WARNING: Campaign has many zero-spend days. May be paused or budget-limited.");
  }

  if (maxConsecutiveZeroConversions >= 4) {
    findings.push(
      `WARNING: ${maxConsecutiveZeroConversions} consecutive days of spending with zero conversions. Possible death spiral - algorithm is losing optimization signal.`,
    );
  }

  if (totalSpend > 200 && totalConversions === 0) {
    findings.push(
      "CRITICAL: Spending over $200 in 14 days with zero conversions. Campaign needs immediate attention.",
    );
  }

  // Wallet check
  const { data: wallet } = await ctx.supabase
    .from("client_wallets")
    .select("ad_spend_balance, auto_billing_enabled")
    .eq("client_id", ctx.clientId)
    .single();

  if (wallet) {
    if ((wallet.ad_spend_balance || 0) <= 0) {
      findings.push("CRITICAL: Wallet balance is $0. Campaign will be paused until wallet is funded.");
    }
  }

  // Summary
  findings.push("");
  const issues = findings.filter((f) => f.startsWith("WARNING") || f.startsWith("CRITICAL"));
  if (issues.length === 0) {
    findings.push("ASSESSMENT: Campaign is healthy. Spending normally with conversions.");
  } else {
    findings.push(`ASSESSMENT: Found ${issues.length} issue(s) that need attention.`);
  }

  return findings.join("\n");
}

// ── create_support_ticket ─────────────────────────────────────────────

// ── get_client_info ───────────────────────────────────────────────────

async function getClientInfo(ctx: ToolContext): Promise<string> {
  const { data: client } = await ctx.supabase
    .from("clients")
    .select("name, email, phone, status, states, package_type, management_fee, npn, timezone, billing_frequency, commission_contract_percent, activated_at, contract_signed_at, address_street, address_city, address_state, address_zip, ads_live, onboarding_status, ai_bio")
    .eq("id", ctx.clientId)
    .single();

  if (!client) return "Could not find client record.";

  const mgmtFee = client.management_fee
    ? `$${(client.management_fee / 100).toFixed(2)}/month`
    : "Not set";

  return [
    "== Client Account Info ==",
    `Name: ${client.name}`,
    `Email: ${client.email}`,
    `Phone: ${client.phone || "Not on file"}`,
    `Status: ${client.status}`,
    `States: ${client.states || "None set"}`,
    `Package: ${client.package_type || "Not set"}`,
    `Management fee: ${mgmtFee}`,
    `Billing frequency: ${client.billing_frequency || "monthly"}`,
    `NPN: ${client.npn || "Not on file"}`,
    `Timezone: ${client.timezone || "Not set"}`,
    `Commission contract: ${client.commission_contract_percent || 100}%`,
    `Activated: ${client.activated_at ? formatDate(client.activated_at) : "Not yet"}`,
    `Contract signed: ${client.contract_signed_at ? formatDate(client.contract_signed_at) : "Not yet"}`,
    `Address: ${[client.address_street, client.address_city, client.address_state, client.address_zip].filter(Boolean).join(", ") || "Not on file"}`,
    `Ads live: ${client.ads_live ? "Yes" : "No"}`,
    `Onboarding: ${client.onboarding_status || "Unknown"}`,
    `Bio on file: ${client.ai_bio ? "Yes" : "No"}`,
  ].join("\n");
}

// ── get_client_links ──────────────────────────────────────────────────

async function getClientLinks(ctx: ToolContext): Promise<string> {
  const { data: client } = await ctx.supabase
    .from("clients")
    .select("crm_link, scheduler_link, lander_link, nfia_link, tfwp_profile_link, thankyou_link, fire_page_link")
    .eq("id", ctx.clientId)
    .single();

  if (!client) return "Could not find client record.";

  const links: string[] = ["== Agent Links =="];
  const add = (label: string, url: string | null) => {
    links.push(`${label}: ${url || "Not set up yet"}`);
  };

  add("CRM (GoHighLevel)", client.crm_link);
  add("Scheduler / Booking page", client.scheduler_link);
  add("NFIA profile", client.nfia_link);
  add("TFWP profile", client.tfwp_profile_link);
  // Landing page and thank you page are internal marketing assets - never share with agents

  return links.join("\n");
}

// ── update_client_states ──────────────────────────────────────────────

async function updateClientStates(ctx: ToolContext, states: string): Promise<string> {
  const cleaned = states
    .toUpperCase()
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");

  const { error } = await ctx.supabase
    .from("clients")
    .update({ states: cleaned })
    .eq("id", ctx.clientId);

  if (error) {
    return `Failed to update states: ${error.message}. Create a ticket for the team to handle this.`;
  }

  return `States updated successfully to: ${cleaned}. Tell the agent it's done.`;
}

// ── get_crm_credentials ──────────────────────────────────────────────

async function getCrmCredentials(ctx: ToolContext): Promise<string> {
  const { data: client } = await ctx.supabase
    .from("clients")
    .select("email, crm_link, subaccount_id, ghl_user_id, crm_delivery_enabled, onboarding_status")
    .eq("id", ctx.clientId)
    .single();

  if (!client) return "Could not find client record.";

  const issues: string[] = [];
  if (!client.crm_link) issues.push("CRM link is NOT set - agent's CRM may not be configured yet");
  if (!client.subaccount_id) issues.push("Sub-account ID is missing - CRM account not created");
  if (!client.ghl_user_id) issues.push("GHL user ID is missing - leads won't auto-assign to this agent");
  if (!client.crm_delivery_enabled) issues.push("CRM delivery is DISABLED - leads won't be sent to their CRM");

  return [
    "== CRM Login Info ==",
    `Email: ${client.email}`,
    `Default password: Alpha21$`,
    `CRM link: ${client.crm_link || "NOT SET UP"}`,
    `Sub-account: ${client.subaccount_id || "NOT SET UP"}`,
    `Onboarding status: ${client.onboarding_status || "unknown"}`,
    `CRM delivery enabled: ${client.crm_delivery_enabled ? "yes" : "NO"}`,
    `GHL user assigned: ${client.ghl_user_id ? "yes" : "NO"}`,
    "",
    issues.length > 0
      ? `CONFIG ISSUES FOUND:\n${issues.map(i => `  - ${i}`).join("\n")}\nThese are backend issues - create a ticket if the agent is having problems related to these.`
      : "All CRM config looks good. No backend issues detected.",
    "",
    "INSTRUCTIONS:",
    "- Share the CRM link and password with the agent",
    "- If CRM link is NOT SET UP, tell the agent their CRM is being configured and create a ticket",
    "- If they forgot their password, tell them to use Forgot Password on the login page (sends reset to their email)",
    "- If there are config issues, troubleshoot what you can and ticket the rest",
  ].join("\n");
}

// ── run_funnel_diagnostic ─────────────────────────────────────────────

async function runFunnelDiagnostic(ctx: ToolContext): Promise<string> {
  const findings: string[] = ["== FULL FUNNEL DIAGNOSTIC =="];
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  // 1. Client config check
  findings.push("\n--- 1. Client Configuration ---");
  const { data: clientConfig } = await ctx.supabase
    .from("clients")
    .select("name, agent_id, subaccount_id, ghl_user_id, crm_delivery_enabled, status, ads_live, google_campaign_id")
    .eq("id", ctx.clientId)
    .single();

  if (clientConfig) {
    const configIssues: string[] = [];
    if (!clientConfig.agent_id) configIssues.push("agent_id is missing");
    if (!clientConfig.subaccount_id) configIssues.push("subaccount_id (CRM location) is missing");
    if (!clientConfig.ghl_user_id) configIssues.push("ghl_user_id is missing (leads won't auto-assign)");
    if (!clientConfig.crm_delivery_enabled) configIssues.push("CRM delivery is DISABLED");
    if (clientConfig.status !== "active") configIssues.push(`Status is '${clientConfig.status}' not 'active'`);

    if (configIssues.length === 0) {
      findings.push("PASS: All required fields set. CRM delivery enabled.");
      passCount++;
    } else {
      findings.push(`FAIL: ${configIssues.length} config issue(s):`);
      configIssues.forEach(i => findings.push(`  - ${i}`));
      failCount++;
    }
    findings.push(`Campaign ID: ${clientConfig.google_campaign_id || "NOT SET"}`);
    findings.push(`Ads live: ${clientConfig.ads_live ? "YES" : "NO"}`);
  }

  // 2. Recent leads check
  findings.push("\n--- 2. Lead Creation (Supabase) ---");
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentLeads } = await ctx.supabase
    .from("leads")
    .select("id, email, status, delivery_status, delivery_error, created_at, lead_source, gclid")
    .eq("agent_id", ctx.agentId)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(20);

  const last7 = (recentLeads || []).filter(l => new Date(l.created_at) >= sevenDaysAgo);
  const last30 = recentLeads || [];

  if (last30.length === 0) {
    findings.push("FAIL: Zero leads in the last 30 days.");
    failCount++;
  } else if (last7.length === 0) {
    findings.push(`WARN: No leads in last 7 days. ${last30.length} leads in last 30 days.`);
    findings.push(`Last lead: ${formatDate(last30[0].created_at)}`);
    warnCount++;
  } else {
    findings.push(`PASS: ${last7.length} leads in last 7 days, ${last30.length} in last 30 days.`);
    findings.push(`Most recent: ${formatDate(last30[0].created_at)}`);
    passCount++;
  }

  // 3. CRM delivery check
  findings.push("\n--- 3. CRM Delivery ---");
  const deliveryFailed = last30.filter(l => l.delivery_status === "failed" || l.delivery_error);
  const deliverySuccess = last30.filter(l => l.delivery_status === "delivered");
  const deliveryPending = last30.filter(l => !l.delivery_status || l.delivery_status === "pending");

  findings.push(`Delivered: ${deliverySuccess.length} | Failed: ${deliveryFailed.length} | Pending: ${deliveryPending.length}`);

  if (deliveryFailed.length > 0) {
    findings.push(`WARN: ${deliveryFailed.length} leads had delivery failures.`);
    const recentFail = deliveryFailed[0];
    if (recentFail.delivery_error) {
      findings.push(`Latest error: ${recentFail.delivery_error}`);
    }
    warnCount++;
  } else if (deliverySuccess.length > 0) {
    findings.push("PASS: All recent leads delivered successfully.");
    passCount++;
  } else if (last30.length > 0) {
    findings.push("WARN: No delivery status recorded on recent leads.");
    warnCount++;
  } else {
    findings.push("N/A: No leads to check delivery for.");
  }

  // 4. Campaign spending check
  findings.push("\n--- 4. Campaign Activity ---");
  const { data: recentSpend } = await ctx.supabase
    .from("ad_spend_daily")
    .select("cost, spend_date, campaign_enabled, conversions")
    .eq("client_id", ctx.clientId)
    .order("spend_date", { ascending: false })
    .limit(14);

  if (!recentSpend || recentSpend.length === 0) {
    findings.push("FAIL: No ad spend data found. Campaign may not be running.");
    failCount++;
  } else {
    const lastSpendDay = recentSpend.find(d => (d.cost || 0) > 0);
    const daysSinceSpend = lastSpendDay
      ? Math.floor((Date.now() - new Date(lastSpendDay.spend_date).getTime()) / (1000 * 60 * 60 * 24))
      : -1;

    if (daysSinceSpend > 3) {
      findings.push(`FAIL: Campaign hasn't spent in ${daysSinceSpend} days. Last spend: ${lastSpendDay!.spend_date}`);
      failCount++;
    } else if (daysSinceSpend >= 0) {
      findings.push(`PASS: Campaign spending. Last spend: ${lastSpendDay!.spend_date}`);
      passCount++;
    }

    const totalConversions = recentSpend.reduce((s, d) => s + (d.conversions || 0), 0);
    const spendingDays = recentSpend.filter(d => (d.cost || 0) > 0);
    const zeroConvDays = spendingDays.filter(d => (d.conversions || 0) === 0).length;

    if (spendingDays.length > 0 && zeroConvDays >= 5) {
      findings.push(`WARN: ${zeroConvDays} of ${spendingDays.length} spending days had zero conversions. Possible algorithm issue.`);
      warnCount++;
    }
    findings.push(`Conversions (14 days): ${totalConversions}`);
    findings.push(`Campaign enabled: ${recentSpend[0]?.campaign_enabled ?? "unknown"}`);
  }

  // 5. Wallet check
  findings.push("\n--- 5. Wallet Status ---");
  const { data: wallet } = await ctx.supabase
    .from("client_wallets")
    .select("ad_spend_balance, auto_billing_enabled, low_balance_threshold")
    .eq("client_id", ctx.clientId)
    .single();

  if (wallet) {
    const bal = wallet.ad_spend_balance || 0;
    if (bal <= 0) {
      findings.push(`FAIL: Wallet is EMPTY ($0). Campaign will be paused.`);
      failCount++;
    } else if (bal < (wallet.low_balance_threshold || 150)) {
      findings.push(`WARN: Wallet low ($${bal.toFixed(2)}), below threshold ($${wallet.low_balance_threshold || 150}).`);
      warnCount++;
    } else {
      findings.push(`PASS: Wallet balance $${bal.toFixed(2)}.`);
      passCount++;
    }
    findings.push(`Auto-billing: ${wallet.auto_billing_enabled ? "enabled" : "DISABLED"}`);
  }

  // 6. Booking workflow check
  findings.push("\n--- 6. Booking Workflow ---");
  const { data: bookedLeads } = await ctx.supabase
    .from("leads")
    .select("id, created_at")
    .eq("agent_id", ctx.agentId)
    .not("booked_call_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!bookedLeads || bookedLeads.length === 0) {
    const totalLeads = last30.length;
    if (totalLeads > 10) {
      findings.push("WARN: Zero booked calls despite having leads. Booking workflow may need attention.");
      warnCount++;
    } else {
      findings.push("N/A: Low lead volume, insufficient data to assess booking workflow.");
    }
  } else {
    findings.push(`PASS: ${bookedLeads.length} recent booked calls found. Booking workflow is active.`);
    passCount++;
  }

  // 7. Enhanced conversions health
  findings.push("\n--- 7. Enhanced Conversions ---");
  const gclidLeads = last30.filter(l => l.gclid);
  if (gclidLeads.length === 0) {
    findings.push("N/A: No leads with GCLID in last 30 days. Cannot assess EC health for this agent.");
  } else {
    findings.push(`${gclidLeads.length} leads with GCLID found. EC should be firing for these.`);
    // Check EC logs table if it exists
    const { data: ecLogs } = await ctx.supabase
      .from("enhanced_conversion_logs")
      .select("id, success, created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .limit(20);

    if (ecLogs && ecLogs.length > 0) {
      const ecSuccess = ecLogs.filter(l => l.success).length;
      const ecRate = ((ecSuccess / ecLogs.length) * 100).toFixed(0);
      findings.push(`EC logs found: ${ecLogs.length} total, ${ecSuccess} successful (${ecRate}% success rate)`);
      if (Number(ecRate) < 80) {
        findings.push("WARN: EC success rate below 80%.");
        warnCount++;
      } else {
        passCount++;
      }
    } else {
      findings.push("WARN: No enhanced conversion logs found.");
      warnCount++;
    }
  }

  // Summary
  findings.push("\n=== SUMMARY ===");
  findings.push(`PASS: ${passCount} | WARN: ${warnCount} | FAIL: ${failCount}`);

  if (failCount > 0) {
    findings.push("OVERALL: RED - Critical issues found that are likely affecting lead flow.");
  } else if (warnCount > 0) {
    findings.push("OVERALL: YELLOW - Some issues found but pipeline is partially functional.");
  } else {
    findings.push("OVERALL: GREEN - Pipeline looks healthy across all checks.");
  }

  return findings.join("\n");
}

// ── get_agreement_download ─────────────────────────────────────────────

async function getAgreementDownload(ctx: ToolContext): Promise<string> {
  const { data: agreement } = await ctx.supabase
    .from("agreements")
    .select("pdf_url, signed_at, status")
    .eq("client_id", ctx.clientId)
    .eq("status", "signed")
    .order("signed_at", { ascending: false })
    .limit(1)
    .single();

  if (!agreement || !agreement.pdf_url) {
    return "No signed agreement PDF found for this client. They may not have signed yet, or the PDF hasn't been generated.";
  }

  // Generate a signed URL (valid for 10 minutes)
  const { data: signedUrl, error } = await ctx.supabase.storage
    .from("agreements")
    .createSignedUrl(agreement.pdf_url, 600);

  if (error || !signedUrl?.signedUrl) {
    return `Agreement exists (signed ${formatDate(agreement.signed_at)}) but couldn't generate download link: ${error?.message || "unknown error"}. Tell the agent to try downloading from their Profile page.`;
  }

  return [
    "== Agreement Download ==",
    `Signed on: ${formatDate(agreement.signed_at)}`,
    `Download link (expires in 10 minutes): ${signedUrl.signedUrl}`,
    "",
    "Share this link with the agent. It's a temporary link that expires in 10 minutes.",
  ].join("\n");
}

// ── get_agreement_details ─────────────────────────────────────────────

async function getAgreementDetails(ctx: ToolContext): Promise<string> {
  // Get agreement
  const { data: agreement, error } = await ctx.supabase
    .from("agreements")
    .select(
      "signed_at, signer_full_name, key_terms_checkboxes, time_on_page_seconds, payment_amount, scrolled_to_bottom",
    )
    .eq("client_id", ctx.clientId)
    .order("signed_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !agreement) {
    return "No agreement found for this client.";
  }

  // Get billing info to determine cycle status
  const { data: client } = await ctx.supabase
    .from("clients")
    .select("billing_cycle_start_at, billing_frequency, management_fee, activated_at")
    .eq("id", ctx.clientId)
    .single();

  const signedDate = new Date(agreement.signed_at);
  const today = new Date();
  const daysSinceSigning = Math.floor((today.getTime() - signedDate.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate billing cycles completed
  const billingStart = client?.billing_cycle_start_at
    ? new Date(client.billing_cycle_start_at)
    : signedDate;
  const isMonthly = client?.billing_frequency === "monthly";
  const cycleLengthDays = isMonthly ? 30 : 14; // monthly or bi-weekly
  const cyclesCompleted = Math.floor(
    (today.getTime() - billingStart.getTime()) / (1000 * 60 * 60 * 24 * cycleLengthDays),
  );
  const withinMinimumTerm = cyclesCompleted < 2;

  const timeOnPage = agreement.time_on_page_seconds
    ? `${Math.floor(agreement.time_on_page_seconds / 60)} minutes and ${agreement.time_on_page_seconds % 60} seconds`
    : "unknown";

  const keyTerms = agreement.key_terms_checkboxes || {};
  const acknowledgedTerms: string[] = [];

  const termLabels: Record<string, string> = {
    no_refunds: "No Refunds - all fees are non-refundable (Section 9.8)",
    no_guarantees: "No Guarantees on lead outcomes or results",
    cancellation_notice: "Cancellation requires 21-day written notice via email or Alpha Hub chat + cancellation form (Section 7)",
    immediate_suspension: "Immediate suspension for non-payment",
    chargebacks_prohibited: "Chargebacks are prohibited",
    exclusive_delivery: "All leads delivered are final, no returns or credits",
    personal_guarantee: "Personal guarantee (individual liability)",
    wyoming_venue: "Wyoming venue for disputes",
    zoom_resolution: "Zoom resolution conference required before any claim",
    ad_spend_non_refundable: "Ad spend and operations fees are non-refundable immediately upon payment (Section 2)",
  };

  for (const [key, val] of Object.entries(keyTerms)) {
    if (val && typeof val === "object" && (val as { checked?: boolean }).checked) {
      acknowledgedTerms.push(termLabels[key] || key);
    }
  }

  const managementFee = client?.management_fee
    ? `$${(client.management_fee / 100).toFixed(2)}/month`
    : "on file";

  return [
    "== Service Agreement Details ==",
    `Signed by: ${agreement.signer_full_name}`,
    `Signed on: ${formatDate(agreement.signed_at)}`,
    `Days since signing: ${daysSinceSigning}`,
    `Time spent reviewing agreement: ${timeOnPage}`,
    `Scrolled to bottom before signing: ${agreement.scrolled_to_bottom ? "yes" : "no"}`,
    `Payment at signing: $${agreement.payment_amount || "N/A"}`,
    `Management fee: ${managementFee}`,
    "",
    "== COMMITMENT STATUS ==",
    `Billing cycles completed: ${cyclesCompleted}`,
    `Minimum term (2 cycles): ${withinMinimumTerm ? "STILL WITHIN minimum term - agent cannot cancel yet" : "Minimum term satisfied"}`,
    `Billing frequency: ${client?.billing_frequency || "monthly"}`,
    `21-day notice required: YES - cancellation requires 21 days written notice before next billing date`,
    "",
    "== KEY TERMS AGENT ACKNOWLEDGED (each individually checked) ==",
    ...acknowledgedTerms.map((t) => `  - ${t}`),
    "",
    "== HOW TO USE THIS INFO ==",
    withinMinimumTerm
      ? "This agent is STILL within their 2-cycle minimum commitment. They cannot cancel yet. Remind them of this respectfully and let them know you're bringing it to the finance team to discuss their options."
      : "This agent has completed their minimum term. They CAN cancel but must provide 21-day written notice. Remind them of the notice requirement and the no-refunds policy, then route to the finance team.",
    "Always be respectful and matter-of-fact. Never threatening. Route to finance team for final resolution.",
  ].join("\n");
}

// Map Stella's categories to existing DB categories
const CATEGORY_MAP: Record<string, string> = {
  BILLING: "billing",
  LEADS: "leads",
  CAMPAIGN: "tech",
  TECHNICAL: "tech",
  RETENTION: "other",
  OTHER: "other",
};

// Map Stella's priorities to existing DB enum
const PRIORITY_MAP: Record<string, string> = {
  CRITICAL: "urgent",
  HIGH: "high",
  MEDIUM: "normal",
  LOW: "low",
};

async function createSupportTicket(
  ctx: ToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const category = CATEGORY_MAP[input.category as string] || "other";
  const priority = PRIORITY_MAP[input.priority as string] || "normal";

  const message = [
    input.details || "",
    "",
    `--- Created by Stella (AI assistant) ---`,
    `Conversation: ${ctx.conversationId}`,
    `Original category: ${input.category}`,
    `Original priority: ${input.priority}`,
  ].join("\n");

  const { error } = await ctx.supabase.from("support_tickets").insert({
    client_id: ctx.clientId,
    subject: input.summary,
    message,
    category,
    priority,
    status: "open",
    ticket_type: "client_support",
    labels: ["stella", "ai-created"],
  });

  if (error) {
    return `Failed to create ticket: ${error.message}. Tell the agent you're noting the issue and the team will follow up.`;
  }

  return `Ticket created successfully. Category: ${category}, Priority: ${priority}, Summary: ${input.summary}. You can tell the agent the marketing team will follow up.`;
}
