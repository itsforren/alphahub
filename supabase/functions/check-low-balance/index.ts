/**
 * check-low-balance: Safe mode DETECTION function.
 *
 * This function does exactly TWO things:
 * 1. Detects low balance against the safe mode threshold ($100 default)
 * 2. Activates safe mode when balance <= safe_mode_threshold (via shared helper)
 *
 * IMPORTANT: This function does NOT call attempt_recharge(). It does NOT
 * initiate charges. Charge initiation is the sole responsibility of
 * auto-recharge-run (Plan 03) via attempt_recharge() RPC.
 *
 * Called by: pg_cron (every 5 minutes)
 * Auth: BILLING_EDGE_SECRET header or service role JWT (WALL-13)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notify } from '../_shared/notifications.ts';
import { snapshotAndActivateSafeMode } from '../_shared/safe-mode.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default safe mode threshold if not set per-client
const DEFAULT_SAFE_MODE_THRESHOLD = 100;

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
    const error = await response.text();
    console.error('OAuth token error:', error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // WALL-13: Require shared secret for service-to-service calls
  const billingSecret = Deno.env.get('BILLING_EDGE_SECRET');
  const providedSecret = req.headers.get('x-billing-secret');

  const authHeader = req.headers.get('Authorization');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;
  const hasValidSecret = billingSecret && providedSecret === billingSecret;

  if (!isServiceRole && !hasValidSecret) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { clientId: requestedClientId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = supabaseServiceKey!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine which clients to check
    let clientsToCheck: { id: string; name: string }[] = [];

    if (requestedClientId) {
      // Check specific client
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('id', requestedClientId)
        .single();

      if (error) throw error;
      if (data) clientsToCheck = [data];
    } else {
      // Check all clients with auto_stripe billing mode (active billing clients)
      const { data: wallets, error: walletsError } = await supabase
        .from('client_wallets')
        .select('client_id')
        .eq('billing_mode', 'auto_stripe');

      if (walletsError) throw walletsError;

      const walletClientIds = (wallets || []).map((w: any) => w.client_id);

      if (walletClientIds.length > 0) {
        const { data, error } = await supabase
          .from('clients')
          .select('id, name')
          .in('id', walletClientIds);

        if (error) throw error;
        clientsToCheck = data || [];
      }
    }

    console.log(`[check-low-balance] Checking ${clientsToCheck.length} clients for safe mode threshold`);

    const results: { client: string; action: string; balance: number; pessimisticBalance?: number; threshold?: number }[] = [];
    let accessToken: string | null = null;

    for (const client of clientsToCheck) {
      try {
        // Get wallet config for safe mode threshold
        const { data: wallet } = await supabase
          .from('client_wallets')
          .select('safe_mode_threshold')
          .eq('client_id', client.id)
          .maybeSingle();

        const safeModeThreshold = wallet?.safe_mode_threshold ?? DEFAULT_SAFE_MODE_THRESHOLD;

        // Use compute_wallet_balance() RPC as single source of truth
        const { data: balanceResult, error: balanceError } = await supabase.rpc('compute_wallet_balance', {
          p_client_id: client.id,
        });

        if (balanceError) {
          console.error(`[check-low-balance] Failed to compute balance for ${client.name}:`, balanceError);
          results.push({ client: client.name, action: 'balance_error', balance: 0 });
          continue;
        }

        const balance = balanceResult?.remaining_balance ?? 0;

        // CAMP-06: Use pessimistic balance for safe mode threshold comparison
        // Pessimistic balance = wallet minus worst-case remaining daily spend for today
        const { data: pessimisticResult, error: pessimisticError } = await supabase.rpc('pessimistic_balance', {
          p_client_id: client.id,
        });

        if (pessimisticError) {
          console.warn(`[check-low-balance] pessimistic_balance RPC failed for ${client.name}, falling back to regular balance:`, pessimisticError);
        }

        // Fall back to regular balance if pessimistic function fails
        const effectiveBalance = pessimisticError ? balance : (pessimisticResult ?? balance);

        console.log(`[check-low-balance] Client ${client.name}: Balance = $${balance.toFixed(2)}, Pessimistic = $${Number(effectiveBalance).toFixed(2)}, Safe Mode Threshold = $${safeModeThreshold}`);

        // Check grace period (RECH-12): skip safe mode checks if recently restored
        const { data: rechargeState } = await supabase
          .from('recharge_state')
          .select('grace_period_until, safe_mode_active')
          .eq('client_id', client.id)
          .maybeSingle();

        const inGracePeriod = rechargeState?.grace_period_until &&
          new Date(rechargeState.grace_period_until) > new Date();

        // RECH-03 + CAMP-06: Safe mode at safe_mode_threshold using pessimistic balance (skip if in grace period)
        if (effectiveBalance <= safeModeThreshold && !inGracePeriod) {
          console.log(`[check-low-balance] Client ${client.name}: Pessimistic balance $${Number(effectiveBalance).toFixed(2)} <= threshold $${safeModeThreshold}, activating safe mode`);

          // Get access token only once (lazy init)
          if (!accessToken) {
            accessToken = await getAccessToken();
          }

          // Delegate to shared helper (handles RECH-11 re-entry guard internally)
          await snapshotAndActivateSafeMode(supabase, client.id, accessToken, 'check-low-balance');

          // Notify via shared helper
          await notify({
            supabase,
            clientId: client.id,
            clientName: client.name,
            severity: 'critical',
            title: 'Safe Mode Activated',
            message: `Balance $${balance.toFixed(2)} (pessimistic: $${Number(effectiveBalance).toFixed(2)}) below safe mode threshold $${safeModeThreshold}. Campaigns set to $0.01.`,
            metadata: { balance, pessimistic_balance: effectiveBalance, threshold: safeModeThreshold },
          });

          results.push({
            client: client.name,
            action: 'safe_mode_activated',
            balance,
            pessimisticBalance: effectiveBalance,
            threshold: safeModeThreshold,
          });
        } else if (effectiveBalance <= safeModeThreshold && inGracePeriod) {
          // Balance is low but we just restored -- skip to avoid yo-yo
          console.log(`[check-low-balance] Client ${client.name}: In grace period until ${rechargeState.grace_period_until}, skipping safe mode check`);
          results.push({
            client: client.name,
            action: 'safe_mode_skipped_grace_period',
            balance,
            pessimisticBalance: effectiveBalance,
            threshold: safeModeThreshold,
          });
        } else {
          // Balance is above threshold
          results.push({
            client: client.name,
            action: 'ok',
            balance,
            pessimisticBalance: effectiveBalance,
            threshold: safeModeThreshold,
          });
        }
      } catch (clientError) {
        // Per-client error handling -- don't let one client failure stop the batch
        const errorMsg = clientError instanceof Error ? clientError.message : 'Unknown error';
        console.error(`[check-low-balance] Error checking ${client.name}:`, clientError);
        results.push({ client: client.name, action: `error: ${errorMsg}`, balance: 0 });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      checked: clientsToCheck.length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[check-low-balance] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
