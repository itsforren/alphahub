import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =========================================================================
// ADS MANAGER SLACK FEED (Incoming Webhook)
// =========================================================================

async function postAdsManagerWebhook(payload: unknown): Promise<void> {
  const webhookUrl = Deno.env.get('SLACK_ADS_MANAGER_WEBHOOK_URL');
  if (!webhookUrl) return;

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const raw = await res.text();
      throw new Error(`Ads Manager webhook failed [${res.status}]: ${raw.slice(0, 500)}`);
    }
  } catch (e) {
    console.error('Failed to post Ads Manager Slack webhook:', e);
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface RulesResult {
  status: 'green' | 'yellow' | 'red';
  safeModeTriggered: boolean;
  safeModeReason?: string;
  reasonCodes: string[];
  proposedAction?: 'SET_BUDGET' | 'SAFE_MODE' | 'INVESTIGATE';
  proposedBudget?: number;
  proposedDeltaPct?: number;
  pacingInfo: {
    cycleStart: string | null;
    cycleEnd: string | null;
    daysRemaining: number;
    targetSpend: number;
    spentToDate: number;
    requiredDailySpend: number;
    paceDriftPct: number;
  };
  utilizationInfo: {
    yesterdayUtilization: number;
    avg7dUtilization: number;
    overdeliveryYesterday: boolean;
  };
}

interface DailyMetrics {
  date: string; // CRITICAL: The actual date from Google Ads segments.date
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  ctr: number;
  cvr: number;
  cpl: number | null;
  cpc: number;
  budget: number;
  utilization: number;
  overdelivery: boolean;
}

interface CampaignSettings {
  ctr_red_threshold: number;
  cvr_red_threshold: number;
  no_conv_spend_threshold: number;
  not_spending_budget_threshold: number;
  not_spending_spend_threshold: number;
  clicks_no_conv_threshold: number;
  cpl_yellow_threshold: number;
  max_budget_change_pct: number;
  target_spend_pct: number;
  auto_approve_green: boolean;
  auto_approve_yellow: boolean;
  auto_approve_red: boolean;
  policy_version: string;
  ai_provider: string;
  slack_webhook_url: string | null;
}

interface HealthScoreResult {
  totalScore: number;
  healthLabel: string;
  delivery: number;
  cvr: number;
  cpl: number;
  bookedCall: number;
  drivers: {
    positive: string[];
    negative: string[];
  };
}

interface LeadMetrics {
  leads_last_7d: number;
  booked_calls_last_7d: number;
  booked_call_rate_7d: number | null;
  leads_prior_7d: number;
  booked_calls_prior_7d: number;
  booked_call_rate_prior_7d: number | null;
  leads_yesterday: number;
  booked_calls_yesterday: number;
  booked_call_rate_yesterday: number | null;
}

// ============================================================================
// UTILITIES
// ============================================================================

// Get Eastern timezone date strings for today, yesterday, and 2 days ago
function getEasternDates(): { today: string; yesterday: string; dayBefore: string } {
  const now = new Date();
  // Convert to Eastern time
  const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  // Today
  const today = new Date(eastern);
  
  // Yesterday
  const yesterday = new Date(eastern);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Day before (2 days ago)
  const dayBefore = new Date(eastern);
  dayBefore.setDate(dayBefore.getDate() - 2);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  return {
    today: formatDate(today),
    yesterday: formatDate(yesterday),
    dayBefore: formatDate(dayBefore),
  };
}

function get7DayRanges(yesterdayStr: string): { last7dStart: string; prior7dStart: string; prior7dEnd: string } {
  const yesterday = new Date(yesterdayStr);
  
  const last7dStart = new Date(yesterday);
  last7dStart.setDate(last7dStart.getDate() - 6); // 7 days including yesterday
  
  const prior7dEnd = new Date(last7dStart);
  prior7dEnd.setDate(prior7dEnd.getDate() - 1);
  
  const prior7dStart = new Date(prior7dEnd);
  prior7dStart.setDate(prior7dStart.getDate() - 6);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  return {
    last7dStart: formatDate(last7dStart),
    prior7dStart: formatDate(prior7dStart),
    prior7dEnd: formatDate(prior7dEnd),
  };
}

// ============================================================================
// GOOGLE ADS API
// ============================================================================

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_ADS_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_ADS_REFRESH_TOKEN');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken!,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchGoogleAdsMetrics(
  accessToken: string,
  customerId: string,
  campaignId: string,
  startDate: string,
  endDate: string
): Promise<{ metrics: DailyMetrics[]; currentBudget: number; campaignEnabled: boolean }> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
  const cleanCustomerId = customerId.replace(/-/g, '');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

  const query = `
    SELECT
      segments.date,
      campaign.id,
      campaign.status,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc,
      campaign_budget.amount_micros
    FROM campaign
    WHERE campaign.id = ${campaignId}
      AND segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY segments.date DESC
  `;

  const apiUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/googleAds:searchStream`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken!,
      'login-customer-id': cleanMccId!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const raw = await response.text();
    console.error('Google Ads API error:', raw);
    throw new Error(`Google Ads API error: ${raw.slice(0, 500)}`);
  }

  const data = await response.json();
  const metrics: DailyMetrics[] = [];
  let currentBudget = 0;
  let campaignEnabled = true;

  if (data && Array.isArray(data)) {
    for (const batch of data) {
      if (batch.results) {
        for (const row of batch.results) {
          const cost = (row.metrics?.costMicros || 0) / 1_000_000;
          const budget = (row.campaignBudget?.amountMicros || 0) / 1_000_000;
          const clicks = row.metrics?.clicks || 0;
          const conversions = row.metrics?.conversions || 0;
          
          currentBudget = budget;
          campaignEnabled = row.campaign?.status === 'ENABLED';
          
          metrics.push({
            date: row.segments?.date || '', // CAPTURE THE ACTUAL DATE FROM GOOGLE ADS
            spend: cost,
            clicks,
            impressions: row.metrics?.impressions || 0,
            conversions,
            ctr: (row.metrics?.ctr || 0) * 100,
            cvr: clicks > 0 ? (conversions / clicks) * 100 : 0,
            cpl: conversions > 0 ? cost / conversions : null,
            cpc: (row.metrics?.averageCpc || 0) / 1_000_000,
            budget,
            utilization: budget > 0 ? (cost / budget) : 0,
            overdelivery: cost > budget,
          });
        }
      }
    }
  }

  return { metrics, currentBudget, campaignEnabled };
}

// Apply Safe Mode budget with fallback ladder
async function applySafeModeBudget(
  accessToken: string,
  customerId: string,
  campaignId: string
): Promise<{ success: boolean; budgetUsed: number | null }> {
  const fallbackBudgets = [0.01, 0.10, 1.00];
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
  const cleanCustomerId = customerId.replace(/-/g, '');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

  // Get budget resource name
  const searchQuery = `
    SELECT campaign.campaign_budget
    FROM campaign
    WHERE campaign.id = ${campaignId}
  `;

  const searchUrl = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/googleAds:searchStream`;
  const searchResponse = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken!,
      'login-customer-id': cleanMccId!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: searchQuery }),
  });

  if (!searchResponse.ok) {
    console.error('Failed to get budget resource:', await searchResponse.text());
    return { success: false, budgetUsed: null };
  }

  const searchData = await searchResponse.json();
  const budgetResourceName = searchData?.[0]?.results?.[0]?.campaign?.campaignBudget;

  if (!budgetResourceName) {
    console.error('Could not find campaign budget resource');
    return { success: false, budgetUsed: null };
  }

  // Try each fallback budget
  for (const budget of fallbackBudgets) {
    const budgetAmountMicros = Math.round(budget * 1_000_000);

    const mutateResponse = await fetch(
      `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/campaignBudgets:mutate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken!,
          'login-customer-id': cleanMccId!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operations: [{
            update: {
              resourceName: budgetResourceName,
              amountMicros: budgetAmountMicros.toString(),
            },
            updateMask: 'amount_micros',
          }],
        }),
      }
    );

    if (mutateResponse.ok) {
      console.log(`Safe Mode: Successfully set budget to $${budget}`);
      return { success: true, budgetUsed: budget };
    }

    console.log(`Safe Mode: $${budget} rejected, trying next fallback`);
  }

  return { success: false, budgetUsed: null };
}

// ============================================================================
// DETERMINISTIC HEALTH SCORE (4 Pillars = 95 points max)
// ============================================================================

function calculateDeterministicHealthScore(
  last7dMetrics: DailyMetrics | null,
  yesterdayMetrics: DailyMetrics | null,
  dayBeforeMetrics: DailyMetrics | null,
  priorCpl: number | null,
  leadMetrics: LeadMetrics,
  pacingInfo: RulesResult['pacingInfo'],
  utilizationInfo: RulesResult['utilizationInfo'],
  settings: CampaignSettings,
  safeModeActive: boolean,
  campaignEnabled: boolean
): HealthScoreResult {
  const drivers: { positive: string[]; negative: string[] } = { positive: [], negative: [] };

  // ========== PILLAR 1: Delivery & Pacing (35 points) ==========
  let deliveryScore = 35;
  
  // "Not spending" penalty: enabled + budget > $30 + yesterday spend < $5
  const notSpending = campaignEnabled && 
    (yesterdayMetrics?.budget || 0) > settings.not_spending_budget_threshold &&
    (yesterdayMetrics?.spend || 0) < settings.not_spending_spend_threshold;
  
  if (notSpending) {
    deliveryScore -= 15;
    drivers.negative.push('Not spending');
  }

  // Pace drift penalty
  const paceDriftPct = pacingInfo.paceDriftPct;
  if (Math.abs(paceDriftPct) > 30) {
    deliveryScore -= 10;
    drivers.negative.push(`Pace off by ${Math.abs(paceDriftPct).toFixed(0)}%`);
  } else if (Math.abs(paceDriftPct) > 15) {
    deliveryScore -= 5;
    drivers.negative.push(`Pace drifting (${paceDriftPct > 0 ? '+' : ''}${paceDriftPct.toFixed(0)}%)`);
  }

  // Utilization burn risk (>= 150% average over 7 days)
  if (utilizationInfo.avg7dUtilization >= 1.5) {
    deliveryScore -= 5;
    drivers.negative.push('Over-delivery risk');
  }

  deliveryScore = Math.max(0, deliveryScore);
  if (deliveryScore >= 30) {
    drivers.positive.push('Strong delivery');
  }

  // ========== PILLAR 2: Funnel Conversion Efficiency (25 points) ==========
  let cvrScore = 0;
  const cvr7d = last7dMetrics?.cvr || 0;

  if (cvr7d >= 8) {
    cvrScore = 25;
    drivers.positive.push('Excellent CVR');
  } else if (cvr7d >= 5) {
    cvrScore = 18;
  } else if (cvr7d >= 3) {
    cvrScore = 10;
    drivers.negative.push('Low CVR');
  } else {
    cvrScore = 0;
    drivers.negative.push('Very low CVR');
  }

  // "50+ clicks, 0 conversions for 2 consecutive days" penalty
  if (
    yesterdayMetrics && dayBeforeMetrics &&
    yesterdayMetrics.clicks >= settings.clicks_no_conv_threshold &&
    dayBeforeMetrics.clicks >= settings.clicks_no_conv_threshold &&
    yesterdayMetrics.conversions === 0 &&
    dayBeforeMetrics.conversions === 0
  ) {
    cvrScore = Math.max(0, cvrScore - 10);
    drivers.negative.push('No conversions (2 days)');
  }

  // ========== PILLAR 3: Cost Efficiency (20 points) ==========
  let cplScore = 0;
  const cpl7d = last7dMetrics?.cpl || null;

  if (cpl7d !== null) {
    if (cpl7d <= 35) {
      cplScore = 20;
      drivers.positive.push('Excellent CPL');
    } else if (cpl7d <= 50) {
      cplScore = 14;
    } else if (cpl7d <= 70) {
      cplScore = 7;
      drivers.negative.push('High CPL');
    } else {
      cplScore = 0;
      drivers.negative.push('Very high CPL');
    }

    // Trend penalty: CPL_7d increased > 20% vs prior_7d
    if (priorCpl !== null && priorCpl > 0) {
      const cplIncrease = ((cpl7d - priorCpl) / priorCpl) * 100;
      if (cplIncrease > 20) {
        cplScore = Math.max(0, cplScore - 3);
        drivers.negative.push('CPL trending up');
      }
    }
  }

  // ========== PILLAR 4: Booked Call Quality (15 points) ==========
  let bookedCallScore = 0;
  const bookedRate = leadMetrics.booked_call_rate_7d;
  const leadsCount = leadMetrics.leads_last_7d;

  if (bookedRate !== null) {
    if (bookedRate >= 60) {
      bookedCallScore = 15;
      drivers.positive.push('Excellent booked rate');
    } else if (bookedRate >= 50) {
      bookedCallScore = 10;
      drivers.positive.push('Good booked rate');
    } else if (bookedRate >= 35) {
      bookedCallScore = 5;
    } else {
      bookedCallScore = 0;
      drivers.negative.push('Low booked rate');
    }

    // Low sample guard: if < 10 leads, cap impact
    if (leadsCount < 10 && bookedCallScore === 0) {
      bookedCallScore = 10; // Don't penalize heavily for low sample
      // Remove the negative driver we just added
      const idx = drivers.negative.indexOf('Low booked rate');
      if (idx > -1) drivers.negative.splice(idx, 1);
    }
  } else {
    // No lead data - give neutral score
    bookedCallScore = 10;
  }

  // ========== TOTAL SCORE ==========
  let totalScore = deliveryScore + cvrScore + cplScore + bookedCallScore;

  // Safe Mode: Force to Critical regardless of score
  if (safeModeActive) {
    totalScore = Math.min(totalScore, 20);
    drivers.negative.push('Safe mode active');
  }

  totalScore = Math.max(0, Math.min(95, totalScore));

  // Determine label
  let healthLabel: string;
  if (safeModeActive) {
    healthLabel = 'Critical';
  } else if (totalScore >= 85) {
    healthLabel = 'Healthy';
  } else if (totalScore >= 70) {
    healthLabel = 'Good';
  } else if (totalScore >= 55) {
    healthLabel = 'At Risk';
  } else {
    healthLabel = 'Critical';
  }

  // Limit drivers to top 2 each
  return {
    totalScore,
    healthLabel,
    delivery: deliveryScore,
    cvr: cvrScore,
    cpl: cplScore,
    bookedCall: bookedCallScore,
    drivers: {
      positive: drivers.positive.slice(0, 2),
      negative: drivers.negative.slice(0, 2),
    },
  };
}

// ============================================================================
// RULES ENGINE
// ============================================================================

function runRulesEngine(
  todayMetrics: DailyMetrics | null,
  yesterdayMetrics: DailyMetrics | null,
  dayBeforeMetrics: DailyMetrics | null,
  last7dMetrics: DailyMetrics | null,
  settings: CampaignSettings,
  walletInfo: { walletRemaining: number; cycleStart: string | null; cycleEnd: string | null; displayedSpend: number; totalDeposits: number; lowBalanceThreshold: number },
  billingStatus: string,
  currentBudget: number,
  campaignEnabled: boolean,
  performancePercentage: number
): RulesResult {
  const reasonCodes: string[] = [];
  let status: 'green' | 'yellow' | 'red' = 'green';
  let safeModeTriggered = false;
  let safeModeReason: string | undefined;
  let proposedAction: 'SET_BUDGET' | 'SAFE_MODE' | 'INVESTIGATE' | undefined;
  let proposedBudget: number | undefined;
  let proposedDeltaPct: number | undefined;

  const { walletRemaining, cycleStart, cycleEnd, displayedSpend, totalDeposits, lowBalanceThreshold } = walletInfo;
  
  // Calculate pacing based on spending the remaining wallet by period end
  // FIX: Do NOT divide by performance percentage - that's only for display
  let daysRemaining = 1;
  let targetSpend = walletRemaining;
  let requiredDailySpend = 0;
  let paceDriftPct = 0;

  if (cycleEnd) {
    const end = new Date(cycleEnd);
    const now = new Date();
    daysRemaining = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    // FIX: requiredDailySpend = target / days (no performance fee adjustment for pacing)
    requiredDailySpend = Math.max(0, targetSpend / daysRemaining);
    
    if (requiredDailySpend > 0 && currentBudget > 0) {
      paceDriftPct = ((currentBudget - requiredDailySpend) / requiredDailySpend) * 100;
    }
  }

  // Utilization info
  const yesterdayUtilization = yesterdayMetrics?.utilization || 0;
  const avg7dUtilization = last7dMetrics?.utilization || 0;
  const overdeliveryYesterday = yesterdayMetrics?.overdelivery || false;

  // ============ SAFE MODE CHECKS (AUTO EXECUTE) ============
  
  // SAFE_BILLING
  if (['past_due', 'payment_failed', 'suspended'].includes(billingStatus)) {
    safeModeTriggered = true;
    safeModeReason = 'SAFE_BILLING';
    reasonCodes.push('SAFE_BILLING');
  }

  // SAFE_WALLET - Balance at or below per-client threshold (not hardcoded)
  // FIX: Use client's low_balance_threshold from client_wallets table
  if (walletRemaining <= lowBalanceThreshold) {
    safeModeTriggered = true;
    safeModeReason = 'SAFE_WALLET';
    reasonCodes.push('SAFE_WALLET');
  }

  // SAFE_NO_CONV_SPEND_2D - Spend >= $60/day AND 0 conversions for 2 consecutive days
  if (
    yesterdayMetrics && dayBeforeMetrics &&
    yesterdayMetrics.spend >= settings.no_conv_spend_threshold &&
    dayBeforeMetrics.spend >= settings.no_conv_spend_threshold &&
    yesterdayMetrics.conversions === 0 &&
    dayBeforeMetrics.conversions === 0
  ) {
    safeModeTriggered = true;
    safeModeReason = 'SAFE_NO_CONV_SPEND_2D';
    reasonCodes.push('SAFE_NO_CONV_SPEND_2D');
  }

  // If safe mode triggered, set action
  if (safeModeTriggered) {
    status = 'red';
    proposedAction = 'SAFE_MODE';
    proposedBudget = 0.01;
    proposedDeltaPct = currentBudget > 0 ? ((0.01 - currentBudget) / currentBudget) * 100 : -100;
  } else {
    // ============ RED CHECKS ============
    
    // RED_NOT_SPENDING_IMMEDIATE
    if (
      campaignEnabled &&
      currentBudget > settings.not_spending_budget_threshold &&
      yesterdayMetrics &&
      yesterdayMetrics.spend < settings.not_spending_spend_threshold
    ) {
      status = 'red';
      reasonCodes.push('RED_NOT_SPENDING_IMMEDIATE');
      proposedAction = 'INVESTIGATE';
    }

    // CTR_LOW_3D
    const ctrDays = [todayMetrics, yesterdayMetrics, dayBeforeMetrics].filter(Boolean);
    const lowCtrDays = ctrDays.filter(m => m && m.ctr < settings.ctr_red_threshold);
    
    if (ctrDays.length >= 2 && lowCtrDays.length === ctrDays.length) {
      const recentMetrics = todayMetrics || yesterdayMetrics || dayBeforeMetrics;
      const cplValue = recentMetrics?.cpl || last7dMetrics?.cpl;
      const cplIsBad = cplValue && cplValue > settings.cpl_yellow_threshold;
      
      if (cplIsBad) {
        status = 'red';
        reasonCodes.push('RED_CTR_LOW_CPL_HIGH');
        if (!proposedAction) proposedAction = 'INVESTIGATE';
      }
    }

    // RED_CVR_LOW_2D
    if (
      yesterdayMetrics && dayBeforeMetrics &&
      yesterdayMetrics.cvr < settings.cvr_red_threshold &&
      dayBeforeMetrics.cvr < settings.cvr_red_threshold
    ) {
      status = 'red';
      reasonCodes.push('RED_CVR_LOW_2D');
      if (!proposedAction) proposedAction = 'INVESTIGATE';
    }

    // RED_50CLICKS_0CONV_2D
    if (
      yesterdayMetrics && dayBeforeMetrics &&
      yesterdayMetrics.clicks >= settings.clicks_no_conv_threshold &&
      dayBeforeMetrics.clicks >= settings.clicks_no_conv_threshold &&
      yesterdayMetrics.conversions === 0 &&
      dayBeforeMetrics.conversions === 0
    ) {
      status = 'red';
      reasonCodes.push('RED_50CLICKS_0CONV_2D');
      if (!proposedAction) proposedAction = 'INVESTIGATE';
    }

    // ============ YELLOW CHECKS ============
    if (status === 'green') {
      // YELLOW_CPL_HIGH_2D
      if (
        yesterdayMetrics?.cpl && dayBeforeMetrics?.cpl &&
        yesterdayMetrics.cpl > settings.cpl_yellow_threshold &&
        dayBeforeMetrics.cpl > settings.cpl_yellow_threshold
      ) {
        status = 'yellow';
        reasonCodes.push('YELLOW_CPL_HIGH_2D');
      }

      // YELLOW_PACING_DRIFT
      if (requiredDailySpend > 0 && Math.abs(paceDriftPct) > 15) {
        status = 'yellow';
        reasonCodes.push('YELLOW_PACING_DRIFT');
      }
    }

    // ============ BUDGET PROPOSAL (for non-safe mode) ============
    if (!safeModeTriggered && requiredDailySpend > 0) {
      const maxChange = currentBudget * (settings.max_budget_change_pct / 100);
      let newBudget = requiredDailySpend;
      
      if (newBudget > currentBudget + maxChange) {
        newBudget = currentBudget + maxChange;
      } else if (newBudget < currentBudget - maxChange) {
        newBudget = currentBudget - maxChange;
      }

      const changePct = currentBudget > 0 ? ((newBudget - currentBudget) / currentBudget) * 100 : 0;
      if (Math.abs(changePct) > 5 || Math.abs(newBudget - currentBudget) > 1) {
        proposedAction = 'SET_BUDGET';
        proposedBudget = Math.round(newBudget * 100) / 100;
        proposedDeltaPct = changePct;
      }
    }
  }

  return {
    status,
    safeModeTriggered,
    safeModeReason,
    reasonCodes,
    proposedAction,
    proposedBudget,
    proposedDeltaPct,
    pacingInfo: {
      cycleStart,
      cycleEnd,
      daysRemaining,
      targetSpend,
      spentToDate: displayedSpend,
      requiredDailySpend,
      paceDriftPct,
    },
    utilizationInfo: {
      yesterdayUtilization,
      avg7dUtilization,
      overdeliveryYesterday,
    },
  };
}

// ============================================================================
// AI SUMMARY (Based on deterministic health score)
// ============================================================================

function generateAISummary(
  healthResult: HealthScoreResult,
  rulesResult: RulesResult,
  yesterdayMetrics: DailyMetrics | null
): { summary: string; diagnosis: string } {
  let summary = '';
  let diagnosis = '';

  const score = healthResult.totalScore;
  const label = healthResult.healthLabel;

  if (rulesResult.safeModeTriggered) {
    summary = `⚠️ Safe Mode triggered: ${rulesResult.safeModeReason}`;
    diagnosis = 'Campaign budget reduced to $0.01/day to protect wallet. Review wallet balance and billing status.';
  } else if (label === 'Critical') {
    const reasons = healthResult.drivers.negative.join(', ');
    summary = `🔴 Critical (${score}/95): ${reasons || rulesResult.reasonCodes.join(', ')}`;
    diagnosis = 'Investigate campaign delivery, tracking, or targeting issues immediately.';
  } else if (label === 'At Risk') {
    const reasons = healthResult.drivers.negative.join(', ');
    summary = `🟡 At Risk (${score}/95): ${reasons || 'Multiple metrics need attention'}`;
    diagnosis = 'Consider adjusting budget or investigating performance trends.';
  } else if (label === 'Good') {
    const positives = healthResult.drivers.positive.join(', ');
    summary = `🟢 Good (${score}/95): ${positives || 'Performing well'}`;
    diagnosis = 'Campaign is performing within acceptable ranges.';
  } else {
    const positives = healthResult.drivers.positive.join(', ');
    const cpl = yesterdayMetrics?.cpl;
    summary = `✅ Healthy (${score}/95): ${positives || `CPL: ${cpl ? `$${cpl.toFixed(2)}` : 'N/A'}`}`;
    diagnosis = 'Campaign performing excellently across all metrics.';
  }

  return { summary, diagnosis };
}

// ============================================================================
// SIMILARITY MATCHING
// ============================================================================

interface SimilarEvent {
  id: string;
  was_approved: boolean | null;
  outcome_score_7d: number | null;
  status_at_decision: string;
  reason_codes: string[];
}

async function findSimilarCases(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  rulesResult: RulesResult
): Promise<{ confidence: number; count: number; summary: string }> {
  const { data } = await supabase
    .from('decision_events')
    .select('id, was_approved, outcome_score_7d, status_at_decision, reason_codes')
    .eq('status_at_decision', rulesResult.status)
    .not('was_approved', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  const similarEvents = (data || []) as SimilarEvent[];

  if (similarEvents.length === 0) {
    return { confidence: 0.5, count: 0, summary: 'No similar cases found' };
  }

  const approved = similarEvents.filter(e => e.was_approved).length;
  const total = similarEvents.length;
  const approvalRate = approved / total;

  const scoredEvents = similarEvents.filter(e => e.outcome_score_7d !== null);
  const avgScore = scoredEvents.length > 0
    ? scoredEvents.reduce((sum, e) => sum + (e.outcome_score_7d || 0), 0) / scoredEvents.length
    : 0;

  let confidence = 0.5;
  if (approvalRate > 0.7 && avgScore > 0) {
    confidence = 0.8;
  } else if (approvalRate > 0.5) {
    confidence = 0.6;
  } else if (approvalRate < 0.3) {
    confidence = 0.3;
  }

  const summary = `${approved}/${total} approved (${(approvalRate * 100).toFixed(0)}%), avg score: ${avgScore.toFixed(1)}`;

  return { confidence, count: total, summary };
}

// ============================================================================
// LEAD METRICS CALCULATION
// ============================================================================

async function calculateLeadMetrics(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  clientId: string,
  agentId: string | null,
  yesterday: string,
  last7dStart: string,
  prior7dStart: string,
  prior7dEnd: string
): Promise<LeadMetrics> {
  // Get leads for last 7 days
  const { data: last7dLeads } = await supabase
    .from('leads')
    .select('id, booked_call_at, created_at')
    .eq('agent_id', agentId || '')
    .gte('created_at', last7dStart)
    .lte('created_at', yesterday + 'T23:59:59');

  const leadsArr7d = (last7dLeads || []) as Array<{ id: string; booked_call_at: string | null }>;
  const leads_last_7d = leadsArr7d.length;
  const booked_calls_last_7d = leadsArr7d.filter(l => l.booked_call_at).length;
  const booked_call_rate_7d = leads_last_7d > 0 
    ? (booked_calls_last_7d / leads_last_7d) * 100 
    : null;

  // Get leads for prior 7 days
  const { data: prior7dLeads } = await supabase
    .from('leads')
    .select('id, booked_call_at')
    .eq('agent_id', agentId || '')
    .gte('created_at', prior7dStart)
    .lte('created_at', prior7dEnd + 'T23:59:59');

  const leadsArrPrior = (prior7dLeads || []) as Array<{ id: string; booked_call_at: string | null }>;
  const leads_prior_7d = leadsArrPrior.length;
  const booked_calls_prior_7d = leadsArrPrior.filter(l => l.booked_call_at).length;
  const booked_call_rate_prior_7d = leads_prior_7d > 0
    ? (booked_calls_prior_7d / leads_prior_7d) * 100
    : null;

  // Get yesterday's leads
  const { data: yesterdayLeads } = await supabase
    .from('leads')
    .select('id, booked_call_at')
    .eq('agent_id', agentId || '')
    .gte('created_at', yesterday)
    .lt('created_at', yesterday + 'T23:59:59');

  const leadsArrYest = (yesterdayLeads || []) as Array<{ id: string; booked_call_at: string | null }>;
  const leads_yesterday = leadsArrYest.length;
  const booked_calls_yesterday = leadsArrYest.filter(l => l.booked_call_at).length;
  const booked_call_rate_yesterday = leads_yesterday > 0
    ? (booked_calls_yesterday / leads_yesterday) * 100
    : null;

  return {
    leads_last_7d,
    booked_calls_last_7d,
    booked_call_rate_7d,
    leads_prior_7d,
    booked_calls_prior_7d,
    booked_call_rate_prior_7d,
    leads_yesterday,
    booked_calls_yesterday,
    booked_call_rate_yesterday,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🌅 Starting Morning Review Job with New Health Score System...');

    // Get date ranges (Eastern timezone)
    const { today, yesterday, dayBefore } = getEasternDates();
    const { last7dStart, prior7dStart, prior7dEnd } = get7DayRanges(yesterday);
    
    console.log(`Date ranges: today=${today}, yesterday=${yesterday}, dayBefore=${dayBefore}`);
    console.log(`7d ranges: last7d=${last7dStart} to ${today}, prior7d=${prior7dStart} to ${prior7dEnd}`);

    // Get global settings
    const { data: globalSettings } = await supabase
      .from('campaign_settings')
      .select('*')
      .is('campaign_id', null)
      .single();

    const settings: CampaignSettings = globalSettings || {
      ctr_red_threshold: 5.0,
      cvr_red_threshold: 4.0,
      no_conv_spend_threshold: 60.0,
      not_spending_budget_threshold: 30.0,
      not_spending_spend_threshold: 5.0,
      clicks_no_conv_threshold: 50,
      cpl_yellow_threshold: 50.0,
      max_budget_change_pct: 20.0,
      target_spend_pct: 95.0,
      auto_approve_green: false,
      auto_approve_yellow: false,
      auto_approve_red: false,
      policy_version: 'v2.0',
      ai_provider: 'deterministic',
      slack_webhook_url: null,
    };

    // Get performance percentage setting
    const { data: perfSetting } = await supabase
      .from('onboarding_settings')
      .select('setting_value')
      .eq('setting_key', 'performance_percentage')
      .maybeSingle();
    
    const rawPerf = perfSetting?.setting_value ? parseFloat(perfSetting.setting_value) : NaN;
    const performancePercentage = Number.isFinite(rawPerf) ? rawPerf : 0;
    
    console.log(`Performance fee: ${performancePercentage}%`);

    // Get all clients with Google Ads campaigns (active only)
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select(`
        id, name, email, google_campaign_id, target_daily_spend,
        billing_status, billing_cycle_start_at, billing_cycle_end_at, agent_id
      `)
      .not('google_campaign_id', 'is', null)
      .is('deleted_at', null)
      .eq('status', 'active');

    if (clientsError) throw clientsError;
    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No clients with campaigns' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${clients.length} active clients...`);

    let accessToken: string | null = null;
    const results: { clientId: string; clientName: string; status: string; action: string; healthScore?: number }[] = [];

    for (const client of clients) {
      try {
        console.log(`\n📊 Processing: ${client.name}`);

        // Parse campaign ID
        const rawCampaignField = String(client.google_campaign_id).trim();
        if (!rawCampaignField.includes(':')) {
          console.log(`  ⚠️ Invalid campaign ID format, skipping`);
          continue;
        }

        const [customerPart, campaignPart] = rawCampaignField.split(':');
        const customerId = customerPart.replace(/\D/g, '');
        const campaignId = campaignPart.replace(/\D/g, '');

        if (!customerId || !campaignId) {
          console.log(`  ⚠️ Missing customer/campaign ID, skipping`);
          continue;
        }

        // Get access token once
        if (!accessToken) {
          accessToken = await getAccessToken();
        }

        // Fetch metrics from Google Ads
        const { metrics: allMetrics, currentBudget, campaignEnabled } = await fetchGoogleAdsMetrics(
          accessToken,
          customerId,
          campaignId,
          prior7dStart,
          today
        );

        // FIX: Find metrics by ACTUAL DATE, not array index
        // This prevents "ghost spend" when campaign was paused - old code would
        // incorrectly assign historical data to recent dates based on array position
        const todayMetrics = allMetrics.find(m => m.date === today) || null;
        const yesterdayMetrics = allMetrics.find(m => m.date === yesterday) || null;
        const dayBeforeMetrics = allMetrics.find(m => m.date === dayBefore) || null;
        
        // Log what dates we actually got from Google Ads vs what we're looking for
        const apiDates = allMetrics.map(m => m.date).slice(0, 10);
        console.log(`  API returned dates: [${apiDates.join(', ')}]`);
        console.log(`  Looking for: today=${today}, yesterday=${yesterday}, dayBefore=${dayBefore}`);
        console.log(`  Found: today=${!!todayMetrics}, yesterday=${!!yesterdayMetrics}, dayBefore=${!!dayBeforeMetrics}`);

        // Calculate 7-day aggregates
        const last7dData = allMetrics.slice(0, 7);
        const last7dTotalSpend = last7dData.reduce((s, m) => s + m.spend, 0);
        const last7dTotalConversions = last7dData.reduce((s, m) => s + m.conversions, 0);
        const last7dTotalClicks = last7dData.reduce((s, m) => s + m.clicks, 0);
        
        const last7dMetrics: DailyMetrics | null = last7dData.length > 0 ? {
          date: 'aggregate', // This is an aggregate, not a single day
          spend: last7dTotalSpend,
          clicks: last7dTotalClicks,
          impressions: last7dData.reduce((s, m) => s + m.impressions, 0),
          conversions: last7dTotalConversions,
          ctr: last7dData.reduce((s, m) => s + m.ctr, 0) / last7dData.length,
          cvr: last7dTotalClicks > 0 ? (last7dTotalConversions / last7dTotalClicks) * 100 : 0,
          cpl: last7dTotalConversions > 0 ? last7dTotalSpend / last7dTotalConversions : null,
          cpc: last7dData.reduce((s, m) => s + m.cpc, 0) / last7dData.length,
          budget: currentBudget,
          utilization: last7dData.reduce((s, m) => s + m.utilization, 0) / last7dData.length,
          overdelivery: false,
        } : null;

        // Calculate prior 7-day CPL for trend comparison
        const prior7dData = allMetrics.slice(7, 14);
        const prior7dTotalSpend = prior7dData.reduce((s, m) => s + m.spend, 0);
        const prior7dTotalConversions = prior7dData.reduce((s, m) => s + m.conversions, 0);
        const priorCpl = prior7dTotalConversions > 0 ? prior7dTotalSpend / prior7dTotalConversions : null;

        // ============ WALLET CALCULATION ============
        const { data: wallet } = await supabase
          .from('client_wallets')
          .select('tracking_start_date, low_balance_threshold, billing_mode')
          .eq('client_id', client.id)
          .maybeSingle();

        // Use per-client threshold or default to 150
        // Admin exempt accounts use -Infinity so SAFE_WALLET never triggers
        const lowBalanceThreshold = wallet?.billing_mode === 'admin_exempt' ? -Infinity : (wallet?.low_balance_threshold ?? 150);

        const { data: deposits } = await supabase
          .from('wallet_transactions')
          .select('amount')
          .eq('client_id', client.id)
          .in('transaction_type', ['deposit', 'adjustment']);

        const totalDeposits = deposits?.reduce((sum: number, d: { amount: number | string }) => sum + Number(d.amount || 0), 0) ?? 0;

        let trackedSpend = 0;
        if (wallet?.tracking_start_date) {
          const { data: spendData } = await supabase
            .from('ad_spend_daily')
            .select('cost')
            .eq('client_id', client.id)
            .gte('spend_date', wallet.tracking_start_date);
          
          trackedSpend = spendData?.reduce((sum: number, day: { cost: number | string | null }) => sum + Number(day.cost || 0), 0) ?? 0;
        }

        const displayedSpend = trackedSpend * (1 + performancePercentage / 100);
        const walletRemaining = totalDeposits - displayedSpend;

        const { data: paidBillingRecord } = await supabase
          .from('billing_records')
          .select('billing_period_start, billing_period_end')
          .eq('client_id', client.id)
          .eq('billing_type', 'ad_spend')
          .eq('status', 'paid')
          .order('paid_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const cycleStart = paidBillingRecord?.billing_period_start || wallet?.tracking_start_date || null;
        const cycleEnd = paidBillingRecord?.billing_period_end || null;

        const walletInfo = {
          walletRemaining,
          cycleStart,
          cycleEnd,
          displayedSpend,
          totalDeposits,
          lowBalanceThreshold,
        };

        console.log(`  Wallet: remaining=$${walletRemaining.toFixed(2)}`);

        // Upsert ad_spend_daily - ONLY if we have ACTUAL data for yesterday
        // FIX: Use the actual date from the metrics, not the calculated yesterday date
        if (yesterdayMetrics && yesterdayMetrics.date === yesterday) {
          console.log(`  ✅ Upserting real data for ${yesterday}: $${yesterdayMetrics.spend.toFixed(2)}`);
          await supabase
            .from('ad_spend_daily')
            .upsert({
              client_id: client.id,
              campaign_id: campaignId,
              spend_date: yesterdayMetrics.date, // Use actual date from API, not calculated
              cost: yesterdayMetrics.spend,
              impressions: yesterdayMetrics.impressions,
              clicks: yesterdayMetrics.clicks,
              conversions: yesterdayMetrics.conversions,
              ctr: yesterdayMetrics.ctr,
              cpc: yesterdayMetrics.cpc,
              budget_daily: currentBudget,
              budget_utilization: yesterdayMetrics.utilization,
              overdelivery: yesterdayMetrics.overdelivery,
              campaign_enabled: campaignEnabled,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'client_id,campaign_id,spend_date' });
        } else {
          console.log(`  ⚠️ No data from Google Ads for ${yesterday} - skipping upsert (prevents ghost data)`);
        }

        // Ensure campaign record exists
        const { data: existingCampaign } = await supabase
          .from('campaigns')
          .select('id, ignored')
          .eq('google_customer_id', customerId)
          .eq('google_campaign_id', campaignId)
          .single();

        let campaignDbId: string;
        let isIgnored = false;
        if (!existingCampaign) {
          const { data: newCampaign, error: insertError } = await supabase
            .from('campaigns')
            .insert({
              client_id: client.id,
              google_customer_id: customerId,
              google_campaign_id: campaignId,
              current_daily_budget: currentBudget,
            })
            .select('id')
            .single();
          
          if (insertError) throw insertError;
          campaignDbId = newCampaign.id;
        } else {
          campaignDbId = existingCampaign.id;
          isIgnored = existingCampaign.ignored || false;
        }

        // Skip primary campaign rules/proposals if ignored, throttled, or on cooldown
        // (additional campaigns still get health scores below)
        let skipPrimary = false;
        const now = new Date();

        if (isIgnored) {
          console.log(`  ⏭️ Campaign is ignored, skipping proposals`);
          results.push({ clientId: client.id, clientName: client.name, status: 'ignored', action: 'Skipped - campaign ignored' });
          skipPrimary = true;
        }

        if (!skipPrimary) {
          // ============ 12-HOUR PROPOSAL THROTTLING ============
          const { data: existingPending } = await supabase
            .from('proposals')
            .select('id, created_at')
            .eq('campaign_id', campaignDbId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: campaignForCooldown } = await supabase
            .from('campaigns')
            .select('last_budget_change_at')
            .eq('id', campaignDbId)
            .maybeSingle();

          const COOLDOWN_HOURS = 12;
          const cooldownCutoff = new Date(now.getTime() - COOLDOWN_HOURS * 60 * 60 * 1000);

          if (existingPending) {
            console.log(`  ⏸️ Pending proposal already exists (${existingPending.id}), skipping`);
            results.push({ clientId: client.id, clientName: client.name, status: 'skipped', action: 'Pending proposal exists' });
            skipPrimary = true;
          }

          if (!skipPrimary && campaignForCooldown?.last_budget_change_at &&
              new Date(campaignForCooldown.last_budget_change_at) > cooldownCutoff) {
            console.log(`  ⏸️ Budget changed within ${COOLDOWN_HOURS}h, cooldown active`);
            results.push({ clientId: client.id, clientName: client.name, status: 'cooldown', action: 'Cooldown active' });
            skipPrimary = true;
          }
        }

        if (!skipPrimary) {
        // Run rules engine
        const rulesResult = runRulesEngine(
          todayMetrics,
          yesterdayMetrics,
          dayBeforeMetrics,
          last7dMetrics,
          settings,
          walletInfo,
          client.billing_status || 'active',
          currentBudget,
          campaignEnabled,
          performancePercentage
        );

        console.log(`  Status: ${rulesResult.status}, Safe Mode: ${rulesResult.safeModeTriggered}`);
        console.log(`  Reason Codes: ${rulesResult.reasonCodes.join(', ') || 'none'}`);

        // Calculate lead metrics for booked call scoring
        const leadMetrics = await calculateLeadMetrics(
          supabase,
          client.id,
          client.agent_id,
          yesterday,
          last7dStart,
          prior7dStart,
          prior7dEnd
        );

        console.log(`  Leads 7d: ${leadMetrics.leads_last_7d}, Booked: ${leadMetrics.booked_calls_last_7d}, Rate: ${leadMetrics.booked_call_rate_7d?.toFixed(1) || 'N/A'}%`);

        // Calculate deterministic health score
        const healthResult = calculateDeterministicHealthScore(
          last7dMetrics,
          yesterdayMetrics,
          dayBeforeMetrics,
          priorCpl,
          leadMetrics,
          rulesResult.pacingInfo,
          rulesResult.utilizationInfo,
          settings,
          rulesResult.safeModeTriggered,
          campaignEnabled
        );

        console.log(`  Health Score: ${healthResult.totalScore}/95 (${healthResult.healthLabel})`);
        console.log(`  Pillars: Delivery=${healthResult.delivery}, CVR=${healthResult.cvr}, CPL=${healthResult.cpl}, Booked=${healthResult.bookedCall}`);

        // Generate AI summary
        const aiResult = generateAISummary(healthResult, rulesResult, yesterdayMetrics);

        // Find similar cases for confidence
        const similarity = await findSimilarCases(supabase, rulesResult);

        // Calculate pacing fields for storage
        let daysRemaining = 1;
        if (cycleEnd) {
          const end = new Date(cycleEnd);
          daysRemaining = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }

        // Update campaign record with new health score pillars
        await supabase
          .from('campaigns')
          .update({
            current_daily_budget: currentBudget,
            status: rulesResult.status,
            reason_codes: rulesResult.reasonCodes,
            health_score: healthResult.totalScore,
            health_label: healthResult.healthLabel,
            health_score_delivery: healthResult.delivery,
            health_score_cvr: healthResult.cvr,
            health_score_cpl: healthResult.cpl,
            health_score_booked_call: healthResult.bookedCall,
            health_drivers: healthResult.drivers,
            ai_summary: aiResult.summary,
            // Lead metrics
            leads_last_7d: leadMetrics.leads_last_7d,
            booked_calls_last_7d: leadMetrics.booked_calls_last_7d,
            booked_call_rate_7d: leadMetrics.booked_call_rate_7d,
            leads_prior_7d: leadMetrics.leads_prior_7d,
            booked_calls_prior_7d: leadMetrics.booked_calls_prior_7d,
            booked_call_rate_prior_7d: leadMetrics.booked_call_rate_prior_7d,
            leads_yesterday: leadMetrics.leads_yesterday,
            booked_calls_yesterday: leadMetrics.booked_calls_yesterday,
            booked_call_rate_yesterday: leadMetrics.booked_call_rate_yesterday,
            // Pacing fields
            wallet_remaining: walletRemaining,
            days_remaining_in_cycle: daysRemaining,
            required_daily_spend: rulesResult.pacingInfo.requiredDailySpend,
            pace_drift_pct: rulesResult.pacingInfo.paceDriftPct,
            last_status_change_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', campaignDbId);

        // Create rolling snapshot with health breakdown
        await supabase
          .from('rolling_snapshots')
          .upsert({
            campaign_id: campaignDbId,
            snapshot_date: yesterday,
            last_7d_spend: last7dMetrics?.spend || 0,
            last_7d_clicks: last7dMetrics?.clicks || 0,
            last_7d_impressions: last7dMetrics?.impressions || 0,
            last_7d_conversions: last7dMetrics?.conversions || 0,
            last_7d_ctr: last7dMetrics?.ctr || 0,
            last_7d_cvr: last7dMetrics?.cvr || 0,
            last_7d_cpl: last7dMetrics?.cpl,
            last_7d_cpc: last7dMetrics?.cpc || 0,
            last_7d_avg_utilization: last7dMetrics?.utilization || 0,
            leads_7d: leadMetrics.leads_last_7d,
            booked_calls_7d: leadMetrics.booked_calls_last_7d,
            booked_call_rate_7d: leadMetrics.booked_call_rate_7d,
            prior_7d_cpl: priorCpl,
            health_score_breakdown: {
              total: healthResult.totalScore,
              delivery: healthResult.delivery,
              cvr: healthResult.cvr,
              cpl: healthResult.cpl,
              bookedCall: healthResult.bookedCall,
              label: healthResult.healthLabel,
            },
          }, { onConflict: 'campaign_id,snapshot_date' });

        // Handle Safe Mode (AUTO EXECUTE ALWAYS)
        if (rulesResult.safeModeTriggered) {
          console.log(`  🚨 Executing Safe Mode...`);

          const safeModeResult = await applySafeModeBudget(accessToken, customerId, campaignId);

          await supabase
            .from('campaigns')
            .update({
              safe_mode: true,
              safe_mode_triggered_at: new Date().toISOString(),
              safe_mode_reason: rulesResult.safeModeReason,
              safe_mode_budget_used: safeModeResult.budgetUsed,
              pre_safe_mode_budget: currentBudget,
              current_daily_budget: safeModeResult.budgetUsed || 0.01,
              last_budget_change_at: new Date().toISOString(),
              last_budget_change_by: 'SAFE_MODE',
            })
            .eq('id', campaignDbId);

          // MULTI-CAMPAIGN: Also penny ALL other campaigns for this client
          const { data: otherCampaigns } = await supabase
            .from('campaigns')
            .select('id, google_customer_id, google_campaign_id, current_daily_budget, safe_mode, ignored')
            .eq('client_id', client.id)
            .neq('id', campaignDbId);

          let otherCampaignsPennied = 0;
          for (const otherCamp of (otherCampaigns || [])) {
            if (otherCamp.ignored) continue;
            if (otherCamp.safe_mode && otherCamp.current_daily_budget != null && otherCamp.current_daily_budget <= 1.00) {
              console.log(`  ↳ Campaign ${otherCamp.google_campaign_id} already in safe mode, skipping`);
              continue;
            }
            if (!otherCamp.google_customer_id || !otherCamp.google_campaign_id) continue;

            console.log(`  ↳ Also pennying campaign ${otherCamp.google_campaign_id}...`);
            const otherResult = await applySafeModeBudget(
              accessToken,
              otherCamp.google_customer_id.replace(/-/g, ''),
              otherCamp.google_campaign_id.replace(/-/g, '')
            );

            await supabase
              .from('campaigns')
              .update({
                safe_mode: true,
                safe_mode_triggered_at: new Date().toISOString(),
                safe_mode_reason: rulesResult.safeModeReason,
                safe_mode_budget_used: otherResult.budgetUsed,
                pre_safe_mode_budget: otherCamp.current_daily_budget,
                current_daily_budget: otherResult.budgetUsed || 0.01,
                last_budget_change_at: new Date().toISOString(),
                last_budget_change_by: 'SAFE_MODE',
              })
              .eq('id', otherCamp.id);

            if (otherResult.success) {
              otherCampaignsPennied++;
              await supabase.from('campaign_audit_log').insert({
                campaign_id: otherCamp.id,
                client_id: client.id,
                actor: 'SAFE_MODE',
                action: 'SAFE_MODE_TRIGGERED',
                old_value: { budget: otherCamp.current_daily_budget },
                new_value: { budget: otherResult.budgetUsed, reason: rulesResult.safeModeReason },
                reason_codes: rulesResult.reasonCodes,
                notes: `Multi-campaign safe mode: also pennied campaign ${otherCamp.google_campaign_id}`,
              });
            } else {
              console.error(`  ↳ Failed to penny campaign ${otherCamp.google_campaign_id}`);
            }
          }

          if (otherCampaignsPennied > 0) {
            console.log(`  ✅ Also pennied ${otherCampaignsPennied} additional campaign(s)`);
          }

          // Update client target_daily_spend as sum of all (now-pennied) campaign budgets
          const { data: allClientCampaigns } = await supabase
            .from('campaigns')
            .select('current_daily_budget')
            .eq('client_id', client.id);
          const totalClientBudget = allClientCampaigns?.reduce((sum: number, c: any) => sum + (Number(c.current_daily_budget) || 0), 0) || (safeModeResult.budgetUsed || 0.01);

          await supabase
            .from('clients')
            .update({ target_daily_spend: totalClientBudget })
            .eq('id', client.id);

          const { data: proposal } = await supabase
            .from('proposals')
            .insert({
              campaign_id: campaignDbId,
              client_id: client.id,
              proposed_action_type: 'SAFE_MODE',
              current_daily_budget: currentBudget,
              proposed_daily_budget: safeModeResult.budgetUsed || 0.01,
              delta_pct: rulesResult.proposedDeltaPct,
              reason_codes: rulesResult.reasonCodes,
              ai_summary: aiResult.summary,
              ai_diagnosis: aiResult.diagnosis,
              health_score: healthResult.totalScore,
              pacing_info: rulesResult.pacingInfo,
              recommendation_confidence: similarity.confidence,
              similar_cases_count: similarity.count,
              similar_cases_summary: similarity.summary,
              policy_version: 'v2.0',
              ai_provider: 'deterministic',
              status: 'auto_executed',
              executed_at: new Date().toISOString(),
              execution_result: { budgetUsed: safeModeResult.budgetUsed, success: safeModeResult.success },
            })
            .select('id')
            .single();

          await supabase.from('campaign_audit_log').insert({
            campaign_id: campaignDbId,
            client_id: client.id,
            proposal_id: proposal?.id,
            actor: 'SAFE_MODE',
            action: 'SAFE_MODE_TRIGGERED',
            old_value: { budget: currentBudget },
            new_value: { budget: safeModeResult.budgetUsed, reason: rulesResult.safeModeReason },
            reason_codes: rulesResult.reasonCodes,
          });

          await supabase.from('decision_events').insert({
            campaign_id: campaignDbId,
            client_id: client.id,
            proposal_id: proposal?.id,
            policy_version: 'v2.0',
            ai_provider: 'deterministic',
            decision_type: 'AUTO_SAFE_MODE',
            status_at_decision: rulesResult.status,
            reason_codes: rulesResult.reasonCodes,
            proposed_action_type: 'SAFE_MODE',
            proposed_daily_budget: 0.01,
            proposed_delta_pct: rulesResult.proposedDeltaPct,
            proposed_pacing_info: rulesResult.pacingInfo,
            was_approved: true,
            decision_at: new Date().toISOString(),
            final_action_type: 'SAFE_MODE',
            final_daily_budget: safeModeResult.budgetUsed,
            recommendation_confidence: similarity.confidence,
            features_at_decision: {
              yesterday: yesterdayMetrics,
              dayBefore: dayBeforeMetrics,
              last7d: last7dMetrics,
              wallet: walletInfo,
              healthScore: healthResult,
            },
          });

          const multiCampaignNote = otherCampaignsPennied > 0 ? `\n**Additional campaigns pennied:** ${otherCampaignsPennied}` : '';
          await supabase.from('admin_channel_messages').insert({
            channel_id: '00000000-0000-0000-0000-000000000001',
            sender_id: '00000000-0000-0000-0000-000000000000',
            message: `🚨 **SAFE MODE ACTIVATED**\n\n**Client:** ${client.name}\n**Reason:** ${rulesResult.safeModeReason}\n**Budget:** $${currentBudget} → $${safeModeResult.budgetUsed}${multiCampaignNote}\n**Health Score:** ${healthResult.totalScore}/95 (${healthResult.healthLabel})\n\n${aiResult.diagnosis}`,
          });

          // Slack feed
          const slackMultiNote = otherCampaignsPennied > 0 ? `\n*Additional campaigns pennied:* ${otherCampaignsPennied}` : '';
          await postAdsManagerWebhook({
            text: `🚨 SAFE MODE: ${client.name}${otherCampaignsPennied > 0 ? ` (${1 + otherCampaignsPennied} campaigns)` : ''}`,
            blocks: [
              { type: 'header', text: { type: 'plain_text', text: '🚨 Safe Mode Activated' } },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Client:* ${client.name}\n*Reason:* ${rulesResult.safeModeReason || 'Unknown'}\n*Budget:* $${Number(currentBudget).toFixed(2)} → $${Number(safeModeResult.budgetUsed || 0.01).toFixed(2)}${slackMultiNote}\n*Health:* ${healthResult.totalScore}/95 (${healthResult.healthLabel})\n\n*Diagnosis:* ${aiResult.diagnosis || aiResult.summary || ''}`,
                },
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: 'Open Command Center' },
                    url: `${Deno.env.get('PUBLIC_APP_URL') || 'https://alphaagent.io'}/hub/admin/command-center`,
                  },
                ],
              },
            ],
          });

          results.push({
            clientId: client.id,
            clientName: client.name,
            status: 'safe_mode',
            action: `Budget set to $${safeModeResult.budgetUsed}${otherCampaignsPennied > 0 ? ` (+${otherCampaignsPennied} other campaigns)` : ''}`,
            healthScore: healthResult.totalScore
          });

        } else if (rulesResult.proposedAction) {
          const { data: proposal } = await supabase
            .from('proposals')
            .insert({
              campaign_id: campaignDbId,
              client_id: client.id,
              proposed_action_type: rulesResult.proposedAction,
              current_daily_budget: currentBudget,
              proposed_daily_budget: rulesResult.proposedBudget,
              delta_pct: rulesResult.proposedDeltaPct,
              reason_codes: rulesResult.reasonCodes,
              ai_summary: aiResult.summary,
              ai_diagnosis: aiResult.diagnosis,
              health_score: healthResult.totalScore,
              pacing_info: rulesResult.pacingInfo,
              recommendation_confidence: similarity.confidence,
              similar_cases_count: similarity.count,
              similar_cases_summary: similarity.summary,
              policy_version: 'v2.0',
              ai_provider: 'deterministic',
              status: 'pending',
            })
            .select('id')
            .single();

          results.push({ 
            clientId: client.id, 
            clientName: client.name, 
            status: rulesResult.status, 
            action: `Proposal created: ${rulesResult.proposedAction} to $${rulesResult.proposedBudget}`,
            healthScore: healthResult.totalScore
          });

          // Slack feed with Approve-in-Slack and Deny via Command Center
          await postAdsManagerWebhook({
            text: `📋 Proposal: ${client.name}`,
            blocks: [
              { type: 'header', text: { type: 'plain_text', text: '📋 Budget Proposal Created' } },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Client:* ${client.name}\n*Action:* ${rulesResult.proposedAction}\n*Budget:* $${Number(currentBudget).toFixed(2)} → $${Number(rulesResult.proposedBudget || 0).toFixed(2)}\n*Health:* ${healthResult.totalScore}/95 (${healthResult.healthLabel})\n*Reasons:* ${(rulesResult.reasonCodes || []).join(', ') || '—'}\n\n*Summary:* ${aiResult.summary || ''}`,
                },
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: 'Approve (Slack)' },
                    style: 'primary',
                    action_id: 'approve_proposal',
                    value: proposal?.id,
                  },
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: 'Deny / Override (Command Center)' },
                    url:
                      `${Deno.env.get('PUBLIC_APP_URL') || 'https://alphaagent.io'}/hub/admin/command-center`,
                  },
                ],
              },
            ],
          });

          console.log(`  📝 Created proposal: ${rulesResult.proposedAction}`);
        } else {
          results.push({ 
            clientId: client.id, 
            clientName: client.name, 
            status: rulesResult.status, 
            action: 'No action needed',
            healthScore: healthResult.totalScore
          });
        }

        } // end if (!skipPrimary)

        // ============ MULTI-CAMPAIGN: Process additional campaigns for health scoring ============
        const { data: additionalCampaigns } = await supabase
          .from('campaigns')
          .select('id, google_customer_id, google_campaign_id, ignored')
          .eq('client_id', client.id)
          .neq('google_campaign_id', campaignId);

        for (const addCamp of (additionalCampaigns || [])) {
          if (addCamp.ignored) continue;
          const addCustomerId = addCamp.google_customer_id?.replace(/\D/g, '');
          const addCampaignId = addCamp.google_campaign_id?.replace(/\D/g, '');
          if (!addCustomerId || !addCampaignId) continue;

          try {
            console.log(`\n  📈 Additional campaign ${addCampaignId} for ${client.name}:`);

            // Fetch Google Ads metrics
            const { metrics: addAllMetrics, currentBudget: addBudget, campaignEnabled: addEnabled } =
              await fetchGoogleAdsMetrics(accessToken!, addCustomerId, addCampaignId, prior7dStart, today);

            // Find metrics by actual date
            const addTodayMetrics = addAllMetrics.find(m => m.date === today) || null;
            const addYesterdayMetrics = addAllMetrics.find(m => m.date === yesterday) || null;
            const addDayBeforeMetrics = addAllMetrics.find(m => m.date === dayBefore) || null;

            const addApiDates = addAllMetrics.map(m => m.date).slice(0, 10);
            console.log(`    API dates: [${addApiDates.join(', ')}]`);
            console.log(`    Found: today=${!!addTodayMetrics}, yesterday=${!!addYesterdayMetrics}, dayBefore=${!!addDayBeforeMetrics}`);

            // 7-day aggregates
            const addLast7dData = addAllMetrics.slice(0, 7);
            const addLast7dTotalSpend = addLast7dData.reduce((s, m) => s + m.spend, 0);
            const addLast7dTotalConversions = addLast7dData.reduce((s, m) => s + m.conversions, 0);
            const addLast7dTotalClicks = addLast7dData.reduce((s, m) => s + m.clicks, 0);

            const addLast7dMetrics: DailyMetrics | null = addLast7dData.length > 0 ? {
              date: 'aggregate',
              spend: addLast7dTotalSpend,
              clicks: addLast7dTotalClicks,
              impressions: addLast7dData.reduce((s, m) => s + m.impressions, 0),
              conversions: addLast7dTotalConversions,
              ctr: addLast7dData.reduce((s, m) => s + m.ctr, 0) / addLast7dData.length,
              cvr: addLast7dTotalClicks > 0 ? (addLast7dTotalConversions / addLast7dTotalClicks) * 100 : 0,
              cpl: addLast7dTotalConversions > 0 ? addLast7dTotalSpend / addLast7dTotalConversions : null,
              cpc: addLast7dData.reduce((s, m) => s + m.cpc, 0) / addLast7dData.length,
              budget: addBudget,
              utilization: addLast7dData.reduce((s, m) => s + m.utilization, 0) / addLast7dData.length,
              overdelivery: false,
            } : null;

            // Prior 7-day CPL for trend comparison
            const addPrior7dData = addAllMetrics.slice(7, 14);
            const addPrior7dTotalSpend = addPrior7dData.reduce((s, m) => s + m.spend, 0);
            const addPrior7dTotalConversions = addPrior7dData.reduce((s, m) => s + m.conversions, 0);
            const addPriorCpl = addPrior7dTotalConversions > 0 ? addPrior7dTotalSpend / addPrior7dTotalConversions : null;

            // Upsert ad_spend_daily for yesterday
            if (addYesterdayMetrics && addYesterdayMetrics.date === yesterday) {
              console.log(`    ✅ Upserting data for ${yesterday}: $${addYesterdayMetrics.spend.toFixed(2)}`);
              await supabase
                .from('ad_spend_daily')
                .upsert({
                  client_id: client.id,
                  campaign_id: addCampaignId,
                  spend_date: addYesterdayMetrics.date,
                  cost: addYesterdayMetrics.spend,
                  impressions: addYesterdayMetrics.impressions,
                  clicks: addYesterdayMetrics.clicks,
                  conversions: addYesterdayMetrics.conversions,
                  ctr: addYesterdayMetrics.ctr,
                  cpc: addYesterdayMetrics.cpc,
                  budget_daily: addBudget,
                  budget_utilization: addYesterdayMetrics.utilization,
                  overdelivery: addYesterdayMetrics.overdelivery,
                  campaign_enabled: addEnabled,
                  updated_at: new Date().toISOString(),
                }, { onConflict: 'client_id,campaign_id,spend_date' });
            } else {
              console.log(`    ⚠️ No data from Google Ads for ${yesterday} - skipping upsert`);
            }

            // Run rules engine
            const addRulesResult = runRulesEngine(
              addTodayMetrics, addYesterdayMetrics, addDayBeforeMetrics, addLast7dMetrics,
              settings, walletInfo, client.billing_status || 'active',
              addBudget, addEnabled, performancePercentage
            );

            // Lead metrics
            const addLeadMetrics = await calculateLeadMetrics(
              supabase, client.id, client.agent_id, yesterday, last7dStart, prior7dStart, prior7dEnd
            );

            console.log(`    Leads 7d: ${addLeadMetrics.leads_last_7d}, Booked: ${addLeadMetrics.booked_calls_last_7d}, Rate: ${addLeadMetrics.booked_call_rate_7d?.toFixed(1) || 'N/A'}%`);

            // Calculate health score
            const addHealthResult = calculateDeterministicHealthScore(
              addLast7dMetrics, addYesterdayMetrics, addDayBeforeMetrics, addPriorCpl,
              addLeadMetrics, addRulesResult.pacingInfo, addRulesResult.utilizationInfo,
              settings, addRulesResult.safeModeTriggered, addEnabled
            );

            console.log(`    Health Score: ${addHealthResult.totalScore}/95 (${addHealthResult.healthLabel})`);

            // AI summary
            const addAiResult = generateAISummary(addHealthResult, addRulesResult, addYesterdayMetrics);

            // Calculate days remaining
            let addDaysRemaining = 1;
            if (cycleEnd) {
              const end = new Date(cycleEnd);
              const now = new Date();
              addDaysRemaining = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            }

            // Update campaign record with health score and metrics
            await supabase
              .from('campaigns')
              .update({
                current_daily_budget: addBudget,
                status: addRulesResult.status,
                reason_codes: addRulesResult.reasonCodes,
                health_score: addHealthResult.totalScore,
                health_label: addHealthResult.healthLabel,
                health_score_delivery: addHealthResult.delivery,
                health_score_cvr: addHealthResult.cvr,
                health_score_cpl: addHealthResult.cpl,
                health_score_booked_call: addHealthResult.bookedCall,
                health_drivers: addHealthResult.drivers,
                ai_summary: addAiResult.summary,
                leads_last_7d: addLeadMetrics.leads_last_7d,
                booked_calls_last_7d: addLeadMetrics.booked_calls_last_7d,
                booked_call_rate_7d: addLeadMetrics.booked_call_rate_7d,
                leads_prior_7d: addLeadMetrics.leads_prior_7d,
                booked_calls_prior_7d: addLeadMetrics.booked_calls_prior_7d,
                booked_call_rate_prior_7d: addLeadMetrics.booked_call_rate_prior_7d,
                leads_yesterday: addLeadMetrics.leads_yesterday,
                booked_calls_yesterday: addLeadMetrics.booked_calls_yesterday,
                booked_call_rate_yesterday: addLeadMetrics.booked_call_rate_yesterday,
                wallet_remaining: walletRemaining,
                days_remaining_in_cycle: addDaysRemaining,
                required_daily_spend: addRulesResult.pacingInfo.requiredDailySpend,
                pace_drift_pct: addRulesResult.pacingInfo.paceDriftPct,
                last_status_change_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', addCamp.id);

            // Rolling snapshot
            await supabase
              .from('rolling_snapshots')
              .upsert({
                campaign_id: addCamp.id,
                snapshot_date: yesterday,
                last_7d_spend: addLast7dMetrics?.spend || 0,
                last_7d_clicks: addLast7dMetrics?.clicks || 0,
                last_7d_impressions: addLast7dMetrics?.impressions || 0,
                last_7d_conversions: addLast7dMetrics?.conversions || 0,
                last_7d_ctr: addLast7dMetrics?.ctr || 0,
                last_7d_cvr: addLast7dMetrics?.cvr || 0,
                last_7d_cpl: addLast7dMetrics?.cpl,
                last_7d_cpc: addLast7dMetrics?.cpc || 0,
                last_7d_avg_utilization: addLast7dMetrics?.utilization || 0,
                leads_7d: addLeadMetrics.leads_last_7d,
                booked_calls_7d: addLeadMetrics.booked_calls_last_7d,
                booked_call_rate_7d: addLeadMetrics.booked_call_rate_7d,
                prior_7d_cpl: addPriorCpl,
                health_score_breakdown: {
                  total: addHealthResult.totalScore,
                  delivery: addHealthResult.delivery,
                  cvr: addHealthResult.cvr,
                  cpl: addHealthResult.cpl,
                  bookedCall: addHealthResult.bookedCall,
                  label: addHealthResult.healthLabel,
                },
              }, { onConflict: 'campaign_id,snapshot_date' });

            results.push({
              clientId: client.id,
              clientName: client.name,
              status: addRulesResult.status,
              action: `Campaign ${addCampaignId}: ${addHealthResult.healthLabel} (${addHealthResult.totalScore}/95)`,
              healthScore: addHealthResult.totalScore,
            });

          } catch (addCampError) {
            console.error(`    ❌ Error processing additional campaign ${addCamp.google_campaign_id}:`, addCampError);
            results.push({
              clientId: client.id,
              clientName: client.name,
              status: 'error',
              action: `Campaign ${addCampaignId}: ${String(addCampError)}`,
            });
          }
        }

      } catch (clientError) {
        console.error(`  ❌ Error processing ${client.name}:`, clientError);
        results.push({ clientId: client.id, clientName: client.name, status: 'error', action: String(clientError) });
      }
    }

    console.log('\n✅ Morning Review Job completed');

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error in morning-review-job:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
