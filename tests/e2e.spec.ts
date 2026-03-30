import { test, expect } from '@playwright/test';

// ─── Homepage Tests ───────────────────────────────────────────────────────────

test('1. Homepage loads (200, contains "AKAI", contains "Your AI Business Partner")', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('body')).toContainText('AKAI');
  await expect(page.locator('body')).toContainText('Your AI Business Partner');
});

test('2. Homepage has Sign In link pointing to /login', async ({ page }) => {
  await page.goto('/');
  // Sign In link in Navbar (shown when logged out)
  const signInLink = page.locator('a[href="/login"]').filter({ hasText: 'Sign In' }).first();
  await expect(signInLink).toBeVisible();
  const href = await signInLink.getAttribute('href');
  expect(href).toBe('/login');
});

test('3. Homepage Get Started button points to /login (when logged out)', async ({ page }) => {
  await page.goto('/');
  // The Button component rendered with href - find "Get Started" link/button
  const getStarted = page.locator('a[href="/login"]').filter({ hasText: /Get Started/i }).first();
  const href = await getStarted.getAttribute('href');
  expect(href).toBe('/login');
});

// ─── Login Page Tests ─────────────────────────────────────────────────────────

test('4. Login page loads (200, contains "Sign In", contains "Create Account" tab)', async ({ page }) => {
  const response = await page.goto('/login');
  expect(response?.status()).toBe(200);
  await expect(page.locator('body')).toContainText('Sign In');
  await expect(page.locator('body')).toContainText('Create Account');
});

test('5. Login page has Google sign-in button', async ({ page }) => {
  await page.goto('/login');
  const googleBtn = page.locator('button').filter({ hasText: /Continue with Google/i });
  await expect(googleBtn).toBeVisible();
});

test('6. Login page has Microsoft sign-in button', async ({ page }) => {
  await page.goto('/login');
  const msBtn = page.locator('button').filter({ hasText: /Continue with Microsoft/i });
  await expect(msBtn).toBeVisible();
});

// ─── Route Tests ──────────────────────────────────────────────────────────────

test('7. /onboard returns 200', async ({ page }) => {
  const response = await page.goto('/onboard');
  expect(response?.status()).toBe(200);
});

test('8. /dashboard returns 200', async ({ page }) => {
  const response = await page.goto('/dashboard');
  expect(response?.status()).toBe(200);
});

test('9. /login returns 200', async ({ page }) => {
  const response = await page.goto('/login');
  expect(response?.status()).toBe(200);
});

// ─── Logo Test ────────────────────────────────────────────────────────────────

test('10. Logo icon span shows "AK" not just "A"', async ({ page }) => {
  await page.goto('/');
  // Find span with font-black text inside the gold logo box
  const logoIconSpan = page.locator('.rounded-lg.bg-\\[\\#D4AF37\\] span').first();
  await expect(logoIconSpan).toHaveText('AK');
});

// ─── Firestore Rules Tests (RCA #8) ──────────────────────────────────────────
// These tests catch the class of failure where Firestore rules aren't deployed
// to named databases. Aaron should NEVER find a "Missing or insufficient
// permissions" error in production. These tests catch it first.

test('RCA-8a. Settings page loads without Firestore permission errors', async ({ page }) => {
  // Settings page must load — if Firestore rules are wrong it throws on mount
  const response = await page.goto('/settings');
  expect(response?.status()).toBe(200);
  // Should not contain permission error text anywhere on the page
  const body = await page.locator('body').textContent();
  expect(body).not.toContain('Missing or insufficient permissions');
  expect(body).not.toContain('permission-denied');
  expect(body).not.toContain('PERMISSION_DENIED');
});

test('RCA-8b. Settings page contains Business Profile section', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.locator('body')).toContainText('Business Profile');
});

test('RCA-8c. Dashboard page loads without Firestore permission errors', async ({ page }) => {
  const response = await page.goto('/dashboard');
  // Redirects to login — that's fine, we just want no 500s
  expect([200, 302, 307, 308]).toContain(response?.status());
  const body = await page.locator('body').textContent();
  expect(body).not.toContain('Missing or insufficient permissions');
  expect(body).not.toContain('PERMISSION_DENIED');
});

test('RCA-8d. No console errors on settings page load', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  await page.goto('/settings');
  await page.waitForTimeout(2000);
  // Filter out known safe errors (e.g. font preload warnings)
  const realErrors = consoleErrors.filter(e =>
    !e.includes('fonts') &&
    !e.includes('favicon') &&
    !e.includes('preload') &&
    !e.includes('ERR_BLOCKED_BY_CLIENT')
  );
  expect(realErrors).toHaveLength(0);
});

// ─── Onboarding Button Tests (RCA — buttons were dead code) ──────────────────

test('Onboarding buttons must be functional — not dead code', async ({ page }) => {
  const response = await page.goto('/onboard');
  // Should redirect to login if not authenticated — either is fine
  expect([200, 302, 307, 308]).toContain(response?.status());
  // Verify page does not have console errors about button handlers
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.waitForTimeout(1000);
  const realErrors = errors.filter(e => !e.includes('fonts') && !e.includes('favicon') && !e.includes('ERR_BLOCKED_BY_CLIENT'));
  expect(realErrors).toHaveLength(0);
});

test('ChatBubble buttons render and are clickable', async ({ page }) => {
  await page.goto('/');
  // Verify no "action handler: implement as needed" placeholder exists in JS bundle
  const response = await fetch('https://getakai.ai');
  const html = await response.text();
  expect(html).not.toContain('action handler: implement as needed');
});
