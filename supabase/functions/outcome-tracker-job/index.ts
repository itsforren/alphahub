import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Outcome scoring weights
const SCORING_WEIGHTS = {
  conversions_improved: 1,
  cpl_improved: 1,
  pacing_improved: 1,
  safe_mode_triggered: -2,
};

interface OutcomeMetrics {
  spend: number;
  conversions: number;
  cpl: number | null;
  ctr: number;
  cvr: number;
  conversions_per_day: number;
}

function calculateOutcomeScore(
  baseline: OutcomeMetrics,
  outcome: OutcomeMetrics,
  safeModeTriggered: boolean
): number {
  let score = 0;

  // +1 if conversions/day improved
  if (outcome.conversions_per_day > baseline.conversions_per_day) {
    score += SCORING_WEIGHTS.conversions_improved;
  }

  // +1 if CPL improved (lower is better)
  if (baseline.cpl && outcome.cpl && outcome.cpl < baseline.cpl) {
    score += SCORING_WEIGHTS.cpl_improved;
  }

  // -2 if safe mode triggered within window
  if (safeModeTriggered) {
    score += SCORING_WEIGHTS.safe_mode_triggered;
  }

  return score;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('📈 Starting Outcome Tracker Job...');

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Get executed proposals that need outcome tracking
    // 1 day ago, 3 days ago, 7 days ago
    const windows = [
      { days: 1, field: 'outcome_1d' },
      { days: 3, field: 'outcome_3d' },
      { days: 7, field: 'outcome_7d' },
    ];

    let tracked = 0;

    for (const window of windows) {
      const windowDate = new Date(now);
      windowDate.setDate(windowDate.getDate() - window.days);
      const windowDateStr = windowDate.toISOString().split('T')[0];

      // Find decision events that were executed on this date and don't have this outcome yet
      const { data: events, error } = await supabase
        .from('decision_events')
        .select(`
          id, campaign_id, client_id, decision_at, 
          features_at_decision, was_approved,
          outcome_1d, outcome_3d, outcome_7d
        `)
        .eq('was_approved', true)
        .gte('decision_at', `${windowDateStr}T00:00:00`)
        .lt('decision_at', `${windowDateStr}T23:59:59`)
        .is(window.field, null);

      if (error) {
        console.error(`Error fetching events for ${window.days}d window:`, error);
        continue;
      }

      if (!events || events.length === 0) {
        console.log(`No events need ${window.days}d outcome tracking`);
        continue;
      }

      console.log(`Processing ${events.length} events for ${window.days}d outcome...`);

      for (const event of events) {
        try {
          // Get metrics for the window period
          const windowStart = windowDateStr;
          const windowEnd = today;

          const { data: metricsData } = await supabase
            .from('ad_spend_daily')
            .select('cost, clicks, conversions, ctr')
            .eq('client_id', event.client_id)
            .gte('spend_date', windowStart)
            .lte('spend_date', windowEnd);

          if (!metricsData || metricsData.length === 0) {
            console.log(`No metrics data for event ${event.id}`);
            continue;
          }

          // Aggregate metrics
          const totalSpend = metricsData.reduce((s, m) => s + Number(m.cost || 0), 0);
          const totalConversions = metricsData.reduce((s, m) => s + Number(m.conversions || 0), 0);
          const avgCtr = metricsData.reduce((s, m) => s + Number(m.ctr || 0), 0) / metricsData.length;
          const daysInWindow = metricsData.length;

          const outcome: OutcomeMetrics = {
            spend: totalSpend,
            conversions: totalConversions,
            cpl: totalConversions > 0 ? totalSpend / totalConversions : null,
            ctr: avgCtr,
            cvr: 0, // Calculated if clicks available
            conversions_per_day: totalConversions / daysInWindow,
          };

          // Get baseline from features_at_decision
          const features = event.features_at_decision || {};
          const baseline: OutcomeMetrics = {
            spend: features.yesterday?.spend || 0,
            conversions: features.yesterday?.conversions || 0,
            cpl: features.yesterday?.cpl || null,
            ctr: features.yesterday?.ctr || 0,
            cvr: features.yesterday?.cvr || 0,
            conversions_per_day: features.yesterday?.conversions || 0,
          };

          // Check if safe mode was triggered in window
          const { data: safeModeCheck } = await supabase
            .from('campaigns')
            .select('safe_mode, safe_mode_triggered_at')
            .eq('id', event.campaign_id)
            .single();

          const safeModeTriggered = safeModeCheck?.safe_mode && 
            safeModeCheck?.safe_mode_triggered_at &&
            new Date(safeModeCheck.safe_mode_triggered_at) >= windowDate;

          // Calculate outcome score for 3d and 7d windows
          let outcomeScore: number | null = null;
          if (window.days >= 3) {
            outcomeScore = calculateOutcomeScore(baseline, outcome, safeModeTriggered || false);
          }

          // Update decision event
          const updateData: Record<string, unknown> = {
            [window.field]: {
              spend: outcome.spend,
              conversions: outcome.conversions,
              cpl: outcome.cpl,
              ctr: outcome.ctr,
              conversions_per_day: outcome.conversions_per_day,
              days_in_window: daysInWindow,
              safe_mode_triggered: safeModeTriggered,
            },
            updated_at: new Date().toISOString(),
          };

          if (window.days === 3) {
            updateData.outcome_score_3d = outcomeScore;
          } else if (window.days === 7) {
            updateData.outcome_score_7d = outcomeScore;
          }

          await supabase
            .from('decision_events')
            .update(updateData)
            .eq('id', event.id);

          tracked++;
          console.log(`  Tracked ${window.days}d outcome for event ${event.id}, score: ${outcomeScore}`);

        } catch (eventError) {
          console.error(`Error processing event ${event.id}:`, eventError);
        }
      }
    }

    console.log(`\n✅ Outcome Tracker completed. Tracked: ${tracked}`);

    return new Response(JSON.stringify({
      success: true,
      tracked,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in outcome-tracker-job:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
