/**
 * Centralized GHL OAuth token management.
 *
 * Replaces 8+ inline copies of token refresh logic across edge functions.
 * Uses Postgres row-level locking to prevent race conditions where two
 * functions try to refresh simultaneously and one invalidates the other's
 * refresh token.
 *
 * Usage:
 *   import { getAgencyAccessToken } from '../_shared/ghl-oauth.ts';
 *   const token = await getAgencyAccessToken(supabase, 'my-function-name');
 */

import { notify } from './notifications.ts';

// ── AES-GCM helpers ──────────────────────────────────────────────────

export async function decryptToken(encryptedData: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, encrypted);
  return new TextDecoder().decode(decrypted);
}

export async function encryptToken(token: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoder.encode(token));
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

// ── Main entry point ─────────────────────────────────────────────────

/**
 * Get a valid GHL agency-level OAuth access token.
 * Handles refresh with DB-level locking to prevent race conditions.
 * Fires critical alerts (SMS, email, Slack) on persistent failures.
 */
export async function getAgencyAccessToken(
  supabase: any,
  callerName: string,
): Promise<string> {
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey) throw new Error('Missing ENCRYPTION_KEY secret');

  // Step 1: Read current token
  const { data: tokenRecord, error: tokenError } = await supabase
    .from('ghl_oauth_tokens')
    .select('id, access_token, refresh_token, expires_at, updated_at, health_status')
    .maybeSingle();

  if (tokenError || !tokenRecord) {
    throw new Error('No GHL OAuth tokens found. Reconnect OAuth.');
  }

  // Step 2: If token is still valid (>5 min until expiry), decrypt and return
  const expiresAt = new Date(tokenRecord.expires_at);
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (expiresAt > fiveMinutesFromNow) {
    try {
      return await decryptToken(tokenRecord.access_token, encryptionKey);
    } catch {
      // Fallback for legacy unencrypted tokens
      console.warn(`[ghl-oauth] ${callerName}: decrypt failed, using raw token`);
      return tokenRecord.access_token;
    }
  }

  // Step 3: Token expired/expiring — try to acquire the refresh lock
  console.log(`[ghl-oauth] ${callerName}: token expired (${tokenRecord.expires_at}), attempting refresh...`);

  const { data: lockResult, error: lockError } = await supabase
    .rpc('acquire_ghl_refresh_lock', { p_locker: callerName });

  if (lockError) {
    console.error(`[ghl-oauth] ${callerName}: lock RPC error:`, lockError);
  }

  const gotLock = Array.isArray(lockResult) ? lockResult.length > 0 : !!lockResult;

  if (gotLock) {
    // We have the lock — do the actual refresh
    const lockedRow = Array.isArray(lockResult) ? lockResult[0] : lockResult;
    return await doRefresh(supabase, callerName, lockedRow, encryptionKey);
  }

  // Step 4: Lock not acquired — another function is refreshing. Wait and re-read.
  console.log(`[ghl-oauth] ${callerName}: lock held by another function, waiting...`);

  for (let retry = 0; retry < 4; retry++) {
    await sleep(1500 + retry * 500); // 1.5s, 2s, 2.5s, 3s

    const { data: freshToken } = await supabase
      .from('ghl_oauth_tokens')
      .select('access_token, expires_at, updated_at')
      .maybeSingle();

    if (freshToken) {
      const freshExpiry = new Date(freshToken.expires_at);
      if (freshExpiry > new Date(Date.now() + 60 * 1000)) {
        // Token was refreshed by the other function
        console.log(`[ghl-oauth] ${callerName}: token refreshed by another function (retry ${retry + 1})`);
        try {
          return await decryptToken(freshToken.access_token, encryptionKey);
        } catch {
          return freshToken.access_token;
        }
      }
    }
  }

  // Step 5: Waited too long — try to grab the lock ourselves (previous holder may have crashed)
  console.warn(`[ghl-oauth] ${callerName}: retries exhausted, attempting lock takeover...`);
  const { data: retryLock } = await supabase
    .rpc('acquire_ghl_refresh_lock', { p_locker: `${callerName}-retry` });

  const gotRetryLock = Array.isArray(retryLock) ? retryLock.length > 0 : !!retryLock;
  if (gotRetryLock) {
    const lockedRow = Array.isArray(retryLock) ? retryLock[0] : retryLock;
    return await doRefresh(supabase, callerName, lockedRow, encryptionKey);
  }

  throw new Error(`[ghl-oauth] ${callerName}: unable to refresh token after all retries`);
}

// ── Internal refresh logic ───────────────────────────────────────────

