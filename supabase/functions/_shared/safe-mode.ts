/**
 * Shared safe mode helpers for billing edge functions.
 *
 * Centralizes safe mode entry (snapshot + activate), exit (restore from snapshot),
 * and status checks. All safe mode logic should go through these helpers to prevent
 * duplication and ensure consistent behavior (RECH-11, RECH-12, RECH-14).
 *
 * Usage:
 *   import { snapshotAndActivateSafeMode, restoreFromSnapshot, isInSafeMode } from '../_shared/safe-mode.ts';
 */

import { notify } from './notifications.ts';

// Safe Mode budget ladder - try lowest first, fallback if rejected by Google Ads
const SAFE_MODE_BUDGETS = [0.01, 0.10, 1.00];

/**
 * Check whether safe mode is currently active for a client.
 *
 * Primary source: recharge_state.safe_mode_active
 * Fallback: campaigns table safe_mode flag (for clients without recharge_state row)
 */
export async function isInSafeMode(
  supabase: any,
  clientId: string,
): Promise<boolean> {
  // Primary: check recharge_state
  const { data: rechargeState } = await supabase
    .from('recharge_state')
    .select('safe_mode_active')
    .eq('client_id', clientId)
    .maybeSingle();

  if (rechargeState?.safe_mode_active === true) {
    return true;
  }

  // Fallback: check campaigns table for any campaign in safe mode
  if (!rechargeState) {
    const { data: safeCampaigns } = await supabase
      .from('campaigns')
      .select('id')
      .eq('client_id', clientId)
      .eq('safe_mode', true)
      .limit(1);

    return (safeCampaigns?.length ?? 0) > 0;
  }

  return false;
}

/**
 * Snapshot campaign budgets and activate safe mode for a client.
 *
 * RECH-11: If safe mode is already active, logs and returns without re-snapshotting
 * (prevents capturing $0.01 budgets as real budgets).
 *
 * RECH-14: Google Ads API failures are caught and logged. DB state is marked as
 * safe_mode_active regardless, so the next check-low-balance run will retry.
 *
 * @param supabase - Service role Supabase client
 * @param clientId - Client UUID
 * @param accessToken - Google Ads OAuth access token
 * @param triggeredBy - What triggered safe mode (e.g. 'check-low-balance')
 */
