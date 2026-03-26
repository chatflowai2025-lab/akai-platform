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

// Legacy named exports for backwards compat — these will be null on server
// but are only used in client-side contexts (useEffect, event handlers).
export const auth = getFirebaseAuth() as Auth;
export const db = getFirebaseDb() as Firestore;
export default getFirebaseApp() as unknown as FirebaseApp;

import { getStorage, type FirebaseStorage } from 'firebase/storage';

export function getFirebaseStorage(): FirebaseStorage | null {
  const app = getFirebaseApp();
  return app ? getStorage(app) : null;
}
