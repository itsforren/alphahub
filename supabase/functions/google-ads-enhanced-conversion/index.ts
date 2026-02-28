import { createClient } from "npm:@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Centralized API version — update here when Google sunsets old versions ──
const GOOGLE_ADS_API_VERSION = 'v22';

// ── Normalization helpers ──

function normalizeEmail(email: string): string {
  let e = email.trim().toLowerCase();
  const [local, domain] = e.split('@');
  if (!local || !domain) return e;
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return local.replace(/\./g, '') + '@' + domain;
  }
  return e;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  if (digits.startsWith('+')) return phone.replace(/[^\d+]/g, '');
  return '+' + digits;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

// ── SHA-256 hex hash ──

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Google OAuth token ──

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
    console.error('[Enhanced Conversion] OAuth token error:', error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// ── Conversion config ──

const CONVERSION_CONFIG: Record<string, { actionId: string; value: number; source: string }> = {
  Agent_Lead_API: {
    actionId: 'customers/6551751244/conversionActions/7491323480',
    value: 50,
    source: 'loveable_client',
  },
  Agent_CallBooked_API: {
    actionId: 'customers/6551751244/conversionActions/7491510414',
    value: 150,
    source: 'ghl_webhook',
  },
  Agent_Sale_API: {
    actionId: 'customers/6551751244/conversionActions/7491631599',
    value: 1497,
    source: 'onboarding_automation',
  },
};

const CUSTOMER_ID = '6551751244';

// ── Failure alert helpers (fire-and-forget) ──

function maskEmailForAlert(email: string): string {
  if (!email) return '(none)';
  const [local, domain] = email.split('@');
  if (!local || !domain) return email.substring(0, 3) + '***';
  return local.substring(0, 3) + '***@' + domain;
}

async function sendSlackAlert(conversionType: string, email: string, apiStatus: number | null, errorSummary: string) {
  try {
    const webhookUrl = Deno.env.get('SLACK_ADS_MANAGER_WEBHOOK_URL');
    if (!webhookUrl) return;

    const payload = {
      text: `🚨 *Enhanced Conversion Failed*\n• Type: \`${conversionType}\`\n• Email: ${maskEmailForAlert(email)}\n• API Status: ${apiStatus ?? 'N/A'}\n• Error: ${errorSummary.substring(0, 300)}`,
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('[Enhanced Conversion] Slack alert failed:', e);
  }
}

async function sendSmsAlert(conversionType: string, errorSummary: string) {
  try {
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
    // Admin phone for conversion failure alerts
    const toNumber = '+17864237328';

    if (!accountSid || !authToken || !fromNumber) return;

    const body = `⚠️ Enhanced Conversion FAILED\nType: ${conversionType}\nError: ${errorSummary.substring(0, 120)}`;

    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      },
      body: new URLSearchParams({ To: toNumber, From: fromNumber, Body: body }),
    });
  } catch (e) {
    console.error('[Enhanced Conversion] SMS alert failed:', e);
  }
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Service-role client for logging
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let conversionType = '';
  let emailRaw = '';
  let phoneRaw = '';
  let firstNameRaw = '';
  let lastNameRaw = '';

  try {
    // ── Validate API key ──
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('CONVERSION_API_KEY');
    if (!apiKey || apiKey !== expectedKey) {
      console.warn('[Enhanced Conversion] Invalid or missing API key');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Parse body ──
    const body = await req.json();
    conversionType = body.conversionType;
    emailRaw = body.email || '';
    phoneRaw = body.phone || '';
    firstNameRaw = body.firstName || '';
    lastNameRaw = body.lastName || '';
    const gclidRaw: string = (body.gclid && body.gclid !== 'null') ? body.gclid : '';
    const originalDateTime: string = body.originalDateTime || ''; // ISO string of the real event time

    console.log(`[Enhanced Conversion] Processing ${conversionType}`, {
      email: emailRaw ? emailRaw.substring(0, 3) + '***' : 'none',
      phone: phoneRaw ? '***' + phoneRaw.slice(-4) : 'none',
      originalDateTime: originalDateTime || 'now',
    });

    const config = CONVERSION_CONFIG[conversionType];
    if (!config) {
      throw new Error(`Unknown conversionType: ${conversionType}`);
    }

    // ── GCLID fallback: resolve from prospect_attribution if not provided ──
    let resolvedGclid = gclidRaw;
    if (!resolvedGclid && emailRaw) {
      try {
        const normalizedLookupEmail = emailRaw.trim().toLowerCase();
        // Find prospect by email, then get their attribution GCLID
        const { data: prospect } = await supabase
          .from('prospects')
          .select('id')
          .eq('email', normalizedLookupEmail)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (prospect) {
          const { data: attr } = await supabase
            .from('prospect_attribution')
            .select('first_touch_gclid')
            .eq('prospect_id', prospect.id)
            .maybeSingle();

          if (attr?.first_touch_gclid) {
            resolvedGclid = attr.first_touch_gclid;
            console.log(`[Enhanced Conversion] Resolved GCLID from prospect_attribution: ${resolvedGclid.substring(0, 20)}...`);
          }
        }

        // Also try matching via client → prospect_id chain
        if (!resolvedGclid) {
          const { data: client } = await supabase
            .from('clients')
            .select('prospect_id')
            .eq('email', normalizedLookupEmail)
            .not('prospect_id', 'is', null)
            .maybeSingle();

          if (client?.prospect_id) {
            const { data: attr } = await supabase
              .from('prospect_attribution')
              .select('first_touch_gclid')
              .eq('prospect_id', client.prospect_id)
              .maybeSingle();

            if (attr?.first_touch_gclid) {
              resolvedGclid = attr.first_touch_gclid;
              console.log(`[Enhanced Conversion] Resolved GCLID via client→prospect chain: ${resolvedGclid.substring(0, 20)}...`);
            }
          }
        }
      } catch (lookupErr) {
        console.warn('[Enhanced Conversion] GCLID lookup failed (non-blocking):', lookupErr);
      }
    }

    // ── Normalize & hash ──
    const normalizedEmail = normalizeEmail(emailRaw);
    const normalizedPhone = normalizePhone(phoneRaw);
    const normalizedFirstName = normalizeName(firstNameRaw);
    const normalizedLastName = normalizeName(lastNameRaw);

    const [hashedEmail, hashedPhone, hashedFirstName, hashedLastName] = await Promise.all([
      sha256Hex(normalizedEmail),
      sha256Hex(normalizedPhone),
      sha256Hex(normalizedFirstName),
      sha256Hex(normalizedLastName),
    ]);

    // ── Build Google Ads payload ──
    // Use the original event time if provided (for retries), otherwise use now
    const eventDate = originalDateTime ? new Date(originalDateTime) : new Date();
    const conversionDateTime = eventDate.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '+00:00');

    const conversionEntry: Record<string, unknown> = {
      conversionAction: config.actionId,
      conversionDateTime,
      conversionValue: config.value,
      currencyCode: 'USD',
      userIdentifiers: [
        { hashedEmail },
        { hashedPhoneNumber: hashedPhone },
        {
          addressInfo: {
            hashedFirstName,
            hashedLastName,
          },
        },
      ],
    };
    if (resolvedGclid) {
      conversionEntry.gclid = resolvedGclid;
    }

    const payload = {
      conversions: [conversionEntry],
      partialFailure: true,
    };

    // ── Get OAuth token & send ──
    const accessToken = await getAccessToken();
    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    const mccIdRaw = Deno.env.get('GOOGLE_ADS_MCC_CUSTOMER_ID') || '';
    const mccId = mccIdRaw.replace(/\D/g, '');

    const googleHeaders: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'developer-token': developerToken!,
    };
    if (mccId) {
      googleHeaders['login-customer-id'] = mccId;
      console.log(`[Enhanced Conversion] Using MCC ID: ${mccId}`);
    }

    console.log(`[Enhanced Conversion] Sending to Google Ads API ${GOOGLE_ADS_API_VERSION}...`);

    const googleResponse = await fetch(
      `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${CUSTOMER_ID}:uploadClickConversions`,
      {
        method: 'POST',
        headers: googleHeaders,
        body: JSON.stringify(payload),
      },
    );

    const googleStatus = googleResponse.status;
    const googleBody = await googleResponse.json();

    console.log(`[Enhanced Conversion] Google API status: ${googleStatus}`);
    console.log(`[Enhanced Conversion] Google API response:`, JSON.stringify(googleBody));

    const success = googleStatus >= 200 && googleStatus < 300;

    // ── Log to database ──
    await supabase.from('enhanced_conversion_logs').insert({
      conversion_type: conversionType,
      email_provided: emailRaw,
      phone_provided: phoneRaw,
      first_name_provided: firstNameRaw,
      last_name_provided: lastNameRaw,
      gclid: resolvedGclid || null,
      source: config.source,
      google_api_status: googleStatus,
      google_api_response: googleBody,
      success,
      error_message: success ? null : JSON.stringify(googleBody),
    });

    // ── Send failure alerts (awaited so Deno doesn't shutdown before they complete) ──
    if (!success) {
      const errorSummary = JSON.stringify(googleBody).substring(0, 300);
      await Promise.allSettled([
        sendSlackAlert(conversionType, emailRaw, googleStatus, errorSummary),
        sendSmsAlert(conversionType, errorSummary),
      ]);
    }

    return new Response(JSON.stringify({ success, googleStatus }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Enhanced Conversion] Error:', error);

    const errorMessage = (error as Error).message || String(error);

    // Log the failure
    try {
      await supabase.from('enhanced_conversion_logs').insert({
        conversion_type: conversionType || 'unknown',
        email_provided: emailRaw,
        phone_provided: phoneRaw,
        first_name_provided: firstNameRaw,
        last_name_provided: lastNameRaw,
        source: CONVERSION_CONFIG[conversionType]?.source || 'unknown',
        google_api_status: null,
        google_api_response: null,
        success: false,
        error_message: errorMessage,
      });
    } catch (logErr) {
      console.error('[Enhanced Conversion] Failed to log error:', logErr);
    }

    // Send failure alerts for exceptions too (awaited)
    await Promise.allSettled([
      sendSlackAlert(conversionType || 'unknown', emailRaw, null, errorMessage),
      sendSmsAlert(conversionType || 'unknown', errorMessage),
    ]);

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
