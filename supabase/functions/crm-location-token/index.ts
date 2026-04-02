import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAgencyAccessToken } from '../_shared/ghl-oauth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Temporary bridge: proxy to old project when local decryption fails
// This will be removed once GHL OAuth is re-authenticated on the new project
const OLD_PROJECT_URL = "https://qydkrpirrfelgtcqasdx.supabase.co";

async function proxyToOldProject(companyId: string, locationId: string): Promise<Response> {
  console.log('Proxying location token request to old project (bridge mode)');
  const response = await fetch(`${OLD_PROJECT_URL}/functions/v1/crm-location-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, locationId }),
  });

  const data = await response.text();
  return new Response(data, {
    status: response.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    // Try local token handling first
    try {
      const agencyAccessToken = await getAgencyAccessToken(supabase, 'crm-location-token');

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

        // Fall back to old project on GHL API error too
        console.log('GHL API error, falling back to old project proxy');
        return await proxyToOldProject(companyId, locationId);
      }

      const locationTokenData = await locationTokenResponse.json();

      await supabase.from('ghl_api_logs').insert({
        request_type: 'location_token',
        company_id: companyId,
        location_id: locationId,
        status: 'success',
        response_data: { expires_in: locationTokenData.expires_in, source: 'local' },
      });

      console.log('Location token obtained successfully (local)');

      return new Response(
        JSON.stringify({
          locationAccessToken: locationTokenData.access_token,
          expiresIn: locationTokenData.expires_in,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (localError: unknown) {
      // Local decryption/refresh failed — proxy to old project as fallback
      const msg = localError instanceof Error ? localError.message : 'Unknown';
      console.log(`Local token handling failed (${msg}), proxying to old project`);

      await supabase.from('ghl_api_logs').insert({
        request_type: 'location_token',
        company_id: companyId,
        location_id: locationId,
        status: 'fallback',
        error_message: `Local failed: ${msg}, using old project proxy`,
      });

      return await proxyToOldProject(companyId, locationId);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in crm-location-token:', message);

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
