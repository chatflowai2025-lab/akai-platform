/**
 * module-health.spec.ts — AKAI Module Health Tests
 *
 * Tests every major module page for:
 * - No crash / error messages visible
 * - No "Could not generate" text
 * - Key UI elements present
 * - Auth gate working (redirects unauthenticated to login)
 *
 * Auth: e2etest@getakai.ai / E2Etest2026! (via QA_EMAIL / QA_PASSWORD env vars)
 *
 * Run:
 *   npx playwright test module-health.spec.ts
 *   BASE_URL=https://getakai.ai npx playwright test module-health.spec.ts
 */

import { test, expect, Page } from '@playwright/test';
import { gotoAuthenticated } from './helpers/authHelper';

const BASE_URL = process.env.BASE_URL || 'https://getakai.ai';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function loadModule(page: Page, path: string) {
  await gotoAuthenticated(page, path);
  // Give React time to settle
  await page.waitForTimeout(2000);
}

/**
 * Asserts no error strings are visible on the page.
 * RCA: "Could not generate login URL" was surfaced as a visible error on Email Guard
 * when Railway's MS auth-url endpoint wasn't configured.
 */
async function assertNoErrorText(page: Page) {
  const errorPatterns = [
    'Could not generate',
    'Could not generate login URL',
    'Connection failed',
    'Something went wrong',
    'Unexpected error',
    'Internal Server Error',
    '500',
    'Error fetching',
    'Failed to load',
  ];
  for (const pattern of errorPatterns) {
    await expect(page.locator(`text=${pattern}`)).not.toBeVisible({
      timeout: 3000,
    });
  }
}

/**
 * Asserts the Subscribe button is NOT visible anywhere on the page.
 * RCA: Subscribe button was shown in TrialBadge/TrialBanner even when not appropriate.
 * These have been removed from all trial components but we guard against regression.
 */
async function assertNoSubscribeButton(page: Page) {
  // Use a loose text match — "Subscribe →" or "Subscribe from" etc.
  const subscribeLinks = page.locator('a, button').filter({ hasText: /^Subscribe/ });
  await expect(subscribeLinks).toHaveCount(0);
}

/**
 * Asserts the page didn't redirect to /login (auth gate working for authenticated user).
 */
async function assertAuthGateOpen(page: Page, expectedPath: string) {
  expect(page.url()).toContain(expectedPath.replace(/\?.*/,''));
}

/**
 * Asserts the greeting does NOT use a business name as a person's name.
 * RCA: DashboardLayout used businessName as firstName in the welcome message,
 * resulting in "Hey AK's Plumbing supplies!" instead of "Hey Aaron!".
 * Fix: user.displayName is now used first.
 */
async function assertGreetingIsPersonal(page: Page) {
  // The chat panel greeting should not contain common business-name patterns
  // We can't know every user's business name, but we can verify it doesn't
  // start with "Hey" followed by text containing "'s" (possessive — typical business name pattern)
  const chatMessages = page.locator('[data-testid="chat-message"], .chat-message, [class*="message"]');
  const count = await chatMessages.count();
  for (let i = 0; i < Math.min(count, 3); i++) {
    const text = await chatMessages.nth(i).textContent() ?? '';
    // Business name greeting pattern: "Hey X's Y!" where X's Y is a business
    // This is a heuristic — if the first word after "Hey" contains an apostrophe-s, it's probably a business name
    if (text.startsWith('Hey ') && text.includes("'s") && text.includes('I\'m AK')) {
      throw new Error(`Greeting appears to use business name: "${text.slice(0, 80)}..."`);
    }
  }
}

// ─── Module: Email Guard ─────────────────────────────────────────────────────

