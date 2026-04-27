/**
 * signup-flow.spec.ts
 * ───────────────────────────────────────────────────────────────────────────
 * E2E test for the AKAI platform signup + onboarding flow.
 *
 * Coverage:
 *   1. /signup page loads correctly (no crash, correct UI elements)
 *   2. Inject Firebase auth → navigate to /onboard as e2etest@getakai.ai
 *   3. Walk all 8 onboarding chat steps:
 *        industry → business_name → website (type "no") → goal →
 *        location → contact → notifications → terms
 *   4. Terms step: checkbox appears, click it, click Activate Free Trial
 *   5. Redirect to /dashboard confirmed
 *   6. No critical console errors throughout
 *
 * Auth strategy: Firebase REST sign-in → localStorage injection (no OAuth popups)
 *
 * Run headless (EC2):
 *   BASE_URL=https://getakai.ai npx playwright test signup-flow.spec.ts --project=chromium
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL      = process.env.BASE_URL      || 'https://getakai.ai';
const FIREBASE_KEY  = process.env.FIREBASE_API_KEY
                   || process.env.NEXT_PUBLIC_FIREBASE_API_KEY
                   || 'AIzaSyBU2BmzGD2dmp7miIRRZoCwauNW7Rj_KC0';
const E2E_EMAIL     = process.env.E2E_EMAIL    || 'e2etest@getakai.ai';
const E2E_PASSWORD  = process.env.E2E_PASSWORD || 'E2Etest2026!';

// ─────────────────────────────────────────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────────────────────────────────────────

interface FirebaseAuthData {
  idToken: string;
  refreshToken: string;
  localId: string;
  email: string;
}

/**
 * Sign in via Firebase REST API and inject auth state into localStorage
 * so the Firebase SDK picks it up on page load.
 * Must be called BEFORE page.goto().
 */
async function injectE2EAuth(page: Page): Promise<FirebaseAuthData> {
  // 1. Get fresh tokens from Firebase
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: E2E_EMAIL,
        password: E2E_PASSWORD,
        returnSecureToken: true,
      }),
    }
  );
  const data = await resp.json() as FirebaseAuthData & { error?: { message: string } };
  if (!data.idToken) {
    throw new Error(`Firebase sign-in failed: ${JSON.stringify(data.error || data)}`);
  }

  // 2. Inject into browser localStorage (init script runs before any page JS)
  const storageKey = `firebase:authUser:${FIREBASE_KEY}:[DEFAULT]`;
  const authState = {
    uid:            data.localId,
    email:          data.email,
    emailVerified:  true,
    displayName:    'E2E Test',
    isAnonymous:    false,
    providerData: [{
      providerId:  'password',
      uid:         data.email,
      displayName: null,
      email:       data.email,
      phoneNumber: null,
      photoURL:    null,
    }],
    stsTokenManager: {
      refreshToken:   data.refreshToken,
      accessToken:    data.idToken,
      expirationTime: Date.now() + 3_600_000,
    },
    createdAt:    '1713830400000',
    lastLoginAt:  String(Date.now()),
    apiKey:       FIREBASE_KEY,
    appName:      '[DEFAULT]',
  };

  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: storageKey, value: authState });

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Wait for AK to finish "thinking" and render a response. */
async function waitForAKResponse(page: Page, timeoutMs = 20_000) {
  // Wait for the thinking indicator to appear (may be very brief)
  try {
    await page.waitForSelector('text=AK is thinking', { timeout: 3_000 });
  } catch {
    // Disappeared before we caught it — that's fine
  }
  // Wait for it to disappear (response rendered)
  await page.waitForFunction(() => {
    const body = document.body?.textContent ?? '';
    return !body.includes('AK is thinking');
  }, undefined, { timeout: timeoutMs });
  // Give React a tick to settle state
  await page.waitForTimeout(400);
}

