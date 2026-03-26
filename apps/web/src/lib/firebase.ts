import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Returns a Firebase app instance, or null during SSR/build where env vars
 * are not present. All callers must handle the null case.
 */
export function getFirebaseApp(): FirebaseApp | null {
  // Only initialize in browser. During SSR / static build, API key env vars
  // are absent and Firebase will throw auth/invalid-api-key.
  if (typeof window === 'undefined') return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

/**
 * Lazily returns Firebase Auth — safe to call from browser event handlers
 * and useEffect hooks. Returns null on server.
 */
export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

/**
 * Lazily returns Firestore — safe to call from browser event handlers
 * and useEffect hooks. Returns null on server.
 */
export function getFirebaseDb(): Firestore | null {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

// Legacy named exports for backwards compat.
// NOTE: These are lazily evaluated getters to avoid SSR crashes.
// Do NOT access at module load time on the server — use inside useEffect or event handlers.
export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const a = getFirebaseAuth();
    if (!a) throw new Error('Firebase Auth not available (SSR)');
    return (a as unknown as Record<string | symbol, unknown>)[prop];
  },
});
export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    const d = getFirebaseDb();
    if (!d) throw new Error('Firestore not available (SSR)');
    return (d as unknown as Record<string | symbol, unknown>)[prop];
  },
});
export default new Proxy({} as FirebaseApp, {
  get(_target, prop) {
    const app = getFirebaseApp();
    if (!app) throw new Error('Firebase App not available (SSR)');
    return (app as unknown as Record<string | symbol, unknown>)[prop];
  },
});

import { getStorage, type FirebaseStorage } from 'firebase/storage';

export function getFirebaseStorage(): FirebaseStorage | null {
  const app = getFirebaseApp();
  return app ? getStorage(app) : null;
}
