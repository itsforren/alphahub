/**
 * Attribution Tracking Library
 * 
 * Implements Hyros-style multi-touch attribution tracking including:
 * - Persistent visitor ID across sessions
 * - UTM parameter capture and storage
 * - Page view and event tracking
 * - First-touch and last-touch attribution
 * - GTM dataLayer integration for retargeting
 * - Smart source detection from referrers
 */

import { supabase } from "@/integrations/supabase/client";

// Storage keys
const VISITOR_ID_KEY = "alpha_visitor_id";
const SESSION_ID_KEY = "alpha_session_id";
const FIRST_TOUCH_KEY = "alpha_first_touch";
const LAST_TOUCH_KEY = "alpha_last_touch";
const REFERRAL_CODE_KEY = "alpha_referral_code"; // Independent storage for referral code
const REFERRAL_COOKIE_NAME = "aa_ref"; // Cookie fallback for referral code
const FIRST_REFERRER_KEY = "alpha_first_referrer_url"; // Persist first referrer URL

// Cookie helpers
function setCookie(name: string, value: string, days: number = 30): void {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// Extend window for GTM dataLayer
declare global {
  interface Window {
    dataLayer?: any[];
  }
}

// Generate unique IDs
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 15)}`;
}

// Get or create visitor ID (persistent across sessions)
export function getVisitorId(): string {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = `v_${generateId()}`;
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

// Get or create session ID (new per browser session)
export function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = `s_${generateId()}`;
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

// Parse UTM parameters from URL
export function getUTMParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
    utm_term: params.get("utm_term") || "",
    utm_id: params.get("utm_id") || "",
    gclid: params.get("gclid") || "",
    fbclid: params.get("fbclid") || "",
    ttclid: params.get("ttclid") || "",
    ref: params.get("ref") || "", // referral code
  };
}

// Smart source detection from referrer when UTMs are missing
// NOTE: This is ONLY used for fallback detection. UTM values are ONLY set from actual URL params.
function detectTrafficSource(): { source: string; medium: string } {
  const utmParams = getUTMParams();
  const referrer = document.referrer.toLowerCase();
  
  // Priority 1: Explicit UTM parameters - ONLY use if they exist in URL
  if (utmParams.utm_source) {
    return { source: utmParams.utm_source, medium: utmParams.utm_medium || "unknown" };
  }
  
  // Priority 2: Google/Facebook click IDs
  if (utmParams.gclid) return { source: "google", medium: "cpc" };
  if (utmParams.fbclid) return { source: "facebook", medium: "paid" };
  
  // Priority 3: Parse referrer for known sources
  if (referrer) {
    // Search engines
    if (referrer.includes("google.")) return { source: "google", medium: "organic" };
    if (referrer.includes("bing.")) return { source: "bing", medium: "organic" };
    if (referrer.includes("yahoo.")) return { source: "yahoo", medium: "organic" };
    if (referrer.includes("duckduckgo.")) return { source: "duckduckgo", medium: "organic" };
    
    // Social platforms
    if (referrer.includes("facebook.") || referrer.includes("fb.com") || referrer.includes("fb.me")) {
      return { source: "facebook", medium: "social" };
    }
    if (referrer.includes("instagram.") || referrer.includes("l.instagram.")) {
      return { source: "instagram", medium: "social" };
    }
    if (referrer.includes("youtube.") || referrer.includes("youtu.be")) {
      return { source: "youtube", medium: "video" };
    }
    if (referrer.includes("linkedin.")) return { source: "linkedin", medium: "social" };
    if (referrer.includes("twitter.") || referrer.includes("t.co") || referrer.includes("x.com")) {
      return { source: "twitter", medium: "social" };
    }
    if (referrer.includes("tiktok.")) return { source: "tiktok", medium: "social" };
    
    // Link shorteners / tracking domains
    if (referrer.includes("url.alphaagent.io")) return { source: "shortlink", medium: "link" };
    if (referrer.includes("bit.ly") || referrer.includes("bitly.")) return { source: "shortlink", medium: "link" };
    
    // Email platforms (when clicked from webmail)
    if (referrer.includes("mail.google.") || referrer.includes("outlook.") || referrer.includes("mail.yahoo.")) {
      return { source: "email", medium: "email" };
    }
    
    // Generic referral from unknown domain
    try {
      const refDomain = new URL(document.referrer).hostname.replace("www.", "");
      return { source: refDomain, medium: "referral" };
    } catch {
      return { source: "unknown", medium: "referral" };
    }
  }
  
  // No referrer = direct traffic
  return { source: "direct", medium: "none" };
}

// Get device type
function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

// Push events to GTM dataLayer for retargeting
function pushToDataLayer(eventName: string, data?: Record<string, any>): void {
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: `alpha_${eventName}`,
      alpha_visitor_id: getVisitorId(),
      alpha_session_id: getSessionId(),
      timestamp: new Date().toISOString(),
      ...data,
    });
  }
}

// Store first-touch attribution (only once per visitor, but allow upgrading referral_code)
// IMPORTANT: Only use actual URL params for source/medium - never default to "referral"
function storeFirstTouch(): void {
  const existingFirstTouch = localStorage.getItem(FIRST_TOUCH_KEY);
  const utmParams = getUTMParams();
  const referralCode = getReferralCode();
  const detectedSource = detectTrafficSource();

  // If first touch exists, only update the referral_code if we now have one
  if (existingFirstTouch) {
    try {
      const existing = JSON.parse(existingFirstTouch);

      // Only upgrade referral_code - never change source/medium after first touch
      if (referralCode && !existing.referral_code) {
        existing.referral_code = referralCode;
        localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(existing));
      }

      return;
    } catch {
      // Invalid JSON, will be replaced below
    }
  }

  // CRITICAL: Only use actual URL params for source/medium
  // If no UTM params exist, use detected source (from referrer/click IDs)
  // Referral code is stored SEPARATELY - it does NOT set source/medium
  const firstTouch = {
    source: utmParams.utm_source || detectedSource.source,
    medium: utmParams.utm_medium || detectedSource.medium,
    campaign: utmParams.utm_campaign || "",
    content: utmParams.utm_content || "",
    term: utmParams.utm_term || "",
    utm_id: utmParams.utm_id || "",
    gclid: utmParams.gclid || "",
    fbclid: utmParams.fbclid || "",
    ttclid: utmParams.ttclid || "",
    referrer: document.referrer || "",
    landing_page: window.location.pathname,
    referral_code: referralCode || "", // Stored separately, doesn't affect source/medium
    timestamp: new Date().toISOString(),
  };

  localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(firstTouch));
}

// Update last-touch attribution (on every session with attribution data)
// IMPORTANT: Only use actual URL params for source/medium - never default to "referral"
function storeLastTouch(): void {
  const utmParams = getUTMParams();
  const firstTouch = getFirstTouch();
  const detectedSource = detectTrafficSource();

  // Carry forward referral code from URL/cookie/localStorage, otherwise first touch
  const referralCode = getReferralCode() || firstTouch?.referral_code || "";

  // CRITICAL: Only use actual URL params for source/medium
  // Referral code is stored separately - it does NOT affect source/medium
  const lastTouch = {
    source: utmParams.utm_source || detectedSource.source,
    medium: utmParams.utm_medium || detectedSource.medium,
    campaign: utmParams.utm_campaign || "",
    content: utmParams.utm_content || "",
    term: utmParams.utm_term || "",
    utm_id: utmParams.utm_id || "",
    gclid: utmParams.gclid || "",
    fbclid: utmParams.fbclid || "",
    ttclid: utmParams.ttclid || "",
    referrer: document.referrer || "",
    landing_page: window.location.pathname,
    referral_code: referralCode, // Stored separately, doesn't affect source/medium
    timestamp: new Date().toISOString(),
  };

  localStorage.setItem(LAST_TOUCH_KEY, JSON.stringify(lastTouch));
}

// Get stored attribution data
export function getFirstTouch(): Record<string, string> | null {
  const data = localStorage.getItem(FIRST_TOUCH_KEY);
  return data ? JSON.parse(data) : null;
}

export function getLastTouch(): Record<string, string> | null {
  const data = localStorage.getItem(LAST_TOUCH_KEY);
  return data ? JSON.parse(data) : null;
}

// Get complete attribution data for form submission
export function getAttributionData(): {
  visitor_id: string;
  session_id: string;
  first_touch: Record<string, string> | null;
  last_touch: Record<string, string> | null;
  current_utm: Record<string, string>;
  referral_code: string | null;
} {
  // Get referral code from all possible sources (bulletproof)
  const urlParams = new URLSearchParams(window.location.search);
  const urlRef = urlParams.get('ref');
  const cookieRef = getCookie(REFERRAL_COOKIE_NAME);
  const storedRef = localStorage.getItem(REFERRAL_CODE_KEY);
  const firstTouch = getFirstTouch();
  const lastTouch = getLastTouch();
  
  // Priority: URL > cookie > dedicated storage > first_touch > last_touch
  const referralCode = (urlRef && urlRef.trim()) 
    || (cookieRef && cookieRef.trim())
    || (storedRef && storedRef.trim())
    || firstTouch?.referral_code 
    || lastTouch?.referral_code 
    || null;
  
  return {
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    first_touch: firstTouch,
    last_touch: lastTouch,
    current_utm: getUTMParams(),
    referral_code: referralCode,
  };
}

// Send tracking event to backend
async function sendEvent(
  eventType: string,
  eventData?: Record<string, any>,
  options?: {
    pageUrl?: string;
    elementId?: string;
    elementText?: string;
  }
): Promise<void> {
  // Push to GTM dataLayer for retargeting
  pushToDataLayer(eventType, {
    page_url: options?.pageUrl || window.location.pathname,
    element_id: options?.elementId,
    element_text: options?.elementText,
    ...eventData,
  });

  try {
    const detectedSource = detectTrafficSource();
    const payload: Record<string, any> = {
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      event_type: eventType,
      page_url: options?.pageUrl || window.location.pathname,
      element_id: options?.elementId || null,
      element_text: options?.elementText || null,
      event_data: eventData || {},
    };

    // For session_start, include attribution data with smart source detection
    // IMPORTANT: Only use actual URL params for source/medium - never default to "referral"
    if (eventType === "session_start") {
      const utmParams = getUTMParams();
      const referralCode = getReferralCode();
      // Only use actual URL params - referral code is stored separately
      payload.utm_source = utmParams.utm_source || detectedSource.source;
      payload.utm_medium = utmParams.utm_medium || detectedSource.medium;
      payload.utm_campaign = utmParams.utm_campaign || null;
      payload.utm_content = utmParams.utm_content || null;
      payload.utm_term = utmParams.utm_term || null;
      payload.gclid = utmParams.gclid || null;
      payload.fbclid = utmParams.fbclid || null;
      payload.referrer_url = document.referrer || null;
      payload.referral_code = referralCode || null; // Stored separately from UTMs
      payload.landing_page = window.location.pathname;
      payload.device_type = getDeviceType();
      payload.user_agent = navigator.userAgent;
    }

    await supabase.functions.invoke("track-event", { body: payload });
  } catch (error) {
    // Silently fail - tracking should never break the user experience
    console.debug("Tracking event failed:", error);
  }
}

// Track page view
export function trackPageView(url?: string): void {
  sendEvent("page_view", { url: url || window.location.href }, { pageUrl: url });
}

// Track custom event
export function trackEvent(
  eventType: string,
  data?: Record<string, any>,
  elementInfo?: { id?: string; text?: string }
): void {
  sendEvent(eventType, data, {
    elementId: elementInfo?.id,
    elementText: elementInfo?.text,
  });
}

// Track form interactions
export function trackFormStart(formId: string): void {
  trackEvent("form_start", { form_id: formId }, { id: formId });
}

export function trackFormSubmit(formId: string, formData?: Record<string, any>): void {
  trackEvent("form_submit", { form_id: formId, ...formData }, { id: formId });
}

// Track form abandonment
export function trackFormAbandonment(formId: string, fieldsCompleted?: string[]): void {
  trackEvent("form_abandoned", { 
    form_id: formId, 
    fields_completed: fieldsCompleted,
    abandonment_url: window.location.pathname,
  }, { id: formId });
}

// Track button clicks
export function trackButtonClick(buttonId: string, buttonText?: string): void {
  trackEvent("button_click", { button_id: buttonId }, { id: buttonId, text: buttonText });
}

// Track strategic page views for retargeting
export function trackPricingView(): void {
  trackEvent("pricing_view", { page: "pricing" });
}

export function trackCalculatorInteraction(values?: Record<string, any>): void {
  trackEvent("calculator_interaction", values);
}

export function trackTerritorySelected(states: string[]): void {
  trackEvent("territory_selected", { states, count: states.length });
}

// Scroll depth tracking
let scrollDepthTracked: Record<number, boolean> = {};

export function initScrollDepthTracking(): void {
  scrollDepthTracked = { 25: false, 50: false, 75: false, 90: false };
  
  const handleScroll = () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return;
    
    const scrollPercent = (window.scrollY / scrollHeight) * 100;
    
    [25, 50, 75, 90].forEach((threshold) => {
      if (scrollPercent >= threshold && !scrollDepthTracked[threshold]) {
        scrollDepthTracked[threshold] = true;
        trackEvent("scroll_depth", { depth: threshold, page: window.location.pathname });
      }
    });
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
}

// Initialize tracking on app load
let initialized = false;

// Capture referral code from URL - FIRST TOUCH WINS
// This runs on EVERY page load but ONLY stores if no existing referral code exists
// This ensures the first agent who refers someone ALWAYS gets credit
function captureReferralCodeFromUrl(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  
  if (refCode && refCode.trim()) {
    const code = refCode.trim();
    
    // Check if we already have a referral code stored (first-touch preservation)
    const existingCookie = getCookie(REFERRAL_COOKIE_NAME);
    const existingStorage = localStorage.getItem(REFERRAL_CODE_KEY);
    const existingCode = existingCookie || existingStorage;
    
    if (!existingCode) {
      // FIRST TOUCH - store permanently (this is the referring agent who gets credit)
      localStorage.setItem(REFERRAL_CODE_KEY, code);
      setCookie(REFERRAL_COOKIE_NAME, code, 365); // 1 year expiry for first touch
      console.debug("[Tracking] First-touch referral code captured:", code);
      
      // Track the first referral click
      trackEvent('referral_link_clicked', {
        referral_code: code,
        is_first_touch: true,
        existing_code: null,
        page_url: window.location.pathname,
      });
    } else if (existingCode !== code) {
      // Different referral code clicked - log it for journey visibility but DON'T overwrite
      console.debug("[Tracking] Referral code preserved (first-touch):", existingCode, "- ignoring new code:", code);
      
      // Track subsequent referral clicks for visibility
      trackEvent('referral_link_clicked', {
        referral_code: code,
        is_first_touch: false,
        existing_code: existingCode,
        page_url: window.location.pathname,
      });
    }
    // If same code clicked again, no need to log
  }
}

// Get stored referral code - independent of attribution
// Priority: URL > Cookie > localStorage
export function getReferralCode(): string | null {
  // Priority 1: URL param (always freshest)
  const urlParams = new URLSearchParams(window.location.search);
  const urlRef = urlParams.get('ref');
  if (urlRef && urlRef.trim()) return urlRef.trim();
  
  // Priority 2: Cookie (more reliable in incognito)
  const cookieRef = getCookie(REFERRAL_COOKIE_NAME);
  if (cookieRef && cookieRef.trim()) return cookieRef.trim();
  
  // Priority 3: localStorage
  const storedRef = localStorage.getItem(REFERRAL_CODE_KEY);
  return storedRef && storedRef.trim() ? storedRef.trim() : null;
}

// Capture and persist first referrer URL (only once per visitor)
export function captureFirstReferrer(): void {
  const existingFirstReferrer = localStorage.getItem(FIRST_REFERRER_KEY);
  if (!existingFirstReferrer) {
    // Store even if empty - this marks that we captured it
    const referrer = document.referrer || "";
    localStorage.setItem(FIRST_REFERRER_KEY, referrer);
    console.debug("[Tracking] First referrer captured:", referrer || "(direct)");
  }
}

// Get referrer data for form submissions
export function getReferrerData(): { referrer_url: string; first_referrer_url: string } {
  return {
    referrer_url: document.referrer || "",
    first_referrer_url: localStorage.getItem(FIRST_REFERRER_KEY) || document.referrer || "",
  };
}

export function initTracking(): void {
  // CRITICAL: Always capture referral code from URL, even if already initialized
  captureReferralCodeFromUrl();
  
  // Capture first referrer on first visit
  captureFirstReferrer();
  
  if (initialized) return;
  initialized = true;

  // Store attribution data with smart source detection
  storeFirstTouch();
  storeLastTouch();

  // Track session start
  const isNewSession = !sessionStorage.getItem("_session_started");
  if (isNewSession) {
    sessionStorage.setItem("_session_started", "true");
    sendEvent("session_start");
  }

  // Track initial page view
  trackPageView();

  // Initialize scroll depth tracking
  initScrollDepthTracking();

  // Listen for route changes (for SPAs)
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;

      // Re-capture referral code on SPA navigations (query params can change without reload)
      captureReferralCodeFromUrl();
      storeFirstTouch();
      storeLastTouch();

      trackPageView();
      // Reset scroll depth for new pages
      scrollDepthTracked = { 25: false, 50: false, 75: false, 90: false };
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  console.debug("Attribution tracking initialized", {
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    detected_source: detectTrafficSource(),
  });
}

// Auto-track CTA button clicks
export function setupAutoTracking(): void {
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest("button, a[role='button'], .cta-button");
    
    if (button) {
      const id = button.id || button.getAttribute("data-track-id") || "unknown";
      const text = button.textContent?.trim().substring(0, 50) || "";
      trackButtonClick(id, text);
    }
  });
}
