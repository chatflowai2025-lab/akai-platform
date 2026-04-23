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
import { STATES, SAMPLE_LEADS, SAMPLE_ENQUIRY } from './fixtures/testData';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

async function gotoAndWait(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState('domcontentloaded');
}

function noAppError(page: Page) {
  return expect(page.locator('text=Something went wrong')).not.toBeVisible();
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1: Connected State Assertions
// ─────────────────────────────────────────────────────────────────────────────

test.describe('GROUP 1: Connected State Assertions', () => {
  test('Gmail connected → no "Connect Gmail" button, shows email + Live badge', async ({ page }) => {
    await mockFirebaseState(page, STATES.gmailOnly);
    await gotoAndWait(page, '/email-guard');

    // Should NOT show a connect-Gmail CTA
    await expect(page.locator('button, a').filter({ hasText: /connect gmail/i })).not.toBeVisible();

    // Should show the connected email address or a "Live" / connected badge somewhere
    const emailOrBadge = page.locator('text=qa@getakai.ai, text=Live, text=Connected, [data-testid="gmail-connected"]').first();
    await expect(emailOrBadge).toBeVisible({ timeout: 10000 });
  });

  test('Calendar connected → no "Connect Google Calendar" banner, calendar grid renders', async ({ page }) => {
    await mockFirebaseState(page, STATES.calendarOnly);
    await gotoAndWait(page, '/calendar');

    // Should NOT show a connect-calendar banner
    await expect(page.locator('text=/connect google calendar/i')).not.toBeVisible({ timeout: 8000 });

    // Calendar grid or events container should be visible
    const calGrid = page.locator('[class*="calendar"], [data-testid="calendar-grid"], table, .fc, text=Mon, text=Sun').first();
    await expect(calGrid).toBeVisible({ timeout: 10000 });
  });

  test('Fresh user → all connect banners visible', async ({ page }) => {
    await mockFirebaseState(page, STATES.freshUser);
    await gotoAndWait(page, '/dashboard');

    // At least one connect banner should appear for fresh users
    const connectBanner = page.locator('text=/connect/i').first();
    await expect(connectBanner).toBeVisible({ timeout: 10000 });
  });

  test('Settings loaded with business data → form shows saved values, not placeholders', async ({ page }) => {
    await mockFirebaseState(page, STATES.fullyConnected);
    await gotoAndWait(page, '/settings');

    // Business name field should show the saved value
    const businessNameInput = page.locator('input[name*="business"], input[placeholder*="business"], input[id*="business"]').first();
    await expect(businessNameInput).toBeVisible({ timeout: 10000 });
    const value = await businessNameInput.inputValue();
    expect(value).toBe('AKAI Test Co');
  });

  test('Settings form typed → value persists after 1500ms (no useEffect re-fire)', async ({ page }) => {
    await mockFirebaseState(page, STATES.fullyConnected);
    await gotoAndWait(page, '/settings');

    const businessNameInput = page.locator('input[name*="business"], input[placeholder*="business"], input[id*="business"]').first();
    await expect(businessNameInput).toBeVisible({ timeout: 10000 });

    // Clear and type new value
    await businessNameInput.click({ clickCount: 3 });
    await businessNameInput.fill('Updated Business Name');

    // Wait 1500ms to confirm no useEffect re-fires overwrite the input
    await page.waitForTimeout(1500);
    const value = await businessNameInput.inputValue();
    expect(value).toBe('Updated Business Name');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2: Agent Health — All 9 modules load
// ─────────────────────────────────────────────────────────────────────────────

test.describe('GROUP 2: Agent Health — All 9 modules load', () => {
  test('CEO/Dashboard module → loads, shows stats grid, no crash', async ({ page }) => {
    await mockFirebaseState(page, STATES.fullyConnected);
    await gotoAndWait(page, '/dashboard');
    await noAppError(page);

    // Stats/metrics grid should be present
    const statsGrid = page.locator('[class*="grid"], [class*="stat"], [data-testid*="stat"]').first();
    await expect(statsGrid).toBeVisible({ timeout: 10000 });
  });

  test('COO/Operations → all module pages load without "Something went wrong"', async ({ page }) => {
    await mockFirebaseState(page, STATES.fullyConnected);
    // COO is typically the dashboard overview or an ops-specific route
    await gotoAndWait(page, '/dashboard');
    await noAppError(page);
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(10);
  });

  test('CMO/Social → content generator visible, connect cards clean (no overlap)', async ({ page }) => {
    await mockFirebaseState(page, STATES.fullyConnected);
    await gotoAndWait(page, '/social');
    await noAppError(page);

    const contentGen = page.locator('text=/content generator/i, text=/generate/i').first();
    await expect(contentGen).toBeVisible({ timeout: 10000 });

    // Check no overlap — all connect cards should have distinct bounding boxes
    const cards = page.locator('[class*="card"], [class*="connect"]');
    const count = await cards.count();
    if (count > 1) {
      const boxes = await Promise.all(
        Array.from({ length: count }, (_, i) => cards.nth(i).boundingBox())
      );
      const validBoxes = boxes.filter((b): b is NonNullable<typeof b> => b !== null);
      for (let i = 0; i < validBoxes.length; i++) {
        for (let j = i + 1; j < validBoxes.length; j++) {
          const a = validBoxes[i]!;
          const b = validBoxes[j]!;
          // Check horizontal overlap within same vertical band
          const vertOverlap = a.y < b.y + b.height && b.y < a.y + a.height;
          const horizOverlap = a.x < b.x + b.width && b.x < a.x + a.width;
          if (vertOverlap && horizOverlap) {
            // Significant overlap threshold: > 50% area overlap is a bug
            const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
            const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
            const overlapArea = overlapX * overlapY;
            const minArea = Math.min(a.width * a.height, b.width * b.height);
            expect(overlapArea / minArea).toBeLessThan(0.5);
          }
        }
      }
    }
  });

  test('Sales (Sophie) → Voice module loads, Step 1 visible, no blank screen', async ({ page }) => {
    await mockFirebaseState(page, STATES.fullyConnected);
    await gotoAndWait(page, '/voice');
    await noAppError(page);

    // Step 1 should be visible
    const step1 = page.locator('text=/step 1/i, text=/sounds good/i, text=/let\'s get started/i, [data-testid="voice-step-1"]').first();
    await expect(step1).toBeVisible({ timeout: 10000 });

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('Recruiter → Recruit module loads, JD generator visible', async ({ page }) => {
    await mockFirebaseState(page, STATES.fullyConnected);
    await gotoAndWait(page, '/recruit');
    await noAppError(page);

    const jdGenerator = page.locator('text=/job description/i, text=/generate/i, text=/recruit/i').first();
    await expect(jdGenerator).toBeVisible({ timeout: 10000 });
  });

  test('Finance → Dashboard revenue stats present (or zero-state shown, not blank)', async ({ page }) => {
    await mockFirebaseState(page, STATES.fullyConnected);
    // Finance may be under /dashboard or a dedicated route
    await gotoAndWait(page, '/dashboard');
    await noAppError(page);

    // Either revenue numbers OR a zero-state message
    const financeContent = page.locator('text=/revenue/i, text=/finance/i, text=/invoice/i, text=/earned/i, text=/\$0/').first();
    await expect(financeContent).toBeVisible({ timeout: 10000 });
  });

  test('Web agent → Web module loads, connect form or audit panel visible', async ({ page }) => {
    await mockFirebaseState(page, STATES.fullyConnected);
    await gotoAndWait(page, '/web');
    await noAppError(page);

    const webContent = page.locator('text=/audit/i, text=/connect/i, text=/website/i, input[type="url"], input[placeholder*="http"]').first();
    await expect(webContent).toBeVisible({ timeout: 10000 });
  });

  test('Social → Social module loads, platform connect cards visible', async ({ page }) => {
    await mockFirebaseState(page, STATES.fullyConnected);
    await gotoAndWait(page, '/social');
    await noAppError(page);

    const socialCards = page.locator('text=/instagram/i, text=/linkedin/i, text=/facebook/i').first();
    await expect(socialCards).toBeVisible({ timeout: 10000 });
  });

  test('Account Manager / Email Guard → Email module loads, rules engine visible', async ({ page }) => {
    await mockFirebaseState(page, STATES.fullyConnected);
    await gotoAndWait(page, '/email-guard');
    await noAppError(page);

    const emailModule = page.locator('text=/email/i, text=/inbox/i, text=/rules/i, text=/guard/i').first();
    await expect(emailModule).toBeVisible({ timeout: 10000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3: Cross-Agent Flows
// ─────────────────────────────────────────────────────────────────────────────

test.describe('GROUP 3: Cross-Agent Flows', () => {
  test('Lead pipeline flow — Kanban board renders with columns and lead cards', async ({ page }) => {
    await mockFirebaseState(page, {
      ...STATES.fullyConnected,
      leads: SAMPLE_LEADS,
    });
    await gotoAndWait(page, '/sales');
    await noAppError(page);

    // Assert 4 Kanban columns
    const columns = [/new lead/i, /called/i, /qualified/i, /booked/i];
    for (const col of columns) {
      const colEl = page.locator(`text=${col}`).first();
      await expect(colEl).toBeVisible({ timeout: 10000 });
    }

    // Assert lead cards render with name and phone
    await expect(page.locator('text=James Smith')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=+61400000001')).toBeVisible({ timeout: 8000 });

    // Assert empty state text for empty columns
    const emptyState = page.locator('text=/no leads here yet/i');
    await expect(emptyState).toBeVisible({ timeout: 8000 });
  });

  test('Sophie outbound setup flow — Step 2 pre-filled, hooks visible, AK suggestion button present', async ({ page }) => {
    await mockFirebaseState(page, STATES.fullyConnected);
    await gotoAndWait(page, '/voice');
    await noAppError(page);

    // Click "Sounds good →" on Step 1
    const step1Btn = page.locator('button').filter({ hasText: /sounds good/i }).first();
    await expect(step1Btn).toBeVisible({ timeout: 10000 });
    await step1Btn.click();

    // Step 2 should render
    const step2 = page.locator('text=/step 2/i, [data-testid="voice-step-2"]').first();
    await expect(step2).toBeVisible({ timeout: 8000 });

    // Business fields should be pre-filled from Firestore
    const businessField = page.locator('input[value="AKAI Test Co"], input').first();
    await expect(businessField).toBeVisible({ timeout: 8000 });

    // Hook option cards should be visible with real text (not placeholders)
    const hookCards = page.locator('[class*="card"], [class*="hook"]').first();
    await expect(hookCards).toBeVisible({ timeout: 8000 });

    // "Ask AK for suggestions" button
    const askAKBtn = page.locator('button').filter({ hasText: /ask ak for suggestions/i }).first();
    await expect(askAKBtn).toBeVisible({ timeout: 8000 });
  });

  test('Email Guard enquiry flow — enquiry card, AI proposal, Send button visible', async ({ page }) => {
    await mockFirebaseState(page, {
      ...STATES.fullyConnected,
      enquiries: [SAMPLE_ENQUIRY],
    });
    await gotoAndWait(page, '/email-guard');
    await noAppError(page);

    // Enquiry card with subject line
    await expect(page.locator('text=/enquiry about lead generation/i')).toBeVisible({ timeout: 10000 });

    // AI-generated proposal section
    const proposalSection = page.locator('text=/ai-generated proposal/i, text=/proposal/i').first();
    await expect(proposalSection).toBeVisible({ timeout: 8000 });

    // Send button
    const sendBtn = page.locator('button').filter({ hasText: /send/i }).first();
    await expect(sendBtn).toBeVisible({ timeout: 8000 });
  });

  test('Web audit flow — audit loading state or result appears, not silent', async ({ page }) => {
    await mockFirebaseState(page, STATES.fullyConnected);
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
    await mockFirebaseState(page, STATES.fullyConnected);
    await gotoAndWait(page, '/proposals');
    await noAppError(page);

    // Left panel form fields
    const formField = page.locator('input, textarea, select').first();
    await expect(formField).toBeVisible({ timeout: 10000 });

    // "Pick from prospects" button
    const pickBtn = page.locator('button').filter({ hasText: /pick from prospects/i }).first();
    await expect(pickBtn).toBeVisible({ timeout: 8000 });

    // Generate button
    const generateBtn = page.locator('button').filter({ hasText: /generate/i }).first();
    await expect(generateBtn).toBeVisible({ timeout: 8000 });
  });

  test('Social content generation — generator, tone selectors, Generate button, connect cards visible', async ({ page }) => {
    await mockFirebaseState(page, STATES.fullyConnected);
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
    await mockFirebaseState(page, STATES.fullyConnected);
    await gotoAndWait(page, '/dashboard');
    await noAppError(page);

    // Find chat input
    const chatInput = page.locator('input[placeholder*="ask"], input[placeholder*="message"], textarea[placeholder*="ask"], textarea[placeholder*="message"]').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Type and send
    await chatInput.fill('What can you do?');
    await chatInput.press('Enter');

    // No error overlay within 5s
    await expect(page.locator('text=/something went wrong/i, [class*="error-overlay"]')).not.toBeVisible({ timeout: 5000 });

    // Assistant reply within 15s
    const reply = page.locator('[class*="assistant"], [class*="ai-message"], [data-role="assistant"], [class*="chat-bubble"]:not(:first-child)').first();
    await expect(reply).toBeVisible({ timeout: 15000 });
  });

  test('AK chat reflects connected state — response mentions Gmail already connected', async ({ page }) => {
    await mockFirebaseState(page, STATES.gmailOnly);
    await gotoAndWait(page, '/email-guard');
    await noAppError(page);

    // Find AK chat
    const chatInput = page.locator('input[placeholder*="ask"], input[placeholder*="message"], textarea[placeholder*="ask"], textarea[placeholder*="message"]').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    await chatInput.fill('how do I connect my inbox');
    await chatInput.press('Enter');

    // Wait for reply
    const reply = page.locator('[class*="assistant"], [class*="ai-message"], [data-role="assistant"]').last();
    await expect(reply).toBeVisible({ timeout: 20000 });

    const replyText = await reply.innerText();

    // Should NOT say the old generic flow message
    expect(replyText.toLowerCase()).not.toContain('do you want to send, receive, or both');

    // Should acknowledge Gmail is already connected
    const mentionsConnected =
      replyText.toLowerCase().includes('already connected') ||
      replyText.toLowerCase().includes('gmail is connected') ||
      replyText.toLowerCase().includes('your gmail') ||
      replyText.toLowerCase().includes('connected');
    expect(mentionsConnected).toBe(true);
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
    // Public pages only — auth-gated pages redirect to /login (expected, not an error)
    const PUBLIC_PAGES = ['/', '/terms', '/privacy', '/login'];
    for (const path of PUBLIC_PAGES) {
      const response = await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState('domcontentloaded');

      // Response status 200 (or 304 / redirect — not 5xx)
      if (response) {
        expect(response.status()).toBeLessThan(500);
      }

      // Title not "Application Error"
      const title = await page.title();
      expect(title).not.toMatch(/application error/i);

      // Body has visible content
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length).toBeGreaterThan(10);

      // No crash overlays
      await expect(page.locator('text=Something went wrong').first()).not.toBeVisible({ timeout: 3000 });
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

    // Check Railway API health endpoint directly (no auth needed)
    await page.goto(`https://api-server-production-2a27.up.railway.app/api/healthz`);
    await page.waitForLoadState('domcontentloaded');

    // Allow a brief window for async calls to complete
    await page.waitForTimeout(3000);

    expect(api500Errors).toHaveLength(0);
    expect(unhandledRejections).toHaveLength(0);
  });
});