export async function snapshotAndActivateSafeMode(
  supabase: any,
  clientId: string,
  accessToken: string,
  triggeredBy: string,
): Promise<void> {
  // Fetch ALL campaigns for this client with Google Ads IDs
  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('id, google_customer_id, google_campaign_id, current_daily_budget, status, ignored, safe_mode')
    .eq('client_id', clientId)
    .not('google_campaign_id', 'is', null);

  if (campaignsError) {
    console.error(`[safe-mode] Failed to fetch campaigns for ${clientId}:`, campaignsError);
    await notify({
      supabase,
      clientId,
      severity: 'critical',
      title: 'Safe Mode Failed - Campaign Fetch Error',
      message: `Could not fetch campaigns for safe mode activation: ${campaignsError.message}`,
    });
    return;
  }

  const activeCampaigns = (campaigns || []).filter((c: any) => !c.ignored);

  // RECH-11 guard (improved): If ALL active campaigns are already in safe mode, skip.
  // If some campaigns escaped safe mode (e.g. restored individually or added after),
  // only process the non-safe-mode campaigns without re-snapshotting the ones already pennied.
  const notInSafeMode = activeCampaigns.filter((c: any) => !c.safe_mode);
  const alreadyInSafeMode = await isInSafeMode(supabase, clientId);

  if (alreadyInSafeMode && notInSafeMode.length === 0) {
    console.log(`[safe-mode] Client ${clientId} already fully in safe mode, skipping`);
    return;
  }

  const isPartialFix = alreadyInSafeMode && notInSafeMode.length > 0;

  if (isPartialFix) {
    console.log(`[safe-mode] Client ${clientId} partially in safe mode — ${notInSafeMode.length} campaign(s) escaped. Fixing...`);
  }

  // Determine which campaigns to process
  const campaignsToProcess = isPartialFix ? notInSafeMode : activeCampaigns;

  if (campaignsToProcess.length === 0) {
    console.log(`[safe-mode] Client ${clientId} has no campaigns to process`);
    // Still mark safe mode active in recharge_state for consistency
    await supabase
      .from('recharge_state')
      .upsert(
        { client_id: clientId, safe_mode_active: true, safe_mode_activated_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: 'client_id' },
      );
    return;
  }

  // Only create a new snapshot for full safe mode entry (not partial fixes)
  let snapshotId: string | null = null;
  if (!isPartialFix) {
    // Build snapshot JSONB
    const snapshotData = activeCampaigns.map((row: any) => ({
      campaign_id: row.id,
      campaign_name: row.google_campaign_id,
      daily_budget: row.current_daily_budget,
      status: row.status,
    }));

    // Insert into campaign_budget_snapshots
    const { data: snapshot, error: snapshotError } = await supabase
      .from('campaign_budget_snapshots')
      .insert({
        client_id: clientId,
        snapshot_type: 'safe_mode_entry',
        campaign_budgets: snapshotData,
        triggered_by: triggeredBy,
      })
      .select('id')
      .single();

    if (snapshotError) {
      console.error(`[safe-mode] Failed to create snapshot for ${clientId}:`, snapshotError);
      await notify({
        supabase,
        clientId,
        severity: 'critical',
        title: 'Safe Mode Failed - Snapshot Error',
        message: `Could not create budget snapshot: ${snapshotError.message}`,
      });
      return;
    }

    snapshotId = snapshot?.id;
    console.log(`[safe-mode] Created snapshot ${snapshotId} for ${clientId} with ${activeCampaigns.length} campaigns`);
  }

  // Set each campaign to safe mode budget via Google Ads API
  let campaignsAffected = 0;

  for (const campaign of campaignsToProcess) {
    const customerId = campaign.google_customer_id?.replace(/\D/g, '');
    const campaignId = campaign.google_campaign_id?.replace(/\D/g, '');

    if (!customerId || !campaignId) {
      console.warn(`[safe-mode] Skipping campaign ${campaign.id}: missing customer/campaign ID`);
      continue;
    }

    // RECH-14: Wrap Google Ads call in try/catch
    let budgetUsed = 0;
    let success = false;
    try {
      const result = await updateGoogleAdsBudgetDirect(accessToken, customerId, campaignId);
      budgetUsed = result.budgetUsed;
      success = result.success;
    } catch (e) {
      console.error(`[safe-mode] Google Ads API error for campaign ${campaignId}:`, e);
      await notify({
        supabase,
        clientId,
        severity: 'critical',
        title: 'Safe Mode - Google Ads API Error',
        message: `Failed to set safe mode budget for campaign ${campaignId}: ${e instanceof Error ? e.message : 'Unknown error'}`,
        metadata: { campaign_id: campaign.id, google_campaign_id: campaignId },
      });
      // Continue to next campaign -- DB state will be marked and next run retries
    }

    // Update campaign in DB regardless of Google Ads success (DB state is authoritative)
    if (success) {
      await supabase
        .from('campaigns')
        .update({
          safe_mode: true,
          safe_mode_reason: triggeredBy,
          safe_mode_triggered_at: new Date().toISOString(),
          safe_mode_budget_used: budgetUsed,
          pre_safe_mode_budget: campaign.current_daily_budget,
          current_daily_budget: budgetUsed,
          last_budget_change_at: new Date().toISOString(),
          last_budget_change_by: 'SAFE_MODE',
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaign.id);

      campaignsAffected++;
    } else {
      // Mark safe mode in DB even if Google Ads call failed (RECH-14: DB is authoritative)
      await supabase
        .from('campaigns')
        .update({
          safe_mode: true,
          safe_mode_reason: `${triggeredBy} (api_failed)`,
          safe_mode_triggered_at: new Date().toISOString(),
          pre_safe_mode_budget: campaign.current_daily_budget,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaign.id);

      campaignsAffected++;
    }
  }

  // Update recharge_state: safe_mode_active = true
  await supabase
    .from('recharge_state')
    .upsert(
      { client_id: clientId, safe_mode_active: true, safe_mode_activated_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: 'client_id' },
    );

  // Log to campaign_audit_log
  await supabase.from('campaign_audit_log').insert([{
    client_id: clientId,
    action: 'safe_mode_enter',
    actor: 'system',
    reason_codes: [triggeredBy],
    new_value: { campaigns_affected: campaignsAffected, snapshot_id: snapshotId },
    notes: `Safe mode activated for ${campaignsAffected} campaign(s). Snapshot: ${snapshotId}. Triggered by: ${triggeredBy}.`,
  }]);

  console.log(`[safe-mode] Activated safe mode for ${clientId}: ${campaignsAffected} campaigns affected`);
}

/**
 * Restore campaign budgets from the latest unrestored snapshot.
 *
 * Uses an atomic UPDATE ... WHERE restored_at IS NULL RETURNING * to prevent
 * double-restoration race conditions (two concurrent calls both restoring the
 * same snapshot).
 *
 * RECH-12: Sets grace_period_until = now() + 2 hours on recharge_state to
 * suppress false safe mode re-triggers during Google Ads budget propagation.
 *
 * RECH-14: Google Ads API failures are caught and logged. DB flags are still
 * cleared so the system doesn't get stuck in safe mode permanently.
 *
 * @returns Object with restored (boolean) and campaignsRestored (count)
 */
export async function restoreFromSnapshot(
  supabase: any,
  clientId: string,
  restoredBy: string,
): Promise<{ restored: boolean; campaignsRestored: number }> {
  // Atomic claim: UPDATE ... WHERE restored_at IS NULL RETURNING *
  // This prevents concurrent calls from both reading the same unrestored snapshot
  const { data: snapshot, error } = await supabase
    .from('campaign_budget_snapshots')
    .update({
      restored_at: new Date().toISOString(),
      restored_by: restoredBy,
    })
    .eq('client_id', clientId)
    .eq('snapshot_type', 'safe_mode_entry')
    .is('restored_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error(`[safe-mode] Error claiming snapshot for ${clientId}:`, error);
    return { restored: false, campaignsRestored: 0 };
  }

  if (!snapshot) {
    // Either no snapshot exists or it was already claimed by a concurrent call
    console.log(`[safe-mode] No unrestored snapshot for ${clientId} (already restored or none exists)`);
    return { restored: false, campaignsRestored: 0 };
  }

  console.log(`[safe-mode] Restoring from snapshot ${snapshot.id} for ${clientId}`);

  const budgets = snapshot.campaign_budgets as Array<{
    campaign_id: string;
    campaign_name: string;
    daily_budget: number;
    status: string;
  }>;

  let campaignsRestored = 0;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // CRITICAL: Clear safe_mode_active BEFORE pushing budgets to Google Ads.
  // update-google-ads-budget blocks edits when safe_mode_active = true,
  // so we must clear it first for the restoration calls to succeed.
  const gracePeriodUntil = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('recharge_state')
    .upsert(
      {
        client_id: clientId,
        safe_mode_active: false,
        safe_mode_activated_at: null,
        grace_period_until: gracePeriodUntil,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id' },
    );
  console.log(`[safe-mode] Cleared safe_mode_active before budget restoration, grace period until ${gracePeriodUntil}`);

  for (const budget of budgets) {
    // Skip if budget was already at safe mode level before snapshot (rare but defensive)
    if (!budget.daily_budget || budget.daily_budget <= 0.01) {
      console.log(`[safe-mode] Skipping campaign ${budget.campaign_id}: budget was <= $0.01 before snapshot`);
      continue;
    }

    // RECH-14: Wrap Google Ads call in try/catch
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/update-google-ads-budget`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          campaignRowId: budget.campaign_id,
          newDailyBudget: budget.daily_budget,
          changeSource: 'safe_mode_exit',
          changeReason: `Restored from snapshot ${snapshot.id}`,
        }),
      });

      if (!res.ok) {
        const raw = await res.text();
        console.error(`[safe-mode] Failed to restore budget for campaign ${budget.campaign_id}: ${raw.slice(0, 300)}`);
        await notify({
          supabase,
          clientId,
          severity: 'critical',
          title: 'Budget Restoration Failed',
          message: `Failed to restore campaign ${budget.campaign_name} to $${budget.daily_budget}/day: ${raw.slice(0, 200)}`,
          metadata: { campaign_id: budget.campaign_id, snapshot_id: snapshot.id },
        });
        // Still clear safe mode flags below (RECH-14: DB state is authoritative)
      }
    } catch (e) {
      console.error(`[safe-mode] Exception restoring budget for campaign ${budget.campaign_id}:`, e);
      await notify({
        supabase,
        clientId,
        severity: 'critical',
        title: 'Budget Restoration Error',
        message: `Exception restoring campaign ${budget.campaign_name}: ${e instanceof Error ? e.message : 'Unknown error'}`,
        metadata: { campaign_id: budget.campaign_id, snapshot_id: snapshot.id },
      });
    }

    // Clear safe mode flags on campaign regardless of API success
    await supabase
      .from('campaigns')
      .update({
        safe_mode: false,
        safe_mode_reason: null,
        safe_mode_triggered_at: null,
        safe_mode_budget_used: null,
        current_daily_budget: budget.daily_budget,
        last_budget_change_at: new Date().toISOString(),
        last_budget_change_by: restoredBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', budget.campaign_id);

    campaignsRestored++;
  }

  // recharge_state already cleared above (before budget push loop)

  // Log to campaign_audit_log
  await supabase.from('campaign_audit_log').insert([{
    client_id: clientId,
    action: 'safe_mode_exit',
    actor: 'system',
    reason_codes: [restoredBy],
    old_value: { safe_mode: true, snapshot_id: snapshot.id },
    new_value: { safe_mode: false, campaigns_restored: campaignsRestored, grace_period_until: gracePeriodUntil },
    notes: `Safe mode exited. Restored ${campaignsRestored} campaign(s) from snapshot ${snapshot.id}. Grace period until ${gracePeriodUntil}. Restored by: ${restoredBy}.`,
  }]);

  console.log(`[safe-mode] Restored ${campaignsRestored} campaigns for ${clientId} from snapshot ${snapshot.id}`);

  return { restored: true, campaignsRestored };
}

// ---------------------------------------------------------------------------
// Internal helper: Set campaign budget to safe mode via Google Ads API
// Uses the SAFE_MODE_BUDGETS ladder (try $0.01, then $0.10, then $1.00)
// ---------------------------------------------------------------------------

async function updateGoogleAdsBudgetDirect(
  accessToken: string,
  customerId: string,
  campaignId: string,
): Promise<{ success: boolean; budgetUsed: number }> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const mccCustomerId = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID');
  const cleanMccId = mccCustomerId?.trim().replace(/-/g, '');

  // Get the campaign's budget resource name
  const searchQuery = `
    SELECT campaign.campaign_budget
    FROM campaign
    WHERE campaign.id = ${campaignId}
  `;

  const searchUrl = `https://googleads.googleapis.com/v22/customers/${customerId}/googleAds:searchStream`;
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
    const raw = await searchResponse.text();
    console.error(`[safe-mode] Search error for campaign ${campaignId}:`, raw);
    return { success: false, budgetUsed: 0 };
  }

  const searchData = await searchResponse.json();
  const budgetResourceName = searchData?.[0]?.results?.[0]?.campaign?.campaignBudget;

  if (!budgetResourceName) {
    console.error(`[safe-mode] Could not find budget resource for campaign ${campaignId}`);
    return { success: false, budgetUsed: 0 };
  }

  // Try Safe Mode budget ladder
  for (const budgetToTry of SAFE_MODE_BUDGETS) {
    const budgetAmountMicros = Math.round(budgetToTry * 1_000_000);

    console.log(`[safe-mode] Attempting to set campaign ${campaignId} budget to $${budgetToTry}...`);

    const mutateResponse = await fetch(
      `https://googleads.googleapis.com/v22/customers/${customerId}/campaignBudgets:mutate`,
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
      },
    );

    if (mutateResponse.ok) {
      console.log(`[safe-mode] Successfully set campaign ${campaignId} to $${budgetToTry}`);
      return { success: true, budgetUsed: budgetToTry };
    }

    const raw = await mutateResponse.text();
    console.warn(`[safe-mode] Budget $${budgetToTry} rejected for campaign ${campaignId}: ${raw.slice(0, 200)}`);
  }

  console.error(`[safe-mode] All safe mode budget attempts failed for campaign ${campaignId}`);
  return { success: false, budgetUsed: 0 };
}
