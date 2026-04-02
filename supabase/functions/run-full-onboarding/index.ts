// Force redeploy: 2026-02-26 — ensure sanitizeForJsonb is in deployed runtime
import { createClient } from "npm:@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SNAPSHOT_ID = 'tbDo7ohUgUrGXNwL0gzz';
const GHL_API_VERSION = '2021-07-28';
// GHL SaaS V2 API (correct endpoint for enable-saas)
const SAAS_API_BASE = 'https://services.leadconnectorhq.com/saas';
// Legacy Stripe product ID (used as fallback only)
const SAAS_PRODUCT_ID = 'prod_T4GepzEYqeMQ6z';

// Step definitions with order
const AUTOMATION_STEPS = [
  { step: 1, name: 'lowercase_name', label: 'Lowercase Agent Name' },
  { step: 2, name: 'generate_slug', label: 'Generate URL Slug' },
  { step: 3, name: 'generate_bio', label: 'Generate AI Bio' },
  { step: 4, name: 'create_nfia', label: 'Create NFIA Page' },
  { step: 5, name: 'create_scheduler', label: 'Create Scheduler Page' },
  { step: 6, name: 'create_lander', label: 'Create Lander Page' },
  { step: 7, name: 'create_profile', label: 'Create Profile Page' },
  { step: 8, name: 'create_thankyou', label: 'Create Thank You Page' },
  { step: 9, name: 'create_subaccount', label: 'Create GHL Subaccount' },
  { step: 10, name: 'activate_saas', label: 'Activate SaaS (Manual)', manual: true },
  { step: 11, name: 'install_snapshot', label: 'Verify Snapshot & Calendar ID' },
  { step: 12, name: 'pull_calendar_id', label: 'Pull Calendar ID' },
  { step: 13, name: 'assign_calendars', label: 'Assign User to Calendars' },
  { step: 14, name: 'update_scheduler_embed', label: 'Update Scheduler Embed' },
  { step: 15, name: 'sync_crm_custom_fields', label: 'Sync CRM Custom Fields' },
  { step: 16, name: 'create_google_ads', label: 'Create Google Ads Campaigns (Search + Display)' },
  { step: 17, name: 'final_verification', label: 'Final Verification' },
  { step: 18, name: 'verify_onboarding', label: 'Verify & Test Onboarding' },
  { step: 19, name: 'provision_phone', label: 'Provision Phone Number (Manual)', manual: true },
];

const GHL_COMPANY_ID = '30bFOq4ZtlhKuMOvVPwA';
const WEBFLOW_SITE_DOMAIN = 'www.taxfreewealthplan.com';

