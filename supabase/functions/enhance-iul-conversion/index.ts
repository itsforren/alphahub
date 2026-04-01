import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_ADS_API_VERSION = 'v22';
const CUSTOMER_ID = '6551751244';
const MANAGER_ID = '5765206288';
const CONVERSION_ACTION = `customers/${CUSTOMER_ID}/conversionActions/6489866157`; // Master IUL PPL Conversion

// Retry delays in minutes indexed by attempt number (1-based).
// Attempt 1 fires from the queue ~5 min after submission.
// Subsequent attempts: 15, 30, 60, 120 min.
const RETRY_DELAYS_MINUTES = [15, 30, 60, 120];
const MAX_ATTEMPTS = 5;

// ── Normalization ──

function normalizeEmail(email: string): string {
  let e = email.trim().toLowerCase();
  const [local, domain] = e.split('@');
  if (!local || !domain) return e;
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return local.replace(/\./g, '').split('+')[0] + '@' + domain;
  }
  return e;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return '+' + digits;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

// ── SHA-256 ──

async function sha256(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Google OAuth ──

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     Deno.env.get('GOOGLE_ADS_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_ADS_CLIENT_SECRET')!,
      refresh_token: Deno.env.get('GOOGLE_ADS_REFRESH_TOKEN')!,
      grant_type:    'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`OAuth failed: ${await res.text()}`);
  return (await res.json()).access_token;
}

// ── Format datetime for Google Ads API ──
// Google expects "yyyy-mm-dd HH:mm:ss+offset" in the account's timezone (Eastern).
// Uses Intl.DateTimeFormat to correctly detect EDT (-04:00) vs EST (-05:00).

function formatDateTime(iso: string): string {
  const d = new Date(iso);

  // Detect Eastern offset using Intl — correctly handles DST
  const tzNamePart = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  }).formatToParts(d).find(p => p.type === 'timeZoneName');
  const tzOffset = tzNamePart?.value === 'EDT' ? '-04:00' : '-05:00';

  // Format the timestamp in Eastern local time
  const eastern = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => eastern.find(p => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}${tzOffset}`;
}

// ── Main Handler ──

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { queue_id, order_id, email, phone, firstName, lastName,
            gclid, conversion_date_time, attempt } = body;

    if (!order_id || !email) {
      return json({ error: 'order_id and email required' }, 400);
    }

    const currentAttempt = attempt || 1;
    console.log(`[EC Enhancement] order_id=${order_id}, attempt=${currentAttempt}, queue_id=${queue_id || 'none'}`);

    // Build user identifiers
    const userIdentifiers: any[] = [];

    if (email) {
      userIdentifiers.push({
        hashedEmail: await sha256(normalizeEmail(email)),
        userIdentifierSource: 'FIRST_PARTY',
      });
    }
    if (phone) {
      userIdentifiers.push({
        hashedPhoneNumber: await sha256(normalizePhone(phone)),
        userIdentifierSource: 'FIRST_PARTY',
      });
    }
    if (firstName) {
      userIdentifiers.push({
        addressInfo: { hashedFirstName: await sha256(normalizeName(firstName)) },
        userIdentifierSource: 'FIRST_PARTY',
      });
    }
    if (lastName) {
      userIdentifiers.push({
        addressInfo: { hashedLastName: await sha256(normalizeName(lastName)) },
        userIdentifierSource: 'FIRST_PARTY',
      });
    }

    if (userIdentifiers.length === 0) {
      return json({ error: 'No user identifiers available' }, 400);
    }

    // Get access token
    const accessToken = await getAccessToken();

    const adjustmentDateTime = formatDateTime(new Date().toISOString());
    const payload = {
      conversionAdjustments: [{
        adjustmentType:  'ENHANCEMENT',
        conversionAction: CONVERSION_ACTION,
        orderId:         order_id,
        userIdentifiers,
        adjustmentDateTime,
      }],
      partialFailure: true,
    };

    console.log(`[EC Enhancement] Sending to Google Ads API:`, JSON.stringify({
      order_id,
      identifiers: userIdentifiers.length,
      adjustmentDateTime,
    }));

    // Call Google Ads API
    const apiUrl = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${CUSTOMER_ID}:uploadConversionAdjustments`;
    const apiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'Authorization':   `Bearer ${accessToken}`,
        'developer-token': Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN')!,
        'login-customer-id': MANAGER_ID,
      },
      body: JSON.stringify(payload),
    });

    const apiResult = await apiRes.json();
    console.log(`[EC Enhancement] Google API response:`, JSON.stringify(apiResult));

    const partialErrors = apiResult.partialFailureError?.details || [];
    let success = apiRes.ok && partialErrors.length === 0;
    let errorMessage = '';
    let conversionNotFound = false;

    if (partialErrors.length > 0) {
      const errorStr = JSON.stringify(partialErrors);

      if (errorStr.includes('CONVERSION_NOT_FOUND')) {
        conversionNotFound = true;
        errorMessage = 'CONVERSION_NOT_FOUND — Google has not yet processed this click';
      } else if (errorStr.includes('CONVERSION_ALREADY_ENHANCED')) {
        success = true; // Idempotent — already enhanced is a success
        console.log('[EC Enhancement] Already enhanced — treating as success');
      } else {
        errorMessage = errorStr.substring(0, 500);
      }
    }

    // Update queue row if this was called from the queue processor
    if (queue_id) {
      if (success) {
        await supabase
          .from('ec_enhancement_queue')
          .update({ status: 'done' })
          .eq('id', queue_id)
          .catch(e => console.error('Queue done update failed:', e));

      } else if (conversionNotFound && currentAttempt < MAX_ATTEMPTS) {
        // Reschedule with escalating delay
        const delayMinutes = RETRY_DELAYS_MINUTES[currentAttempt - 1] ?? 120;
        const processAfter = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
        console.log(`[EC Enhancement] Rescheduling in ${delayMinutes}min (attempt ${currentAttempt}/${MAX_ATTEMPTS})`);
        await supabase
          .from('ec_enhancement_queue')
          .update({ status: 'pending', process_after: processAfter, last_error: errorMessage })
          .eq('id', queue_id)
          .catch(e => console.error('Queue reschedule update failed:', e));

      } else {
        // Max attempts reached or non-retriable error
        const finalError = conversionNotFound
          ? `CONVERSION_NOT_FOUND after ${currentAttempt} attempts — giving up`
          : errorMessage;
        console.log(`[EC Enhancement] ${conversionNotFound ? 'Max retries' : 'Error'} — marking failed: ${finalError}`);
        await supabase
          .from('ec_enhancement_queue')
          .update({ status: 'failed', last_error: finalError })
          .eq('id', queue_id)
          .catch(e => console.error('Queue failed update failed:', e));
      }
    }

    // Log to Supabase
    await supabase.from('enhanced_conversion_logs').insert({
      conversion_type:     'IUL_Lead_EC_Web',
      email_provided:      email,
      phone_provided:      phone || null,
      success,
      google_api_status:   apiRes.status,
      google_api_response: apiResult,
      created_at:          new Date().toISOString(),
    }).catch(e => console.error('EC log insert failed:', e));

    console.log(`[EC Enhancement] ${success ? 'SUCCESS' : 'FAILED'}: order_id=${order_id}, attempt=${currentAttempt}`);

    return json({
      success,
      order_id,
      attempt: currentAttempt,
      error: errorMessage || undefined,
      google_status: apiRes.status,
    });

  } catch (e) {
    console.error('[EC Enhancement] Error:', e);
    return json({ error: String(e) }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
