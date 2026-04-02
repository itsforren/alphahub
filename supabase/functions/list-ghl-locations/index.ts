import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAgencyAccessToken } from '../_shared/ghl-oauth.ts';

serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const companyId = '30bFOq4ZtlhKuMOvVPwA';

  const agencyToken = await getAgencyAccessToken(supabase, 'list-ghl-locations');

  const locations: any[] = [];
  let skip = 0;
  const limit = 100;

  while (true) {
    const res = await fetch(
      `https://services.leadconnectorhq.com/locations/search?companyId=${companyId}&limit=${limit}&skip=${skip}`,
      { headers: { 'Authorization': `Bearer ${agencyToken}`, 'Version': '2021-07-28' } }
    );
    const data = await res.json();
    if (!res.ok) return new Response(JSON.stringify({ error: data }), { status: res.status });

    const batch = data.locations || [];
    locations.push(...batch.map((l: any) => ({ id: l.id, name: l.name, email: l.email })));
    if (batch.length < limit) break;
    skip += limit;
  }

  return new Response(JSON.stringify({ count: locations.length, locations, agencyToken }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
