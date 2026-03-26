'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  businessName?: string | null;
  createdAt: unknown;
  lastLoginAt: unknown;
  onboardingComplete: boolean;
}

async function syncUserProfile(user: User): Promise<UserProfile> {
  const db = getFirebaseDb();
  if (!db) {
    // Firestore unavailable — return a minimal in-memory profile
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      createdAt: null,
      lastLoginAt: null,
      onboardingComplete: false,
    };
  }

  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // New user — create profile
    const profile: Omit<UserProfile, 'uid'> = {
      email: user.email,
      displayName: user.displayName,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      onboardingComplete: false,
    };
    await setDoc(ref, profile);
    return { uid: user.uid, ...profile };
  } else {
    // Existing user — update lastLoginAt
    await updateDoc(ref, { lastLoginAt: serverTimestamp() });
    const data = snap.data();
    return {
      uid: user.uid,
      email: data.email ?? user.email,
      displayName: data.displayName ?? user.displayName,
      businessName: data.businessName ?? null,
      createdAt: data.createdAt,
      lastLoginAt: data.lastLoginAt,
      onboardingComplete: data.onboardingComplete ?? false,
    };
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      // Auth not available yet (SSR) — retry after hydration
      const t = setTimeout(() => {
        const a = getFirebaseAuth();
        if (!a) setLoading(false);
      }, 1000);
      return () => clearTimeout(t);
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      // Set loading false immediately — don't wait for Firestore sync
      setLoading(false);
      if (u) {
        // Sync profile in background — non-blocking
        syncUserProfile(u)
          .then(setUserProfile)
          .catch(() => {
            setUserProfile({
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              createdAt: null,
              lastLoginAt: null,
              onboardingComplete: false,
            });
          });
      } else {
        setUserProfile(null);
      }
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth);
    }
    // Hard redirect to login — works regardless of router context
    window.location.href = '/login';
  };

  return { user, userProfile, loading, logout };
}
