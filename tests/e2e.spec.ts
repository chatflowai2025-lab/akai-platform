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
