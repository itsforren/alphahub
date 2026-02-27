// Refresh Stable Headshot (Stable URL)
// - Downloads the current source image (client.profile_image_url or provided sourceUrl)
// - Uploads it to a deterministic public storage path: media/agent-headshots/{clientId}.{ext}
// - Updates clients.profile_image_url to the stable public URL
// - Updates clients.headshot_updated_at for cache busting

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_BYTES = 8 * 1024 * 1024; // 8MB hard cap

function guessExtFromContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  const ct = contentType.toLowerCase();
  if (ct.includes('image/jpeg') || ct.includes('image/jpg')) return 'jpg';
  if (ct.includes('image/png')) return 'png';
  if (ct.includes('image/webp')) return 'webp';
  if (ct.includes('image/gif')) return 'gif';
  if (ct.includes('image/svg+xml')) return 'svg';
  return null;
}

function sniffExtFromBytes(bytes: Uint8Array): string | null {
  // JPEG
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  // PNG
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return 'png';
  // WEBP (RIFF....WEBP)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return 'webp';
  // GIF
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  )
    return 'gif';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Missing backend configuration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const bridgeKey = req.headers.get('x-bridge-key');
  const expectedBridgeKey = Deno.env.get('ONBOARDING_BRIDGE_KEY');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // Check if using service role key (for service-to-service calls)
  const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;
  // Check if using bridge key (for external agent calls)
  const isValidBridgeKey = bridgeKey && expectedBridgeKey && bridgeKey === expectedBridgeKey;

  // Create appropriate client
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: isServiceRole ? `Bearer ${supabaseServiceKey}` : authHeader,
      },
    },
  });

  // Allow service role or bridge key to bypass user auth
  if (!isServiceRole && !isValidBridgeKey) {
    // Require an authenticated user for normal requests
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const clientId = String(body?.clientId ?? '').trim();
  const sourceUrlOverride = typeof body?.sourceUrl === 'string' ? body.sourceUrl.trim() : null;
  if (!clientId) {
    return new Response(JSON.stringify({ error: 'clientId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const startedAt = Date.now();

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, profile_image_url')
    .eq('id', clientId)
    .maybeSingle();

  if (clientError) {
    console.error('refresh-stable-headshot: client load error', clientError);
    return new Response(JSON.stringify({ error: 'Failed to load client' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!client) {
    return new Response(JSON.stringify({ error: 'Client not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const sourceUrl = sourceUrlOverride || client.profile_image_url;
  if (!sourceUrl) {
    return new Response(JSON.stringify({ error: 'No sourceUrl available (client has no profile_image_url)' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Download the image
  let resp: Response;
  try {
    resp = await fetch(sourceUrl, {
      redirect: 'follow',
      headers: {
        // Some sources block requests without a UA
        'User-Agent': 'LovableCloudHeadshotRefresher/1.0',
      },
    });
  } catch (e) {
    console.error('refresh-stable-headshot: fetch failed', { sourceUrl, e });
    return new Response(JSON.stringify({ error: 'Failed to fetch source image' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const status = resp.status;
  const contentType = resp.headers.get('content-type');
  const contentLength = resp.headers.get('content-length');

  if (!resp.ok) {
    const sample = await resp.text().catch(() => '');
    console.error('refresh-stable-headshot: source returned non-OK', {
      sourceUrl,
      status,
      contentType,
      sample: sample.slice(0, 500),
    });
    return new Response(JSON.stringify({ error: 'Source image returned non-OK', status }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Enforce max size if header available
  if (contentLength) {
    const n = Number(contentLength);
    if (!Number.isNaN(n) && n > MAX_BYTES) {
      return new Response(JSON.stringify({ error: 'Image too large', maxBytes: MAX_BYTES, contentLength: n }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const arrayBuffer = await resp.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    return new Response(JSON.stringify({ error: 'Image too large', maxBytes: MAX_BYTES, size: arrayBuffer.byteLength }), {
      status: 413,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const bytes = new Uint8Array(arrayBuffer);

  const ext = guessExtFromContentType(contentType) || sniffExtFromBytes(bytes) || 'jpg';
  const uploadContentType = contentType || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg');
  const objectPath = `agent-headshots/${clientId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(objectPath, bytes, { upsert: true, contentType: uploadContentType });

  if (uploadError) {
    console.error('refresh-stable-headshot: uploadError', uploadError);
    return new Response(JSON.stringify({ error: 'Failed to upload stable headshot' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: publicData } = supabase.storage.from('media').getPublicUrl(objectPath);
  const stableUrl = publicData.publicUrl;
  const headshotUpdatedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('clients')
    .update({
      profile_image_url: stableUrl,
      headshot_updated_at: headshotUpdatedAt,
    })
    .eq('id', clientId);

  if (updateError) {
    console.error('refresh-stable-headshot: updateError', updateError);
    return new Response(JSON.stringify({ error: 'Failed to update client record' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const ms = Date.now() - startedAt;
  return new Response(
    JSON.stringify({
      success: true,
      clientId,
      stableUrl,
      ext,
      diagnostics: {
        sourceUrl,
        status,
        contentType,
        contentLength,
        bytes: arrayBuffer.byteLength,
        ms,
      },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
