import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Universal tracking script that can be embedded on any external page
const trackingScript = `
(function() {
  'use strict';
  
  var SUPABASE_URL = '${Deno.env.get('SUPABASE_URL') || ''}';
  var TRACK_ENDPOINT = SUPABASE_URL + '/functions/v1/track-event';
  var STORAGE_KEY_VISITOR = 'alpha_visitor_id';
  var STORAGE_KEY_SESSION = 'alpha_session_id';
  var STORAGE_KEY_FIRST = 'alpha_first_touch';
  var STORAGE_KEY_LAST = 'alpha_last_touch';
  var SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  // Generate unique IDs
  function generateId(prefix) {
    return prefix + '_' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }
  
  // Get or create visitor ID
  function getVisitorId() {
    var id = localStorage.getItem(STORAGE_KEY_VISITOR);
    if (!id) {
      id = generateId('v');
      localStorage.setItem(STORAGE_KEY_VISITOR, id);
    }
    return id;
  }
  
  // Get or create session ID (expires after 30 min inactivity)
  function getSessionId() {
    var sessionData = sessionStorage.getItem(STORAGE_KEY_SESSION);
    var now = Date.now();
    
    if (sessionData) {
      try {
        var parsed = JSON.parse(sessionData);
        if (now - parsed.lastActivity < SESSION_TIMEOUT) {
          parsed.lastActivity = now;
          sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(parsed));
          return parsed.id;
        }
      } catch(e) {}
    }
    
    // Create new session
    var newId = generateId('s');
    sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({
      id: newId,
      lastActivity: now,
      isNew: true
    }));
    return newId;
  }
  
  // Parse UTM parameters from URL
  function getUTMParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term'),
      gclid: params.get('gclid'),
      fbclid: params.get('fbclid'),
      ref: params.get('ref')
    };
  }
  
  // Smart source detection from referrer when UTMs are missing
  function detectTrafficSource() {
    var utmParams = getUTMParams();
    var referrer = (document.referrer || '').toLowerCase();
    
    // Priority 1: Explicit UTM parameters
    if (utmParams.utm_source) {
      return { source: utmParams.utm_source, medium: utmParams.utm_medium || 'unknown' };
    }
    
    // Priority 2: Google/Facebook click IDs
    if (utmParams.gclid) return { source: 'google', medium: 'cpc' };
    if (utmParams.fbclid) return { source: 'facebook', medium: 'paid' };
    
    // Priority 3: Parse referrer for known sources
    if (referrer) {
      // Search engines
      if (referrer.indexOf('google.') !== -1) return { source: 'google', medium: 'organic' };
      if (referrer.indexOf('bing.') !== -1) return { source: 'bing', medium: 'organic' };
      if (referrer.indexOf('yahoo.') !== -1) return { source: 'yahoo', medium: 'organic' };
      if (referrer.indexOf('duckduckgo.') !== -1) return { source: 'duckduckgo', medium: 'organic' };
      
      // Social platforms
      if (referrer.indexOf('facebook.') !== -1 || referrer.indexOf('fb.com') !== -1 || referrer.indexOf('fb.me') !== -1) {
        return { source: 'facebook', medium: 'social' };
      }
      if (referrer.indexOf('instagram.') !== -1 || referrer.indexOf('l.instagram.') !== -1) {
        return { source: 'instagram', medium: 'social' };
      }
      if (referrer.indexOf('youtube.') !== -1 || referrer.indexOf('youtu.be') !== -1) {
        return { source: 'youtube', medium: 'video' };
      }
      if (referrer.indexOf('linkedin.') !== -1) return { source: 'linkedin', medium: 'social' };
      if (referrer.indexOf('twitter.') !== -1 || referrer.indexOf('t.co') !== -1 || referrer.indexOf('x.com') !== -1) {
        return { source: 'twitter', medium: 'social' };
      }
      if (referrer.indexOf('tiktok.') !== -1) return { source: 'tiktok', medium: 'social' };
      
      // Link shorteners
      if (referrer.indexOf('url.alphaagent.io') !== -1) return { source: 'shortlink', medium: 'link' };
      if (referrer.indexOf('bit.ly') !== -1 || referrer.indexOf('bitly.') !== -1) return { source: 'shortlink', medium: 'link' };
      
      // Email platforms
      if (referrer.indexOf('mail.google.') !== -1 || referrer.indexOf('outlook.') !== -1 || referrer.indexOf('mail.yahoo.') !== -1) {
        return { source: 'email', medium: 'email' };
      }
      
      // Generic referral
      try {
        var refDomain = (new URL(document.referrer)).hostname.replace('www.', '');
        return { source: refDomain, medium: 'referral' };
      } catch(e) {
        return { source: 'referral', medium: 'referral' };
      }
    }
    
    return { source: 'direct', medium: 'none' };
  }
  
  // Get attribution data with smart source detection
  function getAttribution() {
    var utmParams = getUTMParams();
    var detectedSource = detectTrafficSource();
    var hasAttribution = Object.values(utmParams).some(function(v) { return v; });
    
    // Build attribution with smart fallbacks
    var attribution = {
      source: utmParams.utm_source || detectedSource.source,
      medium: utmParams.utm_medium || detectedSource.medium,
      campaign: utmParams.utm_campaign || null,
      content: utmParams.utm_content || null,
      term: utmParams.utm_term || null,
      gclid: utmParams.gclid || null,
      fbclid: utmParams.fbclid || null,
      referrer: document.referrer || null,
      landing_page: window.location.pathname,
      full_url: window.location.href,
      timestamp: new Date().toISOString()
    };
    
    // Store first touch
    if (!localStorage.getItem(STORAGE_KEY_FIRST)) {
      localStorage.setItem(STORAGE_KEY_FIRST, JSON.stringify(attribution));
    }
    
    // Always update last touch
    localStorage.setItem(STORAGE_KEY_LAST, JSON.stringify(attribution));
    
    return {
      first_touch: JSON.parse(localStorage.getItem(STORAGE_KEY_FIRST) || 'null'),
      last_touch: JSON.parse(localStorage.getItem(STORAGE_KEY_LAST) || 'null'),
      current: utmParams,
      detected: detectedSource
    };
  }
  
  // Send tracking event
  function track(eventType, eventData) {
    var visitorId = getVisitorId();
    var sessionId = getSessionId();
    var attribution = getAttribution();
    
    var payload = {
      visitor_id: visitorId,
      session_id: sessionId,
      event_type: eventType,
      page_url: window.location.href,
      page_path: window.location.pathname,
      page_title: document.title,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      timestamp: new Date().toISOString(),
      attribution: attribution,
      event_data: eventData || {}
    };
    
    // Use sendBeacon for reliability, fallback to fetch
    var data = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(TRACK_ENDPOINT, data);
    } else {
      fetch(TRACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true
      }).catch(function() {});
    }
  }
  
  // Check if this is a new session
  function isNewSession() {
    var sessionData = sessionStorage.getItem(STORAGE_KEY_SESSION);
    if (sessionData) {
      try {
        var parsed = JSON.parse(sessionData);
        if (parsed.isNew) {
          parsed.isNew = false;
          sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(parsed));
          return true;
        }
      } catch(e) {}
    }
    return false;
  }
  
  // Auto-track on page load
  function init() {
    // Track session start if new session
    if (isNewSession()) {
      track('session_start');
    }
    
    // Track page view
    track('page_view');
    
    // Track clicks on buttons and links with data-track attribute
    document.addEventListener('click', function(e) {
      var target = e.target.closest('[data-track]');
      if (target) {
        track('click', {
          element: target.tagName,
          track_id: target.getAttribute('data-track'),
          text: target.textContent.substring(0, 100)
        });
      }
    });
    
    // Track form submissions
    document.addEventListener('submit', function(e) {
      var form = e.target;
      if (form.tagName === 'FORM') {
        track('form_submit', {
          form_id: form.id || form.getAttribute('name') || 'unknown',
          form_action: form.action
        });
      }
    });
  }
  
  // Expose global tracking function (AlphaAgent branding)
  window.alphaTrack = track;
  window.alphaGetVisitorId = getVisitorId;
  window.alphaGetAttribution = getAttribution;
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Serve the tracking script as JavaScript
  return new Response(trackingScript, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
});
