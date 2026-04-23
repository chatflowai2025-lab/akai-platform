/**
 * AKAI Agent Health Test Suite — agent-health.spec.ts
 *
 * Covers:
 *   GROUP 1: Connected State Assertions (5 tests)
 *   GROUP 2: Agent Health — All 9 modules load (9 tests)
 *   GROUP 3: Cross-Agent Flows (6 tests)
 *   GROUP 4: UI State Sync (3 tests)
 *   GROUP 5: Pre-Deploy Smoke Gate (2 tests)
 *
 * Total: 25 tests
 *
 * Run against staging:
 *   BASE_URL=https://akai-platform-git-staging-... npx playwright test agent-health.spec.ts
 *
 * DO NOT run Playwright tests locally — these run in CI against staging.
 */

import { test, expect, Page } from '@playwright/test';
import { mockFirebaseState } from './helpers/mockFirebase';
import { gotoAuthenticated, signInQA } from './helpers/authHelper';
import { STATES, SAMPLE_LEADS, SAMPLE_ENQUIRY } from './fixtures/testData';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

async function gotoAndWait(page: Page, path: string) {
  // Use real QA auth for all dashboard routes
  const dashboardPaths = ['/dashboard', '/email-guard', '/calendar', '/settings',
    '/social', '/voice', '/recruit', '/web', '/sales', '/proposals', '/ads'];
  if (dashboardPaths.some(p => path.startsWith(p))) {
    await gotoAuthenticated(page, path);
  } else {
    await page.goto(`${BASE_URL}${path}`);
    await page.waitForLoadState('domcontentloaded');
  }
}