test.describe('Email Guard module', () => {
  test('loads without error messages', async ({ page }) => {
    await loadModule(page, '/email-guard');
    await assertAuthGateOpen(page, '/email-guard');
    await assertNoErrorText(page);
  });

  test('shows inbox connect UI (Microsoft + Gmail options)', async ({ page }) => {
    await loadModule(page, '/email-guard');
    // Should show either the connected state or connect buttons — never a blank page
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(100);

    // Either a connected inbox badge OR connect buttons must be visible
    const hasConnectButton = await page.locator('button').filter({ hasText: /Connect/ }).count() > 0;
    const hasConnectedBadge = await page.locator('text=Live').count() > 0 ||
                              await page.locator('text=connected').count() > 0;
    expect(hasConnectButton || hasConnectedBadge).toBe(true);
  });

  test('no "Could not generate login URL" error', async ({ page }) => {
    await loadModule(page, '/email-guard');
    // RCA: Railway MS auth-url endpoint was failing. Fix: client-side URL generation.
    await expect(page.locator('text=Could not generate login URL')).not.toBeVisible();
    await expect(page.locator('text=Could not generate')).not.toBeVisible();
  });

  test('no Subscribe button visible', async ({ page }) => {
    await loadModule(page, '/email-guard');
    await assertNoSubscribeButton(page);
  });

  test('clicking Microsoft Connect does not show auth URL error', async ({ page }) => {
    await loadModule(page, '/email-guard');
    // RCA: Clicking connect was showing "Could not generate login URL" when Railway
    // failed to return authUrl. Fix: client-side OAuth URL generation as fallback.
    const connectBtn = page.locator('button').filter({ hasText: /Connect.*→/ }).first();
    const isVisible = await connectBtn.isVisible();
    if (isVisible) {
      // Click and check we either navigate away (good — auth URL worked) or show a
      // "Connecting..." spinner but NOT "Could not generate" text
      await connectBtn.click();
      // Brief wait — either navigation happens or error shows
      await page.waitForTimeout(1500);
      // If we're still on the page (navigation may have started), no error must be shown
      await expect(page.locator('text=Could not generate login URL')).not.toBeVisible();
    }
  });
});

// ─── Module: Calendar ────────────────────────────────────────────────────────

test.describe('Calendar module', () => {
  test('loads without error messages', async ({ page }) => {
    await loadModule(page, '/calendar');
    await assertAuthGateOpen(page, '/calendar');
    await assertNoErrorText(page);
  });

  test('shows calendar UI with month/week/day controls', async ({ page }) => {
    await loadModule(page, '/calendar');
    await expect(page.locator('text=Calendar')).toBeVisible();
    // View controls
    const hasViewToggle =
      await page.locator('button').filter({ hasText: /month/i }).count() > 0 ||
      await page.locator('button').filter({ hasText: /week/i }).count() > 0;
    expect(hasViewToggle).toBe(true);
  });

  test('no Subscribe button visible', async ({ page }) => {
    await loadModule(page, '/calendar');
    await assertNoSubscribeButton(page);
  });

  test('Outlook connect does not error with "Could not generate"', async ({ page }) => {
    await loadModule(page, '/calendar');
    // RCA: Same MS auth-url Railway dependency. Fixed with client-side fallback.
    const outlookBtn = page.locator('button').filter({ hasText: /Outlook/i }).first();
    const isVisible = await outlookBtn.isVisible();
    if (isVisible) {
      await outlookBtn.click();
      await page.waitForTimeout(1500);
      await expect(page.locator('text=Could not reach the Outlook Calendar service')).not.toBeVisible();
    }
  });
});

// ─── Module: Voice ───────────────────────────────────────────────────────────

test.describe('Voice module', () => {
  test('loads without crash', async ({ page }) => {
    await loadModule(page, '/voice');
    await assertAuthGateOpen(page, '/voice');
    await assertNoErrorText(page);
  });

  test('shows Sophie voice configuration UI', async ({ page }) => {
    await loadModule(page, '/voice');
    // Should mention Sophie or Voice somewhere
    const body = await page.locator('body').innerText();
    const hasSophie = body.toLowerCase().includes('sophie') || body.toLowerCase().includes('voice');
    expect(hasSophie).toBe(true);
  });

  test('no Subscribe button visible', async ({ page }) => {
    await loadModule(page, '/voice');
    await assertNoSubscribeButton(page);
  });
});

// ─── Module: Sales ───────────────────────────────────────────────────────────

test.describe('Sales module', () => {
  test('loads without crash', async ({ page }) => {
    await loadModule(page, '/sales');
    await assertAuthGateOpen(page, '/sales');
    await assertNoErrorText(page);
  });

  test('shows lead/CRM UI', async ({ page }) => {
    await loadModule(page, '/sales');
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(100);
    // Either leads, pipeline, or Sophie references
    const hasSalesContent =
      body.toLowerCase().includes('lead') ||
      body.toLowerCase().includes('sales') ||
      body.toLowerCase().includes('campaign');
    expect(hasSalesContent).toBe(true);
  });

  test('no Subscribe button visible', async ({ page }) => {
    await loadModule(page, '/sales');
    await assertNoSubscribeButton(page);
  });
});

