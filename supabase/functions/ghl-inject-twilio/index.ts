import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const _version = '2026-03-09_v2-oauth';
const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const COMPANY_ID = '30bFOq4ZtlhKuMOvVPwA';

// AES-GCM decryption
async function decryptToken(encryptedData: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));

  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

// AES-GCM encryption
async function encryptToken(token: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(token)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

async function getAgencyToken(supabase: any, encryptionKey: string): Promise<string> {
  const { data: tokenData, error } = await supabase
    .from('ghl_oauth_tokens')
    .select('id, access_token, refresh_token, expires_at')
    .eq('company_id', COMPANY_ID)
    .single();

  if (error || !tokenData) {
    throw new Error('No GHL OAuth token found for agency. Please reconnect via Settings > CRM.');
  }

  const expiresAt = new Date(tokenData.expires_at);
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (expiresAt <= fiveMinutesFromNow) {
    console.log('Token expired or expiring soon, refreshing...');

    const GHL_CLIENT_ID = Deno.env.get('GHL_CLIENT_ID');
    const GHL_CLIENT_SECRET = Deno.env.get('GHL_CLIENT_SECRET');

    const decryptedRefreshToken = await decryptToken(tokenData.refresh_token, encryptionKey);

    const refreshResponse = await fetch(`${GHL_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GHL_CLIENT_ID!,
        client_secret: GHL_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: decryptedRefreshToken,
      }),
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      throw new Error(`Failed to refresh GHL OAuth token: ${errorText}`);
    }

    const newTokens = await refreshResponse.json();

    const encryptedAccessToken = await encryptToken(newTokens.access_token, encryptionKey);
    const encryptedRefreshToken = await encryptToken(newTokens.refresh_token, encryptionKey);

    await supabase
      .from('ghl_oauth_tokens')
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokenData.id);

    console.log('Token refreshed successfully');
    return newTokens.access_token;
  }

  try {
    const decryptedToken = await decryptToken(tokenData.access_token, encryptionKey);
    console.log('Agency token decrypted, length:', decryptedToken.length);
    return decryptedToken;
  } catch (decryptError) {
    console.warn('Decrypt failed, using token as-is (legacy fallback)');
    return tokenData.access_token;
  }
}

// GHL/LeadConnector hosts used for telephony configuration
const GHL_HOSTS = {
  backend: 'https://backend.leadconnectorhq.com',
  services: 'https://services.leadconnectorhq.com',
  msgsndrServices: 'https://services.msgsndr.com',
  restV1: 'https://rest.gohighlevel.com/v1',
  restV2: 'https://rest.gohighlevel.com/v2',
} as const;

type AttemptLog = {
  phase: string;
  method: string;
  url: string;
  status: number;
  responseSnippet: string;
  ms?: number;
  tokenKind?: 'location' | 'agency';
};

function safeSnippet(text: string, max = 500) {
  return (text || '').slice(0, max);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeBearerToken(raw: string | null | undefined) {
  if (!raw) return null;
  const t = String(raw).replace(/^Bearer\s+/i, '').trim();
  return t ? t : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { locationId, accessToken } = await req.json();

    if (!locationId) {
      return new Response(
        JSON.stringify({ success: false, error: 'locationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hard-coded Master Twilio credentials from secrets
    const masterSid = Deno.env.get('MASTER_TWILIO_ACCOUNT_SID');
    const masterAuth = Deno.env.get('MASTER_TWILIO_AUTH_TOKEN');

    if (!masterSid || !masterAuth) {
      console.error('[ghl-inject-twilio] Missing MASTER_TWILIO_* secrets');
      return new Response(
        JSON.stringify({ success: false, error: 'MASTER_TWILIO_* secrets not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ghl-inject-twilio] (${_version}) Two-phase Twilio setup for location ${locationId}`);

    // Get V2 OAuth agency token (auto-refreshes if expired)
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY') || supabaseKey;
    const agencyToken = await getAgencyToken(supabase, encryptionKey);

    // Build token candidates: location-scoped token (if provided) + V2 OAuth agency token
    const tokenCandidatesRaw: Array<{ kind: 'location' | 'agency'; raw: string | null | undefined }> = [
      { kind: 'location', raw: accessToken },
      { kind: 'agency', raw: agencyToken },
    ];

    const tokenCandidates: Array<{ kind: 'location' | 'agency'; token: string }> = [];
    const seen = new Set<string>();
    for (const c of tokenCandidatesRaw) {
      const t = normalizeBearerToken(c.raw);
      if (!t) continue;
      if (seen.has(t)) continue;
      seen.add(t);
      tokenCandidates.push({ kind: c.kind, token: t });
    }

    if (tokenCandidates.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No access token or V2 OAuth token available', _version }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const attempts: AttemptLog[] = [];
    const startTime = Date.now();

    // ========================================
    // PHASE 1: Activate Twilio Surface
    // ========================================
    // GHL subaccounts default to LeadConnector Phone. We need to switch the provider
    // to Twilio first, which creates the Twilio surface with empty/default credentials.

    console.log('[ghl-inject-twilio] Phase 1: Activate Twilio surface (switch from LeadConnector)...');

    const activationEndpoints: Array<{ method: 'POST' | 'PUT'; url: string; body: Record<string, unknown> }> = [
      // Phone-system provider switch endpoints
      {
        method: 'POST',
        url: `${GHL_HOSTS.services}/phone-system/switch-provider`,
        body: { locationId, provider: 'twilio' },
      },
      {
        method: 'PUT',
        url: `${GHL_HOSTS.services}/phone-system/switch-provider`,
        body: { locationId, provider: 'twilio' },
      },
      {
        method: 'PUT',
        url: `${GHL_HOSTS.services}/locations/${locationId}/phone-settings`,
        body: { provider: 'twilio' },
      },
      // Location-scoped switch variants (some tenants embed locationId in the path)
      {
        method: 'POST',
        url: `${GHL_HOSTS.services}/phone-system/locations/${locationId}/switch-provider`,
        body: { provider: 'twilio' },
      },
      {
        method: 'POST',
        url: `${GHL_HOSTS.services}/phone-system/location/${locationId}/switch-provider`,
        body: { provider: 'twilio' },
      },
      // Singular provider endpoints (phone-system uses singular "location" in numbers/search API)
      {
        method: 'PUT',
        url: `${GHL_HOSTS.services}/phone-system/location/${locationId}/provider`,
        body: { provider: 'twilio' },
      },
      {
        method: 'PUT',
        url: `${GHL_HOSTS.services}/phone-system/locations/${locationId}/provider`,
        body: { provider: 'twilio' },
      },
      {
        method: 'POST',
        url: `${GHL_HOSTS.backend}/phone-system/switch-provider`,
        body: { locationId, provider: 'twilio' },
      },
      {
        method: 'PUT',
        url: `${GHL_HOSTS.backend}/phone-system/switch-provider`,
        body: { locationId, provider: 'twilio' },
      },
      {
        method: 'PUT',
        url: `${GHL_HOSTS.backend}/locations/${locationId}/phone-settings`,
        body: { provider: 'twilio' },
      },
      {
        method: 'POST',
        url: `${GHL_HOSTS.backend}/phone-system/locations/${locationId}/switch-provider`,
        body: { provider: 'twilio' },
      },
      {
        method: 'POST',
        url: `${GHL_HOSTS.backend}/phone-system/location/${locationId}/switch-provider`,
        body: { provider: 'twilio' },
      },
      {
        method: 'PUT',
        url: `${GHL_HOSTS.backend}/phone-system/location/${locationId}/provider`,
        body: { provider: 'twilio' },
      },
      {
        method: 'PUT',
        url: `${GHL_HOSTS.backend}/phone-system/locations/${locationId}/provider`,
        body: { provider: 'twilio' },
      },
      // Alternative activate/enable endpoints
      {
        method: 'POST',
        url: `${GHL_HOSTS.services}/phone-system/twilio/activate`,
        body: { locationId },
      },
      {
        method: 'PUT',
        url: `${GHL_HOSTS.services}/phone-system/twilio/activate`,
        body: { locationId },
      },
      {
        method: 'POST',
        url: `${GHL_HOSTS.backend}/phone-system/twilio/activate`,
        body: { locationId },
      },
      {
        method: 'PUT',
        url: `${GHL_HOSTS.backend}/phone-system/twilio/activate`,
        body: { locationId },
      },
      // msgsndr hosts
      {
        method: 'POST',
        url: `${GHL_HOSTS.msgsndrServices}/phone-system/switch-provider`,
        body: { locationId, provider: 'twilio' },
      },
      {
        method: 'PUT',
        url: `${GHL_HOSTS.msgsndrServices}/phone-system/switch-provider`,
        body: { locationId, provider: 'twilio' },
      },
      {
        method: 'PUT',
        url: `${GHL_HOSTS.msgsndrServices}/locations/${locationId}/phone-settings`,
        body: { provider: 'twilio' },
      },
      {
        method: 'POST',
        url: `${GHL_HOSTS.msgsndrServices}/phone-system/locations/${locationId}/switch-provider`,
        body: { provider: 'twilio' },
      },
      {
        method: 'PUT',
        url: `${GHL_HOSTS.msgsndrServices}/phone-system/location/${locationId}/provider`,
        body: { provider: 'twilio' },
      },
    ];

    // We'll run the full two-phase workflow for each token candidate until we succeed.
    let tokenUsed: 'location' | 'agency' | null = null;
    let phase1Success = false;
    let phase1Status = 0;
    let phase1Url = '';
    let phase1ResponseText = '';

    console.log('[ghl-inject-twilio] Phase 2: Inject Master Twilio credentials...');
    console.log(`[ghl-inject-twilio] Master SID: ${masterSid.substring(0, 8)}...`);

    const credentialEndpoints: Array<{ method: 'POST' | 'PUT'; url: string; body: Record<string, unknown> }> = [
      // Primary credential update endpoints
      {
        method: 'PUT',
        url: `${GHL_HOSTS.services}/locations/${locationId}/twilio`,
        body: { accountSid: masterSid, authToken: masterAuth },
      },
      {
        method: 'POST',
        url: `${GHL_HOSTS.services}/locations/${locationId}/twilio`,
        body: { accountSid: masterSid, authToken: masterAuth },
      },
      // Backend host
      {
        method: 'PUT',
        url: `${GHL_HOSTS.backend}/locations/${locationId}/twilio`,
        body: { accountSid: masterSid, authToken: masterAuth },
      },
      {
        method: 'POST',
        url: `${GHL_HOSTS.backend}/locations/${locationId}/twilio`,
        body: { accountSid: masterSid, authToken: masterAuth },
      },
      // Phone-system connect endpoints
      {
        method: 'POST',
        url: `${GHL_HOSTS.services}/phone-system/twilio/connect`,
        body: { locationId, accountSid: masterSid, authToken: masterAuth },
      },
      // Some tenants surface Twilio config under phone-system/location/{id}
      {
        method: 'PUT',
        url: `${GHL_HOSTS.backend}/phone-system/location/${locationId}/twilio`,
        body: { accountSid: masterSid, authToken: masterAuth },
      },
      {
        method: 'POST',
        url: `${GHL_HOSTS.backend}/phone-system/location/${locationId}/twilio`,
        body: { accountSid: masterSid, authToken: masterAuth },
      },
      {
        method: 'PUT',
        url: `${GHL_HOSTS.services}/phone-system/twilio/connect`,
        body: { locationId, accountSid: masterSid, authToken: masterAuth },
      },
      {
        method: 'POST',
        url: `${GHL_HOSTS.backend}/phone-system/twilio/connect`,
        body: { locationId, accountSid: masterSid, authToken: masterAuth },
      },
      {
        method: 'PUT',
        url: `${GHL_HOSTS.backend}/phone-system/twilio/connect`,
        body: { locationId, accountSid: masterSid, authToken: masterAuth },
      },
      // Location-scoped connect variants
      {
        method: 'POST',
        url: `${GHL_HOSTS.backend}/phone-system/twilio/connect/${locationId}`,
        body: { accountSid: masterSid, authToken: masterAuth },
      },
      {
        method: 'POST',
        url: `${GHL_HOSTS.backend}/phone-system/locations/${locationId}/twilio/connect`,
        body: { accountSid: masterSid, authToken: masterAuth },
      },
      {
        method: 'POST',
        url: `${GHL_HOSTS.backend}/phone-system/location/${locationId}/twilio/connect`,
        body: { accountSid: masterSid, authToken: masterAuth },
      },
      {
        method: 'POST',
        url: `${GHL_HOSTS.backend}/phone-system/twilio`,
        body: { locationId, accountSid: masterSid, authToken: masterAuth },
      },
      // msgsndr hosts
      {
        method: 'PUT',
        url: `${GHL_HOSTS.msgsndrServices}/locations/${locationId}/twilio`,
        body: { accountSid: masterSid, authToken: masterAuth },
      },
      {
        method: 'POST',
        url: `${GHL_HOSTS.msgsndrServices}/locations/${locationId}/twilio`,
        body: { accountSid: masterSid, authToken: masterAuth },
      },
      // REST API hosts
      {
        method: 'PUT',
        url: `${GHL_HOSTS.restV1}/locations/${locationId}/twilio`,
        body: { accountSid: masterSid, authToken: masterAuth },
      },
      {
        method: 'PUT',
        url: `${GHL_HOSTS.restV2}/locations/${locationId}/twilio`,
        body: { accountSid: masterSid, authToken: masterAuth },
      },
    ];

    let phase2Success = false;
    let phase2Status = 0;
    let phase2Url = '';
    let phase2ResponseText = '';

    let sawNon404Phase2 = false;

    for (const candidate of tokenCandidates) {
      const token = candidate.token;
      const tokenKind = candidate.kind;
      console.log(`[ghl-inject-twilio] Using token candidate: ${tokenKind}`);

      // ========================================
      // PHASE 1: Activate Twilio Surface
      // ========================================
      phase1Success = false;
      phase1Status = 0;
      phase1Url = '';
      phase1ResponseText = '';

      console.log('[ghl-inject-twilio] Phase 1: Activate Twilio surface (switch from LeadConnector)...');

      for (const endpoint of activationEndpoints) {
        phase1Url = endpoint.url;
        console.log(`[ghl-inject-twilio] Phase 1: Trying ${endpoint.method} ${endpoint.url}`);

        const attemptStart = Date.now();
        let resp: Response;
        try {
          resp = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Version: '2021-07-28',
              'x-location-id': locationId,
            },
            body: JSON.stringify(endpoint.body),
          });
        } catch (fetchErr: any) {
          const msg = fetchErr?.message || String(fetchErr);
          attempts.push({
            phase: 'activate',
            method: endpoint.method,
            url: endpoint.url,
            status: 0,
            responseSnippet: `fetch_error: ${msg}`,
            ms: Date.now() - attemptStart,
            tokenKind,
          });
          continue;
        }

        phase1Status = resp.status;
        phase1ResponseText = await resp.text();

        attempts.push({
          phase: 'activate',
          method: endpoint.method,
          url: endpoint.url,
          status: phase1Status,
          responseSnippet: safeSnippet(phase1ResponseText),
          ms: Date.now() - attemptStart,
          tokenKind,
        });

        // 404 means endpoint doesn't exist on this host/path - try next
        if (resp.status === 404) continue;

        // 2xx or 422 (already active) = success for activation phase
        if (resp.ok || resp.status === 422) {
          phase1Success = true;
          break;
        }
      }

      if (!phase1Success) {
        console.log('[ghl-inject-twilio] Phase 1: No activation endpoint succeeded for this token; proceeding to Phase 2 anyway...');
      } else {
        console.log('[ghl-inject-twilio] Phase 1 succeeded; waiting 4s for Twilio surface propagation...');
        await sleep(4000);
      }

      // ========================================
      // PHASE 2: Inject Credentials
      // ========================================
      phase2Success = false;
      phase2Status = 0;
      phase2Url = '';
      phase2ResponseText = '';

      for (const endpoint of credentialEndpoints) {
        phase2Url = endpoint.url;
        console.log(`[ghl-inject-twilio] Phase 2: Trying ${endpoint.method} ${endpoint.url}`);

        const attemptStart = Date.now();
        let resp: Response;
        try {
          resp = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Version: '2021-07-28',
              'x-location-id': locationId,
            },
            body: JSON.stringify(endpoint.body),
          });
        } catch (fetchErr: any) {
          const msg = fetchErr?.message || String(fetchErr);
          attempts.push({
            phase: 'credentials',
            method: endpoint.method,
            url: endpoint.url,
            status: 0,
            responseSnippet: `fetch_error: ${msg}`,
            ms: Date.now() - attemptStart,
            tokenKind,
          });
          continue;
        }

        phase2Status = resp.status;
        phase2ResponseText = await resp.text();

        attempts.push({
          phase: 'credentials',
          method: endpoint.method,
          url: endpoint.url,
          status: phase2Status,
          responseSnippet: safeSnippet(phase2ResponseText),
          ms: Date.now() - attemptStart,
          tokenKind,
        });

        if (resp.status !== 404) sawNon404Phase2 = true;

        // 404 means endpoint doesn't exist - try next
        if (resp.status === 404) continue;

        if (resp.ok) {
          phase2Success = true;
          tokenUsed = tokenKind;
          break;
        }
      }

      if (phase2Success) break;
    }

    const elapsed = Date.now() - startTime;

    // Log to ghl_api_logs
    await supabase.from('ghl_api_logs').insert({
      request_type: 'inject_twilio_two_phase',
      location_id: locationId,
      status_code: phase2Success ? 200 : phase2Status,
      response_snippet: safeSnippet(phase2ResponseText, 500),
      response_time_ms: elapsed,
    });

    // Determine overall success
    if (phase2Success) {
      console.log(`[ghl-inject-twilio] Successfully injected Master Twilio into ${locationId} (two-phase)`);
      return new Response(
        JSON.stringify({
          success: true,
          _version,
          tokenUsed,
          phase1: { success: phase1Success, url: phase1Url, status: phase1Status },
          phase2: { success: phase2Success, url: phase2Url, status: phase2Status },
          masterSid: masterSid.substring(0, 8) + '...',
          elapsedMs: elapsed,
          attempts: attempts.slice(-12), // Last 12 attempts for diagnostics
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If all Phase 2 endpoints returned 404, return 404
    if (phase2Status === 404 && !sawNon404Phase2) {
      console.log('[ghl-inject-twilio] All credential update endpoints returned 404');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Twilio credential endpoints not available (404) on this tenant',
          _version,
          phase1: { success: phase1Success, url: phase1Url, status: phase1Status },
          phase2: { success: false, url: phase2Url, status: phase2Status },
          attempts: attempts.slice(-12),
          elapsedMs: elapsed,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Other failure
    return new Response(
      JSON.stringify({
        success: false,
        error: `Twilio credential injection failed (GHL returned ${phase2Status})`,
        _version,
        phase1: { success: phase1Success, url: phase1Url, status: phase1Status },
        phase2: { success: false, url: phase2Url, status: phase2Status },
        attempts: attempts.slice(-12),
        elapsedMs: elapsed,
      }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[ghl-inject-twilio] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
