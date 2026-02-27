import { useState, useEffect, useRef } from 'react';

interface FocusEvent {
  hidden_at?: string;
  visible_at?: string;
}

interface DeviceInfo {
  userAgent: string;
  platformOs: string;
  screenResolution: string;
  languageLocale: string;
  referrerUrl: string;
  utmParams: Record<string, string>;
}

export function useScrollTracking(containerRef: React.RefObject<HTMLElement>) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [scrolledToBottomAt, setScrolledToBottomAt] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const viewportRef = useRef<HTMLElement | null>(null);
  const scrolledRef = useRef(false);

  useEffect(() => {
    let lastContainer: HTMLElement | null = null;
    let observer: MutationObserver | null = null;

    const reset = () => {
      scrolledRef.current = false;
      setScrollProgress(0);
      setScrolledToBottom(false);
      setScrolledToBottomAt(null);
    };

    const findViewport = (container: HTMLElement): HTMLElement | null => {
      // Prefer the explicit attribute we add in our ScrollArea wrapper.
      const byAttr =
        (container.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null) ||
        (container.querySelector('[data-radix-scroll-area-viewport=""]') as HTMLElement | null);
      if (byAttr) return byAttr;

      // Fallback: find any element inside that is actually scrollable.
      const allElements = container.querySelectorAll('*');
      for (const el of allElements) {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        const overflowY = style.overflowY;
        const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && htmlEl.scrollHeight > htmlEl.clientHeight;
        if (isScrollable) return htmlEl;
      }

      return null;
    };

    const checkScrollPosition = () => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const maxScroll = scrollHeight - clientHeight;

      // Handle edge case where content fits without scrolling
      if (maxScroll <= 5) {
        setScrollProgress(100);
        if (!scrolledRef.current) {
          scrolledRef.current = true;
          setScrolledToBottom(true);
          setScrolledToBottomAt(new Date().toISOString());
        }
        return;
      }

      const progress = Math.min(100, Math.round((scrollTop / maxScroll) * 100));
      setScrollProgress(progress);

      // 20px threshold for "bottom"
      if (maxScroll - scrollTop <= 20 && !scrolledRef.current) {
        scrolledRef.current = true;
        setScrolledToBottom(true);
        setScrolledToBottomAt(new Date().toISOString());
      }
    };

    const detachViewport = () => {
      if (viewportRef.current) {
        viewportRef.current.removeEventListener('scroll', checkScrollPosition);
      }
      viewportRef.current = null;
    };

    const ensureAttached = () => {
      const container = containerRef.current;

      // If step 3 unmounted (ScrollArea not in DOM), clean up + reset.
      if (!container) {
        if (lastContainer) {
          detachViewport();
          observer?.disconnect();
          observer = null;
          lastContainer = null;
          reset();
        }
        return;
      }

      // If the container element changed (step re-mounted), treat it as a fresh read.
      if (container !== lastContainer) {
        detachViewport();
        observer?.disconnect();
        observer = null;
        lastContainer = container;
        reset();
      }

      const viewport = findViewport(container);

      if (!viewport) {
        // Watch for Radix to mount the viewport (or re-render it).
        if (!observer) {
          observer = new MutationObserver(() => {
            // Re-run attachment when DOM changes.
            ensureAttached();
          });
          observer.observe(container, { childList: true, subtree: true });
        }
        return;
      }

      if (viewportRef.current !== viewport) {
        detachViewport();
        viewportRef.current = viewport;
        viewport.addEventListener('scroll', checkScrollPosition, { passive: true });

        // Initial state check (covers cases where content already fits).
        checkScrollPosition();
      }
    };

    // Always keep a lightweight poll running so we attach even if the ScrollArea mounts later
    // (e.g. user advances steps). This is critical because ref.current changes do not re-run effects.
    ensureAttached();
    const poll = window.setInterval(ensureAttached, 250);

    return () => {
      window.clearInterval(poll);
      observer?.disconnect();
      detachViewport();
    };
  }, [containerRef]);

  return { scrolledToBottom, scrolledToBottomAt, scrollProgress };
}

export function useFocusTracking() {
  const [focusEvents, setFocusEvents] = useState<FocusEvent[]>([]);
  const currentEventRef = useRef<FocusEvent | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        currentEventRef.current = { hidden_at: new Date().toISOString() };
      } else if (currentEventRef.current) {
        currentEventRef.current.visible_at = new Date().toISOString();
        setFocusEvents((prev) => [...prev, currentEventRef.current!]);
        currentEventRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return focusEvents;
}

export function useTimeOnPage() {
  const [pageLoadAt] = useState<string>(new Date().toISOString());
  const [timeOnPageSeconds, setTimeOnPageSeconds] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setTimeOnPageSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return { pageLoadAt, timeOnPageSeconds };
}

export function useDeviceInfo(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    userAgent: '',
    platformOs: '',
    screenResolution: '',
    languageLocale: '',
    referrerUrl: '',
    utmParams: {},
  });

  useEffect(() => {
    // Parse platform/OS from user agent
    const userAgent = navigator.userAgent;
    let platformOs = 'Unknown';
    
    if (userAgent.includes('Windows')) platformOs = 'Windows';
    else if (userAgent.includes('Mac')) platformOs = 'macOS';
    else if (userAgent.includes('Linux')) platformOs = 'Linux';
    else if (userAgent.includes('Android')) platformOs = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) platformOs = 'iOS';

    // Parse UTM params from URL
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((key) => {
      const value = urlParams.get(key);
      if (value) utmParams[key] = value;
    });

    setDeviceInfo({
      userAgent,
      platformOs,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      languageLocale: navigator.language,
      referrerUrl: document.referrer,
      utmParams,
    });
  }, []);

  return deviceInfo;
}

export function useIpAddress() {
  const [ipAddress, setIpAddress] = useState<string | null>(null);
  const [geoLocation, setGeoLocation] = useState<{ city?: string; region?: string }>({});

  useEffect(() => {
    // Fetch IP address from a public API
    fetch('https://api.ipify.org?format=json')
      .then((res) => res.json())
      .then((data) => {
        setIpAddress(data.ip);
        // Optionally fetch geolocation
        return fetch(`https://ipapi.co/${data.ip}/json/`);
      })
      .then((res) => res.json())
      .then((data) => {
        setGeoLocation({
          city: data.city,
          region: data.region,
        });
      })
      .catch(() => {
        // Silently fail - IP is nice to have but not critical
      });
  }, []);

  return { ipAddress, geoLocation };
}

export function generateSessionId(): string {
  return 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function generateCsrfToken(): string {
  return 'csrf_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}
