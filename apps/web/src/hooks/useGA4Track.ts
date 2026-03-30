'use client';

/**
 * Lightweight GA4-only tracker for anonymous / pre-auth contexts (landing page).
 * No Firestore write — just fires window.gtag.
 */
export function gtag(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', event, params ?? {});
  } catch { /* non-fatal */ }
}

/**
 * Hook for landing page scroll-depth tracking.
 * Fires GA4 events at 25 / 50 / 75 / 100% scroll depth — once each per page load.
 */
export function initScrollDepthTracking() {
  if (typeof window === 'undefined') return;

  const fired = new Set<number>();
  const thresholds = [25, 50, 75, 100];

  const onScroll = () => {
    const scrolled = window.scrollY + window.innerHeight;
    const total = document.documentElement.scrollHeight;
    const pct = Math.round((scrolled / total) * 100);

    for (const t of thresholds) {
      if (pct >= t && !fired.has(t)) {
        fired.add(t);
        gtag('scroll_depth', { depth_percent: t, page: window.location.pathname });
      }
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  // Return cleanup
  return () => window.removeEventListener('scroll', onScroll);
}
