const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      management_publishable_key: Deno.env.get('VITE_STRIPE_MANAGEMENT_PUBLISHABLE_KEY') || '',
      ad_spend_publishable_key: Deno.env.get('VITE_STRIPE_AD_SPEND_PUBLISHABLE_KEY') || '',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
