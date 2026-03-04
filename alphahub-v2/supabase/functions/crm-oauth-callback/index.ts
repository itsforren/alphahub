import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  
  // Combine IV + encrypted data and base64 encode
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    
    if (!code) {
      console.error('No authorization code received');
      return new Response(
        JSON.stringify({ error: 'No authorization code received' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received OAuth callback with code');

    const clientId = Deno.env.get('GHL_CLIENT_ID')!;
    const clientSecret = Deno.env.get('GHL_CLIENT_SECRET')!;
    const redirectUri = Deno.env.get('GHL_REDIRECT_URI')!;
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY')!;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      
      // Log the error
      await supabase.from('ghl_api_logs').insert({
        request_type: 'oauth_token_exchange',
        status: 'error',
        error_message: errorText,
      });
      
      return new Response(
        JSON.stringify({ error: 'Token exchange failed', details: errorText }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');

    // Encrypt tokens
    const encryptedAccessToken = await encryptToken(tokenData.access_token, encryptionKey);
    const encryptedRefreshToken = await encryptToken(tokenData.refresh_token, encryptionKey);

    // Calculate expiry
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    // Check if we already have a token record
    const { data: existingToken } = await supabase
      .from('ghl_oauth_tokens')
      .select('id')
      .maybeSingle();

    if (existingToken) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('ghl_oauth_tokens')
        .update({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          expires_at: expiresAt.toISOString(),
          company_id: tokenData.companyId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingToken.id);

      if (updateError) {
        console.error('Failed to update tokens:', updateError);
        throw updateError;
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('ghl_oauth_tokens')
        .insert({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          expires_at: expiresAt.toISOString(),
          company_id: tokenData.companyId || null,
        });

      if (insertError) {
        console.error('Failed to store tokens:', insertError);
        throw insertError;
      }
    }

    // Log success
    await supabase.from('ghl_api_logs').insert({
      request_type: 'oauth_token_exchange',
      company_id: tokenData.companyId || null,
      status: 'success',
      response_data: { expires_in: tokenData.expires_in, token_type: tokenData.token_type },
    });

    console.log('Tokens stored successfully, redirecting to admin');

    // Redirect to admin page on the main domain
    const redirectUrl = 'https://alphaagent.io/hub/admin/ghl-bridge?success=true';
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in crm-oauth-callback:', message);
    
    await supabase.from('ghl_api_logs').insert({
      request_type: 'oauth_callback',
      status: 'error',
      error_message: message,
    });

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