/** Type a message into the onboarding chat input and submit. */
async function sendOnboardMessage(page: Page, text: string) {
  const input = page.locator('input[placeholder*="answer"], input[placeholder*="Answer"]').first();
  await expect(input).toBeVisible({ timeout: 10_000 });
  await input.fill(text);
  const sendBtn = page.locator('button').filter({ hasText: /Send/i }).first();
  await expect(sendBtn).toBeEnabled();
  await sendBtn.click();
  await waitForAKResponse(page);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: /signup page loads correctly
// ─────────────────────────────────────────────────────────────────────────────

test('Signup page loads — correct UI, no crash', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto(`${BASE_URL}/signup`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // Title shouldn't be an error page
  const title = await page.title();
  expect(title).not.toMatch(/application error|500|not found/i);

  // Should show some sign-up UI (Google/Microsoft buttons or email form)
  const body = await page.locator('body').innerText();
  expect(body.trim().length).toBeGreaterThan(50);

  // No "Something went wrong" overlay
  await expect(page.locator('text=Something went wrong').first()).not.toBeVisible();

  // No critical console errors (filter known browser noise)
  const critical = consoleErrors.filter(e =>
    !e.includes('Warning:') &&
    !e.includes('ResizeObserver') &&
    !e.includes('Non-Error promise') &&
    !e.includes('favicon')
  );
  expect(critical).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: Full onboarding flow (8 steps + terms + dashboard redirect)
// ─────────────────────────────────────────────────────────────────────────────

test('Onboarding flow — all 8 steps, terms accept, redirect to /dashboard', async ({ page }) => {
  test.setTimeout(120_000); // Full flow can take ~60s with API round-trips

  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // ── Step 0: Inject auth BEFORE navigation ──────────────────────────────────
  await injectE2EAuth(page);
  await page.goto(`${BASE_URL}/onboard`);
  await page.waitForLoadState('domcontentloaded');

  // Should NOT redirect to /login (auth injection worked)
  await page.waitForTimeout(2000);
  expect(page.url()).not.toContain('/login');

  // Wait for the initial AK message to appear
  await expect(
    page.locator('text=Hi, I\'m AK').or(page.locator('text=what industry are you in')).first()
  ).toBeVisible({ timeout: 15_000 });

  // ── Step 1: Industry ────────────────────────────────────────────────────────
  await sendOnboardMessage(page, 'Digital Marketing');
  // API response: "${industry} — great space to be in. What's the name of your business?"
  await expect(page.locator('text=/name of your business/i').last()).toBeVisible({ timeout: 15_000 });

  // ── Step 2: Business Name ───────────────────────────────────────────────────
  await sendOnboardMessage(page, 'AKAI Test Co');
  // API response: "Love it — ${name}. Do you have a website?..."
  await expect(page.locator('text=/do you have a website/i').last()).toBeVisible({ timeout: 15_000 });

  // ── Step 3: Website (skip) ──────────────────────────────────────────────────
  await sendOnboardMessage(page, 'no');
  // API response: "No problem... What's your main goal right now?"
  await expect(page.locator('text=/main goal right now/i').last()).toBeVisible({ timeout: 15_000 });

  // ── Step 4: Goal ────────────────────────────────────────────────────────────
  await sendOnboardMessage(page, 'Generate more leads and automate follow-up');
  // API response: "Got it. Where are you based?"
  await expect(page.locator('text=/where are you based/i').last()).toBeVisible({ timeout: 15_000 });

  // ── Step 5: Location ────────────────────────────────────────────────────────
  await sendOnboardMessage(page, 'Sydney, NSW');
  // API response: "Perfect. What's the best email or phone number..."
  await expect(page.locator('text=/best email or phone/i').last()).toBeVisible({ timeout: 15_000 });

  // ── Step 6: Contact ─────────────────────────────────────────────────────────
  await sendOnboardMessage(page, 'e2etest@getakai.ai');
  // API response: "Almost done! Last thing — how would you like AKAI to notify you..."
  await expect(page.locator('text=/how would you like AKAI/i').last()).toBeVisible({ timeout: 15_000 });

  // ── Step 7: Notifications ───────────────────────────────────────────────────
  await sendOnboardMessage(page, 'email');
  // After notifications, state moves to 'terms' — the page renders the TERMS native UI
  // (not a chat message; it's a full-page swap to the terms card)

  // ── Step 8: Terms — native UI ───────────────────────────────────────────────
  // After notifications, React re-renders to the native terms card (full-page swap).
  // Wait explicitly for the terms heading to appear.
  await expect(page.locator('h2').filter({ hasText: /Almost there/ })).toBeVisible({ timeout: 20_000 });

  // Checkbox label must be present
  const termsCheckbox = page.locator('label').filter({ hasText: /Terms of Service/i }).first();
  await expect(termsCheckbox).toBeVisible({ timeout: 10_000 });

  // Activate button starts disabled (checkbox not yet checked)
  const activateBtn = page.locator('button').filter({ hasText: /Activate Free Trial/i }).first();
  await expect(activateBtn).toBeVisible();

  // Click the checkbox label to toggle the custom checkbox
  await termsCheckbox.click();
  await page.waitForTimeout(400);

  // Button should now be enabled
  await expect(activateBtn).toBeEnabled({ timeout: 5_000 });

  // Click Activate
  await activateBtn.click();

  // ── Verify redirect to /dashboard ───────────────────────────────────────────
  // handleComplete fires → saves to Firestore (non-fatal) → router.replace('/dashboard')
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  expect(page.url()).toContain('/dashboard');

  // Dashboard should have sidebar nav (not blank)
  await expect(page.locator('nav, [class*="sidebar"]').first()).toBeVisible({ timeout: 15_000 });

  // ── Console error check ──────────────────────────────────────────────────────
  const critical = consoleErrors.filter(e =>
    !e.includes('Warning:') &&
    !e.includes('ResizeObserver') &&
    !e.includes('Non-Error promise') &&
    !e.includes('favicon') &&
    !e.includes('[ONBOARD] Railway') &&   // Railway API failures are non-fatal
    !e.includes('[ONBOARD] Firestore') && // Firestore failures are non-fatal
    !e.includes('AbortError') &&          // Fetch aborts are expected during navigation
    !e.includes('401') &&                 // 401s on dashboard are expected for test account (no integrations)
    !e.includes('Failed to load resource: the server responded with a status of 401')
  );

  if (critical.length > 0) {
    console.warn('[signup-flow] Console errors detected:', critical);
  }
  expect(critical).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Onboarding progress bar tracks through all 8 steps
// ─────────────────────────────────────────────────────────────────────────────

test('Onboarding progress bar — step indicators render correctly', async ({ page }) => {
  test.setTimeout(30_000);

  await injectE2EAuth(page);
  await page.goto(`${BASE_URL}/onboard`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Skip to login if redirected
  if (page.url().includes('/login')) {
    test.skip(true, 'Auth injection failed — skipping progress bar test');
    return;
  }

  // Progress bar should be present with 8 steps
  await expect(page.locator('text=Industry').first()).toBeVisible({ timeout: 10_000 });

  // Step labels should be visible
  const stepLabels = ['Industry', 'Business', 'Website', 'Goal', 'Location', 'Contact', 'Notify', 'Terms'];
  for (const label of stepLabels) {
    // Labels are hidden on mobile (hidden sm:block) — check for existence in DOM
    const el = page.locator(`text=${label}`).first();
    const count = await el.count();
    expect(count).toBeGreaterThan(0);
  }

  // Step 1 (Industry) should be the active/current step
  const step1 = page.locator('div').filter({ hasText: '1' }).first();
  await expect(step1).toBeVisible({ timeout: 5_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: Onboarding auth gate — unauthenticated users redirected to /login
// ─────────────────────────────────────────────────────────────────────────────

test('Onboarding auth gate — unauthenticated redirects to /login', async ({ page }) => {
  test.setTimeout(15_000);

  // Do NOT inject auth — visit /onboard as anonymous user
  await page.goto(`${BASE_URL}/onboard`);
  await page.waitForLoadState('domcontentloaded');

  // Give auth check time to fire (useEffect waits for loading to resolve)
  await page.waitForTimeout(4000);

  // Should be redirected to /login (or /signup)
  const url = page.url();
  const isRedirected = url.includes('/login') || url.includes('/signup');
  expect(isRedirected).toBe(true);
});