async function doRefresh(
  supabase: any,
  callerName: string,
  lockedRow: { id: string; refresh_token: string; expires_at: string; updated_at: string },
  encryptionKey: string,
): Promise<string> {
  const clientId = Deno.env.get('GHL_CLIENT_ID');
  const clientSecret = Deno.env.get('GHL_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('Missing GHL_CLIENT_ID / GHL_CLIENT_SECRET');
  }

  // Decrypt the refresh token
  let refreshToken: string;
  try {
    refreshToken = await decryptToken(lockedRow.refresh_token, encryptionKey);
  } catch {
    console.warn(`[ghl-oauth] ${callerName}: refresh token decrypt failed, using raw`);
    refreshToken = lockedRow.refresh_token;
  }

  // Call GHL token endpoint
  let tokenData: any;
  try {
    const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      // Check if this is an invalid_grant — the token was already rotated by another function
      if (responseText.includes('invalid_grant')) {
        console.warn(`[ghl-oauth] ${callerName}: invalid_grant — checking if another function already refreshed`);

        // Release our lock (clean up)
        await supabase.rpc('release_ghl_refresh_lock', {
          p_id: lockedRow.id,
          p_access_token: '', // dummy — will re-read below
          p_refresh_token: lockedRow.refresh_token, // keep existing
          p_expires_at: lockedRow.expires_at,
        }).catch(() => {}); // best-effort cleanup

        // Re-read from DB — maybe another function already saved fresh tokens
        const { data: freshToken } = await supabase
          .from('ghl_oauth_tokens')
          .select('access_token, expires_at, updated_at')
          .maybeSingle();

        if (freshToken) {
          const freshExpiry = new Date(freshToken.expires_at);
          const updatedAt = new Date(freshToken.updated_at);
          const thirtySecsAgo = new Date(Date.now() - 30000);

          if (freshExpiry > new Date() && updatedAt > thirtySecsAgo) {
            console.log(`[ghl-oauth] ${callerName}: found fresh token (updated ${updatedAt.toISOString()})`);
            try {
              return await decryptToken(freshToken.access_token, encryptionKey);
            } catch {
              return freshToken.access_token;
            }
          }
        }

        // Genuinely broken — fire alerts
        await fireOAuthAlert(supabase, callerName, 'invalid_grant — refresh token revoked or expired');
        throw new Error(`GHL OAuth refresh failed: invalid_grant. Token needs manual re-authorization.`);
      }

      // Other error
      await fireOAuthAlert(supabase, callerName, `Refresh failed (${response.status}): ${responseText.slice(0, 200)}`);
      throw new Error(`Failed to refresh GHL OAuth token: ${responseText.slice(0, 500)}`);
    }

    tokenData = JSON.parse(responseText);
  } catch (e: any) {
    if (e.message?.includes('invalid_grant') || e.message?.includes('GHL OAuth refresh failed')) {
      throw e; // Already handled above
    }
    await fireOAuthAlert(supabase, callerName, `Network error during refresh: ${e.message}`);
    throw e;
  }

  // Encrypt and save new tokens
  const encryptedAccessToken = await encryptToken(tokenData.access_token, encryptionKey);
  const encryptedRefreshToken = await encryptToken(tokenData.refresh_token, encryptionKey);
  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  await supabase.rpc('release_ghl_refresh_lock', {
    p_id: lockedRow.id,
    p_access_token: encryptedAccessToken,
    p_refresh_token: encryptedRefreshToken,
    p_expires_at: newExpiresAt,
  });

  console.log(`[ghl-oauth] ${callerName}: token refreshed successfully, expires ${newExpiresAt}`);
  return tokenData.access_token;
}

// ── Alert on persistent failure ──────────────────────────────────────

async function fireOAuthAlert(supabase: any, callerName: string, errorDetail: string): Promise<void> {
  console.error(`[ghl-oauth] CRITICAL: OAuth failure in ${callerName}: ${errorDetail}`);

  // Mark token as broken
  await supabase.rpc('update_ghl_health_status', { p_status: 'broken' }).catch(() => {});

  // Deduplicate: don't spam if there's already a recent unacknowledged alert
  const { data: existingAlert } = await supabase
    .from('system_alerts')
    .select('id')
    .eq('alert_type', 'oauth_failure')
    .is('acknowledged_at', null)
    .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
    .limit(1)
    .maybeSingle();

  if (existingAlert) {
    console.log(`[ghl-oauth] Skipping duplicate alert (existing: ${existingAlert.id})`);
    return;
  }

  // Fire via the shared notify system (Slack + email + SMS)
  await notify({
    supabase,
    severity: 'critical',
    alertType: 'oauth_failure',
    title: 'GHL OAuth Connection Broken',
    message: `Lead delivery to ALL agents is DOWN. Error: ${errorDetail}. Re-authorize at alphaagent.io/hub/admin → CRM Bridge immediately.`,
    metadata: {
      caller: callerName,
      error: errorDetail,
      reconnect_url: 'https://alphaagent.io/hub/admin',
    },
  });
}

// ── Helpers ──────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
