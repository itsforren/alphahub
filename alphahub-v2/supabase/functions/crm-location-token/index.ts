import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AES-GCM decryption
async function decryptToken(encryptedData: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  
  // Decode base64
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  // Extract IV (first 12 bytes) and encrypted data
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

// Refresh agency token if expired
async function refreshAgencyToken(supabase: any, tokenRecord: any, encryptionKey: string): Promise<string> {
  const clientId = Deno.env.get('GHL_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GHL_CLIENT_SECRET')!;
  
  const decryptedRefreshToken = await decryptToken(tokenRecord.refresh_token, encryptionKey);
  
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
    throw new Error(`Failed to refresh agency token: ${await refreshResponse.text()}`);
  }

  const tokenData = await refreshResponse.json();
  
  // Encrypt and store new tokens
  const encryptedAccessToken = await encryptToken(tokenData.access_token, encryptionKey);
  const encryptedRefreshToken = await encryptToken(tokenData.refresh_token, encryptionKey);
  const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

  await supabase
    .from('ghl_oauth_tokens')
    .update({
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', tokenRecord.id);

  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { companyId, locationId } = await req.json();
    
    if (!companyId || !locationId) {
      return new Response(
        JSON.stringify({ error: 'companyId and locationId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Getting location token for company: ${companyId}, location: ${locationId}`);

    // Get stored agency token
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('ghl_oauth_tokens')
      .select('*')
      .maybeSingle();

    if (tokenError || !tokenRecord) {
      console.error('No OAuth tokens found');
      return new Response(
        JSON.stringify({ error: 'OAuth not configured. Please complete OAuth flow first.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const expiresAt = new Date(tokenRecord.expires_at);
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    
    let agencyAccessToken: string;
    
    if (expiresAt <= fiveMinutesFromNow) {
      console.log('Agency token expired or expiring soon, refreshing...');
      agencyAccessToken = await refreshAgencyToken(supabase, tokenRecord, encryptionKey);
    } else {
      agencyAccessToken = await decryptToken(tokenRecord.access_token, encryptionKey);
    }

    // Exchange agency token for location token
    const locationTokenResponse = await fetch('https://services.leadconnectorhq.com/oauth/locationToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Bearer ${agencyAccessToken}`,
        'Version': '2021-07-28',
      },
      body: new URLSearchParams({
        companyId: companyId,
        locationId: locationId,
      }),
    });

    if (!locationTokenResponse.ok) {
      const errorText = await locationTokenResponse.text();
      console.error('Location token exchange failed:', errorText);
      
      await supabase.from('ghl_api_logs').insert({
        request_type: 'location_token',
        company_id: companyId,
        location_id: locationId,
        status: 'error',
        error_message: errorText,
      });
      
      return new Response(
        JSON.stringify({ error: 'Failed to get location token', details: errorText }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const locationTokenData = await locationTokenResponse.json();
    
    await supabase.from('ghl_api_logs').insert({
      request_type: 'location_token',
      company_id: companyId,
      location_id: locationId,
      status: 'success',
      response_data: { expires_in: locationTokenData.expires_in },
    });

    console.log('Location token obtained successfully');

    return new Response(
      JSON.stringify({
        locationAccessToken: locationTokenData.access_token,
        expiresIn: locationTokenData.expires_in,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in crm-location-token:', message);
    
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
