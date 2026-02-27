import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to sanitize secret values (trim whitespace and remove surrounding quotes)
function sanitizeSecret(value: string | undefined): string {
  if (!value) return '';
  let cleaned = value.trim();
  // Remove surrounding quotes if present
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.trim();
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Sanitize all Plaid credentials
    const PLAID_CLIENT_ID = sanitizeSecret(Deno.env.get('PLAID_CLIENT_ID'));
    const PLAID_SECRET = sanitizeSecret(Deno.env.get('PLAID_SECRET'));
    const PLAID_ENV = (sanitizeSecret(Deno.env.get('PLAID_ENV')) || 'sandbox').toLowerCase();

    // Check if Plaid is configured
    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      console.log('Plaid not configured yet')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'plaid_not_configured',
          message: 'Plaid integration is not configured yet. Please add PLAID_CLIENT_ID and PLAID_SECRET to your secrets.',
          env: PLAID_ENV
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify the user is authenticated and is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'admin' 
    })
    
    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine Plaid API base URL
    const plaidBaseUrl = PLAID_ENV === 'production' 
      ? 'https://production.plaid.com'
      : PLAID_ENV === 'development'
        ? 'https://development.plaid.com'
        : 'https://sandbox.plaid.com'

    // Build link token request body
    const linkTokenBody: Record<string, unknown> = {
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      client_name: 'Alpha Leads Business Expenses',
      user: {
        client_user_id: user.id,
      },
      products: ['transactions'],
      transactions: {
        days_requested: 730, // Request 2 years of historical data (back to Jan 2024)
      },
      country_codes: ['US'],
      language: 'en',
    }

    // Create link token
    const linkTokenResponse = await fetch(`${plaidBaseUrl}/link/token/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(linkTokenBody),
    })

    const linkTokenData = await linkTokenResponse.json()

    if (!linkTokenResponse.ok) {
      console.error('Plaid link token error:', linkTokenData)
      // Return 200 with structured error so frontend can display details
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'plaid_api_error',
          message: linkTokenData.error_message || 'Failed to create link token',
          plaid_error: {
            error_code: linkTokenData.error_code,
            error_message: linkTokenData.error_message,
            error_type: linkTokenData.error_type,
            request_id: linkTokenData.request_id,
          },
          env: PLAID_ENV,
          // Include sanitized info for debugging (not the actual secret)
          client_id_length: PLAID_CLIENT_ID.length,
          secret_length: PLAID_SECRET.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Link token created successfully')
    return new Response(
      JSON.stringify({ success: true, link_token: linkTokenData.link_token, env: PLAID_ENV }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error in plaid-create-link-token:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: 'server_error', message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
