'use client';

/**
 * useTrialStatus — reads trialStartedAt from Firestore and returns the user's
 * trial state. Respects TRIAL_MODE_ACTIVE: when false, always returns
 * { status: 'active', daysLeft: 15, isExpired: false } so no trial UI shows.
 *
 * Trailblazers (whitelisted emails) are always 'active' regardless of flags.
 */

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { TRIAL_MODE_ACTIVE, TRIAL_DAYS, getTrialState, getTrialDaysLeft, isTrialUser } from '@/lib/beta-config';
import type { User } from 'firebase/auth';

export type TrialStatus = 'active' | 'ending' | 'expired' | 'subscribed';

export interface TrialState {
  /** Days left in trial. 0 = expired. TRIAL_DAYS = not started yet. */
  daysLeft: number;
  status: TrialStatus;
  isExpired: boolean;
  /** True while Firestore data is still loading */
  loading: boolean;
}

const DEFAULT_STATE: TrialState = {
  daysLeft: TRIAL_DAYS,
  status: 'active',
  isExpired: false,
  loading: true,
};

const INACTIVE_STATE: TrialState = {
  daysLeft: TRIAL_DAYS,
  status: 'active',
  isExpired: false,
  loading: false,
};

export function useTrialStatus(user: User | null): TrialState {
  const [state, setState] = useState<TrialState>(DEFAULT_STATE);

  useEffect(() => {
    // If trial system is off, or no user, or user is a Trailblazer → always active
    if (!TRIAL_MODE_ACTIVE || !user || !isTrialUser(user.email)) {
      setState(INACTIVE_STATE);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const db = getFirebaseDb();
        if (!db) {
          setState(INACTIVE_STATE);
          return;
        }

        const snap = await getDoc(doc(db, 'users', user.uid));
        if (cancelled) return;

        if (!snap.exists()) {
          setState(INACTIVE_STATE);
          return;
        }

        const data = snap.data();

        // Subscribed users — no trial UI
        if (data?.trialStatus === 'subscribed' || (data?.plan && data.plan !== 'trial')) {
          setState({ daysLeft: TRIAL_DAYS, status: 'subscribed', isExpired: false, loading: false });
          return;
        }

        const trialStartedAt: string | null = data?.trialStartedAt ?? null;
        const trialState = getTrialState(trialStartedAt);
        const daysLeft = getTrialDaysLeft(trialStartedAt);

        const status: TrialStatus =
          trialState === 'expired' ? 'expired' :
          trialState === 'ending'  ? 'ending'  : 'active';

        setState({
          daysLeft,
          status,
          isExpired: trialState === 'expired',
          loading: false,
        });
      } catch {
        // Non-fatal — default to active so we never block access on error
        setState(INACTIVE_STATE);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
