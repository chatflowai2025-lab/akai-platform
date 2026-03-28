/**
 * Firebase Admin SDK — server-side only.
 * Used in API routes and server components that need to read/write Firestore
 * without client-side auth.
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

function getAdminApp(): App | null {
  if (adminApp) return adminApp;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (getApps().some(a => a.name === 'admin')) {
    adminApp = getApps().find(a => a.name === 'admin') ?? null;
    return adminApp;
  }

  if (projectId && clientEmail && privateKey) {
    adminApp = initializeApp(
      {
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      },
      'admin',
    );
    return adminApp;
  }

  // Fallback: use Application Default Credentials if available (GCP environment)
  if (projectId) {
    try {
      adminApp = initializeApp({ projectId }, 'admin');
      return adminApp;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Returns the Admin Firestore instance pointing at the named 'akai' database.
 * This matches the client-side getFirebaseDb() which uses initializeFirestore(app, {}, 'akai').
 * Falls back to default database if named database is unavailable.
 */
export function getAdminFirestore(): Firestore | null {
  const app = getAdminApp();
  if (!app) return null;
  try {
    // Use the named 'akai' database — must match client-side firebase.ts
    return getFirestore(app, 'akai');
  } catch {
    try {
      // Fallback to default database if named database call fails
      return getFirestore(app);
    } catch {
      return null;
    }
  }
}