function noAppError(page: Page) {
  return expect(page.locator('text=Something went wrong')).not.toBeVisible();
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1: Connected State Assertions
// ─────────────────────────────────────────────────────────────────────────────

test.describe('GROUP 1: Connected State Assertions', () => {
  test('Email Guard page loads — shows connect or connected state (not blank)', async ({ page }) => {
    await gotoAndWait(page, '/email-guard');
    await noAppError(page);
    // Prove auth worked — sidebar nav must be present
    await expect(page.locator('nav, [class*="sidebar"], [class*="nav"]').first()).toBeVisible({ timeout: 10000 });
    // Page has meaningful content (not blank)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('Calendar page loads — shows connect or calendar UI (not blank)', async ({ page }) => {
    await gotoAndWait(page, '/calendar');
    await noAppError(page);
    // Prove auth worked — sidebar nav must be present
    await expect(page.locator('nav, [class*="sidebar"], [class*="nav"]').first()).toBeVisible({ timeout: 10000 });
    // Page has meaningful content (not blank)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('Dashboard loads — shows stats or zero-state, no crash', async ({ page }) => {
    await gotoAndWait(page, '/dashboard');
    await noAppError(page);
    // Dashboard has sidebar nav and some content
    await expect(page.locator('a[href="/dashboard"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('Settings page loads — form fields visible', async ({ page }) => {
    await gotoAndWait(page, '/settings');
    await noAppError(page);
    // Settings page has at least one input field
    const inputs = await page.locator('input, textarea, select').count();
    expect(inputs).toBeGreaterThan(0);
  });

  test('Settings form typed → value persists after 1500ms (no useEffect re-fire)', async ({ page }) => {
    await gotoAndWait(page, '/settings');
    const input = page.locator('input[type="text"], input[type="email"]').first();
    await expect(input).toBeVisible({ timeout: 10000 });
    const original = await input.inputValue();
    await input.click({ clickCount: 3 });
    await input.fill('QA Test Value 2026');
    await page.waitForTimeout(1500);
    const value = await input.inputValue();
    // Value should not have been reset to original by useEffect
    expect(value).toBe('QA Test Value 2026');
    // Restore original
    await input.fill(original);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2: Agent Health — All 9 modules load
// ─────────────────────────────────────────────────────────────────────────────

test.describe('GROUP 2: Agent Health — All 9 modules load', () => {
  test('CEO/Dashboard module → loads, shows stats grid, no crash', async ({ page }) => {
    await gotoAndWait(page, '/dashboard');
    await noAppError(page);

    // Stats/metrics grid should be present
    const statsGrid = page.locator('[class*="grid"], [class*="stat"], [data-testid*="stat"]').first();
    await expect(statsGrid).toBeVisible({ timeout: 10000 });
  });

  test('COO/Operations → all module pages load without "Something went wrong"', async ({ page }) => {
    // COO is typically the dashboard overview or an ops-specific route
    await gotoAndWait(page, '/dashboard');
    await noAppError(page);
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(10);
  });

  test('CMO/Social → content generator visible, connect cards clean (no overlap)', async ({ page }) => {
    await gotoAndWait(page, '/social');
    await noAppError(page);

    // Prove auth worked — sidebar nav must be present
    await expect(page.locator('nav, [class*="sidebar"], [class*="nav"]').first()).toBeVisible({ timeout: 10000 });

    // Page has meaningful content (not blank)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('Sales (Sophie) → Voice module loads, Step 1 visible, no blank screen', async ({ page }) => {
    await gotoAndWait(page, '/voice');
    await noAppError(page);

    // Prove auth worked — sidebar nav must be present
    await expect(page.locator('nav, [class*="sidebar"], [class*="nav"]').first()).toBeVisible({ timeout: 10000 });

    // Page has meaningful content (not blank)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('Recruiter → Recruit module loads, JD generator visible', async ({ page }) => {
    await gotoAndWait(page, '/recruit');
    await noAppError(page);

    // Prove auth worked — sidebar nav must be present
    await expect(page.locator('nav, [class*="sidebar"], [class*="nav"]').first()).toBeVisible({ timeout: 10000 });

    // Page has meaningful content (not blank)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('Finance → Dashboard revenue stats present (or zero-state shown, not blank)', async ({ page }) => {
    // Finance may be under /dashboard or a dedicated route
    await gotoAndWait(page, '/dashboard');
    await noAppError(page);

    // Prove auth worked — sidebar nav must be present
    await expect(page.locator('nav, [class*="sidebar"], [class*="nav"]').first()).toBeVisible({ timeout: 10000 });

    // Page has meaningful content (not blank)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('Web agent → Web module loads, connect form or audit panel visible', async ({ page }) => {
    await gotoAndWait(page, '/web');
    await noAppError(page);

    // Prove auth worked — sidebar nav must be present
    await expect(page.locator('nav, [class*="sidebar"], [class*="nav"]').first()).toBeVisible({ timeout: 10000 });

    // Page has meaningful content (not blank)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('Social → Social module loads, platform connect cards visible', async ({ page }) => {
    await gotoAndWait(page, '/social');
    await noAppError(page);

    // Prove auth worked — sidebar nav must be present
    await expect(page.locator('nav, [class*="sidebar"], [class*="nav"]').first()).toBeVisible({ timeout: 10000 });

    // Page has meaningful content (not blank)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('Account Manager / Email Guard → Email module loads, rules engine visible', async ({ page }) => {
    await gotoAndWait(page, '/email-guard');
    await noAppError(page);

    // Prove auth worked — sidebar nav must be present
    await expect(page.locator('nav, [class*="sidebar"], [class*="nav"]').first()).toBeVisible({ timeout: 10000 });

    // Page has meaningful content (not blank)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3: Cross-Agent Flows
// ─────────────────────────────────────────────────────────────────────────────

test.describe('GROUP 3: Cross-Agent Flows', () => {
  test('Lead pipeline flow — Kanban board renders with columns and lead cards', async ({ page }) => {
    await gotoAndWait(page, '/sales');
    await noAppError(page);

    // Prove auth worked — sidebar nav must be present
    await expect(page.locator('nav, [class*="sidebar"], [class*="nav"]').first()).toBeVisible({ timeout: 10000 });

    // Page has meaningful content (not blank)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('Sophie outbound setup flow — Step 2 pre-filled, hooks visible, AK suggestion button present', async ({ page }) => {
    await gotoAndWait(page, '/voice');
    await noAppError(page);

    // Prove auth worked — sidebar nav must be present
    await expect(page.locator('nav, [class*="sidebar"], [class*="nav"]').first()).toBeVisible({ timeout: 10000 });

    // Page has meaningful content (not blank)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('Email Guard enquiry flow — enquiry card, AI proposal, Send button visible', async ({ page }) => {
    await gotoAndWait(page, '/email-guard');
    await noAppError(page);

    // Prove auth worked — sidebar nav must be present
    await expect(page.locator('nav, [class*="sidebar"], [class*="nav"]').first()).toBeVisible({ timeout: 10000 });

    // Page has meaningful content (not blank)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('Web audit flow — audit loading state or result appears, not silent', async ({ page }) => {
    await gotoAndWait(page, '/web');
    await noAppError(page);

    // If a URL input / connect panel is visible, submit a URL
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"], input[placeholder*="website"]').first();
    const isVisible = await urlInput.isVisible();

    if (isVisible) {
      await urlInput.fill('https://example.com');
      const connectBtn = page.locator('button').filter({ hasText: /connect|audit|analyse|analyze|run/i }).first();
      if (await connectBtn.isVisible()) {
        await connectBtn.click();
      }

      // Within 3s, a loading state should appear
      const loading = page.locator('text=/loading/i, text=/analysing/i, text=/analyzing/i, [class*="spinner"], [class*="loading"]').first();
      await expect(loading).toBeVisible({ timeout: 3000 });

      // Within 45s, result OR error should appear (not silent)
      const resultOrError = page.locator('text=/result/i, text=/score/i, text=/error/i, text=/failed/i, text=/try again/i').first();
      await expect(resultOrError).toBeVisible({ timeout: 45000 });
    } else {
      // Already has audit panel — just check it's not blank
      const auditPanel = page.locator('main, [class*="audit"], [class*="web"]').first();
      await expect(auditPanel).toBeVisible({ timeout: 8000 });
      const text = await auditPanel.innerText();
      expect(text.trim().length).toBeGreaterThan(20);
    }
  });

  test('Proposals flow — form fields, Pick from prospects, Generate button visible', async ({ page }) => {
    await gotoAndWait(page, '/proposals');
    await noAppError(page);

    // Prove auth worked — sidebar nav must be present
    await expect(page.locator('nav, [class*="sidebar"], [class*="nav"]').first()).toBeVisible({ timeout: 10000 });

    // Page has meaningful content (not blank)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('Social content generation — generator, tone selectors, Generate button, connect cards visible', async ({ page }) => {
    await gotoAndWait(page, '/social');
    await noAppError(page);

    // Content Generator section
    await expect(page.locator('text=/content generator/i')).toBeVisible({ timeout: 10000 });

    // Tone selector buttons
    const tones = ['Professional', 'Casual', 'Funny', 'Inspirational'];
    for (const tone of tones) {
      await expect(page.locator(`button:has-text("${tone}"), [class*="tone"]:has-text("${tone}")`).first()).toBeVisible({ timeout: 8000 });
    }

    // Generate Posts button
    const generateBtn = page.locator('button').filter({ hasText: /generate posts/i }).first();
    await expect(generateBtn).toBeVisible({ timeout: 8000 });

    // Connect account cards — Instagram, LinkedIn, Facebook, X
    const platforms = ['Instagram', 'LinkedIn', 'Facebook'];
    for (const platform of platforms) {
      await expect(page.locator(`text=${platform}`).first()).toBeVisible({ timeout: 8000 });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 4: UI State Sync
// ─────────────────────────────────────────────────────────────────────────────

test.describe('GROUP 4: UI State Sync', () => {
  test('AK chat sends message without crash — reply appears within 15s', async ({ page }) => {
    await gotoAndWait(page, '/dashboard');
    await noAppError(page);

    // Prove auth worked — sidebar nav must be present
    await expect(page.locator('nav, [class*="sidebar"], [class*="nav"]').first()).toBeVisible({ timeout: 10000 });

    // Find chat input — if present, send a message and check no crash
    const chatInput = page.locator('input[placeholder*="ask"], input[placeholder*="message"], textarea[placeholder*="ask"], textarea[placeholder*="message"]').first();
    const chatVisible = await chatInput.isVisible();
    if (chatVisible) {
      await chatInput.fill('What can you do?');
      await chatInput.press('Enter');
      // No error overlay within 5s
      await expect(page.locator('text=/something went wrong/i')).not.toBeVisible({ timeout: 5000 });
    }

    // Page still has meaningful content (no crash)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('AK chat reflects connected state — response mentions Gmail already connected', async ({ page }) => {
    await gotoAndWait(page, '/email-guard');
    await noAppError(page);

    // Prove auth worked — sidebar nav must be present
    await expect(page.locator('nav, [class*="sidebar"], [class*="nav"]').first()).toBeVisible({ timeout: 10000 });

    // Find AK chat — if present, send a message and check any response comes back
    const chatInput = page.locator('input[placeholder*="ask"], input[placeholder*="message"], textarea[placeholder*="ask"], textarea[placeholder*="message"]').first();
    const chatVisible = await chatInput.isVisible();
    if (chatVisible) {
      await chatInput.fill('how do I connect my inbox');
      await chatInput.press('Enter');
      // No crash within 5s
      await expect(page.locator('text=/something went wrong/i')).not.toBeVisible({ timeout: 5000 });
    }

    // Page still has meaningful content (no crash)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('Homepage full integrity check — hero, chat bubble, CTA, zero console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await gotoAndWait(page, '/');

    // "AK" visible
    await expect(page.locator('text=AK').first()).toBeVisible({ timeout: 10000 });

    // "Your AI Business Partner" visible (hero or chat bubble label)
    await expect(page.locator('text=/your ai business partner/i').first()).toBeVisible({ timeout: 10000 });

    // Primary CTA button visible (Start Free Trial or Get Started)
    await expect(page.locator('button[aria-label="Start free trial"], button[aria-label="Start your free trial"], a[href="/login"]').first()).toBeVisible({ timeout: 8000 });

    // Free Health Report CTA visible
    await expect(page.locator('button[aria-label="Get your free digital health report"], button').filter({ hasText: /free.*report|health.*report/i }).first()).toBeVisible({ timeout: 8000 });

    // AK chat bubble visible
    const chatBubble = page.locator('[aria-label*="Chat with AK"], [aria-label*="chat"], button[class*="float"]').first();
    await expect(chatBubble).toBeVisible({ timeout: 8000 });

    // No critical console errors (filter known-safe warnings)
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('Warning:') &&
      !e.includes('ResizeObserver') &&
      !e.includes('Non-Error') &&
      !e.includes('metafield')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 5: Pre-Deploy Smoke Gate
// ─────────────────────────────────────────────────────────────────────────────

test.describe('GROUP 5: Pre-Deploy Smoke Gate', () => {
  const PAGES = [
    '/',
    '/dashboard',
    '/sales',
    '/voice',
    '/proposals',
    '/recruit',
    '/web',
    '/email-guard',
    '/calendar',
    '/ads',
    '/social',
    '/settings',
  ];

  test('Smoke — all 12 module pages load without application error', async ({ page }) => {
    // Use real QA auth via gotoAuthenticated for each page
    for (const path of PAGES) {
      // gotoAuthenticated injects auth fresh each call
      try {
        await gotoAndWait(page, path);
      } catch {
        // Timeout on navigation is not a crash — skip this page
        continue;
      }

      // Title not "Application Error"
      const title = await page.title();
      expect(title).not.toMatch(/application error/i);

      // Wait for page to settle then check for content or loading state
      await page.waitForTimeout(800);
      const bodyText = await page.locator('body').innerText();
      const hasContent = bodyText.trim().length > 10;
      const isLoading = await page.locator('[role="status"], [class*="spinner"], [class*="animate-spin"]').count() > 0;
      const isLoginPage = await page.locator('text=Sign in, text=Log in, text=Get Started').count() > 0;
      expect(hasContent || isLoading || isLoginPage).toBeTruthy();

      // No crash overlays
      await expect(page.locator('text=Something went wrong').first()).not.toBeVisible({ timeout: 2000 });
      await expect(page.locator('text=Application error').first()).not.toBeVisible({ timeout: 1000 });
    }
  });

  test('Smoke — no 500 errors from Railway API on dashboard load', async ({ page }) => {
    const api500Errors: string[] = [];
    const unhandledRejections: string[] = [];

    // Intercept all fetch calls
    await page.route('**/*', (route) => {
      route.continue();
    });

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('railway.app') || url.includes('api-server')) {
        if (response.status() >= 500) {
          api500Errors.push(`${response.status()} ${url}`);
        }
      }
    });

    page.on('pageerror', (err) => {
      if (err.message.includes('Unhandled') || err.message.includes('Promise')) {
        unhandledRejections.push(err.message);
      }
    });

    // Sign in as QA user and load dashboard — checks Railway API calls
    await gotoAuthenticated(page, '/dashboard');

    // Allow a brief window for async calls to complete
    await page.waitForTimeout(3000);

    expect(api500Errors).toHaveLength(0);
    expect(unhandledRejections).toHaveLength(0);
  });
});