// ─── Module: Social ──────────────────────────────────────────────────────────

test.describe('Social module', () => {
  test('loads without crash', async ({ page }) => {
    await loadModule(page, '/social');
    await assertAuthGateOpen(page, '/social');
    await assertNoErrorText(page);
  });

  test('shows social content UI', async ({ page }) => {
    await loadModule(page, '/social');
    const body = await page.locator('body').innerText();
    const hasSocialContent =
      body.toLowerCase().includes('instagram') ||
      body.toLowerCase().includes('linkedin') ||
      body.toLowerCase().includes('facebook') ||
      body.toLowerCase().includes('social') ||
      body.toLowerCase().includes('post');
    expect(hasSocialContent).toBe(true);
  });

  test('no Subscribe button visible', async ({ page }) => {
    await loadModule(page, '/social');
    await assertNoSubscribeButton(page);
  });
});

// ─── Module: Recruit ─────────────────────────────────────────────────────────

test.describe('Recruit module', () => {
  test('loads without crash', async ({ page }) => {
    await loadModule(page, '/recruit');
    await assertAuthGateOpen(page, '/recruit');
    await assertNoErrorText(page);
  });

  test('shows recruitment UI', async ({ page }) => {
    await loadModule(page, '/recruit');
    const body = await page.locator('body').innerText();
    const hasRecruitContent =
      body.toLowerCase().includes('recruit') ||
      body.toLowerCase().includes('candidate') ||
      body.toLowerCase().includes('job');
    expect(hasRecruitContent).toBe(true);
  });

  test('no Subscribe button visible', async ({ page }) => {
    await loadModule(page, '/recruit');
    await assertNoSubscribeButton(page);
  });
});

// ─── Module: Web ─────────────────────────────────────────────────────────────

test.describe('Web Audit module', () => {
  test('loads without crash', async ({ page }) => {
    await loadModule(page, '/web');
    await assertAuthGateOpen(page, '/web');
    await assertNoErrorText(page);
  });

  test('shows web audit UI', async ({ page }) => {
    await loadModule(page, '/web');
    const body = await page.locator('body').innerText();
    const hasWebContent =
      body.toLowerCase().includes('audit') ||
      body.toLowerCase().includes('website') ||
      body.toLowerCase().includes('seo') ||
      body.toLowerCase().includes('web');
    expect(hasWebContent).toBe(true);
  });

  test('no Subscribe button visible', async ({ page }) => {
    await loadModule(page, '/web');
    await assertNoSubscribeButton(page);
  });
});

// ─── Module: Ads ─────────────────────────────────────────────────────────────

test.describe('Ads module', () => {
  test('loads without crash', async ({ page }) => {
    await loadModule(page, '/ads');
    await assertAuthGateOpen(page, '/ads');
    await assertNoErrorText(page);
  });

  test('shows ads campaign builder UI', async ({ page }) => {
    await loadModule(page, '/ads');
    const body = await page.locator('body').innerText();
    const hasAdsContent =
      body.toLowerCase().includes('google') ||
      body.toLowerCase().includes('campaign') ||
      body.toLowerCase().includes('ads') ||
      body.toLowerCase().includes('meta');
    expect(hasAdsContent).toBe(true);
  });

  test('no Subscribe button visible', async ({ page }) => {
    await loadModule(page, '/ads');
    await assertNoSubscribeButton(page);
  });
});

// ─── Dashboard: Greeting check ───────────────────────────────────────────────

test.describe('Dashboard AK Chat greeting', () => {
  test('greeting uses first name not business name', async ({ page }) => {
    await loadModule(page, '/dashboard');
    // RCA: DashboardLayout used businessName first in firstName lookup chain.
    // Fix: user.displayName (Firebase Auth real name) is now used first.
    // Test: assert no greeting starting with "Hey <businessname>!" where businessname
    // contains an apostrophe-s (company name pattern).
    await assertGreetingIsPersonal(page);
  });

  test('no Subscribe button on dashboard', async ({ page }) => {
    await loadModule(page, '/dashboard');
    await assertNoSubscribeButton(page);
  });
});

// ─── Auth gate: unauthenticated redirect ─────────────────────────────────────

test.describe('Auth gate', () => {
  test('unauthenticated /email-guard redirects to /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/email-guard`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Should be on login page
    expect(page.url()).toMatch(/login/);
  });

  test('unauthenticated /dashboard redirects to /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/login/);
  });
});
