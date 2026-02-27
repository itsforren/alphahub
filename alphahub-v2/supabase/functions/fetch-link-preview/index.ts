import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

// Extract meta tag content from HTML
function extractMetaContent(html: string, property: string): string | undefined {
  // Try og: prefix first
  const ogMatch = html.match(new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${property}["']`, 'i'));
  if (ogMatch) return ogMatch[1];

  // Try twitter: prefix
  const twitterMatch = html.match(new RegExp(`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:${property}["']`, 'i'));
  if (twitterMatch) return twitterMatch[1];

  // Try standard meta name
  const nameMatch = html.match(new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${property}["']`, 'i'));
  if (nameMatch) return nameMatch[1];

  return undefined;
}

// Extract title from HTML
function extractTitle(html: string): string | undefined {
  const ogTitle = extractMetaContent(html, 'title');
  if (ogTitle) return ogTitle;

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : undefined;
}

// Extract favicon
function extractFavicon(html: string, baseUrl: string): string | undefined {
  const iconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
    || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
  
  if (iconMatch) {
    const iconHref = iconMatch[1];
    if (iconHref.startsWith('http')) return iconHref;
    if (iconHref.startsWith('//')) return `https:${iconHref}`;
    if (iconHref.startsWith('/')) return `${new URL(baseUrl).origin}${iconHref}`;
    return `${new URL(baseUrl).origin}/${iconHref}`;
  }

  // Default to /favicon.ico
  return `${new URL(baseUrl).origin}/favicon.ico`;
}

// Make relative URLs absolute
function makeAbsoluteUrl(url: string | undefined, baseUrl: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${new URL(baseUrl).origin}${url}`;
  return `${new URL(baseUrl).origin}/${url}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, messageId } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching link preview for: ${url}`);

    // Fetch the page with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinkPreviewBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Return empty preview instead of error for non-OK responses
      return new Response(
        JSON.stringify({ url, title: null, description: null, image: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = await response.text();

    // Extract Open Graph and meta data
    const preview: LinkPreviewData = {
      url,
      title: extractTitle(html),
      description: extractMetaContent(html, 'description'),
      image: makeAbsoluteUrl(extractMetaContent(html, 'image'), url),
      siteName: extractMetaContent(html, 'site_name'),
      favicon: extractFavicon(html, url),
    };

    console.log(`Preview extracted:`, { title: preview.title, image: preview.image });

    // Cache the preview in the database if messageId is provided
    if (messageId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from("chat_messages")
        .update({ link_preview: preview })
        .eq("id", messageId);
    }

    return new Response(
      JSON.stringify(preview),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error fetching link preview:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
