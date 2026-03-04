import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Required scopes for full CRM integration
// Note: sms.* and phone.* scopes require special app approval in GHL Marketplace
const REQUIRED_SCOPES = [
  // Locations
  'locations.readonly',
  'locations.write',
  'locations/customFields.readonly',
  'locations/customFields.write',
  'locations/customValues.readonly',
  'locations/customValues.write',
  // Contacts & CRM
  'contacts.readonly',
  'contacts.write',
  // Calendar
  'calendars.readonly',
  'calendars.write',
  'calendars/events.readonly',
  'calendars/events.write',
  // Users
  'users.readonly',
  'users.write',
  // Workflows
  'workflows.readonly',
  // Opportunities/Pipeline
  'opportunities.readonly',
  'opportunities.write',
  // Conversations
  'conversations.readonly',
  'conversations.write',
  'conversations/message.readonly',
  'conversations/message.write',
  // OAuth
  'oauth.readonly',
  'oauth.write',
  // SaaS (for V2 enablement)
  'saas/company.read',
  'saas/company.write',
  'saas/location.read',
  'saas/location.write',
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('GHL_CLIENT_ID');
    const redirectUri = Deno.env.get('GHL_REDIRECT_URI');
    const installUrl = Deno.env.get('GHL_INSTALL_URL');
    
    // Check if we should use dynamic URL generation (preferred for scope control)
    // Parse query params to check for force_dynamic
    const url = new URL(req.url);
    const forceDynamic = url.searchParams.get('force_dynamic') === 'true';
    
    // PRIORITY: Use dynamic OAuth if we have credentials, to ensure all scopes are included
    // The static GHL_INSTALL_URL may have outdated/limited scopes
    if (clientId && redirectUri) {
      // Build OAuth authorization URL with all required scopes
      const scopeString = REQUIRED_SCOPES.join(' ');
      const state = crypto.randomUUID(); // CSRF protection
      
      const oauthUrl = new URL('https://marketplace.leadconnectorhq.com/oauth/chooselocation');
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('client_id', clientId);
      oauthUrl.searchParams.set('redirect_uri', redirectUri);
      oauthUrl.searchParams.set('scope', scopeString);
      oauthUrl.searchParams.set('state', state);

      console.log(`Building dynamic OAuth URL with ${REQUIRED_SCOPES.length} scopes including: sms.readonly, sms.write, phone.readonly, locations.readonly`);
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': oauthUrl.toString(),
        },
      });
    }
    
    // Fallback: Use pre-configured install URL if no credentials for dynamic OAuth
    if (installUrl) {
      console.log('Using pre-configured GHL_INSTALL_URL (may have limited scopes - consider setting GHL_CLIENT_ID and GHL_REDIRECT_URI for full scope control)');
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': installUrl,
        },
      });
    }
    
    console.error('No GHL OAuth configuration found');
    return new Response(
      JSON.stringify({ 
        error: 'GHL OAuth not configured. Please set either GHL_CLIENT_ID + GHL_REDIRECT_URI (recommended), or GHL_INSTALL_URL.',
        requiredScopes: REQUIRED_SCOPES,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in crm-oauth-start:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