function sanitizeForJsonb(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return obj.replace(/\u0000/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForJsonb);
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = sanitizeForJsonb(value);
    }
    return cleaned;
  }
  return obj;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { clientId, startFromStep = 1, verifyOnlyStep, ghlPassword } = await req.json();

    if (!clientId) {
      return new Response(JSON.stringify({ error: 'Missing clientId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch client data with retry loop to handle race conditions
    let client: any = null;
    let clientError: any = null;
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 2000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();

      if (data) {
        client = data;
        clientError = null;
        break;
      }

      clientError = error;
      console.warn(`Client fetch attempt ${attempt}/${MAX_RETRIES} failed for ${clientId}. ${error?.message || 'No data returned'}. Retrying in ${RETRY_DELAY_MS}ms...`);

      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }

    if (!client) {
      console.error(`Client not found after ${MAX_RETRIES} retries: ${clientId}`);
      return new Response(JSON.stringify({ error: 'Client not found after retries', details: clientError?.message }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Client fetched successfully:', client.name);

    // === CONCURRENCY LOCK: Check if another run is already active for this client ===
    const { data: alreadyRunning } = await supabase
      .from('onboarding_automation_runs')
      .select('id, current_step, started_at')
      .eq('client_id', clientId)
      .eq('status', 'running')
      .limit(1)
      .maybeSingle();

    if (alreadyRunning) {
      console.log(`CONCURRENCY GUARD: Another run (${alreadyRunning.id}) is already running for client ${clientId} at step ${alreadyRunning.current_step}. Bailing out.`);
      return new Response(JSON.stringify({
        message: 'Another onboarding run is already active for this client.',
        existingRunId: alreadyRunning.id,
        currentStep: alreadyRunning.current_step,
        deduplicated: true,
      }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check for existing automation run or create new one
    let automationRun: any;
    const { data: existingRun } = await supabase
      .from('onboarding_automation_runs')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const pruneRunState = (run: any, pruneFromStep: number) => {
      const keepStep = (n: number) => n < pruneFromStep;

      run.steps_completed = (run.steps_completed || []).filter(keepStep);
      run.steps_failed = (run.steps_failed || []).filter(keepStep);
      run.error_log = (run.error_log || []).filter((e: any) => (e?.step ?? 0) < pruneFromStep);

      const currentStepData = run.step_data || {};
      const nextStepData: Record<string, any> = {};
      for (const [key, value] of Object.entries(currentStepData)) {
        const match = /^step_(\d+)$/.exec(key);
        const stepNum = match ? Number(match[1]) : null;
        if (stepNum !== null && stepNum < pruneFromStep) nextStepData[key] = value;
      }
      run.step_data = nextStepData;
    };

    if (existingRun) {
      automationRun = existingRun;

      // When restarting/resuming, clear any stale failures/data from the step we're resuming from.
      pruneRunState(automationRun, startFromStep);

      // Atomically claim the run — only update if NOT already running
      const { data: claimedRun, error: claimError } = await supabase
        .from('onboarding_automation_runs')
        .update({
          status: 'running',
          current_step: startFromStep,
          steps_completed: automationRun.steps_completed,
          steps_failed: automationRun.steps_failed,
          step_data: automationRun.step_data,
          error_log: automationRun.error_log,
          started_at: startFromStep === 1 ? new Date().toISOString() : automationRun.started_at,
          completed_at: startFromStep === 1 ? null : automationRun.completed_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRun.id)
        .neq('status', 'running')
        .select('id')
        .maybeSingle();

      if (!claimedRun) {
        console.log(`ATOMIC CLAIM FAILED: Run ${existingRun.id} was already claimed by another process. Bailing out.`);
        return new Response(JSON.stringify({
          message: 'Failed to claim onboarding run — another process already claimed it.',
          runId: existingRun.id,
          deduplicated: true,
        }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      console.log(`Atomically claimed run ${existingRun.id} for client ${clientId}`);
    } else {
      // Create new run
      const { data: newRun, error: runError } = await supabase
        .from('onboarding_automation_runs')
        .insert({
          client_id: clientId,
          status: 'running',
          current_step: startFromStep,
          total_steps: AUTOMATION_STEPS.length,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (runError) throw new Error(`Failed to create automation run: ${runError.message}`);
      automationRun = newRun;
    }

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const persistRunPatch = async (patch: Record<string, any>, context: string) => {
      let lastError: string | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const { error } = await supabase
          .from('onboarding_automation_runs')
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq('id', automationRun.id);
        if (!error) {
          lastError = null;
          break;
        }
        lastError = error.message;
        console.error(`Failed to persist automation patch (attempt ${attempt}/3)`, {
          context,
          runId: automationRun.id,
          clientId,
          error: error.message,
        });
        if (attempt < 3) await sleep(250 * attempt);
      }
      if (lastError) {
        console.error('CRITICAL: Unable to persist automation patch after retries', {
          context,
          runId: automationRun.id,
          clientId,
          lastError,
        });
      }
    };

    // Helper to update step progress
    const updateStep = async (
      stepNum: number,
      success: boolean,
      data?: any,
      error?: string
    ) => {
      const stepsCompleted = automationRun.steps_completed || [];
      const stepsFailed = automationRun.steps_failed || [];
      const stepData = automationRun.step_data || {};

      // Always persist step output (even on failure) so the UI can show diagnostics.
      // Sanitize data to prevent JSONB storage failures from special Unicode characters
      if (data !== undefined) {
        stepData[`step_${stepNum}`] = sanitizeForJsonb(data);
      }

      if (success) {
        if (!stepsCompleted.includes(stepNum)) stepsCompleted.push(stepNum);
        // If a step later succeeded, remove any stale failed marker.
        const idx = stepsFailed.indexOf(stepNum);
        if (idx !== -1) stepsFailed.splice(idx, 1);
      } else {
        if (!stepsFailed.includes(stepNum)) stepsFailed.push(stepNum);
        if (error) {
          const errorLog = automationRun.error_log || [];
          errorLog.push({ step: stepNum, error, timestamp: new Date().toISOString() });
          automationRun.error_log = errorLog;
        }
      }

      automationRun.steps_completed = stepsCompleted;
      automationRun.steps_failed = stepsFailed;
      automationRun.step_data = stepData;

      const patch = {
        current_step: stepNum,
        steps_completed: stepsCompleted,
        steps_failed: stepsFailed,
        step_data: stepData,
        error_log: automationRun.error_log,
        last_step_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await persistRunPatch(patch, `updateStep:${stepNum}:${success ? 'success' : 'fail'}`);
    };

    // Helper to call internal edge functions (POST with JSON body)
    const callFunction = async (name: string, body: any) => {
      const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify(body),
      });
      return response.json();
    };

    const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

    // When resuming from a later step, credit prior steps based on existing artifacts.
    // This keeps the UI truthful even if we skip executing earlier steps.
    const hydrateStepsFromClientArtifacts = async () => {
      if (!startFromStep || startFromStep <= 1) return;

      const stepData = (automationRun.step_data || {}) as Record<string, any>;
      const stepsCompleted = (automationRun.steps_completed || []) as number[];
      const stepsFailed = (automationRun.steps_failed || []) as number[];

      const mark = (stepNum: number, data: any) => {
        if (stepNum >= startFromStep) return;
        if (!stepsCompleted.includes(stepNum)) stepsCompleted.push(stepNum);
        // Also remove from steps_failed if present (step is now credited as complete)
        const failedIdx = stepsFailed.indexOf(stepNum);
        if (failedIdx !== -1) stepsFailed.splice(failedIdx, 1);
        const key = `step_${stepNum}`;
        if (stepData[key] === undefined) stepData[key] = data;
      };

      // Steps 4-10 (key artifacts)
      if (isNonEmptyString(client.nfia_link)) {
        mark(4, { alreadyExisted: true, nfiaPageUrl: client.nfia_link, liveUrl: client.nfia_link });
      }

      if (isNonEmptyString(client.webflow_scheduler_id) && isNonEmptyString(client.scheduler_link)) {
        mark(5, { alreadyExisted: true, itemId: client.webflow_scheduler_id, liveUrl: client.scheduler_link });
      }

      if (isNonEmptyString(client.webflow_lander_id) && isNonEmptyString(client.lander_link)) {
        mark(6, { alreadyExisted: true, itemId: client.webflow_lander_id, liveUrl: client.lander_link });
      }

      if (isNonEmptyString(client.webflow_profile_id) && isNonEmptyString(client.tfwp_profile_link)) {
        mark(7, { alreadyExisted: true, itemId: client.webflow_profile_id, liveUrl: client.tfwp_profile_link });
      }

      if (isNonEmptyString(client.webflow_thankyou_id) && isNonEmptyString(client.thankyou_link)) {
        mark(8, { alreadyExisted: true, itemId: client.webflow_thankyou_id, liveUrl: client.thankyou_link });
      }

      if (isNonEmptyString(client.subaccount_id)) {
        mark(9, { alreadyExisted: true, locationId: client.subaccount_id, crmLink: client.crm_link || null });
      }

      if (isNonEmptyString(client.ghl_user_id)) {
        mark(9, { alreadyExisted: true, locationId: client.subaccount_id, userId: client.ghl_user_id });
      }

      // Step 10 (activate_saas) and Step 18 (provision_phone) are manual steps
      // Don't auto-credit them - they're completed by humans via the UI

     // Step 11 (snapshot already applied if Discovery calendar exists) is not credited here; always re-run to verify
     
     // Step 12 (pull_calendar_id): credit if calendar already exists
     if (isNonEmptyString(client.discovery_calendar_id)) {
       mark(12, { alreadyExisted: true, calendarId: client.discovery_calendar_id });
     }

      // Persist updated state including steps_failed
      automationRun.steps_completed = stepsCompleted;
      automationRun.steps_failed = stepsFailed;
      automationRun.step_data = stepData;

      await persistRunPatch(
        {
          steps_completed: stepsCompleted,
          steps_failed: stepsFailed,
          step_data: stepData,
          last_step_at: automationRun.last_step_at || new Date().toISOString(),
        },
        `hydrateStepsFromClientArtifacts:startFromStep=${startFromStep}`
      );
    };

    await hydrateStepsFromClientArtifacts();

    // Snapshot utilities (robot-only)
    const getSnapshotStatusDetailed = async (companyId: string, locationId: string) => {
      return await callFunctionDetailed('crm-snapshot-status', {
        companyId,
        locationId,
      });
    };

    const normalizeBearerToken = (raw: string) => raw.replace(/^Bearer\s+/i, '').trim();

    // AES-GCM helpers (copied inline; edge functions can't import from other files)
    const decryptToken = async (encryptedData: string, key: string): Promise<string> => {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
      const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, encrypted);
      return new TextDecoder().decode(decrypted);
    };

    const encryptToken = async (token: string, key: string): Promise<string> => {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt']);
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoder.encode(token));
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);
      return btoa(String.fromCharCode(...combined));
    };

    const getAgencyOAuthAccessToken = async (): Promise<string> => {
      const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
      if (!encryptionKey) throw new Error('Missing ENCRYPTION_KEY secret');

      const { data: tokenRecord, error: tokenError } = await supabase
        .from('ghl_oauth_tokens')
        .select('id, access_token, refresh_token, expires_at')
        .maybeSingle();

      if (tokenError || !tokenRecord) {
        throw new Error('No GHL OAuth tokens found. Reconnect OAuth.');
      }

      const expiresAt = new Date(tokenRecord.expires_at);
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

      // Refresh if expiring
      if (expiresAt <= fiveMinutesFromNow) {
        const clientId = Deno.env.get('GHL_CLIENT_ID');
        const clientSecret = Deno.env.get('GHL_CLIENT_SECRET');
        if (!clientId || !clientSecret) {
          throw new Error('Missing GHL_CLIENT_ID / GHL_CLIENT_SECRET secrets');
        }

        let decryptedRefreshToken = tokenRecord.refresh_token;
        try {
          decryptedRefreshToken = await decryptToken(tokenRecord.refresh_token, encryptionKey);
        } catch (e) {
          console.warn('Refresh token decrypt failed, using as-is (legacy fallback):', e);
        }

        const refreshResponse = await fetch('https://services.leadconnectorhq.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
            refresh_token: decryptedRefreshToken,
          }),
        });

        if (!refreshResponse.ok) {
          const errorText = await refreshResponse.text();
          throw new Error(`Failed to refresh GHL OAuth token: ${errorText}`);
        }

        const tokenData = await refreshResponse.json();
        const encryptedAccessToken = await encryptToken(tokenData.access_token, encryptionKey);
        const encryptedRefreshToken = await encryptToken(tokenData.refresh_token, encryptionKey);
        const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

        await supabase
          .from('ghl_oauth_tokens')
          .update({
            access_token: encryptedAccessToken,
            refresh_token: encryptedRefreshToken,
            expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tokenRecord.id);

        return tokenData.access_token;
      }

      // Token still valid
      try {
        return await decryptToken(tokenRecord.access_token, encryptionKey);
      } catch (e) {
        console.warn('Access token decrypt failed, using as-is (legacy fallback):', e);
        return tokenRecord.access_token;
      }
    };

    const enableSaasForLocation = async (companyId: string, locationId: string) => {
      const token = normalizeBearerToken(await getAgencyOAuthAccessToken());
      const startedAt = Date.now();
      const url = `${SAAS_API_BASE}/enable-saas/${locationId}`;

      // Use the GHL SaaS Plan ID (internal plan ID, not Stripe product ID)
      const saasPlanId = Deno.env.get('GHL_SAAS_PLAN_ID');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Version': '2021-04-15',  // SaaS endpoint requires this specific version
        },
        body: JSON.stringify({
          companyId,
          // Use saasPlanId if available, fall back to stripeProductId for legacy
          ...(saasPlanId ? { saasPlanId } : { stripeProductId: SAAS_PRODUCT_ID }),
          isSaaSV2: true,  // Required flag for SaaS V2 activation
        }),
      });

      const text = await response.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // ignore
      }

      const traceId = json?.traceId || null;

      return {
        ok: response.ok,
        status: response.status,
        text,
        json,
        ms: Date.now() - startedAt,
        url,
        traceId,
      };
    };

    const getSaasPlanDetails = async (planId: string) => {
      const token = normalizeBearerToken(await getAgencyOAuthAccessToken());
      const startedAt = Date.now();
      const url = `${SAAS_API_BASE}/get-saas-plans`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Version': GHL_API_VERSION,
        },
      });

      const text = await response.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // ignore
      }

      // Find the plan in the array
      const plans = json?.data || json?.plans || [];
      const plan = plans.find((p: any) => p.id === planId || p._id === planId);

      return {
        ok: response.ok,
        status: response.status,
        text,
        json,
        plan,
        ms: Date.now() - startedAt,
        url,
      };
    };

    // Check if SaaS is already enabled for a location using multiple endpoints
    const checkSaasStatus = async (locationId: string) => {
      const token = normalizeBearerToken(await getAgencyOAuthAccessToken());
      const startedAt = Date.now();
      const results: any = {};
      
      // Method 1: Check location endpoint for SaaS flags
      try {
        const locationUrl = `https://services.leadconnectorhq.com/locations/${locationId}`;
        const locationResp = await fetch(locationUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Version': GHL_API_VERSION,
          },
        });
        const locationText = await locationResp.text();
        let locationJson: any = null;
        try { locationJson = JSON.parse(locationText); } catch {}
        
        results.locationCheck = {
          ok: locationResp.ok,
          status: locationResp.status,
          // Extract all possible SaaS indicators
          saasEnabled: locationJson?.location?.saas?.enabled || 
                       locationJson?.saas?.enabled || 
                       locationJson?.isSaasEnabled ||
                       locationJson?.location?.isSaasEnabled ||
                       false,
          stripeProductId: locationJson?.location?.saas?.stripeProductId || 
                           locationJson?.saas?.stripeProductId,
          saasPlanId: locationJson?.location?.saas?.planId || 
                      locationJson?.saas?.planId,
        };
      } catch (e) {
        results.locationCheck = { error: e instanceof Error ? e.message : 'Unknown error' };
      }
      
      // Method 2: Check rebilling status (most reliable indicator)
      try {
        const rebillingUrl = `https://services.leadconnectorhq.com/saas-api/public-api/get-rebilling-for-location/${locationId}`;
        const rebillingResp = await fetch(rebillingUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Version': GHL_API_VERSION,
          },
        });
        const rebillingText = await rebillingResp.text();
        let rebillingJson: any = null;
        try { rebillingJson = JSON.parse(rebillingText); } catch {}
        
        // If we get a valid response with rebilling data, SaaS is likely enabled
        const hasRebilling = rebillingResp.ok && 
          (rebillingJson?.status === 'active' || 
           rebillingJson?.enabled === true ||
           rebillingJson?.rebillingEnabled === true);
        
        results.rebillingCheck = {
          ok: rebillingResp.ok,
          status: rebillingResp.status,
          hasRebilling,
          responseSnippet: rebillingText.slice(0, 500),
        };
      } catch (e) {
        results.rebillingCheck = { error: e instanceof Error ? e.message : 'Unknown error' };
      }
      
      // Method 3: Try to get SaaS subscription info directly
      try {
        const subscriptionUrl = `${SAAS_API_BASE}/locations/${locationId}/saas-subscription`;
        const subResp = await fetch(subscriptionUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Version': GHL_API_VERSION,
          },
        });
        const subText = await subResp.text();
        let subJson: any = null;
        try { subJson = JSON.parse(subText); } catch {}
        
        // If we get subscription data, SaaS is enabled
        const hasSubscription = subResp.ok && 
          (subJson?.subscription || subJson?.data || subJson?.planId);
        
        results.subscriptionCheck = {
          ok: subResp.ok,
          status: subResp.status,
          hasSubscription,
          responseSnippet: subText.slice(0, 500),
        };
      } catch (e) {
        results.subscriptionCheck = { error: e instanceof Error ? e.message : 'Unknown error' };
      }
      
      // Combine all checks - SaaS is enabled if ANY check confirms it
      const saasEnabled = 
        results.locationCheck?.saasEnabled ||
        results.rebillingCheck?.hasRebilling ||
        results.subscriptionCheck?.hasSubscription ||
        false;
      
      console.log(`[checkSaasStatus] Location ${locationId}: saasEnabled=${saasEnabled}`, JSON.stringify(results, null, 2).slice(0, 1500));

      return {
        ok: true,
        status: 200,
        saasEnabled,
        results,
        ms: Date.now() - startedAt,
      };
    };

    // GHL V2 SaaS Enable API - correct payload format per API documentation
    const enableSaasV2ForLocation = async (params: {
      companyId: string;
      locationId: string;
      saasPlanId: string;
      contactId: string;
    }) => {
      const token = normalizeBearerToken(await getAgencyOAuthAccessToken());
      const startedAt = Date.now();
      const url = `${SAAS_API_BASE}/enable-saas/${params.locationId}`;

      console.log(`[enableSaasV2ForLocation] Calling ${url} with:`, {
        companyId: params.companyId,
        saasPlanId: params.saasPlanId,
        contactId: params.contactId,
        isSaaSV2: true,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Version': '2021-04-15',  // SaaS endpoint requires this specific version
        },
        body: JSON.stringify({
          companyId: params.companyId,
          saasPlanId: params.saasPlanId,
          contactId: params.contactId,
          isSaaSV2: true,  // Required flag for SaaS V2 activation
        }),
      });

      const text = await response.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // ignore
      }

      const traceId = json?.traceId || null;

      return {
        ok: response.ok,
        status: response.status,
        text,
        json,
        ms: Date.now() - startedAt,
        url,
        traceId,
      };
    };

    const ensureSnapshotInstalled = async (companyId: string, locationId: string) => {
      const attempts: any[] = [];
      let legacyEnableAttempt: any = null;
      let v2EnableAttempt: any = null;
      let planDetailsAttempt: any = null;
      const startedAt = Date.now();

      // Keep the whole step within typical function runtime.
      // We'll push immediately, then do bounded polling.
      const maxMs = 90 * 1000;
      const pollEveryMs = 10 * 1000;
      let poll = 0;

      // 0) Propagation delay (if subaccount was just created)
      // GHL's internal "location indexing" can take a few seconds after POST /locations
      // to make the location "SaaS-ready". We'll wait 10s to reduce 422 likelihood.
      const subaccountCreatedVeryRecently = (() => {
        const step9Data = automationRun.step_data?.step_9;
        const subaccountIdSetAt = step9Data?.completed_at;
        if (!subaccountIdSetAt) return false;
        const elapsed = Date.now() - new Date(subaccountIdSetAt).getTime();
        return elapsed < 30 * 1000; // within 30s
      })();

      if (subaccountCreatedVeryRecently) {
        console.log('[Step 11] Waiting 10s for GHL location indexing (propagation delay)...');
        await sleep(10 * 1000);
      }

      // 1) Fast path: already applied
      poll += 1;
      const initial = await getSnapshotStatusDetailed(companyId, locationId);
      attempts.push({
        poll,
        ok: initial.ok,
        status: initial.status,
        ms: initial.ms,
        responseSnippet: (initial.text || '').slice(0, 1200),
      });

      const initialJson = initial.json;
      if (initialJson?.snapshotApplied || initialJson?.hasDiscoveryCalendar || initialJson?.normalizedStatus === 'completed') {
        return {
          ok: true,
          snapshotApplied: true,
          lastStatus: initialJson,
          attempts,
          legacyEnableAttempt,
          v2EnableAttempt,
          planDetailsAttempt,
          elapsedMs: Date.now() - startedAt,
        };
      }

      // 1.5) Check if SaaS is already enabled before attempting to enable
      let saasStatusCheck: any = null;
      try {
        saasStatusCheck = await checkSaasStatus(locationId);
        console.log(`[Step 11] SaaS status check: enabled=${saasStatusCheck.saasEnabled}`);
        
        if (saasStatusCheck.saasEnabled) {
          console.log('[Step 11] SaaS already enabled, skipping enable step and proceeding to polling...');
          // SaaS is already enabled, skip enable and go to polling for Discovery calendar
        }
      } catch (e) {
        console.warn('[Step 11] SaaS status check failed, proceeding with enable:', e);
      }

      // 2) Only try to enable if SaaS is not already active
      if (!saasStatusCheck?.saasEnabled) {
        // Legacy enable path (try first for backward compatibility)
        const enableResp = await enableSaasForLocation(companyId, locationId);
        legacyEnableAttempt = {
          ok: enableResp.ok,
          status: enableResp.status,
          ms: enableResp.ms,
          url: enableResp.url,
          responseSnippet: (enableResp.text || '').slice(0, 1200),
          traceId: enableResp.traceId,
        };

        // If legacy enable succeeded, great!
        if (enableResp.ok) {
          console.log('[Step 11] Legacy SaaS enable succeeded. Proceeding to polling...');
        } else {
          // If legacy enable failed, attempt SaaS V2 enable as fallback
          // This covers 401 (auth issues), 422 (config issues), and other recoverable errors
          const shouldTryV2 = enableResp.status === 401 || 
                              enableResp.status === 422 || 
                              enableResp.json?.error === 'FAILED_TO_ENABLE_SAAS';
          
          if (shouldTryV2) {
            console.log(`[Step 11] Legacy enable failed with ${enableResp.status}. Attempting SaaS V2 enable...`);
            
            // Validate required secrets for V2 API
            const saasPlanId = Deno.env.get('GHL_SAAS_PLAN_ID');
            const contactId = client.ghl_contact_id;

            if (!saasPlanId) {
              return {
                ok: false,
                pending: false,
                snapshotApplied: false,
                error: `SaaS V2 config missing: GHL_SAAS_PLAN_ID not set`,
                attempts,
                legacyEnableAttempt,
                v2EnableAttempt: null,
                planDetailsAttempt: null,
                elapsedMs: Date.now() - startedAt,
              };
            }

            if (!contactId) {
              return {
                ok: false,
                pending: false,
                snapshotApplied: false,
                error: `SaaS V2 requires clients.ghl_contact_id (not set for clientId ${clientId})`,
                attempts,
                legacyEnableAttempt,
                v2EnableAttempt: null,
                planDetailsAttempt: null,
                elapsedMs: Date.now() - startedAt,
              };
            }

            // V2 API requires: companyId, saasPlanId, contactId (no priceId needed)
            console.log(`[Step 11] Using GHL SaaS Plan ID: ${saasPlanId}, contactId: ${contactId}`);

            // Attempt SaaS V2 enable with correct payload
            const v2Resp = await enableSaasV2ForLocation({
              companyId,
              locationId,
              saasPlanId,
              contactId,
            });

            v2EnableAttempt = {
              ok: v2Resp.ok,
              status: v2Resp.status,
              ms: v2Resp.ms,
              url: v2Resp.url,
              responseSnippet: (v2Resp.text || '').slice(0, 1200),
              traceId: v2Resp.traceId,
            };

            if (!v2Resp.ok) {
              // If 422, it might mean SaaS is already enabled - check again and continue if so
              if (v2Resp.status === 422) {
                console.log('[Step 11] V2 enable got 422, checking if SaaS is actually enabled...');
                const recheckStatus = await checkSaasStatus(locationId);
                if (recheckStatus.saasEnabled) {
                  console.log('[Step 11] SaaS is already enabled (confirmed after 422). Proceeding to polling...');
                  // Continue to polling
                } else {
                  return {
                    ok: false,
                    pending: false,
                    snapshotApplied: false,
                    error: `SaaS V2 enable failed (status ${v2Resp.status}). traceId: ${v2Resp.traceId}`,
                    attempts,
                    legacyEnableAttempt,
                    v2EnableAttempt,
                    planDetailsAttempt,
                    elapsedMs: Date.now() - startedAt,
                  };
                }
              } else {
                return {
                  ok: false,
                  pending: false,
                  snapshotApplied: false,
                  error: `SaaS V2 enable failed (status ${v2Resp.status}). traceId: ${v2Resp.traceId}`,
                  attempts,
                  legacyEnableAttempt,
                  v2EnableAttempt,
                  planDetailsAttempt,
                  elapsedMs: Date.now() - startedAt,
                };
              }
            } else {
              console.log('[Step 11] SaaS V2 enable succeeded. Proceeding to polling...');
            }
          } else {
            // Non-recoverable failure (not 401/422); fail fast
            return {
              ok: false,
              pending: false,
              snapshotApplied: false,
              error: `Legacy SaaS enable failed (status ${enableResp.status}, non-recoverable). productId: ${SAAS_PRODUCT_ID}`,
              attempts,
              legacyEnableAttempt,
              v2EnableAttempt: null,
              planDetailsAttempt: null,
              elapsedMs: Date.now() - startedAt,
            };
          }
        }
      }

      // 3) Bounded polling
      while (Date.now() - startedAt < maxMs) {
        poll += 1;
        const statusResp = await getSnapshotStatusDetailed(companyId, locationId);
        attempts.push({
          poll,
          ok: statusResp.ok,
          status: statusResp.status,
          ms: statusResp.ms,
          responseSnippet: (statusResp.text || '').slice(0, 1200),
        });

        const statusJson = statusResp.json;
        const snapshotApplied = !!statusJson?.snapshotApplied;
        const hasDiscoveryCalendar = !!statusJson?.hasDiscoveryCalendar;
        const normalizedStatus = statusJson?.normalizedStatus;

        if (snapshotApplied || hasDiscoveryCalendar || normalizedStatus === 'completed') {
          return {
            ok: true,
            snapshotApplied: true,
            lastStatus: statusJson,
            attempts,
            legacyEnableAttempt,
            v2EnableAttempt,
            planDetailsAttempt,
            elapsedMs: Date.now() - startedAt,
          };
        }

        await sleep(pollEveryMs);
      }

      return {
        ok: false,
        pending: true,
        snapshotApplied: false,
        error: `Snapshot still applying (bounded wait exceeded). snapshotId: ${SNAPSHOT_ID}`,
        attempts,
        legacyEnableAttempt,
        v2EnableAttempt,
        planDetailsAttempt,
        elapsedMs: Date.now() - startedAt,
      };
    };

    // Like callFunction, but preserves HTTP status + raw text for better diagnostics.
    const callFunctionDetailed = async (name: string, body: any) => {
      const startedAt = Date.now();
      const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify(body),
      });

      const text = await response.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // non-json response
      }

      return {
        ok: response.ok,
        status: response.status,
        text,
        json,
        ms: Date.now() - startedAt,
      };
    };

    // Helper for GET requests with query params
    const callFunctionGet = async (name: string, params: Record<string, string>) => {
      const url = new URL(`${supabaseUrl}/functions/v1/${name}`);
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      });
      return response.json();
    };

    // Parse agent name
    const nameParts = client.name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Execute steps sequentially
    for (let i = startFromStep; i <= AUTOMATION_STEPS.length; i++) {
      const step = AUTOMATION_STEPS[i - 1];

      // Own-CRM mode: auto-skip GHL/CRM-dependent steps (9-15, 19) — check BEFORE manual pause
      const CRM_STEPS = [9, 10, 11, 12, 13, 14, 15, 19];
      if (client.use_own_crm && CRM_STEPS.includes(i)) {
        console.log(`[Own CRM] Skipping step ${i}: ${step.name} — agent uses own CRM`);
        await updateStep(i, true, { skipped: true, reason: 'Agent uses own CRM' });
        continue;
      }

      // Manual steps: pause if not yet completed by admin, otherwise continue
      if ((step as any).manual) {
        const stepsCompleted = (automationRun.steps_completed || []) as number[];
        const stepData = (automationRun.step_data || {}) as Record<string, any>;

        if (stepsCompleted.includes(i)) {
          console.log(`Manual step ${i}: ${step.name} already completed by admin — continuing`);
          continue;
        }

        console.log(`Pausing at manual step ${i}: ${step.name} — waiting for admin`);
        stepData[`step_${i}`] = stepData[`step_${i}`] || { manual: true, awaitingHuman: true };
        automationRun.step_data = stepData;

        await supabase.from('onboarding_automation_runs').update({
          status: 'paused',
          current_step: i,
          step_data: stepData,
        }).eq('id', automationRun.id);

        return new Response(
          JSON.stringify({
            success: true,
            status: 'paused',
            waitingForStep: i,
            stepName: step.name,
            message: `Automation paused — waiting for manual step ${i}: ${step.name}`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Executing step ${i}: ${step.name}`);

      try {
        switch (step.name) {
          case 'lowercase_name': {
            const lowerName = client.name.toLowerCase();
            await updateStep(i, true, { original: client.name, lowercase: lowerName });
            break;
          }

          case 'generate_slug': {
            // Format: agent_id-firstname-lastname
            const slug = `${client.agent_id}-${firstName.toLowerCase()}-${lastName.toLowerCase().replace(/\s+/g, '-')}`;
            await supabase.from('clients').update({ url_slug: slug }).eq('id', clientId);
            client.url_slug = slug;
            await updateStep(i, true, { slug });
            break;
          }

          case 'generate_bio': {
            if (isNonEmptyString(client.ai_bio)) {
              await updateStep(i, true, { alreadyExisted: true });
              break;
            }
            const bioInput = client.agent_bio_input || `Insurance agent licensed in ${client.states || 'multiple states'}`;
            const result = await callFunction('generate-agent-bio', {
              agent_bio_input: bioInput,
              first_name: firstName,
              last_name: lastName,
            });
            if (result.bio) {
              await supabase.from('clients').update({ ai_bio: result.bio }).eq('id', clientId);
              client.ai_bio = result.bio;
              await updateStep(i, true, { bio: result.bio });
            } else {
              throw new Error(result.error || 'Failed to generate bio');
            }
            break;
          }

          case 'create_nfia': {
            if (isNonEmptyString(client.nfia_link)) {
              await updateStep(i, true, { alreadyExisted: true, nfiaPageUrl: client.nfia_link, liveUrl: client.nfia_link });
              break;
            }
            const expectedSchedulerUrl = client.url_slug
              ? `https://${WEBFLOW_SITE_DOMAIN}/schedule/${client.url_slug}`
              : '';

            const payload = {
              fullname: client.name,
              email: client.email,
              phone: client.phone,
              bio: client.ai_bio,
              headshotUrl: client.profile_image_url,
              // Ensure no spaces (NFIA expects e.g. "TX,FL,CA")
              stateslicensed: (client.states || '').replace(/\s+/g, ''),
              scheduleurl: expectedSchedulerUrl,
              npn: client.npn,
              slug: client.url_slug,
            };

            // Retry policy: 3 attempts with backoff. This step is onboarding-blocking.
            const attempts: any[] = [];
            let lastError: string | null = null;
            let successUrl: string | null = null;
            let lastResponse: any = null;

            for (let attempt = 1; attempt <= 3; attempt++) {
              const resp = await callFunctionDetailed('nfia-create-agent', payload);
              lastResponse = resp;

              const result = resp.json;
              const attemptSummary = {
                attempt,
                ok: resp.ok,
                status: resp.status,
                ms: resp.ms,
                // Store a short snippet to avoid bloating DB logs
                responseSnippet: (resp.text || '').slice(0, 800),
                request_id: result?.request_id,
                headshot_preflight: result?.headshot_preflight,
                error: result?.error,
                nfia_url: result?.nfia_url,
              };
              attempts.push(attemptSummary);

              if (resp.ok && result?.success && result?.nfia_url) {
                successUrl = result.nfia_url;
                break;
              }

              lastError = result?.error || `NFIA create failed (status ${resp.status})`;
              if (attempt < 3) {
                const backoffMs = attempt === 1 ? 600 : attempt === 2 ? 2200 : 0;
                await sleep(backoffMs);
              }
            }

            if (successUrl) {
              await supabase.from('clients').update({ nfia_link: successUrl }).eq('id', clientId);
              client.nfia_link = successUrl;
              await updateStep(i, true, { nfiaPageUrl: successUrl, liveUrl: successUrl, attempts });
            } else {
              await updateStep(i, false, { attempts, payload }, lastError || 'Failed to create NFIA page');
              throw new Error(
                lastError || (lastResponse?.text ? String(lastResponse.text).slice(0, 500) : 'Failed to create NFIA page')
              );
            }
            break;
          }

          case 'create_scheduler': {
            if (isNonEmptyString(client.webflow_scheduler_id) && isNonEmptyString(client.scheduler_link)) {
              await updateStep(i, true, { alreadyExisted: true, itemId: client.webflow_scheduler_id, liveUrl: client.scheduler_link });
              break;
            }
            const result = await callFunction('webflow-cms-create', {
              page_type: 'schedulers',
              data: {
                name: client.name,
                slug: client.url_slug,
                embed_id: '', // Will update after calendar is created
                agent_image_url: client.profile_image_url,
                bio_summary: client.ai_bio,
              },
            });
            if (result.success && result.item_id) {
              const liveUrl = result.live_url || `https://${WEBFLOW_SITE_DOMAIN}/schedule/${client.url_slug}`;
              await supabase.from('clients').update({ 
                webflow_scheduler_id: result.item_id,
                scheduler_link: liveUrl,
              }).eq('id', clientId);
              client.webflow_scheduler_id = result.item_id;
              client.scheduler_link = liveUrl;
              await updateStep(i, true, { itemId: result.item_id, liveUrl });
            } else {
              throw new Error(result.error || 'Failed to create scheduler page');
            }
            break;
          }

          case 'create_lander': {
            if (isNonEmptyString(client.webflow_lander_id) && isNonEmptyString(client.lander_link)) {
              await updateStep(i, true, { alreadyExisted: true, itemId: client.webflow_lander_id, liveUrl: client.lander_link });
              break;
            }
            const scheduleRedirectUrl = client.scheduler_link;
            const result = await callFunction('webflow-cms-create', {
              page_type: 'landers',
              data: {
                name: client.name,
                slug: client.url_slug,
                schedule_redirect_url: scheduleRedirectUrl,
              },
            });
            if (result.success && result.item_id) {
              const liveUrl = result.live_url || `https://${WEBFLOW_SITE_DOMAIN}/discover/${client.url_slug}`;
              await supabase.from('clients').update({ 
                webflow_lander_id: result.item_id,
                lander_link: liveUrl,
              }).eq('id', clientId);
              client.webflow_lander_id = result.item_id;
              client.lander_link = liveUrl;
              await updateStep(i, true, { itemId: result.item_id, liveUrl });
            } else {
              throw new Error(result.error || 'Failed to create lander page');
            }
            break;
          }

          case 'create_profile': {
            if (isNonEmptyString(client.webflow_profile_id) && isNonEmptyString(client.tfwp_profile_link)) {
              await updateStep(i, true, { alreadyExisted: true, itemId: client.webflow_profile_id, liveUrl: client.tfwp_profile_link });
              break;
            }
            const result = await callFunction('webflow-cms-create', {
              page_type: 'profiles',
              data: {
                name: client.name,
                slug: client.url_slug,
                profile_picture_url: client.profile_image_url,
                bio: client.ai_bio,
                bio_summary: client.ai_bio,
                email: client.email,
                phone: client.phone,
                agent_vsl_link: client.scheduler_link,
              },
            });
            if (result.success && result.item_id) {
              const liveUrl = result.live_url || `https://${WEBFLOW_SITE_DOMAIN}/team/${client.url_slug}`;
              await supabase.from('clients').update({ 
                webflow_profile_id: result.item_id,
                tfwp_profile_link: liveUrl,
              }).eq('id', clientId);
              client.webflow_profile_id = result.item_id;
              client.tfwp_profile_link = liveUrl;
              await updateStep(i, true, { itemId: result.item_id, liveUrl });
            } else {
              throw new Error(result.error || 'Failed to create profile page');
            }
            break;
          }

          case 'create_thankyou': {
            if (isNonEmptyString(client.webflow_thankyou_id) && isNonEmptyString(client.thankyou_link)) {
              await updateStep(i, true, { alreadyExisted: true, itemId: client.webflow_thankyou_id, liveUrl: client.thankyou_link });
              break;
            }
            const smsLink = `sms:+1${(client.phone || '').replace(/\D/g, '')}?&body=Hi,%20I%20just%20scheduled%20my%20appointment%20with%20Tax%20Free%20Wealth%20Plan%20and%20I'm%20excited%20to%20get%20started!%20✅`;
            const result = await callFunction('webflow-cms-create', {
              page_type: 'thankyou',
              data: {
                name: client.name,
                slug: client.url_slug,
                nfia_page_url: client.nfia_link,
                sms_message_link: smsLink,
                headshot_url: client.profile_image_url,
              },
            });
            if (result.success && result.item_id) {
              const liveUrl = result.live_url || `https://${WEBFLOW_SITE_DOMAIN}/thank-you/${client.url_slug}`;
              await supabase.from('clients').update({ 
                webflow_thankyou_id: result.item_id,
                thankyou_link: liveUrl,
              }).eq('id', clientId);
              client.webflow_thankyou_id = result.item_id;
              client.thankyou_link = liveUrl;
              await updateStep(i, true, { itemId: result.item_id, liveUrl });
            } else {
              throw new Error(result.error || 'Failed to create thank you page');
            }
            break;
          }

          case 'create_subaccount': {
            // Step 9: Create GHL Subaccount + Create GHL User (combined)
            let subaccountResult: any = null;
            
            // A) Create subaccount if not exists
            if (isNonEmptyString(client.subaccount_id) && isNonEmptyString(client.crm_link)) {
              subaccountResult = { alreadyExisted: true, locationId: client.subaccount_id, crmLink: client.crm_link };
            } else {
              const result = await callFunction('ghl-create-subaccount', {
                first_name: firstName,
                last_name: lastName,
                email: client.email,
                phone: client.phone,
                profile_url: client.tfwp_profile_link,
                timezone: client.timezone || 'America/New_York',
                address_street: client.address_street,
                address_city: client.address_city,
                address_state: client.address_state,
                address_zip: client.address_zip,
                snapshot_id: SNAPSHOT_ID,
              });
              if (result.success && result.location_id) {
                const crmLink = `https://app.alphaagentcrm.com/v2/location/${result.location_id}`;
                await supabase.from('clients').update({
                  subaccount_id: result.location_id,
                  crm_link: crmLink,
                }).eq('id', clientId);
                client.subaccount_id = result.location_id;
                client.crm_link = crmLink;
                subaccountResult = { locationId: result.location_id, crmLink, snapshotId: SNAPSHOT_ID, locationUpdateResult: result.locationUpdateResult };
              } else {
                throw new Error(result.error || 'Failed to create GHL subaccount');
              }
            }

            // B) Create GHL user if not exists
            const locationId9 = client.subaccount_id;
            let userId9 = client.ghl_user_id;
            let userCreationResult9: any = null;
            
            if (!isNonEmptyString(userId9)) {
              const maxUserAttempts = 3;
              let userCreationSuccess = false;
              
              for (let attempt = 1; attempt <= maxUserAttempts; attempt++) {
                console.log(`[Step 9] GHL user creation attempt ${attempt}/${maxUserAttempts}`);
                
                const result = await callFunction('ghl-create-user', {
                  first_name: firstName,
                  last_name: lastName,
                  email: client.email,
                  phone: client.phone,
                  profile_photo_url: client.profile_image_url,
                  location_id: locationId9,
                  ...(ghlPassword ? { password: ghlPassword } : {}),
                });
                
                userCreationResult9 = {
                  ok: !!result.success,
                  userId: result.user_id,
                  error: result.error,
                  attempt,
                  maxAttempts: maxUserAttempts,
                };
                
                if (result.success && result.user_id) {
                  await supabase.from('clients').update({ ghl_user_id: result.user_id }).eq('id', clientId);
                  client.ghl_user_id = result.user_id;
                  userId9 = result.user_id;
                  userCreationSuccess = true;
                  break;
                }
                
                const errorMsg = result.error || '';
                if (errorMsg.includes('could not find the locations') && attempt < maxUserAttempts) {
                  const waitMs = 5000 * attempt;
                  console.log(`[Step 9] Location not yet propagated, waiting ${waitMs}ms before retry...`);
                  await sleep(waitMs);
                  continue;
                }
                break;
              }
              
              if (!userCreationSuccess) {
                throw new Error(userCreationResult9?.error || 'Failed to create GHL user');
              }
            } else {
              userCreationResult9 = { alreadyExisted: true, userId: userId9 };
            }

            await updateStep(i, true, { 
              ...subaccountResult, 
              userId: userId9,
              userCreationResult: userCreationResult9,
            });
            break;
          }

          case 'activate_saas': {
            // Step 10: Manual step - SaaS activation done by human in GHL dashboard
            // This should be skipped by the manual step check above, but just in case:
            console.log('[Step 10] activate_saas is a manual step - skipping');
            await updateStep(i, true, { manual: true, awaitingHuman: true, note: 'SaaS activation is done manually by the onboarding team in GHL dashboard' });
            break;
          }

          case 'install_snapshot': {
            // Step 11: Poll for Discovery Calendar (snapshot verification)
            // SaaS activation is done manually in Step 10 — SaaS enable API is disabled
            // When SaaS is activated manually, the snapshot should auto-apply and create the Discovery calendar

            if (!isNonEmptyString(client.subaccount_id)) {
              throw new Error('Missing subaccount_id (locationId) required for snapshot verification');
            }

            const locationId = client.subaccount_id;
            console.log(`[Step 11] Polling for Discovery calendar on location: ${locationId}`);

            const maxMs = 90 * 1000;
            const pollEveryMs = 10 * 1000;
            const startedAt = Date.now();
            const attempts: any[] = [];
            let discoveryCalendarId: string | null = null;
            let lastStatus: any = null;
            let poll = 0;

            while (Date.now() - startedAt < maxMs) {
              poll += 1;
              const statusResp = await getSnapshotStatusDetailed(GHL_COMPANY_ID, locationId);
              const statusJson = statusResp.json;
              lastStatus = statusJson;

              attempts.push({
                poll,
                ok: statusResp.ok,
                status: statusResp.status,
                ms: statusResp.ms,
                calendarsFound: statusJson?.calendarsFound,
                hasDiscoveryCalendar: statusJson?.hasDiscoveryCalendar,
                discoveryCalendarId: statusJson?.discoveryCalendarId,
              });

              if (statusJson?.hasDiscoveryCalendar && statusJson?.discoveryCalendarId) {
                discoveryCalendarId = statusJson.discoveryCalendarId;
                console.log(`[Step 11] Discovery calendar found: ${discoveryCalendarId}`);
                break;
              }

              console.log(`[Step 11] Poll ${poll}: Discovery not found yet, waiting...`);
              await sleep(pollEveryMs);
            }

            if (discoveryCalendarId) {
              // Save discovery_calendar_id to client record
              await supabase.from('clients').update({
                discovery_calendar_id: discoveryCalendarId
              }).eq('id', clientId);
              client.discovery_calendar_id = discoveryCalendarId;

              await updateStep(i, true, {
                locationId,
                snapshotApplied: true,
                discoveryCalendarId,
                elapsedMs: Date.now() - startedAt,
                polls: attempts.length,
                lastStatus,
              });
            } else {
              // Bounded wait exceeded - fail with explicit snapshot diagnostics
              const snapshotError = 'Snapshot not found: Discovery calendar was not found within 90s. Verify SaaS was activated and snapshot was applied in GHL, then retry Step 11.';
              const stepData = (automationRun.step_data || {}) as Record<string, any>;
              stepData[`step_${i}`] = {
                locationId,
                snapshotApplied: false,
                discoveryCalendarId: null,
                elapsedMs: Date.now() - startedAt,
                polls: attempts.length,
                attempts,
                lastStatus,
                pending: false,
                snapshotError,
              };
              automationRun.step_data = stepData;

              throw new Error(snapshotError);
            }
            break;
          }

          case 'provision_phone': {
           // Step 19: Telephony Overrule & Provisioning (fail-hard)
           // A) Validate prerequisites
           if (!client.subaccount_id) {
             throw new Error('Missing subaccount_id required for phone provisioning');
           }
           if (!client.phone) {
             throw new Error('Missing client phone number required to determine area code');
           }
            
           // B) Extract area code
           const normalizedPhone = client.phone.replace(/\D/g, '');
           const preferredAreaCode = normalizedPhone.length >= 10 
             ? normalizedPhone.substring(normalizedPhone.length - 10, normalizedPhone.length - 7)
             : null;
           
           if (!preferredAreaCode) {
             throw new Error('Unable to extract area code from client phone');
           }
           
           // C) Get location-scoped OAuth token FIRST (needed for both Twilio injection and phone provisioning)
           const locationTokenResult = await callFunctionDetailed('crm-location-token', {
             companyId: GHL_COMPANY_ID,
             locationId: client.subaccount_id,
           });

           const locationTokenAttempt = {
             ok: locationTokenResult.ok,
             status: locationTokenResult.status,
             responseSnippet: (locationTokenResult.text || '').substring(0, 500),
             ms: locationTokenResult.ms,
           };

           const locationTokenJson = locationTokenResult.json;
           const rawLocationToken =
             locationTokenJson?.locationAccessToken ||
             locationTokenJson?.access_token ||
             locationTokenJson?.accessToken;

           if (!locationTokenResult.ok || !rawLocationToken) {
             await updateStep(i, false, { locationTokenAttempt }, 'Failed to obtain location token for phone provisioning');
             throw new Error(`Location token failed: ${locationTokenJson?.error || locationTokenResult.status}`);
           }

           const phoneAuthToken = normalizeBearerToken(rawLocationToken);
           console.log('[Step 12] Location token obtained, proceeding with Twilio injection...');

           // D) Inject Master Twilio credentials using location-scoped OAuth token (soft-fail).
           // This deactivates LeadConnector and activates our Master Twilio account.
           // If the endpoint returns 404 on this tenant, we soft-fail and rely on the subaccount
           // already having Master Twilio connected manually in the GHL UI.
           const injectResult = await callFunctionDetailed('ghl-inject-twilio', {
             locationId: client.subaccount_id,
             accessToken: phoneAuthToken, // Use location OAuth token, not agency API key
           });

           const injectionAttempt: Record<string, any> = {
             ok: injectResult.ok,
             status: injectResult.status,
             responseSnippet: (injectResult.text || '').substring(0, 1200),
             ms: injectResult.ms,
             skipped: false,
             skipReason: null as string | null,
           };

            const injectionSucceeded = !!(injectResult.ok && injectResult.json?.success);

            // Soft-fail only if we can verify Twilio is already active.
            // A 404 from ghl-inject-twilio often means the tenant doesn't expose the activation/injection endpoints,
            // BUT provisioning still requires Twilio to be active. So we do a non-destructive readiness check.
            let twilioReadiness: Record<string, any> | null = null;

            if (!injectionSucceeded) {
              if (injectResult.status === 404) {
                console.log('[Step 12] Twilio injection returned 404; running Twilio readiness check before proceeding.');

                const readinessUrl = new URL(
                  `https://backend.leadconnectorhq.com/phone-system/numbers/location/${client.subaccount_id}/available`
                );
                readinessUrl.searchParams.set('countryCode', 'US');
                readinessUrl.searchParams.set('firstPart', preferredAreaCode);
                readinessUrl.searchParams.set('smsEnabled', 'true');
                readinessUrl.searchParams.set('voiceEnabled', 'true');
                readinessUrl.searchParams.set('mmsEnabled', 'true');
                readinessUrl.searchParams.set('numberTypes', 'local');

                try {
                  const res = await fetch(readinessUrl.toString(), {
                    method: 'GET',
                    headers: {
                      Authorization: `Bearer ${phoneAuthToken}`,
                      Version: '2021-07-28',
                      Accept: 'application/json',
                    },
                  });
                  const text = await res.text();
                  const snippet = (text || '').substring(0, 800);
                  const missingTwilio = res.status === 422 && snippet.toLowerCase().includes('does not have twilio account');

                  twilioReadiness = {
                    url: readinessUrl.toString(),
                    ok: res.ok,
                    status: res.status,
                    responseSnippet: snippet,
                    missingTwilio,
                    ready: res.ok && !missingTwilio,
                  };
                } catch (e: any) {
                  twilioReadiness = {
                    url: readinessUrl.toString(),
                    ok: false,
                    status: 0,
                    responseSnippet: `fetch_error: ${e?.message || String(e)}`,
                    missingTwilio: null,
                    ready: false,
                  };
                }

                // Only skip injection if the readiness check suggests Twilio is already active.
                if (twilioReadiness?.ready) {
                  console.log('[Step 12] Twilio appears active (readiness check ok). Proceeding without injection.');
                  injectionAttempt.skipped = true;
                  injectionAttempt.skipReason = 'Injection endpoint unavailable (404) but Twilio appears active; proceeding';
                } else {
                  // --- SKIP instead of PAUSE ---
                  // Twilio injection unavailable programmatically. Mark step as skipped with manual action required,
                  // then continue to Step 13 instead of blocking the workflow.

                  console.log('[Step 12] Manual action needed: Twilio not connected. Skipping to Step 13.');

                  const skipReason =
                    'Manual action needed: Twilio injection endpoints unavailable. ' +
                    'Connect Master Twilio manually in CRM Settings → Phone Integration, ' +
                    'then retry Step 12 later if phone provisioning is required.';

                  await updateStep(i, false, {
                    injectionAttempt,
                    locationTokenAttempt,
                    twilioReadiness,
                    skipped: true,
                    manual_action_required: true,
                    skipReason,
                  }, 'Manual action needed: Twilio not connected');

                  break; // Exit switch case, continue for-loop to Step 13
                }
              } else {
                // Other errors still fail-hard
                await updateStep(
                  i,
                  false,
                  { injectionAttempt, locationTokenAttempt },
                  'Twilio injection failed (required)'
                );
                throw new Error(`Twilio injection failed: ${injectResult.json?.error || injectResult.status}`);
              }
            }

           // Wait for Twilio credentials to propagate (only if injection succeeded)
           if (!injectionAttempt.skipped) {
             console.log('[Step 12] Twilio injection succeeded, waiting 12s for propagation...');
             await new Promise((resolve) => setTimeout(resolve, 12000));
           } else {
             console.log('[Step 12] Skipped propagation wait (injection was soft-skipped).');
           }

           // E) Purchase phone number using the same location token
           const provisionResult = await callFunctionDetailed('ghl-provision-phone', {
              locationId: client.subaccount_id,
             preferredAreaCode,
             clientPhone: client.phone, // fallback
              accessToken: phoneAuthToken,
            });
            
           const provisionAttempt = {
             ok: provisionResult.ok,
             status: provisionResult.status,
             responseSnippet: (provisionResult.text || '').substring(0, 500),
             ms: provisionResult.ms,
             phoneNumber: provisionResult.json?.phoneNumber,
             areaCode: provisionResult.json?.areaCode,
             triedAreaCodes: provisionResult.json?.triedAreaCodes,
           };
           
           if (!provisionResult.ok || !provisionResult.json?.success || !provisionResult.json?.phoneNumber) {
             await updateStep(i, false, { injectionAttempt, locationTokenAttempt, provisionAttempt }, 'Failed to provision phone number');
             throw new Error(`Phone provisioning failed: ${provisionResult.json?.error || provisionResult.status}`);
           }
           
           const purchasedPhone = provisionResult.json.phoneNumber;
           
           // E) Set purchased number as primary outbound
           const setPrimaryResult = await callFunctionDetailed('ghl-set-primary-phone', {
             locationId: client.subaccount_id,
             phoneNumber: purchasedPhone,
           });
           
           const setPrimaryAttempt = {
             ok: setPrimaryResult.ok,
             status: setPrimaryResult.status,
             responseSnippet: (setPrimaryResult.text || '').substring(0, 500),
             ms: setPrimaryResult.ms,
             method: setPrimaryResult.json?.method,
           };
           
           if (!setPrimaryResult.ok || !setPrimaryResult.json?.success) {
             await updateStep(i, false, { injectionAttempt, provisionAttempt, setPrimaryAttempt }, 'Failed to set primary outbound number');
             throw new Error(`Set primary phone failed: ${setPrimaryResult.json?.error || setPrimaryResult.status}`);
           }
           
           // F) Persist success
           if (provisionResult.json.phoneNumber) {
              await supabase.from('clients').update({ 
               ghl_phone_number: provisionResult.json.phoneNumber 
              }).eq('id', clientId);
             client.ghl_phone_number = provisionResult.json.phoneNumber;
              await updateStep(i, true, { 
               injectionAttempt,
               provisionAttempt,
               setPrimaryAttempt,
              });
            }
            break;
          }

          case 'pull_calendar_id': {
            if (!isNonEmptyString(client.subaccount_id)) {
              throw new Error('Missing subaccount_id (locationId) required for calendar lookup');
            }

            // Hard gate: Step 13 must fail if snapshot isn't applied (as requested).
            const snap = await callFunctionDetailed('crm-snapshot-status', {
              companyId: GHL_COMPANY_ID,
              locationId: client.subaccount_id,
            });
            const snapJson = snap.json;
            if (!(snapJson?.snapshotApplied || snapJson?.hasDiscoveryCalendar || snapJson?.normalizedStatus === 'completed')) {
              await updateStep(i, false, {
                snapshotGate: {
                  ok: snap.ok,
                  status: snap.status,
                  responseSnippet: (snap.text || '').slice(0, 1200),
                }
              }, 'Snapshot not applied yet; cannot pull discovery calendar');
              throw new Error('Snapshot not applied yet; cannot pull discovery calendar');
            }

            // crm-discovery-calendar expects GET with query params
            const result = await callFunctionGet('crm-discovery-calendar', {
              companyId: GHL_COMPANY_ID,
              locationId: client.subaccount_id || '',
            });
            if (result.discoveryCalendarId) {
              await supabase.from('clients').update({ discovery_calendar_id: result.discoveryCalendarId }).eq('id', clientId);
              client.discovery_calendar_id = result.discoveryCalendarId;
              await updateStep(i, true, { calendarId: result.discoveryCalendarId, matchedName: result.matchedName });
            } else {
              throw new Error(result.error || 'No discovery calendar found');
            }
            break;
          }

          case 'assign_calendars': {
            // Build thank you page URL with contact merge fields
            const thankYouUrlWithParams = client.thankyou_link 
              ? `${client.thankyou_link}?phone={{contact.phone}}&email={{contact.email}}`
              : null;

            const result = await callFunction('ghl-assign-user-to-all-calendars', {
              companyId: GHL_COMPANY_ID,
              locationId: client.subaccount_id,
              userId: client.ghl_user_id,
              agentName: client.name,
              activateCalendars: true,
              discoveryCalendarId: client.discovery_calendar_id,
              confirmationUrl: thankYouUrlWithParams,
            });

            if (!result?.success) {
              // Persist diagnostics, then fail the run (this is a hard dependency for the scheduler embed)
              await updateStep(i, false, { details: result }, result?.error || 'Failed to assign user to calendars');
              throw new Error(result?.error || 'Failed to assign user to calendars');
            }

            await updateStep(i, true, { 
              assigned: true, 
              updatedCalendars: result.updatedCalendars?.length || 0,
              redirectUrlSet: !!thankYouUrlWithParams,
            });
            break;
          }

          case 'update_scheduler_embed': {
            // Re-fetch client to get the latest discovery_calendar_id (prevents stale data from concurrent runs)
            const { data: freshClient } = await supabase
              .from('clients')
              .select('webflow_scheduler_id, discovery_calendar_id')
              .eq('id', clientId)
              .single();

            const schedulerId = freshClient?.webflow_scheduler_id || client.webflow_scheduler_id;
            const calendarId = freshClient?.discovery_calendar_id || client.discovery_calendar_id;

            if (schedulerId && calendarId) {
              const result = await callFunction('webflow-cms-update', {
                page_type: 'schedulers',
                item_id: schedulerId,
                field_updates: { 'embed-id': calendarId },
              });
              if (result.success) {
                await updateStep(i, true, { updated: true, calendarId });
              } else {
                throw new Error(result.error || 'Failed to update scheduler embed');
              }
            } else {
              throw new Error(`Missing scheduler ID (${schedulerId}) or calendar ID (${calendarId})`);
            }
            break;
          }

          case 'sync_crm_custom_fields': {
            if (!client.subaccount_id) {
              throw new Error('Missing subaccount_id for CRM custom field sync');
            }
            const result = await callFunction('ghl-sync-custom-fields', {
              clientId: clientId,
              locationId: client.subaccount_id,
            });
            if (result.success) {
              await updateStep(i, true, { 
                matchedCount: result.matchedCount, 
                totalRequired: result.totalRequired,
                mappings: result.mappings?.length || 0,
              });
            } else {
              // Non-fatal - log and continue
              console.warn('CRM custom field sync failed:', result.error);
              await updateStep(i, false, null, result.error || 'Failed to sync CRM custom fields');
            }
            break;
          }

          case 'create_google_ads': {
            // Step 1: Create Search [MaxConv] campaign (primary)
            const searchResult = await callFunction('create-google-ads-campaign', {
              clientId: clientId,
              states: client.states,
              budget: client.ad_spend_budget,
              agentId: client.agent_id,
              agentName: client.name,
              landingPage: client.lander_link,
            });

            let searchCampaignId: string | null = null;
            if (searchResult.success) {
              searchCampaignId = searchResult.campaignId;
              await supabase.from('clients').update({
                google_campaign_id: searchResult.campaignId,
                ads_link: searchResult.adsLink,
                gads_campaign_created: true,
              }).eq('id', clientId);
              client.google_campaign_id = searchResult.campaignId;
              client.ads_link = searchResult.adsLink;
              console.log(`[onboarding] Search campaign created: ${searchCampaignId}`);
            } else {
              await supabase.from('clients').update({
                gads_creation_error: searchResult.error,
                gads_last_attempt_at: new Date().toISOString(),
              }).eq('id', clientId);
              console.warn(`[onboarding] Search campaign failed: ${searchResult.error}`);
            }

            // Step 2: Create Display campaigns (Remarketing + In-Market)
            let displayResult: any = { success: false, error: 'skipped' };
            try {
              displayResult = await callFunction('create-display-campaigns', {
                clientId: clientId,
                agentName: client.name,
                agentId: client.agent_id,
                states: client.states,
                landingPage: client.lander_link,
              });
              if (displayResult.success) {
                console.log(`[onboarding] Display campaigns created: remarket=${displayResult.remarkCampaignId}, inmarket=${displayResult.inmarketCampaignId}`);
              } else {
                console.warn(`[onboarding] Display campaigns failed: ${displayResult.error}`);
              }
            } catch (displayError) {
              console.warn('[onboarding] Display campaign creation error (non-fatal):', displayError);
              displayResult = { success: false, error: displayError instanceof Error ? displayError.message : 'Unknown error' };
            }

            // Overall step result
            if (searchResult.success) {
              await updateStep(i, true, {
                searchCampaignId,
                adsLink: searchResult.adsLink,
                displayRemarket: displayResult.remarkCampaignId || null,
                displayInmarket: displayResult.inmarketCampaignId || null,
                displaySuccess: displayResult.success,
              });
            } else {
              await updateStep(i, false, null, searchResult.error || 'Failed to create Google Ads campaigns');
            }
            break;
          }

          case 'final_verification': {
            const missing: string[] = [];
            if (!client.use_own_crm) {
              // Standard flow: require GHL artifacts
              if (!isNonEmptyString(client.subaccount_id)) missing.push('subaccount_id');
              if (!isNonEmptyString(client.discovery_calendar_id)) missing.push('discovery_calendar_id');
            }
            if (!isNonEmptyString(client.google_campaign_id)) missing.push('google_campaign_id');

            if (missing.length > 0) {
              throw new Error(`Final verification failed: missing ${missing.join(', ')}`);
            }

            const checked = client.use_own_crm
              ? ['google_campaign_id']
              : ['subaccount_id', 'discovery_calendar_id', 'google_campaign_id'];
            await updateStep(i, true, {
              checked,
              ownCrm: !!client.use_own_crm,
              note: client.use_own_crm
                ? 'Own-CRM mode: verified Google Ads only (GHL artifacts skipped).'
                : 'Core onboarding artifacts verified before live test.',
            });
            break;
          }

          case 'verify_onboarding': {
            // Try live verification first (with AI-powered form fill test)
            let verifyResponse = await callFunctionDetailed('verify-onboarding-live', {
              client_id: clientId,
              only_step: verifyOnlyStep,
            });

            // Fallback to simpler verify-onboarding if live version is unavailable (404)
            if (!verifyResponse.ok && verifyResponse.status === 404) {
              console.log('[Step 18] verify-onboarding-live unavailable (404), falling back to verify-onboarding');
              verifyResponse = await callFunctionDetailed('verify-onboarding', {
                client_id: clientId,
                only_step: verifyOnlyStep,
              });
            }

            // Parse the response
            const result = verifyResponse.json || {};
            if (!verifyResponse.ok && !result.allPassed) {
              console.warn('[Step 18] Verification returned non-OK status:', verifyResponse.status, result.error || result);
            }

            const passed = result.allPassed || result.criticalPassed || false;
            await updateStep(i, passed, {
              allPassed: result.allPassed,
              criticalPassed: result.criticalPassed,
              totalChecks: result.total_checks,
              passedChecks: result.passed_checks,
              testLeadId: result.test_lead_id,
              ghlContactId: result.ghl_contact_id,
              results: result.results,
              onlyStep: verifyOnlyStep || null,
              usedFallback: verifyResponse.status === 404 ? false : undefined, // Track if fallback was used
            });
            break;
          }
        }
      } catch (stepError: any) {
        console.error(`Step ${i} failed:`, stepError);

        // Preserve any diagnostics already written by the step itself.
        const existingStepData = (automationRun.step_data || {})[`step_${i}`];
        await updateStep(
          i,
          false,
          // IMPORTANT: if there's no existing step_data, pass undefined so we don't overwrite
          // any diagnostics that a step may have tried to write (or accidentally set null).
          existingStepData !== undefined ? existingStepData : undefined,
          stepError.message || 'Unknown error'
        );
        
        // Update run status to failed (retry; this is what makes the UI trustworthy)
        let lastFailPersist: string | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          const { error: failPersistError } = await supabase
            .from('onboarding_automation_runs')
            .update({ 
              status: 'failed',
              current_step: i,
              updated_at: new Date().toISOString(),
            })
            .eq('id', automationRun.id);

          if (!failPersistError) {
            lastFailPersist = null;
            break;
          }
          lastFailPersist = failPersistError.message;
          if (attempt < 3) await sleep(250 * attempt);
        }

        if (lastFailPersist) {
          console.error('CRITICAL: Unable to persist failed status after retries', {
            runId: automationRun.id,
            clientId,
            step: i,
            lastFailPersist,
          });
        }

        return new Response(JSON.stringify({
          success: false,
          error: `Step ${i} (${step.name}) failed: ${stepError.message}`,
          failedAt: i,
          automationRunId: automationRun.id,
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // All steps completed successfully
    await supabase
      .from('onboarding_automation_runs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', automationRun.id);

    // Update client onboarding status
    await supabase
      .from('clients')
      .update({
        onboarding_status: 'automation_complete',
        automation_completed_at: new Date().toISOString(),
      })
      .eq('id', clientId);

    // Mark all onboarding tasks as complete
    await supabase
      .from('onboarding_tasks')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('client_id', clientId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Full onboarding automation completed',
      automationRunId: automationRun.id,
      stepsCompleted: automationRun.steps_completed?.length || AUTOMATION_STEPS.length,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Automation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
