import { Page, BrowserContext } from '@playwright/test';

const QA_EMAIL = process.env.QA_EMAIL || 'qa@getakai.ai';
const QA_PASSWORD = process.env.QA_PASSWORD || '';
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';
const BASE_URL = process.env.BASE_URL || 'https://getakai.ai';

export interface QAAuthTokens {
  idToken: string;
  uid: string;
  email: string;
}

/**
 * Signs in the QA test account via Firebase REST API and injects
 * the auth token into the browser context so the app sees a logged-in user.
 */
export async function signInQA(page: Page): Promise<QAAuthTokens> {
  // Get fresh ID token from Firebase REST
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD, returnSecureToken: true }),
    }
  );
  const data = await resp.json() as { idToken: string; localId: string; email: string };
  if (!data.idToken) throw new Error(`QA sign-in failed: ${JSON.stringify(data)}`);

  const tokens: QAAuthTokens = { idToken: data.idToken, uid: data.localId, email: data.email };

  // Inject Firebase auth state into browser via localStorage
  // Firebase SDK reads auth state from localStorage key: firebase:authUser:<API_KEY>:[DEFAULT]
  const storageKey = `firebase:authUser:${FIREBASE_API_KEY}:[DEFAULT]`;
  const authState = {
    uid: tokens.uid,
    email: tokens.email,
    emailVerified: true,
    displayName: 'AKAI QA Test',
    isAnonymous: false,
    providerData: [{ providerId: 'password', uid: tokens.email, displayName: null, email: tokens.email, phoneNumber: null, photoURL: null }],
    stsTokenManager: {
      refreshToken: '',
      accessToken: tokens.idToken,
      expirationTime: Date.now() + 3600000,
    },
    createdAt: '1713830400000',
    lastLoginAt: String(Date.now()),
    apiKey: FIREBASE_API_KEY,
    appName: '[DEFAULT]',
  };

  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: storageKey, value: authState });

  return tokens;
}

/**
 * Navigate to a dashboard page as the QA user.
 * Must be called BEFORE page.goto() so the init script fires first.
 */
export async function gotoAuthenticated(page: Page, path: string): Promise<void> {
  await signInQA(page);
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState('domcontentloaded');
  // Wait briefly for auth state to propagate
  await page.waitForTimeout(1500);
}
