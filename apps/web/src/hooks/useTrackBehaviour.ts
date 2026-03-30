'use client';

import { useAuth } from '@/hooks/useAuth';
import { getFirebaseDb } from '@/lib/firebase';

declare global {
  interface Window {
    gtag?: (command: string, action: string, params?: Record<string, unknown>) => void;
  }
}

/**
 * Dual-track behaviour hook: writes to Firestore activityLog AND fires GA4 gtag events.
 * - Firestore: persists per-user, readable by admin endpoint
 * - GA4: anonymous correlation, funnel analysis
 *
 * Usage:
 *   const { track } = useTrackBehaviour();
 *   track('dashboard_viewed');
 *   track('quick_action_clicked', { action: 'Start a call' });
 */
export function useTrackBehaviour() {
  const { user } = useAuth();

  const track = async (event: string, data?: Record<string, unknown>) => {
    const page = typeof window !== 'undefined' ? window.location.pathname : '';

    // ── Layer 1: GA4 (fires for everyone — anonymous + logged-in) ──────────
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      try {
        window.gtag('event', event, {
          page,
          user_id: user?.uid ?? undefined,
          ...(data ?? {}),
        });
      } catch { /* non-fatal */ }
    }

    // ── Layer 2: Firestore activityLog (logged-in users only) ────────────
    if (!user?.uid) return;
    try {
      const db = getFirebaseDb();
      if (!db) return;
      const { collection, addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'users', user.uid, 'activityLog'), {
        event,
        data: data ?? {},
        timestamp: new Date().toISOString(),
        page,
      });
    } catch { /* non-fatal */ }
  };

  return { track };
}
