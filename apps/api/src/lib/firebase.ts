import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
  if (app) return app;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error('Firebase admin credentials not configured');
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({ projectId, privateKey, clientEmail }),
    databaseURL: `https://${projectId}.firebaseio.com`,
  });

  return app;
}

export { admin };
